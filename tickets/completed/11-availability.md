# 11: Availability

**What to build:** Each person has a recurring pattern of weekdays they can normally work, set on the Staff page. On the grid, a day outside someone's pattern shows N/A over a faint tint. It's a note, not a barrier: hovering shows the usual +, the day can be rostered like any other, and doing so raises a soft warning. Reference: SPEC §2 "The three kinds of can't work" and §3 Roster editor; the mockup's Staff tab and N/A cells.

**Blocked by:** 02 Staff page, 10 Warnings panel

**Status:** done

- [x] The Staff page shows seven weekday toggles (M T W T F S S) for each person. New people start available every day.
- [x] A cell on a weekday the person isn't usually available shows N/A over a tint, with the tooltip `John — isn't usually available on Sun`. On hover the N/A fades to the usual +.
- [x] Rostering there works normally and raises `Rostered on Sun — not usually available.`
- [x] The tint stays on cells that hold a shift.
- [x] Changing someone's availability never touches existing shifts.
- [x] The warning rule has a test.
