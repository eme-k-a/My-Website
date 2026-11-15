# F-M5p: G4 polish carried into M5

## Goal
Emeka accepted G4 at 3.94 on 2026-11-15 (a taste call; the 10 sign-off stills already hold). The G4 round 2 review (`review/runs/2026-10-27-g4r2/`, scorecard "R0 options") names where the remaining points are: story clarity at the doors, phone mood, object read on the phone doors, and three small findings. This pass does those polish items in parallel with M5. It is not a gate: the M7 monthly review re-scores them. Do the items in order; each one is worth committing on its own.

## Owner role
One fixer acting as R4 (rail and framing), R3 (environment and labels) and R2 (light values only), one item at a time. For this pass only, R0 grants the paths named on each item. No context pack: read this brief, each finding in `review/findings.json`, the G4 round 2 scorecard and evidence, ART_DIRECTION §4 and §10, and the end of `docs/RULINGS.md` from "M3 decisions" on, including "G4 passed".

## Items, in order of value

| ID | Owner | Paths | Fix | Check |
|---|---|---|---|---|
| F-054 (P2) | R4 | `src/museum/rail/framing.ts` and its tests | At the volunteer door on desktop the right jamb and the room title touch the active rail label ("Volunteer & Leadership wing", x 1128 to 1322 at 1440 x 900). Bound the door framing by the active label's left edge, at least 16 px clear, or yaw the volunteer pose 1 to 2 degrees toward the door. projects-door must not regress. | framing.test's door bound uses the active label's left edge. A volunteer-door desktop capture shows no jamb or title pixels inside the label's rect plus 16 px. |
| Phone mood (D1) | R2 with R3 | `src/museum/environment/**`, light values in `src/design/tokens.*`, ART_DIRECTION §4 | On the phone main-aisle stops the surround reads as dead ink. Add a warm far pool or wall bay down the aisle (the side-bay wash family from F-M4b), within each tier's fixed light count: washes and pools, not new real lights. | Pixel 7 captures of verafin, mysa, cfia and both doors (wailo only if its approved still keeps its look): the far field reads as gallery, not black. `npm run check:budgets` unchanged. |
| F-052 (P3, verafin) | R2 with R3 | same as above | On desktop the verafin left half is still the dark far aisle (rgb 11, 11, 13 at x 300, y 300). The same far pool or a side-bay wash at verafin. | Desktop verafin capture: the left-half sample is in the wall-wash family (mysa reads 26, 21, 21). |
| Door story beat (D4) | R4 with R3 | `src/museum/rail/framing.ts`, `src/museum/environment/**` (door, transom and room light values) | Both doors read as "a door with one case". At projects-door, let the second wing case (finance-tracker) show or be hinted through the doorway (framing, or a lit pool where it stands). The volunteer wing holds one exhibit (SDSJ), so there the beat is the room itself: the glow and title read as a room you enter. Do not move exhibit slots or wing layout (frozen contracts); no new copy and no invented facts. | Desktop and Pixel 7 captures of both doors, before and after. rail-input (g) for the doors still passes. |
| Phone door cases (D6) | R4 | `src/museum/rail/framing.ts` and its tests | On Pixel 7 the inner case at each door is small. Bring the portrait door pose closer or narrower so the case reads larger, keeping both jambs whole and the transom at least 8 px under the HUD row (F-048, F-051 rules). | Pixel 7 and 360 x 640 captures of both doors; framing tests pass. |
| F-056 (P3) | R3 | `src/museum/exhibits/_kit/titleMetrics.ts`, `placard.ts`, the MUN title in `src/museum/environment/**` and its tests | The MUN "05" reads smaller than MEMORIAL UNIVERSITY. Give the numeral the lead (for example 0.28 m with the organization line spacing tightened) within the same block height. | mun desktop and Pixel 7 captures: the numeral leads. labels.test passes, the MUN organization cap stays at least 14 px on Pixel 7, and the "05" stays at least 8 px under the HUD row. |
| F-055 (P3) | R3 | `src/museum/environment/labels.test.ts` | R0 ruled the 14 px floor a Pixel 7 rule (RULINGS, "G4 passed"). Add a 360 x 640 row with an 11 px floor so small phones cannot regress below today's 11.4 px. | labels.test has the 360 x 640 row and passes. |

## Off limits (four M5 sessions run in parallel)
- WP-29: `perf/**`, `scripts/check-budgets*`, `src/museum/quality/**`, `lighthouserc*.cjs`, the `lighthouse` job in `ci.yml`.
- WP-30: `src/overlay/**`, `src/classic/**`, `index.html`.
- WP-31: `src/seo/**`, `src/entry-server.tsx`, `scripts/prerender.ts`, `scripts/postbuild.ts`, `scripts/gen-og*`, `public/og/**`, the icons.
- WP-32: `tests/**`, `playwright.config.ts`, the `e2e-xbrowser` job in `ci.yml`.
- You may run any spec; you may not edit `tests/**`. Checks for this pass are colocated unit tests and captures.

## Rules for this pass
- Never skip, weaken or add retries to a test. Budgets stay as they are. Frozen contracts (contracts-v1) stay frozen. Do not change any exhibit's object or material, or KlarUp.
- Keep what G4 round 2 scored as improved: compare your after captures with `review/runs/2026-10-27-g4r2/`, and do not move Emeka's approved stills (ART_DIRECTION §10) more than the polish needs.
- No em dash (U+2014) anywhere, and never invent facts.
- Visual baselines come only from CI. List the stops and dialogs whose screenshots change in the report.
- Push after each finished item, only to your own branch.

## Acceptance
- Every check in the table passes, or the report says why an item was left (taste items may stop at "tried, not better").
- `npm run verify`, `npm run build`, `npm run check:budgets` and `npm run check:glyphs` pass.
- The rail-input, wings, dialog, environment, greybox, exhibits, mobile and quality specs pass on desktop and pixel7.

## Output
- Commits `fix(F-0xx): ...` with trailer `WP: F-0xx` (`fix(polish): ...` with `WP: F-M5p` for the untracked items) and the attribution lines.
- Before and after captures under `review/runs/2026-11-15-f-m5p/` (small PNGs, force-added).
- `review/reports/F-M5p.json`: per item, the change and its evidence.

## Size
M.
