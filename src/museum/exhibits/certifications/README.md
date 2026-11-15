# certifications: "The Medal Cabinet" (No. 06)

Spec: `docs/spec/EXPERIENCE.md` §4.10. Work package: `docs/wp/WP-21.md`. Concept checklist and R2 verdict: [`review/concepts/certifications.md`](../../../../review/concepts/certifications.md).

## Concept

Three credentials: AWS Certified Cloud Practitioner, Tech Stewardship Practice Program, and Tech Stewardship for the Energy Transition. Three brass medallions hang in a row from a brass rail in the wall vitrine, each with its own generic relief emblem: a cloud, a compass rose, a turbine. No issuer logo, official badge image or text; the names, dates and issuers live in the DOM card (dates and issuers are still `[placeholder: ...]` in content, and nothing in 3D depends on them).

## Object description (DOM, `exhibit.object`)

"Three brass medallions hang in a wall cabinet: a cloud for AWS Certified Cloud Practitioner, a compass rose for the Tech Stewardship Practice Program, and a turbine for Tech Stewardship for the Energy Transition."

## Slot and bounds

Wall vitrine slot (EXPERIENCE §5.3), local meters, origin at the center of the vitrine's back panel, +Z out of the wall toward the visitor: x and y in [-0.325, 0.325], z in [0.05, 0.25]. The kit's `ExhibitFrame` turns the slot so local +Z faces the aisle.

| Part       | Material | Placement                                                                                            |
| ---------- | -------- | ---------------------------------------------------------------------------------------------------- |
| Rail       | `brass`  | cylinder r 0.004, 0.60 long along x, at y 0.24, z 0.08                                               |
| Standoffs  | `brass`  | two cylinders r 0.006 at x +-0.27, from z 0.05 (the slot's back face) to the rail axis               |
| Straps     | `brass`  | 0.012 x 0.07 x 0.002, from the rail axis down to each medallion's top edge                           |
| Medallions | `brass`  | discs r 0.095, thickness 0.012, 48 segments, centers (-0.21 / 0 / 0.21, 0.075, 0.08), face toward +Z |
| Rims       | `brass`  | torus r 0.088, tube 0.004, on each face (4 mm proud)                                                 |
| Emblem 1   | `brass`  | cloud: three overlapping low cylinders (r 0.024, 0.032, 0.022) on a flat base bar 0.108 x 0.016      |
| Emblem 2   | `brass`  | compass rose: four faceted diamonds 0.022 wide, 0.072 long, tips on the axes                         |
| Emblem 3   | `brass`  | turbine: three blades (0.022 x 0.064) on a hub r 0.014, one blade up                                 |

All emblem parts are 4 mm relief (3.6 to 4.5 mm, so overlapping parts never z-fight). Their edges are bevelled (frustums and four-sided pyramids): a flat brass top square to the camera mirrors the dark room behind the visitor and vanishes, while a sloped flank catches the spotlight above, so each emblem reads as a bright outline on the medallion face. Same primitives, same material; only the edge profile is sloped.

Measured under `?test=1` (`stats().exhibits.certifications`): `inBounds: true`, 3,924 triangles, 7 draw calls. At the full +-12 degree swing the medallions stay inside z 0.054 to 0.106.

## Budget

`index.ts`: 5,000 triangles, 8 draw calls, 0 MB textures. Lazy chunk `MedalCabinet`: 1.92 KB gzip of the 40 KB limit.

## Materials

`brass` only (the shared instance). The walnut back panel and the vitrine are the kit's.

## Motion (one)

Driven only by `useExhibitClock()`: each medallion turns about its vertical axis, +-12 degrees, period 12 s, each a third of the period (4 s) after its left neighbour, so they catch the spotlight in turn. Each swing starts from rest at its own offset and eases its amplitude in over 3 s, so there is no jump when the clock starts. Every primitive is one InstancedMesh (seven draw calls in all); matrices are written only when the clock moves. The rail and standoffs never move.

**Reduced-motion and `?test=1` pose:** all three face front (0 degrees).

## Files

- `index.ts`: the eager manifest.
- `MedalCabinet.tsx`: the lazy component (default export, `ExhibitProps`).
- `cabinet.ts`: measurements, primitives, emblems, the swing and the instance writer (pure, Node-tested).
- `cabinet.test.ts`: rail, straps, face and relief, emblem containment and distinctness, bounds at full swing, triangle count, motion.
