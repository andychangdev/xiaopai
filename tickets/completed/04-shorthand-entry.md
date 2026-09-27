# 04: Shorthand time entry

**What to build:** The time box accepts the shorthand the manager actually types, so entering a shift takes a few keystrokes. `10-18` is taken literally, while `10-6` and `10-9` resolve forward to 18:00 and 21:00, so either habit works. The rules below match the mockup's parser, re-expressed in minutes since midnight. Reference: SPEC §3 Roster editor ("Shorthand entry").

**Blocked by:** 03 Shifts on the grid

**Status:** done

- [x] Accepts two `H` or `H:MM` times separated by `-`, `–` or `to`, with or without spaces.
- [x] A start hour below 7 means the afternoon: `5-9` → 17:00–21:00.
- [x] An end at or before the start moves forward 12 hours until it's after the start: `10-6` → 10:00–18:00, `10-9` → 10:00–21:00, `12-6` → 12:00–18:00.
- [x] `10-18` → 10:00–18:00, `10:30-16:00` → 10:30–16:00 and `10:30-4` → 10:30–16:00.
- [x] Input that would end after midnight, or doesn't parse, is refused inline, with the text selected for retyping.
- [x] The popover hint reads `10-18 or 10-6 → 10:00–18:00`.
- [x] The parser is a pure function with a test for every rule and example above.
