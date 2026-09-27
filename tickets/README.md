# Roster app: tickets

These tickets build the app described in SPEC.md, following ARCHITECTURE.md, with the mockup (`mockup/roster-editor.html`) as the behavioural reference. There's one file per ticket: open ones in `to-do/`, finished ones in `completed/`. Work the frontier: any ticket in `to-do/` whose blockers are all in `completed/`. When a ticket is done, tick its boxes, set its status to done, and move its file to `completed/`.

| # | Ticket | Blocked by |
|---|---|---|
| 01 | [Walking skeleton](completed/01-walking-skeleton.md) | — |
| 02 | [Staff page](completed/02-staff-page.md) | 01 |
| 03 | [Shifts on the grid](completed/03-shifts-on-the-grid.md) | 01 |
| 04 | [Shorthand time entry](completed/04-shorthand-entry.md) | 03 |
| 05 | [Settings: trading hours and shift templates](completed/05-settings-hours-and-templates.md) | 03 |
| 06 | [Copy a shift](completed/06-copy-a-shift.md) | 03 |
| 07 | [Copy previous week](completed/07-copy-previous-week.md) | 02, 03 |
| 08 | [Closed days](completed/08-closed-days.md) | 07 |
| 09 | [Hours this week](completed/09-hours-this-week.md) | 03 |
| 10 | [Warnings panel](completed/10-warnings-panel.md) | 09 |
| 11 | [Availability](completed/11-availability.md) | 02, 10 |
| 12 | [Mark N/A](completed/12-mark-na.md) | 11 |
| 13 | [Booked leave](completed/13-booked-leave.md) | 06, 07, 12 |
| 14 | [Roster text](completed/14-roster-text.md) | 08 |
| 15 | [Publish and snapshot](completed/15-publish-and-snapshot.md) | 10, 14 |
| 16 | [History](completed/16-history.md) | 15 |
| 17 | [Undo](to-do/17-undo.md) | 06, 08, 12 |
| 18 | [JSON export](completed/18-json-export.md) | 05 |
| 19 | [Dock launcher](completed/19-dock-launcher.md) | 01 |
| 20 | [Roster toolbar tidy and This week](completed/20-roster-toolbar-tidy.md) | 07, 15 |

## Calls made where the docs disagree

- **Leave booked over existing shifts** (13): follows SPEC. You can keep the shifts and get a warning. The mockup only offers remove or cancel.
- **Deactivating someone** (02, 03): never deletes their shifts, and any week where they have shifts keeps their row. The mockup deletes them from the open week.
- **Copy previous week with every shift skipped** (07): changes nothing and says why, rather than emptying this week for nothing. The mockup replaces the week anyway.
- **The schema** (01): lands whole in ticket 01, so parallel tickets don't collide on migration files. This is the one piece that isn't a vertical slice.
- **Roster buttons** (20): drops Manage staff and Trading hours, since the tabs already cover them, and puts Copy previous week in the grid footer. Roster text leaves the tab bar, is renamed Share roster, and sits next to Publish roster, taking the place of SPEC §2's View sheet. The mockup and ARCHITECTURE §4 have the old layout.
- **History's list** (16): a published week stays listed after it's been emptied, since staff still hold what went out. SPEC lists only weeks with shifts on them. The open week travels in the URL (`/history?week=`), so History only knows it when you come from that week's grid or Share roster; from Staff or Settings it's the week the Roster tab would open.
- **Dock launcher** (19): differs from ARCHITECTURE §8b's script and build steps in several ways:
  - The bundle is an AppleScript applet (`osacompile`) that runs `scripts/launcher/run` from the project, instead of a bundle whose executable is the script. macOS 26 treats a script bundle as `/bin/bash`, and refuses it the Documents folder without asking. The applet is asked about once. Launcher changes need no rebuild.
  - The server listens on 127.0.0.1 only, and always uses the project's own `xiaopai.db`.
  - Chrome opens with `open -n`, because without it the `--app` flag is dropped when Chrome is already open.
  - The server check fetches `/icon.png`, which never touches the database.
  - If the server doesn't start, an alert names the log, so the icon never seems to do nothing.
- **Undo and JSON export** (17, 18): SPEC includes them, and ARCHITECTURE §9 says "later". Both are kept, at the end.
- **JSON export** (18): the file comes from a route, `/settings/backup`, because a Server Action can't hand the browser a download. It's the one route that isn't a page; ARCHITECTURE §1 has none. The route reads the schema to find every table, so a table added later is exported too. Lists of plain values, like the seven weekday flags, stay on one line so the file is easier to read.

## Not ticketed

- Week notes and shift notes. They're in the schema, but no screen uses them.
- Idle shutdown of the server (ARCHITECTURE §8b, "Stopping it"), which is optional.
- Everything in SPEC §5, "Out of scope".
