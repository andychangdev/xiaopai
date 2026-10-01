# 22: Green highlight style

**What to build:** One look that says "this is the current or selected thing": a light green fill, a green border and deep green text, made from the accent tokens the theme already has. Tickets 23–30 use it for the page you're on, this week, the person you're editing and the Settings section you're reading. This ticket makes it one shared style and moves today's uses onto it, so each later ticket only has to apply it.

- The current tab, History's Published badge and the Staff page's available-day toggles already look like this. They switch to the shared style and look the same.
- "This week" beside the roster title becomes a small pill in the highlight.
- Shift chips on the grid change to the highlight, in place of today's grey chip with a green left edge. Overlapping shifts stay red.

The shift chip change departs from the current grid. Reference: `mockup/redesign.html`, "The green highlight is used everywhere" and the Roster screen.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] There's one shared highlight style, built from the existing accent tokens. No new colours go into the theme.
- [x] The current tab, History's Published badge and the available-day toggles use it, and look as they do now.
- [x] "This week" beside the roster title is a pill in the highlight.
- [x] Shift chips use the highlight. Overlapping shifts are still red, hover still shows, and a chip being copied or dragged still shows its dashed outline or dimming.
- [x] Text in the highlight meets WCAG AA contrast against its fill.
- [x] ARCHITECTURE §7 lists the highlight among the controls every page shares.
