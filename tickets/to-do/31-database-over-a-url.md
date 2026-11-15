# 31: Database over a URL

**What to build:** The app reaches its database through libSQL instead of better-sqlite3, so the same code runs against the local file and against Turso, which is hosted SQLite. Nothing changes for the user. Locally it's still `xiaopai.db`, and `XIAOPAI_DB` still points the app, drizzle-kit and the seed at a scratch copy. When `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set, all three use Turso instead.

libSQL's calls are async where better-sqlite3's were sync, so every read, write and transaction gains an `await`: about 120 call sites in `app/actions.ts`, `lib/db/queries.ts` and `lib/db/undo.ts`, and the pages that call them.

**Blocked by:** —

**Status:** to do

- [ ] `better-sqlite3` is replaced by `@libsql/client` and Drizzle's libSQL driver. `open.ts` opens `file:` plus `XIAOPAI_DB` (or `xiaopai.db`), or `TURSO_DATABASE_URL` with its token when that's set.
- [ ] Foreign keys are enforced on both. Check on Turso that deleting a referenced row fails, rather than assume the pragma carries over.
- [ ] Every query, write and transaction awaits. `npm run typecheck` is clean, and pages, Server Actions, the backup route and the seed work as before.
- [ ] `getDb` still refuses a missing local file, with the same message. A Turso URL skips that check.
- [ ] `drizzle.config.ts` uses the `turso` dialect when the URL is set, so `npm run db:migrate` works on either.
- [ ] `next.config.ts` drops `serverExternalPackages: ['better-sqlite3']`. Next already keeps `@libsql/client` out of the bundle by default.
- [ ] Tests pass. Checked in the browser on a scratch copy: add, move and remove a shift, Copy previous week, publish, Undo, Export backup.
- [ ] ARCHITECTURE §1, §2b (Setup, and points 2 and 3 of "Four things that will bite") and §8b "The database file" describe libSQL.
