# finance-tracker: "The Balance" (No. P2)

Spec: `docs/spec/EXPERIENCE.md` §4.6. Work package: `docs/wp/WP-22.md` (procedure of `docs/wp/WP-12.md`). Concept checklist and R2 verdict: [`review/concepts/finance-tracker.md`](../../../../review/concepts/finance-tracker.md).

## Concept

Income, expenses and a budget kept in balance in one full-stack app. Three coin stacks stand on a walnut ledger tray: Income in brass, Expenses in graphite ceramic, Budget in frosted glass. They differ only by material. Every 6 s they rebalance to a new seeded set of counts, and Expenses never exceeds the Budget, which never exceeds Income. The language-model analysis lives in the story text, not in 3D: no speech bubble, text, labels, currency symbols or chart. The counts are seeded design noise, never data.

## Object description (DOM, `exhibit.object`)

"Three coin stacks, income in brass, expenses in graphite and the budget in frosted glass, rise and fall but always stay in balance."

## Slot and bounds

Standard slot (EXPERIENCE §5.3), local meters, origin at the plinth top center, +Z toward the stop camera: x and z in [-0.325, 0.325], y in [0.025, 0.675].

| Part           | Material          | Placement                                                                        |
| -------------- | ----------------- | -------------------------------------------------------------------------------- |
| Stand          | `walnut`          | box 0.48 x 0.16 x 0.22, center (0, 0.105, 0); y 0.025 to 0.185 (F-045)           |
| Ledger tray    | `walnut`          | RoundedBox 0.56 x 0.03 x 0.30, radius 0.008, center (0, 0.20, 0); top at y 0.215 |
| Income stack   | `brass`           | x -0.17, z 0; 24-coin InstancedMesh                                              |
| Expenses stack | `ceramicGraphite` | x 0, z 0; 24-coin InstancedMesh                                                  |
| Budget stack   | `frostedGlass`    | x +0.17, z 0; 24-coin InstancedMesh                                              |

Each coin is a cylinder r 0.065, h 0.011, 24 segments (96 triangles). A stack holds 8 to 24 coins; a full stack tops out at y 0.479. Each mesh always draws all 24 instances: absent coins are scaled to zero at the stack top, so the measured triangle count is always the maximum-count one.

Measured under `?test=1` (`stats().exhibits['finance-tracker']`): `inBounds: true`, 7,480 triangles (at the maximum coin count), 5 draw calls. Overall box (analytic): x -0.280 to 0.280, y 0.025 to 0.479 at most, z -0.150 to 0.150.

## Budget

`index.ts`: 8,000 triangles, 6 draw calls, 0 MB textures. Actual: 7,480 triangles (tray 556, stand 12, coins 3 x 24 x 96), 5 draw calls (stand, tray and one per stack). Lazy chunk `Balance`: 1.41 KB gzip of the 40 KB limit.

## Materials

`walnut`, `brass`, `ceramicGraphite`, `frostedGlass` only, the shared instances from the kit hooks; nothing is cloned or mutated.

## Motion (one)

The rebalance, driven only by `useExhibitClock()`. Every 6 s (from t = 6 s) the stacks move from seeded set k - 1 to set k. Each stack's integer count is floor(from + (to - from) u), where u is one shared easeInOutCubic progress over 1.2 s; whenever that count passes a coin, the coin scales in (or out) at the top over 200 ms. Coins are stacked on the scaled coins below them, so a stack never shows a gap. The move ends 1.4 s into the cycle.

The invariant holds at every frame: a blend of two ordered sets with one shared u stays ordered, floor keeps the order, and a stack's visible height is the mean of its integer count over the last 200 ms, which keeps it too. `counts.test.ts` checks it over 500 moves at 240 frames a second.

Seeded sets (`countsFor(k)`, mulberry32 per set): Income in [14, 24], Expenses in [8, Income - 3], Budget strictly between. Instance matrices are written only during a move, plus once when the held set changes.

**Reduced-motion and `?test=1` pose:** set 0, Income 20, Expenses 14, Budget 17 (a design pose, not data). `prefers-reduced-motion` pins set 0; `?test=1` freezes the clock at 0, which is set 0. Hover adds nothing.

## Files

- `index.ts`: the eager manifest (id, title, lazy loader, budget, `motion: 'slow'`).
- `Balance.tsx`: the lazy component (default export, `ExhibitProps`).
- `counts.ts`: measurements, seeded count sets, coin scales and the rebalance driver (pure, Node-tested).
- `counts.test.ts`: 1,000 seeded sets, the every-frame invariant, coin timing, geometry and the driver.
