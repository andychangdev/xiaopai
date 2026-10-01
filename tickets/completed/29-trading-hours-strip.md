# 29: Trading hours week strip

**What to build:** Trading hours in Settings become a strip of seven day cards, Monday first, like the grid's day columns. Each card has the day, its hours, and its opens and closes pickers stacked. The week's total open hours sit under the strip. A day whose hours differ from the usual day has the highlight, so Thursday's late close stands out.

Reference: `mockup/redesign.html`, the Settings screen.

**Blocked by:** 28 Settings sections and side index

**Status:** done

- [x] Seven cards, Monday first, each with the day, its hours, and opens and closes pickers that save as they do now.
- [x] The week's total open hours show under the strip, and update when a time changes.
- [x] The usual day is the hours most days have. A day with other hours gets the highlight. If no hours are clearly the most common, no day is highlighted.
- [x] That rule is a pure function with tests: every day the same, one late day, two days different from the rest, and a tie.
- [x] Each picker's accessible name gives the day and whether it opens or closes, as now.
- [x] On a phone the cards wrap onto more rows, still Monday first, and nothing scrolls sideways.
