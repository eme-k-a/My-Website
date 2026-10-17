# F-G2a: environment fixes from the G2 slice review (round 1)

## Goal
Close the environment findings from the WP-19 slice review: `review/runs/2026-10-17-g2/scorecard.md` and `review/findings.json` (F-022 to F-027, F-031 to F-033). G2 needs an overall average of at least 3.5 and no open P0 or P1. Round 1 scored 3.33: desktop 3.60, Pixel 7 3.07. The Pixel 7 tier-medium look is the main lever.

## Owner role
R3 Environment, with R2 Art Director judgment for any material or token value. There is no context pack: read this brief, the end of `docs/RULINGS.md`, each finding's `expected` and `check` in `review/findings.json`, the scorecard, and the cited `docs/ART_DIRECTION.md` sections.

## Items (each finding's `check` field is its acceptance test)
- **F-022 (P1):** 3D wall and door titles are clipped by the viewport and covered by HUD buttons (verafin, mysa, projects-door, volunteer-door, safe-sip; desktop and Pixel 7). Change title height, size or placement in `src/museum/environment/labels3d.ts` and the label components. Camera changes belong to R4 and are out of scope here.
- **F-023 (P1):** on the tier medium floor in the wings, the floor washes out to a flat bright plane on Pixel 7. Make medium read as dark polished floor, close in value to high (`Floor.tsx`, reflection and environment intensity, the ceiling Lightformer).
- **F-024 (P2):** plinths render as black voids. Ground them with a faint top-edge highlight or the wall wash (`src/museum/exhibits/_kit`, R0 grant for the plinth only).
- **F-025 (P2):** beam cones read as opaque grey shafts. Make them a faint suggestion that is never brighter than their pool (`Beams.tsx`).
- **F-026 (P2):** vertical streak noise on the aisle walls at grazing angles (`lightPools.ts` or the wall material).
- **F-027 (P2):** wing wall titles collide with the beam and the case.
- **F-031 (P2):** on the desktop lobby, the progress rail crosses the portrait. Keep the portrait clear of the right rail column, about 110 px (`Lobby.tsx`).
- **F-032 (P2):** on the phone lobby, the 3D title ghosts behind the h1 and the stage is hidden (`Lobby.tsx`).
- **F-033 (P3, optional):** brass 3D titles are dim on the dark walls.

## Owned globs
`src/museum/environment/**`, `src/museum/exhibits/_kit/**` (plinth only), `src/design/**` (token values only, recorded in `docs/ART_DIRECTION.md` §9 if a frozen token changes; no new token names), `review/reports/F-G2a.json`.

## Forbidden
The standard list in `docs/wp/_TEMPLATE.md`. No changes to `src/museum/rail/**`, `src/overlay/**` or exhibit folders other than `_kit`. Budgets in `perf/budgets.json` stay as they are, and per-stop draw-call and triangle budgets must still pass (`environment.spec`).

## Commands
`npm run verify`, `npm run build`, the capture spec (`CAPTURE_STOPS=<stops> npx playwright test tests/e2e/capture.spec.ts --project=desktop|pixel7`, see `review/rubric.md`), `npx playwright test tests/e2e/environment.spec.ts`. Look at your captures with the Read tool before and after, and keep before/after pairs in `out/f-g2a/`. Visual baselines will change; R0 regenerates them in CI, so `npm run visual` failures from changed pixels are expected.

## Output
Commits `fix(F-0xx): ...` with trailer `WP: F-0xx` and the attribution lines. `review/reports/F-G2a.json` with before/after evidence per finding.
