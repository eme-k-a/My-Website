# Commit History: experience spec

**Status:** reconciled for WP-00 by R2 (Art Director) on 2026-10-15.

**Authority:** `docs/PLAN.md` (including its "Addendum: rulings made at kickoff") wins over this file, and a work-package brief's own "Ruling:" lines win inside that brief's scope (the R0 rulings listed in `docs/wp/WP-00.md` Notes are already applied here). This file wins over the panel proposals in the scratchpad (`p_experience.md`, `p_engineering.md`, `p_delivery.md`, `p_resume.md`). Where this file and `docs/ARCHITECTURE.md` disagree on an implementation detail (APIs, file names, schema field names), ARCHITECTURE wins; where they disagree on what the visitor sees, hears or does, this file wins. Section numbers are frozen: briefs cite them as "EXPERIENCE §n".

**Conventions used everywhere below:**
- Units are meters. +Y is up, the aisle runs toward -Z, and the origin is the center of the lobby floor. Angles are in degrees unless marked rad.
- "Camera" is the eye position and "look-at" is the point the camera aims at. Eye height is 1.6 m.
- Color and motion names (`--brass`, `light-2`, `accentGlow`) refer to tokens and materials defined in §7.
- `[placeholder: ...]` marks a fact Emeka has not supplied. Never replace one with a guess.
- "draft" marks copy that needs Emeka's approval. `RELEASE=1 npm run check:copy` blocks launch while any draft or placeholder remains.
- No em dash (U+2014) anywhere, in code, copy or docs. En dashes appear only inside date ranges ("Sep 2026 – Dec 2026"), produced by the shared `formatRange()`.

**Who reads what:**

| Work package | Sections |
|---|---|
| WP-02 contracts (`layout.ts`, test hook, route table) | §2, §3, §6.1 to §6.4 |
| WP-05 art direction (`docs/ART_DIRECTION.md`, tokens, materials) | §4 checklists, §7 |
| WP-08, WP-11, WP-24, WP-26 environment and lighting | §2, §5.1 to §5.7, §6.8, §6.9, §7.5, §7.6 |
| WP-09, WP-15 scroll track, rail, camera feel | §3, §6, §10 |
| WP-10, WP-14, WP-27 app shell, dialog, mobile | §5.8 to §5.10, §8, §9, §10 |
| WP-12, WP-13, WP-20 to WP-23 exhibit builders | §4 (your exhibit), §5.1, §7.6 |
| WP-17, WP-25, WP-30 tests | every "Testable rules" list |
| WP-19 and later reviews (R11) | §4 checklists, §7, §11 |

---

## 1. Concept

**The exhibition is called "Commit History".** It is a small, dark, contemporary gallery that shows Chukwuemeka (Emeka) Nduka-Nwagbo's work the way `git log` shows commits: newest first.

**The walk:**
1. **Lobby.** The visitor arrives in a lobby. The DOM hero (name, current role, degree, Resume PDF, Email, Classic view) is readable before any 3D loads. Through an arch, the first exhibit's light pool already glows on the right.
2. **Main aisle (work only, newest first).** Nasdaq Verafin, Mysa, Wailo, CFIA. Each work role is one sculptural object in a lit glass case on a plinth. Every step forward is a step back in time.
3. **Optional side wings.** Two doors off the aisle lead to small rooms: Projects (KlarUp, Personal Finance Tracker) and Volunteer and Leadership (Software Developers of St. John's). Visitors step inside on purpose; scrolling past skips them.
4. **Foundations room.** At the end of the aisle: the degree (Memorial University, B.Eng Computer Engineering, expected May 2027) and three certifications. It is on the main path, never optional, because recruiters must always pass degree status.
5. **Front desk.** The exit: Email, LinkedIn, "Take home the catalogue" (the resume PDF) and GitHub. The end wall reads "You've reached the beginning."

**How time shows in the space:**
- Brass year strips are set into the floor (2026 at the arch, then 2025 down to 2022).
- Spotlights and placard paper grow warmer the further back the work is.
- The current role carries an "ON VIEW NOW" pill.

**Principles (every work package follows these):**
1. **The DOM is the content; WebGL is the stage.** Every readable word lives in HTML: per-stop cards, the story dialog, the hero. 3D text exists only for big labels that duplicate DOM text.
2. **One object per case.** Each exhibit is a single sculptural object built from code primitives with at most one slow motion. Restraint reads as craft; busyness reads as programmer art.
3. **Native scroll, never hijacked.** The page scrolls like a page. The camera follows the scroll position.
4. **A recruiter gets everything in 10 seconds.** Name, current role, degree, Resume PDF, Email and Classic view are in the first phone viewport, with or without JavaScript.
5. **Truth over flourish.** No invented metrics, no logos, no imagery that overstates the work (Verafin shows reporting, never fraud detection).
6. **Computed, not hand-placed.** The layout, numbering, year strips, light warmth and durations are all computed from the content file, so a new job slides everything down the aisle with no hand-edited coordinates.

---

## 2. Spatial layout and coordinates

### 2.1 Frozen constants (`src/museum/rail/layout.ts`)

| Constant | Value | Meaning |
|---|---|---|
| `EYE_Y` | 1.6 | Camera height at every stop |
| `SPACING` | 12 | Distance in z between consecutive main work exhibits |
| `FIRST_Z` | -10 | z of the newest work exhibit |
| `EXHIBIT_X` | 2.4 | abs(x) of main aisle plinth centers |
| `AISLE_HALF` | 3.5 | Aisle half width (aisle is 7 m wide, x -3.5 to 3.5) |
| `AISLE_CEILING` | 5 | Aisle and Foundations ceiling height |
| `ARCH_Z` | -4 | Lobby back wall with the arch into the aisle |
| `CAM_DRIFT_X` | 0.6 | Camera drifts this far from the centerline toward the case |
| `CAM_BACK_Z` | 2.8 | Camera stands this far toward the lobby from the plinth z |
| `SLOT_Y` | 1.35 | World y of a standard slot center (case center) |
| `DOOR_CAM_BACK_Z` | 1.8 | Door stop camera stands this far toward the lobby from the door |
| `DOOR_LOOK_Y` | 1.5 | Door stop look-at height |
| `DOOR_W`, `DOOR_H` | 2.4, 2.8 | Door opening |
| `WING_DEPTH`, `WING_LENGTH`, `WING_CEILING` | 8, 8, 4 | Wing room size outward from the aisle wall, along z, and height |
| `WING_PLINTH_OUT`, `WING_PLINTH_DZ` | 5.5, 2.2 | Wing plinth: distance outward from the aisle wall, z offset from the door |
| `WING_CAM_OUT`, `WING_CAM_DZ` | 2.1, 1.4 | Wing camera: distance outward from the aisle wall, z offset from the door |

### 2.2 Derivation rules (pure function of the content)

Let the main work exhibits be `w[0..n-1]`, newest first (today `n = 4`: verafin, mysa, wailo, cfia). Let `σ = +1` for right and `-1` for left.

1. **Main exhibit i:** side `σ_i = +1` when i is even, `-1` when odd (newest is on the right).
   - Plinth center: `(σ_i * 2.4, z_i)` with `z_i = FIRST_Z - SPACING * i`.
   - Camera: `(σ_i * 0.6, 1.6, z_i + 2.8)`. Look-at: `(σ_i * 2.4, 1.35, z_i)`.
2. **Door for wing W** with `W.after = w[k]` and `W.side = σ` (content fields `wing.after`, `wing.side`):
   - `zDoor = (z_k + z_{k+1}) / 2 = z_k - 6` (the midpoint rule from the PLAN addendum).
   - Door opening centered at `(σ * 3.5, zDoor)` in the aisle wall, 2.4 m wide, 2.8 m tall.
   - Door stop camera: `(0, 1.6, zDoor + 1.8)`. Look-at: `(σ * 3.5, 1.5, zDoor)`.
   - Threshold waypoint (rail only, not a stop): `T = (σ * 3.5, 1.6, zDoor)`.
   - Room footprint: x from `σ * 3.5` to `σ * 11.5`, z from `zDoor + 4` to `zDoor - 4`, ceiling 4.
   - Wing item j (j = 0 or 1, in content order): plinth `(σ * 9, zDoor + 2.2 - 4.4 j)`; camera `(σ * 5.6, 1.6, zDoor + 1.4 - 2.8 j)`; look-at `(σ * 9, 1.35, plinth z)`.
   - Validation (the layout throws, and a unit test covers each case): `k` must not be the last work exhibit (a door needs exhibits on both sides); two wings may not share `after`; a wing holds 1 or 2 items in v1.
3. **Foundations room and desk** are placed relative to the last work exhibit, `zLast = z_{n-1}` (today -46):
   - Aisle ends at `zLast - 6` (today -52), where it opens into the Foundations room.
   - Foundations room: x -6 to 6, z `zLast - 6` to `zLast - 16`, ceiling 5.
   - mun plinth `(-2.5, zLast - 11)`; camera `(-0.3, 1.6, zLast - 8.4)`; look-at `(-2.5, 1.25, zLast - 11)` (the MUN slot center, §5.3).
   - certifications wall vitrine: back panel on the right wall (x 6) centered at `(6, 1.6, zLast - 11)`; slot center `(5.85, 1.6, zLast - 11)`; camera `(2.2, 1.6, zLast - 11)`; look-at = slot center.
   - Desk zone: x -5 to 5, z `zLast - 16` to `zLast - 24`, ceiling 4. Opening from Foundations into the desk zone: x -2.5 to 2.5 at z `zLast - 16`, 3.2 m tall.
   - Desk center `(0, zLast - 21.5)`; camera `(0, 1.6, zLast - 18)`; look-at `(0, 1.1, zLast - 21.5)`. End wall at z `zLast - 24`.
4. **Lobby** is fixed: x -6 to 6, z 6 to -4, ceiling 6. Camera `(0, 1.6, 4)`, look-at `(0, 1.6, FIRST_Z)`.

Note on deviations from `p_experience.md`: the projects door moved from z -15 to z -16 (midpoint rule), so the Projects room, its plinths and camera stops moved 1 m with it. The MUN look-at y is 1.25 (its slot center) instead of 1.35, and the certifications look-at is the slot center (5.85) instead of the wall (6). Everything else keeps the proposal's numbers.

### 2.3 Zones (resulting numbers today)

| Zone | x | z | Ceiling | Contents |
|---|---|---|---|---|
| Lobby | -6 to 6 | 6 to -4 | 6 | Arch in the back wall at z -4 (opening x -2 to 2, 3.6 m tall). Brass "COMMIT HISTORY" above the arch. Portrait in a brass frame right of the arch |
| Main aisle | -3.5 to 3.5 | -4 to -52 | 5 | 4 work exhibits, 2 doors, 5 year strips, ceiling light slot |
| Projects wing | -11.5 to -3.5 | -12 to -20 | 4 | Door in the left wall at z -16. KlarUp, Personal Finance Tracker |
| Volunteer wing | 3.5 to 11.5 | -24 to -32 | 4 | Door in the right wall at z -28. Software Developers of St. John's (the only exhibit) |
| Foundations | -6 to 6 | -52 to -62 | 5 | MUN on its large plinth at (-2.5, -57). Certifications wall vitrine on the right wall at z -57 |
| Front desk | -5 to 5 | -62 to -70 | 4 | Walnut and brass desk at (0, -67.5). End wall at z -70 |

**Lobby fixtures:**
- "COMMIT HISTORY": brass 3D letters, Instrument Serif, cap height 0.28 m, baseline y 4.1, centered at (0, y, -3.98), facing +Z.
- Portrait: 0.8 x 1.0 m, thin brass frame, center (3.4, 1.7, -3.95), facing +Z. Warm duotone (shadows `#16161A`, highlights `#F2EDE4`) that cross-fades to full color on hover (§11). It is decorative; no caption in v1.

**Aisle fixtures:**
- Ceiling light slot: a 0.12 m wide dim strip down the centerline at y = ceiling - 0.01, material `ceilingSlot` (§7.6).
- Wall bays: panel seams every 2 m, baked into the shared wall wash texture (§7.5).
- Doors: a 2.4 x 2.8 m opening with a 4 cm brass reveal. Room name above it on the aisle side (§5.4).
- "FOUNDATIONS" sign: on a 0.4 m deep header beam spanning the aisle end at z -52, facing +Z, baseline y 4.3.

### 2.4 Main track coordinates

| # | Stop id | Type | Camera (x, y, z) | Look-at (x, y, z) | Target |
|---|---|---|---|---|---|
| 0 | `lobby` | lobby | (0, 1.6, 4) | (0, 1.6, -10) | View down the aisle through the arch |
| 1 | `verafin` | exhibit | (0.6, 1.6, -7.2) | (2.4, 1.35, -10) | Plinth (2.4, -10), right |
| 2 | `projects-door` | door | (0, 1.6, -14.2) | (-3.5, 1.5, -16) | Door (-3.5, -16), left |
| 3 | `mysa` | exhibit | (-0.6, 1.6, -19.2) | (-2.4, 1.35, -22) | Plinth (-2.4, -22), left |
| 4 | `volunteer-door` | door | (0, 1.6, -26.2) | (3.5, 1.5, -28) | Door (3.5, -28), right |
| 5 | `wailo` | exhibit | (0.6, 1.6, -31.2) | (2.4, 1.35, -34) | Plinth (2.4, -34), right |
| 6 | `cfia` | exhibit | (-0.6, 1.6, -43.2) | (-2.4, 1.35, -46) | Plinth (-2.4, -46), left |
| 7 | `mun` | exhibit | (-0.3, 1.6, -54.4) | (-2.5, 1.25, -57) | Large plinth (-2.5, -57) |
| 8 | `certifications` | exhibit | (2.2, 1.6, -57) | (5.85, 1.6, -57) | Wall vitrine, right wall, z -57 |
| 9 | `desk` | desk | (0, 1.6, -64) | (0, 1.1, -67.5) | Desk (0, -67.5) |

Door derivations: projects door z = (-10 + -22) / 2 = -16; volunteer door z = (-22 + -34) / 2 = -28. Content today: `projects.after = verafin`, `projects.side = left`; `volunteer.after = mysa`, `volunteer.side = right`. Default advice for R1: put a wing on the side opposite its `after` exhibit. The midpoint rule keeps every door 6 m from the nearest plinth on either wall, so any side is collision-free.

### 2.5 Wing track coordinates

Each wing track starts with its door pose (index 0, identical to the main-track door stop, so the swap between tracks has no jump), then passes the threshold waypoint T, then the wing's exhibit stops.

**Projects wing** (door z -16, σ = -1). Room x -11.5 to -3.5, z -12 to -20, ceiling 4.

| Track # | Stop id | Camera | Look-at | Plinth |
|---|---|---|---|---|
| 0 | `projects-door` | (0, 1.6, -14.2) | (-3.5, 1.5, -16) | (door) |
| (waypoint) | threshold T | (-3.5, 1.6, -16) | not a stop | |
| 1 | `klarup` | (-5.6, 1.6, -14.6) | (-9, 1.35, -13.8) | (-9, -13.8) |
| 2 | `finance-tracker` | (-5.6, 1.6, -17.4) | (-9, 1.35, -18.2) | (-9, -18.2) |

**Volunteer and Leadership wing** (door z -28, σ = +1). Room x 3.5 to 11.5, z -24 to -32, ceiling 4.

| Track # | Stop id | Camera | Look-at | Plinth |
|---|---|---|---|---|
| 0 | `volunteer-door` | (0, 1.6, -26.2) | (3.5, 1.5, -28) | (door) |
| (waypoint) | threshold T | (3.5, 1.6, -28) | not a stop | |
| 1 | `sdsj` | (5.6, 1.6, -28) | (9, 1.35, -28) | (9, -28) |

A wing with two items puts them at the door z plus and minus 2.2 m (cameras plus and minus 1.4 m). A wing with one item, as the volunteer wing is since F-035 (the Safe Sip entry was removed on 2026-10-20), centres the plinth and the camera on the door axis (z = door z), so the visitor looks straight through the door at it.

Wing item order is content order, newest first where dates exist. Projects order is KlarUp, then Personal Finance Tracker, until [placeholder: project dates] are known.

### 2.6 Clearances (checked by WP-24's rail sampling test, minimum 0.4 m from any wall)

- Main stops sit at abs(x) ≤ 0.6, at least 2.9 m from the aisle walls.
- Lobby to Verafin crosses the arch plane (z -4) near x 0.43, 1.57 m inside the 4 m arch.
- Wing entry rail: door stop camera, then T, then the first wing stop. T is the door center, 1.2 m from each jamb. Wing stops are 2.1 m from the shared aisle wall and 2.6 m (two-item wing) or 4 m (lone item) from the room's end walls.
- certifications to desk crosses the desk opening (z -62) near x 0.63, inside x -2.5 to 2.5.

### 2.7 Computed from content: what a new job does

`computeLayout(content, now)` (ARCHITECTURE §6.6; `now` is the build date) returns tracks with their stop poses, slots, doors, rooms, year strips (`yearMarks`) and the age parameter (`ageT`) that drives the light ramp. Nothing in the scene has a hand-typed coordinate. Adding a new work entry at the top of `experiences`:
- Every work exhibit moves 12 m further down the aisle, and sides re-alternate from the newest (on the right).
- Doors follow their `after` anchors; the Foundations room and desk follow the new last work exhibit; year strips, light warmth, paper aging and exhibit numbers recompute.

Worked example with a hypothetical new entry X:

| Item | Today | With X added |
|---|---|---|
| X | | (2.4, -10), right |
| verafin | (2.4, -10), right | (-2.4, -22), left |
| mysa | (-2.4, -22), left | (2.4, -34), right |
| wailo | (2.4, -34), right | (-2.4, -46), left |
| cfia | (-2.4, -46), left | (2.4, -58), right |
| projects door (after verafin) | z -16 | z -28 |
| volunteer door (after mysa) | z -28 | z -40 |
| Foundations room | z -52 to -62 | z -64 to -74 |
| desk | (0, -67.5) | (0, -79.5) |

The new stop shows the placeholder crate (§5.7) until its exhibit is built. The layout snapshot test is updated in the same commit as the content change and reviewed as a diff.

### 2.8 Testable rules
- The layout snapshot pins every number in §2.4 and §2.5 (to 3 decimals) for today's content: 10 main stops and 2 wing tracks (the door pose at index 0, then the wing's exhibit stops: 2 in projects, 1 in volunteer).
- A unit test adds a fake newest job and asserts the shifts in §2.7.
- Unit tests cover each validation failure in §2.2 rule 2.
- Every rail sample (every 0.1 m of arc length, main and wing rails) stays at least 0.4 m from every wall and passes door planes only within the door opening minus 0.4 m.

---

## 3. Stops and tracks

### 3.1 Track model
- **Main track** (10 stops): `lobby, verafin, projects-door, mysa, volunteer-door, wailo, cfia, mun, certifications, desk`. Built as: lobby, then for each work exhibit its stop followed by the door of any wing whose `after` is that exhibit, then the Foundations items (education, then certifications), then the desk.
- **Wing tracks:** in `layout.ts` each wing track is `[<wing>-door, ...items]`: `[projects-door, klarup, finance-tracker]` and `[volunteer-door, sdsj]`, so the door pose is index 0 of both its tracks (§2.5). The wing exhibits are `klarup, finance-tracker` (projects) and `sdsj` (volunteer).
- **Stop ids are frozen.** Exhibit ids: `verafin, mysa, wailo, cfia, klarup, finance-tracker, sdsj, mun, certifications`. Stop-only ids: `lobby, projects-door, volunteer-door, desk`.
- **Exhibit numbers** are computed, never stored. Main-track exhibits are numbered in track order: verafin 01, mysa 02, wailo 03, cfia 04, mun 05, certifications 06. Wing exhibits use the wing letter: klarup P1, finance-tracker P2, sdsj V1. Shown as "No. 01" or "No. P1".
- **Catalogue order** (keyboard order of stories, dialog Newer/Older order, `/exhibit/` page order): `verafin, klarup, finance-tracker, mysa, sdsj, wailo, cfia, mun, certifications`. Wing items appear right after the exhibit their door follows.

### 3.2 Main track stops

| # | Stop | Card (§5.8) | Enter (focus on body) | Real light target (§6.8) |
|---|---|---|---|---|
| 0 | lobby | The hero (§8.1) | Nothing custom | Portrait |
| 1 | verafin | Exhibit card No. 01 | Open story | verafin |
| 2 | projects-door | Door card: "Projects wing", 2 exhibits | Step inside | mysa (next target ahead) |
| 3 | mysa | Exhibit card No. 02 | Open story | mysa |
| 4 | volunteer-door | Door card: "Volunteer & Leadership wing", 1 exhibit | Step inside | wailo |
| 5 | wailo | Exhibit card No. 03 | Open story | wailo |
| 6 | cfia | Exhibit card No. 04 | Open story | cfia |
| 7 | mun | Exhibit card No. 05 | Open story | mun |
| 8 | certifications | Exhibit card No. 06 | Open story | certifications |
| 9 | desk | Desk card (§8.4) | Nothing custom | Desk |

### 3.3 Scroll track structure (DOM)
- One `<section data-stop="<id>" id="stop-<id>">` per stop, in track order, each `min-height: 100svh`; only the active track's sections take part in layout.
- `scroll-snap-type: y mandatory` under `(pointer: coarse)`, `y proximity` under `(pointer: fine)`. `scroll-snap-align: start` and `scroll-snap-stop: always` on every section.
- No wheel or touch listeners, no `touch-action: none`, no `preventDefault` on scroll input. Arrow keys, Space, Page Up/Down, Home and End stay browser-native. The only custom keys are Enter and Esc.
- Sections are `pointer-events: none`; their cards are `pointer-events: auto`. The canvas is `position: fixed`, `aria-hidden="true"`, and the R3F `eventSource` is the app root, so clicks on cases reach the scene.
- Wing sections are in the prerendered HTML (after their door section) so the no-JS page lists everything. In museum mode they are hidden until their wing is entered (CSS keyed on `data-mode` and the active track, so nothing shifts at hydration; ARCHITECTURE §6.1).
- The "Begin the walk" control is an in-page anchor to `#stop-verafin` (a fragment, not a route; the router never reads fragments).

### 3.4 Entering and leaving a wing
**At a door stop** the card offers "Step inside" (button, Enter, or a tap on the door in 3D) and lists the wing's exhibits as links to their stories. Scrolling on skips the wing.

**Step inside** (mechanics in ARCHITECTURE §6.7):
1. Save the main scroll position and push one history entry with the same URL and `state = { inApp: true, track: '<wingId>', mainScrollY }` (ARCHITECTURE §5.6).
2. The track swaps: every main section except this door's is hidden, the wing's sections are shown, and the page scrolls instantly to the first wing exhibit's section. No URL change.
3. The camera glides along the wing rail from the door pose through threshold T to the first wing stop: 1.4 s, easeInOutCubic (reduced motion: fade-cut, §6.6).
4. The HUD shows "Projects wing, 1 of 2" and a persistent "Return to the aisle" button (Esc). The last wing card also offers "Return to the aisle".
5. Announce: "Entered the Projects wing. No. P1, The Climb." (§10.3).

**Return to the aisle** (Esc with no dialog open, the HUD button, the card button, or browser Back):
1. If `history.state?.inApp` is true and `history.state.track` is this wing, call `history.back()` and do the rest on `popstate`. Otherwise (the wing was entered by a cold-loaded deep link) `replaceState` with `{ inApp: false, track: 'main' }` and do the rest directly.
2. The camera glides from the current wing stop back through T to the door pose: 1.2 s, easeInOutCubic.
3. Main sections return, wing sections are hidden, and the page scrolls instantly to the saved main scroll position (the door section). Focus moves to the door card's "Step inside" button.
4. Announce: "Back in the main aisle at the Projects wing door."

There is no trap: the wing has two stops, the top of the wing track is its first exhibit, and Return to the aisle is always visible.

### 3.5 Stories, routes and history
- Routes: `/` (gallery), `/exhibit/<id>/` (prerendered per exhibit; opens its story), `/resume/` (classic resume, zero WebGL), `/resume.pdf`, and a static `404.html`. No hash routes.
- **Open a story** (card button, a click on the current case, Enter, or a door-card link): `pushState('/exhibit/<id>/', { inApp: true, id, track })` with the active track, then `showModal()`. History state shapes are ARCHITECTURE §5.6's.
- **Newer and Older** inside the dialog follow catalogue order (§3.1) and call `replaceState('/exhibit/<newId>/', { inApp: true, id: newId, track })` with the active track unchanged. The camera moves to the new exhibit behind the dialog only when that exhibit is on the active track; otherwise it stays.
- **Close:** if `history.state?.inApp`, call `history.back()`; otherwise (cold-loaded deep link) `replaceState({ inApp: false, track }, '', '/')`. Browser Back closes an in-app dialog.
- **Stop arrivals never write the URL.** Scrolling, snapping, HUD jumps and keyboard moves never touch history.
- **Cold load of `/exhibit/<id>/`:** the story text is visible at first paint (prerendered). When the museum boots, the camera is placed instantly at the exhibit's stop (entering its wing without a history entry if needed) before the canvas fades in.
- Clicking the case of an exhibit that is not the current stop travels there (scrolls to its section) and does not open the story.
- The test hook `window.__MUSEUM__.goTo(id, { instant })` accepts every stop id, wing exhibits included; it enters and leaves wings through the same code as the UI, including the wing's history entry (ARCHITECTURE §6.7), so tests exercise the real path.

### 3.6 Testable rules
- From the lobby, a 40-event decaying wheel stream and three discrete 100 px notches each settle on a whole stop with none skipped; a Pixel 7 flick moves exactly one stop.
- No non-passive `wheel` or `touchmove` listener exists on `window` or `document`.
- Step inside at `projects-door` lands on `klarup`; Esc lands on `projects-door`; browser Back after Step inside lands on `projects-door`; the URL is `/` throughout.
- Open, Older x3, then Back closes the dialog. Cold-load `/exhibit/verafin/`, close: URL is `/` on the same origin.
- `history.length` does not change while scrolling through all 10 main stops.

---

## 4. Exhibit concepts

**Rules for every exhibit (builders read this first):**
- **Local frame.** Origin = center of the plinth top. +Y is up; +Z points toward the stop camera (the kit's `ExhibitFrame` rotates the group so local +Z faces the camera horizontally); +X is the viewer's right.
- **Standard slot:** x and z in [-0.325, 0.325], y in [0.025, 0.675]. Overrides: mun (§5.3), certifications wall vitrine (§5.3).
- **One sculptural object** with **at most one slow motion**, driven by one clock. Hover adds nothing exhibit-specific (the kit handles light lift).
- **≤ 20k triangles**, hard limit, measured by `stats()`. The estimates below leave wide margins; do not spend the margin on detail that does not read at 3 m.
- **Materials come only from the shared library** (§7.6), through `props.materials` or the kit's re-exported `useMaterial(name)` (never by importing `src/museum/materials` directly). For a per-exhibit animated `emissiveIntensity` or `opacity`, use `useMaterialInstance(name)` (a clone that shares the compiled shader program). Never construct a material, never add a light, never load a texture or model, never import the store or router.
- **No logos, no brand marks, no readable text in 3D.** Organization names and numbers are on the wall title, drawn by the kit (§5.4).
- **Deterministic:** all randomness comes from the seeded noise the kit provides; under `?test=1` and `prefers-reduced-motion` the exhibit shows its reduced-motion pose, identical every frame.
- **Each exhibit ships a one-sentence object description** (the "The object" section of its story dialog, §5.9), stored in content as `exhibit.object` with `draft: true` until the built object is confirmed. The text below is the approved starting copy; R1 owns the final wording in content (`docs/CONTENT_DRAFT.md` §5).
- **Approval:** R2 files a pass/fail copy of the checklist at `review/concepts/<id>.md`. Every box must pass. The 320 px grayscale thumbnail test means: a 320 px wide grayscale crop of the stop screenshot shows one readable object, not a cluster.

### 4.1 verafin: "The Reporting Engine" (No. 01)
- **Symbolizes:** platform data becoming accurate, readable reports, and reporting plugins that extend the engine. It depicts reporting and data platform work only. **Copy guard:** nothing here, in 3D or in copy, may suggest Emeka builds fraud detection or AML models. The domain appears only as what the platform supports.
- **Object:**
  - Base tray: `walnut` RoundedBox 0.60 (x) x 0.03 (y) x 0.44 (z), radius 0.008, center (0, 0.04, 0).
  - Column: `frostedGlass` cylinder, radius 0.07, height 0.46, 48 segments, axis at (-0.19, z -0.10), standing on the tray (y 0.055 to 0.515).
  - Core: `accentGlow` cylinder radius 0.012, height 0.42, on the column axis, emissive intensity 0.35 (static).
  - Dock collar: `brass` torus around the column at y 0.30, radius 0.078, tube 0.008.
  - Plugin cartridges: 3 `brass` RoundedBoxes 0.07 (radial) x 0.10 (tall) x 0.018 (thick), radius 0.004, docked radially into the collar at azimuths 90°, 210° and 330° (0° = local +X, 90° = local +Z), spanning radius 0.07 to 0.14 from the column axis, centered at y 0.30.
  - Conduit: `brass` flat strip 0.24 x 0.006 x 0.03 on the tray from the column base toward the grid.
  - Report grid: 6 x 6 `ceramic` (bone) boxes, each 0.038 x h x 0.038 at 0.048 pitch (grid 0.278 m square), centered at (0.12, z 0.06), standing on the tray, heights h in [0.02, 0.18]. One instanced mesh.
- **Motion (one):** the report refreshes. Every 8 s the 36 bar heights ease to the next seeded set over 1.6 s (easeInOutCubic), sweeping left to right with a 40 ms stagger per column. Period 8 s. Column, core, collar and cartridges are static.
- **Materials:** walnut, frostedGlass, accentGlow, brass, ceramic.
- **Triangles:** about 2,500.
- **Reduced-motion pose:** bars frozen at seeded set 0.
- **Object description (DOM):** "A frosted glass column feeds a six-by-six grid of bars that refreshes like a report. Three brass cartridges docked in the column are the plugins that extend it."
- **Checklist:**
  - [ ] In a 320 px grayscale thumbnail it reads as one object: a tall column beside a stepped block of bars.
  - [ ] Exactly one motion (the 8 s refresh); column, core, collar and cartridges never move.
  - [ ] Exactly 3 cartridges, all touching the collar; nothing floats.
  - [ ] No detection imagery: no red or amber bars, no highlighted or flagged bar, no alert icon, no magnifying glass, no particles or streams.
  - [ ] No axis labels, numbers or text anywhere.
  - [ ] Bounding box inside the standard slot; triangles ≤ 20k.
  - [ ] Only the five listed library materials.
  - [ ] Reduced-motion and `?test=1` frames are pixel-identical over 3 s.

### 4.2 mysa: "Warm Start" (No. 02)
- **Symbolizes:** a mobile release pipeline warming up from build to store release (the Detox CI/CD work), and single sign-on as a key passing through a ring (Keycloak and OAuth 2.0). The slab is a generic wall unit, deliberately not a replica of any real thermostat.
- **Object:**
  - Base tray: `walnut` RoundedBox 0.58 x 0.03 x 0.36, center (0, 0.04, 0).
  - Wall-unit slab: `ceramic` (bone) RoundedBox 0.30 (x) x 0.48 (y) x 0.05 (z), radius 0.03, center (-0.10, 0.295, -0.08), standing on the tray.
  - Dial: four `accentGlow` torus arcs (instances), ring radius 0.10, tube 0.012, each spanning 80° with 10° gaps, on the slab front face, centered at (-0.10, 0.33, -0.043). Segment order clockwise from the top: build, end-to-end tests, dev release, store release.
  - Bezel: `brass` torus radius 0.125, tube 0.004, same center.
  - Key ring: `brass` torus radius 0.06, tube 0.008, upright with its axis along local X, center (0.17, 0.24, 0.06), on a `brass` stand cylinder radius 0.005 from the tray (y 0.055) to the ring.
  - Key: `brass`, frozen mid-pass through the ring along local X. Bow torus radius 0.03, tube 0.007, at x 0.08; shaft cylinder radius 0.006 from x 0.09 to 0.25; three box teeth 0.012 x 0.018 x 0.006 near x 0.24.
- **Assembly turn:** the ring-and-key assembly turns 35 degrees about the stand axis, with the key's bow toward the camera (`SSO_YAW_DEG` in `mysa/dial.ts`).
- **Motion (one):** the dial segments light in order, one every 2 s (each ramps 0.15 to 1.6 emissive over 0.6 s), all four hold lit until 8.5 s, then fade together to rest over 1 s. Period 10 s. Key, ring and slab are static.
- **Materials:** ceramic, walnut, brass, accentGlow.
- **Triangles:** about 4,500.
- **Reduced-motion pose:** all four segments lit at intensity 1.0.
- **Object description (DOM):** "A ring dial on a wall unit lights four segments in turn (build, end-to-end tests, dev release, store release) as the release pipeline warms up. At its foot, a brass key passes through a ring: the single sign-on token exchange."
- **Checklist:**
  - [ ] Reads as one object: an upright slab with a ring dial, with the key and ring at its foot.
  - [ ] The slab is generic: rounded rectangle, no screen, no buttons, no logo, not a copy of a real product.
  - [ ] Exactly four dial segments; the only motion is their sequential lighting on a 10 s loop.
  - [ ] The key visibly passes through the ring (they overlap); neither moves.
  - [ ] No phone silhouettes, no orbiting parts, no text.
  - [ ] Inside the standard slot; ≤ 20k triangles.
  - [ ] Only ceramic, walnut, brass, accentGlow.
  - [ ] Reduced-motion pose shows all four segments lit.

### 4.3 wailo: "The Deep Link" (No. 03)
- **Symbolizes:** password recovery through a deep link into a React Native app, and carrying features through an App Store release (the blank brass tag).
- **Object:**
  - Base tray: `walnut` RoundedBox 0.60 x 0.03 x 0.40, center (0, 0.04, 0).
  - Stand: `walnut` wedge (box 0.26 x 0.05 x 0.12, rear raised) at (0.08, 0.08, -0.04).
  - Phone: `ceramicGraphite` RoundedBox 0.22 x 0.44 x 0.022, radius 0.025, resting on the stand, tilted back 15° and yawed 10° toward the envelope; bottom near y 0.075, top near y 0.50.
  - Screen: `frostedGlass` plane 0.19 x 0.40, inset 1 mm above the phone front.
  - Reset card on the screen: `paper` RoundedBox 0.15 x 0.10 x 0.004 centered on the screen, carrying a small `brass` key glyph (bow torus radius 0.012, shaft 0.03) and an `accentGlow` bar 0.10 x 0.008 (the reset button) below it.
  - Envelope: `paper` box 0.14 x 0.09 x 0.012 with a raised V flap, lying at (-0.20, 0.07, 0.12), tilted up 20°.
  - Link arc: `accentGlow` tube, radius 0.005, 64 tubular x 6 radial segments, a cubic curve from the envelope center to the top right of the screen, peaking at y 0.62.
  - Pulse: `accentGlow` sphere radius 0.014 that rides the arc.
  - Release tag: `brass` rounded tag 0.06 x 0.035 x 0.003, blank, hanging by a `brass` chain (cylinder radius 0.0015, 0.05 long) from the phone's lower right corner.
- **Motion (one):** the delivery. The pulse travels the arc from envelope to screen in 1.6 s (easeInOutSine); on arrival the reset button bar flashes 0.4 to 1.6 to 0.4 over 0.8 s. Period 8 s. Nothing else moves.
- **Materials:** walnut, ceramicGraphite, frostedGlass, paper, brass, accentGlow.
- **Triangles:** about 3,000.
- **Reduced-motion pose:** pulse hidden; arc at rest glow; reset bar lit at 1.0.
- **Object description (DOM):** "A phone leans back on its stand while a glowing link arcs into it from an envelope, and the screen answers with a reset card: password recovery through a deep link. The blank brass tag marks the App Store release."
- **Checklist:**
  - [ ] Reads as one object: a tilted phone receiving a single glowing arc from an envelope.
  - [ ] The screen shows only the reset card: no chat bubbles, no copied app UI, no readable text, no logos.
  - [ ] The arc is one smooth tube that starts at the envelope and ends on the screen.
  - [ ] One motion: the pulse along the arc on an 8 s loop.
  - [ ] The tag touches the phone via its chain and is blank.
  - [ ] Inside the standard slot (arc peak ≤ 0.675); ≤ 20k triangles.
  - [ ] Only the six listed library materials.

### 4.4 cfia: "The Ticket Spindle" (No. 04)
- **Symbolizes:** steady, methodical resolution of high-volume support tickets for a distributed team: where the career began. This case gets the warmest light in the building (§6.9).
- **Object:**
  - Box: `walnut` RoundedBox 0.30 x 0.12 x 0.22, center (0, 0.085, 0).
  - Spindle: `brass` base disc radius 0.04, height 0.006 on the box top; `brass` rod radius 0.005 from y 0.145 to 0.545; `brass` cone tip radius 0.005, height 0.03 (top at 0.575).
  - Tickets: 14 `paper` boxes 0.12 x 0.0025 x 0.08 impaled on the spindle, stacked from y 0.152 at a 0.006 pitch, each with a seeded yaw within ±12° and offset within ±4 mm. One instanced mesh (15 instances, including the falling one).
  - Stamps: one `ceramicGraphite` mark 0.035 x 0.0005 x 0.014 near a corner of each ticket, rotated 8°, blank. One instanced mesh.
- **Motion (one):** a new ticket descends the spindle from y 0.52 and lands on the stack in 2.4 s (easeOutCubic), then the whole stack sinks one pitch into the box over 0.8 s, so the bottom ticket disappears and the count stays 14. Period 6 s.
- **Materials:** walnut, brass, paper, ceramicGraphite.
- **Triangles:** about 1,000.
- **Reduced-motion pose:** 14 tickets stacked, no falling ticket.
- **Object description (DOM):** "Paper tickets settle one by one onto a brass desk spindle, each stamped in its corner: steady, methodical support for a distributed team."
- **Checklist:**
  - [ ] Reads as one object: a brass spindle holding a stack of paper on a walnut box.
  - [ ] The visible ticket count is constant; the stack never grows, and no number or counter appears anywhere.
  - [ ] Stamps are blank marks; no "RESOLVED" or other text.
  - [ ] No CRT monitor, no pin-light ring, no figures.
  - [ ] One motion: descend and settle on a 6 s loop.
  - [ ] Inside the standard slot; ≤ 20k triangles.
  - [ ] Only walnut, brass, paper, ceramicGraphite.

### 4.5 klarup: "The Climb" (No. P1)
- **Symbolizes:** a gamified, collaborative task app where people hold each other accountable; the small crate is the standalone Android build shipped through Expo Application Services.
- **Object:**
  - Base tray: `walnut` RoundedBox 0.60 x 0.03 x 0.42, center (0, 0.04, 0).
  - Steps: 5 `ceramic` (bone) tiles, RoundedBox 0.11 x 0.03 x 0.11, radius 0.01. Tile i (0 to 4) centered at x = -0.22 + 0.11 i, y = 0.085 + 0.075 i (raised so tile 0 also stands on a visible post; approved by Emeka 2026-10-24), z = 0.10 - 0.05 i, each on a `brass` post (cylinder radius 0.004) down to the tray.
  - Check marks: on each tile top, a check made of two `accentGlow` bars (0.035 and 0.06 long, 0.012 square section (thickened so the checks read from the stop camera; approved by Emeka 2026-10-24), at 45° and -45°), one material instance per tile.
  - The team: 3 `brass` spheres radius 0.018, resting together on the top tile (static).
  - Build crate: `walnut` cube 0.09 with `brass` corner strips, at (0.22, 0.10, 0.15), blank.
- **Motion (one):** the checks light one by one up the stairs, one every 1.6 s (rest 0.1 to lit 1.4 over 0.5 s), all five hold lit for 2 s, then reset together over 1 s. Period 10 s.
- **Materials:** walnut, ceramic, brass, accentGlow.
- **Triangles:** about 2,800.
- **Reduced-motion pose:** all five checks lit.
- **Object description (DOM):** "Five tiles climb like a staircase and tick themselves off one by one, while three brass beads wait together on the top step: accountability as a team sport. The small crate at the base is the standalone Android build."
- **Checklist:**
  - [ ] Reads as one object: a five-step staircase.
  - [ ] No flame or fire effect; the three beads never move or hop.
  - [ ] Every tile is supported by a brass post; nothing floats.
  - [ ] No phone, no app UI, no text on the crate.
  - [ ] One motion: checks light in sequence on a 10 s loop.
  - [ ] Inside the standard slot; ≤ 20k triangles.
  - [ ] Only walnut, ceramic, brass, accentGlow.

### 4.6 finance-tracker: "The Balance" (No. P2)
- **Symbolizes:** income, expenses and a budget kept in balance in one full-stack app. The language-model analysis lives in the story text, not in 3D.
- **Object:**
  - Ledger tray: `walnut` RoundedBox 0.56 x 0.03 x 0.30, center (0, 0.04, 0).
  - Three coin stacks on the tray at x = -0.17, 0, +0.17 (z 0): Income in `brass`, Expenses in `ceramicGraphite`, Budget in `frostedGlass`. Each coin is a cylinder radius 0.055, height 0.009, 24 segments; each stack holds 8 to 24 coins (top ≤ y 0.271). One instanced mesh per stack.
- **Motion (one):** every 6 s the three stacks ease to a new seeded set of counts over 1.2 s; coins appear or leave at the top with a 200 ms scale. Expenses never exceeds Income, and Budget always sits between them. Period 6 s.
- **Materials:** walnut, brass, ceramicGraphite, frostedGlass.
- **Triangles:** about 7,500 at the maximum count.
- **Reduced-motion pose:** Income 20, Expenses 14, Budget 17 coins (a design pose, not data).
- **Object description (DOM):** "Three coin stacks, income in brass, expenses in graphite and the budget in frosted glass, rise and fall but always stay in balance."
- **Checklist:**
  - [ ] Reads as one object: three coin stacks on one tray.
  - [ ] No speech bubble, no text, no labels, no currency symbols, no chart.
  - [ ] Stacks differ only by library material (brass, graphite, frosted glass).
  - [ ] One motion: rebalancing every 6 s; Expenses ≤ Budget ≤ Income at every frame.
  - [ ] Values are seeded noise, never real financial data.
  - [ ] Inside the standard slot; ≤ 20k triangles.
  - [ ] Only walnut, brass, ceramicGraphite, frostedGlass.

### 4.7 (removed)
The `safe-sip` exhibit ("Tamper Evident") was removed on 2026-10-20 (F-035, Emeka's decision). The number stays so that the references to §4.8 and later sections hold.

### 4.8 sdsj: "The Round Table" (No. V1)
- **Symbolizes:** Software Developers of St. John's, where Emeka is President: recurring monthly mini-hackathons that bring developers, designers and founders together to build.
- **Object (fits the standard 0.65 m slot; the 1.4 m plinth override belongs to mun only):**
  - Table: `walnut` top, cylinder radius 0.27, height 0.025, 64 segments, top surface at y 0.20, on a `brass` pedestal (cylinder radius 0.03, height 0.14) and a `brass` foot disc (radius 0.12, height 0.01).
  - Six laptops evenly spaced at 60°, at radius 0.19, facing the center: `ceramicGraphite` base 0.085 x 0.005 x 0.06 and lid 0.085 x 0.06 x 0.004 hinged at the back edge, open 105°. Each lid's inner face carries an `accentGlow` instance plane 0.075 x 0.05 (the screen).
  - Shared project: a `brass` cube 0.04 at the table center (static).
- **Motion (one):** the screens glow in turn around the table: one rises to 1.4 while the previous falls to 0.25, 2 s per laptop. Period 12 s.
- **Materials:** walnut, brass, ceramicGraphite, accentGlow.
- **Triangles:** about 1,000.
- **Reduced-motion pose:** all six screens at 0.8.
- **Object description (DOM):** "Six laptops face each other around a round table, their screens lighting in turn: monthly mini-hackathons where developers, designers and founders build together."
- **Checklist:**
  - [ ] Reads as one object: a round table with six open laptops facing its center.
  - [ ] Fits the standard slot (table diameter 0.54 m).
  - [ ] No people or avatars, no month ring or ticks, no shipping blocks, no stickers or logos.
  - [ ] Laptops identical and evenly spaced.
  - [ ] One motion: screens light in turn on a 12 s loop.
  - [ ] ≤ 20k triangles; only walnut, brass, ceramicGraphite, accentGlow.

### 4.9 mun: "Work in Progress" (No. 05)
- **Symbolizes:** the B.Eng in Computer Engineering at Memorial University of Newfoundland that every other exhibit rests on, still under construction until the expected May 2027 graduation.
- **Object (MUN slot override, §5.3: x and z in [-0.55, 0.55], y in [0.10, 1.20] above the 0.6 m plinth):**
  - Base plate: `walnut` 0.60 x 0.03 x 0.60 (y 0.10 to 0.13).
  - Post: `brass` cylinder radius 0.02, y 0.13 to 0.53.
  - Die: `ceramicGraphite` RoundedBox 0.36 x 0.035 x 0.36, radius 0.004, y 0.53 to 0.565. 48 `brass` pins (12 per edge, boxes 0.008 x 0.004 x 0.03, instanced). About 40 `brass` traces on the die top (boxes 0.004 wide, 0.0015 high, 0.04 to 0.16 long, seeded Manhattan pattern, instanced) and a `brass` core square 0.08 x 0.002 x 0.08.
  - Scaffold: a cube lattice 0.90 x 0.90 in plan, 5 tiers of 0.20 m from y 0.13 to 1.13. Each tier has 4 corner uprights, 4 top rails and X-bracing on two opposite faces; rods are 0.012 m square boxes (instanced).
  - Tier state: `tiersRemaining = clamp(ceil(monthsUntilGraduation / 12), 0, 5)`, computed from the expected graduation month and the build date only (no start date needed; today 7 months, so 1 tier). Remaining tiers are the bottom ones, in `brass`; tiers already taken down stay as ghost outlines in `frostedGlass` instances at opacity 0.25. After graduation all 5 tiers are ghosts.
- **Motion (one):** the die turns on its post, one revolution per 40 s. The scaffold is static.
- **Materials:** walnut, brass, ceramicGraphite, frostedGlass.
- **Triangles:** about 2,100.
- **Reduced-motion pose:** die at 30° yaw.
- **Object description (DOM):** "A silicon die stands inside a brass scaffold. Each brass tier is a year of study still ahead; the tiers already taken down remain as glass outlines. The degree is expected in May 2027."
- **Checklist:**
  - [ ] Reads as one object: a chip on a post inside a cube scaffold.
  - [ ] Tier state follows the formula; no percentage, number or progress bar appears in 3D or DOM.
  - [ ] Remaining tiers brass, removed tiers frosted-glass ghosts, removal from the top down.
  - [ ] One motion: the die's 40 s turn.
  - [ ] No crest, no logo, no text.
  - [ ] Inside the MUN slot; ≤ 20k triangles; only walnut, brass, ceramicGraphite, frostedGlass.

### 4.10 certifications: "The Medal Cabinet" (No. 06)
- **Symbolizes:** three credentials: AWS Certified Cloud Practitioner, Tech Stewardship Practice Program, and Tech Stewardship for the Energy Transition. Issue dates and issuers: [placeholder: certification issue dates] and [placeholder: Tech Stewardship issuer].
- **Object (wall vitrine slot, §5.3: local x and y in [-0.325, 0.325], z in [0.05, 0.25] out from the back panel):**
  - Hanging rail: `brass` cylinder radius 0.004, 0.60 long, horizontal at local y 0.24, z 0.08, on two `brass` standoffs.
  - Three medallions hanging from the rail by `brass` straps (0.012 x 0.07 x 0.002): each a `brass` disc radius 0.095, thickness 0.012, 48 segments, with a raised `brass` rim (torus radius 0.088, tube 0.004), centers at local x -0.21, 0, 0.21 and y 0.075.
  - Emblems in 4 mm `brass` relief, generic and distinct: (1) a cloud built from three overlapping low cylinders on a flat base bar (AWS Certified Cloud Practitioner; not the AWS logo); (2) a compass rose of four thin diamond prisms (Tech Stewardship Practice Program); (3) a three-blade turbine on a hub (Tech Stewardship for the Energy Transition).
- **Motion (one):** the medallions turn on their straps about the vertical axis, ±12°, each offset by a third of the period, catching the spotlight in turn. Period 12 s.
- **Materials:** brass (the vitrine's walnut back panel comes from the kit).
- **Triangles:** about 3,700.
- **Reduced-motion pose:** all three face front (0°).
- **Object description (DOM):** "Three brass medallions hang in a wall cabinet: a cloud for AWS Certified Cloud Practitioner, a compass rose for the Tech Stewardship Practice Program, and a turbine for Tech Stewardship for the Energy Transition."
- **Checklist:**
  - [ ] Reads as one object: three medallions hanging in a row in one cabinet.
  - [ ] No issuer logos, no official badge images, no text (names live in the DOM card).
  - [ ] The three emblems are distinct in a 320 px grayscale thumbnail.
  - [ ] One motion: the staggered 12 s turn.
  - [ ] Inside the wall vitrine slot; ≤ 20k triangles; brass only.
  - [ ] Dates and issuers come from content; while unknown, the DOM shows the placeholder and the release check blocks launch.

---

## 5. Exhibit anatomy

The kit (`src/museum/exhibits/_kit/`, owned by R3) builds everything in this section. Exhibit builders only build the object inside the slot.

### 5.1 ExhibitFrame
- Places the plinth, case, wall title, hit box and placeholder at the slot from `layout.ts`, and rotates the exhibit group so its local +Z faces the stop camera horizontally (§4 local frame).
- Wraps the exhibit in Suspense and an error boundary; both fall back to the placeholder crate (§5.7).
- Mounts the exhibit hidden when it comes within 2 stops of the visitor (a wing's items count as being at their door's index), awaits `gl.compileAsync`, then reveals it. Unmounts and disposes beyond 4 stops.
- Passes `runtime = { tier, reducedMotion, motion, active, hovered, open }` (ARCHITECTURE §7.2) plus the shared materials; seeded noise comes from the kit. `motion` is false when idle motion has stopped (15 s after the last input), the tab is hidden, under reduced motion, under `?test=1` (unless `&idle=1`) and on the low tier; `active` is true when the exhibit is the settled stop.

### 5.2 Plinth
- Standard: 0.9 x 0.9 m footprint, 1.0 m tall, material `plinth` (matte charcoal `#1F1F24`), with a 3 cm `brass` strip around the base (y 0 to 0.03).
- Contact shadow: painted into the floor lightmap around the footprint (§7.5). The soft shadow under the object on the plinth top is one drei `ContactShadows` pass with `frames={1}`, rendered once after the exhibit is revealed (ARCHITECTURE §7.4); if R3 measures that pass as too costly on a tier, the shared 64 px radial `shadowDecal` (opacity 0.45, 0.6 m square) replaces it there. Never both.
- All standard plinths are one instanced mesh; the brass strips are a second.

### 5.3 Glass case and slot variants

| Variant | Used by | Plinth | Case | Slot (local, origin = plinth top center) | World slot center y |
|---|---|---|---|---|---|
| Standard | verafin, mysa, wailo, cfia, klarup, finance-tracker, sdsj | 0.9 x 0.9 x 1.0 | 0.85 m cube on the plinth (y 1.0 to 1.85) | x, z [-0.325, 0.325]; y [0.025, 0.675] | 1.35 |
| Large (override) | mun | 1.4 x 1.4 x 0.6 | 1.3 m cube (y 0.6 to 1.9) | x, z [-0.55, 0.55]; y [0.10, 1.20] | 1.25 |
| Wall vitrine | certifications | none (wall mounted, center y 1.6) | glass box 0.85 W x 0.85 H x 0.30 D, walnut back panel 0.80 x 0.80 x 0.01, brass frame | origin = back panel center, +Z out of the wall: x, y [-0.325, 0.325]; z [0.05, 0.25] | 1.6 |

- Cases use the kit-only `caseGlass` material (§7.6) with a 1 cm `brass` edge frame (12 edges, instanced). No transmission.
- The certifications wall carries a `walnut` backing panel 2.4 m wide x 1.6 m tall centered behind the vitrine, so the vitrine does not float alone on a 10 m wall.

### 5.4 Wall titles (the only 3D text)
3D text is limited to big labels that duplicate DOM text. Every label uses drei `Text` (troika) with the self-hosted `.woff` fonts (§7.7), `brass` material, and passes the glyph coverage check.

| Label | Where | Font, cap height |
|---|---|---|
| Exhibit number ("01", "P1") | Wall behind the plinth, centered on the plinth z (main aisle: aisle wall at abs(x) 3.49; wings: outer wall at abs(x) 11.49; mun: left wall x -5.99; certifications: above the vitrine). Baseline y 2.75 (wings 2.55) | Instrument Serif, 0.32 m (wings 0.30) |
| Organization ("NASDAQ VERAFIN") | Same wall, below the number, uppercase, tracking 0.12em. Baseline y 2.40 (wings 2.22) | IBM Plex Sans 500; 0.12 m main aisle (F-G2a), 0.10 m certifications, 0.14 m wings and mun. Max width 3.6 m (wings 3.2 m, mun 2.4 m); wraps at word boundaries |
| Room names ("PROJECTS", "VOLUNTEER & LEADERSHIP") | Aisle side of the wall above each door, on the 0.3 m door transom (F-G2a) | IBM Plex Sans 500, 0.10 m, tracking 0.12em |
| "FOUNDATIONS" | Header beam at z -52, baseline y 4.3 | IBM Plex Sans 500, 0.22 m, tracking 0.12em |
| "COMMIT HISTORY" | Above the lobby arch, baseline y 4.1 | Instrument Serif, 0.28 m |
| "You've reached the beginning." | End wall (z -70), baseline y 2.6 | Instrument Serif, 0.20 m |
| Year numerals | Floor, beside each year strip (§6.9) | IBM Plex Sans 500, 0.22 m, tracking 0.2em; decorative, exempt from the size rule |

Organization strings: NASDAQ VERAFIN, MYSA, WAILO, CANADIAN FOOD INSPECTION AGENCY, KLARUP, PERSONAL FINANCE TRACKER, SOFTWARE DEVELOPERS OF ST. JOHN'S, MEMORIAL UNIVERSITY, CERTIFICATIONS. The cap heights above are the sizes the G2 review approved (F-G2a): room names are 0.10 m, so "VOLUNTEER & LEADERSHIP" fits on one line on the door transom and inside the phone frame, and main-aisle organization labels are 0.12 m. Every label except the decorative year numerals keeps at least 14 CSS px of cap height on Pixel 7 from its stop camera (pinned by a unit test). R3 may change a size only with an R0 ruling, and never below that 14 px floor.

### 5.5 Spotlight, pool and beam per exhibit
- Real spotlight mount (used when a real light is assigned, §6.8): standard plinths at (x_p, 4.6, z_p + 0.6); wing plinths at (σ * 8.4, 3.7, z_p); mun at (-2.5, 4.6, -56.4); certifications at (4.4, 4.6, -57); desk at (0, 3.7, -66.9); portrait at (2.6, 5.4, -2.6). Each aims at its slot center (or target).
- Every target always has a baked floor pool and a wall wash in its temperature color (§7.5), so unlit targets still glow.
- Beam cone (high and medium tiers): additive cone from the mount to the case, opacity 0.035, kit-only `beam` material, all cones in one instanced mesh.

### 5.6 Hit box, hover and focus
- Each frame has an invisible hit box covering plinth and case (standard 0.9 x 1.85 x 0.9). Exhibit meshes set `raycast` to a no-op.
- Pointer over the case of the current stop: cursor `pointer`; if a real light is assigned to it, its intensity rises to 1.35x over 250 ms. Keyboard focus on that exhibit's "Read the story" button triggers the same lift.
- Click on the current stop's case: open its story. Click on another exhibit's case: travel to its stop (§3.5).

### 5.7 Placeholder, loading and failure
- `Placeholder`: a closed `walnut` crate 0.5 x 0.4 x 0.4 with `brass` corner caps, inside an empty lit case. Fewer than 300 triangles.
- Shown while an exhibit chunk loads, when it fails (error boundary), and for any content entry whose exhibit folder does not exist yet (day one of a new job, `npm run new:exhibit <id>`).
- While the placeholder shows at the current stop, the DOM card adds the status line "Installation in progress" (§8.4). The card's content is complete regardless; only the 3D object is pending.

### 5.8 DOM placard card (one per section)
All readable stop information lives in this card. It is prerendered HTML, visible without JS, and identical with and without JS.

**Fields, in order:**
1. **Number row:** "No. 01" (label style), plus a status pill:
   - "ON VIEW NOW" when the entry is current: the build date's month lies within [start, end]. Derived at build time, never stored; the weekly scheduled build keeps it fresh.
   - "ONGOING" for entries whose end is "present" (volunteer roles).
2. **Artwork title** (Instrument Serif italic): "The Reporting Engine". This is the only title an exhibit has; the story headings in `p_resume.md` section 5 ("Turning Data Into Clarity" and so on) are retired.
3. **Role** (Plex Sans 500).
4. **Organization and location.**
5. **Dates and Dimensions:** `formatRange(start, end)` then "Dimensions:" and `duration(start, end)`.
6. **Medium:** up to 4 tech tags, comma-separated text (all tags appear in the dialog). Hidden below 480 px wide.
7. **Caption:** one line, at most 18 words (content field). Hidden below 480 px wide.
8. **Button:** "Read the story", with an "Enter" key hint on fine pointers.

**Date math (shared `src/content/format.ts`, also used by the PDF, `.tex` and JSON-LD):**
- `formatRange`: "Mon YYYY – Mon YYYY" with an en dash and spaces; end "present" prints "Present"; equal start and end prints one month.
- `duration` counts months inclusively: `(endYear * 12 + endMonth) - (startYear * 12 + startMonth) + 1`. Below 12 months: "N months" ("1 month" singular). From 12: "X yr", plus " Y mo" when Y > 0. For "present", the end is the build month.
- Required cases (unit tests): Sep 2026 to Dec 2026 = "4 months"; Jan 2026 to May 2026 = "5 months"; May 2025 to Aug 2025 = "4 months"; Dec 2022 to Aug 2024 = "1 yr 9 mo".

**Card data today:**

| No. | id | Artwork title | Role | Organization, location | Dates | Dimensions | Pill |
|---|---|---|---|---|---|---|---|
| 01 | verafin | The Reporting Engine | Software Development Co-op Student | Nasdaq Verafin, St. John's, NL | Sep 2026 – Dec 2026 | 4 months | ON VIEW NOW |
| 02 | mysa | Warm Start | Full Stack Software Developer (Co-op) | Mysa, St. John's, NL | Jan 2026 – May 2026 | 5 months | |
| 03 | wailo | The Deep Link | Front End Developer (Co-op) | Wailo, Calgary, AB / Remote | May 2025 – Aug 2025 | 4 months | |
| 04 | cfia | The Ticket Spindle | IT Support Technician (Intern) | Canadian Food Inspection Agency, Ottawa, ON / Remote | Dec 2022 – Aug 2024 | 1 yr 9 mo | |
| P1 | klarup | The Climb | none until [placeholder: KlarUp role] is supplied | KlarUp, Project | none until [placeholder: KlarUp dates] are supplied | omitted until dates exist | |
| P2 | finance-tracker | The Balance | none until [placeholder: Finance Tracker role] is supplied | Personal Finance Tracker, Project | none until [placeholder: Finance Tracker dates] are supplied | omitted until dates exist | |
| V1 | sdsj | The Round Table | President | Software Developers of St. John's, St. John's, NL | Jul 2024 – Present | 2 yr 4 mo (Oct 2026 build) | ONGOING |
| 05 | mun | Work in Progress | B.Eng in Computer Engineering | Memorial University of Newfoundland, St. John's, NL | Expected May 2027 | omitted (start date unknown) | |
| 06 | certifications | The Medal Cabinet | Three credentials | AWS Certified Cloud Practitioner; Tech Stewardship Practice Program; Tech Stewardship for the Energy Transition | none until [placeholder: certification issue dates] are supplied | omitted | |

**Visual:**
- Paper card: background ramps from `--paper` (newest) to `--paper-old` (oldest) by the stop's age parameter (§6.9); text `--paper-ink`; secondary text `--paper-ink-2`; 2 px radius; padding 20 px 24 px.
- Pill: `--paper-ink` background, `--paper` text, 12 px uppercase label style, with a 6 px dot (`--signal` for ON VIEW NOW, `--brass` for ONGOING).
- Button: `--paper-ink` background, `--paper` text, min height 44 px.
- **Desktop (min-width 1024 px, landscape):** left column, `left: 5vw`, `bottom: 12vh`, width `clamp(320px, 26vw, 400px)`. The 3D case is framed right of center (§6.2), so the card never covers it.
- **Phone portrait:** pinned to the section bottom, 16 px side gutters, `bottom: max(16px, env(safe-area-inset-bottom) + 12px)`, max height 40% of the viewport (§9).

**Door card:** room name ("Projects wing"), "2 exhibits", one link per wing exhibit ("The Climb, KlarUp" pointing to `/exhibit/klarup/`), a primary "Step inside" button (Enter hint), and the helper "Or keep scrolling to skip." On the dark gallery a door card uses the paper style at the door's age parameter.

### 5.9 Story dialog
One native `<dialog>` opened with `showModal()` (built-in focus trap and Esc). Page scroll is locked while it is open.

**Content order:**
1. Eyebrow: "No. 01 · ON VIEW NOW" (label style).
2. H2: artwork title.
3. Dek: the caption.
4. Meta block: role; organization and location; "Sep 2026 – Dec 2026 · 4 months".
5. "Medium": all tech tags as text chips.
6. "The work": the resume bullets, verbatim, as a list.
7. "Curator's note": the optional `exhibit.curatorNote` as a short pull quote (only when Emeka has written one), then the first-person story blocks (draft until Emeka approves).
   - "What I took away": `exhibit.takeaway`, only when present.
8. "The object": `exhibit.object.text`, the object description from §4.
9. Links, if any (for example certification verification links, [placeholder]).
10. Footer: "Newer" and "Older" (each shows the target's artwork title and organization; accessible names "Newer exhibit: Warm Start, Mysa"), and "Copy link" (copies `SITE_URL + /exhibit/<id>/`, then shows "Link copied" for 2 s).

**Desktop panel:** fixed to the right edge, full height, width `clamp(420px, 44vw, 640px)`, `--panel` background with a 14 px backdrop blur, a 1 px `--brass` hairline at 28% opacity on its left edge, padding 40px 48px, text measure at most 60ch, internal scrolling. Header row: eyebrow on the left; close button on the right (x icon plus text "Close", accessible name "Close story", 44 x 44 px minimum). It slides in from the right over 280 ms (`--ease-out`); `::backdrop` is `rgba(11, 11, 13, 0.25)`, and a click on the backdrop closes the dialog. Behind it the camera dollies (§6.5) and the case is reframed into the center of the area left of the panel.

**Phone sheet:** one full-height sheet, `100dvh`, full width, solid `#0F0F12` (no backdrop blur), safe-area padding. Sticky header (56 px): "Back to the aisle" (chevron-left icon plus text) on the left, "Copy link" on the right. Sticky footer: Newer and Older, each half the width, 48 px tall. The body scrolls with `overscroll-behavior: contain`. It slides up over 240 ms. There is no drag handle, no intermediate height and no swipe-to-close. Rendering pauses while the sheet is open.

### 5.10 Closing: camera and focus
- Ways to close: the close or "Back to the aisle" button, Esc, browser Back (in-app opens), and a backdrop click (desktop).
- History per §3.5.
- **Camera:** dollies back to the stop pose over 0.8 s (easeInOutCubic); the other real spotlights return from 30% to full over 0.4 s; the framing shift returns to normal. Reduced motion: instant.
- **Focus and scroll:**
  - If the exhibit being read at close time is on the active track, the page scrolls instantly to its section (the camera is already there) and focus goes to that card's "Read the story" button.
  - Otherwise focus returns to the control that opened the dialog (for example a door-card link).
  - For a cold-loaded deep link, focus goes to the exhibit's "Read the story" button.

### 5.11 Testable rules
- Every exhibit's world bounding box lies inside its slot variant; triangles ≤ 20k; exhibit chunk ≤ 40 KB gzip.
- The four duration cases in §5.8 pass, plus a fake clock at 2027-01-05 removes ON VIEW NOW from verafin.
- A click at `screenPos('verafin')` opens the dialog; Esc closes it and focus lands on `verafin`'s "Read the story".
- With the exhibit chunk blocked, the stop shows the crate and the card shows "Installation in progress".
- axe reports 0 violations with the dialog open on desktop and Pixel 7.

---

## 6. Motion and camera choreography

All camera motion is driven by the native scroll position. There is no wheel math anywhere.

### 6.1 Scroll to progress
- Measure each active section's `offsetTop` (o_0 .. o_{N-1}) on load, on font load and with a ResizeObserver. Never assume `k * innerHeight`.
- Target progress in stop units: for `o_k ≤ scrollY < o_{k+1}`, `p = k + (scrollY - o_k) / (o_{k+1} - o_k)`; clamp to [0, N-1].
- On touch devices ignore height-only resizes smaller than 20% (address bar), and size the stage at `100lvh`.

### 6.2 Rail and damping
- Each track has one centripetal Catmull-Rom curve through its stop cameras (wing curves also pass through the threshold waypoint T when entering or leaving). Each stop has an arc-length parameter `U_k`; progress maps piecewise linearly: `u = U_k + (p - k) (U_{k+1} - U_k)`.
- Damping: maath `easing.damp` on the progress with smoothTime 0.25 s (`--rail-smooth`), delta-time based, no overshoot. Look direction: `easing.dampLookAt` with smoothTime 0.3 s.
- **Framing** is a projection shift (`PerspectiveCamera.setViewOffset`), never a pose change, so layout coordinates stay pinned:
  - Desktop (aspect ≥ 1): the look-at point lands at 62% of the viewport width (right of center, away from the card column) and 50% of the height.
  - Phone portrait: 50% of the width and 36% of the height (the case sits above the card).
  - Dialog open on desktop: the look-at point lands at the center of the area left of the panel.
  - Changes in shift are damped over 0.4 s.
- Field of view: vertical 50° when aspect ≥ 1; 68° when aspect ≤ 0.6; linear in between.

### 6.3 Gaze turn toward each case
For the segment between consecutive stops a and b, with fraction f in [0, 1], stop look-at points F_a and F_b, and a forward point Fw (the rail point 6 m ahead of the camera, at y 1.6):
- f ≤ 0.35: look = lerp(F_a, Fw, smoothstep(0, 0.35, f))
- 0.35 < f < 0.5: look = Fw
- f ≥ 0.5: look = lerp(Fw, F_b, smoothstep(0.5, 1, f))

The camera therefore looks down the aisle while walking and turns about 30° toward each case as it arrives.

**Pointer parallax** (fine pointers only): ±1.5° yaw and ±1° pitch from the pointer position, damped 0.4 s. Off under reduced motion, under `?test=1`, on coarse pointers and while the dialog is open.

### 6.4 Arrival and settle
- **Settled** (the visitor has arrived at a stop): ARCHITECTURE §6.3 is the exact definition used by the code and the test hook (damped progress within 0.001 of a target that is within 0.02 of a whole stop, the camera still, and no neighboring exhibit compiling). On settling, `__MUSEUM__.stop` becomes that stop id and `settled` becomes true.
- Arrival effects (real light reassignment §6.8, the aria-live announcement §10.3, the hint hiding §8.3) happen on settle.
- On fine pointers a visitor may rest between stops (proximity snapping); nothing is forced.

### 6.5 Scripted moves

| Move | Duration | Easing | Notes |
|---|---|---|---|
| Wing entry (door, T, first wing stop) | 1.4 s | easeInOutCubic | Scripted glide; the scroll track has already swapped and jumped to the first wing section (§3.4) |
| Wing exit (wing stop, T, door) | 1.2 s | easeInOutCubic | Scripted glide; then the main track returns at the saved scroll position (§3.4) |
| HUD jump of 1 to 3 stops | browser smooth scroll | native | `scrollIntoView({ behavior: 'smooth' })`; the rail follows |
| HUD jump of more than 3 stops, "Walk the aisle again" | 200 ms fade-cut | linear | Instant scroll plus the §6.6 fade, no fly-through |
| Dialog open | 0.9 s | easeInOutCubic | Dolly 0.6 m toward the slot center; other real spots dim to 30% over 0.4 s |
| Dialog close | 0.8 s | easeInOutCubic | Back to the stop pose |
| Canvas reveal on `ready` | 600 ms | `--ease-out` | Opacity 0 to 1 |
| Real light reassignment | 1.0 s | damped | Intensity 0 to target |
| Hover or focus light lift | 250 ms | `--ease-out` | 1.35x |

### 6.6 Reduced motion
Under `prefers-reduced-motion: reduce`:
- Moving between stops is a 200 ms opacity fade over a cut: the canvas fades to ink over 100 ms, the camera jumps to the new stop pose (no in-between positions, no damping), and the canvas fades back in over 100 ms. While the visitor scrolls, the camera holds the current stop and cuts once the scroll arrives.
- No idle exhibit motion (reduced-motion poses), no parallax, no dialog dolly, no sheet or panel slide, no hint chevron animation, no ticket tear, instant canvas reveal. HUD jumps use `behavior: 'auto'`.
- A one-time, dismissible chip offers the classic view (§8.4).

### 6.7 Idle motion and frame loop
- Exhibits animate only while `runtime.motion` is true (§5.1).
- Idle motion stops 15 s after the last input (scroll, pointer, key or touch); the canvas then uses `frameloop="demand"` and renders nothing until input or a scripted move. On coarse pointers idle animation runs at 30 fps.
- Rendering pauses on `visibilitychange` (hidden) and while the phone sheet is open.
- `?test=1` freezes the clock, seeds the noise, disables idle motion (exhibits show their reduced-motion poses; `&idle=1` re-enables it for the idle-stop test only) and fixes the tier at medium (override with `&tier=high|medium|low`).

### 6.8 Lights
- Real spotlights are fixed per tier at boot: 3 on high, 1 on medium and low. They never change count at runtime.
- **Light targets in track order:** main track: portrait, verafin, mysa, wailo, cfia, mun, certifications, desk. Wing tracks: their exhibits (two in projects, one in volunteer).
- **Assignment:** on each arrival, light 1 goes to the current stop's target, or the next target ahead when the stop has none (lobby uses the portrait; door stops use the next main exhibit). On high, lights 2 and 3 go to the next two targets ahead. Reassigned lights move instantly at intensity 0, take the target's temperature color, and fade up over 1 s.
- Every target always keeps its baked pool and wall wash, so the far aisle glows even without a real light.

### 6.9 Time in the space

**Brass year strips** (the age map):
- Time anchors along the main aisle: each main work exhibit at `(z_i, mid_i)`, where `mid_i` is the middle of its date range as a half-open month interval, `mid_i = (ym(start) + ym(end) + 1) / 2` with `ym = year * 12 + (month - 1)`; plus the aisle end at `(zLast - 6, ym(start of the last exhibit))`. Anchor times must decrease with z; the layout clamps each to at least one month below the previous.
- The current build year's strip sits at the arch (z -4). For each earlier year Y down to the oldest start year, the strip labeled Y sits where the anchors' linear interpolation reaches January of Y + 1 (the point where, walking on, you enter year Y). A boundary newer than the first exhibit's midpoint is placed at `z_0 + 3`.
- Geometry: brass inlay 0.03 m wide across x -3.3 to 3.3, flush with the floor. Numerals lie flat at x 0, z = strip z - 0.45, reading in the walking direction.

| Strip | z today | Where it reads |
|---|---|---|
| 2026 | -4 | At the arch |
| 2025 | -25.5 | Between Mysa and the volunteer door |
| 2024 | -37.5 | Just past Wailo |
| 2023 | -44.5 | Just before CFIA |
| 2022 | -51.4 | Just past CFIA, at the end of the aisle |

**Warmer light further back:** the age parameter is `t = i / (n - 1)` for main work exhibit i (0 when n = 1). Spotlight, pool and wall-wash color sample a ramp through `light-0` to `light-3` at t = 0, 1/3, 2/3, 1 (linear RGB interpolation), so today's four exhibits get exactly the four tokens. A wing uses its door's position: `t = (k + 0.5) / (n - 1)` for `after = w[k]`. Lobby and portrait use `light-0`; Foundations uses `light-3`; the desk uses `light-1`.

| Target | t | Color |
|---|---|---|
| verafin | 0 | light-0 `#FFF4E8` |
| projects wing | 0.167 | ramp between light-0 and light-1 |
| mysa | 0.333 | light-1 `#FFE9D2` |
| volunteer wing | 0.5 | ramp between light-1 and light-2 |
| wailo | 0.667 | light-2 `#FFDDB8` |
| cfia | 1 | light-3 `#FFCF9C`, the warmest in the building (tied with Foundations) |
| mun, certifications | 1 | light-3 |

**Placard paper ages** with the same t, from `--paper` `#EFEBE4` to `--paper-old` `#E9DCC4`.

### 6.10 Progress rail (HUD)
- **Desktop:** a vertical brass hairline on the right edge, 60vh tall, vertically centered, with "Now" at the top and "Front desk" at the bottom.
  - One dot per main stop. Exhibit dots are labeled with the artwork title on hover and focus; the current dot always shows its label.
  - Each door has a short side stub on its wing's side.
  - Year ticks (2026 to 2022) sit at the progress values of the floor strips, so ticks and strips agree.
  - A brass bead marks the camera's damped progress.
  - Each dot is a link-like button in `<nav aria-label="Exhibits">` with `aria-current="step"` on the current stop. Activating it travels there (§6.5).
  - In a wing the rail shows the wing's two dots and the "Return to the aisle" button.
- **Phone:** a 3 px brass progress bar across the top, plus a year chip (for example "2025") showing the year at the camera's position. Display only; no floor plan.

### 6.11 Testable rules
- With reduced motion emulated, no camera position between two stops is ever sampled.
- Shader program count in `stats()` is unchanged between 0.5 s and 3 s after arriving at any stop.
- The frame counter stops advancing 16 s after the last input.
- At every settled stop, `screenPos(id)` lies at 62% ±3% of width on desktop and 36% ±3% of height on Pixel 7.
- Year-strip z values match §6.9 to 0.1 m for today's content.

---

## 7. Art direction

### 7.1 Principles
- A dark room, warm pools of light, brass, paper and glass. Calm, expensive, quiet.
- One cool accent: the signal teal glow inside objects, the engineer's signature against warm light.
- No new colors or materials without R2. Everything below lives in `src/design/tokens.css`, `src/design/tokens.ts` and `src/museum/materials/`.

### 7.2 Color tokens

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--ink` | `#0B0B0D` | Page background, fog, text on brass | |
| `--wall` | `#141418` | Walls, ceiling | |
| `--floor` | `#0E0E11` | Floor base color | |
| `--plinth` | `#1F1F24` | Plinths, desk body | |
| `--panel` | `rgba(14,14,17,0.86)`, solid fallback `#0F0F12` | Dialog panel, HUD chips | |
| `--text` | `#F2EDE4` | Primary text on dark | 16.9:1 on ink, 16.4:1 on panel |
| `--text-2` | `#A8A29A` | Secondary text on dark | 7.8:1 on ink, 7.3:1 on wall |
| `--text-3` | `#6E6A64` | Decorative strokes only, never text | 3.7:1 |
| `--brass` | `#C9A36A` | Rail, hairlines, primary button fill, accent text | 8.4:1 on ink; ink on brass 8.4:1 |
| `--brass-hi` | `#E4C48F` | Hover, focus ring on dark | 11.8:1 on ink |
| `--brass-metal` | `#B08D57` | 3D brass base color | |
| `--paper` | `#EFEBE4` | Placard card, newest | |
| `--paper-old` | `#E9DCC4` | Placard card, oldest | |
| `--paper-ink` | `#1A1A1E` | Text on paper | 14.6:1 on paper, 12.8:1 on paper-old |
| `--paper-ink-2` | `#5A554D` | Secondary text on paper | 6.2:1 on paper, 5.45:1 on paper-old |
| `--signal` | `#7FD1C7` | ON VIEW NOW dot, `accentGlow` emissive color | 11.1:1 on ink |
| `--ceramic` | `#E6E1D8` | Bone ceramic | |
| `--graphite` | `#34343B` | Graphite ceramic | |
| `--walnut` | `#4E3322` | Walnut | |
| `--frost` | `#DDE3E4` | Frosted glass tint | |
| `--ceiling-slot` | `#2A2622` | Ceiling light slot | |
| `light-0` | `#FFF4E8` | Light ramp, newest | |
| `light-1` | `#FFE9D2` | Light ramp | |
| `light-2` | `#FFDDB8` | Light ramp | |
| `light-3` | `#FFCF9C` | Light ramp, oldest | |
| `--duo-shadow`, `--duo-light` | `#16161A`, `#F2EDE4` | Portrait duotone | |

WP-05's unit test asserts at least 4.5:1 for every text pair in this table and in §7.3.

### 7.3 Classic page (`/resume/`) theme
- It follows `prefers-color-scheme`.
- **Light:** background `#FBFAF7`, text `#1A1A1E` (16.6:1), secondary `#55524C` (7.5:1), links `#7A5C2B` (5.9:1).
- **Dark:** the gallery tokens, with links in `--brass-hi`.
- **Print:** white background, black text, no backgrounds or shadows.

### 7.4 Motion tokens

| Token | Value |
|---|---|
| `--dur-fast` | 150 ms |
| `--dur-base` | 250 ms |
| `--dur-slow` | 600 ms |
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--rail-smooth` | 0.25 s |
| `--fade-cut` | 200 ms |

### 7.5 Lighting recipe (fixed per tier at boot)
- **Ambient:** hemisphere light, sky `#1A1C22`, ground `#0B0B0D`, intensity 0.15.
- **Real spotlights:** 3 on high, 1 on medium and low (§6.8). Angle 0.38 rad, penumbra 0.6, decay 2, `castShadow` false. Starting intensity 40 cd, tuned by R2 in WP-11 and frozen as a token.
- **Zero shadow maps.**
- **Baked light pools:** `lightPools.ts` paints a CanvasTexture lightmap for each floor zone. Per target: a radial pool of radius 1.6 m, centered 0.3 m from the plinth toward the aisle center, peak alpha 0.85 in its temperature color, smoothstep falloff. Door thresholds get a smaller pool (radius 1.2 m, alpha 0.35, `light-0`) on the aisle floor so doors invite.
- **Contact shadows, rendered once:** painted into the same lightmap (plinth footprint, soft edge 0.25 m, darkness 0.55), plus the plinth-top contact shadow (§5.2).
- **Wall wash:** a shared 256 px "scallop" texture on wall bays behind each target, tinted by its temperature; panel seams every 2 m are baked into it.
- **Environment:** drei `Environment` with `frames={1}`, resolution 256, built from Lightformers: a ceiling strip (`light-0`, intensity 2, 0.3 x 60 m) along the centerline at y 4.9, two side panels (`light-1`, intensity 0.6), and one lobby panel. No HDRI files.
- **Fog:** `FogExp2`, `#0B0B0D`, density 0.045. The next case (12 m) is clearly visible; the one after (24 m) is a faint pool.
- **Tone mapping:** ACES Filmic, exposure 1.0, until WP-11. In WP-11 R2 captures the lobby, verafin and cfia stops under ACES Filmic and AgX side by side, picks one, and freezes it as the token `render.toneMapping` (`'aces' | 'agx'`, with `render.exposure`) in `src/design/tokens.ts`. Output color space sRGB.
- **Vignette:** CSS only, a fixed `pointer-events: none` layer over the canvas: `radial-gradient(ellipse at center, transparent 55%, rgba(11,11,13,0.55) 100%)`. No post-processing package.
- **Tiers:** high = DPR max 2, `MeshReflectorMaterial` floor, 3 spots, beam cones. Medium = DPR max 1.5, env-mapped floor, 1 spot, beam cones. Low = DPR 1, env-mapped floor, 1 spot, no beam cones. Only DPR adapts at runtime.

### 7.6 Materials library (`src/museum/materials/`)
Exhibits may use only the first eight rows. Rows marked "kit" are for R3's environment and kit only.

| Name | Type | Parameters |
|---|---|---|
| `brass` | MeshStandardMaterial | color `#B08D57`, metalness 1, roughness 0.35, envMapIntensity 1.0 |
| `frostedGlass` | MeshPhysicalMaterial | color `#DDE3E4`, roughness 0.55, metalness 0, transmission 0, transparent, opacity 0.55, depthWrite false, envMapIntensity 0.8 |
| `walnut` | MeshStandardMaterial | color `#4E3322`, roughness 0.55, metalness 0, shared seeded 256 px grain CanvasTexture as map |
| `ceramic` (matte ceramic, bone) | MeshStandardMaterial | color `#E6E1D8`, roughness 0.85, metalness 0 |
| `ceramicGraphite` (matte ceramic, graphite) | MeshStandardMaterial | color `#34343B`, roughness 0.8, metalness 0 |
| `paper` (placard paper) | MeshStandardMaterial | color `#EFEBE4`, roughness 0.95, metalness 0 |
| `accentGlow` (the one accent emissive) | MeshStandardMaterial | color `#0B0B0D`, emissive `#7FD1C7`, emissiveIntensity 1.4 (rest 0.15), toneMapped true |
| `wall` | MeshStandardMaterial | color `#141418`, roughness 0.95, lightMap = wall wash |
| `floor` (kit) | high: MeshReflectorMaterial; medium and low: MeshStandardMaterial | High: resolution 512, blur [300, 100], mixBlur 1, mixStrength 1.5, roughness 0.8, metalness 0.5, mirror 0, color `#0E0E11`. Medium and low: color `#0E0E11`, roughness 0.22, metalness 0, envMapIntensity 0.6. Both use the pool lightMap |
| `caseGlass` (kit) | MeshPhysicalMaterial | transmission 0, transparent, opacity 0.12, roughness 0.05, envMapIntensity 1.2, depthWrite false |
| `plinth` (kit) | MeshStandardMaterial | color `#1F1F24`, roughness 0.9 |
| `beam` (kit) | MeshBasicMaterial | additive, opacity 0.035, depthWrite false, color = target temperature |
| `shadowDecal` (kit) | MeshBasicMaterial | multiply blending, shared 64 px radial texture |
| `ceilingSlot` (kit) | MeshBasicMaterial | color `#2A2622` |
| `portrait` (kit) | MeshBasicMaterial | map = 512 px headshot textures (color and duotone) |

- Exhibits call `useMaterial(name)` for the shared instance, or `useMaterialInstance(name)` for a clone whose `emissiveIntensity` or `opacity` they animate. Clones share the shader program.
- All library materials are compiled during the boot `compileAsync`, so switching or cloning never compiles a new program mid-walk.

### 7.7 Typography
- **Families:** Instrument Serif (400 normal and italic) for the name, artwork titles, wall text and room names. IBM Plex Sans (400 and 500) for UI, body, labels and dates.
- **Self-hosted** from `@fontsource/instrument-serif` and `@fontsource/ibm-plex-sans` (npm, because unpkg is blocked; OFL texts committed). DOM uses subset `.woff2`; troika uses `.woff` (troika cannot read `.woff2`).
- The glyph coverage check runs over every 3D string in §5.4, including the apostrophe in "ST. JOHN'S" and "You've" and the ampersand. troika's `unicodeFontsURL` points to a self-hosted path, so no CDN request is ever made.
- **Loading:** preload the Instrument Serif 400 and Plex Sans 400 latin `.woff2`; `font-display: swap` with metric-matched fallback faces (`size-adjust`, `ascent-override`) for Georgia and Arial, tuned in WP-28, so CLS stays ≤ 0.02. DOM subsets include the en dash, the middle dot and curly quotes.

| Style | Font | Size / line height | Notes |
|---|---|---|---|
| Display (hero h1) | Instrument Serif 400 | `clamp(36px, 6vw, 88px)` / 1.05 | The LCP element |
| Dialog H2 | Instrument Serif 400 | `clamp(32px, 3vw, 44px)` / 1.1 | |
| Artwork title (card) | Instrument Serif italic | 28px / 1.15 (phone 24px) | |
| Role | Plex Sans 500 | 16px / 1.4 | |
| Body | Plex Sans 400 | 16px / 1.6 (dialog 17px on desktop) | |
| Small | Plex Sans 400 | 14px / 1.5 | |
| Label | Plex Sans 500 | 12px / 1.3, uppercase, letter-spacing 0.08em | |
| Dates and durations | Plex Sans 400 | inherit | `font-variant-numeric: tabular-nums` |

### 7.8 UI chrome
- **Panels:** `--panel` with a 14 px backdrop blur (solid `#0F0F12` on phones, on low tier, and where `backdrop-filter` is unsupported); 1 px `--brass` hairlines at 28% opacity; 2 px radius.
- **Primary button:** `--brass` fill, `--ink` text, 44 px minimum height, 2 px radius. **Secondary:** transparent, 1 px `--brass` border at 50%, `--text` label. Hover lightens to `--brass-hi`.
- **Focus:** on dark surfaces a 2 px `--brass-hi` outline with 2 px offset; on paper cards a 2 px `--paper-ink` outline with 2 px offset. Always visible with `:focus-visible`.
- **Hit targets:** at least 44 x 44 CSS px.
- **HUD (desktop):** "Commit History" wordmark (label style) top left; top right "Resume (PDF)" (primary) and "Classic view" (secondary); the progress rail on the right edge (§6.10); the onboarding hint bottom center.

### 7.9 Icons
- Inline SVG paths copied from Lucide (ISC license, credited in `public/credits.html`), 18 px, stroke 1.5, `currentColor`, `aria-hidden="true"`, always paired with a visible text label. No icon package dependency.
- Set: `file-text` (Resume PDF), `mail` (Email), `list` (Classic view), `ticket` (Begin the walk), `arrow-down` (hint), `x` (close), `chevron-left` and `chevron-right` (Back to the aisle, Newer, Older), `link` (Copy link), `door-open` (Step inside), `undo-2` (Return to the aisle), `external-link` (LinkedIn, GitHub).
- No brand icons or logos anywhere, including LinkedIn and GitHub.

### 7.10 Theme rules
- The gallery is always dark: there is no light mode for `/`, `/exhibit/<id>/` or `404.html`.
- `/resume/` follows the system theme and prints on white.

---

## 8. Onboarding, recruiter fast path and microcopy

### 8.1 Recruiter fast path (prerendered hero, lobby section)
Visible in the first viewport at 360 x 640 and 390 x 844, with JS off and with JS on before `ready`:
- Eyebrow: "A gallery of work by"
- h1 (the LCP element): "Chukwuemeka (Emeka) Nduka-Nwagbo" (draft: Emeka confirms the display form).
- Role line: "Software Development Co-op, Nasdaq Verafin". Derived from the current work entry's short role and organization. When no work entry is current, it reads "Most recently: <short role>, <organization>" (draft wording).
- Education line: "B.Eng Computer Engineering, MUN, expected May 2027" (PLAN §2 wording, from the content fields `shortDegree` and `shortInstitution`; "expected" disappears after graduation).
- Three links: "Resume (PDF)" to `/resume.pdf`, "Email" to `mailto:cndukanwagbo@mun.ca`, "Classic view" to `/resume/`.
- Then "Begin the walk" (admission ticket, §11) and the draft intro paragraph from content, which may fall below the phone fold.

**Layout:**
- Desktop: the left 40% of the viewport carries a scrim (`linear-gradient(to right, rgba(11,11,13,0.85), transparent)`) behind the hero.
- Phone: the hero sits at the top under a top-to-bottom scrim (ink at 0.9 fading to transparent at 70% of the height).
- Before the canvas exists, the lobby section's background is a CSS radial gradient that imitates the warm pool (`radial-gradient(60% 50% at 70% 85%, rgba(255,233,210,0.10), transparent 70%)` on `--ink`).
- The museum chunk is requested after `load` plus idle (or on the first scroll or interaction), never before; under `?test=1` immediately.

### 8.2 Loading states
1. **First paint:** hero and every section card are static HTML. The page already scrolls and snaps; the cards work without the canvas.
2. **Museum loading:** a reserved 20 px row under the hero links shows a brass hairline that draws across with "Lights coming up 64%" (`role="progressbar"`). The row is in the prerendered HTML, so nothing shifts.
3. **Ready** (everything mounted at that moment has resolved Suspense, compiled and synced troika text, then 2 frames rendered): the canvas fades in over 600 ms at the camera pose for the current scroll position, and the loading row fades out.
4. **Later exhibits** mount 2 stops ahead. If one is not ready at arrival, the case shows the crate (§5.7) and the card adds "Installation in progress".
5. **Context loss:** a veil reads "Restoring the gallery"; the canvas remounts with a new key. After 2 losses in the session, or no restore within 5 s, the gallery falls back to classic mode (§8.5): `/` goes to `/resume/#why-context-loss`, and an exhibit page shows its prerendered story.

### 8.3 Hints
- 1.2 s after `ready`, a hint fades in at the bottom center: "Scroll to walk through my work" (fine pointer), "Swipe up to walk" (coarse pointer), or "Scroll, or press" plus the `arrow-down` icon (accessible text "down arrow") once any key has been pressed.
- It hides once the visitor leaves the lobby section and returns after 8 s idle in the lobby. Under reduced motion its chevron does not bob. Under `?test=1` it appears immediately with no fade.
- At the first exhibit only, the card adds the helper line "Click the case or press Enter for the full story." (fine pointer) or "Tap the case or Read the story." (coarse pointer).

### 8.4 Microcopy

| Where | Text |
|---|---|
| Skip link (first focusable element) | "Skip to classic resume" |
| HUD buttons | "Resume (PDF)", "Classic view" (phone: "PDF", "Classic") |
| Hero | see §8.1 |
| Begin button | "Begin the walk" |
| Loading row | "Lights coming up" and a percentage |
| Hints | see §8.3 |
| Exhibit card button | "Read the story" (key hint "Enter") |
| Exhibit card status | "Installation in progress" |
| Door card | "Projects wing", "2 exhibits", "Step inside", "Or keep scrolling to skip." |
| Door card (volunteer) | "Volunteer & Leadership wing", "1 exhibit", "Step inside", "Or keep scrolling to skip." |
| Wing HUD | "Projects wing, 1 of 2", "Return to the aisle" (key hint "Esc") |
| Last wing card | "Return to the aisle" |
| Dialog | "The work", "Curator's note", "What I took away" (only with a takeaway), "The object", "Medium", "Close" / "Back to the aisle", "Newer", "Older", "Copy link", "Link copied" |
| Desk card headline | "You've reached the beginning." |
| Desk card body (draft) | "Thanks for walking through. I'm finishing my B.Eng in Computer Engineering in May 2027 and I'm open to [placeholder: target roles]. If something here sparked an idea, I'd love to hear from you." |
| Desk buttons | "Email me", "Connect on LinkedIn", "Take home the catalogue (PDF)", "Browse code on GitHub", "Walk the aisle again" |
| Desk footnote | "New exhibits are installed as the collection grows." |
| Fallback banner on `/resume/`, no WebGL2 (`#why-no-webgl2`) | "The gallery needs WebGL2, so you're seeing the classic resume." |
| Fallback banner, Save-Data (`#why-save-data`) | "Data saver is on, so you're seeing the classic resume." |
| Fallback banner, software renderer (`#why-software`) | "Your browser is drawing 3D without a graphics card, so you're seeing the classic resume." |
| Fallback banner, repeated context loss (`#why-context-loss`) | "The gallery stopped responding, so you're seeing the classic resume." |
| Classic page link to the gallery | "Try the gallery" (to `/?mode=museum`; hidden on `#why-no-webgl2`, where it cannot work) |
| Reduced-motion chip (once, dismissible) | "Prefer a quick read? Open the classic view." |
| Context-loss veil | "Restoring the gallery" |
| noscript notice | "The 3D gallery needs JavaScript. Everything is below, and the classic resume is at /resume/." |
| 404 page | "This room is closed." "The page you asked for isn't part of the collection." Links: "Back to the gallery", "Classic resume" |
| aria-live, exhibit | "No. 02, Warm Start. Full Stack Software Developer (Co-op), Mysa, Jan 2026 – May 2026." |
| aria-live, door | "Projects wing door. Press Enter to step inside, or keep scrolling." |
| aria-live, lobby and desk | "Lobby." / "Front desk." |

Desk links: Email to `mailto:cndukanwagbo@mun.ca`; LinkedIn to `https://linkedin.com/in/emekanduka`; the catalogue to `/resume.pdf`; GitHub to `https://github.com/eme-k-a` (default, [placeholder: confirm GitHub handle]). The phone number never appears on the site.

### 8.5 Classic-view escape hatch
- **Always available:** the skip link and the HUD "Classic view" button go to `/resume/`, the zero-WebGL classic resume with the PDF link.
- **Classic mode** (PLAN §3: software renderers go to `/resume/`): the `<head>` boot script sets `data-mode` to `museum` or `classic` before first paint (ARCHITECTURE §5.3 has the exact decision table). It chooses classic for any of these reasons (precedence, including `?mode=museum` overriding a stored choice, is the ARCHITECTURE §5.3 table):
  1. `?mode=classic`, or a classic choice stored earlier (in `localStorage`, inside try/catch). No banner.
  2. No WebGL2 (even when the museum was requested).
  3. Save-Data is on.
  4. Software renderer (the regex in ARCHITECTURE §5.3: SwiftShader, llvmpipe, Microsoft Basic Render Driver and similar). Bypassed by `?test=1`.
  5. Repeated context loss (§8.2), switched mid-session.
- **What the visitor sees:** on `/`, classic mode replaces the page with `/resume/#why-<reason>` before first paint, and `/resume/` (zero JS) shows the matching fallback banner from §8.4 through CSS `:target`; reasons without a banner show none. On `/exhibit/<id>/`, classic mode stays on the page and shows the prerendered story as an article, so deep links and Back keep working. "Try the gallery" on `/resume/` goes to `/?mode=museum` (which also stores the museum choice).
- Without JS, `/` shows the prerendered hero and every card (wing exhibits after their doors) with the noscript notice; exhibit pages show their story.

### 8.6 Testable rules
- At 360 x 640 and 390 x 844, JS off and JS on before `ready`: the h1, the role line, the education line and the 3 links are fully inside the first viewport.
- The LCP element is the h1; mobile Lighthouse LCP on `/` ≤ 2.5 s; CLS ≤ 0.02 (lhci gate 0.05).
- With WebGL disabled, `/` lands on `/resume/#why-no-webgl2` with that banner visible and the classic content ("Nasdaq Verafin" present); `/exhibit/<id>/` shows its prerendered story.
- No request leaves the origin during a full walk.

---

## 9. Mobile

### 9.1 Framing
- The world and the stop poses are the same on every device. Phones change only the projection (§6.2): vertical FOV 68° in portrait and the look-at point at 36% of the height, so the case fills roughly the upper 55% of the screen and the card owns the bottom 40%.
- Landscape phones (Pixel 7 landscape) use the desktop layout with compact UI: card width 300 px, artwork title 22px, Medium and Caption hidden, FOV 50°.

### 9.2 Card and HUD
- The card is pinned to the bottom of its section (§5.8) and shows: number and pill, artwork title, role, organization, dates and dimensions, "Read the story". Medium and Caption are hidden below 480 px.
- HUD: the 3 px progress bar and the year chip at the top left; "PDF" and "Classic" at the top right, with safe-area insets. In a wing, "Return to the aisle" replaces the year chip.
- Tapping the case opens the story; tapping the door at a door stop steps inside. There is no drag-to-rotate and no custom gesture.

### 9.3 The single full-height sheet
- The story is one native `<dialog>` at `100dvh` (§5.9): sticky header with "Back to the aisle" and "Copy link", scrolling body, sticky footer with Newer and Older.
- No drag handle, no 35/65/92% heights, no swipe-to-close. Close with the button, browser Back or Esc.
- The canvas stops rendering while the sheet is open, and resumes on close.

### 9.4 Performance posture
- Coarse-pointer devices start at the medium tier (DPR max 1.5, env-mapped floor, 1 real spotlight). Idle animation runs at 30 fps and stops 15 s after the last input.
- Budgets: 30 fps floor, 45 fps target; ≤ 150k triangles; ≤ 40 MB texture memory; draw calls ≤ 80.
- Never disable page zoom. Respect `env(safe-area-inset-*)` with `viewport-fit=cover`.

### 9.5 Testable rules
- On Pixel 7 at every stop, the card's DOM rect and every HUD rect do not intersect, and the card does not cover `screenPos(id)`.
- A CDP flick moves exactly one stop; the address bar collapse does not change the canvas drawing buffer size.
- With the sheet open, `stats()` frame count does not advance.

---

## 10. Accessibility and reduced motion

### 10.1 Semantics
- The canvas is `aria-hidden="true"` and not focusable. Every piece of meaning it shows also exists in the DOM: cards, the dialog's "The object" description, the HUD.
- Landmarks: `header` (skip link, wordmark, Resume PDF, Classic view), `main` (hero and stop sections), `nav aria-label="Exhibits"` (progress rail).
- Each stop section has a heading: the hero h1 in the lobby; an h2 artwork title or room name elsewhere.
- "Read the story" is a real `button` with `aria-haspopup="dialog"`. "Step inside" and "Return to the aisle" are buttons. Door-card exhibit links are real links to `/exhibit/<id>/`.
- `lang="en-CA"`.

### 10.2 Keyboard
- **Tab order:** skip link, header controls, hero ("Begin the walk"), then each card's controls in track order (door cards include their wing exhibits' links, so every story is reachable in catalogue order), then the progress rail. Focusing a card control scrolls its section into view natively, and the camera follows.
- **Native keys** (browser behavior, untouched): arrows, Space, Page Up/Down, Home, End.
- **Custom keys, only these two:**
  - **Enter** with focus on the body: opens the current exhibit's story, or steps inside at a door stop.
  - **Esc:** closes the dialog (native cancel); with no dialog open inside a wing, returns to the aisle.
- Focus is always visible (§7.8) and never lost: closing the dialog and leaving a wing move focus as in §5.10 and §3.4.

### 10.3 Announcements
- One `aria-live="polite"` region.
- It announces stop arrivals only when the move was started by the keyboard (a key pressed within 1 s before the scroll began) or by a HUD control, plus wing entry and exit. Wheel, trackpad and touch scrolling never announce.
- Wording per §8.4.

### 10.4 Contrast, targets, motion
- All text meets 4.5:1 (§7.2 lists the pairs); focus indicators and UI boundaries meet 3:1.
- Targets are at least 44 x 44 CSS px.
- Nothing is revealed only on hover; everything hover shows is also shown on focus or exists in the card.
- No flashing: glow changes are slow (≥ 0.5 s ramps) and never exceed 3 per second.

### 10.5 Reduced motion
Under `prefers-reduced-motion: reduce`, §6.6 applies in full: 200 ms fade-cuts between stops with no in-between camera positions, reduced-motion poses for all exhibits, no parallax, no dolly, no slides, instant reveals, `behavior: 'auto'` for programmatic scrolls, and the one-time classic-view chip.

### 10.6 Testable rules
- axe: 0 violations on `/` in museum mode (lobby and a door stop), the open dialog, `/resume/` (light and dark, with and without a fallback banner), `/exhibit/<id>/` with JS off, the no-WebGL path, and `404.html`.
- A keyboard-only spec reaches every story in catalogue order and returns focus correctly after each close.
- Scrolling through all stops with the mouse wheel produces no live-region text; arrow-key moves produce one announcement per arrival.
- Lighthouse accessibility ≥ 0.95.

---

## 11. Delights and do-nots

### 11.1 Six cheap delights
1. **The exhibition itself is a joke for engineers:** "Commit History", newest first, and the end wall that reads "You've reached the beginning."
2. **Museum-label wit on every card:** "Medium" is the tech stack, "Dimensions" is the computed duration, "ON VIEW NOW" marks the current role.
3. **Admission ticket:** "Begin the walk" is styled as a ticket stub with a perforated edge (CSS only). After hydration it is stamped with today's date in the visitor's locale ("15 OCT 2026"; the stamp area has a fixed width in the prerender, so no layout shift). On click the stub tears off (400 ms) and the walk begins. Reduced motion: no tear.
4. **Gift shop at the exit:** the resume PDF is "Take home the catalogue", the LinkedIn link is a postcard on the desk, the email is a sealed envelope, and GitHub is a ledger. Each 3D desk object has a matching DOM button on the desk card.
5. **Light that answers you:** each case's real light fades up as you arrive, and on desktop the lobby portrait warms from duotone to full color over 600 ms on hover (fine pointer only; reduced motion: no change).
6. **"Copy link"** in every story copies its `/exhibit/<id>/` address, which unfurls with that exhibit's own preview card.

### 11.2 Do not
- **Movement:** no free roam, WASD or pointer lock; no head bob; no autoplaying camera tours; no drag-to-rotate; no custom gestures.
- **Input:** no wheel or touch listeners, no `touch-action: none`, no scroll hijacking, no custom keys beyond Enter and Esc.
- **Routing:** no hash routes, no URL writes on stop arrival, no history entry per Newer or Older.
- **Sound:** none in v1: no ambience, no clicks, no footsteps, no autoplay.
- **Effects:** no post-processing or bloom, no particle swarms, no glitch, typewriter, cursor trails or confetti, no flashing.
- **Rendering:** no transmission glass, no real-time shadows or shadow maps, no runtime tier switches that change light count or material types, no GLB models in v1, no HDRI downloads.
- **Exhibits:** more than one motion, more than 20k triangles, materials outside the library, lights inside exhibits, realistic people, avatars or mannequins.
- **Content:** no company or brand logos (in 3D, icons or images), no invented metrics, no text that exists only in WebGL, no small 3D text, no detection imagery for Verafin, no phone number anywhere on the site, no em dashes.
- **UI:** no floor-plan modal, no 3-height bottom sheet, no swipe-to-close, no hover-only information, no loading screen the visitor cannot read past, no hidden route to the classic resume (it is always one click away).
- **Network:** no requests to other origins: fonts, troika fallbacks and everything else are self-hosted, and detect-gpu is not used.

---

## 12. Backlog

Cut from v1. Each item needs Emeka's go-ahead and a work package before it returns.

| Item | One line |
|---|---|
| Sound | Ambient room tone and a felt click on story open, off by default, needing a verified CC0 source, an iOS AudioContext unlock, a toggle and tests. |
| Post-processing bloom | Bloom and vignette via `postprocessing`, blocked because it caps three below 0.187 and costs a 60 KB chunk; the vignette stays CSS. |
| GLB models | Optional CC0 models (Kenney, Quaternius) as meshopt GLBs under 300 KB, only with `assets-src/CREDITS.json` and a test allowing only CC0-1.0 or OFL-1.1, plus `'wasm-unsafe-eval'` in the CSP. |
| Floor-plan modal | A "?" overview map of the gallery; the progress rail covers navigation in v1. |
| Analytics | A cookieless counter, needing a `connect-src` change and a privacy note on `/resume/`. |
| Custom domain | A config change of `SITE_URL` once Emeka picks a domain. |
| Drag-to-rotate and dialog turntable | Rotating the object while its story is open (desktop only); conflicts with the modal dialog and the one-motion rule. |
| Multi-height sheet and swipe-to-close | Partial-height phone sheets with gestures; replaced by one full-height sheet. |
| Cut exhibit effects | Verafin's sphere stream and hover cartridge, Mysa's phone slabs and orbiting key, Wailo's chat bubbles, CFIA's CRT and pin ring, KlarUp's flame and hopping avatars, Finance's insight bubble, SDSJ's month ring. |
| Official badge images | Certification badges, only if each issuer's guidelines allow it. |
| Light-mode gallery | A "white cube" version, requiring a second lighting design. |
| Portrait caption | "Portrait of the engineer, [placeholder: year]" as a DOM label tied to the lobby portrait. |
| Wings with 3 or more items | Longer wing rooms and tracks once the layout rules are extended and pinned. |
| Motion toggle | An in-page motion switch beyond the OS reduced-motion setting. |
