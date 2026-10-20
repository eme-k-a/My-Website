# klarup: "The Climb" (No. P1)

Spec: `docs/spec/EXPERIENCE.md` §4.5. Work package: `docs/wp/WP-22.md` (procedure of `docs/wp/WP-12.md`). Concept checklist and R2 verdict: [`review/concepts/klarup.md`](../../../../review/concepts/klarup.md).

## Concept

A gamified, collaborative task app where people hold each other accountable. Five bone ceramic tiles climb like a staircase on brass posts, each with a check mark of two glowing bars on its top; the checks tick themselves off one by one up the stairs. Three brass beads, the team, wait together on the top step and never move. The blank walnut crate with brass corner strips at the base is the standalone Android build shipped through Expo Application Services. No flame or fire, no hopping beads, no phone or app UI, no text on the crate.

## Object description (DOM, `exhibit.object`)

"Five tiles climb like a staircase and tick themselves off one by one, while three brass beads wait together on the top step: accountability as a team sport. The small crate at the base is the standalone Android build."

## Slot and bounds

Standard slot (EXPERIENCE §5.3), local meters, origin at the plinth top center, +Z toward the stop camera: x and z in [-0.325, 0.325], y in [0.025, 0.675].

| Part              | Material                            | Placement                                                                                                                           |
| ----------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Base tray         | `walnut`                            | RoundedBox 0.60 x 0.03 x 0.42, radius 0.008, center (0, 0.04, 0); top at y 0.055                                                    |
| Tiles (5)         | `ceramic`                           | RoundedBox 0.11 x 0.03 x 0.11, radius 0.01; tile i at (-0.22 + 0.11 i, 0.06 + 0.075 i, 0.10 - 0.05 i)                               |
| Posts (4)         | `brass`                             | open cylinder r 0.004, 8 segments, from the tray top to the underside of tiles 1 to 4, one InstancedMesh                            |
| Checks (5)        | `accentGlow`, one instance per tile | two bars 0.035 and 0.06 long, 0.008 square, at -45 and +45 degrees, flat on each tile top; vertex 0.042 in front of the tile center |
| Team (3 beads)    | `brass`                             | spheres r 0.018 in a touching row along the back of the top tile, behind its check (static), one InstancedMesh                      |
| Build crate       | `walnut`                            | cube 0.09 at (0.22, 0.10, 0.15), blank                                                                                              |
| Corner strips (4) | `brass`                             | 0.01 x 0.09 x 0.01 along the crate's vertical edges, 2 mm proud, one InstancedMesh                                                  |

Tile 0 is centered at y 0.06 as specified, so its underside (0.045) sits 1 cm into the tray: it is seated in the tray (top 2 cm proud) and has no post. Tiles 1 to 4 stand on posts. Recorded in `review/reports/WP-22.json` for R0.

Measured under `?test=1` (`stats().exhibits.klarup`): `inBounds: true`, 3,036 triangles, 20 draw calls. Overall box (analytic): x -0.300 to 0.300, y 0.025 to 0.411, z -0.210 to 0.210.

## Budget

`index.ts`: 4,000 triangles, 20 draw calls, 0 MB textures. Actual: 3,036 triangles (tray 556, tiles 5 x 236, posts 4 x 16, check bars 10 x 12, beads 3 x 352, crate 12, strips 4 x 12), 20 draw calls. Lazy chunk `Climb`: 1.75 KB gzip of the 40 KB limit.

## Materials

`walnut`, `ceramic`, `brass`, `accentGlow` only, from the kit hooks. Each check uses its own `useMaterialInstance('accentGlow')`, so each step lights on its own and the shared material never changes.

## Motion (one)

The climb, driven only by `useExhibitClock()`, one 10 s cycle: tile i's check eases (easeInOutCubic) from rest 0.1 to lit 1.4 over 0.5 s starting at 0.1 + 1.6 i s, so one lights every 1.6 s up the stairs and the last lands at 7.0 s; all five hold lit for 2 s; then all reset together over 1 s (9.0 to 10.0 s). The exhibit clock starts at 7.0 s into the cycle, inside the hold, so clock 0 is the all-lit pose and an idle stop or resume never jumps. Only the five emissive levels change; nothing moves.

**Reduced-motion and `?test=1` pose:** all five checks lit (`prefers-reduced-motion` pins clock 0; `?test=1` freezes the clock at 0). Hover adds nothing (the kit's light lift).

## Files

- `index.ts`: the eager manifest (id, title, lazy loader, budget, `motion: 'slow'`).
- `Climb.tsx`: the lazy component (default export, `ExhibitProps`).
- `climb.ts`: measurements, placements and the glow timeline (pure, Node-tested).
- `climb.test.ts`: staircase, supports, checks, beads, crate, bounds and timing.
