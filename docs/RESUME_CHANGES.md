# Resume changes for Gate G0

**Owner:** R1 Content & Resume Editor (WP-04). **Status:** waiting for Emeka at Gate G0.
**Approval:** not yet given. When Emeka replies "approved" (or with edits), record the date and every edit here, then a commit with the trailer `WP: WP-04` flips the Verafin bullets to `draft: false` (CONTENT_DRAFT §1).

This file lists everything that changed between the one-page PDF Emeka supplied ("before") and the generated `dist/resume.pdf` ("after"). The phone number is deliberately not reproduced anywhere in this file or in the repo.

## How to review

| What | Where | Notes |
|---|---|---|
| Before, page 1 | `out/before/resume-1.png` (110 dpi), `out/review/resume-before.png` (150 dpi) | Rendered from the original PDF. It shows the phone number, so it stays in gitignored `out/` and is never committed or attached to a PR |
| After, page 1 | `out/after/resume-1.png` (110 dpi), `out/review/resume-after.png` (150 dpi), `out/resume-preview.png` (browser screenshot at device scale 2) | Rendered from `dist/resume.pdf` |
| After, the PDF itself | `dist/resume.pdf` (public, served at `/resume.pdf`) | One US Letter page, no phone number |
| After, Overleaf source | `resume/resume.tex` (committed) | Same selection as the PDF, Jake's Resume template. Upload the single file to Overleaf and compile with pdfLaTeX |
| Private copy with the phone | `out/private/resume.pdf` and `out/private/resume.tex` | Built on Emeka's machine only: `RESUME_PHONE=NNN-NNN-NNNN npm run resume:private` (or a `RESUME_PHONE=` line in the gitignored `.env.local`). Refuses to run in CI |

None of the PNGs are committed: `out/` is gitignored. Regenerate them with `npm run resume -- --preview`, `pdftoppm -png -r 110 dist/resume.pdf out/after/resume` and `pdftoppm -png -r 110 <original pdf> out/before/resume`.

## What Emeka signs off (CONTENT_DRAFT §1.1)

1. The new Nasdaq Verafin entry below, including its location and the editor's wording in its bullets.
2. Every rewritten bullet: `mysa.b1`, `mysa.b2`, `mysa.b3`, `wailo.b3`, `cfia.b1`, `safe-sip.b1`, `sdsj.b1`.
3. The style changes.
4. The skills regrouped into 4 lines, with "Cloud Computing" dropped.
5. The KlarUp heading.
6. Personal Finance Tracker leaving the PDF and `.tex` (it stays in the gallery).
7. The header: no phone on the public PDF, LinkedIn without the trailing slash, the site host added once the Netlify site exists.

## 1. New entry: Nasdaq Verafin (first under Experience)

```
Software Development Co-op Student                      Sep 2026 – Dec 2026
Nasdaq Verafin                                           St. John's, NL
- Develop data platform features supporting fraud detection and anti-money laundering software.
- Build data reporting features that turn platform data into accurate, readable reports for end users.
- Develop data reporting plugins that extend reporting capabilities with modular, reusable components.
```

- **Draft status:** all three bullets are `draft: true` in `src/content/resume.ts`, and the Verafin exhibit is `draft: true`, until Emeka approves them here (ideally after his manager has cleared them for public use). `RELEASE=1 npm run check:copy` blocks launch while they stay draft.
- The wording "accurate, readable reports for end users" and "modular, reusable components" is the editor's, not facts Emeka supplied.
- Present tense while the role is current. From the first build in January 2027 the build fails until the entry moves to past tense (ready-made past-tense bullets are in CONTENT_DRAFT §3.5 A2).
- Location "St. John's, NL" assumes on-site. Hybrid or remote prints "St. John's, NL / Hybrid" or "/ Remote".

## 2. Trims to stay on one page (PLAN §1 items 1 to 6)

| PLAN §1 | Where | Before | After |
|---|---|---|---|
| 1 | `mysa.b1` (tightened with item 1) | "Built end-to-end Detox CI/CD pipelines for iOS and Android, automating the full release lifecycle for dev and production store releases to significantly reduce manual QA overhead." | "Built end-to-end Detox CI/CD pipelines for iOS and Android, automating dev and production store releases to significantly reduce manual QA overhead." |
| 1 | `mysa.b2` | "Led the Single Sign-On (SSO) integration with a major utility partner for demand response enrollment using Keycloak and OAuth 2.0, resolving critical token exchange bottlenecks to ensure seamless, secure access across mobile and web." | "Led the SSO integration with a major utility partner for demand response enrollment using Keycloak and OAuth 2.0, resolving token exchange bottlenecks for secure access across mobile and web." |
| 1 | `mysa.b3` (no longer calls Cognito "database management") | "Built and deployed a responsive web app with AWS Cognito for user authentication and database management, monitoring backend telemetry and logs to troubleshoot runtime failures and ensure a stable production release." | "Built and deployed a responsive web app using AWS Cognito for authentication, monitoring telemetry and logs to troubleshoot runtime failures for a stable production release." |
| 2 | CFIA, two bullets merged into one | "Provided technical support and troubleshooting for hardware and software issues across a distributed team." and "Managed and resolved tickets using Assyst and ServiceNow in a high-volume support environment." | "Resolved high-volume hardware and software tickets for a distributed team in Assyst and ServiceNow." |
| 3 | `wailo.b3` | "Contributed to the Apple App Store release process, performing QA testing and bug fixes to enhance performance and usability." | "Supported the App Store release with QA testing and bug fixes to improve performance and usability." |
| 4 | `safe-sip.b1` (Enactus; colon instead of a dash, present tense) | (the original has an en dash as sentence punctuation where this quote has " - ") "Engineering the hardware MVP for a tamper-detecting smart lid - prototyping a 3D-printed enclosure with a Raspberry Pi Pico W and I2C orientation sensor, with embedded spatial logic using Euclidean distance and Euler angles to detect tampering in real-time." | "Engineer a tamper-detecting smart lid MVP: a 3D-printed enclosure with a Raspberry Pi Pico W and I2C orientation sensor, using Euclidean distance and Euler angles to detect tampering in real time." |
| 5 | Technical Skills, 3 lines (one wrapping) to 4 lines that do not wrap | "Languages: Python, C++, C#, HTML, CSS, JavaScript, TypeScript" / "Frameworks & Tools: React, React Native, Next.js, Node.js, Express, MongoDB, SQLite, FastAPI, Kubernetes, AWS, Firebase, Detox, GitHub Actions" / "Concepts: Algorithms, Data Structures, Agile, Cloud Computing, CI/CD, OAuth 2.0 / OIDC, Compiler & OS basics" | "Languages: Python, C++, C#, JavaScript, TypeScript, HTML, CSS" / "Frameworks: React, React Native, Next.js, Node.js, Express, FastAPI" / "Data, Cloud & DevOps: MongoDB, SQLite, AWS, Firebase, Kubernetes, Detox, GitHub Actions" / "Concepts: Algorithms, Data Structures, Agile, CI/CD, OAuth 2.0 / OIDC, Compiler & OS Basics" ("Cloud Computing" dropped, covered by AWS and the AWS certification; no skill added) |
| 6 | Personal Finance Tracker | "Personal Finance Tracker \| MERN, ChatGPT API" with one three-line bullet | Left out of the PDF and `.tex` (its bullet is `print: false`); it stays in the gallery's Projects wing. A one-line version is ready in CONTENT_DRAFT §3.5 A6 |

Unchanged: Education, `mysa.b4`, `wailo.b1`, `wailo.b2`, both KlarUp bullets, the Certifications line and the section order.

## 3. Style fixes

| Where | Before | After |
|---|---|---|
| Mysa title | "Full Stack Software Developer (Co-Op)" | "Full Stack Software Developer (Co-op)" |
| Wailo title | "Front End Developer (Co-Op)" | "Front End Developer (Co-op)" |
| CFIA title | "IT Support Technician - Intern" | "IT Support Technician (Intern)" |
| SDSJ dates | "July 2024 – Present" | "Jul 2024 – Present" |
| `sdsj.b1`, ongoing role | "Spearheaded recurring monthly mini-hackathons, ..." | "Spearhead recurring monthly mini-hackathons, ..." (rest unchanged) |
| `safe-sip.b1`, ongoing role | "Engineering ..." | "Engineer ..." (see trim 4) |
| KlarUp heading | "KlarUp - Collaborative Productivity App \| React Native, Python" | "KlarUp: Collaborative Productivity App \| React Native, Python, Expo" (Expo named because the second bullet uses Expo Application Services) |
| Header | "[phone] \| cndukanwagbo@mun.ca \| linkedin.com/in/emekanduka/ \| St. John's, NL" | "cndukanwagbo@mun.ca \| linkedin.com/in/emekanduka \| St. John's, NL": no phone on the public PDF (the private PDF keeps it), no trailing slash |
| Header, site | (none) | The site host goes before the location once `SITE_URL` holds the real Netlify address (WP-18). While it is a placeholder it is left out, so the PDF never prints a placeholder |

Look and format (no wording change): the PDF is rendered by Chromium in CMU Serif (the Computer Modern of the original, SIL Open Font License, `LICENSES/OFL-CMU-Serif.txt`) with Jake's Resume layout. The name and section headings print in capitals with letter spacing instead of small caps, and ligatures are off, so applicant tracking systems read clean text. The file is a tagged PDF with its title, author, subject and keywords set. Apostrophes print as typed in the content (straight).

## 4. Extra `print: false`

None. The overflow gate passed on the first build with the PLAN §1 trims alone: at build date 2026-10-15 the page has about 0.2 in (19 CSS px, a little more than one bullet line) to spare. If a later edit overflows, the build fails and names the candidates in this order: `wailo` bullet 2, `mysa` bullet 4, `sdsj` bullet 1 (priority 3), then the priority 2 bullets, oldest entries first. Any bullet trimmed that way is listed here.

## 5. Open confirmations for Emeka

1. **Verafin bullets:** are the three bullets accurate, and has your manager cleared them for a public resume? Defaults: the three safe bullets, no technologies, `draft: true`.
2. **Verafin location:** on-site, hybrid or remote? Default: on-site, printed as "St. John's, NL".
3. **"Right-To-Rise":** is the official capitalization "Right-To-Rise" or "Right to Rise"? Default: "Right-To-Rise", as on your resume.
4. **Mysa database:** did the Mysa web app use a database alongside Cognito, and which one? Default: no database named (`mysa.b3` above); the alternate wording is in CONTENT_DRAFT §3.5 A4.
5. **Title style:** do "(Co-op)" and "IT Support Technician (Intern)" match how you want the titles written? Defaults: as above.
6. **Header:** should GitHub (`github.com/eme-k-a`) also go on the PDF header? Default: site only.

## 6. Approval record

| Date | Gate | Decision | Edits |
|---|---|---|---|
| (pending) | G0 | | |
