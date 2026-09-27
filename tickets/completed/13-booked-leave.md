# 13: Booked leave

**What to build:** Leave is a booked absence, from one day to three weeks. It belongs to the person and to real dates, not to any week's draft. It's booked on the Staff page only. This is the one place the app blocks rather than warns: a leave day shows LEAVE and can't take a shift. Reference: SPEC §2 Leave and "The three kinds of can't work"; the mockup's Booked leave table and LEAVE cells.

**Blocked by:** 06 Copy a shift, 07 Copy previous week, 12 Mark N/A

**Status:** done

- [x] The Staff page's Booked leave table lists who, from, to, days and note, soonest first, with past leave greyed. An add row books new leave (to defaults to from), and any booking can be cancelled.
- [x] A day inside someone's leave shows LEAVE. Clicking it says who's away and until when (`On leave — Thu 8 Oct – Fri 9 Oct · Family`), offers no shift and no Mark N/A, and links to the Staff page.
- [x] No shift can be saved on a leave day, however it arrives: typed, from a template, a copied shift or Copy previous week.
- [x] Copy previous week skips shifts that land on leave and reports them (`… landing on booked leave`).
- [x] Booking leave over existing shifts asks first, with three choices:
  - remove the shifts (the default)
  - keep them
  - cancel the booking

  Kept shifts raise `Rostered on Wed, which is booked as leave.` This follows SPEC. The mockup only offers remove or cancel, so don't "fix" it to match.
- [x] Leave spans week boundaries, and Clear week never touches it.
- [x] The leave rules (blocked day, copy skip, warning) have tests.
