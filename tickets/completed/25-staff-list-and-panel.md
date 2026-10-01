# 25: Staff list and edit panel

**What to build:** The Staff page's table of input boxes becomes a calm list, one line per person in roster order, and everything about a person is edited in a panel beside it.

- Each line has the drag handle on the left, then the person's initial, their name with their note under it, their usual availability as seven dots, their expected hours and their hourly rate.
- Inactive people fold into an "Inactive · 2" group at the foot, which opens on request.
- Clicking someone opens their panel. The URL remembers who, so reloading and Back work. The person whose panel is open has the highlight.
- The panel edits name, expected hours, hourly rate, usual availability, notes and Active, each saving as it does now. Remove sits at the foot of the panel, with the same refusals and confirm as now.
- "+ Add person" at the top opens an empty panel. The person joins the end of the order once they have a name.
- On a phone the panel is a sheet that slides up over the list.

The Booked leave table stays below the list until ticket 27 replaces it.

This departs from SPEC §3 ("plain list-and-form admin screens") and ARCHITECTURE §7, where admin pages are tables in cards. Reference: `mockup/redesign.html`, the Staff screen and "On a phone".

**Blocked by:** 22 Green highlight style

**Status:** done

List

- [x] One line per person, in the roster order. Values show as text, and nothing on the list is a box to type in.
- [x] Dragging by the handle on the left reorders, with a drop line as now. With a handle focused, the arrow keys still move someone a place at a time.
- [x] Inactive people are in a collapsed group at the foot, and can still be opened and made active again.
- [x] The intro above the list is one line.

Panel

- [x] Clicking a line, or Enter on it, opens that person's panel. The URL holds who, so reloading keeps it open. Escape or a close button closes it and puts focus back on their line.
- [x] Each field saves as it does now. Text saves on leaving the box or on Enter, and Esc abandons the edit. Toggles save at once. A refusal shows in the panel and puts the old value back.
- [x] Remove at the foot of the panel: someone with shifts or leave gets the same "Can't remove" explanation as now, and anyone else gets the same confirm.
- [x] "+ Add person" opens an empty panel with the name box focused. No one is created until they have a name, and then they join the end of the order.

Phone

- [x] On a phone the list fits the width, and the panel is a sheet over the list with the same fields.

Docs

- [x] SPEC §3 and ARCHITECTURE §7 describe the list and panel.
