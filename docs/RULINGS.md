# R0 rulings: consolidated and binding

Authoritative together with `docs/PLAN.md` sections 1 to 9. The `docs/PLAN.md` "Addendum" is the long-form record of these rulings (plus `docs/wp/WP-00.md` Notes 18 to 23 and the "R0 ruling (2026-10-15)" notes at the end of the briefs); this file is the deduplicated digest, grouped by topic, with superseded versions dropped. If this file and the Addendum ever differ, the Addendum wins; record the difference in `openQuestions`. Authority order: PLAN and this file, then your brief, then ARCHITECTURE, EXPERIENCE, CONTENT_DRAFT and ART_DIRECTION. The `CLAUDE.md` hard rules and the global rules in `docs/wp/_TEMPLATE.md` still apply. `docs/wp/WP-00.md` Notes 1 to 17 are already applied inside EXPERIENCE, ARCHITECTURE and CONTENT_DRAFT.

## Process and git

- Section numbers are frozen; cite them as `PLAN §5`, `ARCHITECTURE §6.2`, `EXPERIENCE §4.1`.
- EXPERIENCE outline: 1 Concept; 2 Spatial layout and coordinates; 3 Stops and tracks; 4 Exhibit concepts; 5 Exhibit anatomy; 6 Motion and camera choreography; 7 Art direction; 8 Onboarding, recruiter fast path and microcopy; 9 Mobile; 10 Accessibility and reduced motion; 11 Delights and do-nots; 12 Backlog.
- ARCHITECTURE outline: 1 Stack and pinned versions; 2 Repository layout and ownership; 3 Content model; 4 Resume outputs; 5 App shell, boot and routes; 6 Scroll track and camera rail; 7 Scene architecture and exhibit plugin interface; 8 Rendering, lighting and quality tiers; 9 Performance budgets; 10 Robustness and fallbacks; 11 SEO and sharing; 12 Security headers and CSP; 13 Testing strategy; 14 CI/CD and deploy; 15 Developer ergonomics.
- Agent commits use a conventional message, a blank line, then one trailer block: `WP: WP-xx` (review fixes: `WP: F-###`) followed by the attribution lines in `CLAUDE.md`.
- Only R0 pushes, merges and tags. The session git proxy accepts pushes only to the integration branch `claude/intelligent-sagan-poq45q` and refuses tag pushes (HTTP 403).
- The `legacy-site` tag stays local (check A4 waived). The legacy site is `main` at `4f1ab2b5e0c080c9e4bde94ac7b530ff51442c5d`. Emeka pushes the tag by hand: `git tag legacy-site 4f1ab2b && git push origin legacy-site`.
- The `contracts-v1` tag stays local (check A9 waived). It sits on the last WP-02 commit (the `fix(wp-02)` commit that carries the final `review/reports/WP-02.json`); R0 moves it with `git tag -f contracts-v1 <sha>` if another WP-02 fix lands. Emeka pushes it with `git push origin contracts-v1` and checks it with `git ls-remote --tags origin contracts-v1`. The report-only commit `6ef8e7a` is accepted as documented.
- WP-33 tags `v1.0.0` the same way, by hand. This overrides the `OWNERS.json` `git` rule that says WP-33 pushes the tag.
- `package.json` `scripts` keys may be changed only by the WPs that replace a stub: WP-03 and WP-04 (M0 exception), WP-06, WP-07, and WP-28 (the new `fonts` key), and only the keys their brief names. R10 owns everything else in `package.json` and the lockfile.
- Agent worktrees live under `.claude/`, which git, prettier and eslint ignore.

## Content and resume

- The phone number is never committed. `contact.phone` is read at build time from `RESUME_PHONE` (environment or the gitignored `.env.local`) and used only by `npm run resume:private`. The repo, the site and `dist/` never contain it.
- `exhibit.draft: boolean` (default false) is part of the exhibit presentation schema. It covers title, caption, tags and object text.
- `RELEASE=1 npm run check:copy` fails while any exhibit has `draft: true`.
- verafin, cfia, mun and certifications keep `exhibit.draft: true`, as does any exhibit whose title, caption, tags or object text goes beyond the resume. All first-person story copy stays draft until G5.
- v1 has exactly one education entry. The schema keeps `education: z.array(Education).min(1)` (ARCHITECTURE §3.3). `computeLayout` throws `The Foundations room holds exactly one education entry (found n)`, and also runs the EXPERIENCE §2.2 rule 2 wing checks that the schema leaves to the layout.
- `scripts/check-content.ts` calls `computeLayout(content, buildDate)` after the parse, so layout errors fail the content check.
- In the CONTENT_DRAFT bullet register, `sdsj.b1` has priority 3, matching `resume.ts`.
- The CTA labels live inside `stopCards` (accepted).
- `resume/resume.tex` is generated at 10pt (it matches Emeka's own Overleaf PDF, CMR10) and compiles to 1 page; 11pt ran to 2 pages.
- The `resume` npm script runs the `.tex` step first, then the PDF step (ARCHITECTURE §15.2 and `README.md` follow this order).
- Gate G0 is approved (2026-10-15): Verafin is hybrid (`location.mode: hybrid`), the three Verafin bullets are `draft: false`, the "(Co-op)" and "(Intern)" title style is confirmed, and GitHub stays off the PDF for now. The Verafin exhibit copy stays draft until G5. Two R1 tests that pin that exhibit draft flag are correct as they are (F-001).
- F-008: the wrapper element added to `src/overlay/Intro.tsx` is accepted. The lobby intro shows below the phone fold, and the h1 stays the LCP element.

## Routes and history

- Query strings survive history writes: every URL that a `routes.ts` transition writes keeps `location.search`, so `?test=1&mode=museum` survives opening a story, entering a wing and closing a deep link. The bare paths in ARCHITECTURE §5.6 and "URL is `/`" in EXPERIENCE §3.6 mean the pathname. e2e specs assert on `new URL(page.url()).pathname`.
- Opening a story and Newer/Older keep the active track in `history.state` (`{ inApp: true, id, track }`). The camera follows behind the dialog only when the new exhibit is on the active track (ARCHITECTURE §5.6, EXPERIENCE §3.5).
- The test hook's `goTo` goes through `navigation.travelTo` and enters and exits wings with the UI's own code, including the wing history entry. Only a cold-loaded deep link enters a wing without one (ARCHITECTURE §6.7 and §13.3, EXPERIENCE §3.5).
- Every stop's section is prerendered; wing exhibits come right after their door and are marked `data-wing`. In museum mode, CSS keyed on `data-mode` and `#track[data-track]` hides the sections that are not on the active track, so nothing shifts at hydration (ARCHITECTURE §5.2 and §6.1).
- "Read the story" is a button in museum mode. Without JS the card still links to `/exhibit/<id>/`.
- The 404 copy is EXPERIENCE §8.4's (ARCHITECTURE §5.9).

## Input and rail

- Keyboard stepping (this supersedes the "only Enter and Esc" wording for these keys). WP-09 adds exactly one keydown handler for ArrowUp, ArrowDown, PageUp, PageDown, Space, Home and End. It calls `scrollIntoView` on the neighbouring section and is ignored while focus is in a form field or the dialog is open. Scrolling stays native; wheel and touch listeners remain banned.
- Keyboard acceptance: ArrowDown twice from the lobby lands on `projects-door`; three times lands on `mysa`.
- Door stops sit at the z midpoint between the two main exhibits on either side. Each wing room, its plinths and its camera stops are positioned relative to its door, so `wing.after` can move a wing without hand-editing coordinates.
- Entering a wing scrolls instantly to the first wing exhibit while the rig plays a scripted 1.4 s easeInOutCubic glide (`tokens.motion.wingEnterS`). Exiting plays a 1.2 s glide back to the door (`wingExitS`). Both are fade-cuts under reduced motion (ARCHITECTURE §6.7, EXPERIENCE §3.4 and §6.5).
- `CameraRig` calls `reportCameraTarget(lookAt)` whenever it sets the look-at, so `stats().camera.target` is the real target.
- Snap scope (WP-09): the scroll-snap rules apply only under `html[data-mode='museum']`. With JS off, mandatory snapping moved first paint to scrollY 144 and broke the recruiter fast path.
- Wheel acceptance (WP-09 A1): desktop uses proximity snapping, so a small 100 px wheel nudge in the lobby settles back on the lobby (by design). R0 probed the built site in Chromium: six 400 px wheel steps reached scrollY 2700, three whole stops, with none skipped. A1 is accepted on that evidence, plus Emeka's hand check on a real trackpad and mouse at the G2 preview.
- WebGL e2e coverage: plain `npm run e2e` runs the wing and rail specs as [no-webgl] skips. WP-17 must make the WebGL specs run in CI on the desktop and pixel7 SwiftShader projects.
- Tall stop sections: on phones the lobby is taller than 100svh (1074 px at 390x844). Under mandatory snapping, a visitor can still scroll inside a section taller than the viewport, and the next swipe after its end lands exactly on the next stop. WP-09 proves this with a Pixel 7 e2e test.

## Rendering and budgets

- Slot bounds are local `{ min, max }` boxes so the y offsets of EXPERIENCE §5.3 fit the type. `Slot.plinth` adds `'none'` for the wall vitrine (ARCHITECTURE §6.6 and §7.2).
- `settled` and `ExhibitRuntime` (`motion`, `active`) are defined by ARCHITECTURE §6.3 and §7.2; EXPERIENCE §5.1 and §6.4 defer to them. Spotlight assignment follows EXPERIENCE §6.8 (ARCHITECTURE §8.1).
- Mount `QualityController` and `PrecompileMaterials` INSIDE `<MaterialsProvider>`; the material hooks throw outside it. ARCHITECTURE §7.1 shows them as siblings, and that order is wrong.
- When the kit tints instanced beam cones per target with `instanceColor`, set the beam material color to white. three multiplies `instanceColor` by `material.color`, so any other color tints the cones twice.
- The Wailo reset-bar flash uses ramps of at least 0.5 s (ART_DIRECTION §5 glow levels, EXPERIENCE §10.4): 0.4 to 1.6 to 0.4 over at least 1.0 s, not 0.8 s.
- `--border-secondary` stays at 60% (at 50% it fails 3:1 contrast on `--ink`).
- Entry chunk (R-M1-2): it may statically import small pure-data modules from `src/museum` (`quality/tiers`, `rail/navigation`, `rail/progress`, `rail/layout`) and must never import three.js, R3F, drei or troika. `check-budgets` enforces this with three.js fingerprints such as `WebGLRenderer`, `ShaderChunk` and `troika` (F-010).
- `leva@0.10.1` (debug only) bundles its own `zustand@3.7.2`. That is allowed only inside the lazy `?debug` chunk; `check-budgets` fails if `leva` or a second zustand copy appears in the entry or museum chunks.

## Testing and CI

- `stats().mounted` lists every exhibit whose `ExhibitFrame` is mounted, whether it shows the placeholder, is compiling or is revealed.
- `ExhibitFrame` (WP-08) calls `useEffect(() => markExhibitMounted(id), [id])`, exported by `src/museum/quality/StatsProbe.tsx`; the disposer also drops the exhibit's stats. After reveal, under dev and `?test=1`, it calls `reportExhibit(id, { triangles, drawCalls, inBounds })`.
- The CI `verify` job must make Chromium available (Playwright 1.56.1 browsers), so the WP-04 overflow-gate tests (`describe.skipIf(no Chromium)`) actually run there.
- The CI latex job skips `setup-node` and `npm ci` (R-M1-1): it compiles only the committed `resume.tex`. ARCHITECTURE §14 is read with this exception.
- TeX Live is installed in this container (`pdflatex` at `/usr/bin`). Briefs may compile `resume.tex` locally; the CI latex job is still the authority.
- `npm ls` acceptance means no `invalid`, `missing` or `ERESOLVE` entries. Extraneous optional packages from sharp are allowed.
- The root `tsconfig.json` keeps `include: ["src/**/*.tsx"]` and extends the app config, so `tsx` scripts can render `src/**/*.tsx`. Nothing runs a bare `tsc -p tsconfig.json`.

## Assets and fonts

- The headshot crop is `extract({ left: 0, top: 360, width: 1008, height: 1260 })`, a head-and-shoulders 4:5 frame (`top: 0` cut the face at the chin). `public/images/` is regenerated from it.
- `threeDStrings(c, now?)` returns objects `{ kind, text, font, for }` and takes the build date. `check-glyphs` (WP-07) reads `.text` and `.font`; WP-28 font subsetting reads `.text` grouped by `.font`.
- The print font is CMU Serif; `@fontsource/source-serif-4` is not used.
- Small-phone CLS: at 360x640, swapping in the web font shifts the page by about 0.041, caused by the fallback-font metrics. WP-28 adds Linux and Android serif fallback overrides in `src/design/fonts.css` (R2 and R7). Tracked as a G4 item.

## M2a (2026-10-16)

- **Netlify:** site `emeka-nduka-nwagbo` (https://emeka-nduka-nwagbo.netlify.app) has no Git link. A `workflow_run` trigger fires only from the default branch, so pushes deploy through a final `deploy` job in `ci.yml` that calls `deploy.yml` (`workflow_call`, `secrets: inherit`, same-repo pushes only). `workflow_run` handles pull request runs only. Production deploys only from a push to `main`. The preview alias for this branch is `claude-intelligent-sagan-poq45q`.
- **Real `SITE_URL`:** the print header shows the site host before the location. `resume.tex` and `selectors.test.ts` follow it (R0 grant to WP-18).
- **WP-11:** a local `LightformerEnvironment` replaces drei `<Environment>`, because drei's version bundles HDR loaders and a CDN URL. Environment modules are renamed: `lighting.ts` is now `lightPlan.ts`, `fixtures.ts` is now `fixtureMatrices.ts`, and desk logic is in `deskParts.ts`. `GreyboxLighting.tsx` is gone. Tone mapping is frozen at ACES, exposure 1.0.
- **WP-14:** `story.ts` keeps `inApp: false` after Newer or Older on a cold deep link. The frozen `transitions.stepStory` is unchanged (contracts-v1). In museum mode a cold deep link shows the story when the dialog opens at hydration; that is accepted, because classic mode and JS-off pages show `#story-static`. `/og/*.png` images arrive in WP-31.
- **WP-15:** `screenPos` stays the hit-box center (frozen contract). Specs check framing at the case center. `travelTo` fade-cuts any move over 3 stops, and `jumpTo(id, { fade })` is exported for R6. The wider keyboard and HUD announcement windows are accepted. `greybox.spec.ts` samples the lobby at the framed case point, not the canvas center (R0 grant to the WP-15 integrator).
- **WP-16 interfaces:** rig-driven frame requests (gaze, framing, dolly, parallax, fade) must keep rendering under the demand frameloop. Any render pause reads `html[data-sheet='open']` and the store's `openId`.
- **WP-16 rulings:**
  - The 15 s idle stop may freeze exhibit motion mid-cycle; motion resumes without a jump (answers WP-12).
  - `ready` resets to false when the canvas remounts.
  - Context-loss recovery (test c): 5 s is the target on real GPUs, checked by hand at G5. Under SwiftShader (any `?test=1` run, CI included) the spec allows 10 s, because shader linking alone takes about 4.8 s there.
  - The boot tier must not demote iOS Safari on `hardwareConcurrency` alone. Confirm on Emeka's iPhone at G5.
- **M2 follow-ups (F-M2, after integration):**
  - F-011 (R3): move `QualityController` inside `MaterialsProvider`.
  - F-012 (R4): CameraRig stops requesting frames once the camera reaches the pose for the current scroll progress, so a scroll resting between stops lets frames stop.
  - F-013 (R6): MuseumGate unmounts the canvas when the store's mode is `classic`.
- **F-M2 rulings (2026-10-16):**
  - CI was green twice (runs 34 and 35), and the first preview deployed to https://claude-intelligent-sagan-poq45q--emeka-nduka-nwagbo.netlify.app.
  - The context-loss recovery allowance under SwiftShader is 20 s (measured 10.6 to 14.2 s on CI with two workers). It replaces the 10 s in the WP-16 rulings; the 5 s target on real GPUs stands.
  - The e2e job `timeout-minutes` goes from 30 to 45, because runs 34 and 35 took 29.4 and 29.2 minutes. WP-17 may split the job instead.
  - Open for WP-17 and R7: F-015 evaluates dropping the render-every-frame-while-compiling rule (ARCHITECTURE section 8.5). It is the largest CI-time saving found; keep it only if screenshots show no pop on a real device. F-016 removes the unused `beam` and `shadowDecal` programs from the precompile set.
- **WP-17 rulings (2026-10-17):**
  - The e2e job runs as six shards (`E2E_SHARD`, 30 min each). `deploy` needs every shard.
  - The 8-minute local target is dropped: a local full run takes about 17 minutes. CI shard time is the target.
  - Visual baselines come only from CI. Dispatch `ci.yml` with `update-baselines: true` and `wp: <id>`, and the `commit-baselines` job commits them to the branch (artifact downloads are blocked from agent containers). A bot push starts no run, so R0 dispatches a normal run or pushes afterwards. The first 19 slice baselines are `e4b5a40`.
  - The `wings.spec` walk of all 10 main stops is removed, because it duplicated rail-input (e) and (f). A wing-history test replaces it.
- **Follow-ups for the next fix-up pass (F-M3):**
  - F-015 (R7): the render-every-frame-while-compiling question (see F-M2).
  - F-017 (R7): `?debug` breaks the CSP, because r3f-perf fetches a `data:` font that `connect-src 'self'` blocks. Fix it inside the debug chunk; do not loosen the production CSP.
  - F-018 (R6): ExhibitDialog `onClose` can close a story reopened before the previous close event landed.
  - F-019 (R3): a failed exhibit chunk import also throws an unhandled rejection.
- **Safe Sip removal (Emeka, 2026-10-20):** the volunteer entry "Member (Right-To-Rise: Safe Sip), Enactus Memorial" (id `safe-sip`) is removed everywhere: the gallery, its exhibit page, `/resume/`, `resume.pdf` and `resume.tex`. This changes the contracts-v1 content ids with Emeka's approval; brief `docs/wp/F-035.md`. The volunteer wing holds only SDSJ. F-029 (Safe Sip readability) and the F-G2c brief are dropped.
- **G2 review rounds 2 and 3 (2026-10-20):**
  - Room-name labels are 0.10 m and main-aisle organization labels are 0.12 m (F-G2a). EXPERIENCE §5.4's "raise, never lower" rule needs an R0 rewrite in the next docs pass.
  - A wing with one item puts it at the far plinth spot, so it shows through the doorway (F-037).
  - The phone desk card is shorter in museum mode, and desk framing uses the measured card top (F-020).
  - Inside a wing, the current stop's rail label shows only on hover or focus (F-036).
  - At a door reached on the wing track, the wing head hides; Esc and the door card still exit (F-038).
  - The scoped F-038 fix was verified by its own e2e check, with no fourth scored round, as round 3 recommended.
- **Follow-ups for F-M3** (with F-015 and F-017 to F-019):
  - F-027 and F-032 (P2) and F-033 (P3) from the review.
  - Move the wing title measurements into a module without font imports, so `placard.ts` and `rail-input` (g) share it.
  - The EXPERIENCE §5.4 rewrite.
- **Gate G2 passed (Emeka, 2026-10-20):** he approved the slice stills (`review/runs/2026-10-20-g2r3/stills/`) and the preview at CI run 60 (`5ba1b84`). M2 is complete.
- **M3 decisions (2026-10-21 to 2026-10-24):**
  - KlarUp's staircase is raised (tile i at y = 0.085 + 0.075 i) and its check bars are 0.012 square. Emeka approved this in the WP-22 session; EXPERIENCE §4.5 is updated.
  - Brass reads dark at tier medium (finance-tracker coins, klarup crate strips, Verafin cartridges; G3 F-045). This goes to the M4 lighting pass (WP-26, R2 with R7), not to the exhibits.
  - F-M3a: the draw-call budget counts the arrival frame, including shadow bakes, and every stop is within budget.
- **Builder sessions:** the seven finished M3 cloud sessions (WP-20 to WP-25 and F-M3) were archived on 2026-10-24. Their branches `claude/m3-*` stay on GitHub.
- **Gate G3 passed (2026-10-24):**
  - All of M3 is merged and green: CI run 102 at `71e5f62`, 47 CI baselines.
  - The G3 review round 1 averaged 3.78 (desktop 3.83, Pixel 7 3.72) with no P0. Its only P1, F-039 (the phone wing HUD over the wall titles), is closed by a scoped fix verified by an e2e check (`9e23b8e`), as with F-038.
  - Open P2s go to M4: F-040 to F-044, and sdsj at 360 x 640, where the stop card covers the case floor (a shorter phone card is WP-27 territory). Open P3s also go to M4: F-045 and F-046.
  - Certifications checklist box 6 (F-044) waits for Emeka's certification dates and issuers.
- **M4 routing (Emeka said "go" for M4, 2026-10-24):** four builder sessions run in parallel, each on its own `claude/m4-*` branch; R0 merges by cherry-pick.
  - WP-26 (R3 with R2) also takes F-043 (the certifications backing panel), brass at tier medium (see M3 decisions), and the G3 mood notes (the lobby arch interior, the grey beam wedge behind the portrait, mysa's empty left half on desktop). For this milestone, R2's values-only grant covers `src/museum/materials/**` as well as the tokens.
  - WP-27 (R6) also takes F-046 (rail ticks over stop dots) and sdsj at 360 x 640 (a shorter phone card). The admission ticket stamp uses the frozen test clock under `?test=1`, so visual baselines stay stable.
  - WP-28 (R7): the 3D (troika) subsets hold printable ASCII plus every code point in `threeDStrings` and `labels3d.ts`, so a plain-ASCII content edit never breaks the glyph check. The DOM subsets are generous, as the brief says.
  - F-M4a (R5 with R4, R3 and R1; brief `docs/wp/F-M4a.md`): F-040, F-041, F-042, F-044 and F-045. KlarUp stays as Emeka approved it.
  - F-029 is withdrawn (Safe Sip is gone) and F-039 is marked fixed in `review/findings.json`.
  - After the merges: one CI baseline refresh, then the G4 review (R11). G4 needs an average of at least 4.0, no dimension below 3.5, and Emeka's sign-off on 10 screenshots.
- **M4 merges (2026-10-24, R0 cherry-picks, 22 commits):** WP-28, WP-26, F-M4a and WP-27, in that order, with no file touched by two branches. On the merged tip, verify (896 tests), build, budgets and glyphs pass. Decisions on the builders' open questions:
  - WP-28's edit of the fonts block in `src/design/css.test.ts` (R2's file) is ratified: it only follows the switch to the subsets. The Plex subsets keep U+FFFD. A `scripts/credits.ts` generator and a Cache-Control rule for `/fonts/*` (the subset names are not hashed) go to WP-29 as candidates, not M4.
  - WP-26: the vignette is a child element of the stage rather than `.stage::after`, because the stage is styled inline; same look and behavior. Portrait warmth and paper aging already shipped. EXPERIENCE §7.5 and §7.6 still hold the old light values; tokens and ART_DIRECTION §4 are the source until R0 syncs the spec.
  - WP-27: under `?test=1` the ticket stamp reads "15 OCT 2026", so no visual mask is needed. The motion chip's dismiss label is "Close" (dialog microcopy), and it returns on each visit until closed. On phones, "Return to the aisle" replaces the year chip in the top row (EXPERIENCE §9.2). The F-046 desktop check stays in `mobile.spec.ts` until R8 moves it.
  - F-M4a: F-040, F-042, F-044 and F-045 are fixed. **F-041 is not fixable by framing:** the MUN title sits 19 to 32 degrees off the camera axis, beyond the Pixel 7 half-angle of 18.3 degrees. R3 moves the MUN title onto the wall in the camera's sightline through the case, as F-022 did for the aisle titles (follow-up F-041b).
  - Builder containers can carry Chromium revision 1243 instead of 1194; the builders symlinked the 1194 folder names locally and committed nothing. CI installs its own browsers.
- **CI run 119 (M4 baseline dispatch):** the phones-rest shard failed "reduced motion holds the canvas still" at klarup, finance-tracker and sdsj on pixel7. Root cause: WP-27 put "Return to the aisle" at the phone's top left, where the spec's parked test pointer (20, 20) hovers it, and the overlay applied `:hover` styles even though the Pixel 7 profile reports `(hover: none)`. Fix (R0 for R6): the overlay's hover styles sit under `@media (hover: hover)`, which also removes sticky hover after a tap on real phones. The spec is unchanged.
- **F-041b merged (2026-10-24):** the MUN wall title hangs on the stop camera's sightline (F-022 placement) and is inside the frame at the mun stop on pixel7, 360 x 640 and desktop, and in the desktop dialog (`munTitle.test.ts`). R0 ratifies its organization cap at 0.19 m (an exception to F-G2a's 0.12 m), because at 8.8 m the 14 CSS px floor wins. Notes for the G4 review: `labels.test` measures on a 412 x 915 viewport, while Pixel 7 is 412 x 839, where the MUN cap is 13.5 px (the old title was 13.7 px there); and on Pixel 7 the "05" top clears the HUD button row by about 2 px. EXPERIENCE §5.4, §7.5 and §7.6 now match the WP-26 values and the MUN title.
- **CI run 125 (F-041 baseline dispatch):** attempt 1 failed desktop quality (b) and pixel7 exhibit-contract verafin; both passed in run 122, in local repeats (with matching pre-M4 and M4 frame times) and in attempt 2, the one re-run the CI rules allow. R0 records them as intermittent under SwiftShader (F-047, P2, R8 with R7, for WP-29 or WP-32), not as an M4 regression. A second failure of either is treated as real.
- **G4 review round 1 (2026-10-24, `review/runs/2026-10-24-g4r1/`):** the average is 3.90 (desktop 3.92, Pixel 7 3.87), against G3's 3.78. No dimension is below 3.5 (the lowest is D6 at 3.76 overall and 3.69 on Pixel 7). New findings: one P1 (F-048), three P2 (F-049 to F-051) and two P3 (F-052, F-053); F-040 to F-046 are fixed. **Emeka approved the 10 sign-off stills** ("approved", typed in the review session at 15:11 UTC), and R0 recorded them in ART_DIRECTION §10. G4 still needs the 4.0 average. R0 plans one fix session, F-M4b (`docs/wp/F-M4b.md`), then round 2. It waits on Emeka's go-ahead because of the weekly usage warning.
- **F-M4b merged (2026-10-27, R0 cherry-picks, 7 commits):** F-048, the doors with F-051, F-052, F-049, F-050 and F-053 are fixed. verify (914 tests), build, budgets and glyphs pass. R0 ratifies two label-size changes:
  - Main-aisle organization labels are 0.125 m, up from F-G2a's 0.12 m, because measured at the real Pixel 7 viewport (412 x 839, `labels.test`) 0.12 m gave only 13.7 to 13.8 px.
  - The MUN number cap is 0.26 m and its organization cap 0.20 m (14.28 px).
  - Side-bay washes are recorded in ART_DIRECTION §4.
  - The CI visual step changes on 27 stop and dialog shots; a baseline refresh follows, then G4 round 2.
- **CI run 142 (F-M4b baseline dispatch):** desktop quality (b) failed a second time, so R0 treated it as real (F-047 ruling). The root cause is in the test, not the app. Under SwiftShader with parallel workers, the first frame after an input arrives 2.2 to 7.5 s late, on the pre-M4 build as on the M4 one, and two frames did not always fit the 10 s window. The poll now runs until 1 s before the idle stop (`a fix(F-047) commit`). The pixel7 verafin still-canvas check stays open as intermittent.
- **M5 go, given in advance (Emeka, 2026-10-27 04:40 UTC: "you have my go on m5 whenever it's ready"):** R0 starts M5 as soon as G4 passes, with no /compact or new "go". If G4 round 2 fails, M5 waits for the G4 fix and Emeka hears about it first.
- **M5 routing (R0, 2026-10-27):** four builder sessions in parallel, each on its own `claude/m5-*` branch; R0 merges by cherry-pick.
  - WP-29 (R7): budgets enforced in CI and the blocking Lighthouse job. It owns `tests/e2e/budgets.spec.ts`, `vitals.spec.ts` and `lh-precheck.spec.ts`, and only the `lighthouse` job in `ci.yml`. F-047's remaining intermittent check (pixel7 exhibit-contract verafin still canvas) goes to WP-32.
  - WP-30 (R9, accessibility): attribute-level fixes in `src/overlay/**`, `src/classic/**` and `index.html`, plus `tests/e2e/keyboard.spec.ts` and `a11y.spec.ts`. It does **not** edit `src/seo/**`, which belongs to WP-31 for this milestone.
  - WP-31 (R9, SEO and sharing): `src/seo/**`, `src/entry-server.tsx`, `scripts/prerender.ts`, `scripts/postbuild.ts`, `scripts/gen-og*`, `public/og/**` and the icons.
  - WP-32 (R8): `tests/**` and `playwright.config.ts`, except the spec files granted to WP-29 and WP-30, plus only the new `e2e-xbrowser` job in `ci.yml`. It also takes F-047's remaining check. The phone checklist is for Emeka to run before release.
  - Gate G5 also needs `RELEASE=1 npm run check:copy` to pass, which means no drafts or placeholders. That needs Emeka's facts (certification dates and issuers, KlarUp and Finance Tracker roles and dates, the MUN start date, target roles, his GitHub handle) and his approval of all first-person copy. R0 asks him for these when M5 starts.
- **G4 review round 2 (2026-10-27, `review/runs/2026-10-27-g4r2/`):** the average is 3.94 (desktop 3.98, Pixel 7 3.91), 8 points short of 4.0. No P0 or P1 is open. The lowest dimension is D6 at 3.76 (3.69 on Pixel 7). Emeka's approved stills hold; three show only small changes.
  - Fixed: F-048 to F-051 and F-053. F-052 is open at verafin only.
  - New: F-054 (P2, the rail label on the volunteer door's jamb on desktop), F-055 and F-056 (P3).
  - The remaining gap is in story clarity at the doors, phone mood, and object read. These are taste dimensions, scored on SwiftShader captures.
  - One round is left in M4 (the cap is 3). R0 recommends a taste call by Emeka: accept G4 at 3.94 and start M5 now, with the polish items (F-052, F-054, F-056, a door story beat, warm far pools on the phone) as one parallel polish session; the M7 monthly review re-scores them. M5 stays held until Emeka chooses.
- **G4 passed, M4 complete (Emeka, 2026-11-15 05:45 UTC, "Accept, start M5"):** Emeka accepted G4 at 3.94 as a taste call, with his 10 approved stills and no P0 or P1 open. M5 starts under the advance go and the M5 routing above, plus one polish session.
  - F-M5p (R4, R3 and R2 for light values; brief `docs/wp/F-M5p.md`) carries the G4 polish: F-054, warm far pools on the phone stops, F-052 at verafin, a door story beat, larger phone door cases, F-056 and F-055's test row. It owns `src/museum/rail/framing.ts` and its tests, `src/museum/environment/**`, light values in `src/design/tokens.*`, `src/museum/exhibits/_kit/titleMetrics.ts` and `placard.ts`, and ART_DIRECTION §4. It edits nothing the four M5 sessions own, and no `tests/**`. It is not a gate: the M7 monthly review re-scores it.
  - F-055: the 14 px wall-title floor (EXPERIENCE §5.4) is a Pixel 7 rule. At 360 x 640 the titles may render smaller, because the DOM card repeats every title; labels.test gains a 360 x 640 row with an 11 px floor so they cannot fall below today's 11.4 px.
  - F-047's open half (pixel7 exhibit-contract verafin still canvas) goes to WP-32, as routed.
- **Emeka's G5 facts (2026-11-15, answered interactively in the R0 session):**
  - Target roles: "new-grad software engineering roles" (desk line).
  - GitHub: https://github.com/eme-k-a is his; show it on the site and on the PDF and `.tex` (this replaces the G0 "no GitHub on the PDF yet").
  - MUN start: left off; only the expected graduation shows.
  - Tech Stewardship issuer: Engineering Change Lab, on both Tech Stewardship credentials.
  - Certification dates: left off for all three; the placeholder paragraph goes.
  - KlarUp: role "Solo Developer", no dates.
  - Personal Finance Tracker: a school team project. Role "Team Project (School)", no dates. Story paragraph 1 opens "As part of a school team project, I helped build this full-stack personal finance tracker on the MERN stack...", and the gallery bullet reads "Co-built a full-stack personal finance tracker as a school team project using the MERN stack...".
  - First-person copy approved as written: the lobby welcome, the desk, Verafin, Mysa, Wailo, CFIA (including "methodical" and the "Remote Support" tag), KlarUp and Finance Tracker (with the team wording). Still to review: SDSJ, MUN and Certifications (the round was interrupted by a worker restart).
- **M5 merges (2026-11-15, R0 cherry-picks):** WP-29, WP-31, WP-30, WP-32 and F-M5p, in that order, all clean. R0 then applied three cross-owner fixes the builders handed back, and Emeka's content answers. On the merged tip, verify (939 tests), build (one-page PDF, budgets, check-copy) and the PDF checks pass. Decisions:
  - **Mobile LCP (WP-29 A6):** the blocking Lighthouse job failed on mobile LCP (3.86 s against 2.5 s; the hero paints at about 0.45 s) because the museum download started before the hero painted. R0, for R6, applied WP-29's MuseumGate patch with its cleanup: the chunk waits for first contentful paint, fonts and one frame (3 s fallback), then load plus idle; a first interaction still starts it at once. No assertion was loosened.
  - **The exhibit-remount leak (WP-32's loops.spec):** drei's ContactShadows never disposed its render targets, geometry or materials (+16 textures, +8 geometries per loop). R0, for R3, added the kit port `_kit/ContactShadows.tsx` (drei 10.7.9's algorithm plus the cleanup), imported by ExhibitFrame.
  - **`/resume/` and JSON-LD (WP-31):** shell.spec now bans executable scripts on `/resume/`, not the JSON-LD data block; the 404 page stays at zero scripts.
  - **F-M5p:** the one-line `CameraRig.tsx` change in `e191214` (desktop could not tell the two doors apart) is ratified. F-055's floor is 10.85 px, from the test's projection math. F-054, F-055 and F-056 are fixed. F-052 at verafin and the door story beat are left to the M7 review: the first needs a warmer fog or a reframe of approved still 03, the second a slot move, which is frozen.
  - **WP-31:** 11 sitemap entries and share cards is right (12 predates Safe Sip's removal). The favicon monogram "EN" stands in until Emeka confirms it. After any content change, `npm run og` regenerates the cards (CONTENT_UPDATE, WP-35).
  - **WP-30:** the dialog Newer/Older name mismatch is F-057 (P3, R6 with R8, M6). The story's extra named regions and the absent rail landmark on phones stay as designed.
  - **Deferred to M6:** R8 dedupes the budget and transfer assertions into `budgets.spec.ts` and `vitals.spec.ts` (WP-29's request); R10 may move `disableFullPageScreenshot` into `lighthouserc.cjs`; R0 triages the first `e2e-xbrowser` results (advisory). F-047 closes after 3 consecutive green CI runs.
  - **PDF header:** with GitHub, five contact items no longer fit at 10pt, and "St. John's" split across lines. The contact row is 9.5pt with unbreakable items (R0 for R1); the PDF stays one page.
- **Emeka's device findings (2026-11-15):** F-059 (the Projects wing camera looked at the end wall between KlarUp and Finance Tracker) and F-060 (iOS Safari framed the front desk behind its card, because the stage is 100lvh and the card slot 100svh) are fixed by R0 for R4. EXPERIENCE §6.3 gains the wing rule: between two cases in a wing the gaze turns straight from case to case. DESK_CARD_CLEARANCE stays 16 px: 36 px would push the end-wall line under the HUD at 360 x 640. Neither fix changes a Chromium screenshot (Chromium has lvh = svh, and the visual tests capture settled stops), so no baseline refresh is needed; Emeka re-checks both on his phone.
- **G5 copy approved (Emeka, 2026-11-15):** "I approved everything currently waiting on approval": the SDSJ, MUN and Certifications copy (including the MUN coursework tags and "responsible technology") and the favicon monogram "EN". No copy carries a draft flag, and `RELEASE=1 npm run check:copy` passes. Gate G5 still lists Emeka's signed phone checklist (`tests/manual/PHONE_CHECKLIST.md`), which WP-33 needs before the release PR. Emeka also asked for a backlog of future improvements, starting with new exhibit objects for KlarUp and Verafin "at a later time": `docs/FUTURE_IMPROVEMENTS.md`, kept by R0.
- **Gate G5 passed, M5 complete (Emeka, 2026-11-15 19:35 UTC):** after testing the F-059 and F-060 fixes on his iPhone he wrote "approved. phone looks good". R0 records that as his phone check (he had offered the formal ten-step checklist as optional). With every first-person line approved, `RELEASE=1 npm run check:copy` and the release build clean, and CI green with Lighthouse accessibility and SEO at 1.00, G5 passes. M6 (WP-33) opens the PR to `main` only when Emeka asks for it.
- **Branch protection on main (Emeka, 2026-11-15):** a classic rule on `main` requires a pull request and the 10 blocking checks (`verify`, `build`, `latex`, `lighthouse` and the six `e2e` shards), with "Require branches to be up to date before merging" on, by Emeka's choice. So R0 merges `origin/main` into the integration branch before opening each PR to `main`, and the PR's checks run once on the combined code.
- **Production smoke, second cause (2026-11-16, F-063):** PR 8 (F-062) merged as `d43f3a5`, and ci run 203 was green in every job. The deploy published production, and the smoke ran at the site address as intended, but 11 of 22 `@smoke` tests failed again. Netlify's free plan serves every production page with its "Powered by Netlify" badge: an HTML comment after the charset meta and `<script async src="/.netlify/scripts/hud?variant=public">` after `</html>`, added at serve time outside `dist/`. Our self-only CSP refuses the badge's inline script (in an `about:srcdoc` frame), so the badge never runs, but the guards counted it. Ruling: the site keeps its CSP and its zero-script pages unchanged. Only against a deployed site (BASE_URL set), the guards leave out exactly the badge frame's blocked inline script and report it as a test annotation, and the `/resume/` and 404 script checks leave out exactly that tag (R0 for R8). Locally and in ci nothing is left out. Removing the badge itself is a Netlify plan setting and Emeka's call (FUTURE_IMPROVEMENTS). The `v1.0.0` tag waits for a green deploy job on `main`.
- **v1.0.0 launched, M6 complete but for the tag (2026-11-16 01:08 UTC):** at Emeka's "go", PR 9 (F-063) merged as `34b80d2`. Its ci run 207 on `main` passed every job with `RELEASE=1`, and the deploy job published production and passed the production smoke, 22 of 22, at https://emeka-nduka-nwagbo.netlify.app (WP-33 A1 to A5, `review/reports/WP-33.json`). F-062 and F-063 are fixed. The `v1.0.0` tag (A6) could not be pushed from this session: the git proxy refuses every push but the integration branch (HTTP 403), and no GitHub tool here creates tags. Emeka creates it in GitHub's release form on `main` at `34b80d2`, and R0 verifies it with `git ls-remote`. M7 (WP-34 to WP-36) is next.
