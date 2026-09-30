# xiaopai — Weekly Roster App

A manager-only web app for building and publishing the weekly staff roster
for a single restaurant. Runs locally. Employees never log in.

---

## 1. Decisions

| Topic | Decision |
|---|---|
| Business | One restaurant, no second site, ever. Its name is a setting |
| Users | One manager, localhost, no login |
| Week | Monday–Sunday, identified by the Monday's date (`2026-10-05`) |
| Dates | Plain local date/time strings. No timezone maths, no UTC |
| Breaks | Not modelled. Hours = end − start |
| Overnight shifts | Not supported. End time must be after start time |
| Shifts per day | An employee can have more than one (split shifts) |
| Times | 24-hour throughout — `10:00–18:00`; plain hyphens in the copied text |
| Staff on the grid | All active staff, always, in a manual order you set |
| Roles | None. Staff are just people with hours |
| Trading hours | 10:00–18:00, and 10:00–21:00 Thursday (shopping night) |
| Staffing warnings | Fewer than two people on an open day, or 98 hours or fewer in the week. Only once the week is published |
| Days off | Not stored. An empty cell means off, and prints as `OFF` |
| Availability | Weekdays a person can normally work. A warning, never a block |
| Leave | Dated periods, booked on the Staff page only. **Blocks** rostering |
| Not available | A per-week note on one cell. Warns, never blocks |
| Publishing | Snapshot + a plain-text roster you copy into the group chat |
| Deletion | Soft only. Nothing that appears on a past roster is ever removed |

**Assumed stack** (change freely): Next.js + SQLite. Single process, one local
database file, easy to back up.

---

## 2. Data model

**Employee** — `id`, `name`, `active`, `available[7]`, `sort_order`,
`expected_weekly_hours?`, `notes?`
`sort_order` is set by hand on the Staff page, dragging rows by their handle,
and is the row order on every roster. Not alphabetical: you think of your staff
in a particular order, and rows must never move around while you're editing.
`available` is one flag per weekday — the recurring pattern of when someone can
work. A dated absence is a **Leave** row instead.

**ShiftTemplate** — `id`, `name`, `start`, `end`
Used to prefill a shift. Times stay editable afterwards. The three real ones:

| Template | Times | Hours |
|---|---|---|
| Short day | 10:00–16:00 | 6 |
| Full day | 10:00–18:00 | 8 |
| Shopping night | 10:00–21:00 | 11 |

**Settings** — `business_name`, plus `open` and `close` per weekday
The name heads every page and the roster text. Trading hours are currently
10:00–18:00, Thursday to 21:00. Trading hours print on the sheet and
nothing else. **Settings holds no closed days** — see below.

**Leave** — `id`, `employee_id`, `from_date`, `to_date`, `note?`
A booked period of absence — one day or three weeks, whatever the person asked
for. **Booked on the Staff page only**; the roster can't create one. It belongs to the **person** and to real dates, not to a week's
draft, so it spans as many weeks as needed and **Clear week can't touch it**.

This is the one place the app **blocks** rather than warns: a day inside a
leave period can't be rostered. Clicking the cell says who's away and until
when instead of offering shifts. Booking leave over shifts that already exist
asks first, then removes them.

**NotAvailable** — `id`, `roster_id`, `employee_id`, `date`
A note the manager jots on the roster itself: *this person can't do this day*.
It changes nothing else — not their availability pattern, not their leave — and
it doesn't block. It's there so a one-off conversation ("can't do Friday this
week") survives being forgotten.

### The three kinds of "can't work"

| | Set on | Scope | Effect |
|---|---|---|---|
| **Availability** | Staff | Every week | `N/A` in the cell, warns |
| **Mark N/A** | Roster cell | This week | `N/A` in the cell, warns |
| **Leave** | Staff | Dated period | `LEAVE` in the cell, **blocks** |

Availability is the habit, *not available* is this week's exception, leave is a
booked absence. Only the last one stops you.

**Roster** — `id`, `week_start`, `status` (`draft` | `published`), `version`,
`published_at?`, `closed_days[7]`
One row per week, keyed by the Monday. **`closed_days` belongs entirely to the
week.** A new week starts with every day open; you close one by clicking its
heading on the grid. Nothing in Settings can reach back and change a week you've
already built, so a public holiday closure never leaks sideways.

The weekly Tuesday closure travels by **Copy previous week**, which brings the
source week's closed days with it. That's one click in the workflow you already
use, and it beats a global default that would have to be overridden every time
the shop opens on a normally-closed day.

**Shift** — `id`, `roster_id`, `employee_id`, `date`, `start`, `end`

### Publishing and history

Publishing writes a **snapshot** onto the roster: employee names and shift
times as they were at that moment. Later renaming or deactivating an employee
never alters a published sheet.

**Warnings never block publishing.** The confirm dialog names how many are
outstanding and publishes anyway — the manager already knows the roster is
unusual, that's why they built it that way.

A published week stays editable; there's no unpublish step. Editing one puts it
into **Unpublished changes**, and publishing again bumps `version` and
re-snapshots. From v2 the sheet reads `Updated 8 Oct` instead of `Published`,
so staff can tell a fresh printout from the one already on the wall.

The **Unpublished changes** badge holds an undo icon that reverts the week to
the published version, after asking: its shifts and closed days go back to the
snapshot's, and N/A notes stay. A published shift for someone now on leave
that day, or no longer on the staff list, can't come back, so the week still
reads Unpublished changes and the dialog says why. Undo takes a revert back.

The three states, shown as a badge next to the button:

| State | Badge | Button |
|---|---|---|
| Never published | Draft | Publish roster |
| Published, untouched | Published · v1 | Publish update, greyed out |
| Published, then edited | Unpublished changes | Publish update |

---

## 3. Screens

### Roster editor — the main screen

Employees as rows, Mon–Sun as columns, full width. One week at a time, with
arrows to move between weeks.

Every active employee is a row — there is no adding people to a week. Hiding
someone means marking them inactive on the staff screen, and past rosters keep
showing them.

Per cell: assign a shift, edit it, remove it, or **Mark N/A** for that day
(**Clear N/A** to undo). On a day their availability already rules out, the
action is absent — the cell says why and points at the Staff page, so there's
no way to stack a redundant note on top of the pattern. An empty cell means simply off. A leave day shows
`LEAVE` and refuses new shifts; leave can only be booked from the Staff page. Multiple shifts stack
inside one cell. Clicking a **day heading** closes or reopens that day.

Speed matters more than anything else here:

- **Shorthand entry.** `10-18` is taken literally; `10-6` and `10-9` resolve
  forward to 18:00 and 21:00, so either habit works. Everything displays as
  24-hour `HH:MM`.
- **Templates one keystroke away** — pick Full day, get 10:00–18:00.
- **Copy** a shift to another day or another employee.
- **Drag** a shift to another cell to move it there, times and all. It lands
  only where a new shift could go: not on a closed day, a leave day, or a cell
  that already has those times.
- **Copy previous week** — the single most-used action. It asks before
  overwriting a week that already has shifts, then copies what it can and
  reports what it didn't: shifts for staff no longer active, shifts landing on
  booked leave, and shifts on a day this week is closed. It also copies the
  source week's **closed days**. New employees are left empty, and N/A notes
  aren't copied — they're this week's exceptions.
- **Clear week** in the grid footer, which removes every shift in the week
  after confirming the count. It keeps booked leave, not-available notes and
  closed days — none of them are shifts.
- **Undo** the last grid action, Clear week included.

**Warnings** and **Hours this week** sit in two panels *below* the grid, not
beside it, so the roster gets the full width of the screen. Hours show per
person against their expected weekly hours, plus the week total; anyone more
than 20% above or below is highlighted.

A cell shows **N/A** over a faint tint when the person either isn't normally
available that weekday, or has been flagged not available for this one. It's a note, not a barrier: hover and the N/A fades out for the
usual `+`, and the day can be rostered exactly like any other. Doing so raises
a warning in the panel below — *“John Reyes — Rostered on Sun, not usually
available.”* The wording stays soft on purpose: availability is a habit, not a
rule, and the manager is the one who knows whether this week is an exception.

The tint stays on cells that already hold a shift, where the chip leaves no
room for the N/A. The warning names which of the two it is — *"not usually
available"* or *"marked not available this week"*.

### Warnings

Always advisory. Nothing blocks saving or publishing, and **every warning
appears in the panel below the grid** — the cells stay clean so the roster
reads as a roster. The one exception is an overlapping pair of shifts, outlined
in place because the panel can't point at which two.

- Overlapping shifts for one employee
- Over 38 hours in a week
- Under 10 hours between finishing one day and starting the next
- Someone rostered during booked leave (only reachable by declining the
  clean-up prompt when the leave was booked)
- Someone rostered on a weekday they're not usually available
- Someone rostered on a day flagged not available this week
- Fewer than two people on an open day, however long their shifts
- 98 hours or fewer rostered across the whole week

**Staffing warnings wait for publishing.** The last two only appear once the
week has been published, at any version, so a week still being built isn't
flagged for gaps it hasn't filled yet. They name the day, or the week, rather
than a person. The day's counts people, not hours: two on at different times
is enough. The week's needs more than 98 hours in total, so exactly 98 still
warns.

### Staff, Templates, Settings

Plain list-and-form admin screens. Nothing clever. The staff screen carries name,
availability, expected hours, notes and the active flag, and below it a
**Booked leave** table: who, from, to, days, note. Multi-day periods are
booked there; the roster's own cell action is just the one-day shortcut. Settings holds the business
name, trading hours per weekday — opens, closes — and the shift templates. Nothing week-specific.

### History

Every week with shifts on it, newest first: the date range, draft or
published (with version), shift count, hours, and when it was published. The
week you're currently editing is marked and has no actions.

Each other row offers **Open** (navigate to that week) and **Copy into open
week** (same copy rules as Copy previous week).

### Roster text

Not a sheet, not a table — **plain text, sized for a phone**. The manager
copies it and pastes it into the group chat, which is how the roster actually
reaches people.

Each day lists only the people **on shift**. Nobody appears because they're
off, N/A or on leave; a roster of absences is noise in a chat window. A closed
day says so on one line. An open day with nobody on it says `(no one rostered)`,
so it can't be mistaken for an omission. The heading is the business name
from Settings, in capitals.

```
YOUR RESTAURANT — STAFF ROSTER
5 Oct - 11 Oct 2026

Mon 5 Oct
John 10:00-18:00
Lisa 10:00-18:00

Tue 6 Oct - CLOSED

Wed 7 Oct
Sarah 10:00-18:00
Lisa 10:00-16:00

Thu 8 Oct
Priya 10:00-21:00
Sarah 10:00-16:00
Mike 10:00-18:00

Published 27 Sep 2026
```

A split shift folds onto one line — `John 10:00-14:00, 17:00-21:00`.

One **Copy to clipboard** button. Where the browser refuses clipboard access it
selects the text instead and says to press ⌘C.

A draft ends with `DRAFT - not published yet` rather than a date, so a
half-built week can't be pasted by accident and taken as final.

Printing is not built. A browser prints this page perfectly well if it's ever
needed, but nothing is designed around it.

---

## 4. Build order

1. Data layer and schema
2. Staff
3. Shift templates
4. **Roster grid** — assign, edit, remove, clear week *(the real work)*
5. Shorthand time entry and copy previous week
6. Hours and expected-hours highlighting
7. Availability, not-available notes, then booked leave
8. Publish and snapshot
9. Roster text and Copy to clipboard
10. History
11. JSON export for backup

Steps 4 and 5 are where the app is won or lost. Spend the time there.

---

## 5. Out of scope

Multiple businesses or locations · employee accounts, logins or apps ·
employee-submitted availability or leave requests ·
shift swaps · messaging · payroll · timesheets ·
automatic scheduling.

Deliberately deferred: labour cost estimates, public holidays, mobile editing.
