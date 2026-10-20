# cfia: "The Ticket Spindle" (No. 04)

Spec: `docs/spec/EXPERIENCE.md` §4.4. Work package: `docs/wp/WP-21.md`. Concept checklist and R2 verdict: [`review/concepts/cfia.md`](../../../../review/concepts/cfia.md).

## Concept

Steady, methodical resolution of high-volume support tickets for a distributed team: where the career began. A brass desk spindle stands on a walnut box with a stack of paper tickets impaled on it, each with a blank graphite stamp in its corner. Every 6 s a new ticket slides down the spindle and the whole stack sinks one pitch into the box, so the visible count never changes. No counter, no number, no "RESOLVED" or any other text, no monitor, pin-light ring or figures. The case gets the warmest light in the building (age parameter 1); the warmth comes from the light, not from new colors.

## Object description (DOM, `exhibit.object`)

"Paper tickets settle one by one onto a brass desk spindle, each stamped in its corner: steady, methodical support for a distributed team."

## Slot and bounds

Standard slot (EXPERIENCE §5.3), local meters, origin at the plinth top center, +Z toward the stop camera: x and z in [-0.325, 0.325], y in [0.025, 0.675].

| Part    | Material          | Placement                                                                                                                                                          |
| ------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Box     | `walnut`          | RoundedBox 0.30 x 0.12 x 0.22, radius 0.01, center (0, 0.085, 0); y 0.025 to 0.145                                                                                 |
| Disc    | `brass`           | cylinder r 0.04, h 0.006 on the box top                                                                                                                            |
| Rod     | `brass`           | cylinder r 0.005, y 0.145 to 0.545                                                                                                                                 |
| Tip     | `brass`           | cone r 0.005, h 0.03, y 0.545 to 0.575                                                                                                                             |
| Tickets | `paper`           | 15 boxes 0.12 x 0.0025 x 0.08 (one InstancedMesh): 14 stacked from y 0.152 at a 0.006 pitch plus the falling one; seeded yaw within 12 degrees, offset within 4 mm |
| Stamps  | `ceramicGraphite` | 15 blank marks 0.035 x 0.0005 x 0.014 on each ticket's front right corner, turned 8 degrees (one InstancedMesh)                                                    |

Measured under `?test=1` (`stats().exhibits.cfia`): `inBounds: true`, 1,116 triangles, 6 draw calls. Overall box: x -0.15 to 0.15, y 0.025 to 0.575, z -0.11 to 0.11 (the falling ticket starts at y 0.52).

## Budget

`index.ts`: 2,000 triangles, 8 draw calls, 0 MB textures. Actual 1,116 triangles, 6 draw calls. Lazy chunk `TicketSpindle`: 1.67 KB gzip of the 40 KB limit.

## Materials

`walnut`, `brass`, `paper`, `ceramicGraphite` only, the shared instances from `useMaterial`. Nothing is cloned or mutated.

## Motion (one)

Driven only by `useExhibitClock()`; period 6 s. Each cycle rests 2.8 s; then the next ticket appears at y 0.52 (it grows in over 0.3 s, so it never pops) and descends onto the stack in 2.4 s (easeOutCubic); then the stack sinks one pitch in 0.8 s (easeInOutCubic) while the bottom ticket slips below the box top. Each ticket keeps its seeded yaw and offset for its whole life (seeded by its landing serial), so the stack never reshuffles. Instance matrices are written only while something moves, plus once per new rest.

**Reduced-motion and `?test=1` pose:** 14 tickets stacked, no falling ticket (reduced motion pins clock 0; `?test=1` freezes it there). Hover adds nothing (the kit's light lift).

## Files

- `index.ts`: the eager manifest (id, title, lazy loader, budget, `motion: 'slow'`).
- `TicketSpindle.tsx`: the lazy component (default export, `ExhibitProps`).
- `spindle.ts`: measurements, seeded ticket jitter, the motion and the matrix driver (pure, Node-tested).
- `spindle.test.ts`: heights, bounds through two cycles, stamp placement, the constant count, continuity and the driver.
