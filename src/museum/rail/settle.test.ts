import { describe, expect, it } from 'vitest';
import { MAX_STEP_S, railNeedsFrame, rigStep, settledStop, type SettleInput } from './settle';

const still: SettleInput = { current: 3, target: 3, moved: 0, compilePending: 0, gliding: false };

describe('settledStop (ARCHITECTURE §6.3)', () => {
  it('is the stop index when every condition holds', () => {
    expect(settledStop(still)).toBe(3);
    expect(settledStop({ ...still, current: 3.0004, target: 3.0002 })).toBe(3);
    expect(settledStop({ ...still, current: 1.985, target: 1.985 })).toBe(2);
  });

  it('waits for the damped progress to reach the target', () => {
    expect(settledStop({ ...still, current: 2.998 })).toBeNull();
  });

  it('needs a target within 0.02 of a whole stop (a proximity rest between stops is not a stop)', () => {
    expect(settledStop({ ...still, current: 3.5, target: 3.5 })).toBeNull();
    expect(settledStop({ ...still, current: 3.03, target: 3.03 })).toBeNull();
  });

  it('needs a camera that moved less than 0.1 mm in the last frame', () => {
    expect(settledStop({ ...still, moved: 0.0002 })).toBeNull();
    expect(settledStop({ ...still, moved: 0.00005 })).toBe(3);
  });

  it('waits for pending exhibit compiles and for scripted glides', () => {
    expect(settledStop({ ...still, compilePending: 1 })).toBeNull();
    expect(settledStop({ ...still, gliding: true })).toBeNull();
  });
});

describe('railNeedsFrame (F-012)', () => {
  const rest = { current: 3, goal: 3, moved: 0, gliding: false };

  it('asks for frames while the rail damps toward its goal or the camera still turns', () => {
    expect(railNeedsFrame({ ...rest, current: 2.4 })).toBe(true);
    expect(railNeedsFrame({ ...rest, moved: 0.002 })).toBe(true);
    expect(railNeedsFrame({ ...rest, gliding: true })).toBe(true);
    expect(railNeedsFrame({ ...rest, current: Number.NaN })).toBe(true);
  });

  it('turns false at rest on a whole stop', () => {
    expect(railNeedsFrame(rest)).toBe(false);
  });

  it('turns false at rest between stops, where settled stays false', () => {
    const between = { ...rest, current: 3.47, goal: 3.47 };
    expect(settledStop({ ...still, current: 3.47, target: 3.47 })).toBeNull();
    expect(railNeedsFrame(between)).toBe(false);
    // The step before: still moving by more than 0.1 mm, so one more frame.
    expect(railNeedsFrame({ ...between, moved: 0.0003 })).toBe(true);
  });

  it('turns false at rest while an exhibit still compiles (the store change asks for the frame)', () => {
    expect(settledStop({ ...still, compilePending: 2 })).toBeNull();
    expect(railNeedsFrame(rest)).toBe(false);
  });
});

describe('rigStep (F-014)', () => {
  it('passes normal frame times through', () => {
    expect(rigStep(1 / 60, true, null)).toBeCloseTo(1 / 60);
    expect(rigStep(1 / 60, false, 0.01)).toBeCloseTo(0.01);
  });

  it('damps the first frame after a rest over the time since the wake, not the idle gap', () => {
    // 20 s at rest, then a scroll woke the rig 0.3 s before the frame.
    expect(rigStep(20, false, 0.3)).toBeCloseTo(0.3);
    expect(rigStep(20, false, 5)).toBe(MAX_STEP_S.moving);
  });

  it('caps an unexplained idle gap', () => {
    expect(rigStep(20, false, null)).toBe(MAX_STEP_S.idle);
  });

  it('keeps real time on slow frames the rig asked for, up to the stall cap', () => {
    expect(rigStep(0.6, true, null)).toBeCloseTo(0.6);
    expect(rigStep(30, true, 0.2)).toBe(MAX_STEP_S.moving);
  });

  it('never steps backward or by NaN', () => {
    expect(rigStep(-1, true, null)).toBe(0);
    expect(rigStep(Number.NaN, false, 1)).toBe(0);
    expect(rigStep(0.5, false, -2)).toBe(0);
  });
});
