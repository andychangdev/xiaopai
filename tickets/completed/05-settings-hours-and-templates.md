# 05: Settings — trading hours and shift templates

**What to build:** A Settings page for what holds from week to week: trading hours per weekday, and the shift templates. Each template is one click in the cell popover and fills in its times, which can still be edited afterwards. Trading hours show in the grid footer (the mockup's `Open 10:00–18:00 · 21:00 Thu` line) and drive nothing else. Settings holds nothing week-specific: closed days belong to the week (ticket 08). Reference: SPEC §2 ShiftTemplate and Settings; the mockup's Settings tab and cell popover.

**Blocked by:** 03 Shifts on the grid

**Status:** done

- [x] "The week" table sets opening and closing times for each weekday and shows each day's hours.
- [x] "Shift templates" table: add, rename, change times, remove. It starts with the seeded Short day (10:00–16:00), Full day (10:00–18:00) and Shopping night (10:00–21:00).
- [x] The cell popover lists each template, with name and times, above the time box. One click adds that shift.
- [x] A shift placed from a template edits like any other. Editing or removing a template never changes existing shifts.
- [x] The grid footer summarises trading hours, and its Trading hours button links here.
