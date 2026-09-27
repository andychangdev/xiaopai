# 12: Mark N/A on a cell

**What to build:** A per-week note the manager jots on the roster itself, like "can't do Friday this week", so a one-off conversation isn't forgotten. It looks and warns exactly like availability's N/A, but it belongs to this week only and changes nothing else. Reference: SPEC §2 NotAvailable and "The three kinds of can't work"; the mockup's cell popover.

**Blocked by:** 11 Availability

**Status:** done

- [x] The cell popover offers Mark N/A. On a marked cell it offers Clear N/A instead.
- [x] A marked cell shows N/A over the same tint, with the tooltip `John — marked not available this Fri`, and can still be rostered.
- [x] Rostering a marked day raises `Rostered on Fri, marked not available this week.` This replaces the availability warning if both apply.
- [x] On a day the person's availability already rules out, Mark N/A is absent and the popover says why: `Already N/A — John isn't usually available on Sun. Change that on the Staff page.`
- [x] Notes never change availability or leave. Clear week keeps them, and they never carry into other weeks.
- [x] The warning rule has a test.
