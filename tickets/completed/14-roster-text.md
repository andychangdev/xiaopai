# 14: Roster text and Copy to clipboard

**What to build:** This is how the roster actually reaches people. It's plain text sized for a phone, which the manager copies and pastes into the staff group chat. Each day lists only the people on shift, so the chat isn't cluttered with absences. A pure function builds the text from the week's data, going through the same day-by-day shape a published snapshot uses (ARCHITECTURE §6), so ticket 15 can freeze it. Reference: SPEC §3 Roster text, whose example is the target output; the mockup's Roster text tab.

**Blocked by:** 08 Closed days

**Status:** done

- [x] A Roster text tab shows the open week's text. It matches the SPEC example exactly: the `AH MA — STAFF ROSTER` header, the date range, then each day.
- [x] Each day lists the people on shift by first name, in roster row order, with 24-hour times and plain hyphens (`John 10:00-18:00`). A split shift folds onto one line (`John 10:00-14:00, 17:00-21:00`).
- [x] A closed day is a single line (`Tue 6 Oct - CLOSED`), and an open day with nobody on it says `(no one rostered)`. Nobody appears for being off, N/A or on leave.
- [x] Until the week is published, the text ends `DRAFT - not published yet`.
- [x] Copy to clipboard copies the text and confirms it. Where the browser refuses clipboard access, the text is selected and the page says to press ⌘C.
- [x] Building the text is pure and tested against the SPEC example.
