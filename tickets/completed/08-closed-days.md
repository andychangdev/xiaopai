# 08: Closed days

**What to build:** Clicking a day heading closes that day for this week only, and clicking again reopens it. It's for a public holiday or the usual Tuesday closure. Closed days belong entirely to the week: a new week starts with every day open, and nothing in Settings reaches in. The weekly Tuesday closure travels with Copy previous week, which brings the source week's closed days along. Reference: SPEC §2 Roster (`closed_days`); the mockup's day headings.

**Blocked by:** 07 Copy previous week

**Status:** done

- [x] Clicking a day heading closes or reopens that day for this week. A closed heading reads "closed", and its cells are hatched and marked CLOSED.
- [x] Closing a day that has shifts asks first ("Close Tue? Tue has 3 shifts on it. Closing the day removes them.") and removes them on confirm.
- [x] No shift can be saved on a closed day, however it arrives: typed, from a template, a copied shift or a copied week.
- [x] The grid footer names the days closed this week.
- [x] Copy previous week brings the source week's closed days across, replacing this week's. It skips and reports any shift that would land on a closed day (`… on a day this week is closed`).
- [x] Clear week leaves closed days alone.
- [x] The copy plan's tests cover closed days.
