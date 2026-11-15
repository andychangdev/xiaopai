# 35: Go live on Vercel and Turso

**What to build:** The app runs on Vercel's free Hobby plan, with its data on Turso's free plan, so you can reach it from anywhere with your Mac off. Your Mac's data moves up once, and from then on Turso holds the real data.

Done by hand first, in each site's dashboard, with no CLI: a Turso account and a database called `xiaopai` with an auth token, and a Vercel account signed in with GitHub.

**Blocked by:** 31, 32, 33, 34

**Status:** to do

- [ ] `scripts/import-to-turso.ts` copies `xiaopai.db` to a temporary file, dumps the copy with `sqlite3 .dump` (built into macOS), and loads the dump into Turso. It refuses if the Turso database already has tables, so it can't overwrite live data, and it never writes to `xiaopai.db`.
- [ ] Turso's database and Vercel's functions are in the same region, since each page makes several database calls.
- [ ] The Vercel project is imported from the GitHub repo. `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` and `ROSTER_PASSWORD` are set for Production only, so preview builds of branches can't touch the real data.
- [ ] The build passes on Vercel. On a phone and on the Mac: log in, edit a shift, Undo it, publish, Share roster, Export backup, log out.
- [ ] The Dock launcher (ticket 19) is retired: `scripts/launcher/` is deleted, and Roster.app is removed from the Dock and wherever `make-app.sh` installed it. Run the app locally with `npm run dev` from now on.
- [ ] Later schema changes: README says to run `npm run db:migrate` with the Turso variables exported in the shell.
- [ ] README and ARCHITECTURE §8b say how the app runs now.
