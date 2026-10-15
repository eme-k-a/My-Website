# Content draft: resume and gallery copy

**Owner:** R1 Content & Resume Editor. Written for WP-00 on 2026-10-15.
**Consumers:** WP-03 transcribes §2, §3, §5 and §6 into `src/content/resume.ts` (and `src/content/site.ts` for `SITE_URL`). WP-04 turns §4 into `docs/RESUME_CHANGES.md` and uses §3 as the expected PDF text. WP-35 folds §8 into `docs/CONTENT_UPDATE.md`.
**Authority:** `docs/PLAN.md` (with its kickoff addendum) wins over this file. For schema field names, `docs/ARCHITECTURE.md` §3 wins. For what the visitor sees, `docs/spec/EXPERIENCE.md` wins, except where this file owns the words (R1 owns all content copy). This file wins over the scratchpad proposal `p_resume.md`.

**Transcription rules for WP-03 (read before copying anything):**
1. Copy every string exactly as written between double quotes in this file, without the quotes. Do not "improve" wording; wording changes go through R1 and this file.
2. No em dash (U+2014) anywhere. En dashes appear only in date ranges and are produced by `formatRange()`, never typed into content.
3. Apostrophes and quotes are straight ASCII (`'` and `"`), for example "St. John's". Lists use the Oxford comma ("chat, and password recovery").
4. Unknown facts:
   - If the schema field is **optional** (project `role` and `dates`, education `start`, certification `issuer`, `date`, `url`), **omit the field**. Never store a placeholder string in a typed field such as `YYYY-MM`.
   - If the field is **required text** inside a `Copy` (for example the desk body's target roles), store the exact `[placeholder: ...]` string given here with `draft: true`. `RELEASE=1 npm run check:copy` then blocks launch until it is filled.
   - `exhibit.curatorNote` is **optional** (WP-02 ruling): omit it until Emeka writes a note. Never store a placeholder curator's note.
5. Bullet keys such as `verafin.b1` are document references only (the overflow gate prints "verafin bullet 1"). The schema has no bullet id field; keep bullets in the listed order.
6. **The phone number is never written anywhere in the repo.** `p_resume.md` §4 in the scratchpad contains it on its header line: do not copy that header. Use §2 and §3.2 of this file instead.
7. Anything under "Alternates" (§3.5) stays in this file only. It is not transcribed into `resume.ts`.

---

## 1. Status and approval

**Status:** draft. Nothing in this file is approved by Emeka yet.

**The rule:**
- Every first-person sentence (lobby intro, every story block, the desk body, every curator's note) is `draft: true` until Emeka approves it at **Gate G5**.
- Every Nasdaq Verafin item (bullets, story, caption, tags, location) is `draft: true` (where the schema has a flag) until Emeka approves it at **Gate G0**, ideally after his manager has cleared it for public use. Verafin works in financial crime, so nothing more specific than the three safe bullets goes public without that clearance.
- Fields without a `draft` flag in the schema (captions, titles, eyebrow, headline, hint, wing titles, project taglines) are still part of the G5 copy review below.
- `RELEASE=1 npm run check:copy` fails while any `draft: true` or `[placeholder` remains, so launch (G5) cannot happen with unapproved copy.

**How approval is recorded:**
- G0: Emeka replies "approved" (or with edits) to the before/after PDF previews. WP-04 records the date and his edits at the top of `docs/RESUME_CHANGES.md`, then a commit with trailer `WP: WP-04` flips the Verafin bullets to `draft: false`.
- G5: R0 sends Emeka the copy list below (rendered from `/resume/` and the `/exhibit/<id>/` pages). Each approved block is flipped to `draft: false` in one commit per gate; rejected inference sentences are deleted, not softened.

### 1.1 Gate G0 (resume): what Emeka signs off
1. The new Nasdaq Verafin entry: title "Software Development Co-op Student", company line "Nasdaq Verafin", dates "Sep 2026 – Dec 2026", location "St. John's, NL" (on-site assumed), and bullets `verafin.b1` to `verafin.b3` (§3.3). The wording choices "accurate, readable reports for end users" and "modular, reusable components" are the editor's, not facts he supplied.
2. Every rewritten bullet: `mysa.b1`, `mysa.b2`, `mysa.b3`, `wailo.b3`, `cfia.b1` (two bullets merged into one), `safe-sip.b1`, `sdsj.b1` (change log rows 7 to 9, 12, 14, 20 and 23 in §4).
3. Style changes: "(Co-Op)" to "(Co-op)"; "IT Support Technician - Intern" to "IT Support Technician (Intern)"; "July 2024" to "Jul 2024"; present tense for ongoing roles ("Engineer", "Spearhead"); a colon instead of the dash in the Enactus bullet.
4. Skills regrouped into 4 lines, with "Cloud Computing" dropped from Concepts (covered by AWS and the AWS certification).
5. The KlarUp heading: "KlarUp: Collaborative Productivity App | React Native, Python, Expo" (colon instead of a spaced hyphen; "Expo" added because the second bullet is about Expo Application Services).
6. Personal Finance Tracker leaves the PDF and `.tex` (it stays in the gallery's Projects wing).
7. Header: no phone on the public PDF (a private PDF carries it), LinkedIn without the trailing slash, the site host added once the Netlify site exists.

### 1.2 Gate G5 (all copy): what Emeka signs off
1. Name display form on the site: "Chukwuemeka (Emeka) Nduka-Nwagbo".
2. Lobby: eyebrow, headline, intro, hint (§6.1).
3. All 10 exhibit stories (§5), every block. Each is first person.
4. All 10 captions, tags and object descriptions (§5). Captions are written in neutral museum-label voice from resume facts only.
5. Curator's notes, if any: the field is optional and none is stored until Emeka writes one (or approves wording R1 proposes from facts he supplies).
6. The desk body, including his target roles (§6.3).
7. The Personal Finance Tracker tagline "Full-Stack Web App" (the schema requires a tagline; the resume has none).
8. Meta title, meta description and the 404 copy (§6.5, §6.6).

### 1.3 Inferences that go beyond the resume (G5 must confirm or delete each sentence)
Every sentence below is in a `draft: true` block. If Emeka does not confirm it, delete the sentence (do not reword it into a new claim).

| Where | Sentence or phrase | Why it is an inference |
|---|---|---|
| Lobby intro | "who builds software across mobile, web, and data" | A summary of the resume, not a line from it |
| verafin story | "This is where my story stands today." and "Since September 2026, I have been" | Dated framing (true only until Dec 2026) |
| verafin story | "In a domain like this, data has to be accurate and clear before it can be useful, and that is the standard I hold my work to." | Opinion and self-description |
| verafin story | "This exhibit is still being installed, so check back after December." | Dated; implies more detail will follow |
| mysa story | "improved our internal support tooling" | "our" frames him as part of the support team; resume says "internal Customer Support Platform tooling" |
| wailo story | "Wailo was my first developer co-op" | Not stated on the resume (CFIA was an IT internship; the ordering suggests it but does not say it) |
| wailo story | "for the Calgary company" | Resume gives "Calgary, AB / Remote" as the role's location, not the company's headquarters |
| wailo story | "It taught me what it takes to carry a feature all the way to a public release." | Lesson learned, and implies his features shipped in the public release |
| cfia story | "This is the oldest work in the collection, and where my career began." | "where my career began" is a characterization |
| cfia story | "Long before I wrote production code, this role taught me to diagnose problems methodically and to communicate clearly ..." | Timing claim and lessons learned |
| klarup story | "The idea is that tasks are easier to finish when people hold each other accountable" | Product motivation, not on the resume |
| klarup story | "KlarUp taught me that a release process deserves as much design as the features it ships." | Lesson learned |
| finance-tracker story | "What makes it more than a ledger" and "an early look at how language models can turn raw numbers into practical guidance" | Editorial framing; "early" is a timing claim |
| safe-sip story | "It is the exhibit where my software meets the physical world ..." | Editorial framing |
| sdsj story | "The heart of the role is our recurring monthly mini-hackathons" | Implies the hackathons are his main duty |
| sdsj story | "I love bringing those groups together, because each brings a perspective the others need." | Feeling and opinion |
| sdsj story | "Leading the community has sharpened how I organize, how I communicate, and how I make room for other people to build." | Lesson learned |
| mun story | "My studies have grounded me in algorithms, data structures, and the basics of compilers and operating systems." | Attributes the Concepts skills line to coursework |
| mun story | "let me test those ideas against real products" and "I treat the degree and the work as one continuous education" | Editorial framing |
| certifications story | "knowledge I have put to work with services like AWS Cognito" | Links the certification to the Mysa work |
| certifications story | "reflect a different commitment: thinking carefully about the impact of the technology I help create, including its role in a changing energy landscape" | Characterizes the programs and his motivation |
| Desk body | "I'm open to [placeholder: target roles]" | Unknown until Emeka says what he is looking for |
| Project card subtitle | "Project" only, never "personal project" (EXPERIENCE §5.8 now matches) | The resume never says "personal" (see §5.5, §5.6); R6 must not add it |

---

## 2. Heading and contact

| Field (`contact`, strict object) | Value | Status |
|---|---|---|
| `name` (resume heading, PDF, `.tex`, JSON-LD) | "Chukwuemeka Nduka-Nwagbo" | Fact. Stored in mixed case; any capitals in the PDF heading are styling |
| `preferredName` | "Emeka" | Fact |
| Site display form (derived, not stored) | "Chukwuemeka (Emeka) Nduka-Nwagbo" | [confirm] at G5. Derive as `<first word of name> (<preferredName>) <rest of name>` in `selectors.ts` |
| `email` | "cndukanwagbo@mun.ca" | Fact. May lapse after graduation (§8) |
| `linkedin` | "https://linkedin.com/in/emekanduka" | Fact. No trailing slash. Displayed as "linkedin.com/in/emekanduka" |
| `github` | "https://github.com/eme-k-a" | [confirm] handle. Shown on the site (desk), not on the PDF |
| `location` | "St. John's, NL" | Fact |
| `phoneInPublicPdf` | `false` (literal) | Policy |

**Site URL:** `SITE_URL` in `src/content/site.ts` is the only place the domain lives. Until WP-18 creates the Netlify site it is `https://[placeholder: netlify-subdomain].netlify.app`; WP-18 sets the real `https://<name>.netlify.app`. A custom domain later is a one-line change. `meta.siteUrl` equals `SITE_URL`.

**Phone policy (Addendum ruling, no exceptions):**
- The phone number is never committed: not in this file, not in `resume.ts`, not in the schema, not in `dist/`, not in `resume/resume.tex`, not in logs or test fixtures.
- It is read only by `npm run resume:private`, from the `RESUME_PHONE` environment variable or a gitignored `.env.local` line `RESUME_PHONE=NNN-NNN-NNNN`. Output goes to `out/private/resume.pdf` and `out/private/resume.tex` (gitignored).
- The site and the public `/resume.pdf` never show a phone number. Email and LinkedIn are the public contact routes.
- Emeka supplies the number on his own machine. Agents never ask for it in chat or write it into a file.
- JSON-LD `Person` leaves out both phone and email (the email is public in the PDF already).

---

## 3. Final one-page resume text

### 3.1 Print rules
- US Letter, 0.5 in margins, Jake's Resume look (ARCHITECTURE §4.1). Section order: header, Education, Experience, Technical Skills, Projects, Volunteer Experience, Certifications. Section headings print uppercase with letter spacing.
- **Public header row:** email | LinkedIn | site host | location.
- **Private header row:** the phone from `RESUME_PHONE` first, then the same items.
- **Site host rule:** while `SITE_URL` contains "placeholder", `printModel()` leaves the site host out of the header, so the PDF Emeka approves at G0 is usable right away. Once WP-18 sets the real URL, the host (for example "<name>.netlify.app", with no `https://`) appears automatically.
- Only bullets with `print: true` print. An entry with zero printed bullets is left out of the PDF and `.tex` (this is how Personal Finance Tracker leaves the PDF).
- Dates come from `formatRange()`: "Mon YYYY – Mon YYYY", "Present" for ongoing roles. Education prints "Expected Graduation: May 2027" while `isExpected` is true, then "May 2027".
- The build never drops a bullet. If the PDF overflows, the overflow gate fails and names trim candidates (priority 3 first, oldest entries first). Trimming is a content edit (`print: false`) made by R1 and approved by Emeka.

### 3.2 Full text as it prints (public PDF, build date 2026-10-15, before the Netlify site exists)

```
CHUKWUEMEKA NDUKA-NWAGBO
cndukanwagbo@mun.ca | linkedin.com/in/emekanduka | St. John's, NL

EDUCATION
Memorial University of Newfoundland                                   St. John's, NL
B.Eng in Computer Engineering                                  Expected Graduation: May 2027

EXPERIENCE
Software Development Co-op Student                                    Sep 2026 – Dec 2026
Nasdaq Verafin                                                              St. John's, NL
- Develop data platform features supporting fraud detection and anti-money laundering software.
- Build data reporting features that turn platform data into accurate, readable reports for end users.
- Develop data reporting plugins that extend reporting capabilities with modular, reusable components.

Full Stack Software Developer (Co-op)                                 Jan 2026 – May 2026
Mysa                                                                        St. John's, NL
- Built end-to-end Detox CI/CD pipelines for iOS and Android, automating dev and production store releases to significantly reduce manual QA overhead.
- Led the SSO integration with a major utility partner for demand response enrollment using Keycloak and OAuth 2.0, resolving token exchange bottlenecks for secure access across mobile and web.
- Built and deployed a responsive web app using AWS Cognito for authentication, monitoring telemetry and logs to troubleshoot runtime failures for a stable production release.
- Enhanced internal Customer Support Platform tooling by building smarter search classifications and integrating Pylon bug-report metadata to streamline issue routing and operator efficiency.

Front End Developer (Co-op)                                           May 2025 – Aug 2025
Wailo                                                                 Calgary, AB / Remote
- Developed and optimized core user-facing features in React Native, including account management, chat, and password recovery with deep link integration.
- Built and deployed a responsive landing page to improve product visibility and user acquisition.
- Supported the App Store release with QA testing and bug fixes to improve performance and usability.

IT Support Technician (Intern)                                        Dec 2022 – Aug 2024
Canadian Food Inspection Agency                                        Ottawa, ON / Remote
- Resolved high-volume hardware and software tickets for a distributed team in Assyst and ServiceNow.

TECHNICAL SKILLS
Languages: Python, C++, C#, JavaScript, TypeScript, HTML, CSS
Frameworks: React, React Native, Next.js, Node.js, Express, FastAPI
Data, Cloud & DevOps: MongoDB, SQLite, AWS, Firebase, Kubernetes, Detox, GitHub Actions
Concepts: Algorithms, Data Structures, Agile, CI/CD, OAuth 2.0 / OIDC, Compiler & OS Basics

PROJECTS
KlarUp: Collaborative Productivity App | React Native, Python, Expo
- Engineered a gamified, cross-platform task management application using React Native and a Python API, integrating collaborative features to drive user accountability and social motivation.
- Architected the production release pipeline using Expo Application Services (EAS), securely injecting environment variables to generate untethered, standalone APKs for Android.

VOLUNTEER EXPERIENCE
Member (Right-To-Rise: Safe Sip)                                      Sep 2025 – Present
Enactus Memorial                                                            St. John's, NL
- Engineer a tamper-detecting smart lid MVP: a 3D-printed enclosure with a Raspberry Pi Pico W and I2C orientation sensor, using Euclidean distance and Euler angles to detect tampering in real time.

President                                                             Jul 2024 – Present
Software Developers of St. John's                                           St. John's, NL
- Spearhead recurring monthly mini-hackathons, uniting developers, designers, and founders to collaborate on projects and foster an active, cross-functional tech community.

CERTIFICATIONS
AWS Certified Cloud Practitioner | Tech Stewardship Practice Program | Tech Stewardship for the Energy Transition
```

Once `SITE_URL` is real, the header row becomes `cndukanwagbo@mun.ca | linkedin.com/in/emekanduka | <name>.netlify.app | St. John's, NL`. The private PDF prepends `<RESUME_PHONE> | `. The KlarUp heading has no date on the right until Emeka supplies project dates.

### 3.3 Bullet register (transcribe into each entry's `bullets`, in this order)

Priority: 1 keep, 2 normal, 3 trim first. Characters are counted without the bullet marker (about 100 fit on one printed line).

| Key | Text | print | priority | draft | Chars |
|---|---|---|---|---|---|
| `verafin.b1` | "Develop data platform features supporting fraud detection and anti-money laundering software." | true | 1 | true | 93 |
| `verafin.b2` | "Build data reporting features that turn platform data into accurate, readable reports for end users." | true | 2 | true | 100 |
| `verafin.b3` | "Develop data reporting plugins that extend reporting capabilities with modular, reusable components." | true | 2 | true | 100 |
| `mysa.b1` | "Built end-to-end Detox CI/CD pipelines for iOS and Android, automating dev and production store releases to significantly reduce manual QA overhead." | true | 1 | false | 148 |
| `mysa.b2` | "Led the SSO integration with a major utility partner for demand response enrollment using Keycloak and OAuth 2.0, resolving token exchange bottlenecks for secure access across mobile and web." | true | 1 | false | 191 |
| `mysa.b3` | "Built and deployed a responsive web app using AWS Cognito for authentication, monitoring telemetry and logs to troubleshoot runtime failures for a stable production release." | true | 2 | false | 173 |
| `mysa.b4` | "Enhanced internal Customer Support Platform tooling by building smarter search classifications and integrating Pylon bug-report metadata to streamline issue routing and operator efficiency." | true | 3 | false | 189 |
| `wailo.b1` | "Developed and optimized core user-facing features in React Native, including account management, chat, and password recovery with deep link integration." | true | 1 | false | 152 |
| `wailo.b2` | "Built and deployed a responsive landing page to improve product visibility and user acquisition." | true | 3 | false | 96 |
| `wailo.b3` | "Supported the App Store release with QA testing and bug fixes to improve performance and usability." | true | 2 | false | 99 |
| `cfia.b1` | "Resolved high-volume hardware and software tickets for a distributed team in Assyst and ServiceNow." | true | 1 | false | 99 |
| `klarup.b1` | "Engineered a gamified, cross-platform task management application using React Native and a Python API, integrating collaborative features to drive user accountability and social motivation." | true | 1 | false | 189 |
| `klarup.b2` | "Architected the production release pipeline using Expo Application Services (EAS), securely injecting environment variables to generate untethered, standalone APKs for Android." | true | 2 | false | 176 |
| `finance-tracker.b1` | "Built a full-stack personal finance tracker using the MERN stack to manage income, expenses, and budgets, with ChatGPT API integration for real-time financial health analysis and personalized recommendations." | **false** | 3 | false | 208 |
| `safe-sip.b1` | "Engineer a tamper-detecting smart lid MVP: a 3D-printed enclosure with a Raspberry Pi Pico W and I2C orientation sensor, using Euclidean distance and Euler angles to detect tampering in real time." | true | 2 | false | 196 |
| `sdsj.b1` | "Spearhead recurring monthly mini-hackathons, uniting developers, designers, and founders to collaborate on projects and foster an active, cross-functional tech community." | true | 3 | false | 170 |

Notes:
- Non-Verafin bullets are `draft: false` because they restate the existing resume; their rewrites are still approved at G0 through the before/after (§1.1).
- `finance-tracker.b1` is the original resume bullet, kept verbatim for the gallery's "The work" list. It has `print: false`, so the project is left out of the PDF and `.tex`.
- The dialog shows every bullet of an entry ("The work"), printed or not.

### 3.4 Non-bullet blocks
- **Education** (from the `mun` entry): institution "Memorial University of Newfoundland", location "St. John's, NL", degree "B.Eng in Computer Engineering", graduation `2027-05`.
- **Skills** (`skills`, exactly 4 lines, each under 92 characters):

| `label` | `items` (in order) |
|---|---|
| "Languages" | "Python", "C++", "C#", "JavaScript", "TypeScript", "HTML", "CSS" |
| "Frameworks" | "React", "React Native", "Next.js", "Node.js", "Express", "FastAPI" |
| "Data, Cloud & DevOps" | "MongoDB", "SQLite", "AWS", "Firebase", "Kubernetes", "Detox", "GitHub Actions" |
| "Concepts" | "Algorithms", "Data Structures", "Agile", "CI/CD", "OAuth 2.0 / OIDC", "Compiler & OS Basics" |

- **Certifications line:** the three certification names joined with " | ", in the order of §5.10.

### 3.5 Alternates (kept here only; never transcribed into `resume.ts`)

**A1. Verafin placeholder versions** (for when Emeka can share technologies, scale and outcomes, cleared by his manager). Each filled version must stay within two printed lines.
- `verafin.b1` alt: "Develop [component, e.g. data pipelines / services / APIs] for Nasdaq Verafin's data platform using [technology], supporting fraud detection and anti-money laundering software used by [X]+ financial institutions."
- `verafin.b2` alt: "Build data reporting features with [technology, e.g. SQL / framework], enabling [users, e.g. investigators or analysts] to [outcome] and reducing [report generation time / manual effort] by [X%]."
- `verafin.b3` alt: "Develop [N] data reporting plugins in [language/framework] that extend the reporting framework with [new report types / data sources], [impact, e.g. cutting new-report turnaround from [A] to [B]]."
- If he uses SQL at Verafin, add "SQL" to the Languages skills line. If not, leave it out.

**A2. Verafin past tense** (ready for the January 2027 switch, §8; each at most 100 characters):
- `verafin.b1`: "Developed data platform features supporting fraud detection and anti-money laundering software."
- `verafin.b2`: "Built data reporting features turning platform data into accurate, readable reports for end users."
- `verafin.b3`: "Developed data reporting plugins extending reporting capabilities with modular, reusable components."

**A3. Verafin location if not on-site:** set `location.mode` to `hybrid` or `remote`; `formatLocation()` then prints "St. John's, NL / Hybrid" or "St. John's, NL / Remote".

**A4. Mysa database:** if the Mysa web app also used a database, `mysa.b3` becomes "Built and deployed a responsive web app using AWS Cognito for authentication and [database] for data storage, monitoring telemetry and logs to troubleshoot runtime failures for a stable production release." (check that it stays at two lines).

**A5. Tier 3 trims** (only if the overflow gate still fails after Tier 1 and 2; each saves about one line; Emeka approves first):
- `sdsj.b1` one-line version (105 chars): "Spearhead monthly mini-hackathons uniting developers, designers, and founders to collaborate on projects."
- Drop the "Concepts" skills line.

**A6. Personal Finance Tracker back on the PDF** (one line, 106 chars), with the project heading "Personal Finance Tracker | MERN, ChatGPT API": "Built a MERN finance tracker for income, expenses, and budgets with ChatGPT API financial health analysis." To use it, replace `finance-tracker.b1` text and set `print: true`, then confirm the PDF still fits.

**A7. Verafin story highlight:** once his manager approves one public highlight, it replaces the sentence "This exhibit is still being installed, so check back after December." with "[highlight]".

### 3.6 Fit
Estimated against the original (no LaTeX here; the Playwright overflow gate and the CI LaTeX job are the authority): Verafin adds about 5 lines; Tier 1 edits (§4 rows 8, 9, 12, 14, 16 and 20) remove about 2 to 5; dropping Personal Finance Tracker (row 18) removes about 3 to 4. Net about 2 to 6 lines spare. If the gate still overflows, R1 proposes trims in priority order (`mysa.b4`, `wailo.b2`, then §3.5 A5) for Emeka to approve.

---

## 4. Change log versus the original resume

"Before" is the one-page PDF transcription Emeka supplied (the phone number is deliberately not reproduced). WP-04 copies this table into `docs/RESUME_CHANGES.md` with the before/after PNGs. Rows marked "unchanged" are listed so the log is complete.

| # | Where | Before | After | Reason |
|---|---|---|---|---|
| 1 | Header | "[phone] \| cndukanwagbo@mun.ca \| ..." | Phone removed from the public PDF; the private PDF keeps it, read from `RESUME_PHONE` | `/resume.pdf` is public on the web. The phone is never committed |
| 2 | Header | "linkedin.com/in/emekanduka/" | "linkedin.com/in/emekanduka" | Trailing slash is noise |
| 3 | Header | (no site) | Site host added before the location: "email \| LinkedIn \| <name>.netlify.app \| St. John's, NL" | Points recruiters to the gallery. Omitted until the Netlify site exists |
| 4 | Education | unchanged | unchanged | |
| 5 | Experience | (no entry) | New first entry: "Software Development Co-op Student", "Nasdaq Verafin", "Sep 2026 – Dec 2026", "St. John's, NL", bullets `verafin.b1` to `b3` | Current role, newest first. Official title kept exactly (it already contains "Co-op"); company brand "Nasdaq Verafin"; a fixed end date tells recruiters when he is free |
| 6 | Mysa title | "Full Stack Software Developer (Co-Op)" | "Full Stack Software Developer (Co-op)" | Usual Canadian spelling, matches the Verafin title |
| 7 | `mysa.b1` | "Built end-to-end Detox CI/CD pipelines for iOS and Android, automating the full release lifecycle for dev and production store releases to significantly reduce manual QA overhead." | "Built end-to-end Detox CI/CD pipelines for iOS and Android, automating dev and production store releases to significantly reduce manual QA overhead." | Removes the repeated "release ... releases"; same facts |
| 8 | `mysa.b2` | "Led the Single Sign-On (SSO) integration with a major utility partner for demand response enrollment using Keycloak and OAuth 2.0, resolving critical token exchange bottlenecks to ensure seamless, secure access across mobile and web." | "Led the SSO integration with a major utility partner for demand response enrollment using Keycloak and OAuth 2.0, resolving token exchange bottlenecks for secure access across mobile and web." | 233 to 191 chars (3 lines to 2); drops filler ("critical", "seamless") |
| 9 | `mysa.b3` | "Built and deployed a responsive web app with AWS Cognito for user authentication and database management, monitoring backend telemetry and logs to troubleshoot runtime failures and ensure a stable production release." | "Built and deployed a responsive web app using AWS Cognito for authentication, monitoring telemetry and logs to troubleshoot runtime failures for a stable production release." | Cognito is an identity service, not a database, so "database management" was inaccurate; 216 to 173 chars. If a database was used, see §3.5 A4 |
| 10 | `mysa.b4` | unchanged | unchanged | |
| 11 | Wailo title | "Front End Developer (Co-Op)" | "Front End Developer (Co-op)" | Same as row 6 |
| 12 | `wailo.b3` | "Contributed to the Apple App Store release process, performing QA testing and bug fixes to enhance performance and usability." | "Supported the App Store release with QA testing and bug fixes to improve performance and usability." | One line instead of two; same facts |
| 13 | CFIA title | "IT Support Technician - Intern" | "IT Support Technician (Intern)" | Every role uses the same parenthetical style |
| 14 | `cfia.b1` | Two bullets: "Provided technical support and troubleshooting for hardware and software issues across a distributed team." and "Managed and resolved tickets using Assyst and ServiceNow in a high-volume support environment." | One bullet: "Resolved high-volume hardware and software tickets for a distributed team in Assyst and ServiceNow." | Saves 1 to 2 lines; keeps every fact (hardware and software, distributed team, high volume, both tools) |
| 15 | Wailo `b1`, `b2` | unchanged | unchanged | |
| 16 | Technical Skills | "Languages: Python, C++, C#, HTML, CSS, JavaScript, TypeScript" / "Frameworks & Tools: React, React Native, Next.js, Node.js, Express, MongoDB, SQLite, FastAPI, Kubernetes, AWS, Firebase, Detox, GitHub Actions" / "Concepts: Algorithms, Data Structures, Agile, Cloud Computing, CI/CD, OAuth 2.0 / OIDC, Compiler & OS basics" | The 4 lines in §3.4 | Each line fits without wrapping; tools grouped by kind; "Cloud Computing" dropped (covered by AWS and the AWS certification); "Basics" capitalized to match the other items. No skill added |
| 17 | KlarUp heading | "KlarUp - Collaborative Productivity App \| React Native, Python" | "KlarUp: Collaborative Productivity App \| React Native, Python, Expo" | Colon instead of a spaced hyphen; Expo named because `klarup.b2` uses Expo Application Services |
| 18 | Personal Finance Tracker | "Personal Finance Tracker \| MERN, ChatGPT API" plus one 3-line bullet | Removed from the PDF and `.tex` (`print: false`); stays in the gallery's Projects wing | Saves 3 to 4 lines; the weakest item, already outclassed by KlarUp. One-line version kept in §3.5 A6 |
| 19 | KlarUp `b1`, `b2` | unchanged | unchanged | |
| 20 | `safe-sip.b1` | (the original uses an en dash as sentence punctuation) "Engineering the hardware MVP for a tamper-detecting smart lid – prototyping a 3D-printed enclosure with a Raspberry Pi Pico W and I2C orientation sensor, with embedded spatial logic using Euclidean distance and Euler angles to detect tampering in real-time." | "Engineer a tamper-detecting smart lid MVP: a 3D-printed enclosure with a Raspberry Pi Pico W and I2C orientation sensor, using Euclidean distance and Euler angles to detect tampering in real time." | Present tense for an ongoing role ("Engineering" was a participle); colon instead of a dash used as sentence punctuation; "in real time" (noun phrase, no hyphen); 3 lines to 2 |
| 21 | Enactus title | unchanged: "Member (Right-To-Rise: Safe Sip)" | unchanged | Capitalization kept as on the original until Emeka confirms (§7) |
| 22 | SDSJ dates | "July 2024 – Present" | "Jul 2024 – Present" | Three-letter months everywhere |
| 23 | `sdsj.b1` | "Spearheaded recurring monthly mini-hackathons, ..." | "Spearhead recurring monthly mini-hackathons, ..." (rest unchanged) | Present tense for an ongoing role |
| 24 | Certifications | unchanged | unchanged | |
| 25 | Section order | Education, Experience, Technical Skills, Projects, Volunteer Experience, Certifications | unchanged | |

---

## 5. Structured entries

Arrays in `resume.ts`, in this order:
- `experiences`: `verafin`, `mysa`, `wailo`, `cfia` (newest first; the main aisle).
- `projects`: `klarup`, `finance-tracker`.
- `volunteer`: `safe-sip`, `sdsj`.
- `education`: `mun`.
- `certifications`: one block with id `certifications`.

**Per-entry conventions:**
- `exhibit.title` is the artwork title from EXPERIENCE §4 (the story headings in `p_resume.md` §5 are retired).
- `exhibit.tags`: the first 4 tags show on the placard as "Medium"; the dialog shows all (schema max 8).
- `exhibit.caption`: one line, at most 140 characters and 18 words, neutral label voice, resume facts only. It is also the OG and meta description of `/exhibit/<id>/`.
- `exhibit.story`: `p` blocks, all `draft: true`, 60 to 110 words per story in total.
- `exhibit.curatorNote`: omitted (the field is optional) until Emeka supplies a note of 2 to 3 sentences in his own words; then `{ text, draft: true }`. Never store a placeholder note.
- `exhibit.takeaway` and `exhibit.links`: omitted unless stated.
- **`exhibit.object`** ("The object" in the dialog, EXPERIENCE §5.9): `{ text, draft: true }` with the text from EXPERIENCE §4, repeated below, `draft: true` because it must match the built object (confirm at G4 and G5).
- Exhibit numbers, durations, "ON VIEW NOW" and "ONGOING" are derived, never stored.

### 5.1 `verafin`

| Field | Value |
|---|---|
| `kind` | `work` |
| `role` | "Software Development Co-op Student" |
| `shortRole` | "Software Development Co-op" (hero line) |
| `org` | "Nasdaq Verafin" |
| `employment` | `co-op` |
| `location` | city "St. John's", region "NL", mode `on-site` ([confirm]: on-site, hybrid or remote; §3.5 A3) |
| `dates` | start `2026-09`, end `2026-12` (derived: "Sep 2026 – Dec 2026", 4 months, ON VIEW NOW while the build month is within the range) |
| `tense` | `present` (the build fails from 2027-01 until this becomes `past`; §8) |
| `bullets` | `verafin.b1`, `verafin.b2`, `verafin.b3` (§3.3), all `draft: true` |
| `exhibit.title` | "The Reporting Engine" |
| `exhibit.label` | omit (defaults to the org) |
| `exhibit.caption` | "Data platform, reporting, and plugin work on software that supports fraud detection and anti-money laundering." (110 chars, 15 words) |
| `exhibit.tags` | "Data Platforms", "Data Reporting", "Reporting Plugins". Add technologies only when Emeka names them publicly; never store a placeholder tag |
| `exhibit.curatorNote` | omit until Emeka writes one |
| `exhibit.object` | "A frosted glass column feeds a six-by-six grid of bars that refreshes like a report. Three brass cartridges docked in the column are the plugins that extend it." (`draft: true`) |

**Story** (101 words):
1. `p`, draft: "This is where my story stands today. Since September 2026, I have been a Software Development Co-op Student at Nasdaq Verafin, working on software that supports fraud detection and anti-money laundering. My work sits on the data side of the product: data platform features, data reporting features that turn platform data into accurate, readable reports, and reporting plugins built from modular, reusable components."
2. `p`, draft: "In a domain like this, data has to be accurate and clear before it can be useful, and that is the standard I hold my work to. This exhibit is still being installed, so check back after December."

### 5.2 `mysa`

| Field | Value |
|---|---|
| `kind` | `work` |
| `role` | "Full Stack Software Developer (Co-op)" |
| `org` | "Mysa" |
| `employment` | `co-op` |
| `location` | city "St. John's", region "NL", mode `on-site` (schema default; prints as on the original resume, with no qualifier) |
| `dates` | start `2026-01`, end `2026-05` (5 months) |
| `tense` | `past` |
| `bullets` | `mysa.b1` to `mysa.b4` |
| `exhibit.title` | "Warm Start" |
| `exhibit.caption` | "End-to-end Detox release pipelines for iOS and Android, and a Single Sign-On integration with a major utility partner." (118 chars, 18 words) |
| `exhibit.tags` | "Detox", "CI/CD", "Keycloak", "OAuth 2.0", "AWS Cognito", "iOS", "Android" |
| `exhibit.curatorNote` | omit until Emeka writes one |
| `exhibit.object` | "A ring dial on a wall unit lights four segments in turn (build, end-to-end tests, dev release, store release) as the release pipeline warms up. At its foot, a brass key passes through a ring: the single sign-on token exchange." (`draft: true`) |

**Story** (104 words):
1. `p`, draft: "At Mysa, I was a Full Stack Software Developer co-op from January to May 2026. I built end-to-end Detox CI/CD pipelines for iOS and Android that automated dev and production store releases and reduced manual QA overhead. I led the Single Sign-On integration with a major utility partner for demand response enrollment, using Keycloak and OAuth 2.0 and resolving token exchange bottlenecks for secure access across mobile and web."
2. `p`, draft: "I also built and deployed a responsive web app with AWS Cognito authentication, used telemetry and logs to troubleshoot runtime failures, and improved our internal support tooling with smarter search classifications and Pylon bug-report metadata."

### 5.3 `wailo`

| Field | Value |
|---|---|
| `kind` | `work` |
| `role` | "Front End Developer (Co-op)" |
| `org` | "Wailo" |
| `employment` | `co-op` |
| `location` | city "Calgary", region "AB", mode `remote` (prints "Calgary, AB / Remote") |
| `dates` | start `2025-05`, end `2025-08` (4 months) |
| `tense` | `past` |
| `bullets` | `wailo.b1`, `wailo.b2`, `wailo.b3` |
| `exhibit.title` | "The Deep Link" |
| `exhibit.caption` | "React Native features, from chat to password recovery through deep links, plus QA for the App Store release." (108 chars, 18 words) |
| `exhibit.tags` | "React Native", "Deep Linking", "QA Testing", "App Store Release", "Landing Page" |
| `exhibit.curatorNote` | omit until Emeka writes one |
| `exhibit.object` | "A phone leans back on its stand while a glowing link arcs into it from an envelope, and the screen answers with a reset card: password recovery through a deep link. The blank brass tag marks the App Store release." (`draft: true`) |

**Story** (100 words):
1. `p`, draft: "Wailo was my first developer co-op: from May to August 2025, I worked remotely as a Front End Developer for the Calgary company. I developed and optimized core user-facing features in React Native, including account management, chat, and password recovery with deep link integration, and I built and deployed a responsive landing page to improve product visibility and user acquisition."
2. `p`, draft: "As the app headed for its Apple App Store release, I took on QA testing and bug fixes to improve performance and usability. It taught me what it takes to carry a feature all the way to a public release."

### 5.4 `cfia`

| Field | Value |
|---|---|
| `kind` | `work` |
| `role` | "IT Support Technician (Intern)" |
| `org` | "Canadian Food Inspection Agency" |
| `employment` | `internship` |
| `location` | city "Ottawa", region "ON", mode `remote` (prints "Ottawa, ON / Remote") |
| `dates` | start `2022-12`, end `2024-08` (1 yr 9 mo) |
| `tense` | `past` |
| `bullets` | `cfia.b1` |
| `exhibit.title` | "The Ticket Spindle" |
| `exhibit.label` | omit (defaults to the org; the 3D label wraps at word boundaries) |
| `exhibit.caption` | "Technical support for a distributed team: hardware and software tickets resolved in Assyst and ServiceNow." (106 chars, 15 words) |
| `exhibit.tags` | "ServiceNow", "Assyst", "Technical Support", "Troubleshooting", "Remote Support" |
| `exhibit.curatorNote` | omit until Emeka writes one |
| `exhibit.object` | "Paper tickets settle one by one onto a brass desk spindle, each stamped in its corner: steady, methodical support for a distributed team." (`draft: true`) |

**Story** (93 words):
1. `p`, draft: "This is the oldest work in the collection, and where my career began. From December 2022 to August 2024, I worked remotely as an IT Support Technician intern for the Canadian Food Inspection Agency (Ottawa, ON). I provided technical support and troubleshooting for hardware and software issues across a distributed team, managing and resolving tickets in Assyst and ServiceNow in a high-volume support environment."
2. `p`, draft: "Long before I wrote production code, this role taught me to diagnose problems methodically and to communicate clearly with the people who rely on technology to do their jobs."

### 5.5 `klarup`

| Field | Value |
|---|---|
| `kind` | `project` |
| `name` | "KlarUp" |
| `tagline` | "Collaborative Productivity App" |
| `role` | omit until supplied ([placeholder: Emeka's role on KlarUp, e.g. creator or co-founder]) |
| `stack` | "React Native", "Python", "Expo" (the PDF heading) |
| `dates` | omit until supplied ([placeholder: start YYYY-MM, end YYYY-MM or present]) |
| `tense` | `past` (bullets are past tense) |
| `bullets` | `klarup.b1`, `klarup.b2` |
| Card subtitle | "Project" (never "personal project"; see §1.3) |
| `exhibit.title` | "The Climb" |
| `exhibit.caption` | "A gamified, cross-platform task app with collaborative accountability features and a production release pipeline on Expo EAS." (125 chars, 17 words) |
| `exhibit.tags` | "React Native", "Python", "Expo EAS", "Android", "Gamification" |
| `exhibit.curatorNote` | omit until Emeka writes one |
| `exhibit.object` | "Five tiles climb like a staircase and tick themselves off one by one, while three brass beads wait together on the top step: accountability as a team sport. The small crate at the base is the standalone Android build." (`draft: true`) |

**Story** (85 words):
1. `p`, draft: "KlarUp is a gamified, cross-platform task management app that I engineered with React Native and a Python API. The idea is that tasks are easier to finish when people hold each other accountable, so I built collaborative features that add accountability and social motivation to everyday productivity."
2. `p`, draft: "I also architected its production release pipeline on Expo Application Services (EAS), securely injecting environment variables to generate untethered, standalone Android APKs. KlarUp taught me that a release process deserves as much design as the features it ships."

### 5.6 `finance-tracker`

| Field | Value |
|---|---|
| `kind` | `project` |
| `name` | "Personal Finance Tracker" |
| `tagline` | "Full-Stack Web App" (required by the schema; the resume has none; G5 sign-off) |
| `role` | omit until supplied ([placeholder: Emeka's role on the Personal Finance Tracker]) |
| `stack` | "MERN", "ChatGPT API" (the original PDF heading) |
| `dates` | omit until supplied ([placeholder: start YYYY-MM, end YYYY-MM]) |
| `tense` | `past` |
| `bullets` | `finance-tracker.b1` (`print: false`) |
| Card subtitle | "Project" |
| `exhibit.title` | "The Balance" |
| `exhibit.caption` | "A full-stack MERN app for income, expenses, and budgets, with ChatGPT API analysis of financial health." (103 chars, 16 words) |
| `exhibit.tags` | "React", "Node.js", "MongoDB", "ChatGPT API", "Express" |
| `exhibit.curatorNote` | omit until Emeka writes one |
| `exhibit.object` | "Three coin stacks, income in brass, expenses in graphite and the budget in frosted glass, rise and fall but always stay in balance." (`draft: true`) |

**Story** (78 words):
1. `p`, draft: "I built this full-stack personal finance tracker on the MERN stack (MongoDB, Express, React, and Node.js) to manage income, expenses, and budgets in one place. What makes it more than a ledger is the ChatGPT API integration, which analyzes financial health in real time and offers personalized recommendations."
2. `p`, draft: "The project gave me end-to-end practice connecting a database, an API, and a React interface, and an early look at how language models can turn raw numbers into practical guidance."

### 5.7 `safe-sip`

| Field | Value |
|---|---|
| `kind` | `volunteer` |
| `role` | "Member (Right-To-Rise: Safe Sip)" |
| `org` | "Enactus Memorial" |
| `location` | city "St. John's", region "NL", mode `on-site` |
| `dates` | start `2025-09`, end `present` (ONGOING; 1 yr 2 mo at an Oct 2026 build) |
| `tense` | `present` |
| `bullets` | `safe-sip.b1` |
| `exhibit.title` | "Tamper Evident" |
| `exhibit.caption` | "A tamper-detecting smart lid MVP: a Raspberry Pi Pico W, an orientation sensor, and embedded spatial logic." (107 chars, 17 words) |
| `exhibit.tags` | "Raspberry Pi Pico W", "I2C Sensors", "Embedded Logic", "3D Printing", "Hardware Prototyping" |
| `exhibit.curatorNote` | omit until Emeka writes one |
| `exhibit.object` | "A cup rocks gently inside a brass gimbal. Its cut-away lid shows a Raspberry Pi Pico W and an orientation sensor, and the ring on the lid lights when the tilt crosses the tamper threshold." (`draft: true`) |

**Story** (88 words):
1. `p`, draft: "With Enactus Memorial, on Right-To-Rise: Safe Sip, I am engineering the hardware MVP for a smart lid that detects tampering. I am prototyping a 3D-printed enclosure around a Raspberry Pi Pico W and an I2C orientation sensor, and writing embedded spatial logic that uses Euclidean distance and Euler angles to recognize, in real time, when the lid has been disturbed."
2. `p`, draft: "It is the exhibit where my software meets the physical world: every line of code has to make sense to a sensor, a microcontroller, and a printed shell."

### 5.8 `sdsj`

| Field | Value |
|---|---|
| `kind` | `volunteer` |
| `role` | "President" |
| `org` | "Software Developers of St. John's" |
| `location` | city "St. John's", region "NL", mode `on-site` |
| `dates` | start `2024-07`, end `present` (ONGOING; 2 yr 4 mo at an Oct 2026 build) |
| `tense` | `present` |
| `bullets` | `sdsj.b1` |
| `exhibit.title` | "The Round Table" |
| `exhibit.label` | omit (defaults to the org; wraps) |
| `exhibit.caption` | "Recurring monthly mini-hackathons that bring developers, designers, and founders together to collaborate on projects." (117 chars, 14 words) |
| `exhibit.tags` | "Leadership", "Community Building", "Hackathons", "Event Organizing", "Cross-Functional Collaboration" |
| `exhibit.curatorNote` | omit until Emeka writes one |
| `exhibit.object` | "Six laptops face each other around a round table, their screens lighting in turn: monthly mini-hackathons where developers, designers and founders build together." (`draft: true`) |

**Story** (76 words):
1. `p`, draft: "Since July 2024, I have served as President of Software Developers of St. John's. The heart of the role is our recurring monthly mini-hackathons, which unite developers, designers, and founders to collaborate on projects and foster an active, cross-functional tech community."
2. `p`, draft: "I love bringing those groups together, because each brings a perspective the others need. Leading the community has sharpened how I organize, how I communicate, and how I make room for other people to build."

### 5.9 `mun`

| Field | Value |
|---|---|
| `kind` | `education` |
| `institution` | "Memorial University of Newfoundland" |
| `degree` | "B.Eng in Computer Engineering" |
| `shortDegree` | "B.Eng Computer Engineering" (hero line, PLAN §2 wording) |
| `shortInstitution` | "MUN" (hero line, PLAN §2 wording) |
| `location` | city "St. John's", region "NL", mode `on-site` |
| `start` | omit until supplied ([placeholder: program start YYYY-MM]); no duration is shown until then. The 3D scaffold does not need it: its tiers derive from the graduation month and the build date only (EXPERIENCE §4.9) |
| `graduation` | `2027-05` ("expected" is derived while the build month is before May 2027) |
| `exhibit.title` | "Work in Progress" |
| `exhibit.label` | "Memorial University" |
| `exhibit.caption` | "The degree that every exhibit in this gallery is built on." (58 chars, 11 words) |
| `exhibit.tags` | "Computer Engineering", "Algorithms", "Data Structures", "Operating Systems", "Compilers" |
| `exhibit.curatorNote` | omit until Emeka writes one |
| `exhibit.object` | "A silicon die stands inside a brass scaffold. Each brass tier is a year of study still ahead; the tiers already taken down remain as glass outlines. The degree is expected in May 2027." (`draft: true`) |

**Story** (79 words):
1. `p`, draft: "Every exhibit in this gallery rests on the same foundation: my Bachelor of Engineering in Computer Engineering at Memorial University of Newfoundland in St. John's, where I expect to graduate in May 2027."
2. `p`, draft: "My studies have grounded me in algorithms, data structures, and the basics of compilers and operating systems. My co-op terms at Wailo, Mysa, and Nasdaq Verafin let me test those ideas against real products, and I treat the degree and the work as one continuous education."

### 5.10 `certifications`

| Field | Value |
|---|---|
| `kind` | `certifications` |
| `items[0]` | name "AWS Certified Cloud Practitioner", issuer "Amazon Web Services" (implied by the credential's name), `date` omitted ([placeholder: issue YYYY-MM]), `url` omitted ([placeholder: verification link]) |
| `items[1]` | name "Tech Stewardship Practice Program", `issuer` omitted ([placeholder: issuing body]), `date` omitted ([placeholder: YYYY-MM]) |
| `items[2]` | name "Tech Stewardship for the Energy Transition", `issuer` omitted ([placeholder: issuing body]), `date` omitted ([placeholder: YYYY-MM]) |
| `exhibit.title` | "The Medal Cabinet" |
| `exhibit.label` | "Certifications" |
| `exhibit.caption` | "Three credentials in cloud fundamentals and responsible technology." (67 chars, 8 words) |
| `exhibit.tags` | "AWS", "Cloud", "Tech Stewardship", "Energy Transition", "Responsible Technology" |
| `exhibit.links` | none until verification links are supplied |
| `exhibit.curatorNote` | omit until Emeka writes one |
| `exhibit.object` | "Three brass medallions hang in a wall cabinet: a cloud for AWS Certified Cloud Practitioner, a compass rose for the Tech Stewardship Practice Program, and a turbine for Tech Stewardship for the Energy Transition." (`draft: true`) |

Use official badge images only if the issuer's badge guidelines allow it; v1 uses none.

**Story** (63 words):
1. `p`, draft: "This case holds three credentials. The AWS Certified Cloud Practitioner certification reflects my grounding in cloud fundamentals, knowledge I have put to work with services like AWS Cognito."
2. `p`, draft: "The Tech Stewardship Practice Program and Tech Stewardship for the Energy Transition reflect a different commitment: thinking carefully about the impact of the technology I help create, including its role in a changing energy landscape."

### 5.11 Wings

| `id` | `title` | `after` | `side` | `items` (in order) |
|---|---|---|---|---|
| `projects` | "Projects" | `verafin` | `left` | `klarup`, `finance-tracker` (order kept until project dates are known) |
| `volunteer` | "Volunteer & Leadership" | `mysa` | `right` | `safe-sip`, `sdsj` (newest start first) |

Door positions derive from `after` (midpoint between `after` and the next main exhibit), so moving a wing is an edit of `after` and `side` only.

### 5.12 Top-level objects

| Path | Value |
|---|---|
| `meta.siteUrl` | `SITE_URL` from `src/content/site.ts` |
| `meta.title` | see §6.6 (49 chars) |
| `meta.description` | see §6.6 (147 chars) |
| `meta.lang` | `en-CA` |
| `gallery.title` | "Commit History" |
| `gallery.lobby` | §6.1 |
| `gallery.desk` | §6.3 |

---

## 6. Lobby, doors, desk, 404 and SEO copy

Strings marked "content" go into `resume.ts`. Strings marked "UI" are owned by R6 (they live in components) and are repeated from EXPERIENCE §8 so the copy review sees everything in one place.

### 6.1 Lobby (`gallery.lobby`, content)
- `eyebrow`: "A gallery of work by"
- h1 (derived from `contact`): "Chukwuemeka (Emeka) Nduka-Nwagbo" [confirm display form at G5]
- `headline`: "Welcome. Walk through my work." Rendered as the lead sentence directly above the intro paragraph, not as a heading (the h1 is the name).
- `intro` (`draft: true`): "I'm Emeka, a Computer Engineering student at Memorial University of Newfoundland who builds software across mobile, web, and data. The first exhibit is my most recent work, and every step down the aisle takes you further into my past."
- `hint` (the static and no-JS hint): "Scroll, swipe, or use the arrow keys to walk. Open any exhibit to read its full story."
- UI hints after the museum is ready (EXPERIENCE §8.3): "Scroll to walk through my work" (fine pointer), "Swipe up to walk" (coarse pointer), "Scroll, or press" plus the down-arrow icon once a key has been pressed.

### 6.2 Recruiter fast path (derived by `heroLines()`, visible in the first phone viewport with or without JS)
| Line | Text at a 2026-10 build | Rule |
|---|---|---|
| Role line | "Software Development Co-op, Nasdaq Verafin" | `<shortRole ?? role>, <org>` of the current work entry |
| Role line, no current role | "Most recently: Software Development Co-op, Nasdaq Verafin" | Newest work entry, prefixed (draft wording) |
| Education line | "B.Eng Computer Engineering, MUN, expected May 2027" | "expected" disappears once the build month reaches May 2027 |
| Links (UI) | "Resume (PDF)" to `/resume.pdf`; "Email" to `mailto:cndukanwagbo@mun.ca`; "Classic view" to `/resume/` | |
| Skip link (UI) | "Skip to classic resume" | First focusable element |

### 6.3 Desk and exit (`gallery.desk`, content; no phone anywhere)
- `headline`: "You've reached the beginning."
- `body` (`draft: true`): "Thanks for walking through. I'm finishing my B.Eng in Computer Engineering in May 2027 and I'm open to [placeholder: target roles]. If something here sparked an idea, I'd love to hear from you."
  - If Emeka has not named target roles by G5, use this fallback instead (still `draft: true` until he approves): "Thanks for walking through. I'm finishing my B.Eng in Computer Engineering in May 2027. If something here sparked an idea, I'd love to hear from you."
- `footnote`: "New exhibits are installed as the collection grows."
- Buttons (UI): "Email me" (`mailto:cndukanwagbo@mun.ca`), "Connect on LinkedIn" (`https://linkedin.com/in/emekanduka`), "Take home the catalogue (PDF)" (`/resume.pdf`), "Browse code on GitHub" (`https://github.com/eme-k-a`, [confirm handle]), "Walk the aisle again".
- End wall (3D label, duplicates the headline): "You've reached the beginning."

### 6.4 Door stops (wing `title` is content; the rest is UI from EXPERIENCE §8.4)
**Projects door card:** "Projects wing" / "2 exhibits" / links "The Climb, KlarUp" (to `/exhibit/klarup/`) and "The Balance, Personal Finance Tracker" (to `/exhibit/finance-tracker/`) / button "Step inside" (key hint "Enter") / helper "Or keep scrolling to skip."

**Volunteer door card:** "Volunteer & Leadership wing" / "2 exhibits" / links "Tamper Evident, Enactus Memorial" (to `/exhibit/safe-sip/`) and "The Round Table, Software Developers of St. John's" (to `/exhibit/sdsj/`) / "Step inside" / "Or keep scrolling to skip."

**Inside a wing:** HUD "Projects wing, 1 of 2" and "Return to the aisle" (key hint "Esc"); the last wing card also offers "Return to the aisle".

**Announcements:** "Projects wing door. Press Enter to step inside, or keep scrolling." / "Entered the Projects wing. No. P1, The Climb." / "Back in the main aisle at the Projects wing door." (same pattern for the Volunteer & Leadership wing).

### 6.5 404 page (UI; R6 copies these strings into `404.html`)
- `<title>`: "Page not found | Commit History"
- Heading: "This room is closed."
- Body: "The page you asked for isn't part of the collection."
- Links: "Back to the gallery" (`/`), "Classic resume" (`/resume/`).

### 6.6 SEO
- `meta.description` (147 chars, evergreen, third person so it needs no edit when a role ends): "Chukwuemeka (Emeka) Nduka-Nwagbo, Computer Engineering student at Memorial University of Newfoundland. Walk a 3D gallery of his work, newest first."
- `meta.title`: "Chukwuemeka (Emeka) Nduka-Nwagbo | Commit History"
- `/exhibit/<id>/` pages: the description is that exhibit's `caption`; R9 builds the title as "<exhibit title>, <org or name> | Commit History".
- Suggested for R9, `/resume/` description (150 chars): "Resume of Chukwuemeka (Emeka) Nduka-Nwagbo: Computer Engineering student at Memorial University of Newfoundland. Experience, projects, skills and PDF."

---

## 7. Facts still needed from Emeka

None of these block M0 or M1. Each default applies until he answers; answers update this file first, then `resume.ts`.

| # | Question | Default used meanwhile |
|---|---|---|
| 1 | Verafin: on-site, hybrid or remote? | On-site, printed as "St. John's, NL" |
| 2 | Verafin: which technologies, scale or outcomes can he name publicly, and has his manager cleared the three bullets? | The three safe bullets, no technologies, `draft: true` |
| 3 | Verafin: one public highlight for the story? | "This exhibit is still being installed, so check back after December." |
| 4 | Site display name: "Chukwuemeka (Emeka) Nduka-Nwagbo"? | That form |
| 5 | Is `eme-k-a` his GitHub handle? Should GitHub also go on the PDF header? | `https://github.com/eme-k-a` on the site only |
| 6 | KlarUp: his role, and start and end dates. Was it a personal, team, course or hackathon project? | No role line, no dates, card subtitle "Project", KlarUp listed first |
| 7 | Personal Finance Tracker: his role and dates; is "Full-Stack Web App" an acceptable tagline? | No role line, no dates, tagline "Full-Stack Web App" |
| 8 | Certifications: issue dates, the Tech Stewardship issuing body, verification links | Names only; AWS issuer "Amazon Web Services"; no links |
| 9 | MUN program start date | Omitted; no duration shown (the 3D scaffold uses the graduation month only) |
| 10 | Are both volunteer roles still active (Enactus Safe Sip, SDSJ President)? | Both "Present", present tense |
| 11 | Official capitalization: "Right-To-Rise" or "Right to Rise"? | "Right-To-Rise", as on his resume |
| 12 | Did the Mysa web app use a database alongside Cognito? Which? | No database mentioned (§3.5 A4 holds the alternate) |
| 13 | What roles is he targeting (desk call to action)? | Fallback desk body without the clause (§6.3) |
| 14 | Does he use SQL at Verafin? | SQL not added to Languages |
| 15 | A personal email for after graduation, when @mun.ca may lapse? | `cndukanwagbo@mun.ca` |
| 16 | Curator's notes: will he write them, or approve notes R1 drafts from facts he gives? | None stored (the field is optional); the dialog shows only the story blocks under "Curator's note" |
| 17 | Does he want a custom domain? | `*.netlify.app` subdomain via `SITE_URL` |

---

## 8. Dated maintenance checklist

WP-35 copies this into `docs/CONTENT_UPDATE.md`; WP-36's weekly `scheduled.yml` rebuild keeps derived values fresh. "Automatic" means a rebuild handles it with no content edit.

| When | Change | Who |
|---|---|---|
| Every week | Durations, "ON VIEW NOW" and "ONGOING" pills, hero role line, "expected" on the degree: recomputed from the build date | Automatic (`scheduled.yml`) |
| Early Dec 2026 | Ask Emeka for any manager-cleared Verafin details (§3.5 A1, A7) and whether he has a next role | R0 |
| **Jan 2027** (first build after 2026-12; `checkTemporal` fails the build until done) | `verafin`: set `tense: 'past'`; replace the bullets with §3.5 A2; story block 1 becomes "From September to December 2026, I was a Software Development Co-op Student at Nasdaq Verafin, ..." and drop "This is where my story stands today."; delete "This exhibit is still being installed, so check back after December." (or replace it with an approved highlight); confirm the story stays 60 to 110 words; get G5-style approval for the new sentences | R1, then Emeka |
| Jan 2027 | "ON VIEW NOW" leaves Verafin and the hero role line becomes "Most recently: Software Development Co-op, Nasdaq Verafin" (unless a new current role exists) | Automatic |
| Jan 2027 | Regenerate the PDF and `resume/resume.tex` and check the one-page gate (past-tense bullets can change line breaks) | R1 (`npm run build`, CI latex job) |
| **May 2027** (graduation month) | Education prints "May 2027" instead of "Expected Graduation: May 2027"; the hero drops "expected" | Automatic |
| May 2027 | Rewrite the content that says "expected" or "student": `mun` story block 1 ("where I expect to graduate in May 2027"), the `mun` object description ("The degree is expected in May 2027."), the desk body ("I'm finishing my B.Eng ... in May 2027"), the lobby intro ("a Computer Engineering student"), `meta.description` ("Computer Engineering student") and the `/resume/` description. Ask R2 whether "Work in Progress" keeps its title once the degree is complete. Confirm with Emeka that the degree was conferred | R1, R2, Emeka |
| After graduation (mid 2027) | The @mun.ca address may lapse: change `contact.email` to his personal address (every mailto and the PDF header derive from it), rebuild, and replace any PDF he has sent out | R1, Emeka |
| When a volunteer role ends | Set `dates.end` to `YYYY-MM` and `tense: 'past'`; past-tense bullet ("Engineered ...", "Spearheaded ..."); rewrite the story from present to past; the "ONGOING" pill disappears automatically | R1, then Emeka |
| When project dates arrive | Add `dates` to `klarup` and `finance-tracker`, reorder `projects` and the wing `items` newest first, and add the dates to the PDF heading | R1 |
| When certification dates arrive | Add `date`, `issuer` and `url`; check expiry (AWS certifications typically need renewal after a few years; confirm the exact date on the credential) and add a renewal row here | R1 |
| When a new job starts | Follow `docs/CONTENT_UPDATE.md` (`npm run new:exhibit <id>`); the previous current role moves to past tense in the same change | R1, then Emeka |
| When `SITE_URL` changes (WP-18, or a custom domain) | Edit `src/content/site.ts` only; the PDF header host, OG URLs and sitemap follow | R10 or WP-18 |

---

## Appendix A. Gaps against the frozen docs (for R0 and WP-02)

Status after the R0 review of WP-00 (2026-10-15): items 1 to 4 and 6 are resolved, and ARCHITECTURE §3.3, EXPERIENCE and the briefs now match the resolutions. Items 5 and 7 stand as notes.

1. **Object description field.** Resolved: `Exhibit.object: Copy` (ARCHITECTURE §3.3, WP-02). WP-03 stores §5's `exhibit.object` texts with `draft: true`.
2. **"Curator's note" means two things.** Resolved: `curatorNote` is optional (WP-02). The dialog heading "Curator's note" shows the optional note as a short pull quote when one exists, then the `story` blocks (EXPERIENCE §5.9, WP-14). No placeholder notes are stored.
3. **Hero short forms.** Resolved: optional `shortDegree` and `shortInstitution` on `Education` (WP-02); PLAN §2's "MUN" wording wins, and EXPERIENCE §8.1 now says "MUN".
4. **Lobby fields.** Resolved as this file proposed: `headline` is the lead sentence above the intro (the h1 is the name), and `hint` is the static, no-JS hint; the pointer-specific hints are UI copy (EXPERIENCE §8.3, WP-10, WP-15).
5. **No draft flag on captions, titles, eyebrow, headline, hint, tags or taglines.** This file keeps those neutral and fact-only, and lists them for G5 review instead. This includes the Verafin caption and tags, which restate the three safe bullets and are approved with them.
6. **Card subtitle for projects.** Resolved: "Project" (EXPERIENCE §5.8 updated); revisit when Emeka answers §7 item 6.
7. **Phone in the scratchpad.** `p_resume.md` §4 (scratchpad, not in the repo) still contains the phone number on its header line. No brief may point WP-03 or WP-04 at that header line.
