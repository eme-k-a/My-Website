# mun: "Work in Progress" (No. 05)

Spec: `docs/spec/EXPERIENCE.md` §4.9. Work package: `docs/wp/WP-21.md`. Concept checklist and R2 verdict: [`review/concepts/mun.md`](../../../../review/concepts/mun.md).

## Concept

The B.Eng in Computer Engineering at Memorial University of Newfoundland that every other exhibit rests on, still under construction until the expected May 2027 graduation. A graphite silicon die with brass pins, traces and core stands on a brass post inside a five-tier scaffold. Each brass tier is a year of study still ahead; the tiers already taken down stay as frosted glass outlines. No crest, logo, text, number, percentage or progress bar.

## Object description (DOM, `exhibit.object`)

"A silicon die stands inside a brass scaffold. Each brass tier is a year of study still ahead; the tiers already taken down remain as glass outlines. The degree is expected in May 2027."

## Slot and bounds

Large (MUN) slot (EXPERIENCE §5.3), local meters, origin at the top center of the 1.4 x 1.4 x 0.6 plinth, +Z toward the stop camera: x and z in [-0.55, 0.55], y in [0.10, 1.20].

| Part        | Material                              | Placement                                                                                                                                                                            |
| ----------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Base plate  | `walnut`                              | RoundedBox 0.60 x 0.03 x 0.60, radius 0.006, y 0.10 to 0.13                                                                                                                          |
| Post        | `brass`                               | cylinder r 0.02, y 0.13 to 0.53                                                                                                                                                      |
| Die         | `ceramicGraphite`                     | RoundedBox 0.36 x 0.035 x 0.36, radius 0.004, y 0.53 to 0.565; the die head leans 30 degrees toward the camera about the post top (F-045)                                            |
| Pins        | `brass`                               | 48 boxes 0.03 (radial) x 0.004 x 0.008, 12 per edge on a 0.025 pitch, 5 mm into the die edge (one InstancedMesh)                                                                     |
| Traces      | `brass`                               | 40 boxes 0.004 wide, 0.0015 high, 0.04 to 0.135 long on the die top: per edge a seeded three-line staircase bus plus one straight trace, core to pins (one InstancedMesh)            |
| Core        | `brass`                               | box 0.08 x 0.002 x 0.08 on the die top                                                                                                                                               |
| Scaffold    | `brass` (remaining tiers)             | 0.90 x 0.90 in plan, 5 tiers of 0.20 m from y 0.10 (the riser top) to 1.10; per tier 4 uprights, 4 top rails, X-bracing on the left and right faces; 0.012 m square rods (instanced) |
| Ghost tiers | `frostedGlass` instance, opacity 0.25 | the tiers already taken down, same rods (instanced)                                                                                                                                  |

The X-bracing is on the side faces (x = +-0.45), so the front stays open and the die reads from the stop camera.

Measured under `?test=1` (`stats().exhibits.mun`): `inBounds: true`, 2,676 triangles, 8 draw calls. Overall box: x and z -0.456 to 0.456, y 0.10 to 1.106.

## Tier state

`tiersRemaining = clamp(ceil(monthsUntilGraduation / 12), 0, 5)` (`tiers.ts`), from `entry.graduation` and the global `__BUILD_DATE__` only, never stored. The remaining tiers are the bottom ones; removal goes from the top down. At the 2026-10 build: 7 months, so 1 brass tier and 4 ghosts. After graduation all 5 tiers are ghosts.

## Budget

`index.ts`: 4,000 triangles, 10 draw calls, 0 MB textures. Actual 2,676 triangles, 8 draw calls. Lazy chunk `WorkInProgress`: 2.20 KB gzip of the 40 KB limit.

## Materials

`walnut`, `brass`, `ceramicGraphite` (shared instances) and one `useMaterialInstance('frostedGlass')` clone at opacity 0.25 for the ghost tiers (a uniform change; same program).

## Motion (one)

The die (body, pins, traces, core) turns on its post about its own axis, which leans 30 degrees toward the stop camera so the face reads (`dieFrame`), one revolution per 40 s, driven only by `useExhibitClock()`: yaw = 30 degrees + 360 degrees x t / 40. The post, plate and scaffold never move.

**Reduced-motion and `?test=1` pose:** die at 30 degrees yaw (reduced motion pins it whatever the clock; `?test=1` freezes the clock at 0, which is the same pose).

## Files

- `index.ts`: the eager manifest.
- `WorkInProgress.tsx`: the lazy component (default export, `ExhibitProps`).
- `chip.ts`: measurements, pins, the seeded trace pattern, scaffold rods and the die yaw (pure, Node-tested).
- `tiers.ts`, `tiers.test.ts`: the tier formula (1 at 2026-10, 0 at 2027-06, 5 when five or more years away).
- `chip.test.ts`: heights, pins, trace lengths and spacing, scaffold layout, bounds at every yaw, motion.
