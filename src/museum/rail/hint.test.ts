import { describe, expect, it } from 'vitest';
import { HINT_DELAY_MS, HINT_IDLE_MS, hintVariant, hintWait } from './hint';

describe('hintWait (EXPERIENCE §8.3)', () => {
  const base = { now: 5_000, readyAt: 5_000, test: false, left: false, quietSince: 0 };

  it('shows 1.2 s after ready, at once under ?test=1', () => {
    expect(hintWait(base)).toBe(HINT_DELAY_MS);
    expect(hintWait({ ...base, now: 6_199 })).toBe(1);
    expect(hintWait({ ...base, now: 6_200 })).toBeLessThanOrEqual(0);
    expect(hintWait({ ...base, test: true })).toBe(0);
  });

  it('comes back after 8 s idle in the lobby once the visitor has left it', () => {
    const back = { ...base, left: true, now: 20_000, quietSince: 19_000 };
    expect(hintWait(back)).toBe(HINT_IDLE_MS - 1_000);
    expect(hintWait({ ...back, now: 27_000 })).toBeLessThanOrEqual(0);
    // Under ?test=1 the return still waits for the idle time.
    expect(hintWait({ ...back, test: true })).toBe(7_000);
  });
});

describe('hintVariant', () => {
  it('is fine or coarse by pointer, and keys once a key was pressed', () => {
    expect(hintVariant(false, false)).toBe('fine');
    expect(hintVariant(false, true)).toBe('coarse');
    expect(hintVariant(true, false)).toBe('keys');
    expect(hintVariant(true, true)).toBe('keys');
  });
});
