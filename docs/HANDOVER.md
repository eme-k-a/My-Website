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
| Gate G1 | CI green + smoke tests on desktop and Pixel 7 | Passed 2026-10-16: CI run 13 green on c10c67f; smoke tests pass on desktop and Pixel 7 (139 e2e). Next: M2 on Emeka's "go" |
| WP-11 to WP-16, WP-18 | M2a: environment, Verafin, Safe Sip, dialog and routes, camera feel, quality tiers, preview deploy | Done 2026-10-16: all merged and verified (WP-16, WP-11, WP-15, WP-14 one by one; WP-12, WP-13, WP-18 as one batch), tip d0c2d50. CI run 27 failed 11 e2e tests on GitHub runners, so the deploy job has not run yet |
| F-M2 | Green CI after M2a (F-011 to F-014), first Netlify preview | Done 2026-10-16: CI runs 34 and 35 green; preview live at https://claude-intelligent-sagan-poq45q--emeka-nduka-nwagbo.netlify.app (report `review/reports/F-M2.json`). Next: WP-17 (slice tests, plus F-015 and F-016), then WP-19, then Gate G2 |
| WP-17 | M2b: slice tests | Done 2026-10-17: merged and verified; six e2e shards; 19 CI baselines (`e4b5a40`, committed by the CI bot); A4 passed with CI runs 41, 43 and 45 green in a row (about 13.5 min each) |
| WP-19 and F-G2 | Slice review and fixes | Done 2026-10-20. Round 1: 3.33. Round 2: 3.65. Round 3: 3.74 (desktop 3.83, Pixel 7 3.65), the last allowed round. Every P1 is closed: F-020 to F-023, F-036 and F-037 by F-G2a, F-G2b and F-G2r2; F-038 by its own scoped fix with an e2e check (`0d291d9`). Open P2 and P3: F-027, F-032, F-033. Baselines were refreshed by the CI bot (`fee0ac2`). Stills for Emeka: `review/runs/2026-10-20-g2r3/stills/` |
| F-035 | Remove Safe Sip and Enactus | Done 2026-10-20 (Emeka's decision): gone from the gallery, its story page, `/resume/`, the PDF and the tex. The volunteer wing holds only SDSJ |
| Gate G2 | Slice sign-off | **Passed 2026-10-20: Emeka approved the stills and the preview.** Review round 3 scored 3.74 with no open P0 or P1, and CI run 60 was green and deployed. **M2 is complete.** Next: Emeka runs `/compact`, then M3 (WP-20 to WP-25) starts on his "go", with builders in separate cloud sessions a few at a time (PLAN section 7). The usage-limit check-ins are paused until then (section 9) |
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
- **Netlify:** the site `emeka-nduka-nwagbo` (https://emeka-nduka-nwagbo.netlify.app, team `eme-k-a`) was created through the connector on 2026-10-16, with no Git link, so Netlify Git builds are off. WP-18 needs two GitHub repo secrets that Emeka adds: `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID`. The site ID is under Site configuration, General, in the Netlify dashboard, or the connector's get-projects call returns it. Never commit it.
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

## 8. Resuming M2a after the usage-limit pause (2026-10-16)

1. If `git branch --list 'wp/WP-1*'` does not show `wp/WP-11` and `wp/WP-12` (a fresh container), rebuild them from the patches:
   `git branch wp/WP-12 350e3f8 && git worktree add /tmp/r12 wp/WP-12 && git -C /tmp/r12 am "$PWD"/review/wip/WP-12/*.patch && git worktree remove /tmp/r12`, then the same for WP-11.
2. Run M2a again with the saved `milestone` workflow, but skip the WP-12 build (reuse its report) and start the WP-11 builder from `wp/WP-11`. The workflow needs a small edit for that: a `fromBranch` field per WP (the builder checks out that branch in its worktree and continues) and a `built: true` field (skip the build; read the report from the branch). Same efforts as before: WP-11, WP-12, WP-15, WP-16 at xhigh; WP-13, WP-14 at high. Merge order WP-16, WP-11, WP-15, WP-14, WP-12, WP-13.
3. Delete `review/wip/` in the first commit after WP-11 and WP-12 are integrated.
4. Netlify: the site exists (section 5). WP-18 waits for Emeka's two GitHub secrets.


## 9. Automatic resume after usage limits (2026-10-20; paused at the M2 boundary, re-arm on M3 "go")

Emeka asked for a cheap automatic resume.

**The chain.** A one-shot check-in, "Usage-limit check-in (5-hour chain)", fires into this session. The first one fires at 07:52 UTC on 2026-10-20, 2 minutes after the estimated reset. Each check-in first books the next one 5 hours and 2 minutes later. When a limit error names an exact reset time, it books 2 minutes after that time instead. Each check-in then does one of three things:
- **Resume:** if a usage limit or a container restart stopped any work, it resumes that work.
- **Wait:** if work is still running, or the next step needs Emeka, it does nothing.
- **Stop:** if the build is done or Emeka says stop, it books no next check-in.

**The backup.** A daily backup, "Daily backup for the usage-limit chain" (`trig_01Pj547R92sA2hw76nRLHqLt`, 15:46 UTC), re-arms the chain if it broke. A break happens when a check-in fires while the limit is still in force.

Nothing can read the usage meter directly; reset times come only from limit errors and from `/usage`. A new session that replaces this one should cancel both, or point them at the new session.

## 10. M3 builder sessions (started 2026-10-20 19:27 UTC)

Emeka said "go" for M3 after G2. Builders run as separate cloud sessions, each on its own machine and pushing only to its own branch. R0 polls them about every 90 minutes with a "M3 check-in" scheduled message, because child sessions do not report back on their own.

| WP | Scope | Session | Branch |
|---|---|---|---|
| WP-20 | Mysa, Wailo | session_01VEeLNNVFTUjbX2HsbKLCM1 | `claude/m3-wp-20` |
| WP-21 | CFIA, MUN, Certifications | session_015AAw5CUALiSJ9hb7nBd9YT | `claude/m3-wp-21` |
| WP-22 | KlarUp, Finance Tracker | session_01UAEqq8fd4Z6z8u9rnHdrQ8 | `claude/m3-wp-22` |
| WP-23 | SDSJ | session_01Fb4q9FnUpbrUw37qr78qwJ (started 20:17 UTC) | `claude/m3-wp-23` |
| WP-24 | Wing rooms and doors | session_01TKpHXcQ2rbXarKXZo3A4TM (started 20:17 UTC) | `claude/m3-wp-24` |
| WP-25 | Test expansion | after WP-20 to WP-24 merge | |

Then the F-M3 follow-ups listed in RULINGS, the review (G3 needs an average of at least 3.5 and no open P0 or P1), and the CI baseline refresh.

**Group 1 status:** WP-20, WP-21 and WP-22 are merged (cherry-picked by R0 on 2026-10-20, 12 commits, `f529e57` to `9eb31c7`). On the merged tip, verify (827 tests), build, budgets and glyphs pass, as do the exhibit contract and exhibit specs on desktop and pixel7. The workflow integrator answered a status question instead of merging, so R0 merged by hand.

Each push to a `claude/m3-*` branch runs CI and deploys an alias preview for that branch. That is harmless. R0 merges the branches into the integration branch with the batch integrator.

## 11. M3 complete, Gate G3 passed (2026-10-24)

**M3 is complete.** All of it is merged:
- WP-20 to WP-25, F-M3a (draw calls), F-M3 (follow-ups) and F-039;
- Emeka's approved KlarUp change: the staircase raised and the checks thickened.

**Checks:** CI run 102 is green at `71e5f62`, with 47 CI baselines.

**G3 review:** round 1 averaged 3.78 with no P0. The P1 F-039 is closed. The open P2 and P3 findings (listed in RULINGS) go to M4.

**Housekeeping:** the seven M3 builder sessions are archived.

**Next:** Emeka runs `/compact`, then says "go" for **M4: polish**:
- WP-26: lighting and atmosphere, including dark brass at tier medium (F-045);
- WP-27: mobile and onboarding, including the short phone card and F-040 to F-044 where they apply;
- WP-28: the asset pass.

Gate G4 needs an average of at least 4.0, no dimension below 3.5, and Emeka's sign-off on 10 screenshots. Run the builders as separate cloud sessions, a few at a time, and merge by hand with cherry-pick, since workflow integrators can misread the user's turn. The Workflow tool may be switched off; in that case, use background agents in worktrees.

**Usage check-ins:** the 5-hour chain (next at 07:22 UTC) and the daily backup (`trig_01LUJuUEwDgi8NtdCq45PVUp`) are armed at Emeka's request (2026-10-24). They only resume stopped work; they never start a new milestone.

## 12. M4 builder sessions (started 2026-10-24)

Emeka said "go" for M4 after G3. Four builders run as separate cloud sessions, each pushing only to its own branch. R0 polls them about every 90 minutes with an "M4 check-in" scheduled message, because child sessions do not report back.

| WP | Scope | Session | Branch |
|---|---|---|---|
| WP-26 | Lighting and atmosphere, F-043, brass at medium, mood notes | session_01Uuq5imcpDHnnu66econpQ6 | `claude/m4-wp-26` |
| WP-27 | Mobile and onboarding, F-046, sdsj 360 x 640 card | session_01StRh2HFpnS7dr2XHwVqXR4 | `claude/m4-wp-27` |
| WP-28 | Asset pass: font subsets, preload, credits, transfer spec | session_013MaHaucLVSCbXU8ujtxFy2 | `claude/m4-wp-28` |
| F-M4a | Exhibit read, grounding and framing: F-040 to F-042, F-044, F-045 | session_01NCDqgD8piiMcgxgg2YWSnS | `claude/m4-f-m4a` |

All four started at 04:31 UTC. Then: merge by cherry-pick, one CI baseline refresh, the G4 review, and Emeka's 10-screenshot sign-off.

**Status (09:00 UTC):** all four builders and the F-041b follow-up (session_01FhEZFpyAr9LGCEt84Lrpmv, `claude/m4-f-041b`) are merged by cherry-pick, and their sessions are archived. CI run 119 failed at three phone wing stops; R0 fixed the cause (hover styles on touch screens, `f4b2f42`) and the next dispatch committed the M4 baselines (`82e10a0`). One more baseline refresh covers the MUN title. **Next:** a normal green run, then the G4 review, which waits on Emeka's go-ahead because the weekly usage limit is at its warning level (it resets 2026-10-27 02:00 UTC).
