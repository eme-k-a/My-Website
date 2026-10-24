# sdsj: "The Round Table" (No. V1)

Spec: `docs/spec/EXPERIENCE.md` §4.8. Work package: `docs/wp/WP-23.md`. Concept checklist and R2 verdict: [`review/concepts/sdsj.md`](../../../../review/concepts/sdsj.md).

## Concept

Software Developers of St. John's, where Emeka is President: recurring monthly mini-hackathons that bring developers, designers and founders together to build. Six identical laptops face each other around a round walnut table on a brass pedestal; a small brass cube at the table center is the shared project. Their screens light in turn around the table. The laptop count is abstract (six, evenly spaced), not a head count. No people or avatars, no month ring or ticks, no "shipping" blocks, no stickers, logos or text.

The volunteer wing holds only this exhibit (F-035), so it stands on the far plinth spot and shows through the doorway (F-037).

## Object description (DOM, `exhibit.object`)

"Six laptops face each other around a round table, their screens lighting in turn: monthly mini-hackathons where developers, designers and founders build together."

## Slot and bounds

Standard slot (EXPERIENCE §5.3), local meters, origin at the plinth top center, +Z toward the stop camera: x and z in [-0.325, 0.325], y in [0.025, 0.675].

| Part             | Material                        | Placement                                                                                                                                                                                    |
| ---------------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foot disc        | `brass`                         | cylinder r 0.15, h 0.01, 48 segments, y 0.025 to 0.035 (on the slot floor)                                                                                                                   |
| Pedestal         | `brass`                         | cylinder r 0.03, h 0.30, 24 segments, open ended (both ends are covered), y 0.035 to 0.335                                                                                                   |
| Table top        | `walnut`                        | cylinder r 0.27 (diameter 0.54), h 0.025, 64 segments, y 0.335 to 0.36 (F-045); a `brass` rim band (open cylinder r 0.272, h 0.029, 128 triangles) wraps its edge                            |
| Shared project   | `brass`                         | cube 0.04 on the table center, y 0.36 to 0.40, static                                                                                                                                        |
| Laptop bases (6) | `ceramicGraphite`               | box 0.085 x 0.005 x 0.06, centers at radius 0.19 on the table top, azimuths 0, 60, ... 300 degrees (0 = +X, 90 = +Z); front edge at radius 0.16 toward the center, hinge edge at radius 0.22 |
| Laptop lids (6)  | `ceramicGraphite`               | box 0.085 x 0.06 x 0.004, back face on the hinge line (the base's back top edge), open 105 degrees (15 degrees past upright, leaning outward)                                                |
| Screens (6)      | `accentGlow`, one instance each | plane 0.075 x 0.05 centered on each lid's inner face, 0.5 mm off it, facing the table center                                                                                                 |

The twelve shell boxes (bases and lids) are one InstancedMesh of a unit box. Azimuth 0 (not 90) keeps a gap between the two front laptops, so the brass cube shows from the stop camera; the two back laptops' screens face the camera.

Measured under `?test=1` (`stats().exhibits.sdsj`, desktop and pixel7): `inBounds: true`, 792 triangles, 9 draw calls (MergeStatic). Overall box (analytic): x and z within the brass rim (radius 0.272), y 0.025 to about 0.424 (the lid tops).

## Budget

`index.ts`: 1,500 triangles, 12 draw calls, 0 MB textures. Actual: 792 triangles (top 256, rim 128, foot 192, pedestal 48, cube 12, shells 12 x 12, screens 6 x 2), 9 draw calls measured. Lazy chunk `RoundTable`: 1.70 KB gzip of the 40 KB limit.

## Materials

`walnut`, `brass`, `ceramicGraphite`, `accentGlow` only, from the kit hooks. Each screen calls `useMaterialInstance('accentGlow')` (a clone sharing the compiled program), so its own glow level never touches the shared material.

## Motion (one)

The screens light in turn, driven only by `useExhibitClock()`. Each laptop has a 2 s turn (period 12 s): at the start of its turn its screen eases from 0.25 up to 1.4 while the previous screen eases from 1.4 down to 0.25, over 0.8 s (easeInOutCubic, above the 0.5 s ramp floor of the glow rules); the rest of the turn holds. All other screens sit at 0.25. A screen's level is written only when it changes, so between hand-overs nothing changes.

**Reduced-motion and `?test=1` pose:** all six screens at 0.8. Reduced motion pins it whatever the clock says. With the clock at 0 (`?test=1`, tier low) the loop has not begun: for its first second the clock blends from the 0.8 rest pose into the loop, so the clock at 0 is the rest pose and the motion never starts with a jump. The 15 s idle stop freezes the loop mid-turn and resumes it without a jump (WP-16 ruling). Hover adds nothing (the kit's light lift).

## Files

- `index.ts`: the eager manifest (id, title, lazy loader, budget, `motion: 'slow'`).
- `RoundTable.tsx`: the lazy component (default export, `ExhibitProps`).
- `table.ts`: measurements, laptop placement and the glow timing (pure, Node-tested).
- `table.test.ts`: stacking, ring placement, facing, hinge, screens, bounds, timing and the rest pose.
