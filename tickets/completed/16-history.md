# 16: History

**What to build:** A History page lists every week with shifts on it, newest first, so the manager can look back or reuse an old week. Reuse the copy plan from ticket 07 and the hours functions from ticket 09 rather than re-deriving them. Reference: SPEC §3 History; the mockup's History tab.

**Blocked by:** 15 Publish and snapshot

**Status:** done

- [x] Each row shows the date range, Draft or Published · vN, the shift count, hours, and the date it was published.
- [x] The open week is always listed. It's marked `· open` and has no actions.
- [x] Open goes to that week's grid.
- [x] Copy into open week behaves exactly like Copy previous week run from that week, with the same confirm, skips and report. Then it returns to the grid.
- [x] History knows which week is open even though it's a separate page, and going back to Roster returns to that week.
