# mysa: "Warm Start" (No. 02)

Spec: `docs/spec/EXPERIENCE.md` §4.2. Work package: `docs/wp/WP-20.md`. Concept checklist and R2 verdict: [`review/concepts/mysa.md`](../../../../review/concepts/mysa.md).

## Concept

A mobile release pipeline warming up from build to store release (the Detox CI/CD work), and single sign-on as a key passing through a ring (Keycloak and OAuth 2.0). A generic bone ceramic wall unit stands on a walnut tray; a four-segment ring dial on its face lights in turn. At its foot a brass key is frozen mid-pass through a brass ring on a stand. The slab is deliberately generic: a rounded rectangle with no screen, no buttons, no logo, not a copy of any real thermostat. No phone silhouettes, no orbiting parts, no text.

## Object description (DOM, `exhibit.object`)

"A ring dial on a wall unit lights four segments in turn (build, end-to-end tests, dev release, store release) as the release pipeline warms up. At its foot, a brass key passes through a ring: the single sign-on token exchange."

## Slot and bounds

Standard slot (EXPERIENCE §5.3), local meters, origin at the plinth top center, +Z toward the stop camera: x and z in [-0.325, 0.325], y in [0.025, 0.675].

| Part              | Material                         | Placement                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Base tray         | `walnut`                         | RoundedBox 0.58 x 0.03 x 0.36, radius 0.008 (Verafin's), center (0, 0.04, 0); top at y 0.055                                                                                                                                               |
| Slab              | `ceramic`                        | rounded slab 0.30 x 0.48 x 0.05, corner radius 0.03, 8 mm rounded front and back edges, center (-0.10, 0.295, -0.08); front face z -0.055                                                                                                  |
| Dial (4 segments) | `accentGlow` (one instance each) | torus arcs radius 0.10, tube 0.012, 80 degrees each with 10 degree gaps (gaps at 12, 3, 6 and 9 o'clock), center (-0.10, 0.33, -0.043), tube back on the face. Clockwise from the top: build, end-to-end tests, dev release, store release |
| Bezel             | `brass`                          | torus radius 0.125, tube 0.004, same center in the face plane, seated on the face (z -0.051)                                                                                                                                               |
| Key ring          | `brass`                          | torus radius 0.06, tube 0.008, upright, axis along the key, center (0.17, 0.24, 0.06)                                                                                                                                                      |
| Stand             | `brass`                          | cylinder radius 0.005 from the tray top (0.055) into the ring's lowest tube section (0.18)                                                                                                                                                 |
| Key               | `brass`                          | bow torus radius 0.03, tube 0.007 at x 0.08; shaft radius 0.006 from x 0.09 to 0.25 through the ring center; three teeth 0.012 x 0.018 x 0.006 at x 0.212, 0.227, 0.242 under the shaft (one InstancedMesh)                                |

The ring, stand and key turn together by 35 degrees about the stand's vertical axis, the bow toward the camera. EXPERIENCE §4.2 puts the ring's axis on local X; from the stop camera that ring is edge-on and reads as a vertical bar, so the key does not visibly pass through a ring. The turn keeps every part, size and the stand position; it is recorded as a deviation in `review/reports/WP-20.json`.

Measured under `?test=1` (`stats().exhibits.mysa`, desktop and pixel7): `inBounds: true`, 4,820 triangles, 12 draw calls.

## Budget

`index.ts`: 6,000 triangles, 14 draw calls, 0 MB textures. Actual: 4,820 triangles, 12 draw calls (tray, slab, 4 segments, bezel, stand, ring, bow, shaft, teeth). Lazy chunk `WarmStart` (with `dial.ts`): 2.43 KB gzip of the 40 KB limit.

## Materials

`ceramic`, `walnut`, `brass`, `accentGlow` only, from the kit hooks. Each dial segment has its own `useMaterialInstance('accentGlow')` clone (they share the compiled program); nothing else is cloned or mutated.

## Motion (one)

The warm-up, driven only by `useExhibitClock()`. Segment i starts at 0.5 + 2i s and ramps 0.15 to 1.6 emissive over 0.6 s (easeInOutSine); all four hold lit until 8.5 s, then fade together to 0.15 over 1 s; period 10 s. Key, ring and slab never move. Ramps are at least 0.5 s and 1.6 is the exhibit glow ceiling (ART_DIRECTION §5, EXPERIENCE §10.4). Levels are written only when they change.

**Still pose (reduced motion, `?test=1`, tier low):** all four segments lit at 1.0. Hover adds nothing (the kit's light lift).

## Files

- `index.ts`: the eager manifest (id, title, lazy loader, budget, `motion: 'slow'`).
- `WarmStart.tsx`: the lazy component (default export, `ExhibitProps`).
- `dial.ts`: measurements, the warm-up curve, the rounded slab geometry and creased normals (pure, Node-tested).
- `dial.test.ts`: seating, dial layout, key through ring, bounds, timing, glow limits and the still pose.
