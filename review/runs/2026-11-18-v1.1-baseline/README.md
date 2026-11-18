# v1.1 museum comparison set

Compare each implementation PR with the corresponding view below. The source is the production build of `09f75f19d3f79ae9b0e2ecd373f12accd3ef0618`, with `BUILD_DATE=2026-11-18`. This commit adds the roadmap to stable v1.0.0; the museum still has nine artifacts. Captures use Chromium 141 (Playwright 1.56.1), SwiftShader, medium tier, frozen exhibit clock and DPR 1. Viewport dimensions are CSS pixels.

| View | Desktop mouse 1440 x 900 | Touch portrait 393 x 851 | Touch short 360 x 640 | Touch landscape 851 x 393 |
| --- | --- | --- | --- | --- |
| Entry ticket | [desktop](desktop/lobby.jpg) | [portrait](portrait/lobby.jpg) | [short](short/lobby.jpg) | [landscape](landscape/lobby.jpg) |
| Work aisle | [desktop](desktop/verafin.jpg) | [portrait](portrait/verafin.jpg) | [short](short/verafin.jpg) | [landscape](landscape/verafin.jpg) |
| Verafin story | [desktop](desktop/story.jpg) | [portrait](portrait/story.jpg) | [short](short/story.jpg) | [landscape](landscape/story.jpg) |
| Projects threshold | [desktop](desktop/projects-door.jpg) | [portrait](portrait/projects-door.jpg) | [short](short/projects-door.jpg) | [landscape](landscape/projects-door.jpg) |
| Volunteer threshold | [desktop](desktop/volunteer-door.jpg) | [portrait](portrait/volunteer-door.jpg) | [short](short/volunteer-door.jpg) | [landscape](landscape/volunteer-door.jpg) |
| Foundations | [desktop](desktop/mun.jpg) | [portrait](portrait/mun.jpg) | [short](short/mun.jpg) | [landscape](landscape/mun.jpg) |
| Front desk | [desktop](desktop/desk.jpg) | [portrait](portrait/desk.jpg) | [short](short/desk.jpg) | [landscape](landscape/desk.jpg) |
| Classic résumé | [desktop](desktop/classic.jpg) | [portrait](portrait/classic.jpg) | [short](short/classic.jpg) | [landscape](landscape/classic.jpg) |

## Reproduce on a candidate

1. Build the production site with the same build date and pinned Node/Chromium versions, and run the repository's production preview on port 4173.
2. From the repo root run `node review/runs/2026-11-18-v1.1-baseline/capture.mjs /tmp/museum-candidate`. Set `BASE_URL` to use a different preview. The script visits named stops through the deterministic test hook; it opens the story with a desktop click or emulated touch. This set compares settled views; use the keyboard and browser smoke suites to test navigation behavior.
3. Compare matching files at their original viewport sizes. Check ticket visibility, object silhouette and caption, story framing, both wing entrances, desk actions, and the résumé exit. Document intentional changes in the PR. Preserve the original reference images.

## Artifact and render measurements

Each viewport directory includes measurements.json for all nine artifacts. The object fields are measured by the existing exhibit contract after reveal: triangles, object draw calls, and whether geometry fits the slot and triangle allowance. The scene fields are the renderer's last completed frame, including surrounding cases. These samples compare scene complexity; emulated touch and software rendering cannot establish physical-phone frame rate, battery use or thermal performance.

Allowed object boxes in slot-local metres, in x/y/z order, from [layout.ts](../../../src/museum/rail/layout.ts):
- Standard (Verafin, Mysa, Wailo, CFIA, KlarUp, Finance Tracker, SDSJ): min (-0.325, 0.025, -0.325), max (0.325, 0.675, 0.325).
- Wide (Memorial): min (-0.55, 0.10, -0.55), max (0.55, 1.20, 0.55).
- Wall (Certifications): min (-0.325, -0.325, 0.05), max (0.325, 0.325, 0.25).

Desktop reference at each settled artifact stop:

| Exhibit | Object triangles | Object draws | Scene triangles | Scene draws | Within bounds and allowance |
| --- | ---: | ---: | ---: | ---: | --- |
| verafin | 2732 | 5 | 10604 | 52 | True |
| mysa | 4820 | 7 | 10036 | 35 | True |
| wailo | 2598 | 7 | 14816 | 61 | True |
| cfia | 1116 | 6 | 11450 | 39 | True |
| klarup | 3052 | 8 | 16480 | 31 | True |
| finance-tracker | 7480 | 5 | 12216 | 19 | True |
| sdsj | 792 | 9 | 7164 | 35 | True |
| mun | 2676 | 8 | 22602 | 59 | True |
| certifications | 3924 | 7 | 7938 | 20 | True |

## Verification

- Production client/SSR build, prerender, PDF generation, bundle budgets and copy checks passed. The entry and museum chunks measured 95.87 and 324.40 KB gzip, against limits of 110 and 350 KB.
- Release-mode PDF suite: 10 passed, including the one-page requirement.
- Desktop smoke and keyboard journey: 23 outcomes as expected. This includes intentional guard failures and the keyboard-only tour that opens each story, closes it with Escape and checks restored focus.
