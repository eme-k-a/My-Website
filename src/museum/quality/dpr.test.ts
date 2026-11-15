// ARCHITECTURE §8.4: DPR steps of 0.25 between 1 and the start value; the flip-flop limit locks it.
import { describe, expect, it } from 'vitest';
import {
  adaptDpr,
  DPR_STEP,
  FLIPFLOPS,
  IDLE_30_BOUNDS,
  initialDprState,
  lockDpr,
  monitorBounds,
} from './dpr';

describe('adaptDpr', () => {
  it('declines in 0.25 steps down to 1 and stops there', () => {
    let s = initialDprState(2);
    s = adaptDpr(s, 'decline');
    expect(s.dpr).toBe(1.75);
    s = adaptDpr(s, 'decline');
    s = adaptDpr(s, 'decline');
    expect(s.dpr).toBe(1.25);
    s = adaptDpr(s, 'decline');
    // That was the fourth real change: more than FLIPFLOPS locks the DPR at the floor.
    expect(s).toMatchObject({ dpr: 1, locked: true });
    expect(DPR_STEP).toBe(0.25);
  });

  it('climbs back up to the start value and never above it', () => {
    let s = initialDprState(1.5);
    s = adaptDpr(s, 'decline');
    s = adaptDpr(s, 'decline');
    expect(s.dpr).toBe(1);
    s = adaptDpr(s, 'incline');
    expect(s.dpr).toBe(1.25);
    expect(s.changes).toBe(3);
    const atCap = { ...s, dpr: 1.5 };
    expect(adaptDpr(atCap, 'incline')).toBe(atCap);
  });

  it('does not count events at a bound as flips (a fast device keeps its DPR)', () => {
    let s = initialDprState(2);
    for (let i = 0; i < 20; i++) s = adaptDpr(s, 'incline');
    expect(s).toEqual(initialDprState(2));
    let slow = initialDprState(1);
    for (let i = 0; i < 20; i++) slow = adaptDpr(slow, 'decline');
    expect(slow).toEqual(initialDprState(1));
  });

  it(`locks at the floor after more than ${FLIPFLOPS} real changes`, () => {
    let s = initialDprState(1.5);
    s = adaptDpr(s, 'decline'); // 1.25
    s = adaptDpr(s, 'incline'); // 1.5
    s = adaptDpr(s, 'decline'); // 1.25
    expect(s).toMatchObject({ dpr: 1.25, changes: 3, locked: false });
    s = adaptDpr(s, 'incline');
    expect(s).toMatchObject({ dpr: 1, locked: true });
    expect(adaptDpr(s, 'incline')).toBe(s);
  });

  it('lockDpr fixes the floor; a start below 1 keeps its own ratio as the floor', () => {
    expect(lockDpr(initialDprState(2))).toMatchObject({ dpr: 1, locked: true });
    const tiny = initialDprState(0.9);
    expect(adaptDpr(tiny, 'decline')).toBe(tiny);
    expect(lockDpr(tiny).dpr).toBe(0.9);
  });
});

describe('monitorBounds', () => {
  it('samples steady rendering only, with 30 fps bounds for coarse idle motion', () => {
    expect(monitorBounds('full', false)?.(60)).toEqual([40, 60]);
    expect(monitorBounds('full', true)?.(120)).toEqual([60, 100]);
    expect(monitorBounds('idle', false)?.(60)).toEqual([40, 60]);
    expect(monitorBounds('idle', true)?.(60)).toEqual(IDLE_30_BOUNDS);
    expect(monitorBounds('stopped', false)).toBeNull();
    expect(monitorBounds('paused', true)).toBeNull();
  });
});
