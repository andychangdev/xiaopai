# 03: Shifts on the grid — assign, edit, remove, Clear week

**What to build:** The core of the roster editor, and where the app is won or lost:
- Clicking a cell opens a small popover for that person and day. The manager types a time range, presses Enter, and the shift appears in the cell as a chip.
- Clicking a chip changes its times or removes it.
- A cell can hold more than one shift (split shifts).
- Clear week empties the week.

Every change saves as it happens (Server Actions and revalidation, ARCHITECTURE §2b and §8), so a reload shows exactly what was there. This ticket accepts plain 24-hour ranges. Ticket 04 adds the shorthand. Reference: SPEC §3 Roster editor; the mockup's cell popover and Clear week.

**Blocked by:** 01 Walking skeleton

**Status:** done

- [x] Clicking an empty cell opens a popover headed with first name and date (`John · Mon 5 Oct`), with the time box focused. Typing `10:00-18:00` or `10-18` and pressing Enter adds the shift. Esc or Cancel closes without saving.
- [x] Chips show 24-hour times (`10:00–18:00`).
- [x] Clicking a chip lets you change its times or remove it.
- [x] A cell that already has a shift can take another, and shifts in a cell stack in start-time order.
- [x] An end at or before the start is refused with an inline message and nothing saves. Overnight shifts aren't supported.
- [x] The first save to a week creates its roster record as a draft, with every day open.
- [x] Grid rows are every active person, plus anyone since made inactive who has shifts that week, so past weeks never lose a row.
- [x] Clear week in the grid footer confirms with the count (`Clear 12 shifts`) and then removes every shift in the week. On an empty week it says there's nothing to clear.
- [x] Time helpers (format minutes as `HH:MM`, shift duration) are pure functions with tests.
