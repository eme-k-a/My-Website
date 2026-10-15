export const meta = {
  name: 'milestone',
  description: 'Run one milestone of the Commit History build: parallel WP builders in worktrees, then merge in order with a cheap independent verifier and one fix round',
  whenToUse: 'Any milestone or batch of work packages (WP-xx) for the Commit History site. Pass args: { label, wps: [{ id, role, model?, effort? }], mergeOrder?, notes? }',
  phases: [
    { title: 'Build', detail: 'one builder per WP in an isolated worktree' },
    { title: 'Integrate', detail: 'cherry-pick in merge order; Sonnet verifier; one fix round' },
  ],
}

// Cost rules (docs/PLAN.md section 7, approved by Emeka on 2026-10-15):
// - every agent reads its context pack docs/wp/packs/<id>.md first, not the whole PLAN/ARCHITECTURE/EXPERIENCE
// - builders: inherit the session model unless args set one; effort 'high' by default ('xhigh' for hard WPs)
// - integrators: Sonnet, effort 'low'; verifiers: Sonnet, effort 'medium'
// - one fix round after a failed verification, then stop and report to R0
const REPO = '/home/user/My-Website'
const A = args || {}
const WPS = A.wps || []
const ORDER = A.mergeOrder || WPS.map((w) => w.id)
const NOTES = A.notes ? `\nR0 notes for this milestone:\n${A.notes}\n` : ''

const VERDICT = {
  type: 'object',
  properties: {
    pass: { type: 'boolean', description: 'true only if every acceptance criterion passes (or is waived by a ruling in docs/RULINGS.md, or needs a remote CI run and everything checkable locally passes) and no blocking or major issue remains' },
    acceptance: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, pass: { type: 'boolean' }, evidence: { type: 'string' } }, required: ['id', 'pass', 'evidence'] } },
    issues: { type: 'array', items: { type: 'object', properties: { severity: { type: 'string', enum: ['blocking', 'major', 'minor'] }, file: { type: 'string' }, description: { type: 'string' }, suggestedFix: { type: 'string' } }, required: ['severity', 'description'] } },
    summary: { type: 'string' },
  },
  required: ['pass', 'acceptance', 'issues', 'summary'],
}

const COMMON = `Project: the "Commit History" 3D portfolio site. Repo ${REPO}, integration branch claude/intelligent-sagan-poq45q.
CONTEXT BUDGET: read your context pack docs/wp/packs/<WP>.md first (the brief, docs/RULINGS.md and every cited doc section). CLAUDE.md is already loaded for you. Open docs/PLAN.md, docs/ARCHITECTURE.md or docs/spec/EXPERIENCE.md only for something the pack lacks, and then only the section you need. Keep command output short (tail, grep) instead of dumping whole logs.
Established facts: the git proxy refuses pushes of anything except the integration branch, so never push and never push tags. Chromium 1194 is preinstalled (never run "npx playwright install"); pdflatex is installed. Items that need a remote GitHub Actions run are "deferred to R0 after push".
Hard rules: no em dash (U+2014) anywhere; never commit a phone number; never invent facts about Emeka; edit only the globs your brief owns (OWNERS.json) plus explicit R0 grants. Commit messages: conventional subject, blank line, optional body, then one trailer block: "WP: <id>", then exactly:
Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_016CcKJFMWCyXKspJx4YvMS7${NOTES}`

function buildPrompt(w, port) {
  return `You are ${w.role}. Execute work package ${w.id} exactly as written in docs/wp/${w.id}.md (its context pack is docs/wp/packs/${w.id}.md).
${COMMON}
ISOLATED WORKTREE: you run in a fresh git worktree (your current directory) created from the integration branch. Work and commit ONLY there; never touch ${REPO} directly. Run "npm ci" first. Use PORT=${port} for servers and Playwright. Other WPs of this milestone (${WPS.map((x) => x.id).join(', ')}) are built in parallel and merge in the order ${ORDER.join(', ')}: build against the frozen contracts and note acceptance items that can only be proven after integration.
Do every Todo, make every acceptance criterion you can pass, write review/reports/${w.id}.json, commit as the brief's Output says, then run: git branch -f wp/${w.id} HEAD
Final reply (keep it under 400 words): commit list, acceptance results (pass/fail/deferred with one-line evidence), deviations, open questions.`
}

function integratePrompt(id, report) {
  return `You are R0's integration assistant. Merge ${id} onto the integration branch.
${COMMON}
Builder report:
${report}
In ${REPO} on claude/intelligent-sagan-poq45q (never switch branches there): cherry-pick git log --reverse claude/intelligent-sagan-poq45q..wp/${id} in order. On conflicts keep the integration-branch version for files ${id} does not own, and keep both sides' keys in package.json scripts. Run npm ci if dependencies changed. Then run npm run verify, npm run build and PORT=4173 npm run e2e; fix failures caused by ${id}'s own files inside its globs (commit "fix(${id.toLowerCase()}): ..."). Do not push. Reply in under 250 words: integrated hashes, results, anything open.`
}

function verifyPrompt(id, report) {
  return `You are an independent, skeptical verifier for ${id}. You did not write it.
${COMMON}
In ${REPO} (integration branch, ${id} merged): re-run every acceptance proof in docs/wp/${id}.md yourself (PORT=4173) and review the diff for contract violations, edits outside owned globs, em dashes, phone numbers, invented facts, budget or CSP regressions, and anything that breaks npm run verify, npm run build or the e2e suite. Do not edit tracked files or commit; scratch files only under /tmp. Keep evidence lines short.
Report from the builder and integrator:
${report}`
}

function fixPrompt(w, verdict) {
  return `You are ${w.role}, fixing ${w.id} after an independent verification failed. Work in ${REPO} on the integration branch.
${COMMON}
Verifier findings (JSON):
${JSON.stringify(verdict)}
Fix every failing acceptance criterion and every blocking or major issue; explain with evidence any finding you believe is wrong. Stay inside the brief's globs. Commit "fix(${w.id.toLowerCase()}): ...", update review/reports/${w.id}.json, and reply in under 300 words with the changes and fresh evidence.`
}

phase('Build')
const reports = {}
await parallel(WPS.map((w, i) => () =>
  agent(buildPrompt(w, 4174 + i), { label: `build:${w.id}`, phase: 'Build', isolation: 'worktree', model: w.model, effort: w.effort || 'high' })
    .then((r) => { reports[w.id] = r })))

phase('Integrate')
const results = []
for (const id of ORDER) {
  const w = WPS.find((x) => x.id === id)
  if (!w || !reports[id]) { results.push({ id, ok: false, note: 'no builder report' }); log(`${id}: no builder report; stopping`); break }
  const integrated = await agent(integratePrompt(id, reports[id]), { label: `integrate:${id}`, phase: 'Integrate', model: 'sonnet', effort: 'low' })
  let report = `${reports[id]}\n\nIntegration:\n${integrated}`
  let verdict = await agent(verifyPrompt(id, report), { label: `verify:${id}`, phase: 'Integrate', model: 'sonnet', effort: 'medium', schema: VERDICT })
  if (verdict && !verdict.pass) {
    log(`${id}: verification failed (${verdict.issues.length} issues); one fix round`)
    const fixed = await agent(fixPrompt(w, verdict), { label: `fix:${id}`, phase: 'Integrate', model: w.model, effort: w.effort || 'high' })
    report = `${report}\n\nFix round:\n${fixed}`
    verdict = await agent(verifyPrompt(id, report), { label: `reverify:${id}`, phase: 'Integrate', model: 'sonnet', effort: 'medium', schema: VERDICT })
  }
  // Escalation (docs/PLAN.md section 7): one max-effort fix attempt before handing back to R0.
  if (verdict && !verdict.pass && A.escalate !== false) {
    log(`${id}: still failing after the fix round; one max-effort escalation`)
    const escalated = await agent(fixPrompt(w, verdict), { label: `escalate:${id}`, phase: 'Integrate', effort: 'max' })
    report = `${report}\n\nMax-effort escalation:\n${escalated}`
    verdict = await agent(verifyPrompt(id, report), { label: `reverify2:${id}`, phase: 'Integrate', model: 'sonnet', effort: 'medium', schema: VERDICT })
  }
  const ok = !!(verdict && verdict.pass)
  results.push({ id, ok, summary: verdict && verdict.summary, issues: verdict && verdict.issues })
  log(`${id}: ${ok ? 'PASS' : 'FAIL'}`)
  if (!ok) { log(`${id} still failing after one fix round; stopping for R0`); break }
}
return { label: A.label, results }
