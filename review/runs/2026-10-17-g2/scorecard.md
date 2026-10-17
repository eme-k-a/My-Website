# Slice review, round 1 (gate G2)

- Date: 2026-10-17. Reviewer: R11 (WP-19). Protocol: `review/rubric.md`.
- Build: `a8df9c7` on `claude/intelligent-sagan-poq45q` (M2 slice, WP-11 to WP-18 plus F-M2), built locally and served by the Playwright web server on port 4174. The Netlify preview is the same tested build but is not reachable from this container.
- Capture: `tests/e2e/capture.spec.ts` (`@capture`, `CAPTURE_DIALOGS=1`), `?test=1&mode=museum`. Desktop 1440 x 900 at `tier=high`; Pixel 7 412 x 839 at tier medium. Stops: lobby, verafin, projects-door, mysa (context only, not scored), volunteer-door, safe-sip, desk. Raw scores and reasons: `scores.json` in this folder. Stats for every shot: the `<stop>-<project>.json` files.
- Cross-check: the 19 committed CI baselines in `tests/e2e/__screenshots__/visual.spec.ts/` match these captures where they overlap (for example `stop-verafin-desktop.png`, `stop-desk-pixel7.png`).
- Previous round: none. Reference stills: none yet (this round proposes them).

## Result against gate G2

| Gate input | Value | Bar | Pass |
|---|---|---|---|
| Overall average (72 cells) | **3.33** | at least 3.5 | no |
| Open P0 | 0 | 0 | yes |
| Open P1 | **4** (F-020, F-021, F-022, F-023) | 0 | no |
| Open P2 / P3 | 9 / 2 | (not gating) | |
| Emeka's approval of stills and preview | pending | required | pending |

**G2 is not met in round 1.** Desktop alone averages 3.60 and would clear the bar; Pixel 7 averages 3.07 and pulls the total under it. Three of the four P1s are phone framing and tier-medium problems, so a focused fix round should move the average more than any new art.

## Scores: desktop (tier high)

| Stop | D1 | D2 | D3 | D4 | D5 | D6 | Avg | Shot |
|---|---|---|---|---|---|---|---|---|
| lobby | 3.5 | 3.5 | 4.5 | 4 | 3.5 | 3.5 | 3.75 | `review/runs/2026-10-17-g2/lobby-desktop.png` (D6: `lobby-thumb.png`) |
| verafin | 3 | 3.5 | 4 | 4 | 4 | 3.5 | 3.67 | `review/runs/2026-10-17-g2/verafin-desktop.png` (D6: `verafin-thumb.png`) |
| projects-door | 3 | 3 | 3.5 | 3.5 | 3.5 | 3.5 | 3.33 | `review/runs/2026-10-17-g2/projects-door-desktop.png` (D6: `projects-door-thumb.png`) |
| volunteer-door | 3.5 | 3 | 3.5 | 3.5 | 3.5 | 3.5 | 3.42 | `review/runs/2026-10-17-g2/volunteer-door-desktop.png` (D6: `volunteer-door-thumb.png`) |
| safe-sip | 3.5 | 3.5 | 4 | 3 | 3.5 | 3 | 3.42 | `review/runs/2026-10-17-g2/safe-sip-desktop.png` (D6: `safe-sip-thumb.png`) |
| desk | 4 | 4 | 4.5 | 3.5 | 4 | 4 | 4.00 | `review/runs/2026-10-17-g2/desk-desktop.png` (D6: `desk-thumb.png`) |
| **Dimension avg** | 3.42 | 3.42 | 4.00 | 3.58 | 3.67 | 3.50 | **3.60** | |

## Scores: Pixel 7 (tier medium)

| Stop | D1 | D2 | D3 | D4 | D5 | D6 | Avg | Shot |
|---|---|---|---|---|---|---|---|---|
| lobby | 3 | 2.5 | 4 | 3 | 3.5 | 2.5 | 3.08 | `review/runs/2026-10-17-g2/lobby-pixel7.png` |
| verafin | 3 | 3 | 4.5 | 4 | 4 | 4 | 3.75 | `review/runs/2026-10-17-g2/verafin-pixel7.png` |
| projects-door | 2 | 2.5 | 3.5 | 3.5 | 3 | 3 | 2.92 | `review/runs/2026-10-17-g2/projects-door-pixel7.png` |
| volunteer-door | 2 | 2.5 | 3 | 3.5 | 3 | 3 | 2.83 | `review/runs/2026-10-17-g2/volunteer-door-pixel7.png` |
| safe-sip | 2.5 | 3 | 4 | 3 | 3.5 | 3.5 | 3.25 | `review/runs/2026-10-17-g2/safe-sip-pixel7.png` |
| desk | 3 | 1 | 4.5 | 2 | 3.5 | 1.5 | 2.58 | `review/runs/2026-10-17-g2/desk-pixel7.png` |
| **Dimension avg** | 2.58 | 2.42 | 3.92 | 3.17 | 3.42 | 2.92 | **3.07** | |

## Averages

| Stop | Desktop | Pixel 7 | Both |
|---|---|---|---|
| lobby | 3.75 | 3.08 | 3.42 |
| verafin | 3.67 | 3.75 | 3.71 |
| projects-door | 3.33 | 2.92 | 3.13 |
| volunteer-door | 3.42 | 2.83 | 3.13 |
| safe-sip | 3.42 | 3.25 | 3.33 |
| desk | 4.00 | 2.58 | 3.29 |

| Dimension | Desktop | Pixel 7 | Both |
|---|---|---|---|
| D1 Gallery mood | 3.42 | 2.58 | 3.00 |
| D2 Composition | 3.42 | 2.42 | 2.92 |
| D3 Legibility | 4.00 | 3.92 | 3.96 |
| D4 Story clarity | 3.58 | 3.17 | 3.38 |
| D5 Craft consistency | 3.67 | 3.42 | 3.54 |
| D6 Object read | 3.50 | 2.92 | 3.21 |

**Overall: 3.33** (desktop 3.60, Pixel 7 3.07), against the G2 bar of 3.5.

## One-line reasons

Every cell's reason is in `scores.json`; the ones that drive the averages:

- desk, Pixel 7, D2 = 1: the desk is entirely hidden behind the card (F-020). D4 = 2 and D6 = 1.5 follow from it.
- projects-door and volunteer-door, Pixel 7, D1 = 2: the wing floor is a flat bright warm-grey plane over 35 to 40% of the frame (F-023).
- projects-door and volunteer-door, Pixel 7, D2 = 2.5: the PDF and Classic buttons cover the wing titles (F-022).
- lobby, Pixel 7, D2 = 2.5 and D6 = 2.5: the arch and first case sit behind the hero, and the 3D title ghosts behind the h1 (F-032).
- verafin, desktop, D1 = 3: black-void plinth, washed right wall, no next pool ahead (F-024, F-025).
- safe-sip, desktop, D4 = 3 and D6 = 3: the cup reads as a white can; lid, board and gimbal are lost at stop distance (F-029).
- desk, desktop, all at least 3.5: the calmest, most finished stop of the slice.

## Dialogs (reviewed for D2 and D3, not averaged)

| Shot | Note |
|---|---|
| `review/runs/2026-10-17-g2/verafin-dialog-desktop.png` | Typography and hierarchy are strong (H2, dek, role block, chips, bullets, curator's note). The rail tooltip, year labels and the Classic view button show through the panel (F-021); the case lands under the dimmed stop card (F-028). |
| `review/runs/2026-10-17-g2/safe-sip-dialog-desktop.png` | The wing chip, Return to the aisle and the rail tooltip are drawn crisp over the dek and the role block (F-021, the worst case); the case is cut by the panel edge (F-028). |
| `review/runs/2026-10-17-g2/verafin-dialog-pixel7.png` | Solid full-height sheet, clean header and footer, comfortable measure. Reads at a glance: D3 at the 5 anchor. |
| `review/runs/2026-10-17-g2/safe-sip-dialog-pixel7.png` | Same quality; the truncated "The Round Table, Software..." in the footer is acceptable. |

## Recruiter fast path (Pixel 7 lobby, by eye)

`review/runs/2026-10-17-g2/lobby-pixel7.png`, 412 x 839, JS on after `ready`:

- Name "Chukwuemeka (Emeka) Nduka-Nwagbo": visible (two lines). Pass.
- Role "Software Development Co-op, Nasdaq Verafin": visible. Pass.
- Degree "B.Eng Computer Engineering, MUN, expected May 2027": visible (wraps, "2027" on its own line). Pass.
- Three links Resume (PDF), Email, Classic view: all visible in the top 45% of the viewport, plus the HUD's PDF and Classic. Pass.
- Risks: the 3D COMMIT HISTORY label sits behind the h1 and shows through the scrim, so the name reads over a busy backdrop (F-032); the degree line wraps at 412 px and may push the links lower at 360 x 640 (not captured here; the e2e fast-path spec covers 360 x 640 and 390 x 844). The intro heading shows above the fold while its paragraph falls below it, which the F-008 ruling accepts.

## Copy check

No invented facts found. The Verafin card, dialog and curator's note match `docs/CONTENT_DRAFT.md` and the G0-approved bullets, and keep the copy guard: the domain appears only as what the software supports ("software that supports fraud detection and anti-money laundering"); no detection imagery in 3D. Placeholders seen ("[placeholder: target roles]" on the desk card) are expected and not scored.

## Top 5 strengths

1. **The DOM layer is already at the 5 anchor on phones and near it on desktop** (D3 3.96): cards, chips, the ON VIEW NOW pill and the story sheet read at a glance (`verafin-pixel7.png`, `verafin-dialog-pixel7.png`).
2. **Exhibit framing hits its points**: verafin and safe-sip sit at 61% of the width on desktop and at 50% / 35% on Pixel 7, within 3% of the 62% and 36% targets, always clear of the card (`verafin-desktop.png`, `safe-sip-pixel7.png`).
3. **The front desk is the mood target for the whole aisle**: one warm pool, walnut desk, "You've reached the beginning." crisp above it (`desk-desktop.png`, desktop average 4.00).
4. **The Reporting Engine reads honestly**: column feeding a stepped block of bars, three brass cartridges, one teal core, no detection imagery; it is the slice's best object on both viewports (`verafin-desktop.png`, `verafin-pixel7.png`).
5. **A consistent material vocabulary**: brass trims on the arch, doors, cases and desk, walnut trays, bone ceramic and frosted glass read as one hand across stops (D5 3.54, nothing floats).

## Top 5 problems

1. **F-020 (P1)**: on phones the front desk is completely hidden behind the card (`desk-pixel7.png`, CI `stop-desk-pixel7.png`).
2. **F-021 (P1)**: on desktop the HUD, rail and wing controls show crisp through the story panel and collide with its text (`safe-sip-dialog-desktop.png`).
3. **F-023 (P1)**: tier medium (every phone) renders the wing floors as a flat bright plane, which turns the dark gallery into a lit box (`projects-door-pixel7.png`, `volunteer-door-pixel7.png`).
4. **F-022 (P1)**: 3D wall and door titles are cut by the viewport and covered by HUD buttons on both viewports (`projects-door-pixel7.png`, `verafin-desktop.png`).
5. **Lighting polish (F-024, F-025, F-026)**: plinths read as black voids, beam cones as opaque grey shafts, and the aisle walls show streak noise at grazing angles; together they hold D1 at 3.00.

## Findings summary

| Id | Sev | Stop | Viewport | Path |
|---|---|---|---|---|
| F-020 | P1 | desk | pixel7 | `src/museum/rail/framing.ts` |
| F-021 | P1 | verafin, safe-sip dialogs | desktop | `src/overlay/ExhibitDialog.module.css` |
| F-022 | P1 | verafin, mysa, doors, safe-sip | both | `src/museum/environment/labels3d.ts` |
| F-023 | P1 | doors, safe-sip | pixel7 | `src/museum/environment/Floor.tsx` |
| F-024 | P2 | verafin, mysa, safe-sip | both | `src/museum/exhibits/_kit` |
| F-025 | P2 | desk, lobby, verafin | desktop | `src/museum/environment/Beams.tsx` |
| F-026 | P2 | projects-door, mysa, volunteer-door | desktop | `src/museum/environment/lightPools.ts` |
| F-027 | P2 | doors, safe-sip | both | `src/museum/environment/labels3d.ts` |
| F-028 | P2 | verafin, safe-sip dialogs | desktop | `src/museum/rail/framing.ts` |
| F-029 | P2 | safe-sip | both | `src/museum/exhibits/safe-sip` |
| F-030 | P2 | all | desktop | `src/app/global.css` |
| F-031 | P2 | lobby | desktop | `src/museum/environment/Lobby.tsx` |
| F-032 | P2 | lobby | pixel7 | `src/museum/environment/Lobby.tsx` |
| F-033 | P3 | titles | both | `src/museum/environment/labels3d.ts` |
| F-034 | P3 | year chip | pixel7 | `src/overlay/Hud.tsx` |

P0: 0. P1: 4. P2: 9. P3: 2. Full evidence, expected result and check per finding: `review/findings.json`.

## Proposed G2 reference stills

The run PNGs are gitignored; regenerate them with the WP-19 commands on `a8df9c7`, or open the committed CI counterpart where one is listed. Each still is proposed for what it gets right, not as a perfect frame; the open findings note what it still lacks.

| File | Viewport, tier | Approve it as the reference for | CI counterpart |
|---|---|---|---|
| `review/runs/2026-10-17-g2/lobby-desktop.png` | desktop, high | The arrival: hero in its scrim, brass arch, the first case glowing through it (minus the rail on the portrait, F-031). | `stop-lobby-desktop.png` |
| `review/runs/2026-10-17-g2/verafin-desktop.png` | desktop, high | The exhibit stop: case on the 62% point, paper card at left, teal core as the one cool note. | `stop-verafin-desktop.png` |
| `review/runs/2026-10-17-g2/verafin-pixel7.png` | Pixel 7, medium | The phone exhibit stop: case on the 36% point above a compact card. | `stop-verafin-pixel7.png` |
| `review/runs/2026-10-17-g2/desk-desktop.png` | desktop, high | The mood target: one warm pool, walnut, the end-wall line. | `stop-desk-desktop.png` |
| `review/runs/2026-10-17-g2/verafin-thumb.png` | desktop thumbnail | The D6 bar for every later exhibit: one object at 320 px grayscale. | none |
| `review/runs/2026-10-17-g2/verafin-dialog-pixel7.png` | Pixel 7, medium | The story sheet typography and spacing. | `dialog-verafin-pixel7.png` |

Not proposed: any door or wing shot on Pixel 7 (F-022, F-023), the phone desk (F-020), and any desktop dialog (F-021).

## Next round

Round 2 re-captures the same stops after the F-020 to F-023 fixes (and any P2s R0 schedules), compares against this scorecard and the approved stills, and re-scores. Expected movement if only the four P1s are fixed: Pixel 7 D1 and D2 rise most (doors and desk), which could lift the overall average past 3.5; the re-score decides.
