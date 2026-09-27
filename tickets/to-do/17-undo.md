# 17: Undo the last grid action

**What to build:** An Undo on the grid reverses the last grid action, including big ones like Clear week and Copy previous week, so a slip is never expensive. ARCHITECTURE §9 lists this under "Later, not now", so it sits at the end of the queue on purpose. Reference: SPEC §3 Roster editor ("Undo the last grid action, Clear week included").

**Blocked by:** 06 Copy a shift, 08 Closed days, 12 Mark N/A

**Status:** ready-for-agent

- [ ] Undo reverses the last grid action. That covers adding, editing, removing or copying a shift; Clear week; Copy previous week (and History's Copy into open week); closing or reopening a day; and Mark or Clear N/A.
- [ ] After Undo, the week is exactly as it was before that action. Undoing the only edit to a published week puts it back to Published.
- [ ] Undo is disabled when there's nothing to undo.
