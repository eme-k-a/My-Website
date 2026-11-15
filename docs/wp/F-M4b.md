# F-M4b: close the G4 round 1 gap (3.90 to at least 4.0)

## Goal
The G4 round 1 review (`review/runs/2026-10-24-g4r1/`) averaged 3.90 against a 4.0 bar; it needs 15.5 more points (31 half-point steps) across 156 cells. No dimension is below 3.5, and Emeka has approved the 10 sign-off stills. The missing points sit in the two wing doors (volunteer-door 3.54, projects-door 3.66), mun on the phone (3.58), the near-black left half at verafin and mysa on desktop, and cfia. There is also one P1 on small phones (F-048). This pass fixes those findings, then G4 round 2 re-scores.

## Owner role
One fixer acting as R4 (rail and framing), R3 (environment and labels), R2 (light values only), R6 (rail labels) and R8 (the label measurement viewport), one item at a time. For this pass only, R0 grants the paths named on each item. No context pack: read this brief, each finding in `review/findings.json`, the G4 round 1 scorecard and evidence, and the end of `docs/RULINGS.md` from "M3 decisions" on.

## Items, in order of value

| ID | Owner | Paths | Fix | Check |
|---|---|---|---|---|
| F-048 (P1) | R4 with R3 | `src/museum/rail/framing.ts` and its tests | At 360 x 640 the HUD top row (bottom at y 52) covers the wall-title numeral at mun and certifications and touches it at cfia. Extend the F-039 phone rule to the main-aisle exhibit stops: frame from the measured HUD bottom so each title top sits at least 8 px below it, without pushing the case off its framing point. | rail-input (g) or a new check covers every main-aisle exhibit stop on pixel7 and 360 x 640: the title top is at least 8 px below the HUD row, with 0 overlap. |
| Doors (F-051 and the door composition) | R4, R3 | `src/museum/rail/framing.ts`, `src/museum/environment/**` (door and wall-wash values) | volunteer-door (3.50 to 3.58) and projects-door (3.58 to 3.75) are the weakest stops. On desktop the volunteer-door pose crops the neighbouring wailo case and title fragments at the left edge (F-051), and on both doors the left half is void while the card crowds the frame. Yaw or reframe the door poses toward the door so the transom title, the doorway and the room's glow compose as one picture, with nothing cut at the edges; give the void a soft warm wash. | Captures of both doors on desktop and pixel7, before and after. No neighbouring case or title is cut by a frame edge. rail-input (g) for the doors still passes. |
| F-049 (P2) | R3 with R8 | `src/museum/exhibits/_kit/placard.ts`, `titleMetrics.ts`, `src/museum/environment/**` label tests, the viewport in `labels.test` | The MUN organization cap is about 13.5 px on a real Pixel 7 (412 x 839) against the 14 px floor; labels.test measures at 412 x 915. Measure at 412 x 839, then take the room from the number cap (0.32 to about 0.26 m) and give the organization about 0.20 m, keeping the block from rising toward the HUD (the 05 clears the row by only 0.9 px now). | labels.test at 412 x 839 passes for every title; the MUN cap is at least 14 px; the 05 is at least 8 px below the HUD row on Pixel 7. |
| F-050 (P2) | R4 | `src/museum/rail/CameraRig.tsx`, `framing.ts` | In the certifications dialog on desktop, the top of 06 is cut by the viewport edge. Add the vitrine to the titleClearDolly map with a top clearance. | The certifications dialog title is whole on desktop (a projection test or capture). |
| F-052 (P3) | R2 with R3 | `src/museum/environment/**`, light values in `src/design/tokens.*` | At verafin and mysa (and projects-door) on desktop the left half samples near black (rgb 8, 7, 9). Add a low warm wash on the left wall within the tier's fixed light count (washes and pools, not new real lights). | Desktop captures of verafin and mysa: the left half reads as a dim warm wall, not black; budgets unchanged. |
| F-053 (P3) | R6 | `src/overlay/ProgressRail*` | At cfia on desktop the rail labels are drawn over the lit neighbouring MUN case. Give the rail labels a subtle backing or reduce their contrast over bright pixels so they stay legible without fighting the case. | Desktop cfia capture; the rail stays readable and the a11y contrast checks pass. |

## Rules for this pass
- No other builder is running.
- Never skip, weaken or add retries to a test. Budgets stay as they are. Frozen contracts (contracts-v1) stay frozen. Do not change any exhibit's object, any exhibit's material, or KlarUp.
- Keep everything that G4 round 1 scored as improved: the lobby, verafin, klarup, finance-tracker, sdsj, certifications and wailo must not regress. Compare your after captures with the round 1 captures in `review/runs/2026-10-24-g4r1/`.
- No em dash (U+2014) anywhere, and never invent facts.
- Visual baselines come only from CI. List the stops and dialogs whose screenshots change in the report.

## Acceptance
- Every check in the table passes.
- `npm run verify`, `npm run build`, `npm run check:budgets` and `npm run check:glyphs` pass.
- The rail-input, wings, dialog, environment, greybox, exhibits, mobile and quality specs pass on desktop and pixel7.

## Output
- Commits `fix(F-0xx): ...` with trailer `WP: F-0xx` and the attribution lines (`fix(doors): ...` with `WP: F-051` for the door composition).
- Before and after captures under `review/runs/2026-10-24-f-m4b/` (small PNGs, force-added).
- `review/reports/F-M4b.json`: per item, the change and its evidence.

## Size
M.
