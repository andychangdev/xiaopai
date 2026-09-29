# xiaopai

The weekly staff roster for one restaurant. One manager, running on a laptop. See
[SPEC.md](SPEC.md) for what it does, [ARCHITECTURE.md](ARCHITECTURE.md) for
how it's built, and [tickets/](tickets/README.md) for the build, one ticket at a
time.

## First run

```bash
npm install
npm run db:migrate   # creates xiaopai.db with every table
npm run db:seed      # placeholder staff, shift templates, trading hours
npm run dev          # http://localhost:3000
```

The seed only runs on an empty database, so it can't overwrite real data.
Name the business on the Settings page; until then it's *Your restaurant*.

## Scripts

| | |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` / `npm start` | Production build, then serve it |
| `npm test` | Vitest, for the rules in `lib/roster/` |
| `npm run typecheck` | TypeScript, no output |
| `npm run db:generate` | Write a new migration after changing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations to `xiaopai.db` |

`xiaopai.db` holds real staff names and is never committed. Back it up by
copying the file somewhere outside the project folder. Export backup on the
Settings page also downloads everything as JSON, to read and keep, but
it can't be imported.

## The Dock icon

Once it's in real use, one click starts the app: the icon starts the
production server on port 3210 if it isn't already up, then opens it in a
Chrome window with no address bar or tabs. The server only listens on this
machine, since the app has no login.

```bash
npm run build                    # the icon serves the last build
scripts/launcher/make-app.sh     # builds ~/Applications/Roster.app
```

Drag `Roster.app` from `~/Applications` to the Dock. The first click asks
to let Roster access the folder the project is in, such as Documents. Allow
it, as that's where the server runs; if it's ever refused, turn Roster on
under System Settings → Privacy & Security → Files & Folders. The app runs
`scripts/launcher/run` from the project, so run `make-app.sh` again only if
the project folder moves, which may ask again.

**After changing code**, run `npm run db:migrate` if there's a new migration,
then `npm run build`. The icon never builds, as that would put a 30-second
wait on every open. A server that's already running keeps serving the old
build until the next click, which stops it and starts one on the new build.
A window already open shows the new build once you reload it.

Closing the window leaves the server running until you log out. The icon
always uses the project's own `xiaopai.db`, even if `XIAOPAI_DB` is exported.
If it can't start the server, it says so and points at the server's log,
`/tmp/xiaopai.log`.
