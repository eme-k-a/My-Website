# F-G2b: camera and overlay fixes from the G2 slice review (round 1)

## Goal
Close the camera and overlay findings from the WP-19 slice review: `review/runs/2026-10-17-g2/scorecard.md` and `review/findings.json` (F-020, F-021, F-028, F-030, F-034).

## Owner role
R4 Camera and R6 Overlay. There is no context pack: read this brief, the end of `docs/RULINGS.md`, each finding's `expected` and `check` in `review/findings.json`, and the cited sections of EXPERIENCE and ARCHITECTURE.

## Items (each finding's `check` field is its acceptance test)
- **F-020 (P1):** on the phone desk stop, the desk is hidden behind the card. Use a desk-specific portrait framing point or a lower look-at (`src/museum/rail/framing.ts`), or a shorter phone desk card. `screenPos('desk')` must sit above the card's top.
- **F-021 (P1):** in the desktop story dialog, the HUD, rail and wing controls show through the panel. While a story is open on desktop, hide them or cover them (using `openId` or `html[data-sheet='open']`). Add an e2e assertion.
- **F-028 (P2):** desktop dialog framing puts the case under the card or the panel edge. With a story open, the object must be fully visible left of the panel.
- **F-030 (P2):** gallery pages do not declare `color-scheme: dark` (`src/app/global.css`).
- **F-034 (P3, optional):** on phones the year chip disagrees between door and wing, and the desk shows 2022 (`Hud.tsx`).

## Owned globs
`src/museum/rail/**`, `src/overlay/**`, `src/app/**` (CSS and the HUD only; the route table, history transitions and test ids stay frozen), and `tests/e2e/**` only for the new F-021 assertion and specs your changes break. Plus `review/reports/F-G2b.json`.

## Forbidden
The standard list. Frozen contracts (contracts-v1) stay frozen. No changes to `src/museum/environment/**` or exhibit folders.

## Commands
`npm run verify`, `npm run build`, the camera, dialog, keyboard and history specs on desktop and pixel7, and captures (`tests/e2e/capture.spec.ts`, `CAPTURE_DIALOGS=1`). Look at your captures with the Read tool. Visual baselines will change; R0 regenerates them in CI.

## Output
Commits `fix(F-0xx): ...` with trailer `WP: F-0xx` and the attribution lines. `review/reports/F-G2b.json` with before/after evidence.
