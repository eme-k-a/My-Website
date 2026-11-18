# Maintenance

How the live site stays current (WP-36, R10). Two parts: a weekly workflow that rebuilds and checks production on its own, and a dated checklist for the changes no automation can make. The steps for any content edit are in [`CONTENT_UPDATE.md`](CONTENT_UPDATE.md) (WP-35); this file says when they are due.

## Why a weekly rebuild

"Now" is the build date (ARCHITECTURE §3.5). "On view now", "Ongoing", durations, "expected" on the degree and the JSON-LD `worksFor` (ARCHITECTURE §11.3) are all computed when the site is built, so a site that is never rebuilt slowly goes stale. The weekly run rebuilds `main` with that week's date and deploys it.

## The weekly workflow (`.github/workflows/scheduled.yml`)

It runs every Monday at 09:23 UTC, and on demand from the Actions tab ("scheduled", "Run workflow"). It runs only from `main`, the default branch, and never on forks.

| Job | What it does |
|---|---|
| `rebuild` | Checks out `main`. `RELEASE=1 npm run build`: the content check stops the build while a tense flag is stale (ARCHITECTURE §3.6), and the release copy check blocks drafts and placeholders. `npm run test:pdf`. The `@smoke` specs against the local build. Then `netlify-cli@27.12.1 deploy --prod --no-build` of exactly that tested `dist/`. If `main` moved during the run, the deploy is skipped with a notice, because the push's own ci run tests and deploys the newer commit. |
| `production-checks` | Runs after a green `rebuild`. The `@smoke` specs at `SITE_URL` (with `BASE_URL` set they leave out exactly Netlify's free-plan badge script, F-063). `curl` of `$SITE_URL/resume.pdf` and `pdfinfo` must report 1 page. `scripts/check-links.ts --base "$SITE_URL"` requests every external link in the deployed `dist/`. All three run even when one fails. |
| `report` | Runs only on a failure. It opens an issue labeled `scheduled-check`, or comments on the one already open, with the run link and the result of every step. |

The workflow only reports. It never commits content, dates or tense changes; a person does that through the content runbook. Secrets (`NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`) are read from the environment and never printed.

### Reading a `scheduled-check` issue

The issue lists each step as `success`, `failure`, `skipped` or `not run`. Open the run link for the log. Then:

| Failed step | Usual cause | What to do |
|---|---|---|
| Release build | A line `check-content: <id>: tense is 'present' but the role ended <YYYY-MM>`: a role ended. Or a draft flag or placeholder reached `main`. | R1 follows `CONTENT_UPDATE.md` for the named entry (past-tense bullets and story, `tense: 'past'`). Nothing was deployed: production keeps the last good build until the fix lands. |
| PDF checks | The one-page resume no longer fits, usually after a content change. | Follow the PDF section of `CONTENT_UPDATE.md` (`print: false` on a named candidate; the gate never drops bullets itself). |
| Smoke test of the local build | A regression on `main`. | Treat it like a red ci run on `main`. Nothing was deployed. |
| Check the Netlify secrets, Deploy | A missing or expired token, or a Netlify outage. | Emeka renews the token in the repository secrets (README, Deploy), then dispatches the workflow. |
| Smoke test of production | Production differs from what was just built (a Netlify setting, a new injected script, the host). | Compare with the local smoke of the same run; the uploaded `scheduled-production-smoke-report` has traces. |
| Production resume.pdf is one page | The served PDF is not the tested one, or it is missing. | Check the deploy log and `/resume.pdf` in a browser. |
| External links | The log line `FAIL <url>: HTTP 404 (linked from <pages>)` names the link and the pages that carry it. | A 404 or 410 means the profile or page moved: update the URL in `src/content/resume.ts` with Emeka. A single timeout or 5xx can be the other site: dispatch the workflow once more before changing anything. |

`WARN ... 999` is LinkedIn refusing a bot, not a broken link; it never fails the run. A notice "Deploy skipped: main moved" is not a failure either.

Close the issue once a run is green again. A later failure while it is open adds a comment instead of a new issue.

## Dated checklist

Each item names when it is due, whether automation catches it, and the runbook step.

| When | Change | Caught automatically? |
|---|---|---|
| **January 2027** | **Verafin ends (Dec 2026): move it to past tense.** Rewrite the Verafin bullets and story in the past tense and set `tense: 'past'` (`CONTENT_UPDATE.md`). The story's "This is where my story stands today" and "Since September 2026, I have been" lines need Emeka's new wording. "On view now" and the JSON-LD `worksFor` drop on their own once the build date passes December. | Yes, loudly. From 2027-01-01 every build fails with `verafin: tense is 'present' but the role ended 2026-12`: the ci build on `main` and the Monday 2027-01-04 scheduled run, which opens the issue. Prepare the change in December so it can merge in the first days of January. |
| **May 2027** | **Degree completed.** "expected" on the degree disappears by itself from the May 2027 build. The hand-written copy does not: the MUN story ("where I expect to graduate in May 2027"), the MUN object text ("a year of study still ahead", "The degree is expected in May 2027"), and every "student" line (the intro and the site description) need Emeka's wording. Then run `RELEASE=1 npm run check:copy` and the build. | No. The build passes with the old copy, so this needs a person. |
| **After graduation** | **The @mun.ca address may lapse.** `contact.email` is a `@mun.ca` address. When Emeka gives a new address, update `contact.email`, rebuild and regenerate `resume/resume.tex` (`CONTENT_UPDATE.md`). | No. `mailto:` links are not checked, and a lapsed mailbox looks the same from outside. |
| **When a volunteer role ends** | **End date and past tense.** SDSJ is `end: 'present'` with `tense: 'present'`. When it ends, set `dates.end` to the real month and move it to past tense, as for Verafin. | No. An `end: 'present'` entry never looks stale; the temporal check fires only once a real end date has passed. |
| **Monthly** | **One review round**: `npm run review` (WP-34) into `review/runs/<date>/`, scored by R11, findings filed as PLAN §6 describes. Also one round after every content change (PLAN §6 item 6). | No. |
| **Quarterly** | **Five real-GPU screenshots from Emeka's laptop**, compared with the approved stills (ART_DIRECTION §10), because ci only ever renders with SwiftShader. | No. |

Every content edit follows `CONTENT_UPDATE.md`: `npm test`, `npm run build`, the regenerated `resume/resume.tex` committed, `npm run og`.

## Reminders as scheduled tasks (R0)

Nothing in the repository sends reminders for the items automation cannot catch. R0 can set them as scheduled tasks from its Claude Code session with the remote-session tools: `send_later` (one message back into the R0 session at a date) or `create_trigger` with `run_once_at` for one-shot reminders, or `cron_expression` for repeating ones. Write each prompt so it stands alone: the item, the file to edit, a link to this checklist and to `CONTENT_UPDATE.md`, and "ask Emeka for the wording; never invent it". Write times with the zone name (for example `2026-12-14T10:00:00[America/St_Johns]`).

Suggested reminders (dates are when to start, not deadlines):

| Reminder | When |
|---|---|
| Verafin past tense: ask Emeka for the wording, prepare the change | Mid-December 2026 |
| Verafin: confirm the January fix merged (the scheduled run fails until it does) | Monday 2027-01-04, after the 09:23 UTC run |
| Degree completed: copy pass with Emeka | Early May 2027 |
| The @mun.ca address: ask Emeka whether it still works | June 2027, then quarterly until it is replaced |
| Monthly review round | Monthly (a `cron_expression`) |
| Quarterly real-GPU screenshots from Emeka's laptop | Quarterly (a `cron_expression`) |

Recording each reminder (name, date, trigger id) in `docs/RULINGS.md` means a later session can find, change or delete it. The volunteer item has no date: it is due when Emeka says the role ended.
