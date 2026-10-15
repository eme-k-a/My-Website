# Concept checklist: safe-sip

| Field | Value |
|---|---|
| Exhibit id | `safe-sip` |
| Artwork title | "Tamper Evident" (No. V1) |
| EXPERIENCE section | §4.7 |
| Builder WP | WP-13 |
| Status | pending |
| Reviewer | R2 (Art Director) |

Process: `docs/ART_DIRECTION.md` §8. Every box must pass; R2 checks a box (`- [x]`) only with evidence. The first box is judged on the 320 px grayscale thumbnail of the desktop stop screenshot (rubric D6, `docs/ART_DIRECTION.md` §7).

## Reference (from EXPERIENCE §4.7)

- **Materials:** walnut, brass, frostedGlass, ceramic, ceramicGraphite, accentGlow.
- **Motion (one):** the cup and lid rock in the gimbal: roll = 9° sin(2πt/9), pitch = 6° sin(4πt/9 + π/4). The tamper ring brightens from 0.2 to 1.6 while abs(roll) > 8° (a consequence of the same motion). Period 9 s.
- **Reduced-motion pose:** rolled 10°, tamper ring lit at 1.2 (the story moment).
- **Object description (DOM):** "A cup rocks gently inside a brass gimbal. Its cut-away lid shows a Raspberry Pi Pico W and an orientation sensor, and the ring on the lid lights when the tilt crosses the tamper threshold."

## Checklist (verbatim from EXPERIENCE §4.7)

- [ ] Reads as one object: a cup with a cut-away lid inside a brass gimbal.
- [ ] The board is graphite with brass pads (no green), in Pico W proportions.
- [ ] Print layers are stepped geometry on the lid, not a texture or shader.
- [ ] One motion: rocking on a 9 s loop; the ring lights only past the threshold.
- [ ] No "Tamper detected" text, no liquid, no hand or figure.
- [ ] The gizmo has exactly three arcs and does not move.
- [ ] Inside the standard slot; ≤ 20k triangles; only the six listed materials.

## Verdict

| Field | Value |
|---|---|
| Result (PASS or FAIL) | |
| Date | |
| Screenshot path | |
| Thumbnail path (320 px grayscale) | |
| Notes | |
| Signed | |
