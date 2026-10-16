# safe-sip: "Tamper Evident" (No. V1)

Spec: `docs/spec/EXPERIENCE.md` §4.7. Work package: `docs/wp/WP-13.md`. Concept checklist and R2 verdict: [`review/concepts/safe-sip.md`](../../../../review/concepts/safe-sip.md).

## Concept

The Safe Sip hardware MVP: a 3D-printed smart lid with a Raspberry Pi Pico W and an I2C orientation sensor that detects tampering from the tilt. A frosted cup hangs in a brass gimbal on a walnut base. Its bone ceramic lid is built from 3 mm print layers (real stepped geometry) and has a 90 degree cut-away wedge facing the visitor, where a graphite Pico W board with brass castellated pads and a sensor chip sit on the lid floor. The cup rocks gently; the tamper ring on the lid lights only while the roll is past the 8 degree threshold. Three static brass arcs with arrowheads (roll, pitch, yaw) stand around it as the Euler-angle diagram. No text, no liquid, no hands or figures, no green board.

## Object description (DOM, `exhibit.object`)

"A cup rocks gently inside a brass gimbal. Its cut-away lid shows a Raspberry Pi Pico W and an orientation sensor, and the ring on the lid lights when the tilt crosses the tamper threshold."

## Slot and bounds

Standard slot (EXPERIENCE §5.3), local meters, origin at the plinth top center, +Z toward the stop camera: x and z in [-0.325, 0.325], y in [0.025, 0.675].

The whole object is turned -30 degrees about Y (`OBJECT_YAW`), so the camera sees the gimbal, both pin axes and the gizmo arcs in three-quarter view instead of edge-on. The lid's cut-away is turned back by the same angle (`LID.cutCenter`), so the wedge faces the camera exactly. Positions below are in the object frame.

| Part           | Material                    | Placement                                                                                                                                                                                                                                                                                              |
| -------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Base           | `walnut`                    | disc r 0.20, h 0.03, center (0, 0.04, 0), 64 segments; top at y 0.055                                                                                                                                                                                                                                  |
| Posts (2)      | `brass`                     | cylinders r 0.005 at x = +-0.15, y 0.055 to 0.166                                                                                                                                                                                                                                                      |
| Gimbal ring    | `brass`                     | horizontal torus r 0.13, tube 0.006, at the pivot (0, 0.16, 0)                                                                                                                                                                                                                                         |
| Pivot pins (4) | `brass`                     | outer pins on X (ring to post, r 0.004), inner pins on Z (ring to cup wall, r 0.003)                                                                                                                                                                                                                   |
| Cup            | `frostedGlass`              | hard-edged Lathe, 48 segments, bottom r 0.075 at y 0.10, top r 0.095 at y 0.36, wall 4 mm, floor 6 mm                                                                                                                                                                                                  |
| Lid            | `ceramic`                   | r 0.10, 0.03 tall, ten 3 mm layers stepping in to r 0.090 at the top (quadratic shoulder). Layers 0 to 1: full-circle floor (48 segments). Layers 2 to 9: the cover, a 270 degree Lathe (36 segments) with a pocket r 0.072 under a 6 mm top plate; both cut faces are closed with the stepped section |
| Board          | `ceramicGraphite`           | box 0.06 x 0.004 x 0.024 (Pico W proportions) on the lid floor in the wedge, long axis across it                                                                                                                                                                                                       |
| Pads (20)      | `brass`                     | 0.0032 x 0.005 x 0.0045, ten per long edge at 6 mm pitch, wrapping the edge (instanced)                                                                                                                                                                                                                |
| Sensor chip    | `ceramicGraphite`           | box 0.008 x 0.002 x 0.008 on the board top                                                                                                                                                                                                                                                             |
| Tamper ring    | `accentGlow` (own instance) | torus r 0.085, tube 0.003, on the lid top; a 270 degree arc cut like the cover                                                                                                                                                                                                                         |
| Euler gizmo    | `brass`                     | three quarter-torus arcs r 0.20, tube 0.003, centered (0, 0.24, 0), one per axis, each with a cone arrowhead (r 0.008, h 0.022); static, instanced                                                                                                                                                     |

Gizmo arcs (object frame): roll in the XY plane on the +X side from -20 to 70 degrees elevation; pitch in the YZ plane over the top from 60 degrees above the front to 30 degrees past the top; yaw in the XZ plane at y 0.24 from 70 to 160 degrees (0 = +X, 90 = +Z).

**Deviation, gizmo radius 0.20 (spec 0.16).** Measured from the gizmo center (0, 0.24, 0), the rocking lid edge sweeps 0.15 to 0.18 m and the gimbal ring sits at 0.153 m, so 0.16 m arcs would cut through the lid or graze the ring. At 0.20 the unit tests prove at least 5 mm of clearance to the cup, lid and tamper ring in every pose of the cycle.

**Gimbal mechanics.** The spec gives one ring with pivot pins at +-X. To keep every join real, the ring pitches on the outer pins (X) and the cup rolls on inner pins (Z) inside it: a one-ring, two-axis gimbal. The gizmo, base and posts never move.

Measured under `?test=1` (`stats().exhibits['safe-sip']`): `inBounds: true`, 5,620 triangles, 12 draw calls, on desktop and Pixel 7, medium and high tier.

## Budget

`index.ts`: 9,000 triangles, 14 draw calls, 0 MB textures (no textures of its own). Actual: 5,620 triangles (base 256, posts 128, pins 192, gimbal 1,024, cup 384, lid 1,716, board 12, pads 240, chip 12, tamper ring 432, arcs 1,152, arrowheads 72), 12 draw calls. Lazy chunk `TamperEvident` (with `tamper.ts`): 3.37 KB gzip of the 40 KB limit.

## Materials

`walnut`, `brass`, `frostedGlass`, `ceramic`, `ceramicGraphite`, `accentGlow` only, from the kit hooks. The tamper ring uses `useMaterialInstance('accentGlow')`, a clone that shares the compiled program, and animates only its `emissiveIntensity`; nothing else is cloned or mutated.

## Motion (one)

The rocking, driven only by `useExhibitClock()`, period 9 s: roll = 9 degrees x sin(2 pi t / 9) about Z (cup, lid, board, ring), pitch = 6 degrees x sin(4 pi t / 9 + pi / 4) about X (gimbal ring and everything inside it). The ring's glow is a pure function of the same clock: 0.2 while |roll| <= 8 degrees; once past it, a 0.6 s smoothstep rise to 1.6, held at the peak, and a 0.6 s fall that ends exactly as the roll comes back under 8 degrees (ramps of at least 0.5 s, EXPERIENCE §10.4; about 1.4 s lit twice per period).

**Reduced-motion, low-tier and `?test=1` pose:** rolled 10 degrees, pitch 0, ring at 1.2. Whenever `runtime.motion` is false the object eases (smoothstep, 1 s) to this pose instead of freezing mid-cycle, and eases back into the rocking when motion resumes; it starts in the pose when it mounts without motion, so `?test=1` frames are identical from the first one. While an ease runs the component calls `invalidate()`, so it finishes even if the frame driver has stopped. Hover adds nothing (the kit's light lift).

## Files

- `index.ts`: the eager manifest (id, title, lazy loader, budget, `motion: 'slow'`).
- `TamperEvident.tsx`: the lazy component (default export, `ExhibitProps`).
- `tamper.ts`: measurements, the hard-edged lathe builder (lid and cup), gizmo placement and the motion (pure, Node-tested).
- `tamper.test.ts`: spec dimensions, wedge and ring cut, board placement, winding, triangle budget, slot bounds over the whole cycle, clearances, period, glow threshold and ramps, pose and easing.
