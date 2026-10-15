# CLAUDE.md: operating guide for agent sessions

## What this project is

Personal website of Chukwuemeka (Emeka) Nduka-Nwagbo: a 3D modern-gallery aisle called **"Commit History"**. Each exhibit is one job, newest first (Nasdaq Verafin, Mysa, Wailo, CFIA), with optional Projects and Volunteer wings, then Education, Certifications and a front desk. One typed content file (`src/content/resume.ts`) also generates a zero-JS classic page (`/resume/`), a one-page PDF (`/resume.pdf`) and an Overleaf file (`resume/resume.tex`). Built by specialist agents (roles R0 to R11) in work packages (WP-xx). Integration branch: `claude/intelligent-sagan-poq45q`. `main` is untouched until launch.

## Where the specs live (read your brief first, then what it cites)

| File | Contents |
|---|---|
| `docs/PLAN.md` | Approved master plan, roles, milestones, gates. Its Addendum is binding. **Wins every conflict** |
| `docs/spec/EXPERIENCE.md` | Concept, coordinates, stops and tracks, exhibit concepts, motion, art direction, mobile, accessibility |
| `docs/ARCHITECTURE.md` | Stack pins, repo layout and ownership, content schema, resume pipeline, routes, rail, rendering, budgets, tests, CI |
| `docs/CONTENT_DRAFT.md` | Resume text and museum copy, with placeholders and draft flags |
| `docs/ART_DIRECTION.md` | Tokens, lighting recipe, material library, review rubric (WP-05) |
| `docs/wp/WP-xx.md` | Your brief: goal, inputs, owned globs, forbidden paths, commands, acceptance, `report.json` output |
| `docs/CONTENT_UPDATE.md` | Content update runbook and dated checklist (written in WP-35) |

## Stack (exact pins in ARCHITECTURE §1)

- npm only: `package-lock.json`, `npm ci`. Node 22.22.0 (`.nvmrc`).
- vite 8.3.4, @vitejs/plugin-react 6.1.2, react and react-dom ~19.3.1 (R3F needs <19.4), typescript ~6.0.3 (typescript-eslint needs <6.1).
- three ~0.186.1, @react-three/fiber 9.8.2, @react-three/drei 10.7.9, zustand 5.0.15, maath 0.10.8, wouter 3.13.0.
- zod 4.6.7 at build and test time only (`import type` in client code).
- vitest 5.0.4, **@playwright/test 1.56.1 exactly**, @axe-core/playwright 4.13.0, @lhci/cli 0.15.1 (no standalone lighthouse).
- Fonts: @fontsource/instrument-serif and @fontsource/ibm-plex-sans 5.3.0, self-hosted (woff2 for the DOM, woff for troika).
- leva and r3f-perf only in the lazy `?debug` chunk. netlify-cli 27.12.1 only via `npx` in CI, always with `--no-build`.
- Not used: postprocessing, GLB or meshopt pipelines, detect-gpu, audio, analytics, hash routes, drei ScrollControls.

## Commands

```sh
npm ci                     # install exactly the lockfile
npm run dev                # Vite dev server (no CSP)
npm run verify             # lint + typecheck + unit tests: run before every commit
npm test                   # unit tests only (vitest project 'unit')
npm run build              # content check, client + SSR build, prerender, _headers, PDF gate, .tex, budgets, check-copy
npm run preview            # serve dist/ with _headers on :4173 (never `vite preview`)
npm run e2e                # Playwright functional specs (needs a build)
npm run a11y               # axe + keyboard specs
npm run visual             # screenshot specs (baselines are compared in CI only)
npm run test:pdf           # PDF checks on dist/resume.pdf
npm run lh                 # Lighthouse CI, mobile and desktop
npm run resume             # dist/resume.pdf (no phone) + resume/resume.tex
npm run resume:private     # out/private/resume.pdf with RESUME_PHONE (local only)
npm run new:exhibit -- <id>
npm run check:copy         # em dashes and phone pattern; RELEASE=1 also blocks drafts and placeholders
npm run check:budgets      # bundle budgets from perf/budgets.json
npm run check:glyphs       # every 3D label glyph exists in the .woff troika uses
npm run og                 # regenerate public/og/*.png from content
npm run media              # headshot crops and textures into public/images/
npm run review             # review capture run into review/runs/<date>/ (WP-34)
```

Until the work package that implements a script lands, the script is a stub that prints `not implemented yet (WP-xx)` and exits 0. The full table is ARCHITECTURE §15.2.

Test URLs always include `?test=1` (frozen clock, seeded noise, no idle motion unless `&idle=1`, DPR 1, tier medium unless `&tier=`), plus `&mode=museum` where the boot script would otherwise choose classic. The test hook is `window.__MUSEUM__ = { ready, settled, stop, goTo(id, { instant }), screenPos(id), stats() }`.

## Environment notes

- `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` holds Chromium revision 1194 (141.0.7390.37). **Never run `npx playwright install` locally** and never change the `@playwright/test` version. CI installs its own browsers.
- Headless WebGL needs `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`. The boot script treats SwiftShader as a software renderer and sends it to `/resume/` unless the URL has `?test=1`.
- **unpkg is blocked** by the container proxy, and the CSP is self-only: fonts and every other asset come from npm packages or the repo. No CDN URLs anywhere.
- Firefox, WebKit and LaTeX are not installed locally. Cross-browser DOM specs and the `resume.tex` compile run in CI. `pdfinfo` and `pdftotext` exist at `/usr/bin`.
- Parallel worktrees run Playwright on `PORT=4173+N`.
- Do not install packages unless your brief makes you R10. Put dependency needs in `report.json` under `depsRequest`.

## Hard rules

1. **No em dashes (U+2014) anywhere**: code, comments, copy, docs, test names, commit messages. Use commas, colons, parentheses or hyphens. En dashes are only for date ranges (`Sep 2026 – Dec 2026`). Code that must detect the character writes it as `'\u2014'`.
2. **Never commit the phone number.** It exists only in `RESUME_PHONE` (shell or the gitignored `.env.local`) and is read only by `npm run resume:private`. The repo, the site, `dist/` and logs never contain it.
3. **Never invent facts about Emeka**: no made-up dates, metrics, technologies, team sizes or employer internals. Unknowns are written `[placeholder: ...]`. First-person and unconfirmed copy carries `draft: true`. `RELEASE=1 npm run check:copy` blocks release while either remains.
4. **Ownership.** Write only the paths your role owns in `OWNERS.json` and your brief's globs; read anything. Colocated unit tests (`*.test.ts` next to the source) belong to that folder's owner. R8 owns `tests/**` and `playwright.config.ts`. Each WP writes its own report at `review/reports/WP-xx.json` (schema in `docs/wp/_TEMPLATE.md`). Never edit another role's paths; ask R0 in `report.json` instead.
5. **Frozen contracts** (tag `contracts-v1`): content schema and ids, exhibit manifest and props types, store shape, test hook type, test ids (`src/app/testIds.ts`), route table and history transitions, token names, layout output type. Changes go through R0.
6. **Input is native page scroll.** No `wheel` or `touch*` listeners, no `touch-action: none`, no scroll hijacking. Only Enter and Esc are custom keys. Stop arrivals never write the URL. No hash routes.
7. **All readable text lives in the DOM.** 3D text is only for big labels, using the self-hosted `.woff` fonts.
8. **Exhibits** (`src/museum/exhibits/<id>/`): one sculptural object, at most one slow motion, at most 20k triangles, shared material library only, no lights, no logos, fits its slot bounds (the 0.65 m standard case; MUN and the certifications wall vitrine have their own slot variants, EXPERIENCE §5.3). ESLint enforces the import and syntax rules.
9. **Budgets** live in `perf/budgets.json` and are enforced in CI. Never raise one without an R0 ruling.
10. Never run git commands that change shared state (push, merge, rebase onto the integration branch, tag) unless your brief says so. R0 merges.

## Commit format

Small, conventional commits. Every commit ends with the WP trailer and the attribution lines, as one trailer block:

```
feat(rail): map measured section offsets to rail progress

WP: WP-09
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016CcKJFMWCyXKspJx4YvMS7
```

Review fixes use `fix(F-###): ...` with `WP: F-###`. Screenshot rebaselines are R8 commits: `test(visual): rebaseline <stops> for <WP or F-###>`.

## Updating content

Follow `docs/CONTENT_UPDATE.md` (WP-35) and ARCHITECTURE §15.3. In short: edit `src/content/resume.ts` (and `src/content/ids.ts` for a new id), run `npm test`, then `npm run build` (the one-page PDF gate never drops bullets for you; set `print: false` on the named candidates), commit the regenerated `resume/resume.tex`, run `npm run og`. Dated reminders: Jan 2027 Verafin moves to past tense (the build fails until it does); May 2027 the degree is no longer "expected"; the @mun.ca address may lapse after graduation.
