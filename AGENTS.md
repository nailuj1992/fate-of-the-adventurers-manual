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
| `index.html` | The page markup and the script tags. **Byte-identical** with the Twitch repo's `public/index.html`. |
| `adapter.js` | The manual **adapter** and the ONLY UI file that differs from the Twitch repo: `ADAPTER` capabilities (`name`, `twitchNames`, `helpSuffix`), `api(name, body)` (runs the engine locally) and `boot()` (restores the event after a refresh, F5); persists settings and the in-progress event in `localStorage`. |
| `ui/*.js` | **Shared** UI scripts, loaded in this order: `util.js` (helpers, emblems), `state.js` (state mirror, i18n glue, UI clock), `admin.js` (participants, settings panel, start), `stage.js` (render, final screen, modal, buttons), `fx.js` (particles), then `adapter.js` (per repo), then `main.js` (init + `boot()`). They are classic scripts sharing the global scope, so top-level code may only reference symbols from the same file or earlier ones. |
| `core.js` | **Shared** pure engine (no DOM): settings and limits, validation, rotation, eligibility, state machine with a single phase scheduler, snapshot/restore. |
| `i18n.js` + `locales/en.js`, `locales/es.js` | **Shared** i18n module and catalogs. |
| `css/app.css` | **Shared** stylesheet (the whole look of the page, including the Xuen theme). Loaded with `<link rel="stylesheet" href="css/app.css">`. |
| `img/` | Celestial images. Third-party artwork (not owned by the maintainer): do not add more of it or redistribute it elsewhere; the maintainer decides if it must be replaced. |
| `README.md` / `README.es.md` | User docs (EN / ES), with a step-by-step section illustrated by `docs/img/`. |
| `.github/workflows/pages.yml` | Builds, validates and deploys the site to GitHub Pages. |

The page loads `locales/en.js`, `locales/es.js`, `i18n.js`, `core.js`, `ui/*.js` as classic scripts (so it works from `file://`; no ES modules). Keep those relative paths.

## Deployment (GitHub Pages)

- The site is published at **https://nailuj1992.github.io/fate-of-the-adventurers-manual/** by `.github/workflows/pages.yml`.
- **It runs ONLY when a pull request into `master` is approved and merged.** The only trigger is `push` to `master`; since `master` is protected (PR required, admins included), that push is always the merge of a PR, and a `guard` job additionally checks through the API that the commit belongs to a **merged** PR, otherwise nothing is built or deployed. It does **not** run when a PR is opened or updated, and there is no manual trigger: `pull_request`, `pull_request_target` and `workflow_dispatch` must not be added without the maintainer's OK.
- Why not `pull_request_target`: it runs with write permissions and secrets in the context of the base branch, which is unsafe whenever PR code can be checked out (SonarCloud flags it). Here the workflow only ever checks out `master` and never touches code from an unmerged PR or a fork. Keep it that way. Pass GitHub context values to `run:` steps through `env:`, never by interpolating `${{ … }}` inside the script.
- **The live link must stay visible in three places** and be kept in sync if the URL ever changes: the repository **description** and **website** field (GitHub *About*), the top of both READMEs, and this file. When editing any of them, check the other two.
- Only the files the browser needs are published (`index.html`, `adapter.js`, `core.js`, `i18n.js`, `locales/`, `css/`, `ui/`, `img/`); `README*`, `AGENTS.md` and `.github/` are not.
- The page is served from a **sub-path**, so every reference must stay **relative** (`img/…`, `locales/…`); never use absolute paths such as `/core.js`.
- **If you add a runtime file** (script, image, stylesheet) the page needs, add it to the *Assemble* and *Validate* steps of the workflow in the same pull request, or it will not be deployed.
- Pages source is *GitHub Actions* (repository setting). Do not switch it to "deploy from a branch".

## Domain rules (invariants — do not break them without the maintainer's OK)

- **Randomness:** only `crypto.getRandomValues` with rejection sampling (`secureIndex`). Never `Math.random` for choosing winners. The participant list is also shuffled at start with `secureShuffle` (Fisher–Yates over `secureIndex`); with an injected `pick` (tests) the shuffle is off unless a `shuffle` is injected. A draw with a single eligible person skips the countdown and the roll. The draw happens when the countdown ends.
- **Rounds:** `prizes` (1–50) main rounds; Celestial = `CELESTIALS[round % 3]` (Niuzao → Yu'lon → Chi-ji). An absence does not change the Celestial; rotation advances only on a confirmed winner or a deserted round.
- **Eligibility** is computed from records: not a winner, not globally disqualified, not absent **in that same round**. Absent people can be drawn in later rounds and in Xuen.
- **Winners** excluded forever; one prize per person. **Global disqualification**: confirmation + written reason (≥ 3 chars), excluded from all remaining rounds, Xuen included.
- **Deserted round** → its prize goes to recovery. **Xuen** only if prizes remain unassigned; one absent in Xuen is out of all of Xuen.
- **One timer:** every phase goes through the engine's scheduler. The confirmation clock starts when the reveal ends; animations never consume it. Settings are locked once the event starts.
- **Prize codes are never shown or stored.**

## Conventions

- **i18n.** Every user-facing string goes through `I18n.t(...)` / `data-i18n`; engine messages are *keys + params*. **English is the default**, independent of the browser language. Every key in **both** catalogs with the same `{params}`. Spanish uses correct orthography (accents, `ñ`). User-entered data is never translated.
- **Persistence:** `localStorage` only for settings (`celestiales.config.v1`), the in-progress event (`celestiales.state.v1`) and the language (`celestiales.locale`). Always wrap access in `try/catch`; the app must work when storage is unavailable. Never store credentials.
- **Shared files** (`core.js`, `i18n.js`, `locales/*`, `css/app.css`, `ui/*.js`) must stay **byte-identical** with the sibling repo.
- **UI parity.** `index.html` here and `public/index.html` in the Twitch repo are byte-identical; the only UI file that differs is `adapter.js` (`ADAPTER` capabilities, `api()`, `boot()`). The shared code asks the capabilities (`ADAPTER.twitchNames`, `ADAPTER.helpSuffix`) instead of "which version am I". `tests/shared.test.js` in the Twitch repo checks all of it. There is no generator: apply any UI change to **both** repos.
- Style: 2-space indentation, `'use strict'`, match the surrounding code, comments in Spanish.
- Celestial names: **Niuzao, Yu'lon, Chi-ji (lowercase *j*, as on Wowhead), Xuen**; long names in `celestial.*.long`.

## Common tasks

- **Add a setting:** `DEFAULT_CONFIG` + `LIMITS` (and `toMs`) in `core.js`, labels/help in both catalogs, `CFG_MAIN`/`CFG_ADV` in `ui/admin.js`, README tables (EN/ES). Sync shared files to the sibling repo.
- **Screenshots:** the step-by-step section of both READMEs uses `docs/img/<en|es>/NN-*.webp` (not published to Pages). They show fictional participant names only. When the UI changes visibly, retake them (same steps, both languages) and keep the file names.
- **Change a message:** edit the key in **both** catalogs.
- **Add a language:** new `locales/xx.js`, register it in `i18n.js` and as a `<script>` in `index.html`; extend the switcher.
- **Change engine behaviour:** edit `core.js`; its tests live in the **Twitch repo** (`tests/core.test.js`, simulated clock). Add/adjust them there in the matching branch, and sync `core.js` here.

## Testing

- This repo has no test runner of its own. Verify by opening `index.html` in a browser: run a short event (small timings are allowed only through the engine API; the panel enforces the documented limits), switch language (EN/ES), refresh (F5) mid-event, and finish an event.
- Engine/i18n changes must pass `node --test` **in the Twitch repo** (clone both side by side so the identical-copy test runs).
- Be explicit about what you did and did not verify in a real browser.

## Restrictions

- **Never push to `master` directly**; never push tags; never force-push.
- Don't add dependencies, a bundler or a framework; the page must keep working from `file://` and from the Pages sub-path.
- Don't change `.github/workflows/` unless asked (it deploys to production on every merged PR into `master`). Never add triggers other than `push` to `master` (merged-PR gated), and never add secrets or tokens to the workflow or to the published files.
- Never store credentials or personal data beyond the participant names the presenter types (kept only in the page / `localStorage`).
- Don't remove the English default or let the browser language pick the UI language.
- Don't change the Celestial artwork or names without being asked.
