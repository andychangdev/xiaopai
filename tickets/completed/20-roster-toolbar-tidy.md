# 20: Roster toolbar tidy and This week

**What to build:** The Roster page loses the buttons that repeat other navigation, keeps each action next to the ones it belongs with, and gets a way back to the present week.

- Manage staff and Trading hours go, since the Staff and Settings tabs already reach those pages.
- Copy previous week moves from the header into the grid footer, beside Clear week.
- Roster text leaves the tab bar. It's renamed Share roster, since sharing it in the group chat is what the page is for, and it becomes a button next to Publish roster.
- A new Today button jumps to the week containing today, and that week is marked so you can tell when you're on it.

This departs from the mockup and from ARCHITECTURE §4, which lists Roster text as a tab. Reference: SPEC §3 Roster editor and Roster text.

**Blocked by:** 07 Copy previous week, 15 Publish and snapshot

**Status:** done

Grid footer

- [x] The grid footer has no Manage staff or Trading hours button. Staff and Settings are still one click away in the tab bar.
- [x] Copy previous week sits in the grid footer next to Clear week, and no longer appears in the header. Its confirm, skips and report are unchanged.
- [x] The Staff page link in the empty state (no one to roster, or everyone inactive) still works.

Share roster

- [x] The tab bar is Roster, Staff and Settings, plus History once ticket 16 lands. There's no Roster text tab.
- [x] A Share roster button sits next to Publish roster in the header. It shows on every week, draft or published, and opens that week's text.
- [x] Share roster replaces View sheet. When a week is published with no edits since, there's nothing to publish, so the header shows Share roster alone as the primary button.
- [x] Publishing still opens the Share roster page straight after, ready to copy.
- [x] The manager sees Share roster everywhere the old name showed: the page heading, the browser tab title, and the wording of the publish confirm. Code names (`rosterText`, the `/share` route) can stay as they are.
- [x] Going back from the Share roster page still returns to the same week's grid.

This week

- [x] A Today button sits with the week arrows and goes to the week containing today (`mondayOf(today())`), wherever you are.
- [x] Today is disabled, or not shown, when you're already on the present week.
- [x] When the week on screen is the present week, the header marks it, for example `This week` beside the title or in the subtitle.
- [x] Today's day heading in the grid is marked too, so the present day stands out within the week.
- [x] The date comes from `lib/clock.ts`, the one place the app reads the clock. Nothing in `lib/roster` reads it directly.
- [x] The subtitle names the week of the year (`Week 41`, ISO numbering, so a week belongs to the year most of it is in) in place of `Week of Mon 5 Oct`.
