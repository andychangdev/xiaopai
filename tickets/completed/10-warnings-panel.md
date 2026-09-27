# 10: Warnings panel

**What to build:** A Warnings panel beside Hours this week lists everything unusual about the week, naming the person each time. Warnings are always advisory: nothing blocks saving, or publishing later. They all come from one pure function (`buildWarnings`, ARCHITECTURE §5). The cells stay clean, with one exception: overlapping shifts are outlined in place, because the panel can't point at which two. Tickets 11–13 add the availability, N/A and leave warnings. Reference: SPEC §3 Warnings; the mockup's Warnings panel, which the wording below comes from.

**Blocked by:** 09 Hours this week

**Status:** done

- [x] The panel shows a count and lists the most serious warnings first. With nothing to flag, it says `Nothing to flag on this week.`
- [x] Two shifts overlapping on the same day: `Two shifts overlap on the same day.` Both chips are also outlined in the cell.
- [x] Over 38 hours in the week: `41h rostered — over the 38h week.`
- [x] Under 10 hours between finishing one day and starting the next, within the week: `Only 8h between Thu close and Fri start.`
- [x] More than 20% off expected hours: `24h vs 20h expected — 20% over.` (or `under`).
- [x] The warning function has a test for each rule, and reuses the hours functions from ticket 09.
