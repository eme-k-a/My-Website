// Node only (ARCHITECTURE §3.5, §3.6): reads process.env, so client code never imports it.
import { ym, toYearMonth } from './format';
import type { Content } from './types';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * "Now" for every build step: `BUILD_DATE` (YYYY-MM-DD) from the environment, else today in UTC.
 * The same rule as vite.config.ts and vitest.config.ts (`BUILD_DATE ?? today`).
 */
export function buildDateFromEnv(env: NodeJS.ProcessEnv = process.env): Date {
  const value = env.BUILD_DATE ?? new Date().toISOString().slice(0, 10);
  const date = new Date(`${value}T00:00:00Z`);
  if (!ISO_DATE.test(value) || Number.isNaN(date.getTime())) {
    throw new Error(`BUILD_DATE must be YYYY-MM-DD, got '${value}'`);
  }
  return date;
}

/**
 * One error per entry whose tense is 'present' after its end month. From January 2027 this fails
 * the build for Verafin until its copy moves to past tense (scripts/check-content.ts).
 */
export function checkTemporal(content: Content, now: Date): string[] {
  const today = ym(toYearMonth(now));
  const entries = [...content.experiences, ...content.projects, ...content.volunteer];
  const errors: string[] = [];
  for (const entry of entries) {
    const end = entry.dates?.end;
    if (entry.tense === 'present' && end !== undefined && end !== 'present' && today > ym(end)) {
      errors.push(
        `${entry.id}: tense is 'present' but the role ended ${end}. Rewrite bullets in past tense and set tense: 'past'.`,
      );
    }
  }
  return errors;
}
