# 09: Hours this week

**What to build:** At a glance, the manager sees who's over or under their usual hours. A Hours this week panel below the grid lists each person's hours against their expected weekly hours, plus the week total. Anyone more than 20% above or below is highlighted. Hours are never stored. They're worked out from the shifts on every render: end − start, with no breaks (ARCHITECTURE §2). Reference: SPEC §3 Roster editor; the mockup's Hours this week panel and row headers.

**Blocked by:** 03 Shifts on the grid

**Status:** done

- [x] The Hours this week panel sits below the grid, not beside it. Each line shows first name, a bar and `24h/24`, and a Total line ends the list.
- [x] Each grid row header shows the person's hours (`24h of 24h`), and the grid footer shows `Total rostered 109h`.
- [x] More than 20% over expected is highlighted as over, and more than 20% under as under. Nobody without expected hours, or with no hours this week, is highlighted.
- [x] Everything updates as shifts change.
- [x] Per-person hours and the week total are pure functions, with tests that include the 20% boundaries.
