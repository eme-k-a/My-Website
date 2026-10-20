# Slice review, round 3 (gate G2)

- Date: 2026-10-20. Reviewer: R11 (WP-19, round 3 of 3 for M2, the last). Protocol: `review/rubric.md`.
- Build: `cd1d563` on `claude/intelligent-sagan-poq45q` (round 2 build plus F-G2r2: `dd5d489` F-020, `401e010` F-036, `f26fae7` F-037), `npm ci && npm run build` (budgets ok, check-copy ok), served by `scripts/serve-dist.ts` on port 4174. Before capturing, 4174 was checked free and the server was checked to serve this build's entry chunk (`main-CdQY8HBH.js`). The Netlify preview is not reachable from this container.
- Capture: `tests/e2e/capture.spec.ts` (`@capture`, `CAPTURE_DIALOGS=1`, `?test=1&mode=museum`). Desktop 1440 x 900 at `tier=high`: lobby, verafin, projects-door, klarup, finance-tracker, mysa, volunteer-door, sdsj, desk (9 passed). Pixel 7 412 x 839 at tier medium: lobby, verafin, projects-door, mysa, volunteer-door, sdsj, desk (7 passed). Raw scores and reasons: `scores.json`. Stats per shot: `<stop>-<project>.json`, all within the render budget (max 115 draw calls on desktop high against 150, max 52 on Pixel 7 medium against 80; verafin 2,732 triangles, in bounds; texture 12.2 MB at most).
- Extra probes (scratch Playwright script, same build, same SwiftShader flags; PNGs gitignored in this folder, numbers in `probe-rects.json`): the desk and lobby at 360 x 640 portrait (Pixel 7 user agent, touch, DPR 1) and 412 x 839; DOM rects of the rail at klarup, finance-tracker, sdsj and both doors on desktop; each door reached back from inside its wing (`probe-*-door-in-wing-*.png`). `tests/e2e/rail-input.spec.ts` (g) was also run on desktop against this build: 1 passed.
- Not used: `tests/e2e/__screenshots__` (being regenerated in CI). Previous round: `review/runs/2026-10-20-g2r2/scorecard.md`. Approved reference stills: none yet.
- Scored set: 5 stops x 6 dimensions x 2 viewports = 60 cells, the same as round 2. Every cell was re-scored from this round's shots; nothing was carried forward. mysa, sdsj, klarup and finance-tracker are context only (placeholder crates).
- Averages are truncated to two decimals, never rounded up (`review/rubric.md`). Round 2's printed per-stop values were rounded to nearest (for example lobby desktop 23.5 / 6 printed 3.92); this scorecard truncates both rounds, so some round 2 values below read 0.01 lower than in its own scorecard. Round 2's overall 3.65 is exact.

## Result against gate G2

| Gate input | Value | Bar | Pass |
|---|---|---|---|
| Overall average (60 cells) | **3.74** (round 2: 3.65) | at least 3.5 | yes |
| Open P0 | 0 | 0 | yes |
| Open P1 | **1** (new F-038) | 0 | **no** |
| Open P2 / P3 | 2 (F-027, F-032) / 1 (F-033) | (not gating) | |
| Emeka's approval of stills and preview | pending | required | pending |

**G2's review conditions do not hold in round 3.** The average clears the bar with more margin (desktop 3.83, Pixel 7 3.65), and all three round 2 targets are fixed at every viewport they were filed for: F-020 (desk at 360 x 640 and 412 x 839), F-036 (sdsj rail label) and F-037 (volunteer door). But this round checked one state earlier rounds never captured, and it fails:

- **F-038 (P1, new): a door stop reached inside its wing shows the wing HUD over the transom title.** A visitor who steps into a wing and then scrolls or swipes back up once lands on the door section, which stays on the wing track (EXPERIENCE section 3.4 step 2). The camera returns to the normal door pose, but the HUD keeps the wing head. On Pixel 7 the "Return to the aisle" button (x 16 to 189, y 96 to 140) sits on top of VOLUNTEER (`probe-volunteer-door-in-wing-pixel7.png`) and on PRO of PROJECTS (`probe-projects-door-in-wing-pixel7.png`): text drawn over text, a label covered by the HUD, the rubric's P1 examples. On desktop only the lower half of the last P of LEADERSHIP is under the wing chip (`probe-volunteer-door-in-wing-desktop.png`); the projects door is clear. The projects door, which F-G2r2 did not touch, shows the same thing, so this is older than F-G2r2, not a regression from it. Fix (R6, with R4): hide or lower the wing head while the current stop is the door on the wing track, or show the main-track HUD there. Check: extend rail-input (g) to the door on the wing track.

Round 3 is the last review round PLAN section 6 allows for M2. R0 has three options: (a) a scoped F-038 fix, re-verified only by its check (the two probe shots and an e2e assertion), without a new scored round, since no scored cell depends on it; (b) take G2 to Emeka with F-038 open as a known P1 and his taste call; or (c) hold G2. On this evidence, G2 is met only after F-038 closes and Emeka approves.

## Scores: desktop (tier high)

| Stop | D1 | D2 | D3 | D4 | D5 | D6 | Avg | Round 2 | Shot |
|---|---|---|---|---|---|---|---|---|---|
| lobby | 3.5 | 4 | 4.5 | 4 | 4 | 3.5 | 3.91 | 3.91 | `review/runs/2026-10-20-g2r3/lobby-desktop.png` (D6: `lobby-thumb.png`) |
| verafin | 3.5 | 4 | 4 | 4 | 4 | 3.5 | 3.83 | 3.83 | `review/runs/2026-10-20-g2r3/verafin-desktop.png` (D6: `verafin-thumb.png`) |
| projects-door | 3.5 | 3.5 | 3.5 | 3.5 | 4 | 4 | 3.66 | 3.66 | `review/runs/2026-10-20-g2r3/projects-door-desktop.png` (D6: `projects-door-thumb.png`) |
| volunteer-door | 3.5 | 3.5 | 3.5 | 3.5 | 3.5 | 4 | 3.58 | 3.41 | `review/runs/2026-10-20-g2r3/volunteer-door-desktop.png` (D6: `volunteer-door-thumb.png`) |
| desk | 4.5 | 4.5 | 4.5 | 3.5 | 4 | 4 | 4.16 | 4.16 | `review/runs/2026-10-20-g2r3/desk-desktop.png` (D6: `desk-thumb.png`) |
| **Dimension avg** | 3.70 | 3.90 | 4.00 | 3.70 | 3.90 | 3.80 | **3.83** | 3.80 | |

## Scores: Pixel 7 (tier medium)

| Stop | D1 | D2 | D3 | D4 | D5 | D6 | Avg | Round 2 | Shot |
|---|---|---|---|---|---|---|---|---|---|
| lobby | 3 | 3 | 4.5 | 3 | 3.5 | 2.5 | 3.25 | 3.25 | `review/runs/2026-10-20-g2r3/lobby-pixel7.png` |
| verafin | 3.5 | 4 | 4.5 | 4 | 4 | 4 | 4.00 | 4.00 | `review/runs/2026-10-20-g2r3/verafin-pixel7.png` |
| projects-door | 3.5 | 3.5 | 4 | 3.5 | 3.5 | 3.5 | 3.58 | 3.58 | `review/runs/2026-10-20-g2r3/projects-door-pixel7.png` |
| volunteer-door | 3.5 | 3.5 | 3.5 | 3.5 | 3.5 | 3.5 | 3.50 | 3.25 | `review/runs/2026-10-20-g2r3/volunteer-door-pixel7.png` |
| desk | 4 | 4 | 4.5 | 3.5 | 4 | 3.5 | 3.91 | 3.41 | `review/runs/2026-10-20-g2r3/desk-pixel7.png` |
| **Dimension avg** | 3.50 | 3.60 | 4.20 | 3.50 | 3.70 | 3.40 | **3.65** | 3.50 | |

## Averages

| Stop | Desktop | Pixel 7 | Both | Round 2 both |
|---|---|---|---|---|
| lobby | 3.91 | 3.25 | 3.58 | 3.58 |
| verafin | 3.83 | 4.00 | 3.91 | 3.91 |
| projects-door | 3.66 | 3.58 | 3.62 | 3.62 |
| volunteer-door | 3.58 | 3.50 | 3.54 | 3.33 |
| desk | 4.16 | 3.91 | 4.04 | 3.79 |

| Dimension | Desktop | Pixel 7 | Both | Round 2 both |
|---|---|---|---|---|
| D1 Gallery mood | 3.70 | 3.50 | 3.60 | 3.50 |
| D2 Composition | 3.90 | 3.60 | 3.75 | 3.55 |
| D3 Legibility | 4.00 | 4.20 | 4.10 | 4.10 |
| D4 Story clarity | 3.70 | 3.50 | 3.60 | 3.50 |
| D5 Craft consistency | 3.90 | 3.70 | 3.80 | 3.75 |
| D6 Object read | 3.80 | 3.40 | 3.60 | 3.50 |

**Overall: 3.74** (224.5 / 60; desktop 3.83, Pixel 7 3.65), against the G2 bar of 3.5. The improvement loop's stop bar (two rounds with no new P0 or P1 and averages of at least 4.0) is not reached; M2 ends on the round cap, not the stop rule.

## What moved, and why

- **desk, Pixel 7: 3.41 to 3.91**, the largest gain. F-020 now frames from the measured card top: the end-wall line sits high, the shaft falls onto the walnut desk, and the whole desk top with its four objects is above a shorter card (desk point y 428, card top 531; round 2 card top 377). D1, D2 and D5 rise to 4 and D4 and D6 to 3.5. The four objects are still too small to name on a phone, so D4 stays under 4.
- **volunteer-door: +0.17 desktop, +0.25 Pixel 7.** F-037 moves the lone case to the far plinth spot, so the case, its pool and the V1 title sit inside the doorway on both viewports (D2 3 to 3.5, D6 desktop 3.5 to 4, D1 Pixel 7 3 to 3.5). The desktop frame still crops a neighbouring aisle case at the left edge, which holds D1 and D5 at 3.5.
- **sdsj, klarup and finance-tracker (context): F-036 holds.** Every wing wall title reads whole on desktop and no rail text overlaps it (`sdsj-desktop.png`, `klarup-desktop.png`, `finance-tracker-desktop.png`; rail-input (g) passes).
- **Unchanged and re-scored to the same value:** lobby, verafin and projects-door on both viewports, and the desktop desk. No fix touched them, and nothing in the shots differs from round 2's descriptions.
- **No regression in any scored cell.**

## Dialogs (reviewed for D2 and D3, not averaged)

| Shot | Note |
|---|---|
| `review/runs/2026-10-20-g2r3/verafin-dialog-desktop.png` | Holds the round 2 result: a calm panel, no HUD or rail text behind it, the case whole at left. Typography at the 5 anchor. |
| `review/runs/2026-10-20-g2r3/verafin-dialog-pixel7.png` | Full-height sheet, clear header, comfortable measure, Older link pinned at the bottom. |
| `review/runs/2026-10-20-g2r3/sdsj-dialog-*.png`, `mysa-dialog-*.png` | Context only; nothing new. |

## Recruiter fast path (by eye)

`review/runs/2026-10-20-g2r3/lobby-pixel7.png` (412 x 839): the name (two lines), "Software Development Co-op, Nasdaq Verafin", "B.Eng Computer Engineering, MUN, expected May 2027" and Resume (PDF), Email and Classic view all end above y 371 of 839 (Resume (PDF) and Email bottom 318, Classic view bottom 370, in `probe-rects.json`). **Pass.** At 360 x 640 (`probe-lobby-360x640.png`): all six items above y 393, Begin the walk at 481. **Pass.** Risks unchanged (F-032): the arch runs faintly behind the hero, and at 360 x 640 the portrait is cut by the right edge behind "expected".

## Checks R0 asked for

- **F-020, desk at 360 x 640: fixed.** Card top 311 (round 2: 178), `screenPos('desk')` (176, 285), 26 px above the card top; HUD bottom 60 and the end-wall line from about y 75, clear of the PDF button (bottom 52). The desk top and all four objects read whole (`probe-desk-360x640.png`); the desk front is under the card. At 412 x 839 the desk point is y 428 against card top 531.
- **F-036, sdsj on desktop: fixed.** At rest the current-stop label is clipped (`clip-path: inset(50%)`); the wing chip (x 1132 to 1413, y 136 to 160) and Return to the aisle (x 1200 to 1413, y 168 to 212) sit above and right of SOFTWARE DEVELOPERS (ends near x 1115). klarup and finance-tracker are clear. On Pixel 7 the V1 numeral still clears the Return to the aisle button by only about 2 CSS px (`sdsj-pixel7.png`), as in round 2.
- **F-037: fixed** (see What moved).
- **Wing exit (spot check):** Step inside then Return to the aisle lands on the door on the main track on both viewports. When the test hook's `goTo` enters a wing straight from the lobby, Return goes back to the lobby, because the saved main scroll position is the lobby's. Only the test hook takes that path, so no finding was filed.

## Copy check

No invented facts. The Verafin card, dialog and curator's note are unchanged and keep the copy guard: the domain appears only as what the software supports, and the object shows reporting. "[placeholder: target roles]" on the desk card and "Installation in progress" on the placeholder crates are expected and not scored. No phone number appears in any shot.

## Top 5 strengths

1. **The phone desk is now a real closing scene** (`desk-pixel7.png`, 3.91; round 1: 2.58): the end-wall line, the shaft and the walnut desk read in one frame above a compact card, at 412 x 839 and at 360 x 640.
2. **The Reporting Engine stays the slice's best object** (`verafin-pixel7.png` 4.00, `verafin-thumb.png`): grounded plinth, honest reporting imagery, one clear silhouette.
3. **The desk on desktop is the mood target** (`desk-desktop.png` 4.16): one warm pool, walnut, a faint shaft, gallery lettering.
4. **Wing stops are clean on desktop**: titles whole, no rail text over them, the case on the framing point (`sdsj-desktop.png`, `klarup-desktop.png`, `finance-tracker-desktop.png`).
5. **Both doors now invite**: each frames a lit case inside the room (`volunteer-door-desktop.png`, `projects-door-pixel7.png`), and the tier medium floor keeps the rooms dark on the phone.

## Top 5 problems

1. **F-038 (P1)**: the wing HUD covers the door transom when a visitor scrolls back to the door from inside a wing (`probe-volunteer-door-in-wing-pixel7.png`, `probe-projects-door-in-wing-pixel7.png`).
2. **Phone lobby (F-032, P2)**: the stage hides behind the hero and the lower 40% is empty floor (Pixel 7 lobby 3.25, D6 2.5, the lowest cell in the grid).
3. **Beams and titles (F-027 P2, F-033 P3)**: the shaft still crosses the P2 and V1 titles, case tops meet the last title line, and brass titles in the wash read as dark letters (`finance-tracker-desktop.png`).
4. **Dead space at the aisle stops (D1)**: the left half of the verafin frame is a featureless void and no next pool reads ahead (`verafin-desktop.png`); the volunteer door crops a neighbouring case at the left edge (`volunteer-door-desktop.png`).
5. **Small objects (D4)**: the desk's four objects cannot be told apart without the card on either viewport (`desk-desktop.png`, `desk-pixel7.png`).

## Findings summary (round 3 status)

| Id | Sev | Stop | Viewport | Status | Round 3 evidence |
|---|---|---|---|---|---|
| F-020 | P1 | desk | pixel7 and 360 x 640 | **fixed** | desk point above the card at both sizes; line clear of the HUD |
| F-021 | P1 | dialogs | desktop | fixed (r2) | holds: `verafin-dialog-desktop.png` |
| F-022 | P1 | titles | both | fixed (r2) | holds at every scored stop (main track) |
| F-023 | P1 | wings | pixel7 | fixed (r2) | holds: dark rooms at medium |
| F-024, F-025, F-026, F-028, F-030, F-031 | P2 | various | | fixed (r2) | no regression seen |
| F-027 | P2 | wing titles | both | open | beam still crosses P2 and V1 titles; backlog |
| F-029 | P2 | safe-sip | both | withdrawn | |
| F-032 | P2 | lobby | pixel7 | open | arch still behind the hero; backlog |
| F-033 | P3 | titles | both | open | not attempted; backlog |
| F-034 | P3 | year chip | pixel7 | fixed (r2) | |
| F-036 | P1 | sdsj | desktop | **fixed** | titles whole; rail-input (g) passes |
| F-037 | P2 | volunteer-door | both | **fixed** | case inside the doorway on both viewports |
| **F-038** | **P1** | doors on the wing track | pixel7 (desktop minor) | **new, open** | Return to the aisle drawn over VOLUNTEER and PROJECTS |

P0: 0. Open P1: 1 (F-038). Open P2: 2. Open P3: 1. New this round: 1 P1, no P2. Full evidence, expected results and checks: `review/findings.json` (field `round3` on each finding re-checked this round, and the new F-038).

## Proposed G2 reference stills

Ten stills, committed in `review/runs/2026-10-20-g2r3/stills/` (1.9 MB in total), for Emeka's approval. One line each. They replace round 2's proposal: same roles, re-shot on this build, plus the phone desk, the volunteer door and the phone story sheet, which now qualify.

| File | Viewport, tier | Approve it as the reference for |
|---|---|---|
| `review/runs/2026-10-20-g2r3/stills/lobby-desktop.png` | desktop, high | The arrival: hero in its scrim, the brass arch with the first case glowing through it, portrait clear of the rail. |
| `review/runs/2026-10-20-g2r3/stills/verafin-desktop.png` | desktop, high | The exhibit stop: the case on the 62% point over a grounded plinth, the wall title above, the paper card at left. |
| `review/runs/2026-10-20-g2r3/stills/verafin-pixel7.png` | Pixel 7, medium | The phone exhibit stop: the case on the 36% point, the title above it, a compact card below. |
| `review/runs/2026-10-20-g2r3/stills/verafin-thumb.png` | desktop thumbnail | The D6 bar for every later exhibit: one object in a 320 px grayscale thumbnail. |
| `review/runs/2026-10-20-g2r3/stills/verafin-dialog-desktop.png` | desktop, high | The desktop story panel: calm, with the case whole beside it. |
| `review/runs/2026-10-20-g2r3/stills/verafin-dialog-pixel7.png` | Pixel 7, medium | The phone story sheet: full height, clear header, comfortable measure. |
| `review/runs/2026-10-20-g2r3/stills/projects-door-pixel7.png` | Pixel 7, medium | The tier medium floor value and a door stop on the phone: a dark room, one pool, the room name on the transom. |
| `review/runs/2026-10-20-g2r3/stills/volunteer-door-desktop.png` | desktop, high | The desktop door stop: a lit case seen through the doorway, the room name on the transom. |
| `review/runs/2026-10-20-g2r3/stills/desk-desktop.png` | desktop, high | The mood target: one warm pool, walnut, the end-wall line, a faint shaft. |
| `review/runs/2026-10-20-g2r3/stills/desk-pixel7.png` | Pixel 7, medium | The phone ending: the end-wall line, the shaft and the desk above a compact card. |

Not proposed: the phone lobby (F-032) and any shot of a door on the wing track (F-038).

## After round 3

The M2 review cap is reached. Leftovers for Emeka's backlog: F-027, F-032 and F-033. F-038 blocks G2's "no open P1" condition until R0 settles it, by one of the options in "Result against gate G2". Emeka's remaining G2 input is approval of the ten stills above and a hand check of the preview: a real trackpad and mouse at the doors and inside a wing, and the scrollbar colour (F-030).
