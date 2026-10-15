# F-M1: fix-ups from the M1a verification (F-001 to F-010)

## Goal
Close the minor findings that the WP-06, WP-07 and WP-10 verifiers raised. This must happen before WP-08 and WP-09 build on top of the shell. Each item is small and stays inside the owner globs named for it. R0 grants this fixer each listed path for this pass only.

## Owner role
Fixer acting as R10, R8, R6 and R9, one item at a time. The owner is named on each item.

## Milestone and dependencies
M1, between M1a (WP-06, WP-07 and WP-10, merged at `ced456a`) and M1b (WP-08 and WP-09).

## Inputs
- `review/reports/WP-06.json`, `WP-07.json` and `WP-10.json`: the verifier findings these items come from.
- PLAN Addendum, "R0 rulings after M1a".
- ARCHITECTURE sections 5, 9, 12 to 14; EXPERIENCE section 8.

## Items

| ID | Owner | Paths | Fix | Acceptance |
|---|---|---|---|---|
| F-001 | R10 | `scripts/check-copy.test.ts` | Today two tests require the live content to still contain drafts and placeholders. Change them to run `scanContent` on a fixture object instead. Tests that load the real content check only the shape of each hit: every hit starts with `content.`, and every draft hit points at an object whose `draft === true`. They must not require that any hit exists. | `npm test` passes. A throwaway local edit that flips `exhibit.draft` on verafin to false keeps `npm test` green; revert the edit afterwards. |
| F-002 | R10 | `.github/workflows/ci.yml` | Three changes. (a) In the lighthouse job, run mobile and desktop as two separate steps, each with `continue-on-error: true` while the advisory period lasts, so desktop still runs when mobile fails. (b) Run `sudo apt-get update` before `apt-get install poppler-utils` in the build job. (c) Give the "Regenerate the visual baselines" step `--pass-with-no-tests`. | `actionlint` exits 0 and the YAML parses. The diff shows all three changes. |
| F-003 | R8 | `scripts/check-glyphs.test.ts` | Replace the literal invisible U+E000 character with the escape `''`, so the existing comment is true. | `grep -P '\x{E000}' scripts/check-glyphs.test.ts` (with `LC_ALL=C.UTF-8`) finds nothing, and the test still passes. |
| F-004 | R8 | `tests/e2e/helpers.ts` | Today `listenerAudit` checks only window, document, `#app` and the canvas. Make it also cover the R3F event-source wrapper (the canvas's parent element) and every `section[data-stop]`. | The smoke spec still passes. In a scratch copy, a deliberate non-passive `wheel` listener added on a `section[data-stop]` makes the audit fail. |
| F-005 | R6 | `src/overlay/Intro.module.css` and other `src/overlay/**` files R6 owns | Desktop cold-load CLS is 0.027, over the 0.02 budget. Find the layout shift (about 140 ms after load) with a `PerformanceObserver` for `layout-shift`, then remove its cause, for example by reserving space or setting font-display metrics. | Cold load at 1440x900 and Pixel 7 on serve-dist, with no `?test`: the sum of layout-shift values is at most 0.02, over 3 runs each. |
| F-006 | R6 | `src/main.tsx` | Call `hydrateRoot` only when `#app` holds server-rendered markup. Otherwise call `createRoot` (for the dev server). This removes the hydration-mismatch page error under `npm run dev`. | `npm run dev` page load shows 0 page errors in Chromium, and the prerendered build still hydrates: e2e stays green. |
| F-007 | R6 | `src/overlay/StopCard.tsx` and its CSS | With JS off, `/` shows 8 buttons that do nothing ("Read the story" x6, "Step inside" x2). Hide them until hydration, for example with `<html class="no-js">` that the boot script removes, plus CSS. Each card title stays a real link to `/exhibit/<id>/`. Follow ARCHITECTURE section 5.2: door cards show "Step inside" only in museum mode. | With JS disabled, `/` has 0 visible `button` elements inside stop cards, and every story stays reachable by a link. With JS on, the existing e2e passes. |
| F-008 | R6 | `src/overlay/Intro.module.css` | The lobby intro paragraph is `display:none` below 480 px. Show it below the phone fold, as EXPERIENCE section 8.1 says, and keep the h1 as the LCP element. | At 390x844 the intro paragraph is in the DOM and visible after scrolling. The fast-path specs still pass, and Lighthouse mobile reports LCP on the h1. |
| F-009 | R9 | `src/entry-server.tsx`, plus a selector in `src/content/selectors.ts` (R1 grant) | Today the `/resume/` meta description is hard-coded. Derive it from content, from `content.meta.description` or a selector, so it follows the content update runbook. | `dist/resume/index.html` has a meta description equal to the content value, and no hard-coded string is left in `entry-server.tsx`. |
| F-010 | R7 | `scripts/check-budgets.ts` (and `.test.ts`) | Ruling R-M1-2: the entry chunk may import small pure-data modules from `src/museum` (`quality/tiers`, `rail/navigation`, `rail/progress`, `rail/layout`), but never three.js, R3F, drei or troika. Add a check that fails if the entry chunk contains three.js fingerprints, such as `WebGLRenderer`, `ShaderChunk` or `troika`. | `npm run check:budgets` passes on the current build. A unit test proves the three.js fingerprint check fails on a fixture chunk. |

## Forbidden
- The standard list from `docs/wp/_TEMPLATE.md`.
- Do not touch the contracts-v1 files, `src/museum/**` (except where F-010 only reads it), the camera rail or the exhibit kit.

## Commands
`npm run verify`, `npm run build`, `PORT=4173 npm run e2e`, `npm run a11y`, `actionlint .github/workflows/ci.yml` (if `actionlint` is missing, use `python3 -c "import yaml,sys;yaml.safe_load(open(sys.argv[1]))" .github/workflows/ci.yml`).

## Output
- One commit per item: `fix(F-00x): ...`, with trailer `WP: F-00x` and the attribution lines.
- The report goes in `review/reports/F-M1.json`.

## Size
M overall (10 small items).
