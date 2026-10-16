# F-M2: green CI after the M2a merge (F-011 to F-014)

## Goal
The M2a work packages (WP-11 to WP-16, WP-18) are merged and individually verified, but the CI `e2e` job fails on GitHub runners. Because the `deploy` job runs only after every CI job passes, there is no preview deploy yet. This pass makes CI fully green with `retries: 0`, so the first Netlify preview deploys. It also closes the three M2a follow-ups recorded in `docs/RULINGS.md`.

## Owner role
Fixer acting as R3, R4, R6, R7 and R8, one item at a time. For this pass only, R0 grants the paths named on each item.

## Evidence
CI run 27 (`1c63fd7`, https://github.com/eme-k-a/My-Website/actions/runs/38906794184) ran `e2e` for 25.0 min: 11 failed, 174 passed, 191 skipped. Every other job passed. Failing tests:
- [desktop] camera.spec.ts:245 (c): a wheel walk announces nothing; each ArrowDown arrival is announced once
- [desktop] quality.spec.ts:90 (b): frames stop 16 s after the last input
- [desktop] quality.spec.ts:118 (c): a forced context loss remounts the canvas and recovers
- [desktop] quality.spec.ts:154 (d): a second loss in the session falls back to the classic resume
- [desktop] rail-input.spec.ts:143 (a): a decaying wheel stream settles on a whole stop without skipping
- [desktop] rail-input.spec.ts:240 (e): walking every main stop never writes history
- [desktop] rail-input.spec.ts:262 (f): ArrowDown, and PageDown, each visit every main stop in order
- [desktop] rail-input.spec.ts:280 (f): ArrowDown twice lands on projects-door, three times on mysa
- [desktop] wings.spec.ts:159: scrolling through all 10 main stops never changes history
- [pixel7] quality.spec.ts:189 (g): no frame renders while the phone sheet is open

CI run 23 (`94c60ac`, WP-16 merged on its own) was fully green. The failures began once WP-11, WP-15 and WP-14 landed. Local runs in this container show the same walk-all-stops timeouts.

## Items

| ID | Owner | Paths | Fix | Acceptance |
|---|---|---|---|---|
| F-011 | R3 | `src/museum/Scene.tsx`, `src/museum/environment/**` | Move `QualityController` inside `MaterialsProvider` (2026-10-15 ruling), so the precompile warms the real library. | Unit tests and `quality.spec` pass. The precompile no longer builds a private library when a provider exists. |
| F-012 | R4 | `src/museum/rail/**` | CameraRig stops requesting frames once the camera reaches the pose for the current scroll progress (within an epsilon), including a scroll resting between stops. Gaze, framing, dolly, parallax and fade requests still render until they settle. | quality (b) passes. A new unit test proves `needsFrame` turns false at rest between stops. |
| F-013 | R6 | `src/app/**`, `src/overlay/**` (MuseumGate and its callers) | MuseumGate unmounts the canvas when the store's mode is `classic`. | An e2e or unit proof that switching to classic removes the `canvas` and frees the renderer (stats or listener count). |
| F-014 | R8, plus the owner of any app code at fault | `tests/**`, `playwright.config.ts`, and app files under the globs above | Make every listed CI failure pass on GitHub runners. First find each root cause: a real app bug, software-renderer slowness, or a test that measures the wrong thing. Fix app bugs in app code. Size walk-all-stops timeouts from timings measured on CI, and write the measurement in a comment. Apply the 10 s SwiftShader allowance to quality (c) and (d) (WP-16 ruling). Where the app itself is slow to settle, prefer making it settle faster over raising a timeout. | CI `e2e`, `a11y` and `visual` steps pass with `retries: 0` on two consecutive pushes. Then the `deploy` job succeeds and its summary shows the preview URL. |

## Rules for this pass
- Never skip, disable, quarantine, `.fixme` or `test.slow()`-and-forget a test. Never add retries. Never weaken an assertion's meaning to get green. A timeout may grow only with a measured reason.
- Frozen contracts (contracts-v1) stay frozen. Budgets in `perf/budgets.json` stay as they are.
- Local runs: `PORT=4180` (4173 and 4174 may have stale `serve-dist` processes; do not kill processes). Use `--workers=1` and targeted specs locally; GitHub CI is the authority for the full suite.
- **Push grant:** this fixer may push to `claude/intelligent-sagan-poq45q` (never another branch, never tags, never force) and read CI through the GitHub MCP tools (`mcp__github__actions_list`, `mcp__github__get_job_logs`, owner `eme-k-a`, repo `My-Website`). Run `npm run verify` and the affected specs before every push. Each push starts a CI run of about 25 minutes, so batch the fixes and avoid pushing just to probe.
- The deploy job prints only the preview URL. Never print, echo or commit the Netlify token or site id.

## Output
- Commits `fix(F-01x): ...`, each with trailer `WP: F-01x` and the attribution lines.
- `review/reports/F-M2.json`: for each failure, the root cause and the fix, with CI run ids as evidence, plus the preview URL.

## Size
M to L.
