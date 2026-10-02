# xiaopai — Architecture

How the app in [SPEC.md](SPEC.md) is built. One manager, one restaurant,
running on a laptop.

---

## 1. Stack

| | | Why |
|---|---|---|
| **Next.js 16** (App Router) | UI + server | One project. Server Actions mean a button calls a server function directly — no REST layer to design or keep in sync |
| **React 19** | UI | `useOptimistic` and `useTransition` cover the few places a click should show before the server answers |
| **SQLite** via **better-sqlite3** | storage | No database server. Backup is copying one file |
| **Drizzle** | queries, migrations | Typed, thin, and close enough to SQL that you learn SQL |
| **TypeScript** | language | Catches a renamed field across the rules, the queries and the components |
| **Tailwind 4** | styling | Theme tokens live in CSS (§7) |
| **Vitest** | tests | Only for §5 |

Deliberately absent: an API layer, React Query, Redux, a component library,
Docker, auth, and anything to do with PDFs — the roster leaves the app as text
pasted into a chat. The one route that isn't a page is `/settings/backup`,
which downloads the JSON export, because a Server Action can't hand the
browser a file.

---

## 2. Five rules

**Never store what you can calculate.** Hours, cost, warnings, whether a cell is
N/A, whether a published week has been edited since — all derived on every
render. A `total_hours` column would be a bug waiting to happen.

**The rules live in one pure module.** `lib/roster/` imports nothing from
React, Next or the database. Data in, answers out. The components and the
Server Actions both call it, so the grid and the server can't disagree about
what's allowed.

**The week is the unit.** Everything the editor needs comes from one call,
`rosterWeek(week)`: the week's rows, shifts, N/A notes, leave, closed days and
where it stands on publishing. Load on navigate, write on edit.

**Dates are strings.** `"2026-10-05"`. No `Date` in the database, no timezone
library. A week is named by its Monday. The clock is read in exactly one
place, `lib/clock.ts`; everything else is handed today's date.

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

### Setup

```ts
// lib/db/open.ts — shared by the app, drizzle-kit and the seed
export const DB_FILE = process.env.XIAOPAI_DB || 'xiaopai.db'

export function openDb(file = DB_FILE) {
  const sqlite = new Database(file)
  sqlite.pragma('foreign_keys = ON')
  return drizzle(sqlite, { schema, casing: 'snake_case' })
}

// lib/db/client.ts — the app's own connection
import 'server-only'

export function getDb(): Db {
  if (!cached.xiaopaiDb) {
    if (!existsSync(DB_FILE)) throw new Error(`No ${DB_FILE} … Run \`npm run db:migrate\``)
    cached.xiaopaiDb = openDb()
  }
  return cached.xiaopaiDb
}

// next.config.ts — better-sqlite3 is native, don't bundle it
serverExternalPackages: ['better-sqlite3']
```

- `getDb()` opens the file on first use, so `next build` never touches it. It
  refuses to create a missing one: that means migrations haven't run, or the
  server started in the wrong folder.
- `casing: 'snake_case'` keeps keys camelCase in TypeScript and columns
  snake_case in SQL. `drizzle.config.ts` sets it too.
- `XIAOPAI_DB` points the app, drizzle-kit and the seed at another file, such
  as a scratch copy. It has to be exported in the shell: `.env` files don't
  reach all three.

### Reading — the page queries directly

```tsx
// app/roster/[week]/page.tsx
export const dynamic = 'force-dynamic'

export default async function RosterPage({ params }: Props) {
  const { week: param } = await params
  const week = canonicalWeek(param, openWeek)
  if (week !== param) redirect(`/roster/${week}`)

  const { staff, shifts, naNotes, leave, closedDays, publish } = rosterWeek(week)
  return <RosterGrid week={week} staff={staff} shifts={shifts} … />
}
```

No `fetch`, no `/api/` route, no loading state. The queries end in `.all()` or
`.get()` with no `await` — better-sqlite3 is **synchronous**. Ideal for one
user on a laptop; exactly what you'd never do on a busy server.

`force-dynamic` is on the layout and every page. Next can't see that a page
reads the database, and would otherwise render it once at build time.
`canonicalWeek` turns any date into its week's Monday, and anything that
isn't a date into the week `/` would open, so the URL always names a Monday.

### Writing — Server Actions

```ts
// app/actions.ts
'use server'
export async function addShift(input: {
  week: string; staffId: number; date: string; start: number; end: number
}): Promise<ActionResult> {
  const { week, staffId, date, start, end } = input ?? {}
  checkWeek(week)
  checkId(staffId)
  checkDate(week, date)
  const error = timesError(start, end)
  if (error) return { error }
  if (isClosed(closedDaysOf(week), date)) return { error: dayClosedError(date) }
  // … and the person has a row this week and isn't on leave

  undoable(week, describeAction({ kind: 'add', … }), (tx) => {
    tx.insert(rosters).values({ weekStart: week }).onConflictDoNothing().run()
    tx.insert(shifts).values({ weekStart: week, staffId, date, start, end }).run()
  })
  gridChanged()
  return {}
}
```

```tsx
// components/ShiftPopover.tsx
'use client'
import { addShift } from '@/app/actions'
const result = await addShift({ week, staffId, date, start, end })
if (result.error) setError(result.error)
```

That import looks ordinary but isn't — Next replaces it at build time with an
RPC call. The function body never reaches the browser, only its address.
**This is what replaces an entire API layer.**

Every action returns `{ error?: string }`. An edit the rules refuse comes back
as a message the UI shows as it is; a throw is only for input no screen would
send, like a week that isn't a Monday.

Then it revalidates, which re-runs the Server Components, re-queries SQLite
and sends back the changed markup. There are three helpers: `gridChanged`
refreshes the grid, Share roster and History; `staffChanged` and
`settingsChanged` refresh the whole layout, since staff and settings show on
every page. You never write "add it to local state, and also save it" —
there is one source of truth and the UI is a view of it.

Two actions ask before they go ahead. `copyWeek` over a week that already has
shifts comes back with `{ replacing: 12 }`, and `bookLeave` over rostered
shifts with `{ clashes: 2 }`. The client asks the manager, then calls again
with the answer (`replace: true`, `shifts: 'remove' | 'keep'`). The count is
the server's, taken as the week is now.

### Migrations

```bash
npm run db:generate   # reads lib/db/schema.ts, writes a .sql migration
npm run db:migrate    # applies it to xiaopai.db
```

The migrations are plain SQL in `drizzle/`, numbered in the order they
apply. Read them — it's the clearest way to see what the TypeScript actually
meant.

### Four things that will bite

1. **Never import the database into a `'use client'` file.** `client.ts`,
   `queries.ts` and `undo.ts` import `server-only`, so the build fails if one
   does, and that failure is the safety net. Type-only imports are fine;
   they're erased. `open.ts` has no guard, so the seed and drizzle-kit can use
   it, and components must never import it.
2. **Native module.** Next already keeps better-sqlite3 out of the bundle by
   default; `serverExternalPackages` names it anyway so the dependency is
   visible. Bundle it and the build dies with a confusing error about `.node`
   files.
3. **Hot reload re-runs modules on every save.** The connection and the undo
   history (§8) are both cached on `globalThis`, or each save would open a new
   connection and lock the file.
4. **Server Actions are POST endpoints.** Anyone who can reach the app can call
   any of them with anything. So every action checks its own input with the
   same rules the UI uses, and the production server listens only on
   `127.0.0.1` (§8b).

---

## 3. Schema

Times are **minutes since midnight** — `600` is 10:00, `1260` is 21:00. Money
is **whole cents** — `2850` is $28.50. Integer maths, formatted at the edge.
Weekday arrays are seven entries, Monday first.

```ts
staff = sqliteTable('staff', {
  id:            integer().primaryKey({ autoIncrement: true }),
  name:          text().notNull(),
  active:        integer({ mode: 'boolean' }).notNull().default(true),
  available:     text({ mode: 'json' }).$type<boolean[]>().notNull(),  // 7, Mon-first
  sortOrder:     integer().notNull(),
  expectedHours: integer(),          // nullable
  hourlyRate:    integer(),          // cents, nullable; only for the cost estimate
  notes:         text(),
})

shiftTemplates = sqliteTable('shift_templates', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(), start: integer().notNull(), end: integer().notNull(),
  sortOrder: integer().notNull(),
})

settings = sqliteTable('settings', {       // one row, id 1
  id:           integer().primaryKey(),
  businessName: text().notNull(),
  weekendRate:  integer().notNull().default(100),   // % of each person's hourly rate
  holidayRate:  integer().notNull().default(100),
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
  closedDays:  text({ mode: 'json' }).$type<boolean[]>().notNull().default(ALL_OPEN),
  snapshot:    text({ mode: 'json' }).$type<Snapshot>(),             // §6
})

shifts = sqliteTable('shifts', {
  id:        integer().primaryKey({ autoIncrement: true }),
  weekStart: text().notNull().references(() => rosters.weekStart),   // indexed
  staffId:   integer().notNull().references(() => staff.id),
  date:      text().notNull(),       // '2026-10-08'
  start:     integer().notNull(),
  end:       integer().notNull(),
})

naNotes = sqliteTable('na_notes', {          // "can't do Friday this week"
  id: integer().primaryKey({ autoIncrement: true }),
  weekStart: text().notNull().references(() => rosters.weekStart),
  staffId: integer().notNull().references(() => staff.id),
  date: text().notNull(),
})                                            // unique(weekStart, staffId, date)

leave = sqliteTable('leave', {
  id: integer().primaryKey({ autoIncrement: true }),
  staffId: integer().notNull().references(() => staff.id),
  fromDate: text().notNull(), toDate: text().notNull(), note: text(),
})

holidays = sqliteTable('holidays', {         // public holidays, for the cost estimate
  id: integer().primaryKey({ autoIncrement: true }),
  date: text().notNull().unique(), name: text(),
})
```

Foreign keys are enforced: `openDb` turns them on for every connection.

**A week gets its `rosters` row the first time anything is saved to it** — a
shift, an N/A note, a closed day, a copy, a publish. A week with no row reads
as a draft with every day open.

**Why shifts store a real date** rather than a 0–6 column index: the row is then
self-contained. Checking it against leave needs no join to work out what day it
actually was, and a shift can't end up disagreeing with the week it's filed
under. The grid maps date → column, which is subtraction.

**Why `closedDays` is JSON on the roster, not its own table:** it's always
exactly seven booleans, always read together, and never queried across weeks.

**Leave belongs to real dates, not to a week.** One booking can span several
weeks, so `leaveDuring(week)` finds every booking that overlaps it.

**Staff are deactivated, not deleted.** Unticking Active takes someone off new
weeks but keeps their row on any week where they have shifts. Only a record
with no shifts and no leave — a typo, say — can be removed outright, and its
N/A notes go with it.

---

## 4. Layout

```
app/
  layout.tsx                 the sidebar (a bottom bar on a phone), then the page
  page.tsx                   redirects to the week that needs work
  roster/page.tsx            redirects to /
  roster/[week]/page.tsx     the grid — the whole app, really
  share/page.tsx             redirects to the week / would open
  share/[week]/page.tsx      Share roster: the plain-text roster + Copy
  history/page.tsx           every week, newest first
  staff/page.tsx             people, availability, booked leave
  settings/page.tsx          business name, trading hours, templates, backup
  settings/backup/route.ts   GET: the JSON export as a download
  actions.ts                 every mutation
  globals.css                theme tokens and the grid (§7)
components/                  client components: the grid, popovers, tables, dialogs
lib/
  clock.ts                   today(), the one place the clock is read
  roster/                    pure rules — tested, imports nothing outside itself
    time.ts                  minutes, shorthand '10-18', 'HH:MM', what a shift may be
    dates.ts                 week maths, labels, canonicalWeek
    shifts.ts                the Shift type, cells, copying one shift
    hours.ts                 per person, per week, against expected
    cost.ts                  hourly, weekend and holiday rates, and the week's estimated cost
    warnings.ts              the whole warnings list, overlapping shifts
    availability.ts          the usual weekly pattern
    notAvailable.ts          N/A notes on one week
    leave.ts                 booked leave: parsing, overlaps, what it blocks
    closed.ts                a week's closed days
    copy.ts                  what Copy previous week brings and skips
    publish.ts               snapshots, publish state, status line, the landing week
    revert.ts                putting a published week back as it went out
    rosterText.ts            the week day by day, and the text for the chat
    history.ts               History's rows
    weekMenu.ts              the roster's menu of nearby weeks
    undo.ts                  undo steps and when one still applies
    staff.ts                 grid rows, the manual order, Staff page input
    settings.ts              business name, trading hours, new templates
    backup.ts                the JSON export file
    types.ts                 Snapshot
  db/
    schema.ts                the tables
    open.ts                  opening a connection (app, seed, drizzle-kit)
    client.ts                the app's cached connection
    queries.ts               every read the pages make
    undo.ts                  running grid actions so they can be undone
scripts/
  seed.ts                    starting data for an empty database
  launcher/                  the Dock icon (§8b)
drizzle/                     migrations, plain SQL
```

### Routing

There is no homepage. The app does one thing, so `/` redirects to a week:

```ts
// lib/db/queries.ts
export function openWeek(): IsoDate {
  return landingWeek(mondayOf(today()), (week) => needsPublishing(rosterWeek(week).publish))
}

// lib/roster/publish.ts
export function landingWeek(thisWeek: IsoDate, needsWork: (week: IsoDate) => boolean): IsoDate {
  const nextWeek = addDays(thisWeek, 7)
  if (needsWork(thisWeek)) return thisWeek
  if (needsWork(nextWeek)) return nextWeek
  return thisWeek
}
```

**Go to the earliest week that still needs work** — this week if it isn't
published or has been edited since, otherwise next week if that isn't,
otherwise back to this week to look at what's live. By Wednesday a manager
isn't reading the current roster, they're building the next one.

Only ever this week or next. Scanning for the earliest draft anywhere would
drop you into some half-built week in December.

It redirects rather than rendering the grid at `/` so the URL always names a
week: bookmarkable, back button works, one route renders the grid instead of
two. `/roster` and `/share` on their own land the same way.

Navigation is a sidebar down the left of every page: the business's initial
and name at its head, then Roster, History and Staff, with Settings at its
foot. On a phone (under Tailwind's `sm`) it becomes a bar fixed along the
bottom with the same four, and pages leave `--bottom-bar` clear at their
foot. No home page, because the roster *is* home. Share roster isn't in the
sidebar: it opens from the foot of the Week summary, next to Publish, and
counts as Roster while it's open.

The sidebar is 72px, so the Week summary sits beside the grid only from
1382px wide, where the grid still gets its full 960px.

History is a page of its own, so the week you have open travels with it as
`/history?week=2026-10-05`: the sidebar adds it when you leave a grid or
Share roster, and Roster takes you back to that week rather than to `/`.

---

## 5. The pure core

Everything interesting is a function of data. No database, no React, and no
`Date.now()` — the clock comes in as an argument.

```ts
parseShorthand('10-18')   // { start: 600, end: 1080 }
parseShorthand('10-6')    // { start: 600, end: 1080 }   — the end moves on 12h until it's after the start
parseShorthand('5-9')     // { start: 1020, end: 1260 }  — a start before 7 means the afternoon
formatTime(1260)          // '21:00'

hoursFor(staffId, shifts)                 // 1440 — minutes, so 24h
weekTotal(shifts)                         // 6540, 109h
rateOn('2026-10-10', rates)               // 125 — a Saturday, at the weekend rate
costFor(staffId, shifts, 3200, rates)     // 1408 — dollars, weekends and holidays raised
weekCost(staff, shifts, rates)            // 2779 — the sum of each person's, rounded
rosteredWithoutRate(staff, shifts)        // [Jean] — on the week, but can't be costed

buildWarnings({ staff, shifts, naNotes, leave, weekStart, closedDays, published })
// → [{ level: 'high', who: 'John Reyes', text: 'Rostered on Sun — not usually available.' },
//    { level: 'low',  who: 'Mon 5 Oct',  text: 'Only John Reyes rostered — needs at least two.' },
//    { level: 'low',  who: 'Week total', text: '91h rostered — needs at least 98h.' }]

planCopy({ from, closedDays, to, staff, leave })
// → { shifts: [...], closedDays: [...], skipped: { inactive: 0, onLeave: 2, closed: 0 } }

copyReport(plan, from, closedBefore)
// → '12 shifts copied from 28 Sep – 4 Oct. Skipped 2 landing on booked leave.'
```

`planCopy` returning its skips rather than swallowing them is what lets the UI
say what was left behind, so nothing disappears silently. `planRevert` works
the same way for putting a published week back (§6).

Staffing warnings only count once the week is published, which is why
`buildWarnings` takes `published`: a week still being built isn't flagged for
gaps it hasn't filled yet. The page works it out for the Publish dialog's
count and the grid for its panel, from the same function.

The modules also own the words. Error messages, warning text, dialog
questions and status lines (`publishStatus`, `publishQuestion`, `copyReport`) come
from here, so the rule and the sentence explaining it sit side by side.

**This is the only code with tests.** Every rule in the spec is a test: the
38-hour week, the 10-hour rest gap, overlapping shifts, two people a day,
at least 98 hours a week, N/A versus leave, what copying drops, when a
published week counts as changed, when Undo still applies. Vitest only looks in `lib/roster/**/*.test.ts`, and runs in
`Australia/Sydney` so a local-versus-UTC mistake actually fails. The UI and
the database layer have none — if the core is right, the grid is just a view
of it.

---

## 6. Publishing

Publishing writes the week's entire content as JSON onto `rosters.snapshot`,
along with `status: 'published'`, the next `version` and today's date as
`publishedAt`: names, times and closed days, exactly as they were.

```ts
type Snapshot = {
  weekStart: string
  publishedAt: string
  version: number
  days: {
    date: string
    closed: boolean
    on: { staffId: number; name: string; times: string[] }[]   // only people actually working
  }[]
}
```

Shaped for the output it feeds: a day, and who's on it. `rosterDays` builds
that shape from the live week, `snapshotOf` freezes it, and `rosterText` turns
either into text. A published roster is then physically incapable of changing
when someone is renamed or deactivated six months later.

A blob is a few lines and cannot drift. Rebuilding an old week from the live
tables would go subtly wrong the first time a name changed.

### Where a week stands

```ts
type PublishState =
  | { status: 'draft' }
  | { status: 'published'; version: number; publishedAt: IsoDate; changed: boolean }
```

`changed` is never stored. `publishState` checks the live week against the
snapshot day by day: whether it's closed, and each person's id with their
times. Names and row order don't come into it, so a rename never makes an old
week look edited, and undoing the only edit puts it back to Published. The
grid and History both get it from the same function, so they can't disagree.

| State | Status line | Button |
|---|---|---|
| Draft | Draft · not sent to staff yet | Publish roster |
| Published, unchanged | Published v2 · 26 Sep | Publish update, greyed out |
| Published, edited since | Unpublished changes, with Revert | Publish update |

Publishing asks first, naming the shifts, the hours and any warnings
outstanding. Warnings never block it. Then Share roster opens, ready to copy.
Each publish after the first bumps `version` and rewrites the snapshot. A
draft with no shifts has nothing to publish, but a published week emptied
since can go out again: staff need telling the week they have is gone.

### Share roster

Once a week is published, Share roster shows the snapshot's text, so edits
since stay out of it until they're published too, and the page says so. It
ends `Published 27 Sep 2026`, then `Updated 8 Oct 2026 (v2)` for later
versions, so a fresh copy can be told from the last. A draft shows the live
week and ends `DRAFT - not published yet`, so a half-built week can't be
pasted by accident.

### Revert

Revert, on the Week summary's status line, puts an edited week back as it went out. `planRevert`
restores the snapshot's shifts and closed days. N/A notes were never
published, so they stay. A published shift the week can no longer take —
someone since removed from the staff list, or now on leave that day — stays
out, and the week still reads Unpublished changes, which is true. A revert is
a grid action, so Undo takes it back.

### History

Every week with shifts or a publish, plus the week you have open, newest
first: shifts, hours, `Draft` or `Published · v2`, and when. Any week can be
opened.

---

## 7. Styling

The palette — warm paper and jade — is CSS variables in Tailwind's `@theme`,
so the tokens are real utilities:

```css
/* app/globals.css */
@theme {
  --color-canvas:  #f4efe6;
  --color-surface: #fcfaf5;
  --color-line:    #e0d8c9;
  --color-ink:     #1e2420;
  --color-accent:  #12a26a;
  --color-primary: #109663;
  /* …surfaces, ink levels, warn, crit, radii, shadows, fonts */
}
```

Then `bg-surface`, `border-line`, `text-accent-deep` just work. Don't scatter
`bg-[#007a4d]` through the components. Accent, warn and crit are bright, for
fills and lines; each `-deep` is the same hue dark enough to read as text.
The app is always light (`color-scheme: light`), whatever the system setting.

Fonts are Archivo and IBM Plex Mono through `next/font/google`, wired into
`--font-sans` and `--font-mono`. The few controls every page shares are
classes in `@layer components`: `.btn`, `.btn-primary`, `.btn-danger`,
`.field`, `.text-link`. `.highlight` is the one look for whatever is current
or selected (the tab you're on, this week, a shift on the grid): accent-bg,
accent-line and accent-deep, at 4.7:1 contrast. `.badge` is the small
uppercase label for where something stands, coloured by `.highlight` or
`.badge-warn`.

The grid itself is CSS Grid, not a table, in plain CSS classes:

```css
.roster-grid {
  display: grid;
  grid-template-columns: 168px repeat(7, minmax(112px, 1fr));
  min-width: 960px;
}
```

`.cell-closed` hatches a closed day down its whole column. The other pages
are tables inside `Card`s under a `PageHead` (`components/Page.tsx`), which
also exports the `th` and `td` class strings they share. The Staff page is
the exception: a list with an edit panel beside it, which on a narrow screen
becomes a sheet over it. Whose panel is open lives in the URL
(`/staff?person=3`), set through the browser's own history, which Next
follows, so opening someone needs no trip to the server. Settings is one
card of `Section`s, each with its title and a line on what it's for beside
its controls once the card is wide enough (a container query) and above
them otherwise.

---

## 8. Saving and state

One user, so no conflicts, no locking, no optimistic-update reconciliation.
Every edit calls a Server Action, which checks, writes and revalidates. There
is no "unsaved changes" state — the only draft/published distinction is the
roster's own status. Text fields save when you leave them or press Enter
(`SaveOnBlur`); Esc abandons the edit, and a refused save puts the stored
value back.

Client state is only about the screen: which popover is open, the shift
picked up with Copy, the drag in progress. The data itself always comes down
as props from the server. Where a click should show before the server
answers — ticking Active or a weekday, dragging staff into a new order,
picking a time — `useOptimistic` inside `useTransition` shows it at once and
settles on whatever comes back.

Questions go through `useAsk()`, a dialog you can `await`:

```ts
const [dialog, ask, choose] = useAsk()
if (await ask({ title: 'Clear week?', body: '…', ok: 'Clear 12 shifts', danger: true })) …
```

`useCopyWeek` builds on it for Copy previous week's whole flow — nothing to
copy, replace what's there, what came across.

### Undo

Undo takes back the last grid action on a week: adding, changing, moving or
removing a shift, Clear week, Copy previous week, closing or reopening a day,
marking N/A, and revert. Leave, staff, settings and publishing aren't grid
actions.

Every grid action runs through `undoable(week, label, run)` in
`lib/db/undo.ts`: one transaction that reads the week before and after —
closed days, shifts, N/A notes, and the leave during it. Undo writes the
"before" back, ids and all, but only while the week still matches the
"after". If something changed it from elsewhere, like leave booked on the
Staff page, the history starts again rather than overwrite it. The button
names what it would undo, in words from `describeAction`. ⌘Z (or Ctrl+Z)
does the same, except while you're typing in a field or a dialog is open,
and holding the keys down is one undo, not one per repeat.

The history lives in the server's memory, per week, up to 50 steps, and goes
when the server stops. It's for taking back a slip, not for version history —
publishing is that.

---

## 8b. Running it

**While building it:** `npm run dev`, open `localhost:3000`.

**In real use**, the server starts when you want the app and not before. One
Dock icon boots the production server on `127.0.0.1:3210` if it isn't up,
waits for it, then opens a Chrome window with no address bar or tabs, so it
reads as an app rather than a browser.

```
scripts/launcher/
  run             what a click does
  make-app.sh     builds Roster.app
  Info.plist      keys added to the applet's own
  make-icon.py    draws icon.png, standard library only
  make-icns.sh    icon.png → icon.icns via sips + iconutil
  icon.png  icon.icns
```

### What a click does

[`run`](scripts/launcher/run) finds the project from its own path, then:

1. **A stale server goes.** If one answers but `.next/BUILD_ID` isn't the build
   it started on (noted in `/tmp/xiaopai.build`), it's stopped.
2. **No server, so start one.** It adds Homebrew and nvm to `PATH`, since an app
   opened from the Dock gets only the system's and `npm` wouldn't be found. It
   unsets `XIAOPAI_DB`, so it's always the project's own `xiaopai.db`, then
   runs `npm start -- -H 127.0.0.1` in the background, logging to
   `/tmp/xiaopai.log`, and waits up to ten seconds.
3. **If it doesn't come up, it says so.** A macOS alert gives the reason and
   points at the log, so the icon never seems to do nothing.
4. **Open the window.** `open -n -a "Google Chrome" --args --app=…`, or the
   default browser without Chrome.

"Is it up" asks for `/icon.png` rather than a page, since pages read the
database.

### Roster.app

```bash
npm run build                    # the icon serves the last build
scripts/launcher/make-app.sh     # → ~/Applications/Roster.app, or pass a folder
```

Drag it to the Dock. `make-app.sh` uses `osacompile` to make a small
AppleScript applet that runs `scripts/launcher/run` where it is, so changing
`run` needs no rebuild; moving the project does. It's an applet because macOS
won't let an app that's only a script into Documents, or even ask. An applet
asks once, with the reason from `NSDocumentsFolderUsageDescription`. If that's
ever refused, turn Roster on under System Settings → Privacy & Security →
Files & Folders.

Around `osacompile`, the script merges in `Info.plist` (the bundle id, and
`LSUIElement` so the applet leaves no icon bouncing while Chrome opens),
deletes the applet's `Assets.car` so its icon can't win over ours, copies in
`icon.icns`, ad-hoc signs the bundle again since those edits break
`osacompile`'s signature, and touches it so Finder and the Dock notice a new
icon. Everything it uses ships with macOS.

### The icon

`make-icon.py` draws it — seven day columns, three staff rows, filled where
someone is on, and the second column bare because Tuesday is shut. It's the
roster grid, which is the whole app. The same image is `app/icon.png`, the
browser tab's icon.

It's **standard library Python**: a rounded-rect signed-distance function for
antialiasing and a hand-rolled PNG encoder over `zlib`. No Pillow, nothing
downloaded, about a second to run. `make-icns.sh` then resizes it into the ten
sizes macOS wants with `sips` and packs them with `iconutil`.

The art is 824×824 inside a 1024 canvas, which is the proportion Apple uses, so
it sits at the same visual size as everything else in the Dock.

Change the colour or the pattern in `make-icon.py` and re-run `make-app.sh`,
which redraws the icon whenever the script is newer than it.

### What this costs you

| | On demand (this) | Always on (launchd) |
|---|---|---|
| Idle when unused | nothing | ~100–150MB |
| First open | 1–3s cold start | instant |
| Anything to remember | no | no |

The cold start is the whole trade, and it's once a week.

### Stopping it

**Closing the window does not stop the server.** It keeps running until you log
out, and the next click simply opens another window on it.

### After changing code

`npm start` serves the last build, so a code change needs
`npm run db:migrate` if there's a new migration, then `npm run build`. The
launcher never builds — that would put a 30-second wait on every open. A
server already running keeps serving the old build until the next click,
which stops it and starts one on the new build. A window already open shows
the new build once you reload it.

### The database file

`xiaopai.db` lives in the project folder. Backup is `cp xiaopai.db ~/backups/`,
and that's a complete backup — schema, rosters, staff, everything. It holds
real staff names, so `.gitignore` keeps every `*.db*` file out of the repo.

Settings' **Export backup** also downloads everything as one JSON file, named
with the date, laid out for a person to read. It walks the schema, so a table
added later comes along too. Nothing reads it back in.

**Don't put it in iCloud Drive or Dropbox.** Live-syncing an open SQLite file
is a known way to corrupt one. Copy it out on a schedule instead.

### First run

```bash
npm install
npm run db:migrate   # creates xiaopai.db
npm run db:seed      # starting data
npm run dev
```

An empty database shouldn't look broken. Two parts:

- A **seed script** for the things you'd otherwise type in by hand once:
  placeholder staff (one of them inactive), three shift templates and the
  trading hours. It refuses to touch a database that already has anything in
  it. The business is *Your restaurant* until Settings names it.
- **Empty states** that read as instructions: a roster with no staff says to
  add your team on the Staff page, and one where everyone is inactive says to
  tick Active for anyone working again — not a blank grid.

---

## 9. Later, not now

Everything in the spec's out-of-scope and deferred lists (SPEC §5).

Reaching it from a phone: `tailscale serve` puts it on your tailnet without
opening anything to the internet, and nothing in the app changes. There's no
login, though, so everyone on the tailnet could edit the roster.

Stopping the server on its own after half an hour with no requests, so it
doesn't sit there until logout. The next click would start it again.
