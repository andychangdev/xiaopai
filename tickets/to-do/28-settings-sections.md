# 28: Settings sections and side index

**What to build:** Settings becomes one card of sections divided by rules: Business name, Trading hours, Shift templates, Pay rates, Public holidays and Backup. Each section has its title and a one-line explanation on the left and its controls on the right. A side index lists the sections. Clicking one scrolls to it, and the one you're reading has the highlight.

The current controls move in as they are. Trading hours and shift templates keep their tables until tickets 29 and 30. Each long intro paragraph is cut to one line, and any rule worth keeping moves next to the control it explains. Remove on a public holiday stays grey until hover or focus.

On a phone the sections stack, title above controls, and the index is hidden.

This departs from ARCHITECTURE §7, where admin pages are tables in cards. Reference: `mockup/redesign.html`, the Settings screen.

**Blocked by:** 22 Green highlight style

**Status:** ready-for-agent

- [ ] The six sections appear in that order in one card. Each has a title and one-line note on the left and its controls on the right.
- [ ] The side index jumps to each section and stays in view while the page scrolls. Each section has an anchor, so `/settings#trading-hours` lands on it.
- [ ] The index highlights the section you're reading as you scroll, and the section you clicked straight after a jump.
- [ ] Every control saves, refuses and reports exactly as it does now.
- [ ] On a phone the sections stack with the title above the controls, the index is hidden, and nothing scrolls sideways.
- [ ] ARCHITECTURE §7 describes the section layout.
