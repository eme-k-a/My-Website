import { describe, expect, it } from 'vitest';
import { monthsUntil, TIER_COUNT, tiersRemaining } from './tiers';

describe('mun tiersRemaining (EXPERIENCE §4.9)', () => {
  it('counts months between the build month and the graduation month', () => {
    expect(monthsUntil('2027-05', '2026-10-20')).toBe(7);
    expect(monthsUntil('2027-05', '2027-06-01')).toBe(-1);
  });

  it('is 1 at 2026-10 (graduation May 2027)', () => {
    expect(tiersRemaining('2027-05', '2026-10-20')).toBe(1);
    expect(tiersRemaining('2027-05', '2026-10-01')).toBe(1);
  });

  it('is 0 at 2027-06, after graduation', () => {
    expect(tiersRemaining('2027-05', '2027-06-01')).toBe(0);
    expect(Object.is(tiersRemaining('2027-05', '2027-06-01'), 0)).toBe(true);
    expect(tiersRemaining('2027-05', '2030-01-01')).toBe(0);
  });

  it('is 0 in the graduation month itself', () => {
    expect(tiersRemaining('2027-05', '2027-05-15')).toBe(0);
  });

  it('is 5 when graduation is 5 or more years away', () => {
    expect(tiersRemaining('2031-10', '2026-10-20')).toBe(TIER_COUNT);
    expect(tiersRemaining('2040-01', '2026-10-20')).toBe(5);
  });

  it('steps a tier per 12 months', () => {
    expect(tiersRemaining('2027-10', '2026-10-20')).toBe(1);
    expect(tiersRemaining('2027-11', '2026-10-20')).toBe(2);
    expect(tiersRemaining('2030-10', '2026-10-20')).toBe(4);
    expect(tiersRemaining('2030-11', '2026-10-20')).toBe(5);
  });

  it('rejects malformed dates', () => {
    expect(() => tiersRemaining('soon', '2026-10-20')).toThrow();
  });
});
