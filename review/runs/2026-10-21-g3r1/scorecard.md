# Exhibit review, gate G3 round 1

- Date: 2026-10-21. Reviewer: R11 (WP-19 protocol, round 1 of at most 3 for M3). Protocol: `review/rubric.md`.
- Build: `bc1ac35` on `claude/intelligent-sagan-poq45q` (M3 complete: nine exhibits, WP-24 wing rooms and doors, F-M3a, F-M3, WP-25), `npm ci && npm run build` (budgets ok, check-copy ok), served by `scripts/serve-dist.ts` on port 4174. The Netlify preview is not reachable from this container; this is the same tested code.
- Capture: `tests/e2e/capture.spec.ts` (`@capture`, `CAPTURE_DIALOGS=1`, `?test=1&mode=museum`, every stop). Desktop 1440 x 900 at `tier=high`: 13 passed. Pixel 7 412 x 839 at tier medium: 13 passed. 9 dialogs per project. Raw scores and reasons: `scores.json`. Stats per shot: `<stop>-<project>.json`.
- Render budget (from those records): max 109 draw calls on desktop high (lobby) against 150, max 49 on Pixel 7 medium against 80; max 30,451 triangles (projects-door, desktop) against 500,000 and 150,000; texture at most 12.4 MB. Every exhibit `inBounds: true`; per-exhibit triangles 664 (sdsj) to 7,468 (finance-tracker) against 20,000.
- Extra probes on the same build: `probe-wing-hud.mjs` (committed in this folder, eslint-ignored like the F-M3 probe) at klarup, finance-tracker and sdsj on Pixel 7 and 360 x 640, results in `probe-wing-hud.json`; `review/runs/2026-10-21-f-m3/capture-probe.mjs` for the lobby and desk at 360 x 640; `rail-input.spec.ts -g "(g)"` on desktop and pixel7 (3 passed, 1 skipped by design).
- Scored set: all 13 stops (10 main-track stops including both doors, plus klarup, finance-tracker and sdsj) x 6 dimensions x 2 viewports = 156 cells, every cell scored from this round's shots. Previous round: `review/runs/2026-10-20-g2r3/scorecard.md` (5 stops, 60 cells). Approved reference stills: none recorded yet in ART_DIRECTION section 10, so the G2 round 3 proposal (`review/runs/2026-10-20-g2r3/stills/`) is the comparison.
- Averages are truncated to two decimals, never rounded up.

## Result against gate G3

| Gate input | Value | Bar | Pass |
|---|---|---|---|
| All merged and green | CI run 93 green at bc1ac35 (R0 notes) | green | yes (R0's evidence) |
| Overall average (156 cells) | **3.78** (desktop 3.83, Pixel 7 3.72) | at least 3.5 | yes |
| Open P0 | 0 | 0 | yes |
| Open P1 | **1** (new F-039) | 0 | **no** |
| Open P2 / P3 | 5 (F-040 to F-044) / 2 (F-045, F-046) | (not gating) | |

**G3's review conditions do not hold in round 1** because of one new P1:

- **F-039 (P1): on phones the wing HUD is drawn over the wall title at the wing stops.** Stop finance-tracker, Pixel 7 412 x 839: "Return to the aisle" (x 16 to 189, y 96 to 140) sits on the P2 numeral (`finance-tracker-pixel7.png`, 800 brass title pixels inside the control; the committed CI baseline `stop-finance-tracker-pixel7.png` shows the same). At 360 x 640 all three wing stops fail (klarup 514, finance-tracker 2301, sdsj 2290 pixels; `probe-*-small.png`), and on Pixel 7 the V of V1 abuts the control border. Cause: F-M3 raised the wing title (F-027) while the portrait framing does not reserve the wing head, and rail-input (g) at the wing stops runs on desktop only. **Fix (R4 with R6):** on portrait viewports, frame each wing stop from the measured bottom of the wing head, as F-020 frames the desk from the card top, keeping the title top at least 8 px below it (or make the wing head compact on phones). **Check:** extend rail-input (g) "at each wing stop" to pixel7 and a 360 x 640 context; `probe-wing-hud.mjs` reports 0 at all six rows.

Everything else in the gate holds: the average clears 3.5 on both viewports, no P0, and all four findings re-checked from G2 (F-027, F-032, F-033 via F-M3, and F-038) are fixed.

## Scores: desktop (tier high)

| Stop | D1 | D2 | D3 | D4 | D5 | D6 | Avg | G2 r3 | Shot (D6: `<stop>-thumb.png`) |
|---|---|---|---|---|---|---|---|---|---|
| lobby | 3.5 | 4 | 4.5 | 4 | 4 | 3.5 | 3.91 | 3.91 | `review/runs/2026-10-21-g3r1/lobby-desktop.png` |
| verafin | 3.5 | 4 | 4 | 4 | 4 | 3.5 | 3.83 | 3.83 | `review/runs/2026-10-21-g3r1/verafin-desktop.png` |
| projects-door | 3.5 | 3.5 | 4 | 3.5 | 4 | 4 | 3.75 | 3.66 | `review/runs/2026-10-21-g3r1/projects-door-desktop.png` |
| klarup | 4 | 4 | 4.5 | 4 | 4 | 3.5 | 4.00 | (context) | `review/runs/2026-10-21-g3r1/klarup-desktop.png` |
| finance-tracker | 4 | 3.5 | 4.5 | 3.5 | 3.5 | 3.5 | 3.75 | (context) | `review/runs/2026-10-21-g3r1/finance-tracker-desktop.png` |
| mysa | 3.5 | 4 | 4 | 4 | 4 | 4 | 3.91 | (context) | `review/runs/2026-10-21-g3r1/mysa-desktop.png` |
| volunteer-door | 3.5 | 3.5 | 3.5 | 3.5 | 3.5 | 4 | 3.58 | 3.58 | `review/runs/2026-10-21-g3r1/volunteer-door-desktop.png` |
| sdsj | 4 | 4 | 4.5 | 4 | 4 | 3.5 | 4.00 | (context) | `review/runs/2026-10-21-g3r1/sdsj-desktop.png` |
| wailo | 4 | 4 | 4 | 4.5 | 4 | 4 | 4.08 | (new) | `review/runs/2026-10-21-g3r1/wailo-desktop.png` |
| cfia | 4 | 3.5 | 4 | 3.5 | 4 | 3 | 3.66 | (new) | `review/runs/2026-10-21-g3r1/cfia-desktop.png` |
| mun | 3.5 | 4 | 4 | 3.5 | 3 | 3 | 3.50 | (new) | `review/runs/2026-10-21-g3r1/mun-desktop.png` |
| certifications | 3 | 4 | 4.5 | 4 | 3.5 | 3.5 | 3.75 | (new) | `review/runs/2026-10-21-g3r1/certifications-desktop.png` |
| desk | 4.5 | 4.5 | 4.5 | 3.5 | 4 | 4 | 4.16 | 4.16 | `review/runs/2026-10-21-g3r1/desk-desktop.png` |
| **Dimension avg** | 3.73 | 3.88 | 4.19 | 3.80 | 3.80 | 3.61 | **3.83** | 3.83 | 299.5 / 78 |

## Scores: Pixel 7 (tier medium)

| Stop | D1 | D2 | D3 | D4 | D5 | D6 | Avg | G2 r3 | Shot |
|---|---|---|---|---|---|---|---|---|---|
| lobby | 3.5 | 3.5 | 4.5 | 3.5 | 3.5 | 3 | 3.58 | 3.25 | `review/runs/2026-10-21-g3r1/lobby-pixel7.png` |
| verafin | 3.5 | 4 | 4.5 | 4 | 4 | 4 | 4.00 | 4.00 | `review/runs/2026-10-21-g3r1/verafin-pixel7.png` |
| projects-door | 3.5 | 3.5 | 4 | 3.5 | 3.5 | 3.5 | 3.58 | 3.58 | `review/runs/2026-10-21-g3r1/projects-door-pixel7.png` |
| klarup | 4 | 4 | 4 | 4 | 4 | 3.5 | 3.91 | (new) | `review/runs/2026-10-21-g3r1/klarup-pixel7.png` |
| finance-tracker | 4 | 3 | 2.5 | 3.5 | 3.5 | 3.5 | 3.33 | (new) | `review/runs/2026-10-21-g3r1/finance-tracker-pixel7.png` |
| mysa | 3.5 | 4 | 4.5 | 4 | 4 | 4 | 4.00 | (context) | `review/runs/2026-10-21-g3r1/mysa-pixel7.png` |
| volunteer-door | 3.5 | 3.5 | 3.5 | 3.5 | 3.5 | 3.5 | 3.50 | 3.50 | `review/runs/2026-10-21-g3r1/volunteer-door-pixel7.png` |
| sdsj | 4 | 3.5 | 4 | 4 | 4 | 3.5 | 3.83 | (context) | `review/runs/2026-10-21-g3r1/sdsj-pixel7.png` |
| wailo | 3.5 | 4 | 4.5 | 4.5 | 4 | 4 | 4.08 | (new) | `review/runs/2026-10-21-g3r1/wailo-pixel7.png` |
| cfia | 3.5 | 3.5 | 4.5 | 3.5 | 4 | 3 | 3.66 | (new) | `review/runs/2026-10-21-g3r1/cfia-pixel7.png` |
| mun | 3.5 | 3 | 3.5 | 3.5 | 3 | 3 | 3.25 | (new) | `review/runs/2026-10-21-g3r1/mun-pixel7.png` |
| certifications | 3 | 4 | 4.5 | 4 | 3.5 | 3.5 | 3.75 | (new) | `review/runs/2026-10-21-g3r1/certifications-pixel7.png` |
| desk | 4 | 4 | 4.5 | 3.5 | 4 | 3.5 | 3.91 | 3.91 | `review/runs/2026-10-21-g3r1/desk-pixel7.png` |
| **Dimension avg** | 3.61 | 3.65 | 4.07 | 3.76 | 3.73 | 3.50 | **3.72** | 3.65 | 290.5 / 78 |

## Averages

| Stop | Desktop | Pixel 7 | Both |
|---|---|---|---|
| lobby | 3.91 | 3.58 | 3.75 |
| verafin | 3.83 | 4.00 | 3.91 |
| projects-door | 3.75 | 3.58 | 3.66 |
| klarup | 4.00 | 3.91 | 3.95 |
| finance-tracker | 3.75 | 3.33 | 3.54 |
| mysa | 3.91 | 4.00 | 3.95 |
| volunteer-door | 3.58 | 3.50 | 3.54 |
| sdsj | 4.00 | 3.83 | 3.91 |
| wailo | 4.08 | 4.08 | 4.08 |
| cfia | 3.66 | 3.66 | 3.66 |
| mun | 3.50 | 3.25 | 3.37 |
| certifications | 3.75 | 3.75 | 3.75 |
| desk | 4.16 | 3.91 | 4.04 |

| Dimension | Desktop | Pixel 7 | Both |
|---|---|---|---|
| D1 Gallery mood | 3.73 | 3.61 | 3.67 |
| D2 Composition | 3.88 | 3.65 | 3.76 |
| D3 Legibility | 4.19 | 4.07 | 4.13 |
| D4 Story clarity | 3.80 | 3.76 | 3.78 |
| D5 Craft consistency | 3.80 | 3.73 | 3.76 |
| D6 Object read | 3.61 | 3.50 | 3.55 |

**Overall: 3.78** (590 / 156; desktop 3.83, Pixel 7 3.72). Like for like on G2's five stops: **3.78** (227 / 60) against round 3's 3.74 (224.5 / 60). The improvement loop's stop bar (averages of at least 4.0, no new P0 or P1) is not reached: only wailo (4.08) and desk (4.04) average 4.0 or more.

## What moved since G2 round 3, and why

- **Pixel 7 lobby: 3.25 to 3.58** (F-032 via F-M3). The h1 sits over plain ink and the arch with its first case now fills the lower half under the lead line; D2 3 to 3.5, D4 3 to 3.5, D6 2.5 to 3, D1 3 to 3.5. The case is still tiny and dim, so the phone lobby stays the weakest arrival.
- **projects-door desktop: 3.66 to 3.75** (F-027): the inner P2 title is no longer crossed by a beam (D3 3.5 to 4).
- **Wing stops (klarup, finance-tracker, sdsj), now scored:** on desktop the beam shaft no longer crosses P1, P2 or V1 and the titles clear the case tops (F-027 fixed), so desktop wing stops score 3.75 to 4.00. On the phone the same lift brings the titles into the wing head (F-039).
- **Wall titles (F-033):** NASDAQ VERAFIN, MYSA and CANADIAN FOOD INSPECTION AGENCY now read as brass on the wash. verafin desktop D3 stays at 4 only because the title is skewed by the wall angle.
- **Unchanged and re-scored to the same value:** lobby desktop, verafin both, projects-door Pixel 7, volunteer-door both, desk both.
- **No regression in any cell scored in G2 round 3.**

## New exhibits, one line each

| Exhibit | Both | Read |
|---|---|---|
| wailo, The Deep Link | 4.08 | The best main stop: envelope, glowing arc and phone tell the story at a glance, and the Foundations room glows faintly ahead. |
| mysa, Warm Start | 3.95 | Clear slab-and-dial silhouette, generic; the left half of the desktop frame is a void. |
| klarup, The Climb | 3.95 | A clean staircase under a calm glow arch; checks read as thin lines. |
| sdsj, The Round Table | 3.91 | Reads as a community table; small in an airy case; V1 abuts the phone HUD. |
| certifications, The Medal Cabinet | 3.75 | Clear cabinet of three medals, but the backing panel glows hot orange (F-043). |
| cfia, The Ticket Spindle | 3.66 | Honest and warm, but the spindle is a thin line in a large empty case (D6 3). |
| finance-tracker, The Balance | 3.54 | Small stacks, brass reads brown, and the phone HUD sits on P2 (F-039). |
| mun, Work in Progress | 3.37 | The lowest stop: the scaffold floats 13 cm above the plinth (F-040), the die is lost in the thumbnail, the title is out of the phone frame (F-041). |

## Dialogs (D2 and D3, not averaged)

| Shot | Note |
|---|---|
| `review/runs/2026-10-21-g3r1/verafin-dialog-desktop.png`, `mysa-`, `wailo-`, `cfia-`, `certifications-dialog-desktop.png` | Hold the G2 result: calm panel, no HUD or rail behind it, the case whole at left, title above it. Typography at the 5 anchor. |
| `review/runs/2026-10-21-g3r1/mun-dialog-desktop.png` | Case whole, but the wall title is out of frame (only the final Y at the left edge; F-041). |
| `review/runs/2026-10-21-g3r1/klarup-dialog-desktop.png`, `finance-tracker-`, `sdsj-dialog-desktop.png` | The dolly lifts the case top over the title's last line: KLARUP, TRACKER and OF ST. JOHN'S are cut (F-042). The neighbouring P2 title ghosts faintly through the panel beside the klarup subtitle. |
| `review/runs/2026-10-21-g3r1/<id>-dialog-pixel7.png` (all nine) | Full-height sheets, same structure on every exhibit, Back to the aisle and Copy link in the header, Newer and Older pinned at the bottom. No defect. |

## Recruiter fast path (by eye)

`review/runs/2026-10-21-g3r1/lobby-pixel7.png` (412 x 839): name, role, degree and Resume (PDF), Email and Classic view all end above y 371. **Pass.** At 360 x 640 (`probe-lobby-small.png`): all six above y 396, Begin the walk below. **Pass.** Residual risk: at 360 x 640 the arch sits behind Begin the walk and the portrait touches the right edge (noted under F-032; not reopened).

## Concept checklists: independent R11 verdicts

Each builder session signed its own R2 checklist (`review/concepts/<id>.md`). R11 re-checked every box from this round's shots, the 320 px thumbnails (`stills/exhibit-thumbs.png`), the `stats()` records (triangles, `inBounds`) and the code (library materials by `useMaterial` calls, no lights, `Text` or `Html`, one `useExhibitClock` motion source per exhibit). Pixel-identity of reduced-motion frames (verafin box 8) and per-frame motion rules were not re-measured; they rest on the builders' unit tests and probes.

| Exhibit | R2 verdict | R11 verdict | Notes |
|---|---|---|---|
| verafin | PASS | **PASS** | Column beside a block of bars in the thumbnail; 2,732 triangles, in bounds; 5 materials; no detection imagery. |
| mysa | PASS | **PASS** | Slab, dial, key through ring; generic; 4 materials; 4,820 triangles, in bounds. |
| wailo | PASS | **PASS** | Phone, single arc from the envelope, blank tag; 6 materials; 2,598 triangles. |
| cfia | PASS | **PASS (marginal box 1)** | The thumbnail shows a rod, a pale stack and a dark box, but the box nearly merges with the case floor; see F-045. 1,116 triangles; 4 materials. |
| klarup | PASS | **PASS** | Five tiles on posts, three beads, blank crate; 3,036 triangles. |
| finance-tracker | PASS | **PASS** | Three stacks on one tray, no text; the brass stack reads brown (F-045, polish, not a box). 7,468 triangles. |
| sdsj | PASS | **PASS** | Round table with laptops facing in; 664 triangles; 4 materials. |
| mun | PASS | **PASS (with F-040)** | Every box holds (one brass tier at 7 months to graduation, ghosts above, die turn only, 2,676 triangles, MUN slot). The floating scaffold legs (F-040) are a D5 defect, not a checklist box; the die reads as a plate in the thumbnail. |
| certifications | PASS | **FAIL (box 6)** | Box 6 says the DOM shows the placeholder while dates and issuer are unknown; the DOM shows none (F-044). The release block itself holds (draft: true). Boxes 1 to 5 pass: the three emblems are distinguishable in the 320 px thumbnail (arch, cross, three blades), brass only, 3,924 triangles. |

R11 does not edit the checklists (R2's files); R0 decides whether F-044 is fixed in content (R1) or the box is amended.

## Findings re-checked

| Id | Sev | Status now | Evidence |
|---|---|---|---|
| F-038 | P1 | **fixed** | rail-input (g) door-on-wing-track test passes on desktop and pixel7 (0d291d9). |
| F-027 | P2 | **fixed** | No shaft crosses P1, P2 or V1; titles clear the case tops at the stop (F-M3). Dialog residual filed as F-042. |
| F-032 | P2 | **fixed** | Pixel 7 lobby framed under the hero (F-M3); 360 x 640 residual noted. |
| F-033 | P3 | **fixed** | Titles read as brass (F-M3). |
| F-020, F-021, F-022, F-023, F-036, F-037 | P1/P2 | fixed, hold | No regression in any shot. |

## New findings

| Id | Sev | Stop | Viewport | Summary |
|---|---|---|---|---|
| **F-039** | **P1** | finance-tracker (Pixel 7); klarup, finance-tracker, sdsj (360 x 640) | phone | Wing HUD drawn over the wall title. Fix and check in the gate section. |
| F-040 | P2 | mun | both | Scaffold legs float 13 cm above the plinth top outside the 0.6 m riser. |
| F-041 | P2 | mun | Pixel 7 (stop), desktop (dialog) | Wall title out of frame. |
| F-042 | P2 | klarup, finance-tracker, sdsj | desktop dialogs | Case top cuts the title's last line with the dialog open. |
| F-043 | P2 | certifications | both | Backing panel glows hot orange with hard edges. |
| F-044 | P2 | certifications | all | Checklist box 6: no placeholder for the unknown dates and issuer in the DOM. |
| F-045 | P3 | cfia, finance-tracker, sdsj, klarup | both | Small objects under-fill the case; brass stack reads brown. |
| F-046 | P3 | rail | desktop | Year ticks sit on stop dots (2025 on the volunteer door, 2023 on cfia). |

P0: 0. Open P1: 1 (F-039). Open P2: 5. Open P3: 2. New this round: 1 P1, 5 P2, 2 P3. Full evidence, expected results and checks: `review/findings.json` (field `g3r1` on each re-checked finding; the new ones carry `gate: "G3"`, `round: 1`).

## Copy check

No invented facts in any shot: card, dialog and curator's note text match `src/content/resume.ts` and CONTENT_DRAFT, and first-person copy is `draft: true` (RELEASE=1 check:copy lists them). The Verafin copy guard holds: the domain appears only as what the software supports. "[placeholder: target roles]" on the desk card is expected. No phone number in any shot.

## Top 5 strengths

1. **wailo is the new high-water mark** (`wailo-desktop.png`, 4.08): an object that tells its story at a glance, and the first main stop with a faint pool ahead.
2. **Desktop wing rooms are clean** (`klarup-desktop.png`, `sdsj-desktop.png`, 4.00): calm glow arches, no shafts across titles, HUD clear.
3. **One vocabulary across nine builders**: walnut trays, bone ceramic, brass and a single teal accent everywhere, every exhibit in bounds and under 7,500 triangles (`stills/exhibit-thumbs.png`).
4. **The phone lobby finally shows the gallery** (`lobby-pixel7.png`, 3.25 to 3.58) without touching the fast path.
5. **Story sheets are uniform and legible** on all nine exhibits on both viewports.

## Top 5 problems

1. **F-039 (P1)**: phone wing HUD over the wall titles (`finance-tracker-pixel7.png`, `stills/sdsj-360x640.png`).
2. **mun is the weakest stop** (3.37): floating scaffold (F-040, `stills/mun-scaffold-crop.png`), title missing on the phone (F-041), die lost in the thumbnail.
3. **Object read (D6 3.55, the lowest dimension)**: cfia, finance-tracker, sdsj and klarup under-fill their cases (F-045).
4. **Certifications mood** (D1 3): the hot backing panel (F-043), plus the checklist box 6 gap (F-044).
5. **Dead space at main-aisle stops** (D1): the left half of verafin and mysa is a void with no pool ahead; volunteer-door still crops a neighbouring case.

## Stills (committed, 1.8 MB)

`review/runs/2026-10-21-g3r1/stills/`, one line each. The first five are proposed as G3 references for the new exhibits (Emeka's approval); the rest are finding evidence.

| File | Viewport, tier | Role |
|---|---|---|
| `stills/wailo-desktop.png` | desktop, high | Reference: the best main exhibit stop, case on the point with a faint pool ahead. |
| `stills/klarup-desktop.png` | desktop, high | Reference: the wing exhibit stop after F-027, glow arch and clean title. |
| `stills/mysa-pixel7.png` | Pixel 7, medium | Reference: the phone exhibit stop for the new exhibits. |
| `stills/lobby-pixel7.png` | Pixel 7, medium | Reference: the phone arrival after F-032. |
| `stills/exhibit-thumbs.png` | 320 px grayscale | Reference: D6 thumbnails of all nine exhibits side by side. |
| `stills/finance-tracker-pixel7.png` | Pixel 7, medium | F-039: the exit control over P2. |
| `stills/sdsj-360x640.png` | 360 x 640, medium | F-039: the wing HUD over V1 and SOFTWARE DEVELOPERS. |
| `stills/mun-scaffold-crop.png` | desktop, high (crop, 2x) | F-040: scaffold uprights ending in the air. |
| `stills/mun-pixel7.png` | Pixel 7, medium | F-041: no wall title in frame. |
| `stills/certifications-desktop.png` | desktop, high | F-043: the hot backing panel. |

## Next

R0 options: (a) a scoped F-039 fix (R4 framing with R6), re-verified by its check (rail-input (g) on pixel7 and 360 x 640, the probe at 0), then a G3 round 2 that also covers the P2s that land; or (b) take G3 to Emeka with F-039 as a known P1. On this evidence G3 is met once F-039 closes. Rounds left for M3: 2.
