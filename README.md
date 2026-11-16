# High Leverage Research: the site

An AI investment committee, shown as a two-floor office. Three models draft and challenge each call. Nothing publishes until I sign it. Paper money only.

**Live:** https://research.siddharthshah.me (also https://bigsidd.github.io/site-high-leverage/, which redirects there)

**Status:** design preview. The desk is designed but not running. Everything on the site plays a labeled sample week on made-up placeholder tickers. Nothing here is investment advice, and no real money is involved anywhere.

## What you're looking at

- **The office.** Upstairs: the glass committee room, my office and a library of the rules each seat works under. Downstairs: the logo wall, the double-height record wall, the desk pod and the server room where the scripts will run.
  - The three figures with blue face plates are the model seats: M1 the analyst who writes the memo, M2 the risk officer who can veto it, M3 the committee chair, who decides.
  - The grey, outlined figures are the bench: five roles that will run as scripts, with no seat, until each clears its bar (two clean runs, its own tests and a written decision record).
  - I'm the only person on the floor. The portfolio manager is a person, not a model.
- **The replay.** Once the desk runs, every animation replays a published event from the public log, and nothing moves without a record behind it. The only stamp is my signature, which comes before any call is published.
- **The record.** Every call, signature, veto and loss on one dated rail. Losses stay up at the same size as wins. No edge is claimed until 100 closed calls and six months, whichever comes later.

## How this repo fits

| Repo | Role |
|---|---|
| `site-high-leverage` (this one) | The window: the website |
| `ledger-high-leverage` (later) | The record: append-only calls, scores and the event feed |
| `desk-high-leverage` (later) | The engine: scripts, prompts and evals |

The site will read the ledger. A redesign here can never touch the record.

## Built with

- Static HTML, CSS and plain JavaScript. No framework, no build step, no trackers, no third-party requests.
- Original isometric SVG art, drawn in code from floor coordinates (`docs/assets/floor.js`).
- GSAP 3.13.0 for the replay, vendored in `docs/assets/vendor/` and served from this site. GSAP is free to use under its Standard "no charge" license.
- Fonts are self-hosted from Google Fonts' open-licensed families (SIL Open Font License 1.1): Newsreader, Public Sans and IBM Plex Mono. Newsreader and Public Sans are variable fonts cut to weights 400–600 and Latin with fontTools (Newsreader 132 KB to 34 KB); Newsreader is preloaded.
- Only `docs/` is published: GitHub Pages serves that folder, so `clip/`, `tests/`, `tools/` and this README stay in the repo, not on the site.
- Every asset URL carries `?v=` and a content hash, since Pages caches files for ten minutes. Run `python3 tools/stamp.py` after changing an asset.
- Accessibility:
  - text contrast of 4.5:1 or better (WCAG AA);
  - touch targets of 44 px or more;
  - focus order that follows reading order;
  - a reduced-motion mode that swaps the animation for a stepped list.

## The clip

`clip/` renders the homepage replay to video from the same scene code: `docs/assets/floor.js` draws the office and `docs/assets/home.js` builds the one GSAP timeline the page plays. In a clip, `home.js` adds a cut on top of that timeline: a cold open on the signature, the week replayed in segments at 1.15–1.35× speed with short captions, and an end card. About 25 s. Three outputs:

- `a-week-at-the-desk-4x5.mp4`: 1080×1350, the LinkedIn feed master.
- `a-week-at-the-desk-16x9.mp4`: 1920×1080, for the site and wide players.
- `a-week-at-the-desk-phone.mp4`: 1080×1920, the phone poster video.

They are rendered with [HyperFrames](https://github.com/heygen-com/hyperframes), HeyGen's open-source HTML-to-video renderer:

- **License:** Apache-2.0 (checked on the npm package, `hyperframes`).
- **Version:** pinned to 0.8.218, published 2026-10-30. Releases ship several times a day, so the pin is a release that had been out for two weeks when it was chosen.
- **Install:** `clip/render.sh` installs it into a temporary folder with install scripts skipped, renders, and deletes the folder. It needs Node 22 or newer and ffmpeg. Set `HYPERFRAMES_BROWSER_PATH` to a local Chrome or chrome-headless-shell, or it downloads its own.
- **Telemetry:** the CLI reports usage to PostHog by default. The script turns it off (`DO_NOT_TRACK=1`, `HYPERFRAMES_NO_TELEMETRY=1`).

```bash
clip/render.sh
```

The videos land in `clip/out/`, which git ignores.

## Checks

```bash
python3 tests/seek-check.py
```

Seeks the replay to every label from both ends and fails if any part of Sidd's signature shows before the stamp lands. The clips and reduced motion both jump the playhead backward, which is how that bug got in once.

## Run it locally

```bash
python3 -m http.server 8000 --directory docs
```

Then open http://localhost:8000.

Built by Sidd, [siddharthshah.me](https://siddharthshah.me).
