# Slice review, round 2 (gate G2)

- Date: 2026-10-20. Reviewer: R11 (WP-19, round 2 of at most 3 for M2). Protocol: `review/rubric.md`.
- Build: `aa62a6d` on `claude/intelligent-sagan-poq45q` (round 1 build plus F-G2a, F-G2b and F-035), `npm ci && npm run build` (budgets ok, check-copy ok), served by `scripts/serve-dist.ts` on port 4184. Port 4174 was already held by another worktree's server, so the brief's port would have reviewed a build that is not this one; the first capture made there was discarded. The Netlify preview is not reachable from this container.
- Capture: `tests/e2e/capture.spec.ts` (`@capture`, `CAPTURE_DIALOGS=1`, `?test=1&mode=museum`). Desktop 1440 x 900 at `tier=high` (7 passed); Pixel 7 412 x 839 at tier medium (7 passed). Stops: lobby, verafin, projects-door, mysa (context), volunteer-door, sdsj (context), desk. Raw scores and reasons: `scores.json`. Stats per shot: `<stop>-<project>.json` (all within the render budget: max 115 draw calls on desktop high against 150, max 51 on Pixel 7 medium against 80; verafin 2,732 triangles, in bounds).
- Extra probes (scratch Playwright script, same build, same SwiftShader flags): the desk and lobby at 360 x 640 portrait (Pixel 7 user agent, touch, DPR 1), and DOM rects of the rail and the stop cards at sdsj and klarup on desktop. Their PNGs are scratch, not in this folder; the numbers are quoted where used.
- Not used: `tests/e2e/__screenshots__` (being regenerated in CI). Previous round: `review/runs/2026-10-17-g2/scorecard.md`. Approved reference stills: none yet (ART_DIRECTION section 10 is still empty, Emeka has not approved round 1's proposal).
- Scope change: safe-sip was removed (F-035), so the scored set is 5 stops x 6 dimensions x 2 viewports = 60 cells. Round 1 recomputed on the same 5 stops gives **3.33** (desktop 3.63, Pixel 7 3.03), so the comparison below is like for like.

## Result against gate G2

| Gate input | Value | Bar | Pass |
|---|---|---|---|
| Overall average (60 cells) | **3.65** (round 1 same stops: 3.33) | at least 3.5 | yes |
| Open P0 | 0 | 0 | yes |
| Open P1 | **2** (F-020 at 360 x 640, new F-036) | 0 | no |
| Open P2 / P3 | 3 (F-027, F-032, F-037) / 1 (F-033) | (not gating) | |
| Emeka's approval of stills and preview | pending | required | pending |

**G2 is not met in round 2.** The average clears the bar (desktop 3.80, Pixel 7 3.50), and all four round 1 P1s are fixed at the viewports they were filed for, but two P1s are open:

1. **F-020 (P1, reopened scope, desk, 360 x 640 portrait).** At 412 x 839 the desk now sits above its card. At 360 x 640 the card top is at 178 px while `screenPos('desk')` is at y 259, so the desk is hidden again, and the end-wall line starts under the PDF button. Fix (R4 with R6): derive the portrait desk framing point from the measured card top instead of the constant `DESK_PORTRAIT_Y = 0.34` in `src/museum/rail/framing.ts`, or shorten the portrait desk card so its top sits at or below about half the height at 360 x 640, and keep the end-wall line clear of the HUD.
2. **F-036 (P1, new, sdsj, desktop 1440 x 900).** The rail tooltip "No. V1, The Round Table" is drawn over "SOFTWARE DEVELOPERS" (it covers "LOPERS"). Fix (R6, `src/overlay/ProgressRail.module.css`): hide the current-stop tooltip inside a wing, or anchor it so it cannot extend over the canvas centre, or start a one-item wing's rail below the title band.

Both are small, scoped fixes. Neither needs new art. Round 3 is the last round allowed for M2.

## Scores: desktop (tier high)

| Stop | D1 | D2 | D3 | D4 | D5 | D6 | Avg | Round 1 | Shot |
|---|---|---|---|---|---|---|---|---|---|
| lobby | 3.5 | 4 | 4.5 | 4 | 4 | 3.5 | 3.92 | 3.75 | `review/runs/2026-10-20-g2r2/lobby-desktop.png` (D6: `lobby-thumb.png`) |
| verafin | 3.5 | 4 | 4 | 4 | 4 | 3.5 | 3.83 | 3.67 | `review/runs/2026-10-20-g2r2/verafin-desktop.png` (D6: `verafin-thumb.png`) |
| projects-door | 3.5 | 3.5 | 3.5 | 3.5 | 4 | 4 | 3.67 | 3.33 | `review/runs/2026-10-20-g2r2/projects-door-desktop.png` (D6: `projects-door-thumb.png`) |
| volunteer-door | 3.5 | 3 | 3.5 | 3.5 | 3.5 | 3.5 | 3.42 | 3.42 | `review/runs/2026-10-20-g2r2/volunteer-door-desktop.png` (D6: `volunteer-door-thumb.png`) |
| desk | 4.5 | 4.5 | 4.5 | 3.5 | 4 | 4 | 4.17 | 4.00 | `review/runs/2026-10-20-g2r2/desk-desktop.png` (D6: `desk-thumb.png`) |
| **Dimension avg** | 3.70 | 3.80 | 4.00 | 3.70 | 3.90 | 3.70 | **3.80** | 3.63 | |

## Scores: Pixel 7 (tier medium)

| Stop | D1 | D2 | D3 | D4 | D5 | D6 | Avg | Round 1 | Shot |
|---|---|---|---|---|---|---|---|---|---|
| lobby | 3 | 3 | 4.5 | 3 | 3.5 | 2.5 | 3.25 | 3.08 | `review/runs/2026-10-20-g2r2/lobby-pixel7.png` |
| verafin | 3.5 | 4 | 4.5 | 4 | 4 | 4 | 4.00 | 3.75 | `review/runs/2026-10-20-g2r2/verafin-pixel7.png` |
| projects-door | 3.5 | 3.5 | 4 | 3.5 | 3.5 | 3.5 | 3.58 | 2.92 | `review/runs/2026-10-20-g2r2/projects-door-pixel7.png` |
| volunteer-door | 3 | 3 | 3.5 | 3 | 3.5 | 3.5 | 3.25 | 2.83 | `review/runs/2026-10-20-g2r2/volunteer-door-pixel7.png` |
| desk | 3.5 | 3 | 4.5 | 3 | 3.5 | 3 | 3.42 | 2.58 | `review/runs/2026-10-20-g2r2/desk-pixel7.png` |
| **Dimension avg** | 3.30 | 3.30 | 4.20 | 3.30 | 3.60 | 3.30 | **3.50** | 3.03 | |

## Averages

| Stop | Desktop | Pixel 7 | Both | Round 1 both |
|---|---|---|---|---|
| lobby | 3.92 | 3.25 | 3.58 | 3.42 |
| verafin | 3.83 | 4.00 | 3.92 | 3.71 |
| projects-door | 3.67 | 3.58 | 3.63 | 3.13 |
| volunteer-door | 3.42 | 3.25 | 3.33 | 3.13 |
| desk | 4.17 | 3.42 | 3.79 | 3.29 |

| Dimension | Desktop | Pixel 7 | Both |
|---|---|---|---|
| D1 Gallery mood | 3.70 | 3.30 | 3.50 |
| D2 Composition | 3.80 | 3.30 | 3.55 |
| D3 Legibility | 4.00 | 4.20 | 4.10 |
| D4 Story clarity | 3.70 | 3.30 | 3.50 |
| D5 Craft consistency | 3.90 | 3.60 | 3.75 |
| D6 Object read | 3.70 | 3.30 | 3.50 |

**Overall: 3.65** (219 / 60; desktop 3.80, Pixel 7 3.50), against the G2 bar of 3.5. The loop's stop bar (2 rounds with no new P0 or P1 and averages of at least 4.0) is not in reach yet.

## What moved, and why

- **desk, Pixel 7: 2.58 to 3.42**, the largest gain. F-020 frames the desk top and all four objects above the card (D2 1 to 3, D4 2 to 3, D6 1.5 to 3). It is still a thin sliver over the card's top edge with an empty dark band above it, so nothing reaches 4.
- **projects-door and volunteer-door, Pixel 7: +0.67 and +0.42.** F-023 brings the medium floor down to the high floor's value (floor mean 6.0 and 6.1 against 5.8 and 5.7 on desktop high), so the wings are dark rooms again (D1 2 to 3.5 and 2 to 3). F-022 puts the room names on the transoms, whole and clear of the HUD. The volunteer door gains less because, after F-035, its only case hides behind the jamb (F-037).
- **desk, desktop: 4.00 to 4.17.** F-025 turns the beam into a faint shaft, darker than the pool (19.2 against 33.3); D1 and D2 rise to 4.5.
- **verafin, both: +0.16 and +0.25.** F-024 grounds the plinth (front 18.8 against floor 8.8) and F-022 brings the wall title into frame. D1 stays at 3.5 because no next pool reads ahead and the left half of the frame is a dead void.
- **lobby: small gains.** F-031 clears the portrait from the rail (desktop D2 to 4). F-032 removes the ghost label from behind the phone h1 (D3 to 4.5), but the arch and first case still sit behind the hero buttons, so Pixel 7 D6 stays at 2.5.
- **No regression**, except volunteer-door desktop D2, which holds at 3 for a new reason: the title is fixed, but the lone sdsj case is cut by the jamb and covered by the rail tooltip.

## Dialogs (reviewed for D2 and D3, not averaged)

| Shot | Note |
|---|---|
| `review/runs/2026-10-20-g2r2/verafin-dialog-desktop.png` | F-021 and F-028 fixed: a calm panel with no HUD or rail text behind it; the case is whole, left of the panel, and the stop card is hidden. Typography at the 5 anchor. |
| `review/runs/2026-10-20-g2r2/sdsj-dialog-desktop.png` | Clean panel. The case top covers the wall title's second line "OF ST. JOHN'S" (noted under F-027). |
| `review/runs/2026-10-20-g2r2/verafin-dialog-pixel7.png` | Unchanged and strong: full-height sheet, clear header, comfortable measure. |
| `review/runs/2026-10-20-g2r2/sdsj-dialog-pixel7.png`, `mysa-dialog-*.png` | Context only; nothing new. |

## Recruiter fast path (by eye)

`review/runs/2026-10-20-g2r2/lobby-pixel7.png` (412 x 839, JS on after `ready`): the name (two lines), "Software Development Co-op, Nasdaq Verafin", "B.Eng Computer Engineering, MUN, expected May 2027" (with "2027" wrapped) and Resume (PDF), Email and Classic view are all in the top 45%. **Pass.** At 360 x 640 (scratch probe), all six items fit above "Begin the walk"; the role wraps after "Nasdaq" and the degree after "expected". **Pass.** Risks: on the phone the brass top edge of the arch runs faintly behind the second h1 line, and the portrait is cut by the right viewport edge at both sizes (F-032).

## Checks R0 asked for

- **360 x 640 phone desk (F-G2b's open question): fails.** The desk card is 446 px tall on both phones. At 360 x 640 its top is at 178 px; `screenPos('desk')` gives (176, 259), 81 px below the card's top edge, so the desk is fully hidden as in round 1. The end-wall line starts about 2 px under the PDF button's bottom edge (52 px). F-020 stays open as P1 for this viewport, with the fix named above.
- **sdsj wing title against the rail's No. V1 label on desktop: they overlap.** The tooltip rect is x 958 to 1128, y 209 to 238; the title's first line runs about x 650 to 1115, y 220 to 250. "LOPERS" sits under the tooltip, a whole word rather than the "few pixels" F-035 reported. Filed as **F-036 (P1)**. klarup does not collide (`P1 KLARUP` is short and its tooltip at x 1068 to 1196 clears it). On Pixel 7, V1 clears "Return to the aisle" by about 2 CSS px.

## Copy check

No invented facts. The Verafin card, dialog and curator's note are unchanged from round 1 and keep the copy guard. The sdsj card and story match the resume entry (President, Jul 2024 to Present, mini-hackathons). "[placeholder: target roles]" on the desk card and "Installation in progress" on the placeholder crates are expected and not scored. No Safe Sip or Enactus text appears at any captured stop.

## Top 5 strengths

1. **Tier medium now keeps the room's character** (F-023): the Pixel 7 wings are dark rooms with pools, not lit boxes (`projects-door-pixel7.png`, floor mean 6.0 against 5.8 at high).
2. **The desktop story dialog is clean** (F-021, F-028): a calm panel and a whole case beside it (`verafin-dialog-desktop.png`).
3. **The front desk is the mood target on both viewports**: one warm pool, walnut, the end-wall line, and now a beam that only suggests light (`desk-desktop.png` 4.17; on Pixel 7 the desk is finally in frame).
4. **Titles sit in frame and clear of the HUD at every scored stop**: the transom room names read like real gallery lettering (`volunteer-door-desktop.png`, `projects-door-pixel7.png`).
5. **The Reporting Engine stays the slice's best object**: grounded plinth, honest reporting imagery, 4.00 on Pixel 7 (`verafin-pixel7.png`).

## Top 5 problems

1. **F-020 (P1)**: at 360 x 640 the desk is hidden behind its card again, and the end-wall line touches the PDF button (scratch probe; DESK_PORTRAIT_Y is a constant tuned for 412 x 839).
2. **F-036 (P1)**: on desktop at sdsj, the rail tooltip is drawn over the 3D wall title (`sdsj-desktop.png`).
3. **F-037 (P2)**: the volunteer door frames an empty room; the wing's only case hides behind the right jamb on both viewports (`volunteer-door-desktop.png`, `volunteer-door-pixel7.png`).
4. **Phone lobby and dead space (F-032, D1)**: the stage still hides behind the hero on phones (Pixel 7 lobby D6 2.5), and the aisle shows no next pool ahead at verafin. The left side walls read as featureless voids (D1 3.30 on Pixel 7).
5. **Beams and titles (F-027, F-033)**: a light shaft still crosses V1 / SOFTWARE DEVELOPERS and the P2 title, and brass titles in the wash read as near-black letters.

## Findings summary (round 2 status)

| Id | Sev | Stop | Viewport | Status | Round 2 evidence |
|---|---|---|---|---|---|
| F-020 | P1 | desk | pixel7 / 360 x 640 | **open** | fixed at 412 x 839; hidden again at 360 x 640 |
| F-021 | P1 | dialogs | desktop | fixed | `verafin-dialog-desktop.png`, `sdsj-dialog-desktop.png` |
| F-022 | P1 | titles | both | fixed | every scored stop's title whole and clear of the HUD |
| F-023 | P1 | wings | pixel7 | fixed | floor 6.0 / 6.1 against 5.8 / 5.7 |
| F-024 | P2 | plinths | both | fixed | plinth 18.8 against floor 8.8 |
| F-025 | P2 | beams | desktop | fixed | desk shaft 19.2 against pool 33.3 |
| F-026 | P2 | walls | desktop | fixed | flat at 4x |
| F-027 | P2 | wing titles | both | open | centred on the wash, but the beam still crosses the titles |
| F-028 | P2 | dialogs | desktop | fixed | case whole, left of the panel |
| F-029 | P2 | safe-sip | both | withdrawn | exhibit removed (F-035) |
| F-030 | P2 | all | desktop | fixed | `global.css` lines 23 and 24 |
| F-031 | P2 | lobby | desktop | fixed | portrait ends near x 1297, rail from about 1336 |
| F-032 | P2 | lobby | pixel7 | open | label cleared; the arch is still behind the hero |
| F-033 | P3 | titles | both | open | not attempted |
| F-034 | P3 | year chip | pixel7 | fixed | 2025, 2025, FRONT DESK |
| **F-036** | **P1** | sdsj | desktop | new, open | the tooltip covers "LOPERS" |
| **F-037** | P2 | volunteer-door | both | new, open | the lone case is behind the jamb |

P0: 0. Open P1: 2 (F-020, F-036). Open P2: 3. Open P3: 1. New this round: 1 P1 and 1 P2. Full evidence, expected results and checks: `review/findings.json` (field `round2` on each round 1 finding).

## Proposed G2 reference stills

Round 2 updates round 1's proposal (file names in this folder; the PNGs are gitignored, so regenerate them with the WP-19 commands on `aa62a6d`). One line each, for Emeka's approval.

| File | Viewport, tier | Approve it as the reference for |
|---|---|---|
| `review/runs/2026-10-20-g2r2/lobby-desktop.png` | desktop, high | The arrival: the hero in its scrim, the brass arch with the first case glowing through it, and the portrait clear of the rail. |
| `review/runs/2026-10-20-g2r2/verafin-desktop.png` | desktop, high | The exhibit stop: the case on the 62% point over a grounded plinth, the wall title above, the paper card at left. |
| `review/runs/2026-10-20-g2r2/verafin-pixel7.png` | Pixel 7, medium | The phone exhibit stop: the case on the 36% point, the title above it, a compact card below. |
| `review/runs/2026-10-20-g2r2/desk-desktop.png` | desktop, high | The mood target: one warm pool, walnut, the end-wall line, a faint beam. |
| `review/runs/2026-10-20-g2r2/projects-door-pixel7.png` | Pixel 7, medium | The tier medium floor value and a door stop on the phone: a dark room, one pool, the room name on the transom. |
| `review/runs/2026-10-20-g2r2/verafin-dialog-desktop.png` | desktop, high | The desktop story panel: calm, with the case whole beside it. |
| `review/runs/2026-10-20-g2r2/verafin-thumb.png` | desktop thumbnail | The D6 bar for every later exhibit. |

Round 1's `verafin-dialog-pixel7.png` stands as proposed. Not proposed: the volunteer door (F-037), the Pixel 7 desk (still a sliver, and F-020 is open at 360 x 640), and the Pixel 7 lobby (F-032).

## Next round

Round 3 is the last for M2. It re-captures the same five stops plus the desk at 360 x 640 and sdsj, klarup and finance-tracker on desktop (for F-036), after fixes to F-020 (R4 with R6) and F-036 (R6), and ideally F-037. If both P1s close without regressions, G2 rests on the 3.65 average already reached and on Emeka's approval of the stills and the preview.
