# Art direction: "Commit History"

**Owner:** R2 (Art Director). Written in WP-05 on 2026-10-15.

**Authority:** `docs/PLAN.md` (with its Addendum) and the work-package briefs win over this file; `docs/spec/EXPERIENCE.md` §7 is the source of every value below. This file makes those values executable and adds the review rubric. Section numbers are fixed: briefs cite "ART_DIRECTION §n".

**Where the values live:**

| What | File | Guard |
|---|---|---|
| Token values (colors, light, motion, camera, render) | `src/design/tokens.ts` (names frozen at `contracts-v1`) | `src/design/tokens.test.ts` (key-path snapshot) |
| CSS custom properties | `src/design/tokens.css` | `src/design/css.test.ts` (equal to tokens.ts) |
| DOM fonts and fallback faces | `src/design/fonts.css` | `src/design/css.test.ts` (imports resolve in `node_modules`) |
| Contrast math and every color pair | `src/design/contrast.ts` | `src/design/contrast.test.ts` |
| Material library | `src/museum/materials/` | `src/museum/materials/library.test.ts` |
| Exhibit concept checklists | `review/concepts/<id>.md` | R2 verdicts (§8) |

---

## 1. Principles

1. **A dark room, warm pools of light, brass, paper and glass.** Calm, expensive, quiet. The room is ink; light is the only thing that draws the eye.
2. **One cool accent.** `--signal` teal glows inside objects (the `accentGlow` material and the ON VIEW NOW dot). It is the engineer's signature against warm light, and it is never used for a surface, a wall or a second accent.
3. **One object per case.** Each exhibit is a single sculptural object with at most one slow motion. Restraint reads as craft; busyness reads as programmer art. The 320 px grayscale thumbnail test (§7 D6, §8) exists to catch clusters.
4. **The DOM is the content; WebGL is the stage.** Every readable word lives in HTML. 3D text is only for big wall labels that repeat DOM text.
5. **Truth over flourish.** No logos, no invented numbers, no imagery that overstates the work (Verafin shows reporting, never fraud detection).
6. **Time is warmth.** Light and placard paper grow warmer the further back the work is (§4.6). Nothing else encodes age.
7. **No new colors or materials without R2.** A new value gets an entry in this file explaining why, and a new name needs R0 (names are frozen at `contracts-v1`).

---

## 2. Color tokens

Every row of EXPERIENCE §7.2. CSS names are the EXPERIENCE names; `tokens.ts` keys are frozen.

| CSS name | `tokens.ts` | Hex | Use |
|---|---|---|---|
| `--ink` | `color.ink` | `#0B0B0D` | Page background, fog, text on brass, the shadow-decal tint |
| `--wall` | `color.wall` | `#141418` | Walls, ceiling |
| `--floor` | `color.floor` | `#0E0E11` | Floor base color |
| `--plinth` | `color.plinth` | `#1F1F24` | Plinths, desk body |
| `--panel` | `color.panel` | `rgba(14, 14, 17, 0.86)` | Dialog panel, HUD chips |
| `--panel-solid` | `color.panelSolid` | `#0F0F12` | Solid fallback for `--panel` (phones, low tier, no `backdrop-filter`) |
| `--text` | `color.text` | `#F2EDE4` | Primary text on dark |
| `--text-2` | `color.text2` | `#A8A29A` | Secondary text on dark |
| `--text-3` | `color.text3` | `#6E6A64` | Decorative strokes only, never text (3.66:1) |
| `--brass` | `color.brass` | `#C9A36A` | Rail, hairlines, primary button fill, accent text |
| `--brass-hi` | `color.brassHi` | `#E4C48F` | Hover, focus ring on dark |
| `--brass-metal` | `color.brassMetal` | `#B08D57` | 3D brass base color |
| `--paper` | `color.paper` | `#EFEBE4` | Placard card, newest |
| `--paper-old` | `color.paperOld` | `#E9DCC4` | Placard card, oldest |
| `--paper-ink` | `color.paperInk` | `#1A1A1E` | Text on paper, focus ring on paper |
| `--paper-ink-2` | `color.paperInk2` | `#5A554D` | Secondary text on paper |
| `--signal` | `color.signal` | `#7FD1C7` | ON VIEW NOW dot, `accentGlow` emissive |
| `--ceramic` | `color.ceramic` | `#E6E1D8` | Bone ceramic |
| `--graphite` | `color.graphite` | `#34343B` | Graphite ceramic |
| `--walnut` | `color.walnut` | `#4E3322` | Walnut |
| `--frost` | `color.frost` | `#DDE3E4` | Frosted glass tint |
| `--ceiling-slot` | `color.ceilingSlot` | `#2A2622` | Ceiling light slot |
| `--light-0` | `light.ramp[0]` | `#FFF4E8` | Light ramp, newest |
| `--light-1` | `light.ramp[1]` | `#FFE9D2` | Light ramp |
| `--light-2` | `light.ramp[2]` | `#FFDDB8` | Light ramp |
| `--light-3` | `light.ramp[3]` | `#FFCF9C` | Light ramp, oldest |
| `--duo-shadow`, `--duo-light` | `color.duoShadow`, `color.duoLight` | `#16161A`, `#F2EDE4` | Portrait duotone |

**Classic page (`/resume/`, EXPERIENCE §7.3).** Variables live under `[data-page="classic"]` in `tokens.css`; R6's `classic.css` reads them.

| Variable | Light (default) | Dark (`prefers-color-scheme: dark`) | Print |
|---|---|---|---|
| `--cv-bg` | `#FBFAF7` (`classic.light.bg`) | `#0B0B0D` (`--ink`) | `#FFFFFF` |
| `--cv-text` | `#1A1A1E` | `#F2EDE4` (`--text`) | `#000000` |
| `--cv-text-2` | `#55524C` | `#A8A29A` (`--text-2`) | `#000000` |
| `--cv-link` | `#7A5C2B` | `#E4C48F` (`--brass-hi`) | `#000000` |
| `--cv-focus` | `#1A1A1E` | `#E4C48F` | `#000000` |

Print also drops every background and shadow (R6). Print black and white are not new palette colors: they are the medium.

**Measured contrast.** Computed by `src/design/contrast.ts` (WCAG 2.2 relative luminance; translucent panels composited in sRGB over their backdrop) and enforced by `contrast.test.ts`: text at least 4.5:1, focus rings and control boundaries at least 3:1. Where EXPERIENCE prints a figure, the test also checks it is within 0.05 of the measurement.

| Foreground | Background | Use | Measured | EXPERIENCE |
|---|---|---|---|---|
| `--text` | `--ink` | text | 16.9:1 | 16.9:1 |
| `--text` | `--wall` | text | 15.8:1 | |
| `--text` | `--panel` over `--ink` | text | 16.6:1 | |
| `--text` | `--panel-solid` | text | 16.4:1 | 16.4:1 ("on panel") |
| `--text` | `--panel` over a `light-0` pool (worst case) | text | 11.5:1 | |
| `--text-2` | `--ink` | text | 7.77:1 | 7.8:1 |
| `--text-2` | `--wall` | text | 7.26:1 | 7.3:1 |
| `--text-2` | `--panel` over `--ink` | text | 7.64:1 | |
| `--text-2` | `--panel-solid` | text | 7.56:1 | |
| `--text-2` | `--panel` over a `light-0` pool (worst case) | text | 5.32:1 | |
| `--brass` | `--ink` | text | 8.36:1 | 8.4:1 |
| `--brass` | `--panel` over `--ink` | text | 8.22:1 | |
| `--brass-hi` | `--ink` | text | 11.8:1 | 11.8:1 |
| `--brass-hi` | `--panel` over `--ink` | text | 11.6:1 | |
| `--ink` | `--brass` (primary button) | text | 8.36:1 | 8.4:1 |
| `--ink` | `--brass-hi` (primary button hover) | text | 11.8:1 | |
| `--signal` | `--ink` | text | 11.1:1 | 11.1:1 |
| `--signal` | `--panel` over `--ink` | text | 10.9:1 | |
| `--paper-ink` | `--paper` | text | 14.6:1 | 14.6:1 |
| `--paper-ink` | `--paper-old` | text | 12.8:1 | 12.8:1 |
| `--paper-ink-2` | `--paper` | text | 6.22:1 | 6.2:1 |
| `--paper-ink-2` | `--paper-old` | text | 5.45:1 | 5.45:1 |
| classic text | classic light bg | text | 16.6:1 | 16.6:1 |
| classic text-2 | classic light bg | text | 7.46:1 | 7.5:1 |
| classic link | classic light bg | text | 5.93:1 | 5.9:1 |
| classic text | classic dark bg | text | 16.9:1 | |
| classic text-2 | classic dark bg | text | 7.77:1 | |
| classic link (`--brass-hi`) | classic dark bg | text | 11.8:1 | |
| print text | print bg | text | 21.0:1 | |
| `--brass-hi` ring | `--ink` | focus | 11.8:1 | |
| `--brass-hi` ring | `--wall` | focus | 11.0:1 | |
| `--brass-hi` ring | `--panel-solid` | focus | 11.5:1 | |
| `--brass-hi` ring | `--panel` over `--ink` | focus | 11.6:1 | |
| `--paper-ink` ring | `--paper` | focus | 14.6:1 | |
| `--paper-ink` ring | `--paper-old` | focus | 12.8:1 | |
| classic light ring (`#1A1A1E`) | classic light bg | focus | 16.6:1 | |
| classic dark ring (`--brass-hi`) | classic dark bg | focus | 11.8:1 | |
| `--border-secondary` (brass at 60%) | `--ink` | boundary | 3.62:1 | |
| `--border-secondary` | `--wall` | boundary | 3.57:1 | |
| `--border-secondary` | `--panel-solid` | boundary | 3.61:1 | |
| `--text-3` | `--ink` | decorative only | 3.66:1 | 3.7:1 |
| `--text-3` | `--wall` | decorative only | 3.42:1 | |
| `--hairline` (brass at 28%) | `--ink` | decorative only | 1.66:1 | |

- **`--text-3` never carries text.** The test asserts that no text or boundary pair uses it and that no stylesheet or inline style in `src/` sets `color: var(--text-3)`. Borders, strokes and fills may use it.
- **Aging paper stays legible.** Card paper is interpolated from `--paper` to `--paper-old` by `layout.ageT`; both ends pass with `--paper-ink-2` (6.22:1 and 5.45:1), and the luminance between them is monotone, so every age in between passes.
- **Panels over bright scenery.** `--panel` is 86% opaque, so even over the brightest pool (`light-0`) `--text-2` keeps 5.32:1.

---

## 3. Typography

**Families and files.**
- **Instrument Serif** 400 normal and 400 italic: the name (hero h1), artwork titles (italic on cards), dialog headings, wall text and room names.
- **IBM Plex Sans** 400 and 500: UI, body, labels, roles and dates.
- Both from npm (`@fontsource/instrument-serif`, `@fontsource/ibm-plex-sans` 5.3.0, SIL OFL 1.1). No Google Fonts, no CDN; the CSP is self-only.
- **DOM: `.woff2`** through `src/design/fonts.css`, which imports `latin-400.css` and `latin-400-italic.css` (Instrument Serif) and `latin-400.css` and `latin-500.css` (IBM Plex Sans); Vite hashes the files into `/assets/`. Each face uses `font-display: swap`.
- **3D labels: `.woff`** from the same packages, imported by URL in `src/museum/exhibits/_kit/fonts.ts` (WP-08), because troika cannot read `.woff2`. Every drei `<Text>` passes `font` explicitly, and `configureTextBuilder({ unicodeFontsURL: '/fonts/unicode-fallback' })` points at an intentionally empty self-hosted path, so no fallback font is ever fetched.
- **Preload:** Instrument Serif 400 and IBM Plex Sans 400 latin `.woff2` (the `<!--preload-->` marker; WP-10 and WP-28).
- **WP-28** may swap the imports for subsets in `public/fonts/` (DOM subsets keep the en dash, the middle dot and curly quotes) and tunes the fallbacks so CLS stays at most 0.02.

**Metric-matched fallbacks** (`fonts.css`). While a web font loads, text renders in a local face whose metrics are overridden to occupy the same box:

| Fallback family | Style, weight | `src` | `size-adjust` | `ascent-override` | `descent-override` | `line-gap-override` |
|---|---|---|---|---|---|---|
| `Instrument Serif Fallback` | normal 400 | Georgia (or Gelasio) | 76.8% | 128.91% | 40.37% | 0% |
| `Instrument Serif Fallback` | italic 400 | Georgia Italic (or Gelasio Italic) | 79.38% | 124.72% | 39.05% | 0% |
| `IBM Plex Sans Fallback` | normal 400 | Arial (or Liberation Sans) | 101.25% | 101.24% | 27.16% | 0% |
| `IBM Plex Sans Fallback` | normal 500 | Arial (or Liberation Sans) | 103.4% | 99.13% | 26.6% | 0% |

- Method (first pass, 2026-10-15): `size-adjust` is the ratio of average advance widths over English letter frequencies plus spaces (web font divided by fallback), measured with fontkit on the `@fontsource` latin `.woff` files and on Gelasio (metric-compatible with Georgia) and Liberation Sans (metric-compatible with Arial). The overrides are the web font's hhea ascent, descent and line gap (Instrument Serif 990, 310, 0 per 1000; IBM Plex Sans 1025, 275, 0 per 1000) divided by `size-adjust`. WP-28 tunes them against real renders.
- Stacks (`tokens.css`): `--font-serif: 'Instrument Serif', 'Instrument Serif Fallback', Georgia, serif`; `--font-sans: 'IBM Plex Sans', 'IBM Plex Sans Fallback', Arial, sans-serif`.

**Type scale** (EXPERIENCE §7.7, as `tokens.css` variables):

| Style | Font | Size / line height | Variables | Notes |
|---|---|---|---|---|
| Display (hero h1) | Instrument Serif 400 | `clamp(36px, 6vw, 88px)` / 1.05 | `--type-display`, `--lh-display` | The LCP element |
| Dialog H2 | Instrument Serif 400 | `clamp(32px, 3vw, 44px)` / 1.1 | `--type-h2`, `--lh-h2` | |
| Artwork title (card) | Instrument Serif italic | 28px / 1.15 (phone 24px) | `--type-title`, `--type-title-phone`, `--lh-title` | |
| Role | Plex Sans 500 | 16px / 1.4 | `--type-role`, `--lh-role` | |
| Body | Plex Sans 400 | 16px / 1.6 (dialog 17px on desktop) | `--type-body`, `--type-body-dialog`, `--lh-body` | |
| Small | Plex Sans 400 | 14px / 1.5 | `--type-small`, `--lh-small` | Smallest DOM text |
| Label | Plex Sans 500 | 12px / 1.3, uppercase, letter-spacing 0.08em | `--type-label`, `--lh-label`, `--tracking-label` | |
| Dates and durations | Plex Sans 400 | inherit | | `font-variant-numeric: tabular-nums` |

Weights: `--weight-regular` 400, `--weight-medium` 500. No other weights or styles load.

**Glyph rules.**
- 3D text uses only the strings of EXPERIENCE §5.4 (exhibit numbers, organization labels, room names, "FOUNDATIONS", "COMMIT HISTORY", "You've reached the beginning.", year numerals). `npm run check:glyphs` (R7) asserts every code point of `threeDStrings(content)` and `environment/labels3d.ts` exists in the `.woff` used, including the apostrophe in "ST. JOHN'S" and "You've" and the ampersand in "VOLUNTEER & LEADERSHIP".
- No small 3D text: cap heights follow the EXPERIENCE §5.4 table (R3 may raise them, never lower them), so every label is at least 14 CSS px on Pixel 7 from its stop camera. Organization labels and room names are uppercase IBM Plex Sans 500 with tracking 0.12em; year numerals 0.2em and decorative.
- 3D labels are `brass` and always duplicate DOM text.

---

## 4. Lighting recipe per tier

EXPERIENCE §7.5, §6.8 and §6.9; ARCHITECTURE §8.1 and §8.2. Values are tokens under `tokens.light` unless noted. The recipe is fixed per tier at boot; only DPR adapts at runtime.

**Ambient.** One hemisphere light: sky `#1A1C22` (`light.hemiSky`), ground `#0B0B0D` (`light.hemiGround`), intensity 0.15 (`light.hemiIntensity`).

**Real spotlights.**
- Count fixed at boot: **3 on high, 1 on medium and 1 on low.** They never change count at runtime.
- Angle 0.38 rad (about 21.8 degrees, `light.spotAngle`), penumbra 0.6 (`light.spotPenumbra`), decay 2 (`light.spotDecay`), `castShadow` false.
- Starting intensity **40 cd** (`light.spotIntensity`); R2 tunes it in WP-11 and freezes the token there (§9).
- Mounts (EXPERIENCE §5.5): standard plinths at (x_p, 4.6, z_p + 0.6); wing plinths at (sigma * 8.4, 3.7, z_p); mun at (-2.5, 4.6, -56.4); certifications at (4.4, 4.6, -57); desk at (0, 3.7, -66.9); portrait at (2.6, 5.4, -2.6). Each aims at its slot center (or target).
- Assignment on each arrival (EXPERIENCE §6.8): light 1 takes the current stop's target (or the next target ahead); on high, lights 2 and 3 take the next two targets ahead. A reassigned light moves instantly at intensity 0, takes the target's temperature color and fades up over 1 s (`motion.lightReassignS`). Hover or focus lifts the current stop's light to 1.35x (`motion.hoverLift`) over 250 ms; an open dialog dims the other real spots to 30% over 0.4 s.

**Zero shadow maps.** `gl.shadowMap.enabled = false`, no `castShadow` or `receiveShadow` anywhere.

**Baked pools and contact patches** (one floor `lightMap` CanvasTexture per zone, `environment/lightPools.ts`, R3):

| Element | Radius or size | Peak alpha or darkness | Color | Falloff |
|---|---|---|---|---|
| Exhibit pool | 1.6 m (`light.poolRadius`), centered 0.3 m from the plinth toward the aisle center | 0.85 (`light.poolAlpha`) | target temperature (age ramp) | smoothstep |
| Door threshold pool | 1.2 m (`light.doorPoolRadius`), on the aisle floor | 0.35 (`light.doorPoolAlpha`) | `light-0` | smoothstep |
| Plinth contact patch | plinth footprint with a 0.25 m soft edge (`light.contactSoftEdge`) | darkness 0.55 (`light.contactDarkness`) | ink | smoothstep |
| Plinth-top contact shadow | drei `ContactShadows frames={1}`, rendered once after reveal | | | |
| Shadow decal (fallback for the line above, never both) | 0.6 m square, 64 px radial texture | opacity 0.45 | `--ink`, multiply | smoothstep |

Every target keeps its pool and wall wash whether or not a real light is assigned, so the far aisle always glows.

**Wall wash.** One shared 256 px "scallop" texture on the wall bay behind each target, tinted by the target temperature, with panel seams every 2 m baked in. It is the `wall` material's `lightMap` (§5).

**Environment.** drei `<Environment frames={1} resolution={256}>` built from Lightformers only: a ceiling strip (`light-0`, intensity 2, 0.3 x 60 m) along the centerline at y 4.9, two side panels (`light-1`, intensity 0.6) and one lobby panel. No HDRI files.

**Fog.** `FogExp2`, color `#0B0B0D`, density 0.045 (`light.fogDensity`). Fog factor is 1 - exp(-(0.045 d)^2): the next case at 12 m is about 25% fogged (clearly visible); the one after at 24 m is about 69% fogged (a faint pool).

**The age ramp.** `light-0` `#FFF4E8` (newest) to `light-3` `#FFCF9C` (oldest), `tokens.light.ramp`. For main work exhibit i of n, t = i / (n - 1) (0 when n = 1); spotlight, pool and wall-wash colors sample the ramp at t (stops at 0, 1/3, 2/3, 1, linear RGB interpolation). A wing uses its door: t = (k + 0.5) / (n - 1) for `after = w[k]`. Lobby and portrait use `light-0`; Foundations uses `light-3`; the desk uses `light-1`. Placard paper uses the same t from `--paper` to `--paper-old`.

| Target | t | Color |
|---|---|---|
| verafin | 0 | `light-0` `#FFF4E8` |
| projects wing | 0.167 | between `light-0` and `light-1` |
| mysa | 0.333 | `light-1` `#FFE9D2` |
| volunteer wing | 0.5 | between `light-1` and `light-2` |
| wailo | 0.667 | `light-2` `#FFDDB8` |
| cfia | 1 | `light-3` `#FFCF9C` (warmest, tied with Foundations) |
| mun, certifications | 1 | `light-3` |
| lobby, portrait | | `light-0` |
| desk | | `light-1` |

**Tiers.**

| | high | medium | low |
|---|---|---|---|
| DPR max (`render.maxDpr`) | 2 | 1.5 | 1 |
| Real spotlights | 3 | 1 | 1 |
| Floor | drei `MeshReflectorMaterial` with `floorReflectorParams` plus the pool lightMap | library `floor` (env-mapped) plus the pool lightMap | same as medium |
| Beam cones (additive, opacity 0.035, kit `beam`, one instanced mesh, mount to case) | on | on | off |
| Glass cases (`caseGlass`, no transmission) | on | on | on |
| Antialias | on | on | off |
| Idle motion | on | on | off |

**Tone mapping and output.** ACES Filmic, exposure 1.0 (`render.toneMapping: 'aces'`, `render.exposure: 1`) until the WP-11 side-by-side (§9). Output color space sRGB.

**Vignette.** CSS only (§6): `radial-gradient(ellipse at center, transparent 55%, rgba(11,11,13,0.55) 100%)`. No post-processing package, no bloom.

---

## 5. Material library

`src/museum/materials/`: `library.ts` (`materialSpecs`, `createMaterialLibrary`, `disposeMaterialLibrary`, `floorReflectorParams`, `ACCENT_GLOW`), `walnutGrain.ts`, `MaterialsProvider.tsx` (`MaterialsProvider`, `useMaterial`, `useMaterialInstance`, `useMaterialLibrary`), all exported from `index.ts` next to the frozen `EXHIBIT_MATERIALS`, `KIT_MATERIALS` and `MaterialLibrary`. Every color comes from `tokens.ts`; no material has transmission.

| Name | Exhibits | Class | Parameters | Texture slots |
|---|---|---|---|---|
| `brass` | yes | MeshStandardMaterial | color `--brass-metal` `#B08D57`, metalness 1, roughness 0.35, envMapIntensity 1.0 | |
| `frostedGlass` | yes | MeshPhysicalMaterial | color `--frost` `#DDE3E4`, roughness 0.55, metalness 0, transmission 0, transparent, opacity 0.55, depthWrite false, envMapIntensity 0.8 | |
| `walnut` | yes | MeshStandardMaterial | color `--walnut` `#4E3322`, roughness 0.55, metalness 0 | `map`: seeded 256 px walnut grain (library) |
| `ceramic` | yes | MeshStandardMaterial | color `--ceramic` `#E6E1D8`, roughness 0.85, metalness 0 | |
| `ceramicGraphite` | yes | MeshStandardMaterial | color `--graphite` `#34343B`, roughness 0.8, metalness 0 | |
| `paper` | yes | MeshStandardMaterial | color `--paper` `#EFEBE4`, roughness 0.95, metalness 0 | |
| `accentGlow` | yes | MeshStandardMaterial | color `--ink`, emissive `--signal` `#7FD1C7`, emissiveIntensity 0.15 at rest (`ACCENT_GLOW.rest`), 1.4 at its peak (`ACCENT_GLOW.peak`), toneMapped true | |
| `wall` | yes | MeshStandardMaterial | color `--wall` `#141418`, roughness 0.95 | `lightMap`: wall wash (kit) |
| `floor` | kit | MeshStandardMaterial (medium, low) | color `--floor` `#0E0E11`, roughness 0.22, metalness 0, envMapIntensity 0.6 | `lightMap`: pools (kit) |
| `caseGlass` | kit | MeshPhysicalMaterial | transmission 0, transparent, opacity 0.12, roughness 0.05, envMapIntensity 1.2, depthWrite false | |
| `plinth` | kit | MeshStandardMaterial | color `--plinth` `#1F1F24`, roughness 0.9 | |
| `beam` | kit | MeshBasicMaterial | additive, transparent, opacity 0.035, depthWrite false, color `light-0` by default (the kit tints each cone to its target temperature) | |
| `shadowDecal` | kit | MeshBasicMaterial | multiply blending with premultiplied alpha, transparent, opacity 0.45, depthWrite false, color `--ink` | `map`: 64 px radial texture (library) |
| `ceilingSlot` | kit | MeshBasicMaterial | color `--ceiling-slot` `#2A2622` | |
| `portrait` | kit | MeshBasicMaterial | | `map`: 512 px headshot, color and duotone (kit) |

**High-tier floor.** The kit builds drei's `MeshReflectorMaterial` from `floorReflectorParams`: resolution 512, blur [300, 100], mixBlur 1, mixStrength 1.5, roughness 0.8, metalness 0.5, mirror 0, color `--floor`, plus the pool lightMap. The library never builds it.

**Exhibit-allowed: exactly eight.** `brass`, `frostedGlass`, `walnut`, `ceramic`, `ceramicGraphite`, `paper`, `accentGlow`, `wall` (the first eight rows of EXPERIENCE §7.6, `EXHIBIT_MATERIALS`). The other seven belong to R3's environment and kit. `library.test.ts` asserts the set.

**No material construction in exhibits.** Exhibits never write `new ...Material`, never render a `<...Material>` JSX element and never import `src/museum/materials` (ESLint, ARCHITECTURE §7.5). They take materials from `props.materials` or the kit's re-exported hooks:
- `useMaterial(name)`: the shared instance. Never mutate it.
- `useMaterialInstance(name)`: a clone for this component's own animated `emissiveIntensity`, `opacity` or `color`, disposed on unmount.
- Both hooks accept only the eight exhibit names (a type error otherwise). The kit and environment use `useMaterialLibrary()` for the full library.

**How clones share programs.** three.js caches compiled shader programs by a key built from the material class and the parameters that change the shader (which maps are present, transparency, blending, side, fog, tone mapping, defines). `Material.clone()` copies every parameter and shares the textures, so a clone gets the same key and reuses the program already compiled for the shared instance; `library.test.ts` checks that a clone serializes identically apart from its uuid. Animate uniforms only: `emissiveIntensity`, `emissive`, `opacity`, `color`. Never change `transparent`, `side`, `blending`, `vertexColors`, `flatShading` or any map on an instance: that makes a new program and compiles mid-walk.

**Glow levels.** `accentGlow` rests at 0.15 and peaks at 1.4. The EXPERIENCE §4 concepts allow brief flashes to 1.6 (the Mysa dial, the Wailo reset bar); 1.6 is the ceiling for any exhibit. Ramps take at least 0.5 s and never exceed 3 changes per second (EXPERIENCE §10.4).

**Lifecycle.** `MaterialsProvider` sits inside `<Canvas>` and wraps the Suspense with the scene (ARCHITECTURE §7.1). It builds one library per canvas (a context loss remounts the canvas and builds a fresh one) and disposes every material, the decal texture and the walnut grain on unmount. Without a DOM (SSR, unit tests) the library still builds; walnut then has no grain map.

**Texture slots.** The library fills `walnut.map` (seeded 256 px CanvasTexture: grey grain between 0.7 and 1.0 that multiplies the walnut color, sRGB, repeat-wrapped, tileable) and `shadowDecal.map` (64 px DataTexture, white with a smoothstep radial alpha). The kit fills `wall.lightMap` (wall wash), `floor.lightMap` (pools) and `portrait.map` (headshot) and sets `needsUpdate` before the boot `compileAsync`, so every program exists before the walk starts. All library materials must be in the scene for that boot compile (for example one hidden warm-up mesh per material), so that switching or cloning never compiles a new program mid-walk.

**Shader requests.** A look an exhibit needs that the library cannot give (for example a circuit-trace or layer-line shader) is a request to R2; R2 adds it to the library, with an entry here and R0's agreement for any new name.

---

## 6. UI chrome and icons

EXPERIENCE §7.8 to §7.10; variables from `tokens.css`.

- **Panels:** `--panel` with a 14 px backdrop blur (`--panel-blur`); `--panel-solid` on phones, on the low tier and where `backdrop-filter` is unsupported. 1 px `--hairline` (brass at 28%) dividers. Radius `--radius` (2 px).
- **Primary button:** `--brass` fill, `--ink` text (8.36:1), at least 44 px tall, radius 2 px. Hover lightens the fill to `--brass-hi` (ink on it: 11.8:1).
- **Secondary button:** transparent, 1 px `--border-secondary` border, `--text` label; hover turns the border `--brass-hi`.
- **Focus:** `:focus-visible`, always visible. On dark surfaces a 2 px `--brass-hi` outline (`--focus-dark`) with 2 px offset (`--focus-width`, `--focus-offset`); on paper cards a 2 px `--paper-ink` outline (`--focus-paper`); on the classic page `--cv-focus`.
- **Hit targets:** at least 44 x 44 CSS px (`--target-min`).
- **HUD (desktop):** "Commit History" wordmark in the label style top left; top right "Resume (PDF)" (primary) and "Classic view" (secondary); the progress rail on the right edge (a `--brass` hairline, EXPERIENCE §6.10); the onboarding hint bottom center.
- **Vignette:** `.stage::after { content: ''; position: fixed; inset: 0; pointer-events: none; background: var(--vignette); }` with `--vignette: radial-gradient(ellipse at center, transparent 55%, rgba(11,11,13,0.55) 100%)` (ARCHITECTURE §8.6). Nothing else darkens or blurs the canvas.
- **Motion tokens:** `--dur-fast` 150 ms, `--dur-base` 250 ms, `--dur-slow` 600 ms, `--ease-out` `cubic-bezier(0.22, 1, 0.36, 1)`, `--ease-in-out` `cubic-bezier(0.65, 0, 0.35, 1)`, `--rail-smooth` 0.25 s, `--fade-cut` 200 ms. Under reduced motion EXPERIENCE §6.6 applies (fade-cuts between stops, no slides, instant reveals).
- **Icons:** inline SVG paths copied from Lucide (ISC license, credited in `public/credits.html`), 18 px (`--icon-size`), stroke 1.5 (`--icon-stroke`), `currentColor`, `aria-hidden="true"`, always next to a visible text label. The set: `file-text` (Resume PDF), `mail` (Email), `list` (Classic view), `ticket` (Begin the walk), `arrow-down` (hint), `x` (close), `chevron-left` and `chevron-right` (Back to the aisle, Newer, Older), `link` (Copy link), `door-open` (Step inside), `undo-2` (Return to the aisle), `external-link` (LinkedIn, GitHub). No icon package, no brand icons or logos anywhere, including LinkedIn and GitHub.
- **Theme rules:** the gallery (`/`, `/exhibit/<id>/`, `404.html`) is always dark. `/resume/` follows `prefers-color-scheme` through the `--cv-*` variables and prints black on white.

**R2 decisions recorded here (values beyond the EXPERIENCE tables).**
- `--border-secondary` is brass at **60%**, not the 50% of EXPERIENCE §7.8. At 50% the secondary-button border measures 2.85:1 on `--ink`, below the 3:1 that EXPERIENCE §10.4 asks of UI boundaries; 54% is the minimum that passes and 60% (3.62:1 on ink, 3.57:1 on wall) leaves margin. The hue is unchanged. Raised with R0 in `review/reports/WP-05.json`.
- `--hairline` (brass at 28%, EXPERIENCE §7.8) is decorative at 1.66:1 and never the only boundary of a control.
- The type-scale and chrome variables (`--type-*`, `--lh-*`, `--font-*`, `--radius`, `--panel-blur`, `--focus-*`, `--target-min`, `--icon-*`) are the EXPERIENCE §7.7 to §7.9 values under CSS names; they add no colors.
- `shadowDecal` is tinted `--ink` so the multiply darkens toward the room's own black (at most 45%).

---

## 7. Review rubric

R11 scores every stop on six dimensions, D1 to D6, from 1 to 5 (half points allowed). Anchors are written for 1, 3 and 5; 2 and 4 sit between them.

| Dim | Name | What it judges | 1 | 3 | 5 |
|---|---|---|---|---|---|
| D1 | Gallery mood | Light, darkness, warmth, calm | Flat or evenly lit room, grey or crushed blacks, cold or clashing light, glare, flicker or noise; reads as a 3D demo, not a gallery | Dark room with a warm pool at the case and the next pool visible, but some areas too bright or too dead (washed walls, clipped pools, fog hiding the next case); calm, not yet inviting | Deep ink room; the case sits in its own warm pool, the next pool glows ahead and the one after is a faint promise; brass and glass catch light without glare; the teal glow is the only cool note; calm, quiet, expensive |
| D2 | Composition and framing | Case placement, card clearance, sightline to the next pool | Case cut off, covered by the card or HUD, or far from its framing point; no sightline ahead; walls or ceiling dominate the frame | Case near its framing point (62% of the width on desktop, 36% of the height on phone) and clear of the card, but cramped, the wall title collides, or the next pool falls out of frame | Case on its framing point within 3%, card and HUD never overlap it, the wall title reads above it, and the next pool sits in the sightline; every stop composes like a photograph |
| D3 | Legibility | DOM card and dialog text, contrast, size; 3D labels at least 14 CSS px | Any text under 4.5:1 or under the type scale, text lost over a bright pool, a 3D label under 14 CSS px, or content that exists only in WebGL | All text meets 4.5:1 and the type scale and 3D labels are at least 14 CSS px, but long lines, awkward wraps or busy backdrops make reading effortful | Card, dialog and labels read at a glance on both viewports; hierarchy follows §3; focus rings are obvious; 3D labels are crisp and repeat the DOM |
| D4 | Story clarity | Does the object say what the work was, without overstating it | The object says nothing about the work, or overstates it (detection imagery for Verafin, logos, invented numbers, copied product UI) | The idea reads once the card has been read; one element is ambiguous or merely decorative | The object tells its story at a glance and the card confirms it; nothing claims more than the work; "The object" text matches what is on screen |
| D5 | Craft consistency | Shared materials, proportions, motion restraint across builders; reads as the work of an engineer | Materials outside the library, mismatched scale or edge radii, more than one motion, fast or jittery animation, z-fighting or floating parts; looks like four people built it | Library materials and slot bounds respected; proportions and motion mostly consistent; one exhibit noticeably busier, glossier or faster than its neighbours | Same material vocabulary, edge radii, scale and one slow eased motion everywhere; joins are precise and nothing floats; the set reads as one engineer's careful work |
| D6 | Object read | "Reads as one object in a 320 px grayscale thumbnail" | The 320 px grayscale thumbnail shows a cluster of parts or noise, with no single silhouette | One main silhouette is recognizable, but secondary parts compete with it or it merges with the plinth or wall | One clear silhouette with strong value contrast against case and wall; the §4 "reads as one object" line can be checked from the thumbnail alone |

**Scoring protocol.**
1. **Capture** on a deterministic build (`?test=1`): desktop at `tier=high` and Pixel 7 at `tier=medium`, every stop and every dialog (`npm run review`, or the `@capture` spec as in WP-19). D6 uses a 320 px wide grayscale copy of the desktop stop shot (`sharp(file).resize(320).grayscale()`).
2. **Score** each stop on D1 to D6 for desktop and for Pixel 7. Every score carries a one-line reason and cites the screenshot path it is based on (for example `review/runs/2026-11-02-g2/verafin-desktop.png`). A score without a cited path does not count.
3. **Compare** with the previous round's scorecard and with the approved reference stills in §10; say what moved and why. Praise or blame is always relative to the anchors above, never absolute.
4. **Average** per stop, per dimension and overall. G2 needs an overall average of at least 3.5 with no open P0 or P1 (WP-19); the improvement loop stops after 2 consecutive rounds with no new P0 or P1, at most 2 new P2 and averages of at least 4.0 (PLAN §6).
5. **File findings** with a severity (P0 broken or inaccessible, P1 visibly wrong or over budget, P2 polish, P3 idea) and the repo path most likely responsible.
6. **At most 3 rounds per milestone** (PLAN §6). Leftovers go to Emeka's backlog; a finding reopened twice is a taste call for Emeka.

---

## 8. Concept checklists

One file per exhibit id in `review/concepts/<id>.md` (`verafin`, `mysa`, `wailo`, `cfia`, `klarup`, `finance-tracker`, `sdsj`, `mun`, `certifications`), created in WP-05 with status `pending`. Each holds a header (exhibit id, artwork title, EXPERIENCE section, builder WP, status, reviewer R2), the checklist copied verbatim from its EXPERIENCE §4 entry as `- [ ]` items, and an empty Verdict block.

**Process.**
1. The builder WP captures the exhibit's stop screenshot (desktop at `tier=high`, plus Pixel 7 at `tier=medium`), its reduced-motion frames, and the 320 px grayscale thumbnail of the desktop shot (`sharp(shot).resize(320).grayscale()`), under `out/wpNN/` (never committed), and asks R0 for the R2 review.
2. R2 checks every box from the screenshot, the thumbnail, `__MUSEUM__.stats()` (triangles, `inBounds`), the code (library materials only, one motion, no lights, no text) and the pixel comparison of reduced-motion and `?test=1` frames.
3. **Every box must pass.** A passing box becomes `- [x]`. If any box fails, the Verdict is FAIL with one line per failing box; the builder fixes it and R2 reviews again.
4. The first box of every checklist is the "reads as one object" line; it is judged on the 320 px grayscale thumbnail (D6).
5. R2 fills the Verdict (PASS or FAIL, date, screenshot path, thumbnail path, notes), sets the status, and commits it with the builder WP's trailer as `docs(concepts): <id> checklist verdict`. The builder WP's acceptance needs `grep -c '^- \[ \]' review/concepts/<id>.md` to print 0 and the Verdict to read PASS.
6. **Verafin copy guard:** nothing in 3D or in copy may suggest fraud detection or AML models: no red or amber bars, no highlighted or flagged bar, no alert icon, no magnifying glass, no particles or streams.

---

## 9. Tone-mapping decision

Filled by R2 in WP-11.

| Field | Value |
|---|---|
| Date | 2026-10-16 |
| Build (commit) | WP-11 working tree on `3a2c574`, with the WP-12 Verafin exhibit applied locally (uncommitted) so a real exhibit sits under the light |
| Stops compared | lobby, verafin, cfia |
| Tier and viewport | `tier=high`, desktop (1440 x 900, DPR 1, `?test=1`) |
| ACES Filmic screenshots | `out/wp11/tonemap/lobby-aces.png`, `verafin-aces.png`, `cfia-aces.png` |
| AgX screenshots | `out/wp11/tonemap/lobby-agx.png`, `verafin-agx.png`, `cfia-agx.png` |
| Choice (`render.toneMapping`) | `aces` (ACES Filmic) |
| Exposure (`render.exposure`) | 1.0 |
| Spotlight intensity frozen (`light.spotIntensity`) | 40 cd |
| Reason (one paragraph) | ACES keeps the gallery dark: the ink between pools stays on the page background, so the baked pools, wall washes and spotlit objects carry the image, which is the whole lighting idea (§1, §4). AgX lifts every dark tone toward a flat grey haze: over the 3D area the mean 8-bit luma rises from 12 to 17 (lobby), 19 to 29 (verafin) and 12 to 19 (cfia), and the share of near-black pixels falls from 83% to 63% at the lobby, which reads as a lit room rather than a dark gallery with lit exhibits. AgX's gentler highlight roll-off was not needed: at 40 cd no spotlit surface clips under ACES, and the brass labels keep their warm hue. Exposure stays 1.0; the pool and wash levels are tuned in the lightmaps instead (`lightPools.ts`). |

---

## 10. Reference stills

Empty until gate G2 (after WP-19) and gate G4 (after the polish round). Each row is an approved screenshot that later reviews compare against.

| Gate | Date | Stop | Viewport and tier | Screenshot path | Approved by | Notes |
|---|---|---|---|---|---|---|
| G2 | | | | | | |
| G4 | | | | | | |
