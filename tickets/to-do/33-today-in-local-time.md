# 33: Today in the restaurant's time zone

**What to build:** `today()` gives the date in the restaurant's time zone, whatever zone the server runs in. At the moment it takes the server's local date, which on the Mac is the right one. Vercel runs on UTC and reserves the `TZ` variable, so it can't be changed there. Without this ticket, from midnight until 10 am in Brisbane the app would think it's still yesterday, and This week, the week the Roster tab opens and the publish date could all be a day out.

`lib/clock.ts` is the only place the app reads the clock, so this ticket only touches that file and the date helper it calls.

**Blocked by:** —

**Status:** to do

- [ ] The zone is a named constant, `Australia/Brisbane` (UTC+10 all year, with no daylight saving).
- [ ] `today()` uses it, through `Intl`, with no new dependency.
- [ ] A test: a moment just after midnight in Brisbane gives Brisbane's date while UTC is still on the day before, whatever the zone the test runs in. (`vitest.config.ts` runs tests in Sydney time, which is an hour ahead of Brisbane in summer, so this test would catch a mix-up.)
