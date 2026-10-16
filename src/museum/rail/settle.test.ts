import { describe, expect, it } from 'vitest';
import { settledStop, type SettleInput } from './settle';

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
