# Mockup

`roster-editor.html` is a single self-contained file — open it in a browser, no
build step, no server. Published for convenience at
<https://claude.ai/artifact/PinvxWHZrjq4dsLctg6m4H> (private to the owner).

It is **the behavioural spec in runnable form**. Where [../SPEC.md](../SPEC.md)
says what the app does, this shows it, with working logic for the parts that
were argued over:

- shorthand time entry (`10-18`, `10-6`)
- hours, expected-hours highlighting, and every warning
- N/A from the availability pattern vs. a note on this week
- leave blocking a day, and surviving Clear week
- Copy previous week, and what it refuses to copy
- draft → published → v2, and the dirty state in between
- the plain-text roster for pasting into a chat

Three weeks of data are seeded, two of them published, so week navigation,
history and Copy previous week all do something real.

## What it is not

Not the architecture. It is one file with global state and a full re-render on
every change — fine for a mockup, wrong for the app. In particular the
`saveWeek()` / `loadWeek()` shuffle exists only because everything lives in
module scope; the real app loads a week from SQLite and writes back to it. See
[../ARCHITECTURE.md](../ARCHITECTURE.md).

Styling is plain CSS with tokens on `:root`. Those tokens are worth carrying
across to the Tailwind theme; the rest of the markup isn't.

## Keeping it in step

If it changes, copy it back here — the artifact URL is a viewer, not the
source of truth. To edit it from another Claude session, give that session the
URL and have it **read the artifact first**; publishing without the URL creates
a second, unrelated artifact.

## Opening it locally

The file carries a `<meta charset="utf-8">` and nothing else by way of
boilerplate — no `<!doctype>`, `<html>` or `<body>`. That's deliberate: the
artifact runtime wraps it in those, and adding your own would nest them on
republish. Browsers fill them in for a local file anyway, so double-clicking it
works.
