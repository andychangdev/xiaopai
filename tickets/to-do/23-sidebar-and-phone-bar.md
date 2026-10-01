# 23: Icon sidebar and phone tab bar

**What to build:** The header and its tab bar give way to a narrow sidebar down the left of every page. At the top is the business's initial in a jade square, with its name underneath. Below that come Roster, History and Staff, each an icon over a label, with Settings at the foot. The page you're on has the highlight. On a phone the sidebar becomes a bar along the bottom of the screen with the same four.

Everything the tab bar does now carries over. Share roster counts as Roster, and the week you have open travels to History and back.

The sidebar is 72px wide, so the grid and the Week summary need more room to sit side by side. The summary only moves beside the grid once the grid keeps its full 960px: from about 1380px wide instead of 1310px. Narrower than that, it drops below the grid next to Warnings, as it does now.

This departs from ARCHITECTURE §4, where navigation is the tab bar. Reference: `mockup/redesign.html`, the Roster screen and "On a phone".

**Blocked by:** 22 Green highlight style

**Status:** ready-for-agent

Sidebar

- [ ] Every page has the sidebar, and there's no header bar.
- [ ] The business name under the initial wraps to two lines, then truncates, with the full name on hover. The browser tab title is unchanged.
- [ ] Roster, History and Staff sit at the top and Settings at the foot. Each has an icon and a visible label, and the current one has the highlight and is marked as the current page for screen readers.
- [ ] Share roster highlights Roster. Going to History from a week, and back to Roster from History, keeps that week, as the tab bar does now.
- [ ] Tab order runs top to bottom, and each item shows a focus ring.

Phone

- [ ] Below phone width, the same four sit in a bar fixed to the bottom of the screen, clear of the phone's home indicator. Pages leave room at the bottom so the bar never covers their last line.
- [ ] Popovers and dialogs still open above the bar.

Roster layout

- [ ] At 1440px the Week summary sits beside the grid, and the grid is at least 960px wide.
- [ ] Between about 1310px and 1380px the summary sits below the grid next to Warnings, and nothing scrolls sideways.

Docs

- [ ] ARCHITECTURE §4 describes the sidebar and the phone bar in place of the tab bar.
