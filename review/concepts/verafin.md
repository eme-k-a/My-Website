# Concept checklist: verafin

| Field | Value |
|---|---|
| Exhibit id | `verafin` |
| Artwork title | "The Reporting Engine" (No. 01) |
| EXPERIENCE section | §4.1 |
| Builder WP | WP-12 |
| Status | pending |
| Reviewer | R2 (Art Director) |

Process: `docs/ART_DIRECTION.md` §8. Every box must pass; R2 checks a box (`- [x]`) only with evidence. The first box is judged on the 320 px grayscale thumbnail of the desktop stop screenshot (rubric D6, `docs/ART_DIRECTION.md` §7).

## Reference (from EXPERIENCE §4.1)

- **Materials:** walnut, frostedGlass, accentGlow, brass, ceramic.
- **Motion (one):** the report refreshes. Every 8 s the 36 bar heights ease to the next seeded set over 1.6 s (easeInOutCubic), sweeping left to right with a 40 ms stagger per column. Period 8 s. Column, core, collar and cartridges are static.
- **Reduced-motion pose:** bars frozen at seeded set 0.
- **Object description (DOM):** "A frosted glass column feeds a six-by-six grid of bars that refreshes like a report. Three brass cartridges docked in the column are the plugins that extend it."
- **Copy guard:** nothing here, in 3D or in copy, may suggest Emeka builds fraud detection or AML models. The domain appears only as what the platform supports.

## Checklist (verbatim from EXPERIENCE §4.1)

- [ ] In a 320 px grayscale thumbnail it reads as one object: a tall column beside a stepped block of bars.
- [ ] Exactly one motion (the 8 s refresh); column, core, collar and cartridges never move.
- [ ] Exactly 3 cartridges, all touching the collar; nothing floats.
- [ ] No detection imagery: no red or amber bars, no highlighted or flagged bar, no alert icon, no magnifying glass, no particles or streams.
- [ ] No axis labels, numbers or text anywhere.
- [ ] Bounding box inside the standard slot; triangles ≤ 20k.
- [ ] Only the five listed library materials.
- [ ] Reduced-motion and `?test=1` frames are pixel-identical over 3 s.

## Verdict

| Field | Value |
|---|---|
| Result (PASS or FAIL) | |
| Date | |
| Screenshot path | |
| Thumbnail path (320 px grayscale) | |
| Notes | |
| Signed | |
