# 34: Login

**What to build:** Once the app is online, anyone with the address could open it, so it asks for a password. There's one password and no usernames. The right password keeps that browser logged in for 30 days. On the Mac, with no password set, there's no login, as now.

Next's guide (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`) treats the proxy as an optimistic check and wants the real check next to the data. Here that's `getDb()`, which every page, action and the backup route goes through.

**Blocked by:** 31 Database over a URL (`getDb` becomes async there)

**Status:** to do

- [ ] `/login` has a password field and Log in, in the app's style, and works on a phone. A wrong password says so and keeps you on the page. The right one takes you to the page you were heading for (local paths only, never another site), or to the roster.
- [ ] The password is `ROSTER_PASSWORD`, an environment variable, compared in constant time. It's never in the code or the database.
- [ ] The session is a cookie holding its expiry and an HMAC of that expiry, keyed by the password. The cookie is HttpOnly, Secure, SameSite=Lax, with a 30-day Max-Age. Nothing is stored on the server, and changing the password logs every browser out.
- [ ] `proxy.ts` sends anyone without a valid session to `/login`. That covers every page, every Server Action and `/settings/backup`, but not `/login`, Next's static files or the icon.
- [ ] `getDb()` checks the session too, so a request that gets past the proxy still gets no data.
- [ ] Log out in Settings clears the cookie.
- [ ] With no `ROSTER_PASSWORD`, there's no login locally. On Vercel (where `VERCEL` is set), the app refuses to serve rather than run with no login.
- [ ] Signing and checking a session are pure functions with tests: a good session, a tampered one, an expired one, and one made with another password.
- [ ] SPEC §1's Users row, ARCHITECTURE §1's "Deliberately absent … auth" and point 4 of §2b say what's true now.
