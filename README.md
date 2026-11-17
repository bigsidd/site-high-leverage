# High Leverage Research: the site

An AI investment committee, shown as a two-floor office. Three models argue each call, and nothing publishes until I sign it. Paper money only.

**Site:** https://research.siddharthshah.me (https://bigsidd.github.io/site-high-leverage/ redirects there)

**Status:** design preview. The desk is designed but not running yet. Every page plays a labeled sample week on placeholder tickers. Nothing here is investment advice, and no real money is involved.

## Pages

| Page | What it shows |
|---|---|
| `index.html` | The office, replaying one sample week from its event log, then an end card |
| `desk.html` | How it works: one call from start to finish as a stepper, who can stop it, the guardrails and what isn't proven yet |
| `record.html` | The record: the scoreboard, the calls, the rules, and closed blocks with the detail |
| `committee.html` | A redirect to `desk.html`, kept so old links work |

In the office, the three figures with blue face plates are the model seats: the analyst writes the memo, the risk officer argues against it and can veto it, and the chair decides. The grey figures are the bench, five roles with no seat yet. I'm the one person on the floor, and I sign.

## Layout

- `docs/` is the published site. GitHub Pages serves only this folder.
- `docs/assets/`: `floor.js` draws the office in SVG, `home.js` builds the replay, `seats.js` runs the How it works stepper, `record.js` renders the record from `sample.js`, and `tokens.css`, `site.css`, `home.css` and `record.css` hold the styles.
- `clip/` renders the replay to video. `tests/` and `tools/` hold the checks. None of these ship.

## Run it locally

```bash
python3 -m http.server 8000 --directory docs
```

Then open http://localhost:8000.

## Before you push

```bash
python3 tools/stamp.py
```

Every asset URL carries `?v=` and a content hash, because Pages caches files for ten minutes. This updates the hashes.

```bash
python3 tests/seek-check.py
```

Seeks the replay to every label from both directions and fails if any part of my signature shows before the stamp lands. Needs Playwright with Chromium.

## The clips

`clip/render.sh` renders the same scene code to four videos in `clip/out/`, which git ignores:

- `a-week-at-the-desk-4x5.mp4`: 1080×1350, for the LinkedIn feed.
- `a-week-at-the-desk-16x9.mp4`: 1920×1080, for wide players.
- `a-week-at-the-desk-phone.mp4`: 1080×1920.
- `how-a-call-travels-phone.mp4`: 1080×1920, the seats in order.

It uses [HyperFrames](https://github.com/heygen-com/hyperframes) (Apache-2.0), pinned to 0.8.218. The script installs it into a temporary folder with install scripts skipped and its telemetry off, then deletes the folder. It needs Node 22 or newer, ffmpeg, and a local Chrome or chrome-headless-shell (`HYPERFRAMES_BROWSER_PATH`).

## Built with

- Static HTML, CSS and plain JavaScript. No framework, no build step, no trackers, no third-party requests.
- Original isometric SVG art, drawn in code from floor coordinates.
- GSAP 3.13.0, vendored in `docs/assets/vendor/`, under its no-charge Standard license.
- Self-hosted fonts under the SIL Open Font License 1.1: Newsreader, Public Sans and IBM Plex Mono, subset to Latin.
- Text contrast of 4.5:1 or better, touch targets of 44 px or more, focus order that follows reading order, and a reduced-motion mode that swaps the animation for a stepped list.

## Related repos

| Repo | Role |
|---|---|
| `site-high-leverage` (this one) | The website |
| `ledger-high-leverage` (later) | The record: append-only calls, scores and the event feed |
| `desk-high-leverage` (later) | The engine: scripts, prompts and tests |

The site will read the ledger. A redesign here can never touch the record.

Built by Siddharth Shah, [siddharthshah.me](https://siddharthshah.me).
