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

Until the work package that implements a script lands, the script prints `not implemented yet (WP-xx)` and exits 0.

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
| `resume`         | `tsx scripts/build-resume-pdf.ts && tsx scripts/build-resume-tex.ts`                                                                                                                                                      | Public PDF to `dist/resume.pdf` and `resume/resume.tex`                                 |
| `resume:private` | `tsx scripts/build-resume-pdf.ts --private`                                                                                                                                                                               | `out/private/resume.pdf` with the phone from `RESUME_PHONE` (local only)                |
| `new:exhibit`    | `tsx scripts/new-exhibit.ts`                                                                                                                                                                                              | `npm run new:exhibit -- <id>` scaffolds `src/museum/exhibits/<id>/`                     |
| `og`             | `tsx scripts/gen-og.ts`                                                                                                                                                                                                   | Regenerates `public/og/*.png`                                                           |
| `media`          | `tsx scripts/build-media.ts`                                                                                                                                                                                              | Headshot crops and formats into `public/images/`                                        |
| `check:copy`     | `tsx scripts/check-copy.ts`                                                                                                                                                                                               | Em dash and phone pattern scan (add `RELEASE=1` for release mode)                       |
| `check:budgets`  | `tsx scripts/check-budgets.ts`                                                                                                                                                                                            | Bundle budgets on an existing `dist/`                                                   |
| `check:glyphs`   | `tsx scripts/check-glyphs.ts`                                                                                                                                                                                             | Every 3D label glyph exists in the `.woff` troika uses                                  |
| `fonts`          | `tsx scripts/subset-fonts.ts`                                                                                                                                                                                             | Subset fonts into `public/fonts/` (added in WP-28)                                      |

The `e2e`, `visual` and `a11y` scripts run `node scripts/not-implemented.mjs WP-07` and `lh` runs `node scripts/not-implemented.mjs WP-06` until those work packages set the commands above. In the table, `\|` only escapes the Markdown pipe.

## Documentation

- [`docs/PLAN.md`](docs/PLAN.md): approved master plan, roles, milestones and gates. Its Addendum is binding.
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): stack pins, repository layout, content schema, build pipeline, tests and CI.
- [`docs/spec/EXPERIENCE.md`](docs/spec/EXPERIENCE.md): concept, coordinates, motion, art direction, mobile and accessibility.
- [`CLAUDE.md`](CLAUDE.md): operating guide for agent sessions.

## Deploy

Deploy: GitHub Actions to Netlify (WP-18).

## License

Code: MIT License (see [`LICENSE`](LICENSE)). Content and images (the text content, the resume and the portrait photograph): all rights reserved.
