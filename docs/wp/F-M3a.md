# F-M3a: keep every stop within the draw-call budget with all exhibits built

## Goal
After the M3 exhibits merged (WP-20 to WP-24), the greybox spec "every stop renders within the draw-call budget" fails in CI. At tier medium (`perf/budgets.json` `render.drawCalls.medium` = 80) the verafin stop draws 98 calls on desktop and the klarup stop draws 116 on pixel7, in CI run 68. Stops after the first failure were never measured. Bring every stop within the budget at medium (80) and high (150) without raising any budget (CLAUDE.md rule 9) and without degrading the look the G2 review approved.

## Owner role
R7 Performance and Quality, with R3 for environment changes and an R0 grant to touch exhibit internals only to merge static geometry. No context pack: read this brief, ARCHITECTURE §9 (rendering budgets, mounting, tiers), the end of `docs/RULINGS.md`, and `perf/budgets.json`.

## Approach
1. **Measure first.** Record the draw calls, triangles and mounted exhibit list at every stop, at tier medium and tier high, on desktop and pixel7. Use `__MUSEUM__.stats()` through the greybox or environment spec helpers. Put the table in the report.
2. **Prefer structural fixes that keep the look.** For example:
   - a tighter mount window at medium, so fewer neighbours are mounted;
   - frustum or distance culling of off-screen exhibits;
   - merging an exhibit's static meshes that share a material through a kit helper, so each exhibit costs fewer calls;
   - instancing repeated environment pieces.
3. Do not change any exhibit's silhouette, motion or materials, and do not change the tier rules in a way that drops the high tier below the medium look.

## Owned globs
`src/museum/quality/**`, `src/museum/environment/**`, `src/museum/exhibits/_kit/**`, the static-geometry parts of `src/museum/exhibits/<id>/` (R0 grant: merging only, no visual change), `src/museum/Scene.tsx` and mounting code, `tests/e2e/greybox.spec.ts` (only to measure every stop and report all offenders, not just the first), `review/reports/F-M3a.json`.

## Acceptance
- At tier medium, every stop is at or under 80 draw calls on desktop and pixel7. At tier high, every stop is at or under 150.
- Triangles stay within budget at every stop.
- The greybox, environment, exhibit-contract, exhibits, wings and rail-input specs pass on desktop and pixel7.
- `npm run verify` and `npm run build` pass.
- Before/after captures at three busy stops (verafin, klarup, and the worst other one) show no visible change. Look at them.

## Output
Commits `perf(F-M3a): ...` or `fix(F-M3a): ...` with trailer `WP: F-M3a` and the attribution lines. `review/reports/F-M3a.json` with the before/after per-stop table.
