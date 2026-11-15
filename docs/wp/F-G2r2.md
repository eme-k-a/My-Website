# F-G2r2: the open findings from G2 review round 2

## Goal
Close the two P1s that keep gate G2 from passing after round 2, plus one P2 at the same stops. Round 2 is in `review/runs/2026-10-20-g2r2/scorecard.md`, with an average of 3.65 (desktop 3.80, Pixel 7 3.50). Each finding's `expected` and `check` fields in `review/findings.json` are its acceptance test.
- **F-020 (P1), desk at 360 x 640 portrait:** the desk is still hidden behind the card on a small phone. It passes at 412 x 839, so fix it without regressing that size: framing in `src/museum/rail/framing.ts`, a shorter small-phone desk card in `src/overlay/`, or both. `screenPos('desk')` must sit above the card's top at 360 x 640 and at 412 x 839. Add a pixel7 e2e assertion, plus one at 360 x 640 (R0 grant in `tests/e2e/`).
- **F-036 (P1), sdsj on desktop:** the rail tooltip is drawn over the 3D wall title. No rail text (tooltip, wing chip, exit control) may intersect the stop's own 3D wall title at any stop on desktop; check sdsj, klarup and finance-tracker. Add an e2e assertion in the rail spec.
- **F-037 (P2), volunteer-door on desktop and pixel7:** the wing's only case (sdsj) hides behind the right door jamb. Show it whole inside the doorway, with its pool, by offsetting the lone wing item or aiming the door camera. The layout rule from F-035 that centres a lone wing item can change.

## Owner role
R4 Camera and R6 Overlay, with R3 for any layout or label change. There is no context pack: read this brief, the end of `docs/RULINGS.md`, the round 2 scorecard and findings, and the cited spec sections.

## Owned globs
`src/museum/rail/**`, `src/overlay/**`, `src/museum/environment/**` (only if F-037 needs it), `tests/e2e/**` (new assertions, and specs your changes break), `review/reports/F-G2r2.json`.

## Rules
Frozen contracts stay frozen. Every rail sample stays at least 0.4 m from the walls. Do not regress the round 2 fixes: F-021 (HUD hidden under the story panel), F-022 (titles in frame) and F-020 at 412 x 839. Visual baselines will change; R0 regenerates them in CI.

## Commands
`npm run verify`, `npm run build`, and the camera, rail-input, wings, dialog and keyboard specs on desktop and pixel7 (`--workers=2`). Run captures with `tests/e2e/capture.spec.ts` (`CAPTURE_STOPS=desk,sdsj,klarup,finance-tracker,volunteer-door`) at desktop, pixel7 and 360 x 640, and look at them with the Read tool.

## Output
Commits `fix(F-0xx): ...` with trailer `WP: F-0xx` and the attribution lines. `review/reports/F-G2r2.json` with before/after evidence.
