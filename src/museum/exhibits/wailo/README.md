# wailo: "The Deep Link" (No. 03)

Spec: `docs/spec/EXPERIENCE.md` §4.3. Work package: `docs/wp/WP-20.md`. Concept checklist and R2 verdict: [`review/concepts/wailo.md`](../../../../review/concepts/wailo.md).

## Concept

Password recovery through a deep link into a React Native app, and carrying features through an App Store release. A graphite phone leans back in a walnut stand; one glowing link arcs into its screen from a paper envelope, and the screen answers with a reset card. A blank brass tag on a chain marks the release. No chat bubbles, no copied app UI, no readable text, no logos: "App Store release" lives only in the DOM object description.

## Object description (DOM, `exhibit.object`)

"A phone leans back on its stand while a glowing link arcs into it from an envelope, and the screen answers with a reset card: password recovery through a deep link. The blank brass tag marks the App Store release."

## Slot and bounds

Standard slot (EXPERIENCE §5.3), local meters, origin at the plinth top center, +Z toward the stop camera: x and z in [-0.325, 0.325], y in [0.025, 0.675].

| Part        | Material                                | Placement                                                                                                                                                                                                                                                             |
| ----------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Base tray   | `walnut`                                | RoundedBox 0.60 x 0.03 x 0.40, radius 0.008 (Verafin's), center (0, 0.04, 0); top at y 0.055                                                                                                                                                                          |
| Stand       | `walnut`                                | wedge in the 0.26 x 0.05 x 0.12 box at (0.08, 0.08, -0.04): 2 cm high at the front, 5 cm at the rear                                                                                                                                                                  |
| Phone       | `ceramicGraphite`                       | rounded slab 0.22 x 0.44 x 0.022, corner radius 0.025, 4 mm rounded edges; tilted back 15 degrees and yawed 10 degrees toward the envelope; its bottom slotted 1.4 cm into the stand's slope (bottom center x 0.08, z -0.035); lowest point y 0.075, top about y 0.51 |
| Screen      | `frostedGlass`                          | plane 0.19 x 0.40, 1 mm above the phone front                                                                                                                                                                                                                         |
| Reset card  | `paper`                                 | RoundedBox 0.15 x 0.10 x 0.004 centered on the screen                                                                                                                                                                                                                 |
| Key glyph   | `brass`                                 | bow torus radius 0.012 and a 0.03 shaft on the card, upper half                                                                                                                                                                                                       |
| Reset bar   | `accentGlow` (own instance)             | box 0.10 x 0.008 x 0.002 on the card, below the glyph                                                                                                                                                                                                                 |
| Envelope    | `paper`                                 | box 0.14 x 0.012 x 0.09 at (-0.20, z 0.12), back edge raised 20 degrees, lowest edge on the tray (center y 0.076); raised V flap: a 2 mm paper triangle hinged on the back edge, lifted 8 degrees                                                                     |
| Link arc    | `accentGlow` (own instance, steady 0.5) | tube radius 0.005, 64 x 6 segments, cubic curve from 4 mm inside the envelope center to 6 mm inside the phone under the screen's top right; peak y 0.62 (solved), 0.625 with the tube                                                                                 |
| Pulse       | `accentGlow` (own instance, 1.4)        | sphere radius 0.014 that rides the arc                                                                                                                                                                                                                                |
| Release tag | `brass`                                 | rounded slab 0.06 x 0.035 x 0.003, blank, leaning back 15 degrees on the stand's front edge with its bottom on the tray                                                                                                                                               |
| Chain       | `brass`                                 | cylinder radius 0.0015, 0.048 long, from the phone's right side 3 cm above its lower right corner to the tag's top                                                                                                                                                    |

The phone's lower right corner sits 2.5 cm above the tray inside the stand, so a 5 cm chain cannot hang a 3.5 cm tag straight down; the tag rests on the stand's front edge and the chain runs to it from the phone (recorded in `review/reports/WP-20.json`).

Measured under `?test=1` (`stats().exhibits.wailo`, desktop and pixel7): `inBounds: true`, 2,598 triangles, 13 draw calls (the hidden pulse is not counted in the still pose).

## Budget

`index.ts`: 5,000 triangles, 16 draw calls, 0 MB textures. Actual: 2,598 triangles, 13 draw calls in the still pose, 14 with the pulse. Lazy chunk `DeepLink` (with `link.ts`): 3.66 KB gzip of the 40 KB limit.

## Materials

`walnut`, `ceramicGraphite`, `frostedGlass`, `paper`, `brass`, `accentGlow` only, from the kit hooks. The arc, the pulse and the reset bar each have their own `useMaterialInstance('accentGlow')` clone (they share the compiled program); only the bar's level animates.

## Motion (one)

The delivery, driven only by `useExhibitClock()`. At 0.5 s the pulse leaves the envelope and rides the arc to the screen in 1.6 s (easeInOutSine on arc length), growing and shrinking over 0.25 s at each end; on arrival the reset bar flashes 0.4 to 1.6 to 0.4 with 0.5 s ramps each way (R0 ruling 2026-10-15: ramps of at least 0.5 s, 1.0 s in all); period 8 s. Nothing else moves.

**Still pose (reduced motion, `?test=1`, tier low):** pulse hidden, arc at its steady glow, reset bar lit at 1.0. Hover adds nothing.

## Files

- `index.ts`: the eager manifest (id, title, lazy loader, budget, `motion: 'slow'`).
- `DeepLink.tsx`: the lazy component (default export, `ExhibitProps`).
- `link.ts`: measurements, phone and envelope poses, the solved arc, the tag and chain, the delivery curve, and the rounded slab, wedge and flap geometry (pure, Node-tested).
- `link.test.ts`: seating, the stack on the screen, the arc ends and peak, the tag and chain, bounds, timing, glow limits and the still pose.
