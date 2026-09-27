# xiaopai — Architecture

How the app in [SPEC.md](SPEC.md) gets built. One manager, one restaurant
(**Ah Ma**), running on a laptop.

---

## 1. Stack

| | | Why |
|---|---|---|
| **Next.js** (App Router) | UI + server | One project. Server Actions mean a button calls a server function directly — no REST layer to design or keep in sync |
| **SQLite** | storage | No database server. Backup is copying one file |
| **Drizzle** | queries | Typed, thin, and close enough to SQL that you learn SQL |
| **TypeScript** | language | The data shapes are already settled, so the types cost nothing and catch renamed fields |
| **Tailwind** | styling | See §7 — the mockup's palette moves across as tokens rather than being reinvented |
| **Vitest** | tests | Only for §5 |

Deliberately absent: any API layer, React Query, Redux, a component library,
Docker, auth, and anything to do with PDFs — the roster leaves the app as text
pasted into a chat.

---

## 2. Five rules

**Never store what you can calculate.** Hours, warnings, whether a cell is
N/A — all derived on every render. The mockup has no bug where hours disagree
with shifts because hours aren't data. A `total_hours` column would be a bug
waiting to happen.

**The rules live in one pure module.** `lib/roster/` imports nothing from React
or the database. Data in, answers out.

**The week is the unit.** Everything the editor needs is one roster + staff +
leave. Load on navigate, write on edit.

**Dates are strings.** `"2026-10-05"`. No `Date` in the database, no UTC, no
timezone library. A week is named by its Monday.

**Publishing freezes a copy.** See §6.

---

## 2b. How the three fit together

SQLite is a **file** — `xiaopai.db` in the project folder. Not a server, not a
port. Next.js is one Node process, and because it runs on your machine it opens
that file directly. Drizzle is the translator: you describe tables in
TypeScript, it writes the SQL and hands back typed objects.

```
browser  ──HTTP──>  Next.js (one Node process)  ──opens──>  xiaopai.db
                          │
                       Drizzle
```

### Setup is three files

```ts
// lib/db/client.ts
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('xiaopai.db')
export const db = drizzle(sqlite, { schema })

// next.config.ts — better-sqlite3 is native, don't bundle it
export default { serverExternalPackages: ['better-sqlite3'] }
```

### Reading — the page queries directly

```tsx
// app/roster/[week]/page.tsx
export default async function RosterPage({ params }) {
  const { week } = await params
  const people = db.select().from(staff)
    .where(eq(staff.active, true)).orderBy(staff.sortOrder).all()
  const weekShifts = db.select().from(shifts)
    .where(eq(shifts.weekStart, week)).all()
  return <Grid week={week} staff={people} shifts={weekShifts} />
}
```

No `fetch`, no `/api/` route, no loading state. Note `.all()` and no `await` —
better-sqlite3 is **synchronous**. Ideal for one user on a laptop; exactly what
you'd never do on a busy server.

### Writing — Server Actions

```ts
// app/actions.ts
'use server'
export async function addShift(week, staffId, date, start, end) {
  db.insert(shifts).values({ weekStart: week, staffId, date, start, end }).run()
  revalidatePath(`/roster/${week}`)
}
```

```tsx
// components/Cell.tsx
'use client'
import { addShift } from '@/app/actions'
export function Cell({ week, staffId, date }) {
  return <button onClick={() => addShift(week, staffId, date, 600, 1080)}>+</button>
}
```

That import looks ordinary but isn't — Next replaces it at build time with an
RPC call. The function body never reaches the browser, only its address.
**This is what replaces an entire API layer.**

`revalidatePath` then re-runs the Server Component, re-queries SQLite and sends
back the changed markup. You never write "add it to local state, and also save
it" — there is one source of truth and the UI is a view of it.

### Migrations

```bash
npx drizzle-kit generate   # reads schema.ts, writes a .sql migration
npx drizzle-kit migrate    # applies it to xiaopai.db
```

The migrations are plain SQL in `drizzle/`. Read them — it's the clearest way
to see what the TypeScript actually meant.

### Four things that will bite

1. **Never import `db` into a `'use client'` file.** The build fails, and that
   failure is the safety net — database code can't leak to the browser.
2. **Native module.** Skip `serverExternalPackages` and the build dies with a
   confusing error about `.node` files.
3. **Hot reload opens a new connection each save.** Cache the client on
   `globalThis` in dev or you'll hit file-lock errors.
4. **Server Actions are POST endpoints.** Anyone who can reach the app can call
   them. Fine on localhost, not fine if it's ever exposed.

---

## 3. Schema

Times are **minutes since midnight** — `600` is 10:00, `1260` is 21:00. Integer
maths, formatted at the edge.

```ts
staff = sqliteTable('staff', {
  id:            integer().primaryKey({ autoIncrement: true }),
  name:          text().notNull(),
  active:        integer({ mode: 'boolean' }).notNull().default(true),
  available:     text({ mode: 'json' }).$type<boolean[]>().notNull(),  // 7, Mon-first
  sortOrder:     integer().notNull(),
  expectedHours: integer(),          // nullable
  notes:         text(),
})

shiftTemplates = sqliteTable('shift_templates', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(), start: integer().notNull(), end: integer().notNull(),
  sortOrder: integer().notNull(),
})

tradingHours = sqliteTable('trading_hours', {
  weekday: integer().primaryKey(),   // 0 = Mon
  open:    integer().notNull(),
  close:   integer().notNull(),
})

rosters = sqliteTable('rosters', {
  weekStart:   text().primaryKey(),  // the Monday, '2026-10-05'
  status:      text({ enum: ['draft', 'published'] }).notNull().default('draft'),
  version:     integer().notNull().default(0),
  publishedAt: text(),
  weekNote:    text(),
  closedDays:  text({ mode: 'json' }).$type<boolean[]>().notNull(),  // 7, owned by the week
  snapshot:    text({ mode: 'json' }).$type<Snapshot>(),             // §6
})

shifts = sqliteTable('shifts', {
  id:        integer().primaryKey({ autoIncrement: true }),
  weekStart: text().notNull().references(() => rosters.weekStart),
  staffId:   integer().notNull().references(() => staff.id),
  date:      text().notNull(),       // '2026-10-08'
  start:     integer().notNull(),
  end:       integer().notNull(),
  note:      text(),
})

naNotes = sqliteTable('na_notes', {          // "can't do Friday this week"
  id: integer().primaryKey({ autoIncrement: true }),
  weekStart: text().notNull(), staffId: integer().notNull(), date: text().notNull(),
})                                            // unique(weekStart, staffId, date)

leave = sqliteTable('leave', {
  id: integer().primaryKey({ autoIncrement: true }),
  staffId: integer().notNull().references(() => staff.id),
  fromDate: text().notNull(), toDate: text().notNull(), note: text(),
})
```

**Why shifts store a real date** rather than a 0–6 column index: the row is then
self-contained. Checking it against leave needs no join to work out what day it
actually was, and a shift can't end up disagreeing with the week it's filed
under. The grid maps date → column, which is subtraction.

**Why `closedDays` is JSON on the roster, not its own table:** it's always
exactly seven booleans, always read together, and never queried across weeks.

**Nothing is ever hard-deleted from `staff`.** Leaving sets `active = false`.

---

## 4. Layout

```
app/
  roster/[week]/page.tsx     the grid — the whole app, really
  staff/page.tsx             people, availability, booked leave
  settings/page.tsx          trading hours, shift templates
  history/page.tsx           every week, newest first
  share/[week]/page.tsx      the plain-text roster + Copy button, reads the snapshot
  actions.ts                 every mutation
lib/
  roster/                    pure rules — tested, imports nothing
    time.ts                  parse '10-18', format 'HH:MM', durations
    dates.ts                 week maths, labels, day columns
    hours.ts                 per person, per week
    warnings.ts              the whole warnings list
    copy.ts                  what Copy previous week keeps and skips
  db/
    schema.ts  client.ts  queries.ts
```

### Routing

There is no homepage. The app does one thing, so `/` redirects to a week:

```ts
// app/page.tsx
export default function Home() {
  const thisWeek = mondayOf(today())
  const nextWeek = addDays(thisWeek, 7)
  const target =
    !isPublished(thisWeek) ? thisWeek :
    !isPublished(nextWeek) ? nextWeek :
    thisWeek
  redirect(`/roster/${target}`)
}
```

**Go to the earliest week that still needs work** — this week if it's not
published, otherwise next week if that's unfinished, otherwise back to this
week to look at what's live. By Wednesday a manager isn't reading the current
roster, they're building the next one.

Only ever this week or next. Scanning for the earliest draft anywhere would
drop you into some half-built week in December.

It redirects rather than rendering the grid at `/` so the URL always names a
week: bookmarkable, back button works, one route renders the grid instead of
two.

Navigation is the tab bar — Roster, Staff, Settings, History, Roster text. No
home tab, because the roster *is* home.

---

## 5. The pure core

Everything interesting is a function of data. No database, no React, no dates
from `Date.now()` passed implicitly — the clock comes in as an argument.

```ts
parseShorthand('10-18')   // { start: 600, end: 1080 }
parseShorthand('10-6')    // { start: 600, end: 1080 }  — resolves forward
formatTime(1260)          // '21:00'

hoursFor(staffId, shifts)                 // 24
weekTotal(shifts)                         // 109

buildWarnings({ staff, shifts, leave, naNotes, closedDays, weekStart })
// → [{ level: 'high', who: 'John Reyes', text: 'Rostered on Sun — not usually available.' }]

planCopy({ from, to, staff, leave, closedDays })
// → { shifts: [...], skipped: { inactive: 0, onLeave: 2, closed: 0 } }
```

`planCopy` returning its skips rather than swallowing them is what lets the UI
say *"12 copied, skipped 2 landing on booked leave"*.

**This is the only code worth testing.** Every rule in the spec is one test:
the 38-hour threshold, the 10-hour rest gap, N/A versus leave, what copying
drops. The UI needs no tests — if the core is right, the grid is just a table.

---

## 6. Publishing

Publishing writes the week's entire content as JSON onto `rosters.snapshot`:
names, times, closed days, notes, exactly as they were.

```ts
type Snapshot = {
  weekStart: string
  publishedAt: string
  version: number
  days: {
    date: string
    closed: boolean
    on: { name: string; times: string[] }[]   // only people actually working
  }[]
}
```

Shaped for the output it feeds: a day, and who's on it. The share route renders
the snapshot to text and nothing else. A published roster is then
physically incapable of changing when someone is renamed or deactivated six
months later.

The alternative — reconstructing history from live tables plus soft deletes —
is much harder and goes subtly wrong the first time a name changes. A blob is
a few lines and cannot drift.

Re-publishing bumps `version`, rewrites the snapshot, and the sheet switches
from *Published* to *Updated*. Warnings never block it.

---

## 7. Styling

The mockup's palette, spacing and dark mode already work. Carry them over as
CSS variables and point Tailwind at them, rather than re-picking colours:

```css
/* globals.css */
@theme {
  --color-surface: #ffffff;
  --color-line:    #d3d8d3;
  --color-ink:     #1a201d;
  --color-accent:  #146356;
  /* …the rest, straight from the mockup */
}
```

Then `bg-surface`, `border-line`, `text-accent` are real Tailwind utilities and
dark mode stays a matter of redefining the variables. Don't scatter
`bg-[#146356]` through the components.

The grid itself is CSS Grid — `grid-template-columns: 168px repeat(7, 1fr)` —
not a table. Tailwind can hold that, but a handful of plain CSS classes for the
grid and the print sheet is fine and probably clearer.

---

## 8. Saving and state

One user, so no conflicts, no locking, no optimistic-update reconciliation.
Every edit calls a Server Action, which writes and revalidates. There is no
"unsaved changes" state — the only draft/published distinction is the roster's
own status.

Client state is just what the server handed over. For the editor, `useReducer`
over the week's data is plenty; re-rendering a 6×7 grid is free.

---

## 8b. Running it

**While building it:** `npm run dev`, open `localhost:3000`. Normal.

**Once you're using it for real**, the server should start when you want the
app and not before. One Dock icon that boots the server if it isn't up, waits
for it, then opens a clean window.

```bash
#!/bin/bash
APP_DIR="$HOME/Documents/Personal/xiaopai"
PORT=3210
URL="http://localhost:$PORT"

# already running? just open it
if ! curl -sf "$URL" >/dev/null 2>&1; then
  cd "$APP_DIR" || exit 1
  PORT=$PORT nohup npm start >/tmp/ahma-roster.log 2>&1 &
  for _ in $(seq 1 40); do                 # wait up to 10s for it to answer
    curl -sf "$URL" >/dev/null 2>&1 && break
    sleep 0.25
  done
fi

open -a "Google Chrome" --args --app="$URL"
```

**Making it a Dock icon.** A `.app` on macOS is just a folder with a specific
shape, so build it yourself. No tooling involved — `mkdir`, `cp` and `chmod`,
all already on the machine, and the whole thing lives in the repo:

```
scripts/launcher/
  Info.plist
  run                 ← the script above
  make-icon.py        ← draws icon.png, standard library only
  make-icns.sh        ← icon.png -> icon.icns via sips + iconutil
  make-app.sh         ← assembles the bundle
```

```xml
<!-- Info.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>CFBundleName</key><string>Ah Ma Roster</string>
  <key>CFBundleIdentifier</key><string>com.ahma.roster</string>
  <key>CFBundleExecutable</key><string>run</string>
  <key>CFBundleIconFile</key><string>icon</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>LSUIElement</key><true/>
</dict></plist>
```

```bash
# make-app.sh
set -e
cd "$(dirname "$0")"
[ -f icon.icns ] || ./make-icns.sh

APP="$HOME/Applications/Ah Ma Roster.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp Info.plist "$APP/Contents/"
cp run        "$APP/Contents/MacOS/run"
chmod +x      "$APP/Contents/MacOS/run"
cp icon.icns  "$APP/Contents/Resources/"
echo "built $APP — drag it to the Dock"
```

### The icon

An app with no `icon.icns` gets the blank generic one, so the bundle ships with
its own. `make-icon.py` draws it — seven day columns, three staff rows, filled
where someone is on, and the second column bare because Tuesday is shut. It's
the roster grid, which is the whole app.

It's **standard library Python**: a rounded-rect signed-distance function for
antialiasing and a hand-rolled PNG encoder over `zlib`. No Pillow, nothing
downloaded, about a second to run. `make-icns.sh` then resizes it into the ten
sizes macOS wants with `sips` and packs them with `iconutil` — both built in.

The art is 824×824 inside a 1024 canvas, which is the proportion Apple uses, so
it sits at the same visual size as everything else in the Dock.

Change the colour or the pattern in `make-icon.py` and re-run `make-app.sh`.

`--app=` gives a window with no address bar and no tabs, so it reads as an app
rather than a browser.

Run it once, drag the result to the Dock. `LSUIElement` stops the launcher
leaving its own icon bouncing while Chrome opens.

**The trap that will get you:** an app launched from Finder gets a minimal
`PATH` — no Homebrew, no nvm — so `npm` won't be found and the icon will appear
to do nothing. Put the path in the script explicitly:

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
# nvm users also need:  . "$HOME/.nvm/nvm.sh"
```

That the bundle is three readable files in the repo is the point: you can diff
it, rebuild it on another machine, and see exactly what the Dock icon does.

If a Dock icon isn't worth the trouble, rename `run` to `run.command` and
double-click that instead. It works, and it opens a Terminal window alongside —
honest, but ugly.

### What this costs you

| | On demand (this) | Always on (launchd) |
|---|---|---|
| Idle when unused | nothing | ~100–150MB |
| First open | 1–3s cold start | instant |
| Anything to remember | no | no |

The cold start is the whole trade, and it's once a week.

### Stopping it

**Closing the window does not stop the server.** It keeps running until you log
out, which is usually fine. If you'd rather it tidied up after itself, have the
server exit on its own after a spell with no requests:

```ts
// instrumentation.ts — bump on every request, quit when idle
let lastHit = Date.now()
export function onRequest() { lastHit = Date.now() }
setInterval(() => {
  if (Date.now() - lastHit > 30 * 60_000) process.exit(0)
}, 60_000)
```

Next time you click the Dock icon it simply starts again.

### After changing code

`npm start` serves the last build, so a code change needs `npm run build`
before it shows up. The launcher deliberately doesn't build — that would put a
30-second wait on every open.

### The database file

`xiaopai.db` lives in the project folder. Backup is `cp xiaopai.db ~/backups/`,
and that's a complete backup — schema, rosters, staff, everything.

**Don't put it in iCloud Drive or Dropbox.** Live-syncing an open SQLite file
is a known way to corrupt one. Copy it out on a schedule instead.

### First run

An empty database shouldn't look broken. Two parts:

- A **seed script** for the initial staff, the three shift templates and the
  trading hours — the things you'd otherwise type in by hand once.
- **Empty states** that read as instructions: a roster with no staff says *add
  your team on the Staff page*, not a blank grid.

### From a phone

Later, if wanted: `tailscale serve` puts it on your tailnet without opening
anything to the internet. Nothing in the app changes.

---

## 9. Later, not now

A JSON export for backup. Undo on the grid. Everything in the spec's
out-of-scope list. If it ever needs to be reachable from a phone, Tailscale
Serve puts it there without opening anything to the internet.
