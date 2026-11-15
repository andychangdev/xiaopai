# 32: Undo kept in the database

**What to build:** Each week's undo history moves out of the server's memory and into the database. On Vercel, requests can land on different short-lived servers, so a history in memory would come and go between clicks: the Undo button would appear and disappear for no reason you could see. Undo behaves exactly as ticket 17 describes, except that it now outlasts the server.

One row per week holding its steps as JSON is enough, since the steps are already plain data (`Step` in `lib/roster/undo.ts`) and capped at 50.

**Blocked by:** 31 Database over a URL

**Status:** to do

- [ ] A new table holds each week's history, with a migration.
- [ ] `undoable` saves the week's history in the same transaction as the action, and `undoLast` drops its step in the same transaction as the undo, so an action and its undo record land together or not at all.
- [ ] The rules in `lib/roster/undo.ts` (`remember`, `nextUndo`, `UNDO_LIMIT`) are unchanged, and so are their tests.
- [ ] The `globalThis` cache of histories is gone.
- [ ] The JSON export leaves the undo table out, because it isn't roster data. `everyTable` finds tables from the schema, so it has to skip this one by name.
- [ ] ARCHITECTURE §8 "Undo" and point 3 of §2b say where the history lives. The tickets README's note on 17 points here.
