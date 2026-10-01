# 26: Leave in the staff panel

**What to build:** The panel from ticket 25 gains a Leave section with that person's upcoming leave, a Book leave button with them already filled in, and Cancel on each booking. Booking over shifts already on the roster asks the same question as now: remove them, keep them, or cancel the booking.

Each line on the list shows the person's next leave as an amber chip, such as `Away 11–13 Oct`, with `+1` when there's more booked after it. It's amber, not the highlight, because leave is the one thing that blocks rostering, and it shouldn't look like a selection.

The roster's LEAVE cell already links to the Staff page. It now opens that person's panel.

Reference: `mockup/redesign.html`, the Staff panel. SPEC §2 Leave.

**Blocked by:** 25 Staff list and edit panel

**Status:** ready-for-agent

- [ ] The panel lists the person's leave that hasn't ended yet, soonest first, with dates, days and note.
- [ ] Book leave in the panel books for that person: from, to and an optional note. To defaults to from and follows it as now.
- [ ] Booking over shifts offers remove, keep or cancel, as now. What follows (removed shifts, warnings for kept ones, Undo turning off) is unchanged.
- [ ] Each booking can be cancelled, with the same confirm as now.
- [ ] A list line shows the person's next leave as a chip, with `+N` for any more after it. Leave that's already started counts as next. The chip's wording comes from a pure function with tests: one day, several days in one month, across two months, already started, and more than one booking.
- [ ] Clicking a LEAVE cell's link on the roster opens that person's panel on the Staff page.
- [ ] The Booked leave table still works for everyone until ticket 27, and a booking made in the panel shows there at once.
