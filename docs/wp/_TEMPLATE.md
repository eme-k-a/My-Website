# Work-package brief template (and the rules every brief inherits)

Owner: R0. Every brief in this folder (`docs/wp/WP-00.md` to `docs/wp/WP-36.md`, and review-fix briefs `docs/wp/F-###.md`) uses the twelve sections below, with exactly these `##` headings, in this order. A fresh agent with no conversation history must be able to finish its work package from its brief plus the documents the brief cites.

Read order for an agent: (1) your brief, (2) this file, (3) `CLAUDE.md`, (4) every section your brief lists under Inputs. Read anything else in the repo freely; write only what your brief allows.

## Authority when documents disagree

1. `docs/PLAN.md`, including its "Addendum: rulings made at kickoff". It wins every conflict.
2. Your brief. Rulings written in a brief were made by R0 after the specs were written; they apply inside that brief's scope. Each one says which spec line it overrides.
3. `docs/ARCHITECTURE.md` for implementation (APIs, file names, schema fields, commands).
4. `docs/spec/EXPERIENCE.md` for what the visitor sees, hears and does (coordinates, motion, copy, art direction).
5. `docs/CONTENT_DRAFT.md` for resume text and museum copy; `docs/ART_DIRECTION.md` (after WP-05) for tokens, materials and the review rubric.

Cite sections as "PLAN §5", "ARCHITECTURE §6.2", "EXPERIENCE §4.1". Section numbers in both specs are frozen.

If you find a conflict your brief does not settle, follow the higher authority above, finish what you can, and record the conflict in `openQuestions` of your report.

## Global rules (apply to every work package)

- **No em dashes (U+2014) anywhere**: code, comments, copy, docs, test names, commit messages, report files. Use commas, colons, parentheses or hyphens. En dashes (U+2013) appear only inside date ranges produced by `formatRange()`. Code that must detect the character writes it as `'\u2014'`.
- **The phone number is never written anywhere** in the repo, `dist/`, logs, reports or commit messages. It exists only in `RESUME_PHONE` (shell or the gitignored `.env.local`) and is read only by `npm run resume:private`. Tests that need a phone-shaped string build it at runtime from parts (for example `['555', '010', '0199'].join('-')`), never as a literal, because `check-copy` scans every tracked file for `\d{3}[-. ]\d{3}[-. ]\d{4}`.
- **Never invent facts about Emeka** (dates, metrics, technologies, team sizes, employer internals, titles). Unknowns are written `[placeholder: ...]`. First-person or unconfirmed copy carries `draft: true`.
- **npm only.** `package-lock.json` plus `npm ci`. Only R10 changes dependencies or the lockfile; everyone else asks through `depsRequest`.
- **Playwright:** `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` holds Chromium revision 1194. Never run `npx playwright install` locally. Never change the `@playwright/test` version (1.56.1). Headless WebGL needs `--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist` (already in `playwright.config.ts` from WP-07). Every museum test URL includes `?test=1` (and `&mode=museum` where the boot script would otherwise pick classic).
- **Input is native page scroll.** No `wheel` or `touch*` listeners, no `touch-action: none`, no scroll hijacking, no custom keys except Enter and Esc, no URL writes on stop arrival, no hash routes.
- **All readable text lives in the DOM.** 3D text only for big labels, from self-hosted `.woff` files.
- **No requests to other origins** at runtime: no CDNs, no Google Fonts, no unpkg (blocked here anyway), no troika fallback fonts.
- **Frozen contracts** (tag `contracts-v1`, made in WP-02) change only through a written request to R0 in `openQuestions`: `src/content/schema.ts`, `src/content/ids.ts`, `src/museum/exhibits/_kit/types.ts`, the state shape in `src/app/store.ts`, `src/app/testHooks.ts` types, `src/app/testIds.ts`, the route table and history transitions in `src/app/routes.ts`, token names in `src/design/tokens.ts`, and the output type of `src/museum/rail/layout.ts`.

## Working conventions

- R0 creates a git worktree and a local branch `wp/WP-xx-<slug>` from the tip of the integration branch `claude/intelligent-sagan-poq45q` and tells you the worktree path and your port offset N. Work only there.
- Playwright and `serve-dist` use `PORT=$((4173 + N))` (N = 0 when R0 does not say otherwise).
- Run `npm run verify` before every commit. Run your brief's acceptance commands before you report.
- Commit small. Conventional message (`feat(scope): ...`, `fix(scope): ...`, `test(scope): ...`, `docs(scope): ...`, `chore(scope): ...`), a blank line, an optional body, then one trailer block: `WP: WP-xx` followed by the attribution lines given in `CLAUDE.md` ("Commit format"). No em dashes in messages.
- Do not push, merge, rebase onto the integration branch, or create tags, unless your brief says so. R0 merges, one WP at a time: verify plus smoke e2e before the merge, the full suite after it, and a revert if the suite turns red.
- Unit tests sit next to the source (`*.test.ts`) and belong to the folder owner. R8 owns `tests/e2e/**` and `tests/pdf/**`; a brief may grant a feature WP the exact e2e spec file names it must create, and R8 owns those files after the merge.
- Generated, gitignored scratch output goes under `out/` (for example `out/wp12/`). Never commit `out/`, `dist/`, `dist-ssr/`, `test-results/`, `playwright-report/` or `.lighthouseci/`.

## Standard forbidden list (every brief's Forbidden section starts with this)

1. Writing any path not matched by your brief's Owned globs (deleting or renaming counts as writing).
2. Editing `dependencies`, `devDependencies` or `package-lock.json` (R10 only). Editing `package.json` `scripts` entries other than the exact keys your brief names.
3. `git push`, `git merge`, `git rebase` onto the integration branch, `git tag`, force operations, or rewriting history outside your local branch (unless your brief explicitly allows one named command).
4. `npx playwright install`, changing Playwright or browser versions, installing global tools, or adding network calls to other origins.
5. U+2014 anywhere; the phone number anywhere; invented facts about Emeka.
6. Weakening a test, budget or threshold to make it pass. Budgets in `perf/budgets.json` change only with an R0 ruling.

## The twelve sections

```markdown
# WP-xx: <name from PLAN §5>

## Goal
One paragraph: what exists when this WP is done, and why it matters.

## Owner role
Role id and title (PLAN §4). Name any second role and what it does here.

## Milestone and dependencies
Milestone (M0 to M7). "Must be merged first:" WP ids. "Parallel with:" WP ids. "Merge order:" when it matters. Gate this WP feeds.

## Inputs
Doc anchors (PLAN §n, ARCHITECTURE §n.n, EXPERIENCE §n.n, CONTENT_DRAFT, ART_DIRECTION) and repo files to read. Rulings that override a spec line, each marked "Ruling:".

## Owned globs (exclusive)
Exactly the paths this WP may create, edit or delete. Mirrors `OWNERS.json` `wps["WP-xx"].allow`. Exceptions granted on another role's path are marked "(grant)".

## Forbidden
"Standard list (`docs/wp/_TEMPLATE.md`)" plus WP-specific paths and actions.

## Todo
Concrete checkboxes, in a sensible order, each naming files, functions, numbers.

## Commands
Exact shell commands, copy-pasteable, from the worktree root.

## Acceptance
Numbered A1..An. Each: the criterion, the command or test that proves it, and the threshold. Objective only; taste calls go to R2, R11 or Emeka as named checklists.

## Output
Commit prefix(es), the `WP: WP-xx` trailer, and `review/reports/WP-xx.json`.

## Size
S (under half a day of agent work), M (1 to 2), or L (3 or more), with one line of justification.

## Notes
Pitfalls (many from the technical-risk and completeness critiques) and hints that save time.
```

## Report file: `review/reports/WP-xx.json`

Every WP writes exactly one report file at `review/reports/WP-xx.json` (allowed by every brief) and commits it with its last commit. Shape:

```json
{
  "wp": "WP-12",
  "role": "R5 (Builder A)",
  "status": "done",
  "branch": "wp/WP-12-verafin",
  "commits": ["<short sha> feat(exhibit-verafin): build the reporting engine"],
  "changedFiles": ["src/museum/exhibits/verafin/index.ts", "src/museum/exhibits/verafin/ReportingEngine.tsx"],
  "acceptance": [
    {
      "id": "A1",
      "criterion": "Exhibit chunk <= 40 KB gzip",
      "command": "npm run build && npm run check:budgets",
      "result": "pass",
      "evidence": "exhibits/verafin 6.2 KB gzip"
    }
  ],
  "openQuestions": [
    { "question": "Should the grid be 6x6 or 8x8?", "for": "R2", "default": "6x6 per EXPERIENCE §4.1" }
  ],
  "depsRequest": [
    { "package": "example-pkg", "version": "1.2.3", "dev": true, "why": "one line" }
  ],
  "notes": "Anything R0 must know at merge time (for example a snapshot that must be regenerated)."
}
```

- `status`: `done` (every acceptance item passes), `partial` (some fail or were skipped; say why in `evidence`), or `blocked` (cannot proceed; say on what).
- `acceptance[].result`: `pass`, `fail`, or `skipped`. `evidence` is short: numbers, a file path, or the last lines of output. Never paste the phone number or secrets.
- `depsRequest` is `[]` when nothing is needed. R10 batches requests into one lockfile commit per milestone.
- `openQuestions[].for`: `R0`, `R2`, `R11`, `Emeka`, or another role id; `default` is what you did meanwhile.

## Review-fix briefs (`docs/wp/F-###.md`)

R0 writes one per finding filed by R11 in `review/findings.json`, using these same twelve sections. Owned globs are limited to the owner globs of the affected path. Commits use `fix(F-###): ...` with the trailer `WP: F-###` and add a test or a justified rebaseline. Reports go to `review/reports/F-###.json`.
