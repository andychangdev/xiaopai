# 06: Copy a shift to another day or person

**What to build:** From a shift on the grid, the manager copies it into other cells without retyping the times: another day for the same person, or someone else. The mockup doesn't cover this, so the interaction is open. Keep it to a click or two per copy, for example Copy on the shift, then click the target cells, then Esc to stop. Reference: SPEC §3 Roster editor ("Copy a shift to another day or another employee").

**Blocked by:** 03 Shifts on the grid

**Status:** done

- [x] A shift can be copied into any other cell in the week, and the original stays put.
- [x] The copy has the same times and sits alongside any shifts already in the target cell.
- [x] Copying into several cells in a row doesn't mean starting over each time.
- [x] A copy saves through the same path as a typed shift, so any rule that refuses a typed shift refuses a copy too. That stays true when tickets 08 and 13 add closed days and leave.
