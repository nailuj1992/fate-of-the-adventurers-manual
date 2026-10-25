# AGENTS.md — The Fate of the Adventurers: The Trial of the Celestials (manual version)

Guidance for AI coding agents working in this repository.

## Git workflow — mandatory

- **NEVER push directly to `master`.** Not even a one-line fix, a copy tweak or a revert.
- **Every change goes on its own branch cut from `master`** (`git checkout master && git pull && git checkout -b <type>/<short-description>`), with `<type>` one of `feature/`, `fix/`, `chore/`, `docs/`, `refactor/`, `test/`. Push that branch and integrate it into `master` through a pull request.
- Never force-push a shared branch, never rewrite pushed history, never bypass hooks (`--no-verify`).
- Commit only what you were asked to commit: run `git status` first. Commit messages are written in English, Conventional Commits style (`feat:`, `fix:`, `docs:`, `chore:`…): a short imperative subject, then a body explaining the *why* for non-trivial changes.
- No tags or releases unless the maintainer asks.
- **This repository is public and `master` is protected** (pull request required, no force-push, no deletion, applies to admins too). Everything committed is publicly readable forever: never commit secrets, tokens, personal data or real participant lists.
- This repository has a **sibling**: `fate-of-the-adventurers-twitch` (same engine plus the Twitch integration). A change to a *shared file* (see below) needs the matching branch and pull request there.

## Project

Static, single-page app (no server, no install) to run a live, fair draw of in-game-time codes (prizes), themed on the four Celestials of Pandaria (Niuzao, Yu'lon, Chi-ji and Xuen). **The presenter confirms presence by hand** after checking the chat; there is no Twitch connection here.

- **Maintainer:** Nailuj1992
- **Languages:** UI **English by default**, Spanish as the second language (i18n). Code comments are in Spanish; commit messages, docs for agents and the English README are in English.
- **Stack:** vanilla HTML/CSS/JS opened directly in a browser (`index.html`, also works from `file://`). **No dependencies, no build step, no framework** — do not add any without asking. Node is only used to run the tests of the sibling repo.

## Layout

| File | Purpose |
|---|---|
| `index.html` | The whole UI and the page script: renders the engine state and sends commands. Contains an **adapter** section (`MODE = 'manual'`) that runs the engine locally, persists settings and the in-progress event in `localStorage`, and restores it after a refresh (F5). |
| `core.js` | **Shared** pure engine (no DOM): settings and limits, validation, rotation, eligibility, state machine with a single phase scheduler, snapshot/restore. |
| `i18n.js` + `locales/en.js`, `locales/es.js` | **Shared** i18n module and catalogs. |
| `img/` | Celestial images. Third-party artwork (not owned by the maintainer): do not add more of it or redistribute it elsewhere; the maintainer decides if it must be replaced. |
| `README.md` / `README.es.md` | User docs (EN / ES). |

The page loads `locales/en.js`, `locales/es.js`, `i18n.js`, `core.js` as classic scripts (so it works from `file://`). Keep those relative paths.

## Domain rules (invariants — do not break them without the maintainer's OK)

- **Randomness:** only `crypto.getRandomValues` with rejection sampling (`secureIndex`). Never `Math.random` for choosing winners. The draw happens when the countdown ends.
- **Rounds:** `prizes` (1–50) main rounds; Celestial = `CELESTIALS[round % 3]` (Niuzao → Yu'lon → Chi-ji). An absence does not change the Celestial; rotation advances only on a confirmed winner or a deserted round.
- **Eligibility** is computed from records: not a winner, not globally disqualified, not absent **in that same round**. Absent people can be drawn in later rounds and in Xuen.
- **Winners** excluded forever; one prize per person. **Global disqualification**: confirmation + written reason (≥ 3 chars), excluded from all remaining rounds, Xuen included.
- **Deserted round** → its prize goes to recovery. **Xuen** only if prizes remain unassigned; one absent in Xuen is out of all of Xuen.
- **One timer:** every phase goes through the engine's scheduler. The confirmation clock starts when the reveal ends; animations never consume it. Settings are locked once the event starts.
- **Prize codes are never shown or stored.**

## Conventions

- **i18n.** Every user-facing string goes through `I18n.t(...)` / `data-i18n`; engine messages are *keys + params*. **English is the default**, independent of the browser language. Every key in **both** catalogs with the same `{params}`. Spanish uses correct orthography (accents, `ñ`). User-entered data is never translated.
- **Persistence:** `localStorage` only for settings (`celestiales.config.v1`), the in-progress event (`celestiales.state.v1`) and the language (`celestiales.locale`). Always wrap access in `try/catch`; the app must work when storage is unavailable. Never store credentials.
- **Shared files** (`core.js`, `i18n.js`, `locales/*`) must stay **byte-identical** with the sibling repo.
- **UI parity.** `index.html` here and `public/index.html` in the Twitch repo are the same UI with a different adapter block (`/* ---- Adaptador … ---- */`: `MODE`, `api()`, `boot()`). There is no generator: apply any UI change to **both** files.
- Style: 2-space indentation, `'use strict'`, match the surrounding code, comments in Spanish.
- Celestial names: **Niuzao, Yu'lon, Chi-ji (lowercase *j*, as on Wowhead), Xuen**; long names in `celestial.*.long`.

## Common tasks

- **Add a setting:** `DEFAULT_CONFIG` + `LIMITS` (and `toMs`) in `core.js`, labels/help in both catalogs, `CFG_MAIN`/`CFG_ADV` in `index.html`, README tables (EN/ES). Sync shared files to the sibling repo.
- **Change a message:** edit the key in **both** catalogs.
- **Add a language:** new `locales/xx.js`, register it in `i18n.js` and as a `<script>` in `index.html`; extend the switcher.
- **Change engine behaviour:** edit `core.js`; its tests live in the **Twitch repo** (`tests/core.test.js`, simulated clock). Add/adjust them there in the matching branch, and sync `core.js` here.

## Testing

- This repo has no test runner of its own. Verify by opening `index.html` in a browser: run a short event (small timings are allowed only through the engine API; the panel enforces the documented limits), switch language (EN/ES), refresh (F5) mid-event, and finish an event.
- Engine/i18n changes must pass `node --test` **in the Twitch repo** (clone both side by side so the identical-copy test runs).
- Be explicit about what you did and did not verify in a real browser.

## Restrictions

- **Never push to `master` directly**; never push tags; never force-push.
- Don't add dependencies, a bundler or a framework; the page must keep working from `file://`.
- Never store credentials or personal data beyond the participant names the presenter types (kept only in the page / `localStorage`).
- Don't remove the English default or let the browser language pick the UI language.
- Don't change the Celestial artwork or names without being asked.
