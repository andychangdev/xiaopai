# 27: Leave timeline

**What to build:** The Booked leave table becomes Upcoming leave: a timeline of seven weeks, starting with this week, under the staff list. Each person with leave in that time gets a row, and each booking a bar from its first day to its last, labelled with its note and dates. A short booking shows just its dates, with the note on hover. A line marks today, and the person whose panel is open has their row highlighted, so their leave reads against everyone else's. Overlaps, like four people away on the same three days, are obvious at a glance.

- "+ Book leave" above the timeline opens the same form as the panel's, with a Who picker of active staff.
- Clicking a bar opens that person's panel.
- Leave that has ended, and leave beyond the seven weeks, is reachable from links under the timeline, as plain lists with Cancel.
- On a phone, the same bookings show as a list, soonest first.

This departs from SPEC §3's Booked leave table. Reference: `mockup/redesign.html`, the Staff screen.

**Blocked by:** 26 Leave in the staff panel

**Status:** ready-for-agent

- [ ] Seven week columns from this week's Monday, each labelled with its Monday's date, with this week marked.
- [ ] One row per person with leave in those weeks, in roster order. Each booking is a bar from its first to its last day, cut at the timeline's edges where it runs past them.
- [ ] Bars show the note and dates where they fit, and the dates alone where they don't. Nothing is cut off mid-word, and each bar's accessible name gives the whole booking.
- [ ] A line marks today. The person whose panel is open has their row highlighted.
- [ ] Clicking a bar opens that person's panel.
- [ ] "+ Book leave" books for anyone active, with the same question about shifts already there.
- [ ] Past leave and leave beyond the seven weeks can be reached and cancelled.
- [ ] Links to the Staff page's leave section still land on Upcoming leave.
- [ ] Where a bar starts and ends comes from a pure function with tests: leave that started before this week, leave that ends after the last week, a single day, and a booking on the timeline's last day.
- [ ] On a phone the bookings show as a list, soonest first, and nothing scrolls sideways.
- [ ] SPEC §3 describes Upcoming leave in place of the Booked leave table.
