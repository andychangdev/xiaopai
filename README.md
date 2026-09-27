# xiaopai

The weekly staff roster for Ah Ma. One manager, running on a laptop. See
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
copying the file somewhere outside the project folder.
