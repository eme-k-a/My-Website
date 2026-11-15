import { describe, expect, it } from 'vitest';
import { buildRuntime, type RuntimeInput } from './runtime';
import { MAX_CLOCK_STEP_S, advanceClock, clockFrozen } from './clock';

const base: RuntimeInput = {
  tier: 'medium',
  reducedMotion: false,
  test: false,
  idleParam: false,
  idle: false,
  hidden: false,
  active: false,
  hovered: false,
  open: false,
};

describe('buildRuntime (ARCHITECTURE §7.2, EXPERIENCE §5.1)', () => {
  it('has motion on a normal walk', () => {
    expect(buildRuntime(base).motion).toBe(true);
  });

  it('turns motion off for reduced motion, ?test=1, tier low, idle and a hidden tab', () => {
    expect(buildRuntime({ ...base, reducedMotion: true }).motion).toBe(false);
    expect(buildRuntime({ ...base, test: true }).motion).toBe(false);
    expect(buildRuntime({ ...base, tier: 'low' }).motion).toBe(false);
    expect(buildRuntime({ ...base, idle: true }).motion).toBe(false);
    expect(buildRuntime({ ...base, hidden: true }).motion).toBe(false);
  });

  it('lets &idle=1 re-enable motion under ?test=1', () => {
    expect(buildRuntime({ ...base, test: true, idleParam: true }).motion).toBe(true);
  });

  it('passes the walk state through', () => {
    const runtime = buildRuntime({
      ...base,
      tier: 'high',
      active: true,
      hovered: true,
      open: true,
    });
    expect(runtime).toEqual({
      tier: 'high',
      reducedMotion: false,
      motion: true,
      active: true,
      hovered: true,
      open: true,
    });
  });
});

describe('exhibit clock', () => {
  it('is frozen under ?test=1 unless &idle=1', () => {
    expect(clockFrozen('?test=1&mode=museum')).toBe(true);
    expect(clockFrozen('?test=1&idle=1')).toBe(false);
    expect(clockFrozen('')).toBe(false);
  });

  it('advances by the frame delta only while running, capped per frame', () => {
    expect(advanceClock(1, 0.016, true)).toBeCloseTo(1.016, 9);
    expect(advanceClock(1, 0.016, false)).toBe(1);
    expect(advanceClock(1, 5, true)).toBeCloseTo(1 + MAX_CLOCK_STEP_S, 9);
    expect(advanceClock(1, -1, true)).toBe(1);
  });
});
