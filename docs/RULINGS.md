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
