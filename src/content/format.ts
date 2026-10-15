// Shared date and location formatting (ARCHITECTURE §3.5, EXPERIENCE §5.8). Every surface (cards,
// dialog, /resume/, PDF, .tex, JSON-LD, OG images) uses these helpers and never formats on its own.
// All date math is UTC: never use local-time getters.
import type { DateRange, Location } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const EN_DASH = '\u2013';
const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

/** Month index used by every month comparison: `year * 12 + (month - 1)` (ARCHITECTURE §3.4). */
export function ym(yearMonth: string): number {
  const match = YEAR_MONTH.exec(yearMonth);
  if (!match) throw new Error(`Expected YYYY-MM, got '${yearMonth}'`);
  return Number(match[1]) * 12 + (Number(match[2]) - 1);
}

/** "2026-10" for any instant in October 2026 UTC. */
export function toYearMonth(d: Date): string {
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${d.getUTCFullYear()}-${month}`;
}

/** "2026-09" becomes "Sep 2026". */
export function formatMonth(yearMonth: string): string {
  const index = ym(yearMonth);
  return `${MONTHS[index % 12]} ${Math.floor(index / 12)}`;
}

/**
 * "Sep 2026 <en dash> Dec 2026" (a spaced U+2013) or, with `style: 'tex'`, "Sep 2026 -- Dec 2026".
 * An end of 'present' prints "Present"; equal start and end print one month.
 */
export function formatRange(r: DateRange, o: { style?: 'text' | 'tex' } = {}): string {
  const start = formatMonth(r.start);
  const end = r.end === 'present' ? 'Present' : formatMonth(r.end);
  if (start === end) return start;
  const dash = o.style === 'tex' ? '--' : EN_DASH;
  return `${start} ${dash} ${end}`;
}

/** Months counted inclusively; an end of 'present' is the month of `now`. Never below 0. */
export function monthsInclusive(r: DateRange, now: Date): number {
  const end = r.end === 'present' ? ym(toYearMonth(now)) : ym(r.end);
  return Math.max(0, end - ym(r.start) + 1);
}

/** "1 month", "4 months" below 12 months; "1 yr", "1 yr 9 mo", "2 yr" from 12. */
export function duration(r: DateRange, now: Date): string {
  const months = monthsInclusive(r, now);
  if (months < 12) return `${months} ${months === 1 ? 'month' : 'months'}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest > 0 ? `${years} yr ${rest} mo` : `${years} yr`;
}

/** True while the month of `now` lies within [start, end]. Derived, never stored. */
export function isCurrent(entry: { dates: DateRange }, now: Date): boolean {
  const today = ym(toYearMonth(now));
  const { start, end } = entry.dates;
  return ym(start) <= today && (end === 'present' || today <= ym(end));
}

/** True before the graduation month. Derived, never stored. */
export function isExpected(edu: { graduation: string }, now: Date): boolean {
  return ym(toYearMonth(now)) < ym(edu.graduation);
}

/** "St. John's, NL", "Calgary, AB / Remote", "St. John's, NL / Hybrid". */
export function formatLocation(l: Location): string {
  const place = `${l.city}, ${l.region}`;
  if (l.mode === 'remote') return `${place} / Remote`;
  if (l.mode === 'hybrid') return `${place} / Hybrid`;
  return place;
}
