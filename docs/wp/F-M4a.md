# F-M4a: exhibit read, grounding and framing for G4

## Goal
The G3 review (round 1, `review/runs/2026-10-21-g3r1/`) averaged 3.78. Gate G4 needs an average of at least 4.0 with no dimension below 3.5. The weakest dimensions are D6 object read (3.56), D1 mood (3.67, WP-26's job), D2 framing and D5 craft (3.77 each). This pass closes the G3 findings that live in the exhibits, the camera framing and the content: F-040, F-041, F-042, F-044 and F-045. Mood, brass color and the certifications backing panel (F-043) belong to WP-26; the phone card and the rail ticks (F-046) belong to WP-27.

## Owner role
Fixer acting as R5 (exhibits), R4 (rail), R3 (only the riser parts of the anatomy kit) and R1 (one content field), one item at a time. For this pass only, R0 grants the paths named on each item. No context pack: read this brief, `review/findings.json` for each id, the G3 scorecard, `review/concepts/<id>.md` for each exhibit you touch, EXPERIENCE §4 (that exhibit's section), §5.3 (slots) and §5.4 (labels), ARCHITECTURE §7 (exhibit kit) and the end of `docs/RULINGS.md` from "M3 decisions" on.

## Items

| ID | Owner | Paths | Fix | Check |
|---|---|---|---|---|
| F-040 | R5 with R3 | `src/museum/exhibits/mun/**`, the riser parts of `src/museum/exhibits/_kit/anatomy.ts` | The MUN scaffold uprights end 13 cm above the plinth top, outside the 0.6 m riser. Ground them: either the riser spans the scaffold footprint, or the uprights land on the riser. Keep the frozen MUN slot contract. | A unit test proves every upright's bottom is within 2 mm of the surface under it. Capture mun on desktop and pixel7. |
| F-041 | R4 | `src/museum/rail/framing.ts` and its tests | The MUN wall title (left wall, x -5.99) is out of frame at the pixel7 stop and in the desktop dialog. Frame the MUN stop and its dialog so the title is in view, as every other exhibit is, without moving the case off its framing point by more than the D2 tolerance. | The title's projected box lies inside the viewport at the mun stop on pixel7 and in the mun dialog on desktop (an e2e check next to rail-input (g), or a framing unit test that projects the title). |
| F-042 | R4 | `src/museum/rail/CameraRig.tsx`, `src/museum/rail/framing.ts` and their tests | In the wing story dialogs on desktop (klarup, finance-tracker, sdsj), the dialog dolly lifts the case top over the wall title's last line. Keep the whole title clear of the case in the dialog pose; main-aisle dialogs must not change. | An e2e or unit check that the title's bottom projects above the case top in all three wing dialogs. Captures of the three dialogs. |
| F-045 | R5 with R3 | `src/museum/exhibits/cfia/**`, `finance-tracker/**`, `sdsj/**`, `mun/**`, the riser parts of `_kit/anatomy.ts` | Small objects under-fill the 0.85 m case and read weakly in the 320 px grayscale thumbnail (D6 3 at cfia and mun; finance-tracker and sdsj sit low). Lift them toward the middle of the case (a walnut riser or a taller base from the kit), or scale them up within the slot bounds, and give the main silhouette stronger value contrast against the case floor. For mun, make the die read in the thumbnail. Keep each concept, its single motion and its checklist boxes (`review/concepts/<id>.md`); stay within the slot bounds, 20k triangles and the shared material library. **Do not change klarup**: Emeka approved its staircase and checks on 2026-10-24. | Before and after 320 px grayscale thumbnails of the four exhibits. The exhibit-contract and exhibits specs pass (bounds, triangles, one motion). The draw-call budget still passes at every stop. |
| F-044 | R1 | `src/content/resume.ts` (the certifications entry only) | Certifications checklist box 6: while the dates and the Tech Stewardship issuer are unknown, the DOM shows a `[placeholder: ...]` for them in the certifications exhibit (card or dialog). Print stays as it is: `dist/resume.pdf`, `/resume/` and `resume/resume.tex` do not show placeholders, unless the schema forces it, in which case report why. | `dist/exhibit/certifications/index.html` contains the placeholder. `RELEASE=1 npm run check:copy` lists it. The PDF gate still passes on one page. |

## Rules for this pass
- Parallel sessions own other paths; do not edit them:
  - WP-26: `src/museum/environment/**`, `src/museum/Scene.tsx`, `src/museum/MuseumCanvas*`, `src/design/**`, `src/museum/materials/**`, `docs/ART_DIRECTION.md`.
  - WP-27: `src/overlay/**` (except `ScrollTrack*`), `src/app/App*`, `src/app/global.css`, `index.html`, `tests/e2e/mobile.spec.ts`.
  - WP-28: `public/fonts/**`, `src/design/fonts.css`, `src/museum/exhibits/_kit/fonts.ts`, `scripts/prerender.ts`, `scripts/check-glyphs*`, `scripts/subset-fonts*`, `perf/**`, `tests/e2e/transfer.spec.ts`.
- Test grant: small additions to `tests/e2e/rail-input.spec.ts`, `tests/e2e/dialog.spec.ts` and `tests/e2e/exhibits.spec.ts` for the checks above. Never skip, weaken or add retries to a test.
- Docs grant: if an exhibit's dimensions change, update that exhibit's numbers in EXPERIENCE §4 in the same commit.
- Frozen contracts (contracts-v1) stay frozen, including slot bounds and the exhibit props. Budgets stay as they are. No new materials and no lights in exhibits.
- Never invent facts: F-044 adds placeholders, not dates or issuers.
- Visual baselines come only from CI. List the stops and dialogs whose screenshots change in the report.

## Acceptance
- Every check in the table passes.
- `npm run verify`, `npm run build`, `npm run check:budgets` and `npm run check:glyphs` pass.
- The exhibit-contract, exhibits, greybox, rail-input, dialog and wings specs pass on desktop and pixel7.

## Output
- Commits `fix(F-0xx): ...`, one or more per item, each with trailer `WP: F-0xx` and the attribution lines.
- `review/reports/F-M4a.json`: per item, the change, the evidence (captures, thumbnails, test names) and any EXPERIENCE edits.

## Size
M.
