# Review rubric and scoring protocol (R11)

The rubric itself is `docs/ART_DIRECTION.md` section 7: six dimensions, D1 to D6, scored 1 to 5 with anchors at 1, 3 and 5. This file does not restate the anchors; it records how R11 applies them, so every round is scored the same way.

| Dim | Name | Judged from |
|---|---|---|
| D1 | Gallery mood | the stop shot |
| D2 | Composition and framing | the stop shot (framing point: 62% of the width on desktop, 36% of the height on phone) |
| D3 | Legibility | the stop shot, plus the dialog shot for exhibits |
| D4 | Story clarity | the stop shot read against the card and EXPERIENCE section 4 |
| D5 | Craft consistency | the stop shot, compared with the other stops of the same round |
| D6 | Object read | desktop: the 320 px grayscale thumbnail of the desktop shot; Pixel 7: the Pixel 7 shot at reduced size |

## Capture

- Deterministic build: `npm ci && npm run build`, served by the Playwright web server (`npm run preview`, never `vite preview`). URLs carry `?test=1&mode=museum` (frozen clock, seeded noise, DPR 1, no idle motion).
- Desktop: Playwright project `desktop` (1440 x 900) at `CAPTURE_TIER=high`. Most desktop visitors get high, and SwiftShader at medium is not what they see.
- Phone: Playwright project `pixel7` (412 x 839 CSS px) at the default tier, medium.
- Tool: `tests/e2e/capture.spec.ts` (`@capture`, `CAPTURE_DIALOGS=1`) until WP-34 ships `npm run review`. Output goes to `review/runs/<YYYY-MM-DD>-<label>/`: `<stop>-<project>.png` and `.json` (the `__MUSEUM__.stats()` record) for each stop, plus `<stop>-dialog-<project>.png`. PNGs are gitignored; JSON and scorecards are committed.
- D6 thumbnails: `sharp(<stop>-desktop.png).resize(320).grayscale()` saved as `<stop>-thumb.png` in the run folder.
- The committed CI baselines (`tests/e2e/__screenshots__/visual.spec.ts/`) are read as a cross-check. They are tier medium on both projects and mask the canvas in dialog shots, so they never replace the capture.

## Scoring

1. Every cell (stop x D1 to D6 x desktop and Pixel 7) gets a score from 1 to 5 in half points, a one-line reason, and the screenshot path it rests on. A score without a path does not count.
2. Scores are relative to the anchors, never absolute: 3 means the 3 anchor describes the shot; 4 means it is clearly past the 3 anchor but misses at least one clause of the 5 anchor; 5 means every clause of the 5 anchor holds.
3. Copy that is draft or a `[placeholder: ...]` is not scored as a defect. Copy that invents facts about Emeka or overstates the Verafin work is a P0.
4. Stops outside the round's scope (for G2: `mysa`, a placeholder) are captured for context and may carry findings, but are not scored and do not enter the averages.
5. Dialogs are reviewed for D2 and D3 and may carry findings. They are not a separate row in the averages; a dialog defect is filed as a finding against its stop.
6. A round is compared with the previous scorecard and with the approved reference stills in `docs/ART_DIRECTION.md` section 10; the scorecard says what moved and why.

## Averages

All averages are plain arithmetic means of the half-point scores, reported to two decimals and never rounded up:

- per stop and viewport: the mean of its six scores;
- per stop: the mean of its twelve scores (both viewports);
- per dimension: the mean over all scored stops, for each viewport and for both together;
- per viewport: the mean of all its scores;
- overall: the mean of every scored cell (for G2: 6 stops x 6 dimensions x 2 viewports = 72 cells).

Gate G2 needs an overall average of at least 3.5, no open P0 or P1, and Emeka's approval of the reference stills and the preview. The improvement loop stops after two consecutive rounds with no new P0 or P1, at most two new P2 and averages of at least 4.0 (PLAN section 6).

## Severities

| Severity | Meaning | Examples |
|---|---|---|
| P0 | Broken or inaccessible | a stop that does not render, text under 4.5:1, content that exists only in WebGL, invented facts, detection imagery for Verafin, a phone number |
| P1 | Visibly wrong or over budget | the stop's object hidden by the card, text drawn over text, labels cut by the viewport or covered by the HUD, a tier that changes the room's character, a budget exceeded |
| P2 | Polish | an artifact or composition issue that a careful visitor notices but that does not break the stop |
| P3 | Idea | a taste suggestion; never blocks a gate |

## Findings

Each finding goes in `review/findings.json` as `{ id, severity, stop, viewport, path, evidence, expected, check, status, round }` (plus an optional `title`). `path` is the repo path most likely responsible, so R0 can scope an `F-###` brief to its owner. `check` says how the fix is verified. Ids continue the project-wide `F-###` sequence (F-001 to F-019 were filed by R0 before WP-19). A finding reopened twice becomes a taste call for Emeka; at most three rounds run per milestone.
