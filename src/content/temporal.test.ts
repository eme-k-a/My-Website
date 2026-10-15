import { describe, expect, it } from 'vitest';
import { content } from './index';
import { buildDateFromEnv, checkTemporal } from './temporal';

describe('checkTemporal (ARCHITECTURE §3.6)', () => {
  it('passes at 2026-10-15', () => {
    expect(checkTemporal(content, new Date('2026-10-15T00:00:00Z'))).toEqual([]);
  });

  it('passes through the end month of the role', () => {
    expect(checkTemporal(content, new Date('2026-12-31T00:00:00Z'))).toEqual([]);
  });

  it('fails exactly once, naming verafin, at 2027-01-05', () => {
    const errors = checkTemporal(content, new Date('2027-01-05T00:00:00Z'));
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^verafin: tense is 'present' but the role ended 2026-12\./);
  });
});

describe('buildDateFromEnv', () => {
  it('reads BUILD_DATE as UTC midnight', () => {
    expect(buildDateFromEnv({ BUILD_DATE: '2027-01-05' }).toISOString()).toBe(
      '2027-01-05T00:00:00.000Z',
    );
  });

  it('falls back to today in UTC', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(buildDateFromEnv({}).toISOString().slice(0, 10)).toBe(today);
  });

  it('rejects a malformed BUILD_DATE', () => {
    expect(() => buildDateFromEnv({ BUILD_DATE: '2027-1-5' })).toThrow(/YYYY-MM-DD/);
  });
});
