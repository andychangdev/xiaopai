# 19: Dock launcher

**What to build:** Once the app is in real use, a single Dock icon starts it. The icon boots the production server if it isn't already running, waits for it, then opens a clean app window. It's built from readable files in the repo's launcher folder, which already holds the icon and its generator scripts. ARCHITECTURE §8b has the script, the Info.plist and the build steps. Reference: ARCHITECTURE §8b.

**Blocked by:** 01 Walking skeleton

**Status:** ready-for-agent

- [ ] One build script assembles `Ah Ma Roster.app` in `~/Applications` with the existing icon, generating the icon first if it's missing.
- [ ] Clicking the app does the following:
  - if nothing answers on port 3210, starts `npm start` there and waits up to about 10 seconds
  - opens the app in a Chrome `--app` window, with no address bar or tabs
  - if the server is already up, just opens the window
- [ ] It works when launched from Finder or the Dock, where `PATH` is minimal: the Homebrew and nvm paths are set explicitly.
- [ ] The launcher leaves no bouncing Dock icon of its own (`LSUIElement`).
- [ ] The launcher never builds the app. The README says to run `npm run build` after code changes.
