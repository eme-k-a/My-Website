// First step of `npm run build` (ARCHITECTURE §3.6, §5.1). Runs the zod parse of
// src/content/resume.ts, the tense check against the build date (`BUILD_DATE`, else today in UTC)
// and the layout (PLAN Addendum, R0 rulings after WP-02: layout errors fail the content check).
// Prints every error and exits 1 on any; otherwise prints one "content ok" line.
//
// From the first build after Verafin's end month (2027-01) this fails on purpose until the entry
// moves to past tense (docs/CONTENT_DRAFT.md §8).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { content } from '../src/content/index';
import { resume } from '../src/content/resume';
import { Resume } from '../src/content/schema';
import { buildDateFromEnv, checkTemporal } from '../src/content/temporal';
import type { Content } from '../src/content/types';
import { computeLayout } from '../src/museum/rail/layout';

export interface ContentCheck {
  errors: string[];
  /** Exhibit entries: experiences, projects, volunteer, education and the certifications block. */
  entries: number;
  /** YYYY-MM-DD, or the raw BUILD_DATE when it is malformed. */
  buildDate: string;
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

const countEntries = (c: Content) =>
  c.experiences.length + c.projects.length + c.volunteer.length + c.education.length + 1;

export function checkContent(env: NodeJS.ProcessEnv = process.env): ContentCheck {
  const errors: string[] = [];
  let now: Date | undefined;
  try {
    now = buildDateFromEnv(env);
  } catch (error) {
    errors.push(`BUILD_DATE: ${message(error)}`);
  }

  const parsed = Resume.safeParse(resume);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`resume.${issue.path.map(String).join('.')}: ${issue.message}`);
    }
  }
  // The hand-written normalize() equals the parse for valid content (content.test.ts), so the later
  // checks still run, and report, when the parse fails.
  const data: Content = parsed.success ? parsed.data : content;

  if (now) {
    errors.push(...checkTemporal(data, now));
    try {
      computeLayout(data, now);
    } catch (error) {
      errors.push(`layout: ${message(error)}`);
    }
  }

  return {
    errors,
    entries: countEntries(data),
    buildDate: now ? now.toISOString().slice(0, 10) : String(env.BUILD_DATE),
  };
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const result = checkContent();
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`check-content: ${error}`);
    console.error(
      `content check failed (${result.errors.length} ${result.errors.length === 1 ? 'error' : 'errors'}, build date ${result.buildDate})`,
    );
    process.exit(1);
  }
  console.log(`content ok (${result.entries} entries, build date ${result.buildDate})`);
}
