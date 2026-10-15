# Architecture: "Commit History" gallery site

Status: reconciled spec for WP-00, frozen at tag `contracts-v1` (WP-02). Owner: R0.

Authority order when documents disagree (the same order as `docs/wp/_TEMPLATE.md`): `docs/PLAN.md` (including its Addendum) wins; then a work-package brief's own "Ruling:" lines inside that brief's scope; then this file for implementation (APIs, file names, schema fields, commands); then `docs/spec/EXPERIENCE.md` for what the visitor sees, hears and does (coordinates, motion, copy, art direction); then the scratchpad proposals. The R0 rulings listed in `docs/wp/WP-00.md` (Notes) are already applied to this file and to EXPERIENCE. Section numbers in this file are fixed so work-package briefs (`docs/wp/WP-xx.md`) can cite them as `ARCHITECTURE §n`.

Notation: paths are relative to the repo root `/home/user/My-Website`. "Rn" is a role from `docs/PLAN.md` §4. Units in 3D are meters, +Y up, the aisle runs toward -Z.

---

## 1. Stack and pinned versions

Package manager: **npm only**, with `package-lock.json` committed and `npm ci` everywhere (local, CI, scheduled jobs). No other package manager, no corepack. `.npmrc` contains `save-exact=true` and `engine-strict=true`. `package.json` has `"type": "module"` and `"engines": { "node": ">=22.13.0" }`. `.nvmrc` contains `22.22.0`.

Versions were checked against the npm registry on 2026-10-14 and re-checked on 2026-10-15 with read-only `npm view`.

### 1.1 Runtime dependencies (`dependencies`, shipped to browsers)

| Package | Spec in package.json | Why this version / notes |
|---|---|---|
| react, react-dom | `~19.3.1` | `@react-three/fiber@9.8.2` peers on `react >=19 <19.4` and `react-dom >=19 <19.4` |
| three | `~0.186.1` | Latest. Nothing caps it now that postprocessing is not used; still moves only together with `@types/three` and `@react-three/*` |
| @react-three/fiber | `9.8.2` | Peers: react <19.4, three >=0.156 |
| @react-three/drei | `10.7.9` | MeshReflectorMaterial, Text, Environment, Lightformer, Instances, PerformanceMonitor, ContactShadows, RoundedBox. Depends on `maath ^0.10.8`, `troika-three-text ^0.52.4` |
| troika-three-text | `0.52.5` | Declared explicitly only so the kit can call `configureTextBuilder({ unicodeFontsURL })`. Must dedupe with drei's copy: `npm ls troika-three-text` shows exactly one version |
| zustand | `5.0.15` | App store. Also an R3F dependency (`^5.0.3`), so it dedupes |
| maath | `0.10.8` | `easing.damp`, `easing.dampLookAt`. Same version drei uses, so zero extra bytes |
| wouter | `3.13.0` | Path routing (browser location, not hash), about 2 KB |
| @fontsource/instrument-serif | `5.3.0` | OFL-1.1. Ships `files/instrument-serif-latin-400-normal.woff2` (DOM) and `.woff` (troika) |
| @fontsource/ibm-plex-sans | `5.3.0` | OFL-1.1. Weights 400 and 500, latin subset, woff2 and woff |
| leva | `0.10.1` | Lazy `?debug` chunk only. Never in the entry or museum chunk |
| r3f-perf | `7.2.3` | Lazy `?debug` chunk only |

### 1.2 Build and test dependencies (`devDependencies`)

| Package | Spec | Why / notes |
|---|---|---|
| vite | `8.3.4` | Client build, SSR build for prerendering, `import.meta.glob` registry, manifest for budgets |
| @vitejs/plugin-react | `6.1.2` | Peers on `vite ^8`; its other peers are optional and not installed |
| typescript | `~6.0.3` | `typescript-eslint@8.71.2` peers on `typescript >=4.8.4 <6.1.0`. TypeScript 7.0.2 (`latest`) is blocked until that range moves |
| @types/react, @types/react-dom | `19.3.0` | |
| @types/three | `0.186.0` | Moves with three |
| @types/node | `22.20.5` | Matches the Node 22 runtime |
| zod | `4.6.7` | Build and test time only. Client code may only `import type` from `src/content/schema.ts` (lint-enforced, see §7.5) |
| vitest | `5.0.4` | Needs Node `^22.12.0`; the container has 22.22.0 |
| @playwright/test | `1.56.1` **exactly** | Maps to the preinstalled Chromium revision 1194 (Chromium 141.0.7390.37). See §1.4 |
| @axe-core/playwright | `4.13.0` | Peer `playwright-core >=1.0.0` |
| @lhci/cli | `0.15.1` | Hard-pins `lighthouse@12.6.1` internally. Do not add a standalone `lighthouse` dependency |
| eslint | `10.12.0` | Flat config `eslint.config.js` |
| @eslint/js | `10.0.1` | |
| typescript-eslint | `8.71.2` | Peers: `eslint ^8.57 || ^9 || ^10`, `typescript <6.1.0` |
| eslint-plugin-react-hooks | `7.1.1` | Supports eslint 10 |
| globals | `17.13.0` | Browser and node globals for the flat config |
| prettier | `3.9.10` | |
| tsx | `4.23.15` | Runs every `scripts/*.ts` |
| sharp | `0.35.5` | Headshot crops and formats (strips EXIF by default; never call `withMetadata`) |
| pdf-lib | `1.17.1` | PDF metadata and page-count checks |
| unpdf | `1.8.1` | PDF text extraction in tests. Its optional peer `@napi-rs/canvas` is not installed and not needed |
| subset-font | `2.9.0` | Font subsetting in WP-28 (fontTools is not installed in the container) |
| fontkit | `2.0.4` | Glyph-coverage check for 3D text (`font.hasGlyphForCodePoint`). Added by this document; MIT |
| computer-modern | `0.1.3` | CMU Serif for the print template only. The package ships `OFL.txt`; its package.json says MIT for the CSS. R1 confirms the OFL text and copies it to `LICENSES/OFL-CMU-Serif.txt`. Fallback if the license cannot be confirmed: `@fontsource/source-serif-4@5.3.1` (OFL-1.1) |
| @fontsource/source-serif-4 | `5.3.1` | The print-font fallback. WP-01 installs both print fonts so WP-04 never waits for a lockfile change; WP-06 uninstalls whichever one WP-04 did not use |

### 1.3 CI-only tools (not in package.json)

| Tool | Version | Use |
|---|---|---|
| netlify-cli | `27.12.1`, run as `npx --yes netlify-cli@27.12.1` | Deploys only. Not a devDependency, so `npm ci` stays fast. **27.x builds by default, so every deploy passes `--no-build`.** `--alias` is limited to 37 characters |
| xu-cheng/latex-action | `@v3` | Compiles `resume/resume.tex` in the `latex` job |
| poppler-utils (`pdfinfo`) | apt, ubuntu-24.04 | One-page assertions. Already present locally at `/usr/bin/pdfinfo` |
| Chromium for CI | installed by `npx playwright install --with-deps chromium` | Same revision 1194 because `@playwright/test` is 1.56.1 |

### 1.4 Playwright and Chromium in this container

- The image ships Chromium revision 1194 at `/opt/pw-browsers` (`chromium-1194`, `chromium_headless_shell-1194`, and the symlink `/opt/pw-browsers/chromium` -> `chromium-1194/chrome-linux/chrome`). Environment: `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`.
- **Never run `npx playwright install` locally.** Never bump `@playwright/test` without a new container image. CI installs its own browsers.
- Confirm the revision after `npm ci` (note: `playwright-core` does not export `browsers.json`, so resolve the file by path):

```sh
node -p "const p=require('path');const d=p.dirname(require.resolve('playwright-core/package.json'));require(p.join(d,'browsers.json')).browsers.filter(b=>['chromium','chromium-headless-shell'].includes(b.name)).map(b=>b.name+':'+b.revision).join(',')"
# must print: chromium:1194,chromium-headless-shell:1194
npx playwright --version          # Version 1.56.1
node -e "require('@playwright/test').chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']}).then(async b=>{console.log(b.version());await b.close()})"
# must print: 141.0.7390.37
```

- In this container, WebGL under those flags reports the renderer `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) ...), SwiftShader driver)`. The boot script treats SwiftShader as a software renderer (§5.3), so every test and Lighthouse URL adds `?test=1`.
- Firefox and WebKit are not installed locally. Cross-browser DOM specs run in CI only (§13.9).

### 1.5 Explicitly not used

| Not used | Why |
|---|---|
| Any package manager other than npm | One lockfile, `npm ci` strict peer resolution |
| postprocessing, @react-three/postprocessing | Capped three at `<0.187`, extra render passes, about 60 KB. The vignette is a CSS gradient (§8.6) |
| GLB, gltf-transform, meshopt, Draco, KTX2 | v1 exhibits are code-only. Meshopt would need `'wasm-unsafe-eval'` in the CSP; Draco fetches decoders from a CDN |
| detect-gpu | Fetches benchmark data from a CDN, which the CSP blocks. Tiers use a local heuristic (§8.4) |
| Standalone `lighthouse` | `@lhci/cli` bundles lighthouse 12.6.1 and never uses a separate copy |
| Audio of any kind (howler, Web Audio) | No sound in v1 (PLAN). Backlog |
| GSAP, framer-motion, react-spring | maath damping covers all camera and object motion |
| drei `ScrollControls`, any wheel or touch handler | Input is native page scroll (§6). Scroll is never hijacked |
| drei `<Html>` for placards | All readable text is DOM outside the canvas |
| Google Fonts, unpkg, jsDelivr | unpkg is blocked by this container's proxy, and the CSP is self-only. Fonts come from `@fontsource` npm packages |
| jsdom, happy-dom, Testing Library | No DOM unit tests in v1. DOM behavior is covered by Playwright |
| TypeScript 7 | Blocked by the typescript-eslint peer range |
| Renovate | Dependabot only (§14.5) |
| Analytics, cookies, service worker, PWA manifest | Not in v1 |
| Hash routes | Real prerendered paths only (§5.6) |

---

## 2. Repository layout and ownership

### 2.1 Directory tree

Owner role in the right column. A file not listed under any glob belongs to R0 until a brief assigns it.

```
My-Website/
  .github/
    workflows/ci.yml  deploy.yml  scheduled.yml              R10
    dependabot.yml                                           R10
  .gitignore .nvmrc .npmrc .editorconfig .prettierrc.json .prettierignore   R10
  CLAUDE.md  OWNERS.json                                     R0
  README.md  LICENSE                                         R10 (LICENSE: code MIT; content and headshot all rights reserved)
  index.html            gallery page template: boot marker, ssr markers, #app      R6
  package.json package-lock.json                             R10 (M0 exception: WP-03/WP-04 may add "scripts" entries)
  vite.config.ts vitest.config.ts eslint.config.js           R10
  tsconfig.json tsconfig.app.json tsconfig.node.json         R10
  lighthouserc.cjs lighthouserc.desktop.cjs netlify.toml     R10
  playwright.config.ts                                       R8
  assets-src/
    headshot.jpg        original, never shipped (moved here in WP-01)          R1
  public/
    images/             headshot-{400,800}.{avif,webp,jpg}, headshot-texture-512.webp   R1
    og/                 <id>.png, home.png, resume.png, manifest.json           R9
    favicon.svg favicon-32.png apple-touch-icon.png                             R9
    fonts/              subset fonts (WP-28), unicode-fallback/.gitkeep         R7
    credits.html                                                                R7
  LICENSES/             OFL texts, MIT notices                                  R7
  resume/
    resume.tex          GENERATED, committed, Overleaf-ready                    R1
    template/           preamble.tex, LICENSE (Jake's Resume, MIT)              R1
  src/
    main.tsx            client entry: mode check, hydrateRoot(#app)            R6
    entry-server.tsx    SSR exports for postbuild                              R9
    vite-env.d.ts       globals: __BUILD_DATE__                                R10
    content/            schema.ts ids.ts types.ts site.ts resume.ts normalize.ts
                        index.ts format.ts temporal.ts selectors.ts *.test.ts  R1
    app/
      App.tsx App.module.css global.css boot.ts store.ts (+ tests)             R6
      routes.ts testHooks.ts testIds.ts (+ tests)                              R4
    overlay/            Hud, ProgressRail, StopCard, ExhibitDialog, StoryBody,
                        Intro, LiveRegion, MuseumGate, ContextVeil, NotFound,
                        SkipLink, story.ts                                     R6
      ScrollTrack.tsx ScrollTrack.module.css                                   R4
    classic/            ClassicResume.tsx classic.css (the /resume/ page)      R6
    print/              ResumePrint.tsx print.css                              R1
    museum/
      MuseumCanvas.tsx MuseumCanvas.module.css Scene.tsx                       R3
      environment/      Hall, Lobby, Desk, WingRoom, Doors, Floor, Lighting,
                        Foundations, lightPools.ts, lightRecipe.ts, YearStrips,
                        labels3d.ts, clearance.ts                              R3
      rail/             layout.ts rail.ts gaze.ts framing.ts parallax.ts
                        scrollMap.ts progress.ts navigation.ts keys.ts
                        hint.ts announce.ts CameraRig.tsx ReadySignal.tsx
                        (+ tests, __snapshots__)                               R4
      quality/          tiers.ts QualityController.tsx FrameDriver.tsx
                        PrecompileMaterials.tsx StatsProbe.tsx contextLoss.ts
                        (+ tests)                                              R7
      materials/        index.ts library.ts walnutGrain.ts
                        MaterialsProvider.tsx (+ tests)                        R2
      exhibits/
        _kit/           types.ts registry.ts defineExhibit.ts ExhibitFrame.tsx
                        Plinth.tsx GlassCase.tsx Placard.tsx Placeholder.tsx
                        fonts.ts useExhibitClock.ts noise.ts canvasTexture.ts
                        index.ts (+ tests)                                     R3
        verafin/ mysa/ wailo/ cfia/ klarup/ finance-tracker/
        safe-sip/ sdsj/ mun/ certifications/   index.ts + component + README  R5 (one builder per folder)
      debug/            Debug.tsx (lazy, ?debug only)                          R7
    design/             tokens.css tokens.ts fonts.css contrast.ts (+ tests)   R2
    seo/                meta.ts jsonLd.ts OgCard.tsx (+ tests)                 R9
  scripts/
    postbuild.ts prerender.ts gen-og.ts                                        R9
    headers.ts serve-dist.ts check-copy.ts check-links.ts not-implemented.mjs  R10
    build-resume-pdf.ts build-resume-tex.ts build-media.ts check-content.ts
    new-exhibit.ts templates/exhibit/                                          R1
    check-budgets.ts check-glyphs.ts subset-fonts.ts                           R7
    review/             capture runner (WP-34)                                 R8
  tests/
    e2e/                fixtures.ts helpers.ts *.spec.ts __screenshots__/     R8
    pdf/                resume-pdf.test.ts                                     R8
    manual/             PHONE_CHECKLIST.md (WP-32)                             R8
  perf/budgets.json                                                            R7
  review/
    concepts/<id>.md    concept checklists                                     R2
    reports/WP-xx.json  one report per work package (and F-###.json)          R0 (each WP writes its own)
    rubric.md runs/<date>/ findings.json findings.schema.json
    TEMPLATE_SCORECARD.md                                                      R11
  docs/
    PLAN.md ARCHITECTURE.md spec/EXPERIENCE.md wp/WP-xx.md wp/F-###.md        R0
    CONTENT_DRAFT.md CONTENT_UPDATE.md RESUME_CHANGES.md                       R1
    ART_DIRECTION.md                                                           R2
    MAINTENANCE.md                                                             R10
  out/                  gitignored: private/, print/, previews
  dist/ dist-ssr/       gitignored build output
```

`.gitignore` contains at least: `node_modules/`, `dist/`, `dist-ssr/`, `out/`, `.env.local`, `.env*.local`, `test-results/`, `playwright-report/`, `.lighthouseci/`, `.DS_Store`, `*.log`, `review/runs/**/*.png`.

### 2.2 Legacy cleanup (WP-01, R10)

The repo today tracks `README.md`, `index.html`, `scripts.js`, `styles.css`, `headshot.jpg`, `.DS_Store` and `docs/PLAN.md`. The `main` tip is commit `4f1ab2b`.

1. Tag the legacy site on the main tip: `git tag legacy-site 4f1ab2b` (verify first with `git rev-parse origin/main`), then `git push origin legacy-site`. Do not keep a `legacy/` folder: its outdated GPA and high-school content would be deployed and indexed.
2. On the integration branch: `git rm scripts.js styles.css .DS_Store index.html`. This also removes the crash from the deprecated `document.registerElement` call. The new `index.html` (gallery template) is created in the same WP.
3. `mkdir -p assets-src && git mv headshot.jpg assets-src/headshot.jpg`.
4. Add `.DS_Store` to `.gitignore`.
5. Rewrite `README.md` (what it is, `npm ci`, the npm scripts from §15.2, deploy notes) and add `LICENSE`.
6. Check: `git ls-files | grep -E '(^|/)(scripts\.js|styles\.css|\.DS_Store|headshot\.jpg)$'` prints only `assets-src/headshot.jpg`.

### 2.3 Ownership

`OWNERS.json` (R0) maps each role to globs. The most specific glob wins (for example `src/overlay/ScrollTrack*` belongs to R4 even though R6 owns the rest of `src/overlay/**`).

| Role | Owns (exclusive write) |
|---|---|
| R0 Orchestrator | `docs/PLAN.md`, `docs/ARCHITECTURE.md`, `docs/spec/**`, `docs/wp/**`, `CLAUDE.md`, `OWNERS.json`, `review/reports/**` (each WP writes only its own `review/reports/WP-xx.json`) |
| R1 Content & Resume | `src/content/**`, `src/print/**`, `resume/**`, `assets-src/**`, `public/images/**`, `scripts/build-resume-*`, `scripts/build-media*`, `scripts/check-content*`, `scripts/new-exhibit*`, `scripts/templates/**`, `docs/CONTENT_*.md`, `docs/RESUME_CHANGES.md` |
| R2 Art Director | `src/design/**`, `src/museum/materials/**`, `docs/ART_DIRECTION.md`, `review/concepts/**` |
| R3 Environment | `src/museum/environment/**`, `src/museum/exhibits/_kit/**`, `src/museum/MuseumCanvas.tsx`, `src/museum/MuseumCanvas.module.css`, `src/museum/Scene.tsx` |
| R4 Camera & Interaction | `src/museum/rail/**`, `src/app/routes*`, `src/app/testHooks*`, `src/app/testIds*`, `src/overlay/ScrollTrack*` |
| R5 Exhibit Builders A to D | `src/museum/exhibits/<id>/**`, one folder per assignment in the brief |
| R6 UI & Classic | `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/app/App.module.css`, `src/app/global.css`, `src/app/boot*`, `src/app/store*`, `src/overlay/**` (except `ScrollTrack*`), and the classic page folder (`classic/**` inside `src/`) |
| R7 Performance | `src/museum/quality/**`, `src/museum/debug/**`, `perf/**`, `scripts/check-budgets*`, `scripts/optimize-assets*` (reserved; no v1 WP creates it), `scripts/check-glyphs*`, `scripts/subset-fonts*`, `public/fonts/**`, `public/credits.html`, `LICENSES/**` |
| R8 QA | `tests/**` (e2e, pdf, manual), `playwright.config.ts`, `scripts/review/**` |
| R9 Accessibility & SEO | `src/seo/**`, `src/entry-server.tsx`, `scripts/postbuild*`, `scripts/prerender*`, `scripts/gen-og*`, `public/og/**`, `public/favicon*`, `public/apple-touch-icon*`, `public/robots.txt` |
| R10 DevOps | `package.json`, `package-lock.json`, `.npmrc`, `.nvmrc`, `.editorconfig`, `.prettier*`, `.gitignore`, `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`, `eslint.config.js`, `lighthouserc*.cjs`, `netlify.toml`, `.github/**`, `src/vite-env.d.ts`, `scripts/serve-dist*`, `scripts/check-copy*`, `scripts/check-links*`, `scripts/headers*`, `scripts/not-implemented*`, `README.md`, `LICENSE`, `docs/MAINTENANCE.md` |
| R11 Reviewer | `review/**` except `review/concepts/**` and `review/reports/**`. Never edits code |

`OWNERS.json` is the machine-readable copy of this table plus every work package's `allow` globs; when they differ, `OWNERS.json` wins and R0 fixes this table.

Rules:
- **Colocated unit tests belong to the folder owner.** `src/content/format.test.ts` is R1's; `src/museum/rail/layout.test.ts` and its `__snapshots__/` are R4's; `scripts/check-budgets.test.ts` is R7's. R8 owns only `tests/**`, `playwright.config.ts` and `scripts/review/**`.
- Everyone may read everything. Writing outside your globs requires the brief to grant that exact path.
- Every commit carries a `WP: WP-xx` trailer (or `WP: F-###` for review fixes). R0's merge script checks each commit's diff against the globs listed in that brief and against `OWNERS.json`.
- Dependencies: only R10 edits `package.json` dependencies and the lockfile. Other roles put requests in their `report.json` under `depsRequest`; R10 batches them into one lockfile commit per milestone.
- Contract files frozen at `contracts-v1` (`src/content/schema.ts`, `src/content/ids.ts`, `src/museum/exhibits/_kit/types.ts`, `src/app/store.ts` state shape, `src/app/testHooks.ts` types, `src/app/testIds.ts`, `src/app/routes.ts` route table and history transitions, token names in `src/design/tokens.ts`, `src/museum/rail/layout.ts` output type) change only through a written request to R0 and one commit that updates every consumer.

---

## 3. Content model

One typed file, `src/content/resume.ts`, drives the gallery, the DOM cards and dialog, `/resume/`, the PDF, `resume/resume.tex`, JSON-LD, meta tags, OG images and the sitemap.

### 3.1 Files in `src/content/` (R1)

| File | Contents | Ships to client? |
|---|---|---|
| `schema.ts` | zod schema below | No (`import type` only) |
| `ids.ts` | frozen id lists and id types | Yes |
| `types.ts` | `z.input` / `z.output` types, type-only imports | Types only |
| `site.ts` | `export const SITE_URL = '...'` (the one config value) | Yes |
| `resume.ts` | `export const resume = { ... } satisfies ResumeInput` | Yes |
| `normalize.ts` | hand-written defaults equal to the zod defaults | Yes |
| `index.ts` | `export const content: Content = normalize(resume)` | Yes |
| `format.ts` | `formatMonth`, `formatRange`, `duration`, `isCurrent`, `isExpected`, `formatLocation` | Yes |
| `temporal.ts` | `buildDateFromEnv`, `checkTemporal` | Node only |
| `selectors.ts` | tracks, reading order, card and print view models | Yes |

`SITE_URL` until the Netlify site exists (WP-18): `https://[placeholder: netlify-subdomain].netlify.app`. WP-18 is granted `src/content/site.ts` to set the real `https://<name>.netlify.app`. A custom domain later is a one-line change. Workflows read it with `npx tsx --eval "import('./src/content/site.ts').then(m => console.log(m.SITE_URL))"`.

### 3.2 Ids (`src/content/ids.ts`)

```ts
export const EXHIBIT_IDS = [
  'verafin', 'mysa', 'wailo', 'cfia',            // main aisle, newest first
  'klarup', 'finance-tracker',                   // projects wing
  'safe-sip', 'sdsj',                            // volunteer wing
  'mun', 'certifications',                       // end of the main track
] as const;
export type ExhibitId = (typeof EXHIBIT_IDS)[number];

export const STOP_ONLY_IDS = ['lobby', 'projects-door', 'volunteer-door', 'desk'] as const;
export type StopId = ExhibitId | (typeof STOP_ONLY_IDS)[number];

export const WING_IDS = ['projects', 'volunteer'] as const;
export type WingId = (typeof WING_IDS)[number];
export type TrackId = 'main' | WingId;
export const doorId = (w: WingId) => `${w}-door` as const;
```

These ids are public URLs (`/exhibit/<id>/`). They never change. A new job appends a new id (§15.3). A content test asserts that the set of entry ids in `resume.ts` equals `EXHIBIT_IDS`.

### 3.3 Schema (`src/content/schema.ts`)

```ts
// Build and test time only. Client code may only `import type` from this file.
import { z } from 'zod';

const EM_DASH = '\u2014';
const PHONE = /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/;

export const Line = z
  .string()
  .min(1)
  .refine((s) => s === s.trim(), 'No leading or trailing whitespace')
  .refine((s) => !s.includes(EM_DASH), 'No em dashes (U+2014): use a comma, colon, parentheses or a hyphen')
  .refine((s) => !PHONE.test(s), 'Phone-number pattern: the phone number is never committed');

export const Id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case id');
export const YearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM');
export const DateRange = z.object({
  start: YearMonth,
  end: z.union([YearMonth, z.literal('present')]),
});
export const Tense = z.enum(['present', 'past']);
export const HttpsUrl = z.url({ protocol: /^https$/ });
export const SiteUrl = z.string().regex(/^https:\/\/[^/]+$/, 'https origin, no path, no trailing slash');

export const Location = z.object({
  city: Line,
  region: Line,
  mode: z.enum(['on-site', 'hybrid', 'remote']).default('on-site'),
});
export const Link = z.object({ label: Line, href: HttpsUrl });

const draft = z.boolean().default(false);
/** First-person or unconfirmed copy. RELEASE=1 fails while any draft is true. */
export const Copy = z.object({ text: Line, draft });

export const Bullet = z.object({
  text: Line,
  print: z.boolean().default(true), // included in the PDF and resume.tex
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2), // trim guidance: 1 keep, 3 cut first
  draft,
});

export const StoryBlock = z.discriminatedUnion('type', [
  z.object({ type: z.literal('p'), text: Line, draft }),
  z.object({ type: z.literal('list'), items: z.array(Line).min(1), draft }),
  z.object({
    type: z.literal('figure'),
    src: z.string().regex(/^\/images\/[a-z0-9-]+\.(avif|webp|jpg|png)$/),
    alt: Line,
    caption: Line.optional(),
    draft,
  }),
]);

export const Exhibit = z.object({
  title: Line.max(40),              // concept title, e.g. "The Reporting Engine"
  label: Line.max(24).optional(),   // big 3D organization label; defaults to org or name
  caption: Line.max(140),           // one line: cards, OG description, meta description
  story: z.array(StoryBlock).min(1),
  object: Copy,                     // "The object" in the dialog: the one-sentence object description (EXPERIENCE §4); draft until the built object is confirmed
  curatorNote: Copy.optional(),     // optional pull quote under "Curator's note", above the story; stored only once Emeka writes it
  takeaway: Copy.optional(),        // "What I took away"
  tags: z.array(Line).max(8).default([]),   // shown as "Medium"
  links: z.array(Link).default([]),
});

const Bullets = z.array(Bullet).min(1);

export const Work = z.object({
  id: Id,
  kind: z.literal('work'),
  role: Line,
  shortRole: Line.optional(),       // hero line, e.g. "Software Development Co-op"
  org: Line,
  employment: z.enum(['co-op', 'internship', 'full-time', 'part-time']),
  location: Location,
  dates: DateRange,
  tense: Tense,                     // build fails if 'present' after dates.end (§3.6)
  bullets: Bullets,
  exhibit: Exhibit,
});

export const Project = z.object({
  id: Id,
  kind: z.literal('project'),
  name: Line,                       // "KlarUp"
  tagline: Line,                    // "Collaborative Productivity App"
  role: Line.optional(),            // [placeholder] until Emeka supplies it
  stack: z.array(Line).min(1),
  dates: DateRange.optional(),
  tense: Tense.optional(),
  bullets: Bullets,
  exhibit: Exhibit,
});

export const Volunteer = z.object({
  id: Id,
  kind: z.literal('volunteer'),
  role: Line,
  org: Line,
  location: Location,
  dates: DateRange,
  tense: Tense,
  bullets: Bullets,
  exhibit: Exhibit,
});

export const Education = z.object({
  id: Id,
  kind: z.literal('education'),
  institution: Line,
  degree: Line,
  shortInstitution: Line.optional(), // hero short form, e.g. "MUN" (PLAN §2)
  shortDegree: Line.optional(),      // hero short form, e.g. "B.Eng Computer Engineering"
  location: Location,
  start: YearMonth.optional(),      // [placeholder] until supplied
  graduation: YearMonth,            // "expected" is derived, never stored
  exhibit: Exhibit,
});

export const Certification = z.object({
  name: Line,
  issuer: Line.optional(),
  date: YearMonth.optional(),
  url: HttpsUrl.optional(),
});
export const Certifications = z.object({
  id: z.literal('certifications'),
  kind: z.literal('certifications'),
  items: z.array(Certification).min(1),
  exhibit: Exhibit,
});

export const Wing = z.object({
  id: z.enum(['projects', 'volunteer']),
  title: Line,                      // door sign, e.g. "Projects"
  after: Id,                        // main-track work id the door follows
  side: z.enum(['left', 'right']),  // which aisle wall the door is in
  items: z.array(Id).min(1).max(4), // newest first
});

export const SkillLine = z.object({ label: Line, items: z.array(Line).min(1) });

export const ResumeShape = z.object({
  meta: z.object({
    siteUrl: SiteUrl,               // = SITE_URL from site.ts
    title: Line.max(60),
    description: Line.max(160),
    lang: z.literal('en-CA'),
  }),
  contact: z.strictObject({         // strict: a `phone` key is a parse error
    name: Line,                     // full name for the PDF and JSON-LD
    preferredName: Line,            // "Emeka"
    email: z.email(),
    linkedin: HttpsUrl,             // no trailing slash
    github: HttpsUrl.optional(),
    location: Line,
    phoneInPublicPdf: z.literal(false), // Addendum: dist/ never contains the phone
  }),
  gallery: z.object({
    title: Line,                    // "Commit History"
    lobby: z.object({ eyebrow: Line, headline: Line, intro: Copy, hint: Line }),
    desk: z.object({ headline: Line, body: Copy, footnote: Line }),
  }),
  experiences: z.array(Work).min(1),     // newest first; the main aisle
  projects: z.array(Project),
  volunteer: z.array(Volunteer),
  education: z.array(Education).min(1),  // main track after the last work exhibit
  certifications: Certifications,
  skills: z.array(SkillLine).min(1).max(4),
  wings: z.array(Wing),
});

export const Resume = ResumeShape.superRefine(refineResume);
```

There is no stored `dateLabel`, no stored `current`, no stored `expected` and no phone field anywhere.

### 3.4 superRefine rules (`refineResume` in `schema.ts`)

Signature: `function refineResume(r: z.output<typeof ResumeShape>, ctx: z.RefinementCtx): void` (a hoisted function declaration in `schema.ts`). Each rule adds a `{ code: 'custom', path, message }` issue with the exact path (for example `['experiences', 2, 'dates']`). Month arithmetic uses `ym(s) = year * 12 + (month - 1)`.

1. **Unique ids.** Ids across `experiences`, `projects`, `volunteer`, `education` and `certifications` are unique.
2. **Reserved ids.** No entry id equals `lobby`, `desk`, `projects-door`, `volunteer-door`, `main`, `projects` or `volunteer`. Only the certifications block may use `certifications`.
3. **Date sanity.** For every range, `end === 'present'` or `ym(end) >= ym(start)`. For education, `start` (when present) is before `graduation`.
4. **Newest first.** `experiences` are non-increasing by `dates.start`. Same for `volunteer`. `projects` that have dates are non-increasing by `dates.start`.
5. **Printed bullets.** Every work entry has at least one bullet with `print: true`. A project or volunteer entry with zero printed bullets is omitted from the PDF and `.tex` (that is how Personal Finance Tracker leaves the PDF while staying in the gallery).
6. **Wings resolve.** Wing ids are unique. `wing.after` is the id of a work entry that is **not** the last work entry (a door needs a main exhibit on both sides). No two wings share the same `after`. Every id in the `projects` wing is a project id; every id in the `volunteer` wing is a volunteer id. Every project and every volunteer entry appears in exactly one wing. Items with dates are newest first.
7. **Main aisle is work only.** Only `experiences` occupy main-aisle exhibit slots; education and certifications follow them on the main track (§6.6).
8. **Stories.** Every `exhibit.story` contains at least one `p` block.
9. **Phone.** `contact.phoneInPublicPdf` is the literal `false` and `contact` is strict, so a phone can never be stored. `Line` also rejects the phone pattern in any string.

`normalize.ts` applies the same defaults by hand (`print: true`, `priority: 2`, `draft: false`, `location.mode: 'on-site'`, `tags: []`, `links: []`) so zod never ships. `content.test.ts` asserts `expect(normalize(resume)).toEqual(Resume.parse(resume))`.

### 3.5 Derived helpers (`format.ts`)

Every surface (cards, dialog, `/resume/`, PDF, `.tex`, JSON-LD, OG images) uses these, never its own formatting. All date math is in UTC.

```ts
export function toYearMonth(d: Date): string;                 // UTC, "2026-10"
export function formatMonth(ym: string): string;              // "2026-09" -> "Sep 2026" (Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec)
export function formatRange(r: DateRange, o?: { style?: 'text' | 'tex' }): string;
//   text: "Sep 2026 – Dec 2026" (spaced en dash U+2013), 'present' -> "Present"
//   tex:  "Sep 2026 -- Dec 2026"
export function monthsInclusive(r: DateRange, now: Date): number; // end 'present' uses toYearMonth(now)
export function duration(r: DateRange, now: Date): string;
//   < 12 months: "1 month", "4 months"; >= 12: "1 yr", "1 yr 9 mo", "2 yr"
export function isCurrent(entry: { dates: DateRange }, now: Date): boolean;
//   ym(start) <= ym(now) && (end === 'present' || ym(now) <= ym(end))
export function isExpected(edu: { graduation: string }, now: Date): boolean; // ym(now) < ym(graduation)
export function formatLocation(l: Location): string;
//   "St. John's, NL", "Calgary, AB / Remote", "St. John's, NL / Hybrid"
```

Required test values: Sep 2026 to Dec 2026 = `4 months`; Jan 2026 to May 2026 = `5 months`; May 2025 to Aug 2025 = `4 months`; Dec 2022 to Aug 2024 = `1 yr 9 mo`. With `now = 2026-10-15`, `isCurrent(verafin)` is true; with `now = 2027-01-05` it is false.

**The clock.** "Now" is the build date: `BUILD_DATE` (YYYY-MM-DD) from the environment, else today in UTC (`buildDateFromEnv()` in `temporal.ts`). `vite.config.ts` defines `__BUILD_DATE__` from it, and every script uses the same function, so prerendered HTML, the hydrated client, the PDF and the `.tex` agree. The weekly scheduled rebuild (§14.4) keeps "On view now" and durations fresh. `?test=1` freezes the animation clock, not the calendar.

### 3.6 Temporal check (`temporal.ts`)

`checkTemporal(content, now): string[]` returns one error per entry whose `tense` is `'present'` while `dates.end !== 'present'` and `ym(now) > ym(dates.end)`, for example `verafin: tense is 'present' but the role ended 2026-12. Rewrite bullets in past tense and set tense: 'past'.` `scripts/check-content.ts` (first step of `npm run build`) runs the zod parse plus `checkTemporal(content, buildDate)` and exits 1 on any error. A unit test proves it fails at `2027-01-05` for the Verafin entry.

### 3.7 Selectors (`selectors.ts`)

| Selector | Returns |
|---|---|
| `mainTrack(c)` | `['lobby', <work ids with a door inserted after each wing.after>, <education ids>, 'certifications', 'desk']`. For v1: `lobby, verafin, projects-door, mysa, volunteer-door, wailo, cfia, mun, certifications, desk` |
| `wingTrack(c, wingId)` | `[<wing>-door, ...items]`, for v1 `projects-door, klarup, finance-tracker` and `volunteer-door, safe-sip, sdsj` |
| `trackOf(c, id)` | the track an exhibit lives on |
| `readingOrder(c)` | main track exhibits with each wing's items inserted right after its door: `verafin, klarup, finance-tracker, mysa, safe-sip, sdsj, wailo, cfia, mun, certifications`. Drives Newer/Older and keyboard story order |
| `entryById(c, id)` | the `ExhibitEntry` |
| `exhibitNumber(c, id)` | main-track exhibits `01` to `06` in main-track order (verafin, mysa, wailo, cfia, mun, certifications); wing items `P1`, `P2`, `V1`, `V2`; displayed as "No. 01" or "No. P1" (EXPERIENCE §3.1) |
| `heroLines(c, now)` | `[roleLine, educationLine]`: `"<shortRole ?? role>, <org>"` of the current work entry (or, when none is current, `"Most recently: <shortRole ?? role>, <org>"` of the newest entry, EXPERIENCE §8.1) and `"<shortDegree ?? degree>, <shortInstitution ?? institution>, expected <Mon YYYY>"` (no "expected" once `isExpected` is false). Today: "Software Development Co-op, Nasdaq Verafin" and "B.Eng Computer Engineering, MUN, expected May 2027" |
| `stopCards(c, now)` | view models for every stop card (title, subtitle, dates, duration, status pill, CTA) |
| `printModel(c, { phone? })` | ordered PDF/.tex sections with only `print: true` bullets |
| `threeDStrings(c)` | every string rendered as 3D text (numbers, labels), for the glyph check |

### 3.8 Example entry (shape only; real copy lives in `docs/CONTENT_DRAFT.md`)

```ts
{
  id: 'verafin', kind: 'work',
  role: 'Software Development Co-op Student', shortRole: 'Software Development Co-op',
  org: 'Nasdaq Verafin', employment: 'co-op',
  location: { city: "St. John's", region: 'NL' },
  dates: { start: '2026-09', end: '2026-12' }, tense: 'present',
  bullets: [
    { text: 'Develop data platform features supporting fraud detection and anti-money laundering software.', priority: 1, draft: true },
    { text: 'Build data reporting features that turn platform data into accurate, readable reports for end users.', draft: true },
    { text: 'Develop data reporting plugins that extend reporting capabilities with modular, reusable components.', draft: true },
  ],
  exhibit: {
    title: 'The Reporting Engine',
    caption: '[placeholder: one-line caption from docs/CONTENT_DRAFT.md]',
    story: [{ type: 'p', text: '[placeholder: story from docs/CONTENT_DRAFT.md]', draft: true }],
    object: { text: '[placeholder: object description from docs/CONTENT_DRAFT.md]', draft: true },
    // curatorNote omitted until Emeka writes one
    tags: ['Data Platforms', 'Data Reporting', 'Reporting Plugins'],
  },
}
```

Wings in v1 content: `{ id: 'projects', title: 'Projects', after: 'verafin', side: 'left', items: ['klarup', 'finance-tracker'] }` and `{ id: 'volunteer', title: 'Volunteer & Leadership', after: 'mysa', side: 'right', items: ['safe-sip', 'sdsj'] }`. Moving a wing is a content edit of `after` and `side` only.

### 3.9 Consumers

1. `src/content/index.ts` (normalized `content`) for all client code.
2. `selectors.ts`: `ScrollTrack` sections, HUD progress rail, `StopCard`, `ExhibitDialog`, `layout.ts`.
3. `src/museum/rail/layout.ts`: rail, environment geometry (rooms, doors, plinths, year strips), `ExhibitFrame` slots.
4. The `/resume/` page (`ClassicResume`).
5. `src/print/ResumePrint.tsx` and `scripts/build-resume-pdf.ts`.
6. `scripts/build-resume-tex.ts`.
7. `src/seo/meta.ts`, `src/seo/jsonLd.ts`, `scripts/postbuild.ts` (exhibit pages, sitemap, robots), `scripts/gen-og.ts`.
8. `scripts/check-content.ts`, `scripts/check-copy.ts` (drafts and placeholders under `RELEASE=1`), `scripts/check-glyphs.ts`.
9. Tests: content unit tests, `tests/pdf` (expected bullets and order), e2e (expected stop order and titles).

---

## 4. Resume outputs

Owner: R1 (WP-04). Outputs:

| Output | Built by | Phone | Tracked? |
|---|---|---|---|
| `dist/resume.pdf` (served at `/resume.pdf`) | `npm run resume` (also part of `npm run build`) | Never | No (build output) |
| `out/private/resume.pdf`, `out/private/resume.tex` | `npm run resume:private` | Yes, from `RESUME_PHONE` | No (`out/` is gitignored) |
| `resume/resume.tex` | `npm run resume` / `npm run build` | Never | Yes, generated and committed |
| `out/resume-preview.png` | `npm run resume -- --preview` | Never | No |

### 4.1 Print template

- `src/print/ResumePrint.tsx` renders `printModel(content, { phone })` to static markup. `src/print/print.css` uses plain prefixed classes (`.pr-*`), not CSS Modules, so the script can read the file and inline it.
- Jake's Resume look: US Letter, `@page { size: Letter; margin: 0.5in }`; centered name with a contact row; section headings **uppercase with letter-spacing** (`text-transform: uppercase; letter-spacing: 0.08em`) and a full-width rule, never synthesized small caps; bold role left and date right, then an italic organization and location row; tight bullet lists.
- `font-variant-ligatures: none; font-feature-settings: "liga" 0, "clig" 0;` so ATS text extraction never sees ligature glyphs. `hyphens: manual`.
- Font: CMU Serif from `computer-modern` (`fonts/cmu-serif-500-roman.woff2`, `-500-italic`, `-700-roman`, `-700-italic`), referenced by `file://` URLs in the generated page.
- Section order: header, Education, Experience, Technical Skills, Projects, Volunteer Experience, Certifications (the order in `p_resume.md` §4). Header row (public): email | LinkedIn (display without `https://www.`) | site host | location; the site host is left out while `SITE_URL` still contains `[placeholder` (CONTENT_DRAFT §3.1), so the PDF never prints a placeholder. The private build prepends the phone.
- `.pr-page` is a fixed box of 7.5in x 10in (`overflow: hidden` is NOT set; the gate measures overflow).

### 4.2 Rendering (`scripts/build-resume-pdf.ts`)

1. Load `content`; build the page with `renderToStaticMarkup(createElement(ResumePrint, { model: printModel(content, { phone }) }))` (the script is `.ts`, so no JSX), inline `print.css` in a `<style>` tag, write `out/print/print.html`.
2. `chromium.launch()` from `@playwright/test` (uses `/opt/pw-browsers` locally), `page.goto('file://.../out/print/print.html')`, `await page.evaluate(() => document.fonts.ready)`.
3. **Overflow gate.** Evaluate `el.scrollHeight - el.clientHeight` on `.pr-page`. If it is above 0, exit 1 with `Resume overflows by N px (about K lines). Trim candidates: <entry id> bullet <n> (priority 3) ...`, listing printed bullets by priority 3 then 2, oldest entries first. **The build never drops a bullet itself.** Trimming is a content decision expressed with `print: false`.
4. `page.pdf({ format: 'Letter', preferCSSPageSize: true, printBackground: true, tagged: true, outline: false })`.
5. pdf-lib post-process: `setTitle('<name>, Resume')`, `setAuthor(name)`, `setSubject('Resume')`, `setKeywords(skills)`, `setCreator('Commit History build')`, `setProducer('Playwright + pdf-lib')`, `setCreationDate` and `setModificationDate` to the build date (deterministic). Save, then assert the catalog still has `/StructTreeRoot` and `/MarkInfo << /Marked true >>`.
6. Assert `getPageCount() === 1`. Write `dist/resume.pdf` (creating `dist/` if absent). `--preview` also writes `out/resume-preview.png` from a page screenshot at device scale 2.

### 4.3 Public versus private

- **The phone number is never committed.** It is not in the schema, not in `resume.ts`, not in `dist/`, not in `resume/resume.tex`, not in any log.
- `npm run resume:private` runs `build-resume-pdf.ts --private`, which calls `process.loadEnvFile('.env.local')` inside try/catch, reads `RESUME_PHONE`, requires `/^\d{3}-\d{3}-\d{4}$/`, and writes only `out/private/resume.pdf` and `out/private/resume.tex`. Before writing it runs `git check-ignore -q out/private/resume.pdf` and aborts if the path is not ignored. It prints `private resume written (phone included)` and never the number.
- `--private` refuses to run when `CI` is set.

### 4.4 `resume/resume.tex` (`scripts/build-resume-tex.ts`)

- Template: Jake's Resume (Jake Gutierrez, MIT). The preamble and macros live verbatim in `resume/template/preamble.tex` with `resume/template/LICENSE`. The generator emits `\documentclass` + preamble + body built from `printModel(content)` (the same selection as the PDF).
- Macros used: `\resumeSubheading{<role>}{<dates>}{<org>}{<location>}` (bold role left, dates right, italic org and location below), `\resumeItem{...}`, `\resumeProjectHeading{\textbf{<name>} $|$ \emph{<stack>}}{<dates>}`, the skills block and a certifications line.
- Escaping, applied to every string in this order: `\` -> `\textbackslash{}`, then `&` -> `\&`, `%` -> `\%`, `$` -> `\$`, `#` -> `\#`, `_` -> `\_`, `{` -> `\{`, `}` -> `\}`, `~` -> `\textasciitilde{}`, `^` -> `\textasciicircum{}`. (Escape the backslash first with a placeholder token so the braces it introduces are not escaped again.) Date-range en dashes become `--` via `formatRange(r, { style: 'tex' })`; any other U+2013 becomes `--`; curly quotes become straight quotes.
- Output is deterministic (no timestamps). CI `verify` regenerates it and runs `git diff --exit-code resume/resume.tex`, so the committed file is never stale.

### 4.5 CI LaTeX job

`latex` job in `ci.yml`: `xu-cheng/latex-action@v3` with `root_file: resume.tex` and `working_directory: resume` (pdflatex, TeX Live full image). Then `sudo apt-get install -y poppler-utils` and `test "$(pdfinfo resume/resume.pdf | awk '/^Pages:/{print $2}')" = "1"`. Upload `resume/resume.pdf` as an artifact. This is the authority for "compiles to one page in Overleaf".

### 4.6 Tests (`tests/pdf/resume-pdf.test.ts`, R8; run after build with `npm run test:pdf`)

- `dist/resume.pdf` has exactly 1 page (pdf-lib).
- unpdf `extractText`, whitespace normalized (`/\s+/g` to one space): every `print: true` bullet appears verbatim, in content order.
- Organization order in the text: `Nasdaq Verafin` < `Mysa` < `Wailo` < `Canadian Food Inspection Agency` (by `indexOf`).
- Every work entry has at least one printed bullet (also a schema rule).
- No phone pattern `/\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/` in the PDF text or in any text file under `dist/`.
- No U+2014. With `RELEASE=1`, no `[placeholder`.
- Metadata Title and Author are set; `/StructTreeRoot` exists.

---

## 5. App shell, boot and routes

### 5.1 Build pipeline

1. `tsx scripts/check-content.ts`: zod parse plus temporal check (§3.6).
2. `vite build`: client build of `index.html` plus a CSS-only input for the `/resume/` stylesheet (`classic.css` in the classic folder), `build.manifest: true` (writes `dist/.vite/manifest.json`). Inputs are set with `build.rolldownOptions.input` (Vite 8; `rollupOptions` is the deprecated alias).
3. `vite build --ssr src/entry-server.tsx --outDir dist-ssr`.
4. `tsx scripts/postbuild.ts` (R9): renders pages from `dist-ssr/entry-server.js` (§5.5, §11), writes `_headers` via `scripts/headers.ts` (§12), sitemap and robots.
5. `tsx scripts/build-resume-pdf.ts`, `tsx scripts/build-resume-tex.ts` (§4).
6. `tsx scripts/check-budgets.ts` (§9), `tsx scripts/check-copy.ts --dist` (§12.5).

A Vite plugin in `vite.config.ts` (`inlineBootScript`) transpiles `src/app/boot.ts` with `ts.transpileModule` (target ES2017, no imports, no exports) and replaces `<!--boot-->` in `index.html` with `<script>...</script>`. Postbuild hashes the exact script text for the CSP.

### 5.2 Page anatomy (`/` and `/exhibit/<id>/`)

```html
<html lang="en-CA">
<head>
  <!--ssr:head-->                  title, description, canonical, OG, Twitter, JSON-LD (R9)
  <!--boot-->                      inline boot script (R6), sets data-mode before first paint
  <!--preload-->                   font preload for the h1 face, injected by postbuild from dist/.vite/manifest.json
  <script type="module" src="/src/main.tsx"></script>
</head>
<body data-page="gallery|exhibit">
  <div id="app"><!--ssr:app--></div>          hydrated: skip link, HUD, ScrollTrack (hero inside the lobby section, all stop cards), closed <dialog>, live region
  <!--ssr:story-->                            exhibit pages only: <article id="story-static"> with the full story, not hydrated
  <noscript>...notice with links to /resume/ and /resume.pdf...</noscript>
</body>
</html>
```

- **Recruiter fast path.** The lobby section's prerendered hero contains: the `h1` name, the role line and education line from `heroLines()`, and three real links: Resume (PDF) `/resume.pdf`, Email (`mailto:`), Classic view `/resume/`. At 360x640 and 390x844, with JS off and with JS on before `ready`, all of these sit inside the first viewport. The `h1` is the LCP element.
- **Section cards** are prerendered for every stop: the 10 main stops, plus each wing's exhibit sections right after their door (crawlable content; the no-JS page lists everything). In museum mode the wing sections are hidden until their wing is entered (§6.1). Each card's "Read the story" control is a `<button aria-haspopup="dialog">` that opens the dialog (§5.6, EXPERIENCE §10.1); without JS the prerendered card still links to `/exhibit/<id>/` (for example, the artwork title is that link), so every story is reachable with JS off. Door cards list links to the wing's exhibit pages and, in museum mode, a "Step inside" button.
- CSS by mode: `html[data-mode="museum"] #story-static { display: none }`; on exhibit pages `html:not([data-mode="museum"]) #app { display: none }` so the static article is the page with JS off or in classic mode.

### 5.3 Boot script and mode decision (before first paint)

`src/app/boot.ts` (R6) is a self-contained script of at most 2 KB, identical on every page that has it (one CSP hash). It writes `document.documentElement.dataset.mode`, `dataset.test` when `?test=1`, and `window.__BOOT__ = { mode, reason, renderer, coarse, cores, saveData, test }`. Every storage access is wrapped in try/catch.

Decision order (first match wins):

| # | Condition | Result |
|---|---|---|
| 1 | JS disabled | no `data-mode`; prerendered HTML only |
| 2 | `?mode=classic` | classic (`reason: 'param'`); persisted to `localStorage['commit-history:mode']` unless `?test=1` |
| 3 | No WebGL2 (`canvas.getContext('webgl2')` is null) | classic (`'no-webgl2'`), even when museum was requested |
| 4 | `?mode=museum` | museum (`'param'`); persisted unless `?test=1` |
| 5 | Stored choice | that choice (`'stored'`) |
| 6 | `navigator.connection?.saveData === true` | classic (`'save-data'`) |
| 7 | Software renderer, unless `?test=1` | classic (`'software'`) |
| 8 | Otherwise | museum (`'auto'`) |

Renderer string: `const ext = gl.getExtension('WEBGL_debug_renderer_info'); const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);` (Firefox exposes the renderer through `gl.RENDERER`). Software when `/swiftshader|llvmpipe|softpipe|software|basic render driver|mesa offscreen/i` matches. Afterwards `gl.getExtension('WEBGL_lose_context')?.loseContext()` frees the probe context.

What classic means (`data-mode` has exactly two values, `museum` and `classic`; there is no third "static" mode):
- On `/`: `location.replace('/resume/#why-' + reason)` from the boot script, before paint (PLAN §3: software renderers go to `/resume/`).
- On `/exhibit/<id>/`: stay; `#story-static` is the page; `main.tsx` does not hydrate.
- `/resume/`, `/404.html`: never contain the boot script and ship zero JS.
- The `/resume/` page carries the four fallback banners of EXPERIENCE §8.4 as elements with ids `why-no-webgl2`, `why-save-data`, `why-software` and `why-context-loss`, hidden unless `:target` (zero JS). Reasons without a banner (`param`, `stored`) match no element and show nothing. The fragment is an in-page target, not a route.
- The `/resume/` page has a "Try the gallery" link to `/?mode=museum`, hidden when `#why-no-webgl2` is the target.

`src/app/boot.test.ts` runs the script with `vm.runInNewContext` and stubbed globals (location, navigator, localStorage, a fake canvas) and checks every row of the table.

### 5.4 Client entry and museum loading

- `src/main.tsx` returns early unless `data-mode === 'museum'`, then `hydrateRoot(document.getElementById('app'), <App />)`.
- The entry chunk holds React, wouter, zustand, the HUD, ScrollTrack, cards and the dialog. Budget: 110 KB gzip (§9).
- `MuseumGate` (R6) lazy-imports `src/museum/MuseumCanvas.tsx` after `load` plus `requestIdleCallback({ timeout: 2000 })` (setTimeout fallback on Safari), or on the first `scroll`, `pointerdown` or `keydown`, whichever comes first. It never competes with LCP. A failed chunk load shows the fallback notice with links to `/resume/` and the PDF.
- The canvas wrapper fades in over 600 ms when `ready` becomes true (§13.4).

### 5.5 Store (`src/app/store.ts`, R6; shape frozen at `contracts-v1`)

```ts
interface MuseumState {
  mode: 'museum' | 'classic';
  tier: QualityTier;                  // set once at boot by quality/tiers.ts
  reducedMotion: boolean;             // live matchMedia
  track: TrackId;                     // 'main' | 'projects' | 'volunteer'
  stop: StopId;                       // last settled stop (written only on change)
  settled: boolean;
  openId: ExhibitId | null;           // story dialog
  mainScrollY: number;                // saved on wing entry
  ready: boolean;
  hovered: ExhibitId | null;
  lastInputAt: number;                // ms, drives the 15 s idle-motion stop
  inputSource: 'scroll' | 'keyboard' | 'hud' | 'pointer'; // aria-live announces only keyboard and hud
  textPending: number;                // troika texts not yet synced
  compilePending: number;             // exhibits mounted but not yet compiled
  contextLost: boolean;               // R7 context-loss handler; R6 shows the veil
  canvasGeneration: number;           // React key of <Canvas>; +1 remounts after a context restore
  placeholders: ExhibitId[];          // exhibits currently showing the placeholder crate (R3 writes, R6's card shows "Installation in progress")
}
```

There are no custom store actions: consumers call `useMuseum.setState`. Initial values: `mode: 'museum'`, `tier: 'medium'`, `track: 'main'`, `stop: 'lobby'`, `settled: false`, `openId: null`, `ready: false`, `contextLost: false`, `placeholders: []`, counters 0.

Per-frame values (target and damped progress) live outside React in `src/museum/rail/progress.ts` as a mutable singleton read inside `useFrame`.

### 5.6 Routes and history (`src/app/routes.ts`, R4)

| Path | Served file | Content |
|---|---|---|
| `/` | `dist/index.html` | Gallery (hero, cards, canvas) |
| `/exhibit/<id>/` | `dist/exhibit/<id>/index.html`, one per `EXHIBIT_IDS` entry | Gallery shell plus prerendered story, own title, description, canonical, OG image; opens the dialog |
| `/resume/` | `dist/resume/index.html` | Classic resume, zero JS, zero WebGL, follows the system theme, prints on white |
| `/resume.pdf` | `dist/resume.pdf` | Public one-page PDF |
| anything else | `dist/404.html` (status 404) | Gallery-styled, links to `/` and `/resume/`, `noindex`, zero JS |

There are no hash routes and no other paths. wouter (browser location) is the only writer of the URL, through the helpers in `routes.ts`: `parsePath(pathname): { kind: 'gallery' } | { kind: 'exhibit', id } | null` (trailing slash optional on input), `exhibitPath(id)` (always with a trailing slash).

UI state is a pure function `deriveUi(pathname, history.state)` -> `{ openId, track }`. Every navigation goes through these rules:

| Action | History call | `history.state` |
|---|---|---|
| Arrive at a stop (scroll, keys, HUD) | **none, ever** | unchanged |
| Open a story in the app | `pushState` to `/exhibit/<id>/` | `{ inApp: true, id, track }` (`track` = the active track, unchanged) |
| Newer / Older in the dialog | `replaceState` to `/exhibit/<next>/` | `{ inApp: true, id: next, track }` (active track unchanged; the camera follows behind the dialog only when `next` is on the active track, EXPERIENCE §3.5) |
| Close (X, Esc, backdrop) when `state.inApp` | `history.back()`; popstate closes | previous entry |
| Close a cold-loaded deep link | `replaceState(..., '/')` | `{ inApp: false, track }` |
| Browser Back while the dialog is open | popstate; dialog closes | |
| Enter a wing ("Step inside" or Enter at a door) | `pushState` (same URL) | `{ inApp: true, track: wing, mainScrollY }` |
| Exit a wing (Esc, "Return to the aisle") when `state.inApp` | `history.back()`; popstate exits | |
| Exit a wing entered by a cold deep link | `replaceState` with `{ track: 'main' }`, then exit | |
| Cold load of `/exhibit/<id>/` | `replaceState` | `{ inApp: false, id, track: trackOf(id) }`; dialog opens at hydration; camera teleports when ready |

`history.scrollRestoration` stays `'auto'` so a reload lands on the same stop; after a wing exit the app re-applies `mainScrollY` itself (§6.7). On load, a `history.state.track` other than `'main'` re-enters that wing without pushing.

### 5.7 Keys

Only **Enter** and **Esc** have custom behavior, from one `keydown` listener on `window`:
- Enter, when focus is on `body` or the track (not on a link, button, input or the dialog): at an exhibit stop, open its story; at a door stop, enter the wing.
- Esc: the native `<dialog>` `cancel` event closes the story through the rules above; with no dialog open inside a wing, exit the wing.
- Arrows, Space, PageUp/PageDown, Home and End stay native scrolling (§6.3). A passive `keydown` listener only records `inputSource = 'keyboard'`.

### 5.8 Test ids (frozen at `contracts-v1`)

Exported as `TEST_IDS` from `src/app/testIds.ts` (R4), with functions for the parameterized ids:

`hero`, `hero-pdf`, `hero-email`, `hero-classic`, `begin-walk`, `stage`, `stop-<stopId>` (section), `card-<stopId>`, `open-<exhibitId>`, `enter-wing-<wingId>`, `exit-wing`, `dialog`, `dialog-close`, `dialog-newer`, `dialog-older`, `dialog-duration`, `hud`, `hud-progress`, `hud-stop-<stopId>`, `hud-classic`, `hud-pdf`, `onboarding-hint`, `live-region`, `context-veil`, `fallback-notice`, `story-static`, `classic-view` (root of `/resume/`), `not-found`.

### 5.9 404

`dist/404.html` is rendered by postbuild from `renderNotFound()` (component owned by R6) with the copy of EXPERIENCE §8.4 and CONTENT_DRAFT §6.5: title "Page not found | Commit History", heading "This room is closed.", body "The page you asked for isn't part of the collection.", links "Back to the gallery" (`/`) and "Classic resume" (`/resume/`); gallery colors, `<meta name="robots" content="noindex">`, zero JS. Netlify serves it with status 404; `serve-dist` does the same.

---

## 6. Scroll track and camera rail

Owner: R4. Input is the browser's own page scroll. The camera is a damped function of `scrollY`. Nothing hijacks scrolling.

### 6.1 Track markup (`src/overlay/ScrollTrack.tsx`)

```html
<main id="track" data-track="main">
  <section data-stop="lobby" id="stop-lobby" data-testid="stop-lobby">  hero + card  </section>
  <section data-stop="verafin" id="stop-verafin" data-testid="stop-verafin">  StopCard  </section>
  <section data-stop="projects-door" ...>  door card  </section>
  <section data-stop="klarup" data-wing="projects" ...>  StopCard  </section>
  <section data-stop="finance-tracker" data-wing="projects" ...>  StopCard  </section>
  ... every main stop in order, each wing's exhibit sections right after its door ...
</main>
```

- The prerendered markup always contains every section (the no-JS page lists everything). In museum mode only the active track's sections take part in layout: on the main track, sections with `data-wing` are hidden; inside a wing (`data-track="<wing>"`), every section except that wing's door and items is hidden. The door section belongs to both its tracks. Hiding is CSS keyed on `html[data-mode="museum"]` and `#track[data-track]`, so it applies before first paint and the page never shifts at hydration.

CSS (in `ScrollTrack.module.css` plus the root rules in R6's global CSS):

```css
html { scrollbar-gutter: stable; }
@media (pointer: coarse) { html { scroll-snap-type: y mandatory; } }
@media (pointer: fine)   { html { scroll-snap-type: y proximity; } }
.section { min-height: 100svh; scroll-snap-align: start; scroll-snap-stop: always; pointer-events: none; }
.section:last-child { min-height: 100lvh; }      /* last stop reachable when the URL bar collapses */
[data-card], [data-card] a, [data-card] button { pointer-events: auto; }
```

- No `wheel`, `touchstart` or `touchmove` listener anywhere in our code, and no `touch-action: none` anywhere. ESLint bans `addEventListener('wheel' | 'touch*')` and `onWheel` / `onTouch*` props (§7.5).
- The stage (`position: fixed; inset: 0; height: 100lvh; z-index: 0`) sits under the track (`z-index: 1`). `<Canvas eventSource={appRoot} eventPrefix="client">`, where `appRoot` is `#app`. R3F gives its wrapper `pointer-events: none` when `eventSource` is set; sections are `pointer-events: none`; so empty-area pointer events land on `#app` and R3F raycasts them, while scrolling falls through to the root scroller.
- 3D click handlers ignore events whose `nativeEvent.target.closest('[data-card], a, button, dialog')` is non-null, so a card click never also clicks a case behind it.
- While the dialog is open: `html { overflow: hidden }` (with `scrollbar-gutter: stable`, no layout shift).

### 6.2 Scroll-to-progress mapping (`src/museum/rail/scrollMap.ts`, pure, unit-tested)

- `stopY[i] = min(section[i].offsetTop, document.documentElement.scrollHeight - innerHeight)`, measured with a ResizeObserver on `#track`, after `document.fonts.ready`, and on resize (subject to §10.3's touch rule). Never `i * innerHeight`.
- Progress in stop units: for `stopY[i] <= y < stopY[i+1]`, `p = i + (y - stopY[i]) / (stopY[i+1] - stopY[i])`; clamp to `[0, N - 1]`.
- A passive `scroll` listener writes `progress.target = p`, sets `lastInputAt`, and calls `invalidate()`. Nothing else listens to scroll.

### 6.3 Damping, settling and keys

- `CameraRig` (in `useFrame`): `easing.damp(progress, 'current', progress.target, tokens.motion.railSmoothTime /* 0.25 s, EXPERIENCE §6.2 and §7.4 */, Math.min(delta, 0.1))`. Pose = `rail.poseAt(track, progress.current)`.
- **Settled** when `|current - target| < 0.001`, `target` is within 0.02 of an integer, the camera moved less than 0.1 mm in the last frame, and no neighbor exhibit is pending compile. On settling, `stop` is written to the store (only when it changed) and `__MUSEUM__.settled` becomes true.
- Snapping is CSS. Arrow keys, Space, PageDown and so on are native. **Acceptance:** from the lobby, ArrowDown repeatedly and PageDown repeatedly each visit every main stop in order in Chromium. If native ArrowDown does not advance exactly one stop under `proximity` on fine pointers, R4 reports it to R0 with evidence; adding a key handler needs a PLAN Addendum ruling first.

### 6.4 Gaze, framing and parallax (`gaze.ts`, `framing.ts`, `parallax.ts`)

The formulas are EXPERIENCE §6.2 and §6.3; this section names the code and tokens (WP-09 ships a simple blend toward each stop's look-at; WP-15 implements the full versions).
- **Gaze** (EXPERIENCE §6.3): for the segment from stop a to stop b with fraction `f`, `Fw` is the rail point `tokens.camera.gazeForwardM` (6 m) ahead of the camera at y 1.6. `f <= gazeEnterF` (0.35): `lerp(F_a, Fw, smoothstep(0, 0.35, f))`; `0.35 < f < gazeHoldF` (0.5): `Fw`; `f >= 0.5`: `lerp(Fw, F_b, smoothstep(0.5, 1, f))`. Then `easing.dampLookAt(camera, look, tokens.motion.gazeSmoothTime /* 0.3 s */, delta)`.
- **Framing is a projection shift, never a pose change** (EXPERIENCE §6.2): `camera.setViewOffset` puts the look-at point at `tokens.camera.framingDesktopX` (62% of the width, 50% of the height) when the aspect is at least 1, and at 50% of the width and `tokens.camera.framingPortraitY` (36% of the height) in portrait; with the desktop dialog open, at the center of the area left of the panel. Shift changes damp over `tokens.motion.framingSmoothS` (0.4 s). Vertical FOV is `tokens.camera.fovDesktop` (50) at aspect 1 or more, `tokens.camera.fovPortrait` (68) at aspect `tokens.camera.portraitAspect` (0.6) or less, linear in between. Stop poses are identical on every device; `layout.ts` stays aspect-free. There is no portrait pull-back.
- **Parallax:** fine pointers only, at most `tokens.camera.parallaxYawDeg` (1.5) yaw and `parallaxPitchDeg` (1) pitch, damped 0.4 s, from a passive `pointermove`. Off under reduced motion, `?test=1`, coarse pointers and while the dialog is open.

### 6.5 Reduced motion

No damping and no in-between poses. The camera holds the last settled stop's pose; when a new stop settles, the stage runs a 200 ms opacity fade (100 ms to ink, swap pose, 100 ms back). Test: sampling the camera at 30 Hz during a scroll only ever yields stop poses.

### 6.6 Layout (`src/museum/rail/layout.ts`, a pure function of content)

```ts
export type Vec3 = [number, number, number];
export interface StopPose { id: StopId; camera: Vec3; look: Vec3 }
export interface Slot {
  id: ExhibitId; track: TrackId;
  position: Vec3;          // plinth base center on the floor (mount 'plinth'), or the back-panel center on the wall (mount 'wall')
  rotationY: number;       // local +Z faces the stop camera horizontally (wall: out of the wall)
  side: 'left' | 'right' | 'center';
  mount: 'plinth' | 'wall';
  plinth: 'standard' | 'wide' | 'none';                     // wide = 1.4 x 1.4 x 0.6 m (mun only); none = wall vitrine
  bounds: { min: Vec3; max: Vec3 };                         // exhibit object limit in local meters, origin = plinth top center (or back-panel center), EXPERIENCE §5.3
}
export interface Door { wing: WingId; side: 'left' | 'right'; z: number; width: 2.4 }
export interface Room { id: 'lobby' | 'aisle' | 'foundations' | 'desk' | WingId; min: [number, number]; max: [number, number]; ceiling: number }
export interface Track { id: TrackId; stops: StopPose[]; via: { after: number; point: Vec3 }[] }
export interface Layout {
  tracks: Record<TrackId, Track>; slots: Slot[]; doors: Door[]; rooms: Room[];
  yearMarks: { year: number; z: number }[];
  ageT: Record<StopId, number>;  // EXPERIENCE §6.9 age parameter (0 newest, 1 oldest) for light warmth and paper aging
}
export function computeLayout(content: Content, now: Date): Layout; // `now` = build date; needed for the current-year strip
```

`computeLayout` never reads `window` or the DOM (it runs in Node tests and the SSR build). Constants come from EXPERIENCE §2.1 (Experience proposal coordinates) and are exported by name from `layout.ts`; `layout.test.ts` pins the result with a snapshot at `now = 2026-10-15`: eye height 1.6, aisle x -3.5..3.5 (width 7), aisle ceiling 5, exhibit spacing 12 m, work exhibit `i` at `z = -10 - 12i`, `x = +2.4` for even `i` (Verafin on the right) and `-2.4` for odd `i`.

Derivations (`s = -1` for a left wing, `+1` for a right wing):
- Work stop `i`: camera `(sign * 0.6, 1.6, z + 2.8)`, look `(sign * 2.4, 1.35, z)`.
- **Door z = midpoint** of `wing.after`'s z and the next work exhibit's z. Door opening 2.4 m wide in the aisle wall at `x = s * 3.5`. Door stop: camera `(0, 1.6, doorZ + 1.8)`, look `(s * 3.5, 1.5, doorZ)`.
- Wing room: x from `s * 3.5` to `s * 11.5`, z from `doorZ + 4` to `doorZ - 4`, ceiling 4. Item `k`: plinth `(s * 9, 0, doorZ + 2.2 - 4.4k)`, camera `(s * 5.6, 1.6, doorZ + 1.4 - 2.8k)`, look `(s * 9, 1.35, plinthZ)`. Wing track via point (not a stop) at the door threshold `(s * 3.5, 1.6, doorZ)` so the curve passes through the opening.
- Aisle end `zEnd = lastWorkZ - 6`. Foundations room x -6..6, `z zEnd..zEnd - 10`, ceiling 5: `mun` at `(-2.5, 0, zEnd - 5)` on the wide plinth, camera `(-0.3, 1.6, zEnd - 2.4)`, look `(-2.5, 1.25, zEnd - 5)` (the MUN slot center: plinth top 0.6 plus 0.65); `certifications` wall vitrine with its back panel on the right wall centered at `(6, 1.6, zEnd - 5)`, camera `(2.2, 1.6, zEnd - 5)`, look at the slot center `(5.85, 1.6, zEnd - 5)`.
- Desk room x -5..5, `z zEnd - 10..zEnd - 18`, ceiling 4: desk at `(0, 0, zEnd - 15.5)`, camera `(0, 1.6, zEnd - 12)`, look `(0, 1.1, zEnd - 15.5)`.
- Lobby x -6..6, z 6..-4, ceiling 6: camera `(0, 1.6, 4)`, look `(0, 1.6, -10)`.
- Slot bounds (EXPERIENCE §5.3), local `min`/`max`: standard x and z [-0.325, 0.325], y [0.025, 0.675]; `mun` x and z [-0.55, 0.55], y [0.10, 1.20] on the wide plinth; `certifications` wall vitrine x and y [-0.325, 0.325], z [0.05, 0.25] out from the back panel. R2 or R3 may request other values through R0; the snapshot records them.
- `yearMarks` (EXPERIENCE §6.9): time anchors are each main work exhibit at `(z_i, mid_i)` with `mid_i = (ym(start) + ym(end) + 1) / 2` (the half-open month interval; `ym = year * 12 + (month - 1)`), plus the aisle end `(zEnd, ym(start of the last work entry))`. The build year's strip sits at the arch (z -4); each earlier year Y down to the oldest start year sits where linear interpolation of the anchors reaches January of Y + 1. Today: 2026 at -4, 2025 at -25.5, 2024 at -37.5, 2023 at -44.5, 2022 at -51.4.
- `ageT` (EXPERIENCE §6.9): main work exhibit `i` gets `i / (n - 1)`; a wing (its door and items) gets `(k + 0.5) / (n - 1)` for `after = w[k]`; lobby 0, Foundations stops 1, desk `1/3`.

Resulting v1 values (the snapshot must match; EXPERIENCE §2.4 and §2.5 are the source, and this table repeats them):

| Stop | Camera | Look |
|---|---|---|
| lobby | (0, 1.6, 4) | (0, 1.6, -10) |
| verafin | (0.6, 1.6, -7.2) | (2.4, 1.35, -10) |
| projects-door (left, z -16) | (0, 1.6, -14.2) | (-3.5, 1.5, -16) |
| mysa | (-0.6, 1.6, -19.2) | (-2.4, 1.35, -22) |
| volunteer-door (right, z -28) | (0, 1.6, -26.2) | (3.5, 1.5, -28) |
| wailo | (0.6, 1.6, -31.2) | (2.4, 1.35, -34) |
| cfia | (-0.6, 1.6, -43.2) | (-2.4, 1.35, -46) |
| mun | (-0.3, 1.6, -54.4) | (-2.5, 1.25, -57) |
| certifications | (2.2, 1.6, -57) | (5.85, 1.6, -57) |
| desk | (0, 1.6, -64) | (0, 1.1, -67.5) |
| klarup | (-5.6, 1.6, -14.6) | (-9, 1.35, -13.8) |
| finance-tracker | (-5.6, 1.6, -17.4) | (-9, 1.35, -18.2) |
| safe-sip | (5.6, 1.6, -26.6) | (9, 1.35, -25.8) |
| sdsj | (5.6, 1.6, -29.4) | (9, 1.35, -30.2) |

Wing tracks: `projects` = `[projects-door, klarup, finance-tracker]` and `volunteer` = `[volunteer-door, safe-sip, sdsj]`. The door pose is index 0 of its wing track (the same pose as on the main track), so the track swap has no jump; the wing's exhibit stops are the items (PLAN §2's "projects is klarup, finance-tracker").

`layout.test.ts` also asserts: 10 main stops and 2 wing tracks of 3 poses each (door plus 2 exhibit stops); the EXPERIENCE §2.7 worked example; the validation errors of EXPERIENCE §2.2 rule 2; year marks within 0.1 m of EXPERIENCE §6.9; changing a wing's `after` moves its door to the new midpoint and its room, plinths and stops with it. The rail clearance test (every 0.1 m sample at least 0.4 m from every wall, door planes crossed only inside the opening) lives in `src/museum/environment/clearance.test.ts` (WP-24).

### 6.7 Rail curve and wing tracks (`rail.ts`, `CameraRig.tsx`)

- One `CatmullRomCurve3(points, false, 'centripetal')` per track through the stop camera positions plus via points and a lead-in/lead-out point. Each stop's curve parameter `u_i` is its arc-length fraction (`curve.getLengths(4096)`), so `poseAt(track, p)` interpolates `u` linearly between `u_i` and `u_{i+1}` and calls `curve.getPointAt(u)`. Constant speed within each segment.
- **Entering a wing** (Enter or "Step inside" at a door): store `mainScrollY = scrollY`, `pushState` per §5.6, set `track = wing`. ScrollTrack shows the wing's sections (`[<wing>-door, ...items]`, §6.1); the door section has the same pose on both rails, so there is no jump. Then `scrollTo({ top: stopY[1], behavior: 'instant' })` while the rig plays a scripted glide along the wing rail from the door pose through the threshold to the first item over `tokens.motion.wingEnterS` (1.4 s, easeInOutCubic, EXPERIENCE §6.5) instead of damping; under reduced motion the glide is replaced by the §6.5 fade-cut.
- Inside a wing, the HUD and the last wing card show "Return to the aisle" (key hint "Esc", EXPERIENCE §8.4). There is no automatic exit at the end of a wing.
- **Exiting:** the rig plays the scripted glide from the current wing progress back to 0 (the door pose) over `tokens.motion.wingExitS` (1.2 s, easeInOutCubic; fade-cut under reduced motion), then swaps to the main rail at the door index. ScrollTrack re-renders the main sections and, in a layout effect after render, calls `scrollTo({ top: mainScrollY, behavior: 'instant' })`, overriding whatever the browser restored. Focus moves to the door card's "Step inside".
- `goTo(id, { instant })` (test hook) goes through `navigation.travelTo`, which enters and exits wings with the same code as the UI, including the wing history entry, so tests exercise the real code path. With `instant`, scripted glides are skipped.

### 6.8 Acceptance tests (WP-09, WP-15)

- A 40-event decaying `page.mouse.wheel` stream (trackpad-like) and three discrete 100 px notches each settle on a whole stop with none skipped (desktop).
- One CDP touch flick on Pixel 7 moves exactly one stop.
- CDP `DOMDebugger.getEventListeners` on `window`, `document`, `#app` and the canvas shows no non-passive `wheel`, `mousewheel`, `touchstart` or `touchmove` listener. (R3F's own `wheel` listener is passive.)
- Walking all 10 main stops calls `pushState` and `replaceState` zero times (instrumented with an init script). Only story open/step/close and wing enter/exit write history (§5.6).
- Esc inside a wing returns to its door with `scrollY === mainScrollY`; Back does the same.
- Reduced motion: no in-between camera positions.

---

## 7. Scene architecture and exhibit plugin interface

### 7.1 Component tree

```
<App>                                       src/app/App.tsx (R6), hydrated into #app
  <SkipLink/> <Hud><ProgressRail/></Hud>    R6
  <ScrollTrack>{sections + <StopCard/>}     R4 (cards R6)
  <ExhibitDialog/> <Intro/> <LiveRegion/>   R6
  <MuseumGate>                              R6: lazy import, error boundary -> fallback notice
    <MuseumCanvas>                          R3: stage div + <Canvas key={canvasGeneration}
                                              frameloop="demand" dpr={dpr} eventSource={#app} eventPrefix="client"
                                              gl={{ antialias: tier !== 'low', powerPreference: 'high-performance',
                                                    toneMapping: tokens.render.toneMapping }}
                                              camera={{ fov, near: 0.1, far: 90 }}>
      <QualityController/> <FrameDriver/> <StatsProbe/>        R7
      <ContextLossHandler/>                                     R7
      <MaterialsProvider>  (wraps the Suspense below; one material library per canvas)   R2
      <Suspense fallback={null}>
        <Scene>                                                 R3
          <Environment frames={1} resolution={256}>{Lightformers}</Environment>
          <Lobby/> <Hall/> <WingRooms/> <Foundations/> <Desk/> <Doors/> <YearStrips/>
          <Floor/> <Lighting/>
          {layout.slots.map(s => <ExhibitFrame key={s.id} slot={s}/>)}
        </Scene>
        <CameraRig/>                                            R4
        <ReadySignal/>                                          R4 (testHooks)
      </Suspense>
      {debug && <LazyDebug/>}                                   R7, ?debug only
```

### 7.2 Exhibit types (`src/museum/exhibits/_kit/types.ts`, frozen)

```ts
import type { ComponentType } from 'react';
import type { ExhibitId } from '../../../content/ids';
import type { ExhibitEntry } from '../../../content/types';
import type { MaterialLibrary } from '../../materials';

export type QualityTier = 'low' | 'medium' | 'high';

export interface ExhibitSlot {
  id: ExhibitId;
  mount: 'plinth' | 'wall';
  bounds: { min: [number, number, number]; max: [number, number, number] }; // local meters; origin = plinth top center (wall: back-panel center), +Z toward the visitor (EXPERIENCE §4, §5.3)
}

export interface ExhibitRuntime {
  tier: QualityTier;
  reducedMotion: boolean;
  motion: boolean;   // false when idle-stopped, reduced motion, ?test=1, or tier 'low'
  active: boolean;   // this exhibit is the settled stop
  hovered: boolean;
  open: boolean;     // its story dialog is open
}

export interface ExhibitProps {
  entry: ExhibitEntry;
  slot: ExhibitSlot;
  runtime: ExhibitRuntime;
  materials: MaterialLibrary;
}

export interface ExhibitManifest {
  id: ExhibitId;                                    // equals the folder name
  title: string;                                    // concept title, for debug and review
  load: () => Promise<{ default: ComponentType<ExhibitProps> }>;
  budget: { triangles: number; drawCalls: number; textureMB: number }; // triangles <= 20000
  motion: 'none' | 'slow';                          // at most one slow motion
}

export function defineExhibit(m: ExhibitManifest): ExhibitManifest; // identity plus dev assertions
```

### 7.3 Registry (`src/museum/exhibits/_kit/registry.ts`, R3)

```ts
const mods = import.meta.glob<{ default: ExhibitManifest }>(['../*/index.ts', '!../_kit/**'], { eager: true });
export const registry = new Map<ExhibitId, ExhibitManifest>(
  Object.values(mods).map((m) => [m.default.id, m.default]),
);
```

Each folder `src/museum/exhibits/<id>/` contains `index.ts` (tiny eager manifest, part of the museum chunk), one lazily loaded component file (its own chunk, at most 40 KB gzip) and `README.md` (concept, bounds, budget, checklist link `review/concepts/<id>.md`). No shared list file is ever edited to add an exhibit. A missing folder or a failed load renders `_kit/Placeholder` (an empty lit case plus the DOM card "Installation in progress"), so every stop works from day one. `registry.test.ts` (R3) asserts every manifest `id` matches its folder, is in `EXHIBIT_IDS`, and declares `budget.triangles <= 20000`.

### 7.4 ExhibitFrame responsibilities (`_kit/ExhibitFrame.tsx`, R3)

- Positions a group at `slot.position` and `rotationY`. The instanced plinths and glass cases for all slots are drawn by the environment (one draw call per type); the frame adds the per-slot hit box and placard labels.
- Distance mounting on the stop graph (§8.5): mounts at distance <= 2, calls `manifest.load()` (preload) at distance 3, unmounts and disposes geometries, materials it created and textures beyond 4.
- Mounts the component inside `<Suspense>` and an error boundary (fallback: `Placeholder`). The group starts `visible = false`; after the lazy component resolves it runs `await gl.compileAsync(scene, camera)` and only then reveals the group. It increments and decrements `compilePending`.
- Renders an invisible box hit target sized to the case; exhibit meshes are never raycast (after reveal the frame traverses the exhibit subtree and sets `mesh.raycast = () => {}` on every mesh). Hover sets `hovered`, the pointer cursor and the case highlight. Click on the settled stop opens the story; click on another exhibit travels there.
- Placard 3D labels (exhibit number and the organization `label`) via the kit `Placard`, troika `Text` with the self-hosted `.woff`, cap height at least 6 cm, reporting sync completion through `textPending`.
- Builds `ExhibitRuntime` and passes `materials` from the shared library.
- Runs one `<ContactShadows frames={1}>` on the plinth top after reveal (rendered once).
- In dev and under `?test=1`: computes the child group's `Box3` and triangle count after reveal and reports them to `stats().exhibits[id]` (`inBounds` false when the box exceeds `slot.bounds` plus 1 cm, or triangles exceed the budget).

### 7.5 Author rules (lint-enforced)

Exhibit code renders only the sculptural object inside the case: one object, at most one slow motion, at most 20k triangles, shared materials only, no logos, no text meshes, and it must fit `slot.bounds`.

`eslint.config.js` (R10) block for exhibit folders:

```js
{
  files: ['src/museum/exhibits/*/**/*.{ts,tsx}'],
  ignores: ['src/museum/exhibits/_kit/**'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        { regex: '^\\.\\./(?!_kit(/|$))', message: 'Exhibits import only from ./ and ../_kit (no cross-exhibit or app imports).' },
        { regex: '^(zustand|wouter|leva|r3f-perf|postprocessing|@react-three/postprocessing)(/|$)', message: 'Not allowed in exhibits.' },
        { regex: '^three/(examples|addons)/', message: 'Ask R3 to add a kit helper instead.' },
      ],
      paths: [{
        name: '@react-three/drei',
        importNames: ['Text', 'Text3D', 'Html', 'Environment', 'Lightformer', 'ContactShadows', 'MeshReflectorMaterial',
          'MeshTransmissionMaterial', 'SpotLight', 'ScrollControls', 'useGLTF', 'useTexture', 'PerformanceMonitor'],
        message: 'Owned by the environment, kit or quality code.',
      }],
    }],
    'no-restricted-syntax': ['error',
      { selector: 'JSXOpeningElement[name.name=/Light$/]', message: 'No lights in exhibits.' },
      { selector: 'JSXOpeningElement[name.name=/Material$/]', message: 'Use materials from the shared library (props.materials).' },
      { selector: 'NewExpression[callee.name=/(Light|Material)$/], NewExpression[callee.property.name=/(Light|Material)$/]', message: 'No lights or ad-hoc materials.' },
      { selector: "JSXAttribute[name.name=/^(castShadow|receiveShadow)$/]", message: 'No shadow maps.' },
      { selector: "MemberExpression[object.name='Math'][property.name='random']", message: 'Use the seeded rng from ../_kit/noise.' },
      { selector: "CallExpression[callee.object.name=/^(Date|performance)$/][callee.property.name='now']", message: 'Use useExhibitClock() from ../_kit.' },
    ],
  },
}
```

Repo-wide rules: client code (`src/**` except `*.test.ts`) may import `src/content/schema.ts` and `zod` only with `import type`; no `addEventListener` call with `'wheel'`, `'mousewheel'`, `'touchstart'`, `'touchmove'` or `'touchend'`, and no `onWheel` / `onTouch*` JSX props (`no-restricted-syntax`).

Kit helpers for builders, all exported from `_kit/index.ts`: `defineExhibit`, `useExhibitClock()` (seconds; frozen under `?test=1` unless `&idle=1`; stops when `runtime.motion` is false), `rng(seed)` and `noise2(seed)` in `_kit/noise.ts`, `canvasTexture(draw, w, h)` for screen and stamp textures, `useMaterial(name)` (the shared library instance) and `useMaterialInstance(name)` (a clone that shares the compiled program, for an exhibit's own animated `emissiveIntensity` or `opacity`), both re-exported from `src/museum/materials` (R2, WP-05), plus the types. Exhibits get materials from `props.materials` or these hooks and never import `src/museum/materials` directly (the lint pattern above). The 3D label fonts come from `_kit/fonts.ts` (`.woff` URLs; WP-28 swaps them for subsets). Shaders an exhibit needs (for example a circuit-trace or layer-line look) are added to the material library by R2 on request.

---

## 8. Rendering, lighting and quality tiers

### 8.1 Lighting (R3 with R2)

- **Baked light pools.** `environment/lightPools.ts` paints warm radial pools under every slot, door and the desk, plus dark soft contact patches under plinths, into one CanvasTexture used as `lightMap` on the floor (`lightMap.channel = 0`, so no second UV set is needed). Wall bays use a shared 256 px "scallop wash" texture.
- **Real spotlights: 3 on high, 1 on medium and low**, fixed per tier at boot. Assignment follows EXPERIENCE §6.8: light 1 takes the current stop's light target (or the next one ahead when the stop has none); on high, lights 2 and 3 take the next two targets ahead. Lights are reassigned only when a stop settles, and reassignment moves position and target only, so no shader recompiles. Spotlight color warms with age per EXPERIENCE §6.9 (`layout.ageT`).
- A dim hemisphere light (EXPERIENCE §7 values). `FogExp2` in the ink color.
- **Zero shadow maps** (`gl.shadowMap.enabled = false`, no `castShadow`). Contact shadows render once (§7.4).
- **Environment** from drei `<Environment frames={1} resolution={256}>` with `<Lightformer>`s. No HDR or HDRI download.
- **Tone mapping:** ACES Filmic versus AgX is chosen by R2 in WP-11 from side-by-side screenshots at the same stops, then frozen as the token `render.toneMapping` (`'aces' | 'agx'`) with `render.exposure` in `src/design/tokens.ts`. Until then: `'aces'`, exposure 1.0.

### 8.2 Floor and glass per tier

| | high | medium | low |
|---|---|---|---|
| Floor | drei `MeshReflectorMaterial` (resolution 512, blur [300, 100], other values from ART_DIRECTION) plus the pool lightmap | `MeshStandardMaterial`, floor color, roughness about 0.2, reflecting `scene.environment`, plus the lightmap; no second pass | same as medium |
| Glass cases | fake glass: transparent, opacity about 0.12, roughness 0.05, envMapIntensity 1.2, `depthWrite: false`, emissive brass edge strips, **no transmission** | same | same |
| Beam cones | additive, opacity 0.035 | same | off |
| Idle motion | on | on | off |
| Antialias | on | on | off |

### 8.3 Fonts and 3D text

DOM fonts: `src/design/fonts.css` (R2) imports `@fontsource/instrument-serif/latin-400.css` and `latin-400-italic.css` (artwork titles are italic, EXPERIENCE §7.7), `@fontsource/ibm-plex-sans/latin-400.css` and `latin-500.css`, so the woff2 files are hashed into `/assets/`. A metric-matched local fallback face (`size-adjust`, `ascent-override`) keeps the swap from adding CLS. WP-28 may replace these imports with subset-font outputs in `public/fonts/`.

3D text: only big labels (exhibit number, organization label, door signs, "COMMIT HISTORY", year strips). Fonts are imported as URLs, for example `import serifWoff from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff?url'` (troika cannot read woff2). Every `<Text>` passes `font` explicitly (troika's default would fetch Roboto from a CDN). The kit calls `configureTextBuilder({ unicodeFontsURL: '/fonts/unicode-fallback' })` once, pointing at a self-hosted, intentionally empty path: any fallback request is a test failure. `scripts/check-glyphs.ts` (R7) uses fontkit to assert every code point of `threeDStrings(content)` plus `environment/labels3d.ts` exists in the woff used.

### 8.4 Tier choice (boot time only, `quality/tiers.ts`)

`chooseTier({ coarse, cores, saveData, renderer, params })`, pure and unit-tested:
1. `?tier=low|medium|high` wins.
2. `?test=1` gives `'medium'`.
3. `saveData` (only reachable with an explicit museum choice) gives `'low'`.
4. Coarse pointer gives `'medium'`; `'low'` when `cores < 4` or the renderer matches the weak-GPU list (initially `/Mali-4|Mali-T|Adreno \(TM\) [345]\d\d|PowerVR SGX/i`). Safari has no `deviceMemory`, so it is not used.
5. Fine pointer: `'high'` when `cores >= 8` and the renderer does not match `/Intel|Mali|Adreno|SwiftShader|llvmpipe/i` (Apple GPUs qualify); otherwise `'medium'`.

The tier is stored once, written to `html[data-tier]`, and **never changes at runtime**: light count, floor material and antialias are fixed for the session. **Only DPR adapts**: start at `min(devicePixelRatio, maxDpr)` with `maxDpr` 2 / 1.5 / 1 for high / medium / low; drei `<PerformanceMonitor flipflops={3}>` lowers DPR in 0.25 steps to a floor of 1 and raises it back to `maxDpr`; `onFallback` locks DPR at 1. No AdaptiveDpr. `?test=1` fixes DPR at 1 and disables the monitor.

### 8.5 Mounting, compiling and frames

- Stop-graph distance: main stops by index; a wing item `k` is `doorIndex + k + 1` hops from the main track. Exhibits mount at distance <= 2 (hidden), compile with `gl.compileAsync`, then reveal; chunk preload at 3; unmount and dispose beyond 4.
- `frameloop="demand"` always. `FrameDriver` (R7) calls `invalidate()` every animation frame while the camera is moving, a fade or dolly runs, or a mount is compiling. While only idle motion runs, it invalidates every frame on fine pointers and on a 33 ms timer (30 fps) on coarse pointers. **Idle motion stops 15 s after the last input** (`scroll`, `pointermove`, `pointerdown`, `keydown`, all passive), so a settled, idle scene renders zero frames until the next input.
- Rendering pauses (no invalidation) when the story sheet covers 65% or more of the viewport (the phone sheet) and when `document.visibilityState === 'hidden'`.
- Dialog open on desktop: the camera dollies `tokens.camera.dialogDollyM` (0.6 m) toward the slot center over 0.9 s and back over 0.8 s on close (instant under reduced motion), and the other real spotlights dim to 30% (EXPERIENCE §6.5).

### 8.6 Vignette and DOM chrome

The vignette is CSS: `.stage::after { content: ''; position: fixed; inset: 0; pointer-events: none; background: radial-gradient(...) }` with values from `tokens.css`. No post-processing passes exist.

---

## 9. Performance budgets

`perf/budgets.json` (R7) is the single source. Every number in PLAN §3 lives here and nowhere else.

```json
{
  "bundles": { "entryJsGzipKB": 110, "museumChunkGzipKB": 350, "exhibitChunkGzipKB": 40 },
  "transfer": { "firstThreeExhibitsMB": 1.2, "fullWalkMB": 4 },
  "render": {
    "drawCalls": { "high": 150, "medium": 80, "low": 80 },
    "triangles": { "desktop": 500000, "mobile": 150000, "perExhibit": 20000 },
    "textureMB": { "desktop": 64, "mobile": 40 }
  },
  "web": { "lcpMs": { "desktop": 2000, "mobile": 2500 }, "cls": 0.02, "clsLhciGate": 0.05 },
  "fps": { "mobileFloor": 30, "mobileTarget": 45 },
  "readyMs": { "desktop": 3000, "mobile": 5000, "level": "warn" }
}
```

| Budget | Limit | How it is measured | Gate |
|---|---|---|---|
| Entry JS | <= 110 KB gzip | `check-budgets.ts` reads `dist/.vite/manifest.json`: the `index.html` entry chunk plus its recursive static `imports`, each gzipped at level 9, summed | build fails |
| Museum chunk | <= 350 KB gzip | the dynamic entry `src/museum/MuseumCanvas.tsx` plus static imports not already in the entry set | build fails |
| Each exhibit chunk | <= 40 KB gzip | each `src/museum/exhibits/<id>/` dynamic entry plus its exclusive static imports | build fails |
| First 3 exhibits | <= 1.2 MB transfer | e2e: fresh context, load `/?test=1`, `goTo('wailo')`, sum `transferSize` of the navigation and all resource entries (serve-dist gzips text, an upper bound on Netlify's brotli) | e2e fails |
| Full walk | <= 4 MB | same, after visiting every stop on every track | e2e fails |
| Draw calls | <= 150 high, <= 80 medium and low | `__MUSEUM__.stats().calls` at every settled stop, with `gl.info.autoReset = false` so the reflector pass is counted | e2e fails |
| Triangles | <= 500k desktop, <= 150k mobile; <= 20k per exhibit | `stats().triangles`; `stats().exhibits[id].triangles` | e2e fails |
| Texture memory | <= 64 MB desktop, <= 40 MB mobile | `stats().textureMB`: sum over unique scene textures and render targets of `w * h * 4 * (mipmaps ? 4/3 : 1)` | e2e fails |
| LCP (the `h1`) | <= 2.0 s desktop, <= 2.5 s mobile | lhci (desktop and mobile configs); a Playwright test asserts the LCP entry's element is the `h1` | lhci error |
| CLS | <= 0.02 | Playwright PerformanceObserver (`layout-shift`, excluding input) from navigation to `ready` on desktop and Pixel 7 | e2e fails at 0.02; lhci fails at 0.05 |
| Mobile frame rate | >= 30 fps floor, 45 target | Not measurable on SwiftShader. G5 manual check: a 3-minute walk on Emeka's phone ([placeholder: phone model]) with `?debug` stays at or above 30 fps in minute 3 | manual |
| `ready` time | <= 3 s desktop, <= 5 s mobile | e2e timing | warning only |

The debug chunk (leva, r3f-perf) is reported but not budgeted, and must never be statically imported by the entry or museum chunk (`check-budgets` fails if leva or r3f-perf code appears in either).

---

## 10. Robustness and fallbacks

### 10.1 WebGL context loss (`quality/contextLoss.ts`, R7)

- `webglcontextlost`: `preventDefault()`, show the DOM veil "Restoring the gallery" (`context-veil`), increment the session loss count.
- `webglcontextrestored`: **remount** `<Canvas>` with a new `key` (`generation + 1`) instead of trusting three's in-place restore (CanvasTextures and troika atlases can come back blank).
- Fallback after **2 losses** in the session, or when a loss is not restored within 5 s: unmount the museum and `location.replace('/resume/#why-context-loss')` on `/` (§5.3); on an exhibit page switch `data-mode` to `classic` so `#story-static` shows.
- An error boundary around the canvas does the same fallback.

### 10.2 Back/forward cache

- `pageshow` with `event.persisted`: if `gl.isContextLost()`, remount (generation + 1); re-read `scrollY` into `progress.target`; `invalidate()`.
- No `unload` or `beforeunload` listeners, and no `Cache-Control: no-store` on HTML, so pages stay bfcache-eligible.

### 10.3 iOS Safari and touch

- Stage `height: 100lvh`, so the URL bar collapsing never resizes the drawing buffer. The stage height is applied through a CSS variable that `MuseumCanvas` updates only when the width changes or, on coarse pointers, when the height changes by 20% or more. Small height-only resizes are ignored.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; HUD and cards pad with `env(safe-area-inset-*)`. Page zoom is never disabled.
- `visibilitychange` to hidden: stop invalidating and pause the exhibit clock; on visible: resume and `invalidate()`.
- The dialog body uses `overscroll-behavior: contain`. No `touch-action: none` anywhere.
- DPR is clamped by tier (iPhones report 3).

### 10.4 Reduced motion

`prefers-reduced-motion: reduce` (live listener): 200 ms fade between stops with no in-between camera poses (§6.5), no idle motion, no parallax, instant dialog dolly, `behavior: 'instant'` for every programmatic scroll.

### 10.5 Other failure modes

- No WebGL2, Save-Data, software renderer: classic (§5.3).
- Museum chunk fails to load (offline, deploy race): fallback notice with links to `/resume/` and `/resume.pdf`.
- An exhibit chunk fails: that slot shows `Placeholder`; the rest of the walk continues.
- JS disabled: `/` shows the hero and all cards; exhibit pages show their story; `<noscript>` explains and links to `/resume/`.
- Browser support for the museum: last 2 versions of Chrome, Edge and Firefox, Safari and iOS 17 or later, WebGL2 required. Everything else gets `/resume/`.

---

## 11. SEO and sharing

Owner: R9 (`src/seo/**`, `src/entry-server.tsx`, `scripts/postbuild.ts`, `scripts/gen-og.ts`).

### 11.1 Prerendered pages

`postbuild.ts` imports `dist-ssr/entry-server.js`, which exports `renderApp(path)`, `renderStory(id)`, `renderClassic()`, `renderNotFound()`, `headTags(route)` and `jsonLd()`. It writes:

| File | Notes |
|---|---|
| `dist/index.html` | hero and every main stop card prerendered; `og:type` `profile` |
| `dist/exhibit/<id>/index.html` (10) | same shell plus `#story-static` (role, organization, dates with duration, Medium tags, bullets, the optional curator's note and the story blocks, takeaway, the object, links, Newer/Older links to sibling pages); `og:type` `article` |
| `dist/resume/index.html` | classic page; zero JS; links the CSS-only build output from the manifest |
| `dist/404.html` | `noindex` |
| `dist/sitemap.xml` | `/`, `/resume/`, the 10 exhibit pages; `lastmod` = build date. The PDF is linked, not listed |
| `dist/robots.txt` | `User-agent: *`, `Allow: /`, `Sitemap: <SITE_URL>/sitemap.xml` (generated because it needs SITE_URL) |
| `dist/_headers` | via `scripts/headers.ts` (§12) |

Every page: `<html lang="en-CA">`, unique `<title>` and `<meta name="description">` (from `exhibit.caption` on exhibit pages), `<link rel="canonical" href="<SITE_URL><path>">` with a trailing slash, Open Graph (`og:title`, `og:description`, `og:url`, `og:image` absolute `<SITE_URL>/og/<id>.png`, `og:image:width` 1200, `og:image:height` 630, `og:site_name`) and `twitter:card` `summary_large_image`. Internal links always use the trailing-slash form.

### 11.2 OG images (`scripts/gen-og.ts`, `npm run og`)

Playwright (Chromium, no WebGL needed) renders `src/seo/OgCard.tsx` (gallery colors, Instrument Serif title, name, role, organization, dates) at 1200x630 for each exhibit plus `home` and `resume`, writing `public/og/<id>.png` and `public/og/manifest.json` (a hash of each card's input strings). The PNGs are committed. A unit test fails with "run npm run og" when the hashes no longer match the content, and checks every image is 1200x630 (sharp metadata).

### 11.3 JSON-LD Person (`src/seo/jsonLd.ts`)

On `/` and `/resume/`: `@type: Person`, `name`, `alternateName` (preferred name), `url` (SITE_URL), `image` (headshot URL), `jobTitle` and `worksFor` (Organization) **only while the work entry `isCurrent`**, `alumniOf` (CollegeOrUniversity: the education institution), `address` (`addressLocality`, `addressRegion`, `addressCountry: 'CA'` from `contact.location`), `sameAs` (LinkedIn, GitHub), `knowsAbout` (skills). **No `email` and no `telephone`.** `jsonLd.test.ts` asserts both keys are absent and the phone pattern does not appear.

### 11.4 Icons and language

`public/favicon.svg` (brass monogram, design from R2), `public/favicon-32.png`, `public/apple-touch-icon.png` (180 px). No web manifest. `lang="en-CA"` on every page.

### 11.5 Acceptance

Lighthouse SEO >= 0.95 on `/`, `/resume/` and one exhibit page; every exhibit page shows its story with JS off; every `og:title` is unique.

---

## 12. Security headers and CSP

### 12.1 `_headers` (generated by `scripts/headers.ts`, R10, called from postbuild)

Netlify reads `dist/_headers`. `netlify.toml` contains only `[build] publish = "dist"` and **no** `[[headers]]` blocks, so there is one source of headers. No header name appears in two rules whose paths overlap (Netlify merges overlapping rules); a unit test enforces this.

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-<BOOT_HASH>'; worker-src 'self' blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/
  Cache-Control: public, max-age=0, must-revalidate
/index.html
  Cache-Control: public, max-age=0, must-revalidate
/exhibit/*
  Cache-Control: public, max-age=0, must-revalidate
/resume/*
  Cache-Control: public, max-age=0, must-revalidate
/resume.pdf
  Cache-Control: public, max-age=0, must-revalidate
  Content-Disposition: inline; filename="Chukwuemeka-Nduka-Nwagbo-Resume.pdf"
/404.html
  Cache-Control: public, max-age=0, must-revalidate
```

- `BOOT_HASH` is the base64 SHA-256 of the exact text between `<script>` and `</script>` of the inline boot script in the final `dist/index.html`. Postbuild asserts every built HTML file with an inline executable script uses exactly that text, and that no other inline script or `on*=` attribute exists. JSON-LD (`type="application/ld+json"`) is a data block, not executed, and needs no hash.
- `worker-src blob:` is for troika's blob workers. `style-src 'unsafe-inline'` covers React style attributes and leva in `?debug`.
- `'wasm-unsafe-eval'` is not present; add it only if a GLB with meshopt ever ships (not in v1).
- Only `/assets/*` (hashed file names) is immutable. HTML, the PDF, OG images and fonts in `public/` revalidate.
- Preview deploys append `X-Robots-Tag: noindex` under `/*` before uploading (§14.3).

### 12.2 `serve-dist` (`scripts/serve-dist.ts`, R10)

A dependency-free `node:http` server used by `npm run preview`, Playwright and lhci. It serves `dist/`, parses `_headers` with Netlify path rules (`*` splat), applies every matching rule, gzips text responses when `Accept-Encoding` allows, maps `/x/` and `/x` to `x/index.html`, answers unknown paths with `404.html` and status 404, reads `--port` or `PORT` (default 4173), and prints `serve-dist listening on http://localhost:<port>`.

### 12.3 Tests

- Every HTML response from serve-dist carries the CSP (e2e).
- A fixture registers `document.addEventListener('securitypolicyviolation', ...)` via `addInitScript`, and every spec fails if it fired (§13.5).
- The cross-origin request guard fails any spec that requests another origin (§13.5).
- `deploy.yml` smoke against the preview URL asserts `data-mode="museum"` (with `?test=1`) and the CSP header (§14.3).

### 12.4 Secrets

- `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` are GitHub repository secrets, used only in `deploy.yml` and `scheduled.yml`.
- `RESUME_PHONE` exists only in Emeka's shell or the gitignored `.env.local`. It is never a CI secret.

### 12.5 `check-copy` (`scripts/check-copy.ts`, R10)

Always: no U+2014 in any git-tracked text file or in `dist/` (the script spells the character as `'\u2014'`), and no phone pattern in tracked files (except `package-lock.json`) or `dist/` (including unpdf text of `dist/resume.pdf`). With `RELEASE=1`: no `draft: true` in the parsed content and no `[placeholder` in content or `dist/`.

---

## 13. Testing strategy

### 13.1 Unit tests (vitest 5, Node environment)

`vitest.config.ts` (R10) defines two projects: `unit` (`src/**/*.test.ts`, `scripts/**/*.test.ts`) and `pdf` (`tests/pdf/**/*.test.ts`, needs a built `dist/`). `npm test` runs `unit`; `npm run test:pdf` runs `pdf`.

| Suite | Owner | Covers |
|---|---|---|
| `src/content/*.test.ts` | R1 | parse, normalize parity, newest-first, unique and reserved ids, ids equal `EXHIBIT_IDS`, wings resolve, no U+2014 in any string (deep walk), no phone pattern, every work entry has a printed bullet, `formatRange`, `duration` values (§3.5), `isCurrent` at 2026-10-15 and 2027-01-05, `checkTemporal` failing at 2027-01-05 |
| `src/museum/rail/*.test.ts` | R4 | layout snapshot (§6.6), door midpoint and wing move, year marks, `u` monotonic, `poseAt` continuous, scroll mapping clamps and piecewise math |
| `src/museum/environment/*.test.ts` | R3 | rail clearance against room walls (WP-24), light plan and recipe, 3D label legibility (projected cap height) |
| `src/app/routes.test.ts` | R4 | `parsePath`, `exhibitPath`, `deriveUi`, every row of the history table as a pure transition |
| `src/app/boot.test.ts` | R6 | the mode decision table (§5.3) |
| `src/museum/quality/tiers.test.ts` | R7 | the tier table (§8.4) |
| `src/museum/exhibits/_kit/registry.test.ts` | R3 | folder ids, manifest ids, budgets |
| `src/design/*.test.ts` | R2 | text contrast >= 4.5:1 for every text and background token pair |
| `src/seo/*.test.ts` | R9 | JSON-LD keys, unique titles, OG manifest freshness |
| `scripts/*.test.ts` | script owner | `_headers` generation and overlap rule, manifest chunk accounting, tex escaping |

### 13.2 Playwright configuration (`playwright.config.ts`, R8)

- `testDir: 'tests/e2e'`, `retries: 0`, `workers: process.env.CI ? 2 : 1`, `timeout: 60_000`, `expect.timeout: 15_000`, `reporter: [['list'], ['html', { open: 'never' }]]`, `use.trace: 'retain-on-failure'`.
- `use.baseURL = process.env.BASE_URL ?? 'http://localhost:' + (process.env.PORT ?? 4173)`. When `BASE_URL` is unset, `webServer: { command: 'npx tsx scripts/serve-dist.ts --port ' + PORT, url: baseURL, reuseExistingServer: !process.env.CI }`. Parallel worktrees use `PORT=4173+N`.
- SwiftShader flags on every WebGL project: `launchOptions.args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']`, `channel: 'chromium'` (full binary, new headless).

| Project | Device | Notes |
|---|---|---|
| `desktop` | `devices['Desktop Chrome']`, viewport 1440x900 | SwiftShader flags |
| `pixel7` | `devices['Pixel 7']` | touch, SwiftShader flags |
| `pixel7-landscape` | `devices['Pixel 7 landscape']` | SwiftShader flags |
| `no-webgl` | `devices['Desktop Chrome']`, args `['--disable-3d-apis']` | expects the classic path |
| `firefox-dom`, `webkit-dom` (WP-32, CI only) | Desktop Firefox, Desktop Safari | `grep: /@dom/` only: DOM, classic and no-WebGL specs; non-blocking |

Tags: `@smoke`, `@visual`, `@a11y`, `@dom`.

### 13.3 Test hook (`src/app/testHooks.ts`, R4)

Enabled only by `?test=1` (any build). `?test=1` also freezes the exhibit clock, seeds all noise, disables idle motion (re-enabled by `&idle=1`, used only by WP-16's idle-stop test), parallax, the onboarding hint's fade and PerformanceMonitor, fixes DPR at 1 and fixes the tier at `medium` (override with `&tier=`).

```ts
interface MuseumTestHook {
  ready: boolean;
  settled: boolean;
  stop: StopId;
  goTo(id: StopId, opts?: { instant?: boolean }): Promise<void>; // resolves when settled at id; switches tracks via the real enter/exit path, including the wing history entry (§6.7)
  screenPos(id: ExhibitId): { x: number; y: number } | null;    // client CSS px of the hit-box center; null if not mounted or off-screen
  stats(): {
    calls: number; triangles: number; geometries: number; textures: number; programs: number;
    textureMB: number; frames: number; dpr: number; tier: QualityTier; track: TrackId;
    mounted: ExhibitId[];
    exhibits: Partial<Record<ExhibitId, { triangles: number; drawCalls: number; inBounds: boolean }>>;
    camera: { position: [number, number, number]; target: [number, number, number] };
    progress: { target: number; current: number };
  };
}
declare global { interface Window { __MUSEUM__?: MuseumTestHook } }
```

`StatsProbe` sets `gl.info.autoReset = false`, resets at the start of each frame and reads after render, so `calls` includes the reflector pass; `frames` counts rendered frames.

### 13.4 Definition of `ready` and `settled`

`ready` becomes true once, when all of these hold: every Suspense boundary in the scene has resolved (`ReadySignal` sits inside the outer Suspense), `textPending === 0` (every mounted troika text has synced), `compilePending === 0` (every exhibit within distance 2 has finished `compileAsync` and been revealed, as have the environment and floor), and then **2 more frames** have rendered. `settled` is defined in §6.3. Helpers: `waitForMuseum(page)` = `page.waitForFunction(() => window.__MUSEUM__?.ready === true)`; `goToStop(page, id)` = `goTo(id, { instant: true })` then wait for `settled && stop === id`.

### 13.5 Global fixture (`tests/e2e/fixtures.ts`)

Every spec automatically fails on: a `console` message of type `error`; a `pageerror`; any `securitypolicyviolation` event; any request whose origin is not the base URL's origin (`data:` and `blob:` are allowed). Under `@smoke` it also checks the CSP header on the document response.

### 13.6 Visual baselines

- **Generated and compared in CI only** (SwiftShader output varies by CPU). Locally, `@visual` specs skip unless `VISUAL_LOCAL=1`, and local diffs are advisory.
- `expect(page).toHaveScreenshot(name, { maxDiffPixelRatio: 0.02, animations: 'disabled', caret: 'hide', mask: [page.getByTestId('dialog-duration')] })`. Durations of ongoing roles change monthly, hence the mask.
- Canvas baselines: one per stop (10 main + 4 wing items) on `desktop` and `pixel7`, at `?test=1` (tier medium). DOM screenshots (dialogs, `/resume/`, 404) mask the canvas.
- Rebaselining: run `ci.yml` by `workflow_dispatch` with `update-baselines: true`; the e2e job runs `npx playwright test --grep @visual --update-snapshots` and uploads `tests/e2e/__screenshots__/` as an artifact; R8 commits it as `test(visual): rebaseline <stops> for <WP or F-###>`.

### 13.7 Accessibility

`@axe-core/playwright` `new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])` with **0 violations** on: `/` at the lobby, `/` at a door stop, the open dialog, a cold `/exhibit/verafin/`, `/resume/` (light and dark emulated), `/404.html`, and the `no-webgl` path. A keyboard-only spec reaches every story in reading order with Tab and Enter. The canvas is `aria-hidden`; the live region announces only keyboard and HUD moves.

### 13.8 Lighthouse CI

`lighthouserc.cjs` (mobile, default emulation) and `lighthouserc.desktop.cjs` (`preset: 'desktop'`), owned by R10:

```js
const { chromium } = require('@playwright/test');
module.exports = { ci: {
  collect: {
    startServerCommand: 'npx tsx scripts/serve-dist.ts --port 4180',
    startServerReadyPattern: 'serve-dist listening',
    url: [
      'http://localhost:4180/?test=1&mode=museum',
      'http://localhost:4180/exhibit/verafin/?test=1&mode=museum',
      'http://localhost:4180/resume/',
    ],
    numberOfRuns: 3,
    chromePath: process.env.CHROME_PATH || chromium.executablePath(),
    settings: { chromeFlags: '--headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist' },
  },
  assert: { assertMatrix: [ /* below */ ] },
  upload: { target: 'filesystem', outputDir: '.lighthouseci' },
} };
```

| URL | Errors (hard) | Warnings |
|---|---|---|
| `/` and the exhibit page | `categories:accessibility >= 0.95`, `categories:seo >= 0.95`, `largest-contentful-paint <= 2500` (mobile) / `<= 2000` (desktop), `cumulative-layout-shift <= 0.05` | `categories:performance >= 0.8`, `categories:best-practices >= 0.9`, `total-blocking-time <= 300` |
| `/resume/` | `categories:performance >= 0.95`, `categories:accessibility >= 0.95`, `categories:seo >= 0.95`, `categories:best-practices >= 0.9` | |

Before lhci, the lighthouse job runs `tests/e2e/lh-precheck.spec.ts` with the same flags: it asserts `document.documentElement.dataset.mode === 'museum'` and `__MUSEUM__.ready` on `/?test=1&mode=museum`. If the museum is not what Lighthouse would score, the job fails.

### 13.9 Spec list (grows by WP)

boot without errors or CSP violations (`@smoke`); recruiter fast path at 360x640 and 390x844 with JS on and off; LCP element is the `h1`; CLS <= 0.02; stop order by native keys; wheel stream and notches; Pixel 7 flick; no non-passive wheel or touchmove listeners; zero URL writes on stop arrivals; click at `screenPos('verafin')` opens the dialog, Esc closes it and returns focus; open verafin, Older x3 (klarup, finance-tracker, mysa), Back closes; cold `/exhibit/verafin/` then close lands on `/` on the same origin; wing enter, Esc and Back return to the door; reduced motion has no in-between poses; no-WebGL lands on `/resume/#why-no-webgl2` with the banner and the classic content; two forced context losses on `/` land on `/resume/#why-context-loss`; forced context loss via `WEBGL_lose_context` recovers (canvas center luminance above a floor and `stats().textures > 0`); bfcache `goBack()` renders; frames stop advancing 16 s after the last input; shader program count stable from 0.5 s to 3 s after arrival; budgets at every stop; 20 loops through all stops with 0 page errors (WP-32); 3D label projected cap height >= 14 CSS px from its stop camera (a unit test of the projection math in `src/museum/environment`, WP-11); HUD and cards never intersect on Pixel 7 (WP-27).

### 13.10 PDF tests

See §4.6. They run in the CI `build` job after `npm run build`.

---

## 14. CI/CD and deploy

All workflows (R10) use `ubuntu-24.04`, `actions/checkout@v4`, `actions/setup-node@v4` with `node-version-file: .nvmrc` and `cache: npm`, then `npm ci`. Playwright browsers in CI: `npx playwright install --with-deps chromium`, cached under `~/.cache/ms-playwright` keyed on the `@playwright/test` version.

### 14.1 `ci.yml`

Triggers: `pull_request`; `push` to `main` and `claude/**`; `workflow_dispatch` with input `update-baselines` (boolean). `concurrency: ci-${{ github.ref }}` with cancel-in-progress. `permissions: contents: read`. `RELEASE=1` is set for runs on `main`.

| Job | Needs | Steps |
|---|---|---|
| `verify` | | `npm run lint`, `npm run typecheck`, `npm test`, `npm run check:copy`, `npx tsx scripts/build-resume-tex.ts && git diff --exit-code resume/resume.tex` |
| `build` | verify | install Chromium; `npm run build` (content check, client and SSR build, prerender, `_headers`, the one-page PDF gate, `.tex`, budgets, `check-copy --dist`); `npm run test:pdf`; `pdftoppm -png -r 110 dist/resume.pdf out/resume-preview`; upload artifacts `dist` and `resume-preview` |
| `e2e` | build | download `dist`; install Chromium; `npm run e2e`, `npm run a11y`, `npm run visual` (or the rebaseline variant); upload `playwright-report/` and `test-results/` on failure |
| `lighthouse` | build | download `dist`; install Chromium; `CHROME_PATH=$(node -p "require('@playwright/test').chromium.executablePath()")`; lh-precheck spec; `npm run lh`; upload `.lighthouseci/` |
| `latex` | verify | §4.5 |
| `e2e-xbrowser` (WP-32) | build | `npx playwright install --with-deps firefox webkit`; `--project=firefox-dom --project=webkit-dom`; `continue-on-error: true` |

### 14.2 Hosting

Netlify on a free `*.netlify.app` subdomain. Netlify Git builds are turned off; Netlify only serves the `dist/` that CI built and tested, so the Netlify image never needs Chromium. `netlify.toml`: `[build] publish = "dist"`. The site and `NETLIFY_SITE_ID` are created in WP-18 through the Netlify connector; Emeka creates `NETLIFY_AUTH_TOKEN` and adds it as a repository secret.

### 14.3 `deploy.yml`

- Trigger: `workflow_run` of `ci` with `types: [completed]`; runs only when `conclusion == 'success'` and `head_repository.full_name == github.repository`. `permissions: contents: read, actions: read, pull-requests: write`.
- Checks out `workflow_run.head_sha`, `npm ci`, downloads the `dist` artifact from that run (`actions/download-artifact@v4` with `run-id` and `github-token`).
- Alias: `pr-<number>` for pull requests; otherwise the branch name lowercased, non `[a-z0-9]` replaced with `-`, trimmed to 37 characters (netlify-cli's limit), no trailing `-`.
- Preview (any branch except `main`): append `X-Robots-Tag: noindex` under `/*` in `dist/_headers`, then
  `npx --yes netlify-cli@27.12.1 deploy --no-build --dir=dist --alias="$ALIAS" --message="$SHA" --json` with `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` from secrets (netlify-cli reads both from the environment). Parse `deploy_url`; comment it on the PR with `gh pr comment`.
- Production (`main`): `npx --yes netlify-cli@27.12.1 deploy --no-build --dir=dist --prod --message="$SHA" --json`, in a GitHub `environment: production`.
- Then `BASE_URL=<deploy url> npx playwright test --grep @smoke --project=desktop` (museum mode with `?test=1`, CSP header present, no CSP violations, `/resume.pdf` responds).

### 14.4 `scheduled.yml` (weekly)

- `schedule: cron: '23 9 * * 1'` (Mondays 09:23 UTC) plus `workflow_dispatch`. `permissions: contents: read, issues: write`.
- Job `rebuild`: check out `main`, `RELEASE=1 npm run build` (fails if a tense flag is stale, §3.6), `npm run test:pdf`, smoke e2e against local `dist`, then deploy `--prod --no-build` so `current` flags and durations refresh.
- Job `production-checks` (needs `rebuild`): read `SITE_URL` (§3.1); `BASE_URL=$SITE_URL npx playwright test --grep @smoke --project=desktop`; `curl -sSf "$SITE_URL/resume.pdf" -o prod.pdf` and assert `pdfinfo prod.pdf` reports 1 page; `npx tsx scripts/check-links.ts --base "$SITE_URL"` (external links from `dist/`; LinkedIn's bot status 999 is a warning).
- On any failure: `gh issue create` (or comment on the open issue labeled `scheduled-check`) with the run link.

### 14.5 Dependabot (`.github/dependabot.yml`)

- `npm`, weekly. Group `3d-stack`: `three`, `@types/three`, `@react-three/*`, `react`, `react-dom`, `@types/react`, `@types/react-dom`, `troika-three-text`, `maath` (their peer caps move together). Group `lint`: `eslint`, `@eslint/*`, `typescript-eslint`, `eslint-plugin-*`, `globals`, `prettier`. Group `test`: `vitest`, `@axe-core/playwright`, `@lhci/cli`.
- Ignore `@playwright/test` (bumped only with a new container image) and `typescript` versions `>=6.1` (until typescript-eslint's peer range allows them).
- `github-actions`, weekly, one group.
- Any Dependabot PR must pass the full `ci.yml`; R10 merges.

---

## 15. Developer ergonomics

### 15.1 Debug mode (`?debug`, R7)

`?debug` lazy-loads `src/museum/debug/Debug.tsx` (its own chunk; never imported statically):
- leva panel: tier override (sets `?tier=` and reloads, because the tier is fixed per session), a progress slider, `railSmoothTime`, spotlight and light-pool intensities, reflector mix, toggles for stop markers, slot bounds boxes (`Box3Helper`) and the rail curve line.
- r3f-perf `<Perf position="top-left" />`: calls, triangles, GPU time, programs.
- `F` toggles a free OrbitControls camera that detaches `CameraRig` (debug-only key).
- `?tier=` and `?test=1` also work without `?debug`.

### 15.2 npm scripts (`package.json`, R10)

| Script | Command | What it does |
|---|---|---|
| `dev` | `vite` | Dev server on 5173, no CSP |
| `build` | `tsx scripts/check-content.ts && vite build && vite build --ssr src/entry-server.tsx --outDir dist-ssr && tsx scripts/postbuild.ts && npm run resume && tsx scripts/check-budgets.ts && tsx scripts/check-copy.ts --dist` | Full production build with every gate |
| `preview` | `tsx scripts/serve-dist.ts` | Serves `dist/` with `_headers` on 4173 (never `vite preview`, which ignores `_headers`) |
| `lint` | `eslint . && prettier --check .` | |
| `format` | `prettier --write .` | |
| `typecheck` | `tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit` | |
| `test` | `vitest run --project unit` | Colocated unit tests |
| `test:pdf` | `vitest run --project pdf` | §4.6, needs `dist/` |
| `verify` | `npm run lint && npm run typecheck && npm test` | Pre-merge minimum |
| `e2e` | `playwright test --grep-invert "@visual\|@a11y"` | Functional e2e (builds nothing; run `npm run build` first) |
| `visual` | `playwright test --grep @visual` | Screenshot baselines (CI-only comparison, §13.6) |
| `a11y` | `playwright test --grep @a11y` | axe and keyboard specs |
| `lh` | `lhci autorun --config=lighthouserc.cjs && lhci autorun --config=lighthouserc.desktop.cjs` | Lighthouse CI, mobile then desktop |
| `review` | `tsx scripts/review/capture.ts` | WP-34 capture run into `review/runs/<date>/` |
| `resume` | `tsx scripts/build-resume-pdf.ts && tsx scripts/build-resume-tex.ts` | Public PDF to `dist/resume.pdf` and `resume/resume.tex` |
| `resume:private` | `tsx scripts/build-resume-pdf.ts --private` | `out/private/resume.pdf` and `.tex` with the phone from `RESUME_PHONE` |
| `new:exhibit` | `tsx scripts/new-exhibit.ts` | `npm run new:exhibit -- <id>` scaffolds `src/museum/exhibits/<id>/` |
| `og` | `tsx scripts/gen-og.ts` | Regenerates `public/og/*.png` |
| `media` | `tsx scripts/build-media.ts` | Headshot crops and formats into `public/images/` |
| `check:copy` | `tsx scripts/check-copy.ts` | §12.5 (add `RELEASE=1` for release mode) |
| `check:budgets` | `tsx scripts/check-budgets.ts` | §9 bundle budgets on an existing `dist/` |
| `check:glyphs` | `tsx scripts/check-glyphs.ts` | §8.3 |
| `fonts` | `tsx scripts/subset-fonts.ts` | WP-28: subset woff2 (DOM) and woff (troika) files into `public/fonts/` |

Until the work package that implements a script lands, its file is a stub that prints `not implemented yet (WP-xx)` and exits 0, and the Playwright and lhci scripts call `node scripts/not-implemented.mjs WP-xx` (WP-01 stub convention; `OWNERS.json` lists which WP may set each key under `packageJsonScripts`).

In the table, `\|` only escapes the Markdown pipe. The real `e2e` command is `playwright test --grep-invert "@visual|@a11y"`.

### 15.3 Adding an experience (full runbook: `docs/CONTENT_UPDATE.md`, written in WP-35)

1. Append the new short id to `EXHIBIT_IDS` in `src/content/ids.ts` (never rename an existing id).
2. Add the entry at the top of `experiences` in `src/content/resume.ts`: role, organization, dates, `tense: 'present'`, location, bullets with `print`, `priority` and `draft: true`, and the exhibit (title, caption, story, curator's note, tags). When the previous role's end date passes, rewrite its bullets in past tense and set `tense: 'past'` (the build forces this).
3. `npm test`: schema, order, ids, em dashes, durations and tense checks.
4. The new stop shows `Placeholder` automatically, and every later main stop moves 12 m down the aisle. R4 updates the layout snapshot (`npx vitest run --project unit -u src/museum/rail`) in a separate commit after reviewing the diff.
5. `npm run new:exhibit -- <id>` scaffolds the exhibit folder (manifest, component stub, README with bounds and budget); an R5 builder fills it per a brief.
6. `npm run build`. If the PDF overflow gate fails, set `print: false` on the named candidates or trim text, then rebuild. Commit the regenerated `resume/resume.tex`.
7. `npm run og` and commit the new OG image.
8. CI rebaselines the changed stops (R8), R11 runs one review round, then deploy.
9. `RELEASE=1 npm run check:copy` must pass before production: Emeka approves the new copy and the drafts are cleared.

### 15.4 Conventions

- Components in PascalCase `.tsx`; logic in camelCase `.ts`; tests next to the source as `*.test.ts`.
- The root `tsconfig.json` is a solution file (`files: []`, references to `tsconfig.app.json` and `tsconfig.node.json`) that also sets `compilerOptions.jsx: "react-jsx"`, because `tsx` reads the root config when scripts import `.tsx` files (print template, OG card, entry-server). Both project configs use `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, `module: "esnext"`, `moduleResolution: "bundler"`.
- CSS Modules plus `src/design/tokens.css` custom properties for the app; plain prefixed CSS (`.cv-*` for the classic page, `.pr-*` for print) where markup is rendered outside Vite's CSS pipeline.
- Colors, motion durations, camera and render constants are read from `src/design/tokens.ts` and `tokens.css` by name. Token names are frozen; R2 tunes values.
- No em dashes (U+2014) anywhere: code, copy, comments, docs or commit messages.
- Commits: conventional message, blank line, `WP: WP-xx`, then the session attribution lines (see `CLAUDE.md`).
