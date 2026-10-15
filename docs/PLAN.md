# "Commit History": Emeka's 3D museum portfolio, master plan

## Context

Emeka wants his personal site rebuilt from scratch as an experience: a 3D modern-gallery aisle where each exhibit is one job, his current role (Nasdaq Verafin) comes first, and walking further down the aisle goes further into the past. He also needs his one-page resume updated with the new Nasdaq Verafin co-op. Today the repo holds only a small legacy page (`index.html`, `scripts.js`, `styles.css`, `headshot.jpg`). Its content is out of date (GPA, high school), and the script crashes on the deprecated `document.registerElement`. There is no build, no tests and no CI.

This plan was produced by a design panel: an experience designer, an engineering architect, a delivery lead and a resume editor, then reviewed by a technical-risk critic and a completeness critic. Their full write-ups are in `/tmp/claude-0/-home-user-My-Website/2ae53d14-d10a-5863-979a-1f315781f19b/scratchpad/` (`p_experience.md`, `p_engineering.md`, `p_delivery.md`, `p_resume.md`, `c_technical-risk.md`, `c_completeness.md`). Where they disagreed, this file decides. WP-00 commits the reconciled specs into `docs/` so fresh subagents can read them.

**Goal:** one typed content file drives everything: the 3D gallery, a fast classic resume page, SEO, a one-page PDF, and an Overleaf `.tex` file. Specialist subagents build it in gated milestones, test it automatically, and keep improving it through a scored review loop.

## Locked decisions

| Topic | Decision |
|---|---|
| Aesthetic | Modern gallery: dark reflective floor, warm spotlight pools, glass cases on plinths, brass accents, placards |
| Navigation | Scroll, swipe or arrow keys walk the camera on rails and stop at each exhibit. Clicking or pressing Enter opens the full story |
| Scope | Main aisle is work only, newest first: Verafin, Mysa, Wailo, CFIA. Optional side wings hold Projects and Volunteer/Leadership. The Education + Certifications room sits at the end of the main path |
| Hosting | Netlify, on a free `*.netlify.app` subdomain. The domain lives in one `SITE_URL` value |
| Resume fit | An agent trims the resume to one page and Emeka approves a before/after |
| Resume source | Both: the PDF is generated from the site content, and `resume/resume.tex` (Jake's template) is generated from the same content and compiled in CI |

**Defaults I'm assuming (change any of them at a gate):**
- No phone number on the website or in the public `/resume.pdf`. A private PDF with the phone is built locally for direct applications.
- Nasdaq Verafin uses the three "safe" bullets below, with location St. John's, NL. They are flagged `draft` until Emeka (and ideally his manager) clears them.
- GitHub link: `github.com/eme-k-a`.
- No analytics, no sound and no post-processing in v1. All three are in the backlog.

## 1. Resume update (first deliverable, M0)

**New entry, placed first under Experience:**
```
Software Development Co-op Student                      Sep 2026 – Dec 2026
Nasdaq Verafin                                           St. John's, NL
- Develop data platform features supporting fraud detection and anti-money laundering software.
- Build data reporting features that turn platform data into accurate, readable reports for end users.
- Develop data reporting plugins that extend reporting capabilities with modular, reusable components.
```
- Present tense while the role is current. Switch to past tense in January 2027 (the build enforces this).
- Placeholder versions that name technologies, scale and outcomes are kept in `docs/CONTENT_DRAFT.md`, ready for when Emeka can share more.

**Trims to stay on one page** (about +5 lines added, about -2 to -6 removed):
1. Tighten Mysa bullets 2 and 3. Mysa 3 also stops calling Cognito "database management".
2. Merge CFIA into one bullet.
3. Shorten Wailo bullet 3.
4. Shorten the Enactus bullet, replacing the dash with a colon.
5. Regroup skills into 4 lines that don't wrap.
6. Drop Personal Finance Tracker from the PDF only. It stays in the gallery's Projects wing.

**Style fixes:**
- "(Co-Op)" becomes "(Co-op)".
- "IT Support Technician - Intern" becomes "IT Support Technician (Intern)".
- "July 2024" becomes "Jul 2024".
- Ongoing roles use present tense ("Engineer", "Spearhead").
- Remove the trailing slash from the LinkedIn URL.
- Add the site URL to the header.

The exact final text is in `p_resume.md` section 4.

**Outputs:**
- `dist/resume.pdf`: public, no phone.
- `out/private/resume.pdf`: gitignored, with phone.
- `resume/resume.tex`: generated, Overleaf-ready.
- PNG previews of the before and after versions, for Emeka's approval.

## 2. Experience spec (summary; full spec goes in `docs/spec/EXPERIENCE.md`)

**Concept: the exhibition "Commit History".**
- Like `git log`, the newest work comes first.
- The light grows warmer as you walk back in time.
- Brass year strips are set into the floor (2026 to 2022).
- The end wall reads "You've reached the beginning."

**Space** (meters; the aisle runs along -Z):
- 12 m between exhibits, alternating sides, so the next spotlight is always visible ahead.
- The lobby has the name, role line, portrait (warm duotone) and a "Begin the walk" button.
- The walk ends at a front desk with Email, LinkedIn, "Take home the catalogue" (the PDF) and GitHub.

**Stops:**
- Main track: `lobby, verafin, projects-door, mysa, volunteer-door, wailo, cfia, mun, certifications, desk`.
- Wing tracks: projects is `klarup, finance-tracker`; volunteer is `safe-sip, sdsj`.
- A door stop offers "Step inside". Keep scrolling to skip the wing. Esc or Back returns to the door.
- Each wing's position comes from content (`wing.after`), so it can move once project dates are known.

**Exhibits** (each is one sculptural object built in code, with at most one slow motion, ≤20k triangles, using only the shared material library, and no company logos):

| Exhibit | Object |
|---|---|
| Verafin, "The Reporting Engine" | A frosted column feeding a bar-grid "report". Brass plugin cartridges dock into it |
| Mysa, "Warm Start" | A wall-unit slab with a ring dial whose release-pipeline segments warm up, and an SSO key passing through a ring |
| Wailo, "The Deep Link" | A tilted phone. A glowing link arcs into it and swaps the screen to a reset card |
| CFIA, "The Ticket Spindle" | A brass spindle stacking "RESOLVED" tickets |
| KlarUp | A checkbox staircase |
| Finance Tracker | Easing coin stacks |
| Safe Sip | A cut-away smart lid with a Pico board and an Euler-angle gizmo |
| SDSJ | A round table of laptops |
| MUN, "Work in Progress" | A silicon die inside a scaffold |
| Certifications | Three brass medallions |

**Placards and the story:**
- All readable text lives in DOM cards. 3D text is limited to large labels (exhibit number and organization).
- The story dialog contains: the role, organization, dates with a computed duration, "Medium" (tech tags), the resume bullets, a curator's note, and Newer/Older buttons.
- On desktop it opens as a side panel; on phones it is one full-height sheet.

**Recruiter fast path:**
- The prerendered hero shows the name, "Software Development Co-op, Nasdaq Verafin", "B.Eng Computer Engineering, MUN, expected May 2027", and three links: Resume PDF, Email, Classic view.
- These are visible in the first phone viewport, with or without JS.
- The museum code loads only after that.

**Art direction tokens:**
- Colors: ink `#0B0B0D`, wall `#141418`, text `#F2EDE4`, brass `#C9A36A`, placard `#EFEBE4`, signal `#7FD1C7`.
- Fonts: Instrument Serif and IBM Plex Sans, self-hosted from `@fontsource`.
- The gallery is always dark. `/resume/` follows the system theme and prints on white.

**Do not:**
- Free roam, head bob, or autoplaying audio.
- Particle swarms, glitch or typewriter effects.
- Transmission glass or real-time shadows.
- Invented metrics.
- Text that exists only inside WebGL.

## 3. Technical architecture (full detail goes in `docs/ARCHITECTURE.md`)

**Stack** (versions checked against the registry on 2026-10-14; npm with `npm ci`):
- vite 8.3.4, @vitejs/plugin-react 6.1.2
- react / react-dom ~19.3.1 (R3F requires `<19.4`)
- typescript ~6.0.3 (typescript-eslint requires `<6.1`)
- three ~0.186.1, @react-three/fiber 9.8.2, @react-three/drei 10.7.9
- zustand 5, maath (damping), wouter 3 (routing)
- zod 4: used at build and test time only, never shipped
- CSS Modules plus `tokens.css`
- Tests: vitest 5.0.4, **@playwright/test 1.56.1 exactly** (matches the preinstalled chromium-1194), @axe-core/playwright, @lhci/cli 0.15.1
- Tooling: eslint 10, prettier, tsx, pdf-lib, unpdf, sharp, subset-font
- Fonts: `@fontsource/instrument-serif`, `@fontsource/ibm-plex-sans`. unpkg is blocked here, so fonts must come from npm
- Lazy-loaded with `?debug` only: leva and r3f-perf
- **Not used:** postprocessing (it caps the three version), GLB/meshopt (v1 exhibits are code-only), detect-gpu (it fetches from a CDN)

**Repo layout:**
```
src/content/   schema.ts resume.ts format.ts selectors.ts   <- single source of truth
src/app/       boot.ts store.ts routes.ts testHooks.ts
src/overlay/   Hud, ScrollTrack (stop sections + cards), ExhibitDialog, Intro
src/classic/   ClassicResume (/resume/)      src/print/  ResumePrint (PDF)
src/museum/    MuseumCanvas, Scene, environment/, rail/, quality/, materials/,
               exhibits/_kit/ (ExhibitFrame, Plinth, GlassCase, Placard, Placeholder),
               exhibits/<id>/ (one folder per exhibit, discovered by import.meta.glob)
src/design/    tokens.css tokens.ts          src/seo/  jsonLd.ts meta.ts
scripts/       postbuild, build-resume-pdf, build-resume-tex, gen-og, check-budgets,
               check-copy, optimize-assets, new-exhibit, serve-dist (applies _headers)
resume/        resume.tex (generated), template
tests/e2e, tests/pdf    perf/budgets.json    review/    docs/    CLAUDE.md
```

**Content model:**
- zod schema from `p_engineering.md` section 3, with these changes: short ids; `draft` flags on bullets and story blocks; `print` and `priority` flags on bullets; `curatorNote`; `wing.after`; `contact.phoneInPublicPdf=false`.
- Dates are `YYYY-MM`. One shared `formatRange()` and `duration()` serve the web pages, the PDF, the `.tex` file and JSON-LD.
- `current` is derived from the build date. It is never stored.

**Input model (native scroll, never hijacked):**
- Each stop is a `<section data-stop>` with `min-height:100svh`.
- `scroll-snap-type: y mandatory` on touch and `proximity` on fine pointers, with `scroll-snap-stop: always` on every section.
- Camera progress is a piecewise map from `scrollY` to measured section offsets, damped with maath.
- There are no wheel or touch listeners. Only Enter and Esc are custom keys.
- The canvas is `position:fixed`, and `eventSource` is the app root.

**Routes:**
- `/`: the gallery.
- `/exhibit/<id>/`: prerendered, with its own OG tags and the story text. It opens the dialog.
- `/resume/`: classic page, zero WebGL.
- `/resume.pdf` and a `404.html`.
- Opening a story pushes one history entry, so Back closes it. Newer and Older use `replaceState`. Stop arrivals never write the URL.

**Rendering:**
- Light pools are baked into a CanvasTexture lightmap. Real spotlights: 3 on high, 1 on medium and low. No shadow maps; contact shadows are rendered once.
- Floor: `MeshReflectorMaterial` on high only, an environment-mapped floor otherwise. Glass is faked with no transmission. The environment is built from Lightformers.
- Quality tier is chosen once at boot from `pointer:coarse`, `hardwareConcurrency`, `saveData` and the renderer string. Software renderers go to `/resume/`. At runtime only the DPR adapts.
- Exhibits mount 2 stops ahead after `gl.compileAsync`, and unmount beyond 4.
- `frameloop="demand"` once the scene settles. Idle motion stops 15 s after the last input.

**Budgets** (in `perf/budgets.json`, enforced in CI):

| Item | Limit |
|---|---|
| Entry JS | ≤110 KB gzip |
| Museum chunk | ≤350 KB gzip |
| Each exhibit chunk | ≤40 KB gzip |
| Transfer to see the first 3 exhibits | ≤1.2 MB |
| Full walk | ≤4 MB |
| Draw calls | ≤150 high, ≤80 medium/low |
| Triangles | ≤500k desktop, ≤150k mobile |
| LCP (the h1) | ≤2.0 s desktop, ≤2.5 s mobile |
| CLS | ≤0.02 |
| Mobile frame rate | ≥30 fps floor |

**Robustness:**
- A `<head>` boot script sets `data-mode` before first paint. Its CSP hash is written into `_headers` at postbuild.
- On WebGL context loss: remount the canvas; fall back to classic after 2 losses. Also handle `pageshow` (back/forward cache).
- `prefers-reduced-motion`: a 200 ms fade between stops and no idle motion.
- Use `100lvh` for the stage, ignore small resizes on touch devices, respect safe areas, and pause on `visibilitychange`.

**SEO:**
- Prerendered hero and section cards, per-exhibit pages, and per-exhibit OG images (rendered by Playwright).
- JSON-LD Person, sitemap, robots, favicon set, `lang="en-CA"`.

**Security:**
- CSP is `self`-only (plus `blob:` workers). Fonts are self-hosted, and troika's fallback font URL points to a self-hosted path.
- `immutable` caching on `/assets/*` only; HTML and the PDF revalidate.

**Tests:**
- Vitest: schema, ordering, no em dashes, date math, rail math, routes, registry.
- Playwright on SwiftShader (`--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`). Projects: desktop 1440x900, Pixel 7, Pixel 7 landscape, no-WebGL.
- Tests run against `serve-dist`, which applies `_headers` so the CSP is exercised.
- The `?test=1` hook exposes `window.__MUSEUM__ {ready, settled, stop, goTo, screenPos, stats}`, with a frozen clock and seeded noise.
- Visual baselines: one per stop at desktop and Pixel 7, `maxDiffPixelRatio 0.02`. They are generated and compared in CI only.
- axe on all DOM states.
- lhci runs with the SwiftShader flags and `?test=1&mode=museum`. Accessibility and SEO are hard gates; performance is a warning on `/` and a hard gate on `/resume/`.

**CI/CD (GitHub Actions):**
- `ci.yml`: verify (lint, typecheck, unit), build (includes the PDF gate and budgets), e2e, lighthouse, latex (compile `resume.tex` and assert one page).
- `deploy.yml`: Netlify through netlify-cli, with a preview alias per branch or PR and `--prod` on `main`.
- `scheduled.yml` (weekly): rebuild so `current` and tense flags update, smoke-test production, check links, and check the production PDF is one page.
- Dependabot groups `three`, `@react-three/*` and `react*`.

## 4. Specialist agent roster

Each role owns exclusive paths and may only read everything else. Unit tests sit next to the source and belong to the folder's owner. Every commit carries a `WP: WP-xx` trailer, and the merge script checks each diff against that WP's allowed globs.

| Role | Mission | Owns |
|---|---|---|
| R0 Orchestrator (main session) | Writes briefs, runs a milestone workflow, merges, talks to Emeka | `docs/PLAN.md`, `docs/wp/**`, `CLAUDE.md`, `OWNERS.json` |
| R1 Content & Resume Editor | Content file, resume PDF and `.tex`, media, update runbook | `src/content/**`, `src/print/**`, `resume/**`, `scripts/build-resume-*`, `docs/CONTENT_*.md` |
| R2 Art Director | Art direction, tokens, material library, scoring rubric, concept checklists | `src/design/**`, `src/museum/materials/**`, `docs/ART_DIRECTION.md`, `review/concepts/**` |
| R3 Environment Builder | Hall, lobby, desk, wing rooms, lighting, floor, exhibit kit | `src/museum/environment/**`, `src/museum/exhibits/_kit/**` |
| R4 Camera & Interaction Engineer | Layout, rail, scroll track, wing tracks, routes, test hook | `src/museum/rail/**`, `src/app/routes.ts`, `src/app/testHooks.ts`, `src/overlay/ScrollTrack*` |
| R5 Exhibit Builders A to D | One folder per exhibit | `src/museum/exhibits/<id>/**` |
| R6 UI & Classic Engineer | Boot script, HUD, dialog, intro, `/resume/`, 404, no-WebGL fallback | `index.html`, `src/app/boot.ts`, `src/app/store.ts`, `src/overlay/**` (except ScrollTrack), `src/classic/**` |
| R7 Performance Engineer | Tiers, budgets, assets, fonts subsetting | `src/museum/quality/**`, `perf/**`, `scripts/check-budgets*`, `scripts/optimize-assets*` |
| R8 QA & Test Automation | Playwright, visual, PDF tests, review capture runner | `tests/**`, `playwright.config.ts`, `scripts/review/**` |
| R9 Accessibility & SEO | Semantics audit, meta, JSON-LD, prerender, OG, sitemap, icons | `src/seo/**`, `scripts/postbuild*`, `scripts/gen-og*`, `public/og/**`, `public/robots.txt`, icons |
| R10 DevOps & Release | Toolchain, dependencies, CI, Netlify, headers, legacy cleanup | `package.json`, lockfile, configs, `.github/**`, `netlify.toml`, `scripts/serve-dist*`, `scripts/check-copy*` |
| R11 Experience Reviewer | Scores screenshots against the rubric and files findings. Never edits code | `review/**` (except concepts) |

## 5. Milestones and work packages

Size: S is under half a day of agent work, M is 1 to 2, L is 3 or more. Every WP brief (`docs/wp/WP-xx.md`) states: goal, inputs (doc anchors), owned globs, forbidden paths, commands, acceptance commands, and output (a `report.json` with changed files, test results, open questions and dependency requests).

### M0: Spec, contracts, resume (starts immediately)
- **WP-00 Commit the reconciled spec** (R0, S)
  - [ ] Write `docs/spec/EXPERIENCE.md`, `docs/ARCHITECTURE.md`, `docs/PLAN.md` and `docs/CONTENT_DRAFT.md` from the scratchpad proposals, with this plan's rulings applied.
  - [ ] Write every WP brief, plus `CLAUDE.md` (stack pins, commands, the no-em-dash rule, ownership, `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, never run `playwright install` locally).
  - Accept: `grep -rE 'pnpm|__SCENE__|(^|[^c])/c[l]assic|src/scene/|#/exhibit' docs CLAUDE.md` finds nothing outside docs/PLAN.md; there is one brief per WP; no U+2014 anywhere.
- **WP-01 Scaffold** (R10, S; after WP-00)
  - [ ] Vite + React + TS at the repo root with every pin from section 3.
  - [ ] ESLint, Prettier, Vitest; all npm scripts (`dev build preview verify test e2e visual a11y lh review resume resume:private new:exhibit check:copy check:budgets`).
  - [ ] Tag the `main` tip `legacy-site`. Delete `index.html` (the legacy one), `scripts.js`, `styles.css` and `.DS_Store`. Move `headshot.jpg` to `assets-src/`.
  - [ ] Add `.gitignore`, a README skeleton, and LICENSE (code MIT; content and headshot all rights reserved).
  - Accept: `npm ci && npm run verify && npm run build` exits 0; no legacy files are tracked; the Playwright check prints revision 1194.
- **WP-02 Freeze contracts** (R0 with R4, M; after WP-01)
  - [ ] Content schema and types.
  - [ ] `layout.ts`, encoding the Experience coordinates, with a snapshot test.
  - [ ] Exhibit manifest and props types; the glob registry; token names; the `__MUSEUM__` test hook type; test IDs; the route table.
  - Accept: `npm run verify` passes; the snapshot pins 10 main stops and 2 wing tracks; tag `contracts-v1`.
- **WP-03 Content file** (R1, M; after WP-02)
  - [ ] `src/content/resume.ts`: resume text from the panel's section 4, museum copy from its section 5, Verafin bullets flagged `draft`, and all first-person copy flagged `draft`.
  - [ ] Headshot: 4:5 crop, 400/800 px in AVIF, WebP and JPEG, plus a 512 px texture, with EXIF stripped.
  - Accept: content tests pass (newest-first order, unique ids, wings resolve, no em dashes, durations correct, e.g. Sep to Dec 2026 is 4 months); `headshot-800.webp` ≤60 KB.
- **WP-04 Resume outputs** (R1, M; after WP-03)
  - [ ] Jake's-style print template (Letter, 0.5 in margins; no ligatures; uppercase letter-spaced headings) rendered to PDF with Playwright.
  - [ ] Overflow gate that fails the build and names the lines to trim (no automatic dropping).
  - [ ] Public and private PDFs; pdf-lib metadata.
  - [ ] `scripts/build-resume-tex.ts` generates `resume/resume.tex` (en dashes as `--`).
  - [ ] Before/after PNGs and `docs/RESUME_CHANGES.md`.
  - Accept:
    - PDF is exactly 1 page.
    - Every printed bullet appears verbatim in the extracted text, in the order Verafin, Mysa, Wailo, CFIA.
    - No phone-number pattern in `dist/`.
    - Every work entry has at least 1 printed bullet.
- **WP-05 Art direction** (R2, M; parallel with WP-03)
  - [ ] `docs/ART_DIRECTION.md`: tokens, lighting recipe, material library spec, a 6-dimension 1-to-5 rubric (adding "reads as one object in a 320 px grayscale thumbnail"), and a concept checklist for each exhibit.
  - Accept: a unit test confirms text contrast is at least 4.5:1.
- **Gate G0 (Emeka):** approve the resume before/after PDF, the Verafin bullets and the title-style changes. Then a CI job checks that `resume.tex` compiles to one page.

### M1: Foundation (WP-06 to WP-10 in parallel)
- **WP-06 CI** (R10, M): `ci.yml` with all jobs; `serve-dist` that applies `_headers`; `check-copy` (fails on U+2014 always, and on `draft` or `[placeholder` when `RELEASE=1`); `check-budgets`; Dependabot. Accept: a green run on the branch.
- **WP-07 Test harness** (R8, M): config with 4 projects and SwiftShader flags; `waitForMuseum`, `goToStop` and `shot` helpers; failure on console errors, CSP violations or cross-origin requests. Accept: the smoke spec passes locally on preinstalled Chromium.
- **WP-08 Greybox + kit** (R3, M): hall built from `layout.ts`, instanced plinths and cases, `ExhibitFrame` (Suspense, error boundary, distance mounting, hit box), placeholders at every stop. Accept: all stops render; `stats().calls` ≤80.
- **WP-09 Scroll track + rail** (R4, M): sections, damped camera, wing enter and exit, Enter and Esc keys, the test hook.
  - A 40-event decaying wheel stream and three 100 px notches each settle on a whole stop with none skipped.
  - A Pixel 7 flick moves exactly one stop.
  - There are no non-passive wheel or touchmove listeners.
  - Esc in a wing returns to its door.
- **WP-10 App shell** (R6, M): boot mode script, HUD with progress rail and Classic and PDF buttons, dialog skeleton, `/resume/` page, no-WebGL fallback, 404, `<noscript>`. Accept: with WebGL disabled the classic content shows; entry JS ≤110 KB gzip.
- **Gate G1:** CI green; smoke tests pass on desktop and Pixel 7.

### M2: Vertical slice (lobby, aisle, Verafin, one wing exhibit, all flows)
- **WP-11 Environment v1** (R3, L): baked pools, floor by tier, spotlights, lobby with portrait and prerendered hero, desk, year strips; the Art Director picks ACES or AgX from side-by-side shots and the choice is frozen as a token. Accept: per-stop budgets pass; screenshots exist for every stop and viewport.
- **WP-12 Verafin exhibit** (Builder A, M): Accept: within the 0.65 m case; ≤20k triangles; chunk ≤40 KB gzip; the R2 concept checklist passes; clicking `screenPos('verafin')` opens the dialog.
- **WP-13 Safe Sip exhibit** (Builder D, M): the same criteria, to calibrate style across builders.
- **WP-14 Dialog, routes, prerender** (R6 + R9, M):
  - [ ] Native `<dialog>`, desktop side panel and mobile sheet, Newer and Older.
  - [ ] `/exhibit/<id>/` prerendered pages with unique OG tags.
  - [ ] History rules from section 3.
  - Accept: a cold load of `/exhibit/verafin/` then close lands on `/` on the same origin; Open, Next x3, then Back closes the dialog; axe reports 0 violations.
- **WP-15 Camera feel** (R4, M): gaze turns toward each case; reduced-motion fade with no in-between camera positions; onboarding hint; aria-live announcements only for keyboard and HUD moves.
- **WP-16 Quality tiers** (R7, M): boot-time tier, `compileAsync` before reveal, demand frameloop, context-loss remount, bfcache handling. Accept: shader program count is stable 0.5 to 3 s after arrival; frames stop 16 s after the last input; a forced context loss recovers.
- **WP-17 Slice tests** (R8, M): every flow above plus visual baselines for the slice stops. Accept: 3 consecutive CI runs green with `retries: 0`.
- **WP-18 Preview deploy** (R10, S): create the Netlify site through the connector; `deploy.yml` with a branch alias. Accept: the preview URL boots in `data-mode="museum"` with no CSP violations.
- **WP-19 Slice review** (R11, S): rubric scorecard plus findings.
- **Gate G2:** all slice tests green; review average ≥3.5; no open P0 or P1; **Emeka approves the slice screenshots and preview link.** This gate calibrates taste before the fan-out.

### M3: Fan-out (WP-20 to WP-25 in parallel, in isolated worktrees)
- **WP-20 Builder A:** Mysa, Wailo.
- **WP-21 Builder B:** CFIA, MUN, Certifications.
- **WP-22 Builder C:** KlarUp, Finance Tracker.
- **WP-23 Builder D:** SDSJ.
- WP-20 to WP-23 use the WP-12 acceptance criteria for each exhibit.
- **WP-24 Wing rooms and doors** (R3, M): room geometry and door signage. Accept: every rail sample stays at least 0.4 m from walls.
- **WP-25 Test expansion** (R8, M): baselines for every stop at desktop and Pixel 7, plus a dialog for every exhibit. Accept: no placeholders remain; the suite runs in under 10 minutes.
- **Gate G3:** all merged and green; review average ≥3.5; no open P0 or P1.

### M4: Polish (parallel)
- **WP-26 Lighting and atmosphere** (R3 + R2): per-stop light recipe, light warming with age, CSS vignette.
- **WP-27 Mobile and onboarding** (R6): placard cards and the HUD never intersect on Pixel 7; thumb-reach controls; safe areas.
- **WP-28 Asset pass** (R7): font subsetting (woff2 for the DOM, woff for troika); glyph-coverage check; preload hints; `public/credits.html` plus `LICENSES/`. Accept: first 3 exhibits ≤1.2 MB; full walk ≤4 MB.
- **Gate G4:** review average ≥4.0 with no dimension below 3.5; Emeka signs off on 10 screenshots.

### M5: Hardening (parallel)
- **WP-29 Performance** (R7): all budgets enforced in CI per stop.
- **WP-30 Accessibility** (R9): keyboard-only spec reaches every story in aisle order; axe 0 violations everywhere; Lighthouse accessibility ≥0.95.
- **WP-31 SEO and sharing** (R9): JSON-LD Person, sitemap, robots, favicon and apple-touch icon, OG image per exhibit. Accept: Lighthouse SEO ≥0.95; every exhibit page shows its story with JS off.
- **WP-32 Cross-browser and resilience** (R8): Firefox and WebKit run the DOM, classic and no-WebGL specs in CI; 20 loops through all stops with 0 page errors; Emeka's 10-step checklist on his phone.
- **Gate G5:** `RELEASE=1 npm run check:copy` passes (no drafts or placeholders); **Emeka approves all first-person copy**; every threshold green.

### M6: Launch
- **WP-33 Release** (R10, S): production deploy; smoke test against production; production `/resume.pdf` is 1 page; tag `v1.0.0`. A PR from the integration branch to `main` is opened when Emeka asks for it.

### M7: Continuous improvement
- **WP-34 Review automation** (R8 + R11, M): `npm run review` captures every stop, every dialog and 4 viewports, plus `stats()`, axe and lhci, and writes a scorecard to `review/runs/<date>/`.
- **WP-35 Content runbook** (R1, S): `docs/CONTENT_UPDATE.md` plus `npm run new:exhibit <id>` (placeholder exhibit on day one), with a practice run that adds a fake job on a scratch branch and keeps all tests green.
- **WP-36 Scheduled maintenance** (R10, S): `scheduled.yml` (weekly), plus a dated checklist:
  - Jan 2027: Verafin to past tense.
  - May 2027: degree completed.
  - The @mun.ca email may lapse.

## 6. Continuous improvement loop
1. **Capture:** `npm run review` on a deterministic build: screenshots at every stop and dialog on 4 viewports, plus perf stats, axe and Lighthouse.
2. **Score:** R11 rates each stop 1 to 5 on six dimensions, citing screenshots and comparing with the previous round and the approved G2 and G4 reference stills. It also records pass/fail for each acceptance criterion.
3. **File findings:** each goes in `review/findings.json` with a severity (P0 broken, P1 visibly wrong or over budget, P2 polish, P3 idea). Each finding gets a brief, `docs/wp/F-###.md`, scoped to the owner globs of the affected path.
4. **Fix:** at most one fixer per owner area, 5 at once. Each fix is a `fix(F-###)` commit plus a test or a justified rebaseline. R11 re-verifies in the next round.
5. **Stop** after 2 consecutive rounds with no new P0 or P1, at most 2 new P2, averages ≥4.0 and every gate green. Cap: 3 rounds per milestone. Leftovers go to Emeka's backlog. A finding reopened twice is a taste call for Emeka.
6. **After launch:** one round for every content change, plus a monthly round.
7. **Backlog candidates:** ambient sound, a cookieless analytics counter, a custom domain, GLB models (only with `CREDITS.json` and a CC0/OFL license test).

## 7. How I will run it
- I act as R0. For each milestone I run one workflow:
  - The WP agents are spawned from their briefs. Parallel WPs run in isolated git worktrees, each with its own Playwright port, `4173+N`.
  - Each WP is followed by an independent verifier agent. It runs the acceptance commands and adversarially reviews the diff.
  - I merge sequentially onto `claude/intelligent-sagan-poq45q`. Before a merge: verify plus smoke e2e. After the merge: the full suite. A merge that turns the suite red is reverted.
- Then I push and report gate results to Emeka.
- Workflows stay around 6 to 10 agents each.
- Commits are small and conventional, with the `WP:` trailer, and contain no em dashes.

## 8. What I need from Emeka (none of it blocks M0 to M1)
- **G0:** approve the resume before/after, the Verafin bullets and the style changes.
- **Before WP-18:** create a Netlify personal access token and add it as the `NETLIFY_AUTH_TOKEN` GitHub repo secret. I create the site and its `NETLIFY_SITE_ID` through the Netlify connector. Turn off Netlify Git builds.
- **G2 and G4:** visual sign-off. **G5:** copy approval, plus the phone checklist.
- **A batch of facts** (defaults apply if skipped):
  - Verafin: on-site, hybrid or remote, and which technologies he can name publicly.
  - KlarUp and Finance Tracker: his role and dates.
  - Certification dates and the Tech Stewardship issuer.
  - MUN start date.
  - Whether both volunteer roles are still active.
  - Whether the Mysa app used a database alongside Cognito.
  - What kind of role he is targeting (for the exit call to action).
  - Confirm `eme-k-a` is his GitHub handle.

## 9. Verification (end to end)
- `npm ci && npm run verify`: lint, typecheck, unit tests (content, dates, rail, routes, registry).
- `npm run build`: client and SSR build, prerender, the one-page PDF gate, `.tex` generation, budgets, `check-copy`.
- `npm run e2e && npm run visual && npm run a11y`: Playwright 1.56.1 on preinstalled Chromium with SwiftShader, served with production headers.
- `npx lhci autorun`: museum mode is forced and the hard gates apply.
- CI: all of the above plus the LaTeX compile and one-page check on `resume.tex`.
- Manual:
  - Open the Netlify preview on desktop and on Emeka's phone.
  - Walk the whole aisle with a trackpad, mouse wheel, arrow keys and swipe.
  - Open and close a story with Esc and with Back.
  - Share an `/exhibit/<id>/` link and check its preview card.
  - Download `/resume.pdf` and confirm it is one page.

## Addendum: rulings made at kickoff (2026-10-15)
- **Phone number is never committed.** `contact.phone` is read at build time from `RESUME_PHONE` (environment or a gitignored `.env.local`) and used only by `npm run resume:private`. The repo, the site and `dist/` never contain it.
- **Door stops** sit at the z midpoint between the two main exhibits on either side. Each wing room, its plinths and its camera stops are positioned relative to its door, so `wing.after` can move a wing without hand-editing coordinates.
- **Fixed section outlines**, so WP briefs can cite section numbers:
  - `docs/spec/EXPERIENCE.md`:
    1. Concept
    2. Spatial layout and coordinates
    3. Stops and tracks
    4. Exhibit concepts
    5. Exhibit anatomy
    6. Motion and camera choreography
    7. Art direction
    8. Onboarding, recruiter fast path and microcopy
    9. Mobile
    10. Accessibility and reduced motion
    11. Delights and do-nots
    12. Backlog
  - `docs/ARCHITECTURE.md`:
    1. Stack and pinned versions
    2. Repository layout and ownership
    3. Content model
    4. Resume outputs
    5. App shell, boot and routes
    6. Scroll track and camera rail
    7. Scene architecture and exhibit plugin interface
    8. Rendering, lighting and quality tiers
    9. Performance budgets
    10. Robustness and fallbacks
    11. SEO and sharing
    12. Security headers and CSP
    13. Testing strategy
    14. CI/CD and deploy
    15. Developer ergonomics
- **M0 exception:** WP-03 and WP-04 may add entries to the `scripts` field of `package.json`. R10 owns the rest of that file.
- **Agent commits** use a conventional message and end with the trailer `WP: WP-xx`, followed by the session attribution lines.
- **R0 rulings after the WP-00 review (2026-10-15):**
  - **Keyboard stepping.** WP-09 adds one keydown handler for ArrowUp, ArrowDown, PageUp, PageDown, Space, Home and End. It calls `scrollIntoView` on the neighbouring section and is ignored while focus is in a form field or the dialog is open. Scrolling stays native; wheel and touch listeners are still banned.
  - **Draft flag for whole exhibits.** The exhibit presentation gets `exhibit.draft: boolean` (default false). It covers the title, caption, tags and object text. `RELEASE=1 npm run check:copy` fails while any exhibit has `draft: true`. Verafin starts as `draft: true`.
  - **Reconciler rulings 18 to 23 are accepted**, as recorded in `docs/wp/WP-00.md`. So is the `package.json` script-key extension for WP-06, WP-07 and WP-28.
