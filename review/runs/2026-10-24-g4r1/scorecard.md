# Experience review, gate G4 round 1

- Date: 2026-10-24. Reviewer: R11 (WP-19 protocol, round 1 of at most 3 for M4). Protocol: `review/rubric.md`.
- Build: `4938da2`, the tip of `claude/intelligent-sagan-poq45q` (M4 merged: WP-26, WP-27, WP-28, F-M4a, F-041b, the hover fix; CI run 126 green with refreshed baselines, per R0). `npm ci && npm run build` (budgets ok, check-copy ok), served by `scripts/serve-dist.ts` on port 4174. The Netlify preview is not reachable from this container; this is the same tested code. Chromium 1243 was linked under the 1194 folder names in a scratch `PLAYWRIGHT_BROWSERS_PATH` outside the repo (no install, nothing committed), as the M4 builders did.
- Capture: `tests/e2e/capture.spec.ts` (`@capture`, `CAPTURE_DIALOGS=1`, `?test=1&mode=museum`, every stop). Desktop 1440 x 900 at `tier=high`: 13 passed. Pixel 7 412 x 839 at tier medium: 13 passed. 9 dialogs per project. Raw scores and reasons: `scores.json`. Stats per shot: `<stop>-<project>.json`.
- Probes: `probe-g4.mjs` (committed here; `review/` is eslint-ignored) at the lobby, klarup, finance-tracker, sdsj, mun and certifications (`probe-g4.json`) and at verafin, mysa, wailo, cfia and the desk (`probe-g4-main.json`), each on Pixel 7 and 360 x 640 (Pixel 7 UA). It records the HUD rects, brass pixels inside them, the card rect and the wall title's glyph boxes, so the gap from the HUD row to the title is measured, not eyeballed. Evidence crops: `evidence/`.
- Render budget (from the stats records): max 109 draw calls on desktop high (lobby) against 150, max 49 on Pixel 7 medium (lobby) against 80; max 30,507 triangles (projects-door, desktop); texture at most 12.4 MB. Every exhibit `inBounds: true`; per-exhibit triangles 792 (sdsj) to 7,480 (finance-tracker) against 20,000.
- Scored set: the same 13 stops as G3 round 1 (10 main-track stops including both doors, plus klarup, finance-tracker and sdsj) x 6 dimensions x 2 viewports = 156 cells, each from this round's shots. Previous round: `review/runs/2026-10-21-g3r1/scorecard.md` (156 cells, same set, so the comparison is like for like). Approved reference stills: none recorded in ART_DIRECTION section 10 yet; the G3 proposal (`review/runs/2026-10-21-g3r1/stills/`) is the comparison.
- Averages are truncated to two decimals, never rounded up.

## Result against gate G4

| Gate input | Value | Bar | Pass |
|---|---|---|---|
| Review average (156 cells) | **3.90** (608.5 / 156; desktop 3.92, Pixel 7 3.87) | at least 4.0 | **no** |
| Lowest dimension | D6 Object read 3.76 (both); lowest per viewport D6 Pixel 7 3.69 | none below 3.5 | yes |
| Emeka's sign-off on 10 screenshots | proposed in `stills/` (see below) | signed | pending |
| Open P0 / P1 (not a G4 bar, reported) | 0 / **1** (new F-048) | | |
| Open P2 / P3 | 4 (F-047, F-049, F-050, F-051) / 2 (F-052, F-053) | (not gating) | |

**Gate G4 is not met in round 1.** The average rose from 3.78 to 3.90 (30 of the 31 cells that moved went up; the one that went down is certifications desktop D3, 4.5 to 4, for a new dialog crop), and no dimension is below 3.5, but the 4.0 bar needs 15.5 more points (31 half-point steps) across the 156 cells. Five stops average 4.0 or more on both viewports together (klarup, sdsj, wailo 4.08; desk 4.04; finance-tracker 4.00) and three are close (verafin, mysa, certifications 3.95); the gap sits in six places: volunteer-door 3.54, projects-door 3.66, mun 3.70, cfia 3.75, the lobby 3.87 (its phone half 3.75), and the D1 void on the left of verafin and mysa on desktop.

One new P1 also stands, though G4's text does not bar on it:

- **F-048 (P1): at 360 x 640 the HUD top row covers the wall title numeral at main-aisle exhibit stops.** The MUN 05 is drawn behind the PDF button (`evidence/mun-360x640-top.png`), the top of the certifications 06 is cut by it (`evidence/certifications-360x640-top.png`), and the cfia 04 touches it at 0.6 px (`evidence/cfia-360x640-top.png`); the HUD row ends at y 52 at every stop (`probe-g4.json`, `probe-g4-main.json`). F-039 fixed the same class for the wing stops only; munTitle.test checks the viewport, not the HUD. **Fix (R4 with R3):** extend the F-039 portrait rule (frame from the measured HUD or head bottom) to main-aisle exhibit stops so every title top sits at least 8 px under the HUD row on 412 x 839 and 360 x 640, or lower those three title blocks on portrait. **Check:** a rail-input (g)-style rect check at every exhibit stop on pixel7 and 360 x 640; `probe-g4.mjs` with `PROBE_STOPS=verafin,mysa,wailo,cfia,mun,certifications` reports `titleGapBelowHud` of at least 8 in every row.

## Scores: desktop (tier high)

| Stop | D1 | D2 | D3 | D4 | D5 | D6 | Avg | G3 r1 | Shot (D6: `<stop>-thumb.png`) |
|---|---|---|---|---|---|---|---|---|---|
| lobby | 4 | 4 | 4.5 | 4 | 4 | 3.5 | 4.00 | 3.91 | `review/runs/2026-10-24-g4r1/lobby-desktop.png` |
| verafin | 3.5 | 4 | 4 | 4 | 4 | 4 | 3.91 | 3.83 | `review/runs/2026-10-24-g4r1/verafin-desktop.png` |
| projects-door | 3.5 | 3.5 | 4 | 3.5 | 4 | 4 | 3.75 | 3.75 | `review/runs/2026-10-24-g4r1/projects-door-desktop.png` |
| klarup | 4 | 4 | 4.5 | 4 | 4 | 4 | 4.08 | 4.00 | `review/runs/2026-10-24-g4r1/klarup-desktop.png` |
| finance-tracker | 4 | 4 | 4.5 | 3.5 | 4 | 4 | 4.00 | 3.75 | `review/runs/2026-10-24-g4r1/finance-tracker-desktop.png` |
| mysa | 3.5 | 4 | 4 | 4 | 4 | 4 | 3.91 | 3.91 | `review/runs/2026-10-24-g4r1/mysa-desktop.png` |
| volunteer-door | 3.5 | 3.5 | 3.5 | 3.5 | 3.5 | 4 | 3.58 | 3.58 | `review/runs/2026-10-24-g4r1/volunteer-door-desktop.png` |
| sdsj | 4 | 4 | 4.5 | 4 | 4 | 4 | 4.08 | 4.00 | `review/runs/2026-10-24-g4r1/sdsj-desktop.png` |
| wailo | 4 | 4 | 4 | 4.5 | 4 | 4 | 4.08 | 4.08 | `review/runs/2026-10-24-g4r1/wailo-desktop.png` |
| cfia | 4 | 3.5 | 4 | 3.5 | 4 | 3.5 | 3.75 | 3.66 | `review/runs/2026-10-24-g4r1/cfia-desktop.png` |
| mun | 4 | 4 | 4 | 3.5 | 4 | 3.5 | 3.83 | 3.50 | `review/runs/2026-10-24-g4r1/mun-desktop.png` |
| certifications | 4 | 4 | 4 | 4 | 4 | 3.5 | 3.91 | 3.75 | `review/runs/2026-10-24-g4r1/certifications-desktop.png` |
| desk | 4.5 | 4.5 | 4.5 | 3.5 | 4 | 4 | 4.16 | 4.16 | `review/runs/2026-10-24-g4r1/desk-desktop.png` |
| **Dimension avg** | 3.88 | 3.92 | 4.15 | 3.80 | 3.96 | 3.84 | **3.92** | 3.83 | 306.5 / 78 |

## Scores: Pixel 7 (tier medium)

| Stop | D1 | D2 | D3 | D4 | D5 | D6 | Avg | G3 r1 | Shot |
|---|---|---|---|---|---|---|---|---|---|
| lobby | 4 | 3.5 | 4.5 | 3.5 | 4 | 3 | 3.75 | 3.58 | `review/runs/2026-10-24-g4r1/lobby-pixel7.png` |
| verafin | 3.5 | 4 | 4.5 | 4 | 4 | 4 | 4.00 | 4.00 | `review/runs/2026-10-24-g4r1/verafin-pixel7.png` |
| projects-door | 3.5 | 3.5 | 4 | 3.5 | 3.5 | 3.5 | 3.58 | 3.58 | `review/runs/2026-10-24-g4r1/projects-door-pixel7.png` |
| klarup | 4 | 4 | 4.5 | 4 | 4 | 4 | 4.08 | 3.91 | `review/runs/2026-10-24-g4r1/klarup-pixel7.png` |
| finance-tracker | 4 | 4 | 4.5 | 3.5 | 4 | 4 | 4.00 | 3.33 | `review/runs/2026-10-24-g4r1/finance-tracker-pixel7.png` |
| mysa | 3.5 | 4 | 4.5 | 4 | 4 | 4 | 4.00 | 4.00 | `review/runs/2026-10-24-g4r1/mysa-pixel7.png` |
| volunteer-door | 3.5 | 3.5 | 3.5 | 3.5 | 3.5 | 3.5 | 3.50 | 3.50 | `review/runs/2026-10-24-g4r1/volunteer-door-pixel7.png` |
| sdsj | 4 | 4 | 4.5 | 4 | 4 | 4 | 4.08 | 3.83 | `review/runs/2026-10-24-g4r1/sdsj-pixel7.png` |
| wailo | 3.5 | 4 | 4.5 | 4.5 | 4 | 4 | 4.08 | 4.08 | `review/runs/2026-10-24-g4r1/wailo-pixel7.png` |
| cfia | 3.5 | 3.5 | 4.5 | 3.5 | 4 | 3.5 | 3.75 | 3.66 | `review/runs/2026-10-24-g4r1/cfia-pixel7.png` |
| mun | 3.5 | 3.5 | 3.5 | 3.5 | 4 | 3.5 | 3.58 | 3.25 | `review/runs/2026-10-24-g4r1/mun-pixel7.png` |
| certifications | 4 | 4 | 4.5 | 4 | 4 | 3.5 | 4.00 | 3.75 | `review/runs/2026-10-24-g4r1/certifications-pixel7.png` |
| desk | 4 | 4 | 4.5 | 3.5 | 4 | 3.5 | 3.91 | 3.91 | `review/runs/2026-10-24-g4r1/desk-pixel7.png` |
| **Dimension avg** | 3.73 | 3.80 | 4.30 | 3.76 | 3.92 | 3.69 | **3.87** | 3.72 | 302 / 78 |

## Averages

| Stop | Desktop | Pixel 7 | Both | G3 both | Move |
|---|---|---|---|---|---|
| lobby | 4.00 | 3.75 | 3.87 | 3.75 | up |
| verafin | 3.91 | 4.00 | 3.95 | 3.91 | up |
| projects-door | 3.75 | 3.58 | 3.66 | 3.66 | same |
| klarup | 4.08 | 4.08 | 4.08 | 3.95 | up |
| finance-tracker | 4.00 | 4.00 | 4.00 | 3.54 | up |
| mysa | 3.91 | 4.00 | 3.95 | 3.95 | same |
| volunteer-door | 3.58 | 3.50 | 3.54 | 3.54 | same |
| sdsj | 4.08 | 4.08 | 4.08 | 3.91 | up |
| wailo | 4.08 | 4.08 | 4.08 | 4.08 | same |
| cfia | 3.75 | 3.75 | 3.75 | 3.66 | up |
| mun | 3.83 | 3.58 | 3.70 | 3.37 | up |
| certifications | 3.91 | 4.00 | 3.95 | 3.75 | up |
| desk | 4.16 | 3.91 | 4.04 | 4.04 | same |

| Dimension | Desktop | Pixel 7 | Both | G3 both |
|---|---|---|---|---|
| D1 Gallery mood | 3.88 | 3.73 | 3.80 | 3.67 |
| D2 Composition | 3.92 | 3.80 | 3.86 | 3.76 |
| D3 Legibility | 4.15 | 4.30 | 4.23 | 4.13 |
| D4 Story clarity | 3.80 | 3.76 | 3.78 | 3.78 |
| D5 Craft consistency | 3.96 | 3.92 | 3.94 | 3.76 |
| D6 Object read | 3.84 | 3.69 | 3.76 | 3.55 |
## What moved since G3 round 1, and why

- **finance-tracker: 3.54 to 4.00** (F-039 fix, F-045 lift, WP-26 brass). Pixel 7 D3 2.5 to 4.5 and D2 3 to 4: P2 whole, 61 px below the HUD row (`probe-g4.json`); the brass stack reads as brass on both viewports; the raised stand fills the case (D6 3.5 to 4 on both).
- **mun: 3.37 to 3.70** (F-040, F-041b, F-045). The scaffold stands on the 0.96 m riser (D5 3 to 4 on both); the title is in frame on the phone and whole above the case in the desktop dialog; the die face reads in the thumbnail (D6 3 to 3.5). Still the lowest exhibit: the phone title is under the 14 px floor and tucked 0.9 px under the HUD row (F-049), and at 360 x 640 its 05 is under the HUD (F-048).
- **certifications: 3.75 to 3.95** (F-043, F-044). The panel sample fell from rgb(77, 44, 26) to rgb(19, 12, 8), so the medals carry the light (D1 3 to 4 on both, D5 3.5 to 4). Desktop D3 4.5 to 4: in the dialog the 06 top is cut by the viewport edge (F-050, `evidence/certifications-dialog-desktop-top.png`).
- **Wing stops klarup 3.95 to 4.08 and sdsj 3.91 to 4.08** (F-045, F-042, WP-27): raised staircase and table (D6 3.5 to 4), titles whole in the dialogs, and on the phone the wing head sits in the HUD row with the titles 89 and 58 px below it.
- **lobby: 3.75 to 3.87** (WP-26 arch interior, WP-27 ticket). The arch now shows the ceiling line, aisle depth and the lit first case (D1 3.5 to 4 on both); the phone arrival is still small and dark below the fast path (D6 3).
- **verafin 3.91 to 3.95** (D6 3.5 to 4: the cartridges read as brass), **cfia 3.66 to 3.75** (D6 3 to 3.5: the taller box lifts the stack; the spindle is still a hairline on the phone).
- **Unchanged and re-scored to the same value:** projects-door, mysa, volunteer-door, wailo, desk. mysa's left half is still near black (rgb 8, 7, 9; F-052), so the WP-26 mood note did not move D1 there.
- **F-046:** the 2025 and 2023 ticks are nudged off the volunteer-door and cfia dots (`evidence/rail-desk-desktop.png`); they now abut the dot rims, no line crosses a dot.
- **Hover styles under `(hover: hover)`:** no sticky hover in any Pixel 7 shot (the top-left Return to the aisle is unhovered in every wing shot).

## Dialogs (D2 and D3, not averaged)

| Shot | Note |
|---|---|
| `review/runs/2026-10-24-g4r1/klarup-dialog-desktop.png`, `finance-tracker-`, `sdsj-dialog-desktop.png` | F-042 fixed: KLARUP, PERSONAL FINANCE TRACKER and SOFTWARE DEVELOPERS OF ST. JOHN'S whole above the case top. The neighbouring P2 title still ghosts faintly behind the klarup panel (PERSON, TR at x 1220 to 1440); noted, not reopened. |
| `review/runs/2026-10-24-g4r1/mun-dialog-desktop.png` | F-041 fixed: 05 MEMORIAL UNIVERSITY whole above the case at left. |
| `review/runs/2026-10-24-g4r1/certifications-dialog-desktop.png` | **F-050 (P2):** the top of 06 is cut by the viewport edge; CERTIFICATIONS and the vitrine are whole. |
| `review/runs/2026-10-24-g4r1/verafin-dialog-desktop.png`, `mysa-`, `wailo-`, `cfia-dialog-desktop.png` | Hold the G3 result: calm panel, case whole at left, title above it. |
| `review/runs/2026-10-24-g4r1/<id>-dialog-pixel7.png` (all nine) | Full-height sheets, identical structure, Back to the aisle and Copy link in the header, Newer and Older pinned at the bottom. No defect. |

## Small phones (360 x 640, Pixel 7 UA, tier medium)

From `probe-g4.json` and `probe-g4-main.json` (HUD top row bottom y 52 everywhere; `titleGapBelowHud` is title top minus that):

| Stop | 412 x 839 gap | 360 x 640 gap | 360 x 640 read |
|---|---|---|---|
| lobby | (no title) | (no title) | Name, role, degree, Resume (PDF), Email and Classic view above Begin the walk and the ticket; the arch sits behind Begin the walk and the portrait touches the right edge (G3 residual, unchanged). Fast path passes. |
| klarup | 89.3 | 55.8 | P1 KLARUP whole, case whole above the card (top 459). |
| finance-tracker | 61.5 | 42.1 | Title whole, case whole above the card (top 459). |
| sdsj | 57.7 | 37.1 | Title whole; the shorter card (top 362) now clears the case floor (G3 residual closed by WP-27). |
| mun | **0.9** | **2.1, 05 under the PDF button** | F-048 (P1) at 360 x 640; F-049 (P2) on Pixel 7. |
| certifications | 7.0 | **06 top under the PDF button** | F-048. (The probe's glyph filter drops the 72 px tall 06, so the 64.6 it reports is CERTIFICATIONS; read from `evidence/certifications-360x640-top.png`.) |
| cfia | 11.6 | **0.6** | F-048 (touching). |
| verafin, mysa, wailo | 37.5 to 37.9 | 16.2 to 16.6 | Clear. |
| desk | 102.6 | 24.2 | Clear; desk above the card. |

No HUD control holds brass title pixels at any wing stop (all counts 0); the phone wing head now lives in the top row (WP-27), so F-039's failure mode is gone.

## MUN title (F-041b notes)

- **Cap height.** labels.test measures Pixel 7 at 412 x 915; the device viewport is 412 x 839, where F-041b computes 13.5 px for the 0.19 m cap. The glyph boxes in `probe-g4.json` (slanted by the wall angle) give about 12.6 to 15 px of cap once the slant is removed, smallest at the far end of MEMORIAL, and the title renders soft (`evidence/mun-pixel7-top.png`). Under EXPERIENCE 5.4's 14 px floor on the real viewport: **a finding, F-049 (P2)**, not P1, because the title is legible and the card carries the institution.
- **05 against the HUD row.** On Pixel 7 the 05 top is at y 52.9 against the row bottom at 52.0 (0.9 px, not the 2 px R0 noted), about 8 px left of the PDF button, so it touches the row's line without entering a control. Folded into F-049 (the fix must not push the block up). At 360 x 640 it is under the PDF button: F-048.

## Concept checklists: R11 verdicts for the four exhibits F-M4a changed

R11 re-checked each box from this round's shots, the thumbnails (`evidence/thumbs.png`), the stats records and F-M4a's change list (`review/reports/F-M4a.json`). Motion timing and the per-frame rules were not re-measured; they rest on the builders' unit tests. The checklists themselves (R2's files) were not edited by F-M4a, so their evidence lines and notes still describe the pre-F-M4a sizes; R2 should refresh them.

| Exhibit | R2 verdict | R11 verdict | Notes |
|---|---|---|---|
| cfia | PASS | **PASS** (box 1 no longer marginal) | Thumbnail: spindle and a pale stack on a taller walnut box (0.34 x 0.26 x 0.26), one object; 14 tickets, blank stamps, one 6 s motion; 1,116 triangles, in bounds; walnut, brass, paper, ceramicGraphite. Stale: the note's "box is 0.30 m wide". |
| finance-tracker | PASS | **PASS** | Three stacks on one tray on a walnut stand (12 triangles; walnut is on the list); no text; 7,480 triangles, in bounds. The note about brown brass is resolved by WP-26. |
| sdsj | PASS | **PASS** | Table top at y 0.36 on a 0.30 m pedestal, six identical laptops, a brass rim band (brass is on the list); 792 triangles, in bounds; diameter unchanged at 0.54 m. The "airy case" note is resolved. |
| mun | PASS | **PASS** | Chip on a post inside a grounded cube scaffold (F-040); the die now leans 30 degrees toward the camera, a static pose, and turns about its own axis: still one motion (box 4); no text; 2,676 triangles, in the MUN slot. The note about floating parts is resolved. |

## Findings re-checked

| Id | Sev | Status now | Evidence |
|---|---|---|---|
| F-040 | P2 | **fixed** | `mun-desktop.png`, `mun-pixel7.png`: all uprights on the riser. |
| F-041 | P2 | **fixed** (residuals F-048, F-049) | `mun-pixel7.png`, `mun-dialog-desktop.png`: title in frame. |
| F-042 | P2 | **fixed** | Three wing dialogs: titles whole. Ghost of P2 behind the klarup panel noted. |
| F-043 | P2 | **fixed** | Panel rgb(19, 12, 8), was (77, 44, 26); faint panel edge remains. |
| F-044 | P2 | **fixed** | Both placeholders in `dist/exhibit/certifications/index.html`; RELEASE=1 check:copy blocks on them. Box 6 holds. |
| F-045 | P3 | **fixed** | `evidence/thumbs.png`: objects higher and larger; brass reads as brass. |
| F-046 | P3 | **fixed** | `evidence/rail-desk-desktop.png`: no tick crosses a dot. |
| F-047 | P2 | open, not re-checked | CI intermittency; outside this visual review. |
| F-020 to F-023, F-027, F-032, F-033, F-036 to F-039 | P1/P2/P3 | fixed, hold | No regression in any shot or probe. |

## New findings

| Id | Sev | Stop | Viewport | Summary and fix |
|---|---|---|---|---|
| **F-048** | **P1** | mun, certifications (covered); cfia (touching) | 360 x 640 | HUD top row over the wall title numeral. Fix and check in the gate section. Owner R4 with R3. |
| F-049 | P2 | mun | Pixel 7 412 x 839 | Organization cap about 13.5 px (floor 14); 05 0.9 px under the HUD row; labels.test measures 412 x 915. Fix: measure at 412 x 839, take the room from the number cap (0.32 to about 0.26 m) and give the organization about 0.20 m. Owner R3 with R8. |
| F-050 | P2 | certifications (dialog) | desktop | 06 top cut by the viewport edge. Fix: add the vitrine to the titleClearDolly map with a top clearance. Owner R4. |
| F-051 | P2 | volunteer-door | desktop | The neighbouring wailo case and title fragments are cut at the left edge (G3 top problem 5, filed now). Fix: yaw the door pose toward the door. Owner R4. |
| F-052 | P3 | verafin, mysa (projects-door) | desktop | Left half near black (rgb 8, 7, 9); a low warm wash on the left wall. Owner R2 with R3. |
| F-053 | P3 | cfia | desktop | Rail labels drawn over the lit neighbouring MUN case. Owner R6 or R4. |

P0: 0. Open P1: 1 (F-048). Open P2: 4. Open P3: 2. New this round: 1 P1, 3 P2, 2 P3, so the improvement loop's stop rule (no new P0 or P1, at most 2 new P2, averages of at least 4.0) is not met. Full evidence, expected results and checks: `review/findings.json` (field `g4r1` on each re-checked finding; the new ones carry `gate: "G4"`, `round: 1`).

## Copy check

No invented facts in any shot: card, dialog and curator's note text match `src/content/resume.ts`. First-person copy is `draft: true` and the placeholders (target roles, certification issue dates, Tech Stewardship issuer) show as placeholders, so RELEASE=1 check:copy blocks release as designed. The Verafin copy guard holds. The admission ticket reads 15 OCT 2026 under `?test=1` (frozen clock). No phone number in any shot.

## Top 5 strengths

1. **The phone wing stops are fixed for good** (`finance-tracker-pixel7.png`, 3.33 to 4.00): the wing head moved into the top row, titles sit 42 to 89 px under it on both phone sizes.
2. **Lighting is calmer and more even** (WP-26): the certifications panel no longer burns (3.75 to 3.95), brass reads as brass at medium, and the lobby arch shows the gallery.
3. **Object read is up across the board** (D6 3.55 to 3.76): the F-045 lifts make klarup, finance-tracker and sdsj fill their cases (`evidence/thumbs.png`).
4. **Wing dialogs are clean** (F-042): every title whole above its case.
5. **No regression anywhere**, and every exhibit stays in bounds and under 7,500 triangles with draw calls well inside budget.

## Top 5 problems

1. **The 4.0 bar is missed by 0.10** (3.90): the doors (3.54, 3.66) and mun (3.70) pull the average down.
2. **F-048 (P1)**: small-phone titles under the HUD at mun and certifications, touching at cfia.
3. **The two wing doors** are the weakest stops: volunteer-door crops its neighbour (F-051), and both doors leave the left half void with the card crowding the frame.
4. **mun on the phone** (3.58): title soft and under the floor (F-049).
5. **Dead left half at verafin and mysa on desktop** (F-052): the WP-26 mood note did not land there.

## Sign-off stills (committed, 1.7 MB)

`review/runs/2026-10-24-g4r1/stills/`, one line each in `stills/README.md`. WP-26's proposal with one swap: `06-sdsj-desktop.png` (4.08) replaces `mysa-desktop` (D1 3.5, the left half still near black).

| File | Stop, viewport, tier | Why |
|---|---|---|
| `stills/01-lobby-desktop.png` | lobby, desktop, high | The arrival with the arch showing the gallery. |
| `stills/02-lobby-pixel7.png` | lobby, Pixel 7, medium | The phone arrival and recruiter fast path. |
| `stills/03-verafin-desktop.png` | verafin, desktop, high | The first and current exhibit. |
| `stills/04-wailo-desktop.png` | wailo, desktop, high | The best main-aisle stop. |
| `stills/05-klarup-desktop.png` | klarup, desktop, high | The Projects wing. |
| `stills/06-sdsj-desktop.png` | sdsj, desktop, high | The Volunteer wing (swap for mysa). |
| `stills/07-finance-tracker-pixel7.png` | finance-tracker, Pixel 7, medium | A phone wing stop after F-039 and WP-27. |
| `stills/08-certifications-desktop.png` | certifications, desktop, high | The vitrine after F-043. |
| `stills/09-desk-desktop.png` | desk, desktop, high | The ending, the highest stop. |
| `stills/10-wailo-dialog-desktop.png` | wailo dialog, desktop, high | A story dialog over the gallery. |

## Next

R0 options: (a) a scoped fix round for F-048 (P1, R4 framing) with F-049, F-050 and F-051 (all framing or title metrics, R4 and R3), plus a door composition pass (F-051, F-052), then G4 round 2; on this evidence those stops are where the missing 15.5 points are (both doors, mun phone, verafin and mysa D1, cfia). (b) Take the stills to Emeka now for the sign-off half of G4 while the fixes run; none of the 10 stills shows a finding. Rounds left for M4: 2.
