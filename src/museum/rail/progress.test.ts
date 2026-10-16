import { describe, expect, it, vi } from 'vitest';
import { easeInOutCubic, finishGlide, rig, setWaker, wake } from './progress';

describe('easeInOutCubic', () => {
  it('runs from 0 to 1 through 0.5, monotonic and symmetric', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBe(0.5);
    expect(easeInOutCubic(1)).toBe(1);
    let previous = 0;
    for (let t = 0.01; t <= 1; t += 0.01) {
      expect(easeInOutCubic(t)).toBeGreaterThanOrEqual(previous);
      expect(easeInOutCubic(t) + easeInOutCubic(1 - t)).toBeCloseTo(1, 10);
      previous = easeInOutCubic(t);
    }
  });
});

describe('the rig channel', () => {
  it('wakes the registered waker only while it is registered', () => {
    const waker = vi.fn();
    const off = setWaker(waker);
    wake();
    expect(waker).toHaveBeenCalledTimes(1);
    off();
    wake();
    expect(waker).toHaveBeenCalledTimes(1);
  });

  it('ends a glide once and calls its done', () => {
    const done = vi.fn();
    rig.glide = { from: 0, to: 1, ms: 1400, start: null, done };
    finishGlide();
    finishGlide();
    expect(done).toHaveBeenCalledTimes(1);
    expect(rig.glide).toBeNull();
  });
});
