# Future improvements

The backlog of changes we plan to make after launch. R0 maintains it: add an item when Emeka asks for one or a review defers one, and move it to "Done" (with the commit or brief) when it ships. When an item is scheduled it becomes an `F-###` or `WP-xx` brief under `docs/wp/`; this file keeps the one-line status.

Last updated: 2026-11-15.

## Requested by Emeka

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | **KlarUp: a new exhibit object (the 3D artifact)** | Later (Emeka, 2026-11-15) | Today's object: five tiles climbing like a staircase that tick themselves off, three brass beads on the top step, and a small crate for the standalone Android build (`src/museum/exhibits/klarup/`, `review/concepts/klarup.md`). Emeka approved it on 2026-10-24 and now wants it redone. Before a brief: agree with Emeka what the new object should say. Owner R5 with R2. The exhibit rules still apply: one sculptural object, at most one slow motion, at most 20k triangles, the shared material library, no logos, the standard 0.65 m slot. |
| 2 | **Nasdaq Verafin: a new exhibit object (the 3D artifact)** | Later (Emeka, 2026-11-15) | Today's object: a frosted glass column feeding a six-by-six grid of bars that refreshes like a report, with three brass cartridges for the plugins (`src/museum/exhibits/verafin/`, `review/concepts/verafin.md`). A natural time is the January 2027 update, when Verafin moves to past tense and Emeka may have manager-cleared details (CONTENT_DRAFT §8). Same owners and rules as item 1. |

## Deferred by reviews

| Item | From | Notes |
|---|---|---|
| The left half of the desktop Verafin stop is still dark | F-052 (P3) | The ink-colored fog hides any light 45 m down the aisle. Needs a warmer fog and background, or a reframe of approved still 03. For the M7 monthly review. |
| The doors read as "a door with one case" | G4 round 2 (D4) | Showing the second Projects case through the doorway needs a slot move, and slots are frozen (contracts-v1). |
| The inner case is small at the phone doors | G4 round 2 (D6) | F-M5p found only 3% to gain without cutting the jambs. |
| Only the desk top shows above the desk card on short phones | F-060 follow-up | A larger gap pushes the end-wall title under the top buttons at 360 x 640. Options: a more compact desk card, or a smaller end-wall title on phones. |
| Dialog "Older" and "Newer" buttons: the spoken name differs from the visible label | F-057 (P3, R6 with R8) | WCAG 2.5.3 advisory. |
| One source for render budgets and vitals | WP-29 request (R8) | Drop the repeated assertions from `environment.spec.ts` and `fast-path.spec.ts`. |
| Lighthouse full-page screenshot setting | WP-29 request (R10) | Move `disableFullPageScreenshot` from the CI flag into `lighthouserc.cjs`. |

## Done

| Item | Shipped |
|---|---|
| The Projects wing camera looked at the end wall between KlarUp and Finance Tracker | F-059, `9641f51` (2026-11-15) |
| iOS Safari framed the front desk behind its card | F-060, `7ef4b7f` (2026-11-15) |
| The cross-browser job failed on Firefox's and WebKit's wording for the deliberately blocked museum download | F-058 (2026-11-15, on PR 1) |
