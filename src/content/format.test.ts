import { describe, expect, it } from 'vitest';
import { content } from './index';
import {
  duration,
  formatLocation,
  formatMonth,
  formatRange,
  isCurrent,
  isExpected,
  monthsInclusive,
  toYearMonth,
  ym,
} from './format';

const OCT_2026 = new Date('2026-10-15T00:00:00Z');
const JAN_2027 = new Date('2027-01-05T00:00:00Z');
const EN_DASH = '\u2013';
const EM_DASH = '\u2014';

const verafin = content.experiences.find((e) => e.id === 'verafin')!;

describe('month math', () => {
  it('indexes months as year * 12 + (month - 1)', () => {
    expect(ym('2026-01')).toBe(2026 * 12);
    expect(ym('2026-12')).toBe(2026 * 12 + 11);
    expect(() => ym('2026-13')).toThrow();
  });

  it('reads the calendar month in UTC', () => {
    expect(toYearMonth(OCT_2026)).toBe('2026-10');
    expect(toYearMonth(new Date('2026-12-31T23:59:59Z'))).toBe('2026-12');
    expect(toYearMonth(new Date('2027-01-01T00:00:00Z'))).toBe('2027-01');
  });

  it('formats months as "Mon YYYY"', () => {
    expect(formatMonth('2026-09')).toBe('Sep 2026');
    expect(formatMonth('2022-12')).toBe('Dec 2022');
  });
});

describe('duration (EXPERIENCE §5.8 required cases)', () => {
  it.each([
    ['2026-09', '2026-12', '4 months'],
    ['2026-01', '2026-05', '5 months'],
    ['2025-05', '2025-08', '4 months'],
    ['2022-12', '2024-08', '1 yr 9 mo'],
  ])('%s to %s is %s', (start, end, expected) => {
    expect(duration({ start, end }, OCT_2026)).toBe(expected);
  });

  it('counts inclusively, singular for one month, whole years without months', () => {
    expect(duration({ start: '2026-10', end: '2026-10' }, OCT_2026)).toBe('1 month');
    expect(duration({ start: '2025-01', end: '2025-12' }, OCT_2026)).toBe('1 yr');
    expect(duration({ start: '2024-01', end: '2025-12' }, OCT_2026)).toBe('2 yr');
    expect(monthsInclusive({ start: '2026-09', end: '2026-12' }, OCT_2026)).toBe(4);
  });

  it("uses the build month for 'present'", () => {
    expect(duration({ start: '2025-09', end: 'present' }, OCT_2026)).toBe('1 yr 2 mo');
    expect(duration({ start: '2024-07', end: 'present' }, OCT_2026)).toBe('2 yr 4 mo');
  });
});

describe('formatRange', () => {
  it('uses a spaced en dash (U+2013) and never an em dash', () => {
    const text = formatRange({ start: '2026-09', end: '2026-12' });
    expect(text).toBe(`Sep 2026 ${EN_DASH} Dec 2026`);
    expect(text).not.toContain(EM_DASH);
  });

  it('uses -- in tex style', () => {
    expect(formatRange({ start: '2026-09', end: '2026-12' }, { style: 'tex' })).toBe(
      'Sep 2026 -- Dec 2026',
    );
  });

  it("prints 'Present' and collapses equal months", () => {
    expect(formatRange({ start: '2025-09', end: 'present' })).toBe(`Sep 2025 ${EN_DASH} Present`);
    expect(formatRange({ start: '2026-10', end: '2026-10' })).toBe('Oct 2026');
  });
});

describe('isCurrent and isExpected', () => {
  it('verafin is current at 2026-10-15 and not at 2027-01-05', () => {
    expect(isCurrent(verafin, OCT_2026)).toBe(true);
    expect(isCurrent(verafin, JAN_2027)).toBe(false);
  });

  it('is false before the start month and true for ongoing roles', () => {
    expect(isCurrent({ dates: { start: '2026-11', end: '2026-12' } }, OCT_2026)).toBe(false);
    expect(isCurrent({ dates: { start: '2024-07', end: 'present' } }, JAN_2027)).toBe(true);
  });

  it('the degree is expected before May 2027 only', () => {
    expect(isExpected({ graduation: '2027-05' }, OCT_2026)).toBe(true);
    expect(isExpected({ graduation: '2027-05' }, new Date('2027-05-01T00:00:00Z'))).toBe(false);
  });
});

describe('formatLocation', () => {
  it('appends the work mode except on-site', () => {
    expect(formatLocation({ city: "St. John's", region: 'NL', mode: 'on-site' })).toBe(
      "St. John's, NL",
    );
    expect(formatLocation({ city: 'Calgary', region: 'AB', mode: 'remote' })).toBe(
      'Calgary, AB / Remote',
    );
    expect(formatLocation({ city: "St. John's", region: 'NL', mode: 'hybrid' })).toBe(
      "St. John's, NL / Hybrid",
    );
  });
});
