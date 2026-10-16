# Handover: continuing "Commit History" in another Claude Code session

This file lets a fresh Claude Code session pick up the build where the last one stopped. That can be a local terminal or a new cloud session. Everything the work depends on is committed to the branch `claude/intelligent-sagan-poq45q` on `eme-k-a/My-Website`.

## 1. Fastest way to resume

**Option A: teleport this exact session to your machine.** This keeps the full conversation history.
```sh
git clone https://github.com/eme-k-a/My-Website.git && cd My-Website
claude --teleport session_016CcKJFMWCyXKspJx4YvMS7
```
- Teleport needs a clean working tree, and you must be signed in to the same claude.ai account (`claude auth login`).
- Agents that were still running in the cloud are not carried over. Check the status table below, then re-run anything marked "in progress".

**Option B: start a new session** (local or cloud) on the branch and paste the prompt in section 6.

**Usage limits:** cloud and local sessions share one pool, your Pro plan usage. Moving to a local session does not give you more usage. It mainly protects against the cloud machine expiring.

## 2. Where the truth lives (all in the repo)

| File | What it is |
|---|---|
| `docs/PLAN.md` | The approved master plan: milestones M0 to M7, gates, the roster of 12 roles. The Addendum at the end holds binding rulings |
| `docs/spec/EXPERIENCE.md` | The visitor experience: coordinates, stops, exhibit concepts, art direction, microcopy |
| `docs/ARCHITECTURE.md` | Stack pins, repo tree, content schema, routes, rendering, budgets, testing, CI/CD |
| `docs/CONTENT_DRAFT.md` | All resume and museum copy, with draft flags, the change log against the old resume, and facts still needed |
| `docs/wp/WP-00.md` to `WP-36.md` | One brief per work package: owned files, todos, commands, acceptance checks |
| `OWNERS.json` | Which role and work package may edit which paths |
| `CLAUDE.md` | Operating rules for agents. Loaded automatically by Claude Code |
| `review/reports/WP-xx.json` | What each finished work package reported |

## 3. Status (update this table as work lands)

| WP | Name | Status |
|---|---|---|
| WP-00 | Commit reconciled spec and briefs | Done (commit 8b015d5) |
| WP-01 | Scaffold, legacy cleanup, pinned toolchain | Done (288cf93 to 52b0407). Two checks were waived by R0 rulings in the PLAN Addendum: the `legacy-site` tag is local only, and leva keeps its own zustand in the debug chunk |
| WP-02 | Contracts freeze (schema, layout, registry, tokens, test hook) | Done (ffe42c3 to 3b4acc5; `contracts-v1` is a local tag on 3b4acc5) |
| WP-03 | Content file + headshot pipeline | Done (999cfeb to c62ddbf; crop fixed after verification) |
| WP-04 | Resume outputs (PDF public/private, `.tex`, before/after) | Done (fdbfb6a to 6ef8e39) |
| WP-05 | Art direction + tokens | Done (f9b8ae5 to 2383647) |
| Gate G0 | Emeka approves the resume before/after, Verafin bullets, title style | Approved 2026-10-15 (7658245): hybrid, manager cleared, (Co-op) style, no GitHub on PDF yet |
| WP-06, WP-07, WP-10 | CI, test harness, app shell | Done (merged at ced456a; first CI run: verify, build, e2e green; latex fixed in 1431a5c) |
| F-M1 | Fix-ups from M1a verification | Done and verified (a9f0d49..9937041) |
| WP-08, WP-09 | Greybox gallery + kit, scroll track + rail | Done and verified (WP-08 3df75cb..705ed8e, WP-09 to bcc065a); CI run 11 green |
| Context packs | docs/RULINGS.md + docs/wp/packs/ (cost rules) | Done (33b5492) |
| Gate G1 | CI green + smoke tests on desktop and Pixel 7 | Smoke tests pass (WP-09 verifier, 139 e2e); waiting on the CI run for this commit; then M2 on Emeka's "go" |
| WP-11 to WP-19 | M2 vertical slice | Not started. Run with the saved milestone workflow; WP-11, WP-12, WP-15, WP-16 at xhigh |
| WP-20 onward | M3 to M7 | Not started |

How to tell what's done:
- `git log --oneline` shows commits carrying a `WP: WP-xx` trailer.
- `ls review/reports/` lists the reports of finished packages.

## 4. Decisions already made

**Locked choices:**
- Modern-gallery look.
- Scroll-driven walk using native page scrolling.
- Main aisle is work only, newest first. Optional side wings hold Projects and Volunteer. The Education + Certifications room comes at the end.
- Hosted on Netlify, on a free `*.netlify.app` subdomain.
- The resume is trimmed by an agent and approved by Emeka. It ships as a generated PDF plus a synced `resume.tex`.

**Defaults pending Emeka's confirmation:**
- No phone number on the site or in the public PDF.
- Verafin uses the three "safe" bullets, location St. John's, NL.
- GitHub link: `github.com/eme-k-a`.
- No analytics, sound or post-processing effects in v1.

**Hard rules:**
- No em dashes anywhere: code, copy or commit messages.
- Never commit the phone number. The private PDF reads it from `RESUME_PHONE`.
- Never invent facts about Emeka.

## 5. Differences when running locally (outside the cloud container)

- **Playwright browsers.** The briefs assume the cloud image: browsers at `/opt/pw-browsers`, and "never run playwright install". Locally you must install the matching browser once: `npx playwright install chromium`. It matches `@playwright/test` 1.56.1, which `package.json` pins. Skip the WP-01 check that expects revision 1194 at `/opt/pw-browsers`, and don't set `PLAYWRIGHT_BROWSERS_PATH`.
- **SwiftShader flags** (`--use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`) still work locally for deterministic screenshots. Visual baselines are compared in CI only.
- **Original resume PDF** (the "before" image in WP-04). The cloud copy was at `/root/.claude/uploads/.../d186f081-Emeka_Resume_One_Page.pdf`. Locally, point WP-04 at your own copy, kept outside the repo, because it contains your phone number. For example, set `RESUME_BEFORE_PDF=/path/to/Emeka_Resume_One_Page.pdf` and tell the agent to use it.
- **Private PDF:** put `RESUME_PHONE=...` in `.env.local` (gitignored) before running `npm run resume:private`.
- **Netlify:** WP-18 needs a `NETLIFY_AUTH_TOKEN` GitHub repo secret. The site ID can come from the Netlify dashboard or the claude.ai Netlify connector.
- **Orchestration tools.** The cloud session used a Workflow tool to fan out agents. A local session can do the same work with the Agent tool (subagents, with worktree isolation for parallel exhibit builders) or one work package at a time. Quality comes from the briefs and their acceptance checks, not the tool.

## 6. Continuation prompt (paste into the new session)

```
You are continuing the "Commit History" website build for Emeka Nduka-Nwagbo on branch
claude/intelligent-sagan-poq45q. Act as R0, the orchestrator described in docs/PLAN.md.

1. Read CLAUDE.md, docs/HANDOVER.md, docs/RULINGS.md, docs/PLAN.md section 7 (the cost-aware
   operating rules) and docs/wp/_TEMPLATE.md. Do not read the big specs up front: each work
   package has a context pack in docs/wp/packs/.
2. Work out the real status: `git log --oneline`, `ls review/reports/`, and run
   `npm ci && npm run verify && npm run build` if package.json exists. Update the status
   table in docs/HANDOVER.md.
3. Continue with the next milestone from docs/PLAN.md section 5. If the Workflow tool is
   available, run the saved workflow .claude/workflows/milestone.js (name "milestone"),
   following the cost rules in docs/PLAN.md section 7. Otherwise work through the WPs one at a time.
   For each WP: hand its brief (docs/wp/WP-xx.md) to a subagent, or do it yourself. Then
   have a separate subagent independently re-run every acceptance check and review the
   diff adversarially. Fix and re-verify until it passes. Commit with a conventional
   message ending in "WP: WP-xx". Push to the branch.
4. Stop at each gate (G0, G2, G4, G5, and before launch) and ask me for the approvals
   listed there. Do not open a pull request to main unless I ask.
5. Rules: no em dashes anywhere; never commit my phone number; never invent facts about
   me (use [placeholder: ...]); stay inside each WP's owned files (OWNERS.json).
   Local environment differences are in docs/HANDOVER.md section 5.
```

## 7. Facts Emeka still owes (defaults apply if skipped)

- **Verafin:** on-site, hybrid or remote, and which technologies can be named publicly.
- **KlarUp and Finance Tracker:** his role and the dates.
- **Certifications:** issue dates, the Tech Stewardship issuer, verification links.
- **MUN:** start date.
- **Volunteer roles:** whether both are still active.
- **Mysa:** whether the web app used a database alongside Cognito.
- **Exit desk:** the target roles to mention.
- **Identity:** GitHub handle, display form of his name, favicon monogram letters.
- **Testing:** his phone model, for the real-device checklist.
