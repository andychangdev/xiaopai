# 30: Shift template bars

**What to build:** Each shift template is drawn as a bar along the business's day, with its name, times and hours beside it. The scale runs from the earliest opening to the latest close in the week's trading hours, so you can see how each template fits the day. Times only some days are open are hatched, with a note naming those days, for example "After 18:00: Thursday only".

Clicking a template opens an edit row in place, with name, starts, ends, Done and Remove. Remove leaves every other line. "+ Add template" adds one and opens it for editing with the name selected, as now.

Reference: `mockup/redesign.html`, the Settings screen.

**Blocked by:** 28 Settings sections and side index

**Status:** ready-for-agent

- [ ] One line per template: name, times, bar and hours, with tick marks along the top at round hours, all to scale.
- [ ] The scale runs from the week's earliest opening to its latest close. A template that starts earlier or ends later widens the scale to fit it, since a shift may run outside trading hours.
- [ ] Times only some days are open are hatched, and a note names those days. If every day has the same hours, nothing is hatched.
- [ ] Clicking a template, or Enter on it, opens its edit row. Edits save as they do now. Done or Escape closes it, and only one is open at a time.
- [ ] Remove is only in the edit row, with the same confirm as now.
- [ ] "+ Add template" opens the new template in its edit row with the name selected.
- [ ] The scale, the bar positions and the hatched spans come from a pure function with tests.
- [ ] On a phone the bars shrink, the lines stay readable, and nothing scrolls sideways.
