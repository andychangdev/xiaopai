# 02: Staff page — add, edit, order and deactivate staff

**What to build:** A Staff page where the manager keeps the team. People can be added, renamed, given expected weekly hours and notes, put in order with ↑↓, and marked inactive. The roster grid follows it: the order set here is the row order on every week, and inactive people drop off. Later tickets add availability (11) and booked leave (13) to this page. Reference: SPEC §2 Employee and §3 "Staff, Templates, Settings"; the mockup's Staff tab.

**Blocked by:** 01 Walking skeleton

**Status:** done

- [x] A Staff tab lists everyone, active and inactive (inactive greyed). Each row shows name, expected weekly hours (optional), notes (optional) and an Active toggle.
- [x] An add row creates an active person at the bottom of the order.
- [x] Edits save as you make them and show on the grid.
- [x] ↑↓ move a person one place, and the grid's row order follows on every week.
- [x] Unticking Active takes the person off the grid in any week where they have no shifts. Ticking it again puts them back in the same place.
- [x] Nothing is hard-deleted, with one exception: someone who has never had a shift or booked leave can be removed (a typo). For anyone else, Remove explains to untick Active instead, because removing the record would leave holes in past rosters.
- [x] The grid footer's Manage staff button and the empty-grid message both link here.
