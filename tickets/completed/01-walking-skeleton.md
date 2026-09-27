# 01: Walking skeleton — open the app on this week's roster grid

**What to build:** Visiting `/` lands on the roster grid for the current week, at a URL that names the week by its Monday (e.g. `/roster/2026-10-05`). The grid shows seven dated day columns, Mon–Sun, and one row for each active staff member in their set order, with ‹ › arrows to move between weeks. It's the thinnest path through the whole stack in ARCHITECTURE.md (Next.js App Router, SQLite through Drizzle and better-sqlite3, Tailwind, Vitest). It also lays the ground every later ticket builds on: the full schema, a seed script, the mockup's theme tokens and the date helpers. Reference: ARCHITECTURE §1–4 and §7; SPEC §1 for the week and date rules; the mockup's Roster tab (`mockup/roster-editor.html`, which opens straight in a browser).

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `/` redirects to this week's roster. ‹ › move one week at a time and the URL follows, so any week can be bookmarked and the back button works.
- [x] A URL date that isn't a Monday redirects to that week's Monday. A malformed one goes to this week.
- [x] Headings match the mockup: each day shows its name and date (`MON` / `5 Oct`), the title reads `5 – 11 October 2026` (or `28 Sep – 4 Oct 2026` across months), and `Week of Mon 5 Oct` sits beneath.
- [x] Rows are the active staff in their sort order, on the CSS grid from ARCHITECTURE §7 (name column plus seven day columns, full width).
- [x] With no staff, the grid shows an instruction to add your team on the Staff page, not an empty table.
- [x] The whole schema from ARCHITECTURE §3 arrives as one drizzle-kit migration, committed. Doing it now means parallel tickets don't collide on migration files. Times are minutes since midnight and dates are `YYYY-MM-DD` strings.
- [x] A seed script loads starting data into an empty database and refuses to touch one that already has data:
  - the mockup's six staff as placeholders, one of them inactive, with their expected hours and availability
  - the three shift templates
  - trading hours: 10:00–18:00, Thursday to 21:00
- [x] The mockup's colour tokens (light and dark) and its fonts become Tailwind theme variables. Components use utilities like `bg-surface`, never raw hex values.
- [x] Date helpers (the Monday of a date, adding days, week and day labels) are in the pure rules module, with Vitest tests. The current date is passed in, never read implicitly.
- [x] The setup traps in ARCHITECTURE §2b are handled:
  - better-sqlite3 is a server external package
  - the dev database client is cached on `globalThis`
  - no client component imports the database
- [x] A tab bar holds Roster. Later tickets add their own tabs.
- [x] `npm run build` and `npm start` both work, because the Dock launcher depends on them.
