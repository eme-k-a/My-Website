# F-G2c: Safe Sip readability from the G2 slice review (round 1)

## Goal
Close F-029 (P2) from `review/findings.json`: Safe Sip reads as a white can, and the lid, board and gimbal get lost. Make one silhouette ("a cup with a cut-away lid inside a brass gimbal") checkable from the 320 px grayscale thumbnail (D6 anchor 5). Use a lower-value cup so the lid and brass read, and a gizmo yaw arc that does not read edge-on from the stop camera.

## Owner role
Builder D (exhibit author) with R2 judgment. There is no context pack: read this brief, `review/concepts/safe-sip.md`, `src/museum/exhibits/safe-sip/README.md`, the rubric's D6 and the exhibit rules in CLAUDE.md (shared material library only, at most 20k triangles, no lights, inside the 0.65 m case).

## Owned globs
`src/museum/exhibits/safe-sip/**`, `review/concepts/safe-sip.md`, `review/reports/F-G2c.json`.

## Acceptance
The exhibit contract and the exhibit unit tests pass. The chunk stays at or under 40 KB gzip. A grayscale 320 px thumbnail (desktop and pixel7) reads as cup, lid and gimbal: put before/after pairs in `out/f-g2c/` and describe what changed. Copy stays `draft: true`.

## Output
Commits `fix(F-029): ...` with trailer `WP: F-029` and the attribution lines. `review/reports/F-G2c.json`.
