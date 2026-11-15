# verafin: "The Reporting Engine" (No. 01)

Spec: `docs/spec/EXPERIENCE.md` §4.1. Work package: `docs/wp/WP-12.md`. Concept checklist and R2 verdict: [`review/concepts/verafin.md`](../../../../review/concepts/verafin.md).

## Concept

Platform data becoming accurate, readable reports, and reporting plugins that extend the engine. A frosted glass column with a softly glowing core stands at the back left of a walnut tray; a brass conduit leaves its base and runs to a six-by-six block of bone ceramic bars, the report. Three brass cartridges docked through a collar on the column are the plugins. Every 8 s the report refreshes: the bars ease to new heights in a slow sweep from left to right. It depicts reporting and data platform work only (copy guard): no colored, flagged or highlighted bar, no alert or magnifier, no particles or streams, no text or numbers.

## Object description (DOM, `exhibit.object`)

"A frosted glass column feeds a six-by-six grid of bars that refreshes like a report. Three brass cartridges docked in the column are the plugins that extend it."

## Slot and bounds

Standard slot (EXPERIENCE §5.3), local meters, origin at the plinth top center, +Z toward the stop camera: x and z in [-0.325, 0.325], y in [0.025, 0.675].

| Part           | Material                                           | Placement                                                                                                                                                                                   |
| -------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base tray      | `walnut`                                           | RoundedBox 0.60 x 0.03 x 0.44, radius 0.008, center (0, 0.04, 0); top at y 0.055                                                                                                            |
| Column         | `frostedGlass`                                     | cylinder r 0.07, h 0.46, 48 segments, axis (-0.19, z -0.10), y 0.055 to 0.515                                                                                                               |
| Core           | `accentGlow` (own instance, emissive 0.35, static) | cylinder r 0.012, h 0.42, centered on the column axis                                                                                                                                       |
| Dock collar    | `brass`                                            | torus at y 0.30, radius 0.078, tube 0.008 (inner edge on the glass)                                                                                                                         |
| Cartridges (3) | `brass`                                            | RoundedBox 0.07 radial x 0.10 tall x 0.018, radius 0.004, azimuths 90, 210, 330 degrees (0 = +X, 90 = +Z), radius 0.07 to 0.14, centered at y 0.30                                          |
| Conduit        | `brass`                                            | strip 0.24 x 0.006 x 0.03 on the tray, on the line from the column axis to the grid center; it starts inside the column base and its far corner meets the left face of the first bar column |
| Report grid    | `ceramic`                                          | 36 bars 0.038 x h x 0.038, pitch 0.048, centered at (0.12, z 0.06), standing on the tray, h in [0.02, 0.18], one InstancedMesh                                                              |

Measured under `?test=1` (`stats().exhibits.verafin`): `inBounds: true`, 2,732 triangles, 9 draw calls. Overall box (analytic, sharp corners): x -0.316 to 0.300, y 0.025 to 0.515, z -0.220 to 0.220.

The slot floor is 2.5 cm above the plinth top, so the tray stands on that reveal; the kit's contact shadow reads as a shadow line under it at the stop.

## Budget

`index.ts`: 4,000 triangles, 12 draw calls, 0 MB textures (no textures of its own). Actual: 2,732 triangles (tray 556, cartridges 3 x 236, collar 768, column 192, core 64, conduit 12, bars 36 x 12), 9 draw calls. Lazy chunk `ReportingEngine` (with `engine.ts` and drei's RoundedBox): 2.81 KB gzip of the 40 KB limit.

## Materials

`walnut`, `frostedGlass`, `accentGlow`, `brass`, `ceramic` only, from the kit hooks. The core uses `useMaterialInstance('accentGlow')` so its static 0.35 glow never changes the shared material; nothing else is cloned or mutated.

## Motion (one)

The report refresh, driven only by `useExhibitClock()`. Every 8 s (from t = 8 s) the 36 heights ease from seeded set k - 1 to set k over 1.6 s (easeInOutCubic), each bar column starting 40 ms after the one to its left, so a sweep lasts 1.8 s. Set k comes from `rng()` seeded per set: a level, a left-right trend, a rise toward the back row (so back rows show over front rows from the camera) and per-bar variation, clamped to [0.02, 0.18]. A stepped block, never a lone outlier bar. The column, core, collar, cartridges and conduit never move.

Instance matrices are written only during a sweep, plus once when the held set changes; between sweeps nothing changes, so the frame driver can stop rendering. The bounding sphere is sized once for the tallest possible bars.

**Reduced-motion and `?test=1` pose:** bars frozen at seeded set 0 (`prefers-reduced-motion` pins set 0 whatever the clock says; `?test=1` freezes the clock at 0, which is set 0). Hover adds nothing (the kit's light lift).

## Files

- `index.ts`: the eager manifest (id, title, lazy loader, budget, `motion: 'slow'`).
- `ReportingEngine.tsx`: the lazy component (default export, `ExhibitProps`).
- `engine.ts`: measurements, placements, seeded report sets and the refresh driver (pure, Node-tested).
- `engine.test.ts`: bounds, docking, conduit, grid layout, timing, determinism and the driver.
