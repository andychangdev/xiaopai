# 18: JSON export for backup

**What to build:** A one-click, human-readable backup of everything, from Settings. Copying the database file stays the real backup (ARCHITECTURE §8b, "The database file"); this one is for reading and keeping. ARCHITECTURE §9 lists it under "Later, not now". Reference: SPEC §4, step 11.

**Blocked by:** 05 Settings

**Status:** ready-for-agent

- [ ] An Export backup button on Settings downloads one JSON file named with the date, e.g. `xiaopai-2026-09-27.json`.
- [ ] The file holds every table: settings, staff, shift templates, trading hours, rosters with their snapshots, shifts, N/A notes and leave.
- [ ] Exporting changes nothing, and there's no import.
