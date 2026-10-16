# Commit History

The personal website of Chukwuemeka (Emeka) Nduka-Nwagbo: a 3D modern-gallery aisle called "Commit History". Each exhibit is one job, newest first, followed by optional Projects and Volunteer wings, then Education, Certifications and a front desk. One typed content file (`src/content/resume.ts`) also generates a zero-JS classic page (`/resume/`), a one-page PDF (`/resume.pdf`) and an Overleaf file (`resume/resume.tex`).

## Requirements

- Node 22.22.0 (pinned in `.nvmrc`; `package.json` requires `>=22.13.0`).
- npm only. The lockfile is committed; install with `npm ci`.

```sh
npm ci
npm run dev
```

## Commands

Until the work package that implements a script lands, the script prints `not implemented yet (WP-xx)` and exits 0. The one exception is `fonts`: WP-28 adds that key to `package.json`, so until then `npm run fonts` fails with "Missing script".

| Script           | Command                                                                                                                                                                                                                   | What it does                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `dev`            | `vite`                                                                                                                                                                                                                    | Dev server on 5173, no CSP                                                              |
| `build`          | `tsx scripts/check-content.ts && vite build && vite build --ssr src/entry-server.tsx --outDir dist-ssr && tsx scripts/postbuild.ts && npm run resume && tsx scripts/check-budgets.ts && tsx scripts/check-copy.ts --dist` | Full production build with every gate                                                   |
| `preview`        | `tsx scripts/serve-dist.ts`                                                                                                                                                                                               | Serves `dist/` with `_headers` on 4173 (never `vite preview`, which ignores `_headers`) |
| `lint`           | `eslint . && prettier --check .`                                                                                                                                                                                          |                                                                                         |
| `format`         | `prettier --write .`                                                                                                                                                                                                      |                                                                                         |
| `typecheck`      | `tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit`                                                                                                                                                 |                                                                                         |
| `test`           | `vitest run --project unit`                                                                                                                                                                                               | Colocated unit tests                                                                    |
| `test:pdf`       | `vitest run --project pdf`                                                                                                                                                                                                | PDF checks, needs `dist/`                                                               |
| `verify`         | `npm run lint && npm run typecheck && npm test`                                                                                                                                                                           | Pre-merge minimum                                                                       |
| `e2e`            | `playwright test --grep-invert "@visual\|@a11y"`                                                                                                                                                                          | Functional e2e (builds nothing; run `npm run build` first)                              |
| `visual`         | `playwright test --grep @visual`                                                                                                                                                                                          | Screenshot baselines (compared in CI only)                                              |
| `a11y`           | `playwright test --grep @a11y`                                                                                                                                                                                            | axe and keyboard specs                                                                  |
| `lh`             | `lhci autorun --config=lighthouserc.cjs && lhci autorun --config=lighthouserc.desktop.cjs`                                                                                                                                | Lighthouse CI, mobile then desktop                                                      |
| `review`         | `tsx scripts/review/capture.ts`                                                                                                                                                                                           | Review capture run into `review/runs/<date>/`                                           |
| `resume`         | `tsx scripts/build-resume-tex.ts && tsx scripts/build-resume-pdf.ts`                                                                                                                                                      | `resume/resume.tex`, then the public PDF to `dist/resume.pdf`                           |
| `resume:private` | `tsx scripts/build-resume-pdf.ts --private`                                                                                                                                                                               | `out/private/resume.pdf` with the phone from `RESUME_PHONE` (local only)                |
| `new:exhibit`    | `tsx scripts/new-exhibit.ts`                                                                                                                                                                                              | `npm run new:exhibit -- <id>` scaffolds `src/museum/exhibits/<id>/`                     |
| `og`             | `tsx scripts/gen-og.ts`                                                                                                                                                                                                   | Regenerates `public/og/*.png`                                                           |
| `media`          | `tsx scripts/build-media.ts`                                                                                                                                                                                              | Headshot crops and formats into `public/images/`                                        |
| `check:copy`     | `tsx scripts/check-copy.ts`                                                                                                                                                                                               | Em dash and phone pattern scan (add `RELEASE=1` for release mode)                       |
| `check:budgets`  | `tsx scripts/check-budgets.ts`                                                                                                                                                                                            | Bundle budgets on an existing `dist/`                                                   |
| `check:glyphs`   | `tsx scripts/check-glyphs.ts`                                                                                                                                                                                             | Every 3D label glyph exists in the `.woff` troika uses                                  |
| `fonts`          | `tsx scripts/subset-fonts.ts`                                                                                                                                                                                             | Subset fonts into `public/fonts/` (not in `package.json` until WP-28 adds it)           |

The `e2e`, `visual` and `a11y` scripts run `node scripts/not-implemented.mjs WP-07` until WP-07 sets the commands above. In the table, `\|` only escapes the Markdown pipe.

## Dependency notes

Versions are pinned per `docs/ARCHITECTURE.md` §1. `package.json` also carries `overrides` that keep single copies of the shared runtime packages; a Dependabot bump of `three`, `@react-three/drei`, `zustand` or `@playwright/test` must keep them in step:

- `playwright-core` is held at `1.56.1`, the version `@playwright/test` uses, so the `@axe-core/playwright` peer does not hoist a newer copy that expects a different Chromium revision than the preinstalled 1194.
- `three` resolves to the root `three` everywhere (`stats-gl` under drei pins an older range).
- `r3f-perf` uses the root `@react-three/drei` and `zustand` (it imports only drei `Text` and `zustand/traditional` plus `zustand/shallow`, which drei 10 and zustand 5 provide).
- `tunnel-rat` uses the root `zustand` (named `create` only).

`leva` 0.10.1 keeps a private `zustand` 3.7.2: it imports the v3 default exports that zustand 5 removed. ARCHITECTURE §1.1 limits `leva` to the lazy `?debug` chunk, so that copy must never reach the entry or museum chunk.

## TypeScript projects

`tsconfig.app.json` checks the client code in `src/`. `tsconfig.node.json` checks `scripts/`, `tests/`, the config files and the colocated `src/**/*.test.ts`. `npm run typecheck` runs both, so use it rather than a bare `tsc`.

The root `tsconfig.json` references both projects for editors. It also extends `tsconfig.app.json` and includes `src/**/*.tsx`, because `tsx` applies a tsconfig only to the files that config includes. Without that include, a script that renders a `.tsx` component (the print template, the OG card) compiles it as classic JSX and fails with "React is not defined". Since the root now has inputs, `tsc -p tsconfig.json` reports TS6305, TS6306 and TS6310 about the references. Those errors are expected, and nothing runs that command.

## Documentation

- [`docs/PLAN.md`](docs/PLAN.md): approved master plan, roles, milestones and gates. Its Addendum is binding.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): stack pins, repository layout, content schema, build pipeline, tests and CI.
- [`docs/spec/EXPERIENCE.md`](docs/spec/EXPERIENCE.md): concept, coordinates, motion, art direction, mobile and accessibility.
- [`CLAUDE.md`](CLAUDE.md): operating guide for agent sessions.

## Deploy

GitHub Actions deploys to Netlify. Netlify never builds anything: Git builds stay off for the site, and every deploy uploads the `dist/` that CI built and tested with `netlify deploy --no-build` (`.github/workflows/deploy.yml`).

- **When:** only after a green `ci` run in this repository, never from a fork. A push to `main` or a `claude/**` branch deploys from the last job of that `ci` run. Once `deploy.yml` is on `main`, pull requests also get a preview through its `workflow_run` trigger (GitHub fires that trigger only for workflow files on the default branch). Each green run deploys once.
- **Previews** (every branch except `main`): the alias is `pr-<number>` for a pull request, otherwise the branch name in lowercase with every character outside `a-z0-9` turned into `-`, at most 37 characters. The URL is `https://<alias>--<site>.netlify.app`, for example `https://claude-intelligent-sagan-poq45q--emeka-nduka-nwagbo.netlify.app`. Previews carry `X-Robots-Tag: noindex`.
- **Production:** `main` deploys with `--prod` in the GitHub `production` environment. The address is `SITE_URL` in `src/content/site.ts`, the one place the domain lives (a custom domain later is a one-line change there).
- **Where the URL appears:** the deploy job's summary in the Actions run, the run's environment link, and a comment on the pull request for `pr-<number>` previews.
- **Smoke test:** after every deploy, the `@smoke` specs run against the deployed URL (`BASE_URL=<url> npx playwright test --grep @smoke --project=desktop`): museum mode with `?test=1`, the CSP header, no CSP violations and `/resume.pdf`.
- **Secrets:** `NETLIFY_AUTH_TOKEN` (a Netlify personal access token) and `NETLIFY_SITE_ID` are GitHub repository secrets. If either is missing, the deploy job fails with a message that names it. Never commit or print them.
- **No deploy available:** review the tested build locally with `npm run build && npm run preview`, which serves `dist/` with the production headers.

## License

Code: MIT License (see [`LICENSE`](LICENSE)). Content and images (the text content, the resume and the portrait photograph): all rights reserved.
