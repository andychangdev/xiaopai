# 07: Copy previous week

**What to build:** The single most-used action: one button fills this week from last week. It asks before replacing a week that already has shifts, and copies each shift to the same weekday for the same person. Then it says what it copied and what it skipped, so nothing disappears silently. The deciding logic is a pure function that returns its skips rather than swallowing them (`planCopy`, ARCHITECTURE §5). Tickets 08 and 13 later extend it with closed days and leave. Reference: SPEC §3 Roster editor ("Copy previous week"); the mockup's Copy previous week button.

**Blocked by:** 02 Staff page, 03 Shifts on the grid

**Status:** done

- [x] Copy previous week in the grid header copies last week's shifts onto the same weekdays, for the same people.
- [x] If last week has no shifts, it says so and changes nothing.
- [x] If this week already has shifts, it asks first ("Replace this week?", naming the count). Confirming replaces them.
- [x] Shifts for staff no longer active are skipped, and the result names every skip: `12 shifts copied from 28 Sep – 4 Oct. Skipped 1 for staff no longer active.`
- [x] People added since last week get empty rows.
- [x] Only shifts come across. N/A notes never do.
- [x] The copy plan is a pure function, with tests for each rule.
