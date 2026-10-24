import { describe, expect, it } from 'vitest';
import { stampText, TEST_DATE, TEST_STAMP } from './ticket';

describe('admission ticket stamp', () => {
  it('reads day, short month and year, upper case, in that order', () => {
    expect(stampText(new Date(2026, 9, 15), 'en-CA')).toBe('15 OCT 2026');
    expect(stampText(new Date(2027, 4, 3), 'en-US')).toBe('03 MAY 2027');
  });

  it('uses the locale month name without abbreviation dots', () => {
    expect(stampText(new Date(2026, 9, 24), 'de-DE')).toBe('24 OKT 2026');
    expect(stampText(new Date(2026, 9, 24), 'fr-FR')).not.toContain('.');
  });

  it('falls back to en-CA for an invalid locale', () => {
    expect(stampText(TEST_DATE, 'not a locale!')).toBe('15 OCT 2026');
  });

  it('is frozen under ?test=1', () => {
    expect(TEST_STAMP).toBe('15 OCT 2026');
  });
});
