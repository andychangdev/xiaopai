# 24: Week dropdown on the roster

**What to build:** The roster's week heading becomes one control: ‹ for the previous week, the week's dates as a button, and › for the next, with Today before them as now. The dates open a menu of nearby weeks, so you can jump straight to one without stepping a week at a time or going through History.

- The menu lists the two weeks after this week, this week, and the four before it, newest first.
- Each week shows a label ("Next week", "This week", "Last week", or its week number) and its state: Empty, Draft, Published, or Published and edited since. The colours match History: the highlight once a week is out as it stands, amber while it still needs publishing.
- The week you have open is marked. If it's outside those seven, it's listed too, in date order.
- "All weeks in History" sits at the foot, and carries the open week as the History tab does.

The "This week" pill and the subtitle (`Week 40 · Draft`, `Week 41 · Published 26 Sep 2026 · v2`) stay beside the control.

Reference: `mockup/redesign.html`, the Roster screen. SPEC §3 Roster editor.

**Blocked by:** 22 Green highlight style

**Status:** done

- [x] ‹ and › still step a week. Today still jumps to this week, and is disabled when you're already on it.
- [x] The dates open the menu on click, Enter or Space. The arrow keys move through it, Enter opens a week, and Escape closes it and returns focus to the dates.
- [x] The menu lists the weeks described above, newest first, with the open week marked.
- [x] Each week's state is worked out the same way History works it out. There's no second definition of "edited since".
- [x] Choosing a week goes to it, and the URL names the week as now.
- [x] Which weeks the menu lists, and their labels, come from a pure function with tests: this week open, an open week outside the seven, and a range that crosses the new year.
- [x] On a phone the control spans the width above the grid, and the menu fits on the screen.
- [x] SPEC §3 mentions the week menu beside the arrows.
