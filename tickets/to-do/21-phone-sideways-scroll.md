# 21: Phone pages stop scrolling sideways

**What to build:** On a phone, Staff, Settings and History scroll sideways. At 400px wide, Staff is 752px wide, Settings 588px and History 567px. The cause is the column headings hidden for screen readers: they're absolutely positioned, and the scroll box around each table isn't, so they sit outside it and stretch the page. Every wide table should scroll inside its own card, and no page should ever be wider than the screen.

Found in the redesign review. It's worth fixing now, ahead of tickets 25–30, because History and the leave and holiday lists keep their tables for a while.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] At 400px wide, Staff, Settings and History are exactly as wide as the screen, and nothing scrolls the page sideways.
- [ ] Wide tables still scroll sideways inside their card.
- [ ] The hidden column headings are still read out by a screen reader.
- [ ] Roster and Share roster stay as they are. Both already fit at 400px.
- [ ] Checked in a real browser at 400px, not only in the code.
