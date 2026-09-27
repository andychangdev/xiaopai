# 15: Publish and snapshot

**What to build:** Publishing makes a week the version staff work from. It freezes a snapshot onto the roster: names, times and closed days as they were at that moment (ARCHITECTURE §6). A published roster can then never change when someone is renamed or deactivated months later. Warnings never block publishing. A published week stays editable, and editing it shows Unpublished changes until Publish update bumps the version. Reference: SPEC §2 "Publishing and history"; ARCHITECTURE §4 Routing and §6; the mockup's Publish button and badge.

**Blocked by:** 10 Warnings panel, 14 Roster text

**Status:** done

- [x] Badge and button follow the three states:
  - never published: Draft, with Publish roster
  - published and untouched: Published · v1, with View sheet (opens Roster text)
  - published, then edited: Unpublished changes, with Publish update
- [x] Publishing an empty week says there's nothing to publish.
- [x] The confirm dialog names the shifts and hours, plus any outstanding warnings (`3 warnings are outstanding — publishing goes ahead anyway.`). An update names the new version.
- [x] Publishing stores the snapshot, version and date, then opens Roster text.
- [x] A published week's Roster text is rendered from its snapshot. It ends `Published 27 Sep 2026`, and from v2 it ends `Updated 8 Oct 2026 (v2)`.
- [x] Changing a published week's shifts or closed days shows Unpublished changes. Until Publish update, Roster text keeps showing the published version and notes that there are unpublished changes.
- [x] Renaming or deactivating someone never changes a published week's Roster text, and never flags old weeks as changed.
- [x] The week subtitle reads like the mockup: `Week of Mon 5 Oct · Published 26 Sep 2026 · v2 · edited since`.
- [x] `/` goes to the earliest week that still needs work: this week if it's unpublished, otherwise next week if that's unpublished, otherwise this week.
- [x] Building the snapshot and the changed-since-publish check are pure functions with tests.
