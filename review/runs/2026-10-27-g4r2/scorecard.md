# Experience review, gate G4 round 2

- Date: 2026-10-27. Reviewer: R11 (WP-19 protocol, round 2 of at most 3 for M4). Protocol: `review/rubric.md`.
- Build: `4df46e0`, the tip of `claude/intelligent-sagan-poq45q` (F-M4b merged: F-048, the doors with F-051, F-052, F-049, F-050, F-053; CI run 144 green with refreshed baselines, per R0). `npm ci && npm run build` (budgets ok, check-copy ok), served by `scripts/serve-dist.ts` on port 4174. Chromium 1243 was mapped under the 1194 folder names in a scratch `PLAYWRIGHT_BROWSERS_PATH` outside the repo (no install, nothing committed), as in round 1.
- Capture: `tests/e2e/capture.spec.ts` (`@capture`, `CAPTURE_DIALOGS=1`, `?test=1&mode=museum`, every stop). Desktop 1440 x 900 at `tier=high`: 13 stops and 9 dialogs. Pixel 7 412 x 839 at tier medium: 13 stops and 9 dialogs. Both runs passed. Raw scores, reasons and the round 1 value of every cell: `scores.json`. Stats per shot: `<stop>-<project>.json`.
- Probes: `probe-g4.mjs` (unchanged from round 1) at the lobby, klarup, finance-tracker, sdsj, mun and certifications (`probe-g4.json`) and at verafin, mysa, wailo, cfia, the desk and both doors (`probe-g4-main.json`), each on Pixel 7 and 360 x 640 (Pixel 7 UA). Evidence crops and the thumbnail sheet: `evidence/` (force-added, 1.5 MB with the thumbnails).
- Scored set: the same 13 stops as round 1 x 6 dimensions x 2 viewports = 156 cells, so the comparison is cell for cell. Averages are truncated to two decimals, never rounded up. Cells that moved are **bold** below.

## Result against gate G4

| Gate input | Value | Bar | Pass |
|---|---|---|---|
| Review average (156 cells) | **3.94** (616 / 156; desktop 3.98, Pixel 7 3.91) | at least 4.0 | **no** |
| Lowest dimension | D6 Object read 3.76 (both); lowest per viewport D6 Pixel 7 3.69 | none below 3.5 | yes |
| Emeka's sign-off on 10 screenshots | approved 2026-10-24 (round 1); no still changed enough to ask again (see Stills) | signed | yes |
| Open P0 / P1 (reported, not a G4 bar) | 0 / **0** (F-048 fixed) | | |
| Open P2 / P3 | 2 (F-047, new F-054) / 3 (F-052 narrowed to verafin, new F-055, F-056) | (not gating) | |

**Gate G4 is not met in round 2.** The average rose from 3.90 to 3.94 (608.5 to 616 points; all 15 moved cells went up, none down), no dimension is below 3.5, the sign-off holds, and the one P1 is fixed. The 4.0 bar needs 624 points: **8 more points (16 half-point steps)**. F-M4b delivered about half of the 15.5 it aimed for. What held cells back, strictly against the anchors:

- **The doors** rose (projects-door 3.66 to 3.83, volunteer-door 3.54 to 3.79) but stay under 4: both still tell "a door with one case inside" (D4 3.5, KlarUp is only in the card), on the phone the surround is dead ink (D1 3.5) and the inner case is small (D6 3.5), and the volunteer door now puts its right jamb under the active rail label (F-054, desktop D2 3.5).
- **verafin desktop D1** stays 3.5: the F-052 side bay lands between the aisle and the case; the left half is still the dark far aisle (rgb 11, 11, 13 at x 300, y 300, unchanged).
- **The phone main aisle** is unchanged by design (verafin, mysa, wailo, cfia, mun D1 3.5: beam and case, dark around), and the phone lobby (3.75) and cfia (3.75) did not move.
- **D4 and D6** did not move anywhere (3.78 and 3.76): F-M4b was a framing and light pass, not an object pass.

## Scores: desktop (tier high)

| Stop | D1 | D2 | D3 | D4 | D5 | D6 | Avg | G4 r1 | Shot (D6: `<stop>-thumb.png`) |
|---|---|---|---|---|---|---|---|---|---|
| lobby | 4 | 4 | 4.5 | 4 | 4 | 3.5 | 4.00 | 4.00 | `review/runs/2026-10-27-g4r2/lobby-desktop.png` |
| verafin | 3.5 | 4 | 4 | 4 | 4 | 4 | 3.91 | 3.91 | `review/runs/2026-10-27-g4r2/verafin-desktop.png` |
| projects-door | **4** | **4** | 4 | 3.5 | 4 | 4 | 3.91 | 3.75 | `review/runs/2026-10-27-g4r2/projects-door-desktop.png` |
| klarup | 4 | 4 | 4.5 | 4 | 4 | 4 | 4.08 | 4.08 | `review/runs/2026-10-27-g4r2/klarup-desktop.png` |
| finance-tracker | 4 | 4 | 4.5 | 3.5 | 4 | 4 | 4.00 | 4.00 | `review/runs/2026-10-27-g4r2/finance-tracker-desktop.png` |
| mysa | **4** | 4 | 4 | 4 | 4 | 4 | 4.00 | 3.91 | `review/runs/2026-10-27-g4r2/mysa-desktop.png` |
| volunteer-door | **4** | 3.5 | **4** | 3.5 | **4** | 4 | 3.83 | 3.58 | `review/runs/2026-10-27-g4r2/volunteer-door-desktop.png` |
| sdsj | 4 | 4 | 4.5 | 4 | 4 | 4 | 4.08 | 4.08 | `review/runs/2026-10-27-g4r2/sdsj-desktop.png` |
| wailo | 4 | 4 | 4 | 4.5 | 4 | 4 | 4.08 | 4.08 | `review/runs/2026-10-27-g4r2/wailo-desktop.png` |
| cfia | 4 | **4** | 4 | 3.5 | 4 | 3.5 | 3.83 | 3.75 | `review/runs/2026-10-27-g4r2/cfia-desktop.png` |
| mun | 4 | 4 | 4 | 3.5 | 4 | 3.5 | 3.83 | 3.83 | `review/runs/2026-10-27-g4r2/mun-desktop.png` |
| certifications | 4 | 4 | **4.5** | 4 | 4 | 3.5 | 4.00 | 3.91 | `review/runs/2026-10-27-g4r2/certifications-desktop.png` |
| desk | 4.5 | 4.5 | 4.5 | 3.5 | 4 | 4 | 4.16 | 4.16 | `review/runs/2026-10-27-g4r2/desk-desktop.png` |
| **Dimension avg** | 4.00 | 4.00 | 4.23 | 3.80 | 4.00 | 3.84 | **3.98** | 3.92 | 310.5 / 78 |

## Scores: Pixel 7 (tier medium)

| Stop | D1 | D2 | D3 | D4 | D5 | D6 | Avg | G4 r1 | Shot |
|---|---|---|---|---|---|---|---|---|---|
| lobby | 4 | 3.5 | 4.5 | 3.5 | 4 | 3 | 3.75 | 3.75 | `review/runs/2026-10-27-g4r2/lobby-pixel7.png` |
| verafin | 3.5 | 4 | 4.5 | 4 | 4 | 4 | 4.00 | 4.00 | `review/runs/2026-10-27-g4r2/verafin-pixel7.png` |
| projects-door | 3.5 | **4** | 4 | 3.5 | **4** | 3.5 | 3.75 | 3.58 | `review/runs/2026-10-27-g4r2/projects-door-pixel7.png` |
| klarup | 4 | 4 | 4.5 | 4 | 4 | 4 | 4.08 | 4.08 | `review/runs/2026-10-27-g4r2/klarup-pixel7.png` |
| finance-tracker | 4 | 4 | 4.5 | 3.5 | 4 | 4 | 4.00 | 4.00 | `review/runs/2026-10-27-g4r2/finance-tracker-pixel7.png` |
| mysa | 3.5 | 4 | 4.5 | 4 | 4 | 4 | 4.00 | 4.00 | `review/runs/2026-10-27-g4r2/mysa-pixel7.png` |
| volunteer-door | 3.5 | **4** | **4** | 3.5 | **4** | 3.5 | 3.75 | 3.50 | `review/runs/2026-10-27-g4r2/volunteer-door-pixel7.png` |
| sdsj | 4 | 4 | 4.5 | 4 | 4 | 4 | 4.08 | 4.08 | `review/runs/2026-10-27-g4r2/sdsj-pixel7.png` |
| wailo | 3.5 | 4 | 4.5 | 4.5 | 4 | 4 | 4.08 | 4.08 | `review/runs/2026-10-27-g4r2/wailo-pixel7.png` |
| cfia | 3.5 | 3.5 | 4.5 | 3.5 | 4 | 3.5 | 3.75 | 3.75 | `review/runs/2026-10-27-g4r2/cfia-pixel7.png` |
| mun | 3.5 | **4** | **4** | 3.5 | 4 | 3.5 | 3.75 | 3.58 | `review/runs/2026-10-27-g4r2/mun-pixel7.png` |
| certifications | 4 | 4 | 4.5 | 4 | 4 | 3.5 | 4.00 | 4.00 | `review/runs/2026-10-27-g4r2/certifications-pixel7.png` |
| desk | 4 | 4 | 4.5 | 3.5 | 4 | 3.5 | 3.91 | 3.91 | `review/runs/2026-10-27-g4r2/desk-pixel7.png` |
| **Dimension avg** | 3.73 | 3.92 | 4.38 | 3.76 | 4.00 | 3.69 | **3.91** | 3.87 | 305.5 / 78 |

## Averages

| Stop | Desktop | Pixel 7 | Both | G4 r1 both | Move |
|---|---|---|---|---|---|
| lobby | 4.00 | 3.75 | 3.87 | 3.87 | same |
| verafin | 3.91 | 4.00 | 3.95 | 3.95 | same |
| projects-door | 3.91 | 3.75 | 3.83 | 3.66 | up |
| klarup | 4.08 | 4.08 | 4.08 | 4.08 | same |
| finance-tracker | 4.00 | 4.00 | 4.00 | 4.00 | same |
| mysa | 4.00 | 4.00 | 4.00 | 3.95 | up |
| volunteer-door | 3.83 | 3.75 | 3.79 | 3.54 | up |
| sdsj | 4.08 | 4.08 | 4.08 | 4.08 | same |
| wailo | 4.08 | 4.08 | 4.08 | 4.08 | same |
| cfia | 3.83 | 3.75 | 3.79 | 3.75 | up |
| mun | 3.83 | 3.75 | 3.79 | 3.70 | up |
| certifications | 4.00 | 4.00 | 4.00 | 3.95 | up |
| desk | 4.16 | 3.91 | 4.04 | 4.04 | same |

| Dimension | Desktop | Pixel 7 | Both | G4 r1 desktop / Pixel 7 / both |
|---|---|---|---|---|
| D1 Gallery mood | 4.00 | 3.73 | 3.86 | 3.88 / 3.73 / 3.80 |
| D2 Composition | 4.00 | 3.92 | 3.96 | 3.92 / 3.80 / 3.86 |
| D3 Legibility | 4.23 | 4.38 | 4.30 | 4.15 / 4.30 / 4.23 |
| D4 Story clarity | 3.80 | 3.76 | 3.78 | 3.80 / 3.76 / 3.78 |
| D5 Craft consistency | 4.00 | 4.00 | 4.00 | 3.96 / 3.92 / 3.94 |
| D6 Object read | 3.84 | 3.69 | 3.76 | 3.84 / 3.69 / 3.76 |
| **Overall** | **3.98** | **3.91** | **3.94** | 3.92 / 3.87 / 3.90 |

## Cells that moved (15, all up, +7.5 points)

| Cell | G4 r1 | G4 r2 | Why |
|---|---|---|---|
| projects-door desktop D1 | 3.5 | 4 | Doors pass (F-051, F-052): the left wall is now a dim warm bay (sample 19, 17, 18, was 8, 7, 9) and the room's glow fills the doorway; no black void. Not 4.5: the room beyond is one pool, no faint promise past it. |
| projects-door desktop D2 | 3.5 | 4 | The doorway, PROJECTS transom and the room compose as one picture between the card (x 446) and the rail; nothing cut at an edge, no brass in the leftmost 60 px. Not 4.5: both jambs run off the bottom edge and the inner case sits low and small. |
| projects-door pixel7 D2 | 3.5 | 4 | Both jambs whole (F-051 portrait rule), transom 50 px under the HUD row (probe-g4-main.json), case on the door's axis, card clear below. Not 4.5: an empty black floor band between door and card. |
| projects-door pixel7 D5 | 3.5 | 4 | The frame's lit inner face now matches the desktop door (G4 r1 3.5: darker and flatter). |
| mysa desktop D1 | 3.5 | 4 | F-052: the left half is now a dim warm wall (sample rgb 26, 21, 21 at x 300, y 300; G4 r1 8, 7, 9), so the case sits in a room rather than beside a void. Not 4.5: no next pool in view. |
| volunteer-door desktop D1 | 3.5 | 4 | F-051 and F-052: the wailo fragments are gone (0 brass px in the leftmost 60 px), the left wall is a dim warm wash (31, 28, 30) and the V1 room glows through the door. |
| volunteer-door desktop D3 | 3.5 | 4 | VOLUNTEER & LEADERSHIP and V1 SOFTWARE DEVELOPERS OF ST. JOHN'S crisp; no edge fragments. |
| volunteer-door desktop D5 | 3.5 | 4 | No framing error left; frame, glow and wash in family with projects-door. |
| volunteer-door pixel7 D2 | 3.5 | 4 | Both jambs whole (the right jamb was cut in G4 r1), transom 33 px under the HUD row (probe-g4-main.json), case near the door's axis, card clear below. |
| volunteer-door pixel7 D3 | 3.5 | 4 | The transom now spans the frame and reads at a glance; V1 title legible inside (G4 r1 3.5: small and skewed). |
| volunteer-door pixel7 D5 | 3.5 | 4 | Matches projects-door and the desktop door treatment. |
| cfia desktop D2 | 3.5 | 4 | F-053: a feathered ink scrim dims the neighbouring MUN case under the rail, so the 2025 to 2023 labels no longer fight lit brass (evidence/cfia-rail-desktop.png); title whole above the case. Not 4.5: the dimmed MUN case and its title ghost still sit at the right edge. |
| mun pixel7 D2 | 3.5 | 4 | F-049: the 05 sits 12.35 px under the HUD row (0.9 in G4 r1), title above the case, case clear of the card. Not 4.5: the title hangs left of the case axis and the card covers the plinth foot. |
| mun pixel7 D3 | 3.5 | 4 | Organization cap 14.28 px by labels.test at 412 x 839; rendered glyph boxes median 16.4 px (16.0 in G4 r1), crisper (probe-g4.json). Not 4.5: slanted, and the 05 is small. |
| certifications desktop D3 | 4 | 4.5 | Stop crisp, and in the dialog 06 and CERTIFICATIONS are now whole (F-050 fixed, certifications-dialog-desktop.png). Not 5: the card's wraps are long. |

## Dialogs (D2 and D3, not averaged)

| Shot | Note |
|---|---|
| `review/runs/2026-10-27-g4r2/certifications-dialog-desktop.png` | **F-050 fixed:** 06 and CERTIFICATIONS whole above the vitrine (`evidence/certifications-dialog-desktop-top.png`). |
| `review/runs/2026-10-27-g4r2/verafin-`, `mysa-`, `wailo-`, `cfia-`, `mun-dialog-desktop.png` | Hold: calm panel, case whole at left, title above it. The larger 0.125 m organization labels sit whole. The case in the wailo dialog moved a few pixels with the reframe (see Stills, 10). |
| `review/runs/2026-10-27-g4r2/klarup-`, `finance-tracker-`, `sdsj-dialog-desktop.png` | Titles whole above the case. The neighbouring P2 title still ghosts faintly behind the klarup panel (round 1 note, not reopened); a similar faint ghost sits behind the mun panel. |
| `review/runs/2026-10-27-g4r2/<id>-dialog-pixel7.png` (all nine) | Full-height sheets, identical structure, Back to the aisle and Copy link in the header, Newer and Older pinned at the bottom. No defect. |

## Small phones (360 x 640, Pixel 7 UA, tier medium)

From `probe-g4.json` and `probe-g4-main.json` (HUD top row bottom y 52 everywhere; `titleGapBelowHud` is the title top minus that; in round 2 the probe also catches the 06, which is now under its 80 px glyph filter):

| Stop | 412 x 839 gap (r1) | 360 x 640 gap (r1) | 360 x 640 read |
|---|---|---|---|
| lobby | (no title) | (no title) | Fast path unchanged and passing: name, role, degree, Resume (PDF), Email and Classic view above Begin the walk. |
| klarup, finance-tracker, sdsj | 89.3, 61.5, 57.7 (same) | 55.8, 42.1, 37.1 (same) | Titles and cases whole above the card. |
| verafin, mysa, wailo | 37.1 to 37.5 (37.5 to 37.9) | 15.8 to 16.2 (16.2 to 16.6) | Clear. |
| cfia | 12.7 (11.6) | **11.2 (0.6)** | F-048 fixed (`evidence/cfia-360x640-top.png`). |
| mun | 12.35 (0.9) | **10.9 (05 under the PDF button)** | F-048 and F-049 fixed (`evidence/mun-360x640-top.png`). |
| certifications | 9.3 (7.0) | **8.95 (06 under the PDF button)** | F-048 fixed (`evidence/certifications-360x640-top.png`). |
| projects-door, volunteer-door | 50.1, 33.3 | 26.1, 13.1 | Both doorways whole, transoms under the HUD row. |
| desk | 102.6 (same) | 24.2 (same) | Clear. |

No HUD control holds brass title pixels at any stop (all counts 0). Every title is at least 8 px under the HUD row on both phone sizes, so the F-048 check passes. Separately, at 360 x 640 the wall titles render 11 to 13 px (median glyph boxes), in spec because EXPERIENCE 5.4 sets the 14 px floor on Pixel 7: noted as P3 F-055.

## Stills: Emeka's approved ten against round 2

Each still (`review/runs/2026-10-24-g4r1/stills/`, saved at 1200 x 750 for desktop) was compared with its round 2 capture, both scaled to 360 px wide: mean absolute difference per channel, and the share of values that differ by more than 24 levels. Rescaling alone gives about 0.7 to 1.0 on an unchanged desktop shot.

| Still | Round 2 shot | Mean diff, share over 24 | Change | Verdict |
|---|---|---|---|---|
| 01-lobby-desktop | `lobby-desktop.png` | 0.98, 0.00% | None visible; the rail scrim is faint behind the column. | unchanged |
| 02-lobby-pixel7 | `lobby-pixel7.png` | 0.36, 0.01% | None visible. | unchanged |
| 03-verafin-desktop | `verafin-desktop.png` | 1.57, 0.54% | **Visible, small:** the F-052 side bay adds a dim grey arch on the wall left of the case, NASDAQ VERAFIN is about 4% larger (0.125 m), and the rail column has its scrim. Composition, case and light otherwise the same. | small change |
| 04-wailo-desktop | `wailo-desktop.png` | 2.05, 0.00% | **Visible, small:** the right wall behind the rail is a little lighter (rail scrim and wash), WAILO slightly larger. | small change |
| 05-klarup-desktop | `klarup-desktop.png` | 0.78, 0.00% | None. | unchanged |
| 06-sdsj-desktop | `sdsj-desktop.png` | 0.89, 0.00% | None. | unchanged |
| 07-finance-tracker-pixel7 | `finance-tracker-pixel7.png` | 0.19, 0.00% | None. | unchanged |
| 08-certifications-desktop | `certifications-desktop.png` | 0.68, 0.00% | None visible at the stop (only the dialog changed, F-050). | unchanged |
| 09-desk-desktop | `desk-desktop.png` | 0.68, 0.00% | Rail scrim only. | unchanged |
| 10-wailo-dialog-desktop | `wailo-dialog-desktop.png` | 2.01, 0.75% | **Visible, small:** the case and title sit a few pixels off their old place (dialog reframe after the label change), WAILO slightly larger. | small change |

No still changed largely: same rooms, same objects, same framing. R11's default: no new sign-off is needed; R0 decides.

## Findings re-checked

| Id | Sev | Status now | Evidence |
|---|---|---|---|
| F-047 | P2 | open (not re-checked here) | CI intermittency; R0 fixed quality (b) in the test; the pixel7 verafin still-canvas check stays intermittent. |
| F-048 | P1 | **fixed** | Probe gaps at least 8.95 px on 360 x 640 and 9.3 px on Pixel 7 at every exhibit stop (table above). |
| F-049 | P2 | **fixed** | MUN 05 12.35 px under the HUD row; organization cap 14.28 px at 412 x 839; glyph median 16.4 px. Residual taste note F-056. |
| F-050 | P2 | **fixed** | `evidence/certifications-dialog-desktop-top.png`. |
| F-051 | P2 | **fixed** | 0 brass pixels in the leftmost 60 px at volunteer-door desktop; both phone doorways whole. Residual on the right side: F-054. |
| F-052 | P3 | **open, narrowed to verafin** | mysa (26, 21, 21), cfia (24, 15, 10) and both doors now read as dim warm walls; verafin's left half is still the far aisle (11, 11, 13), `evidence/verafin-left-desktop.png`. |
| F-053 | P3 | **fixed** | `evidence/cfia-rail-desktop.png`: the MUN case under the rail is dimmed, labels read clean. |
| F-020 to F-046 | | fixed or withdrawn, hold | No regression in any shot or probe. |

## New findings

| Id | Sev | Stop | Viewport | Summary and fix |
|---|---|---|---|---|
| **F-054** | **P2** | volunteer-door | desktop | The active rail label 'Volunteer & Leadership wing' (x 1128 to 1322) is drawn over the door's right jamb, and the room title ends about 13 px from it (`evidence/volunteer-door-rail-desktop.png`). F-M4b bounded the doorway by the year labels (x 1240), not the active label. **Fix (R4):** bound the door framing by the active label's left edge (at least 16 px clear) or yaw the volunteer pose 1 to 2 degrees toward the door. **Check:** no jamb or title pixels inside the active label rect plus 16 px. |
| F-055 | P3 | all exhibit stops, doors | 360 x 640 | Wall titles 11 to 13 px; in spec (the floor is a Pixel 7 rule) and repeated in the DOM card. Idea: R0 records the scope, or labels.test gains a 360 x 640 row with a lower floor. |
| F-056 | P3 | mun | desktop, Pixel 7 | After F-049 the 05 reads smaller than MEMORIAL UNIVERSITY, the reverse of every other stop. Idea (R3, R0): a heavier or slightly larger numeral inside the same block height. |

P0: 0. Open P1: 0. Open P2: 2 (F-047, F-054). Open P3: 3 (F-052, F-055, F-056). New this round: 0 P0, 0 P1, 1 P2, 2 P3, so the stop rule's findings part holds this round, but its average part (at least 4.0) does not. Full evidence, expected results and checks: `review/findings.json` (field `g4r2` on each re-checked finding; the new ones carry `round: 2`).

## Copy check

No invented facts in any shot: card, dialog and curator's note text match `src/content/resume.ts`. First-person copy is `draft: true` and the placeholders (target roles, certification issue dates, Tech Stewardship issuer) still show, so RELEASE=1 check:copy blocks release as designed. The Verafin copy guard holds. The ticket reads 15 OCT 2026 under `?test=1`. No phone number in any shot.

## Top 5 strengths

1. **F-048 is closed for good:** every wall title sits at least 8 px under the HUD row at 412 x 839 and 360 x 640, measured, not eyeballed.
2. **The doors compose** (`evidence/projects-door-desktop-720.png`, `volunteer-door-desktop-720.png`): doorway, transom and the room's glow fill the frame, nothing is cut at the left edge, both phone doorways are whole.
3. **mysa and cfia no longer sit beside a void** on desktop: the side bays read as dim warm walls (D1 up at mysa).
4. **The certifications dialog is whole** (F-050) and the desktop rail no longer fights the lit MUN case (F-053).
5. **No regression:** no cell went down, budgets unchanged, every stop and dialog captured cleanly.

## Top 5 problems

1. **The 4.0 bar is missed by 0.06** (3.94; 8 points short).
2. **The doors are still "a door with one case"** (D4 3.5 on both viewports) and small on the phone (D6 3.5).
3. **verafin desktop's left half** is still the dark far aisle (F-052 residual), the first exhibit a visitor sees.
4. **The phone main aisle mood** (D1 3.5 at verafin, mysa, wailo, cfia, mun): beam and case, dark around; Pixel 7 D1 averages 3.73.
5. **F-054:** the active rail label on the volunteer door's jamb.

## Next

R0 options for the last M4 round (round 3 of 3): the missing 8 points sit where a framing pass cannot reach, so a fix pass would need (a) a door story beat (for example, the second wing item visible or hinted through each door: D4 3.5 to 4 on four cells, +2), (b) a warm far pool or wall bay down the aisle on the phone main stops and verafin desktop (D1 on six cells, +3), (c) F-054 (+0.5), and (d) larger inner cases on the phone doors and the lobby arrival (D6, up to +1.5). Alternatively, R0 can take G4's remaining 0.06 to Emeka as a taste call with these stills, since the sign-off half of G4 already holds. A finding reopened twice becomes a taste call for Emeka; none is at that count.
