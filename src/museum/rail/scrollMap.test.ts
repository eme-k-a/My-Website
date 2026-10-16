import { describe, expect, it } from 'vitest';
import { holdPositions, nearestStop, progressFromScroll, stopPositions } from './scrollMap';

describe('stopPositions', () => {
  it('uses the real tops and clamps the tail to the largest scroll position', () => {
    // Uneven sections: 900, 1200, 900, 900 px tall in a 900 px viewport.
    const tops = [0, 900, 2100, 3000];
    expect(stopPositions(tops, 3900, 900)).toEqual([0, 900, 2100, 3000]);
    // A last section shorter than the viewport cannot reach the top.
    expect(stopPositions(tops, 3500, 900)).toEqual([0, 900, 2100, 2600]);
  });

  it('never goes below 0, even when the page is shorter than the viewport', () => {
    expect(stopPositions([0, 300], 500, 900)).toEqual([0, 0]);
  });
});

describe('progressFromScroll', () => {
  const stopY = [0, 900, 2100, 3000];

  it('is 0 with no stops or one stop', () => {
    expect(progressFromScroll(500, [])).toBe(0);
    expect(progressFromScroll(500, [0])).toBe(0);
  });

  it('clamps to [0, N - 1]', () => {
    expect(progressFromScroll(-120, stopY)).toBe(0);
    expect(progressFromScroll(0, stopY)).toBe(0);
    expect(progressFromScroll(3000, stopY)).toBe(3);
    expect(progressFromScroll(9999, stopY)).toBe(3);
    expect(progressFromScroll(Number.NaN, stopY)).toBe(0);
  });

  it('is exactly the stop index at every stop position', () => {
    stopY.forEach((y, i) => expect(progressFromScroll(y, stopY)).toBe(i));
  });

  it('is piecewise linear between uneven stops (never i * innerHeight)', () => {
    expect(progressFromScroll(450, stopY)).toBeCloseTo(0.5, 10);
    // The second section is 1200 px tall: halfway is 900 + 600.
    expect(progressFromScroll(1500, stopY)).toBeCloseTo(1.5, 10);
    expect(progressFromScroll(2100 + 225, stopY)).toBeCloseTo(2.25, 10);
  });

  it('is monotonic and continuous over the whole range', () => {
    let previous = progressFromScroll(-10, stopY);
    for (let y = -10; y <= 3010; y += 0.5) {
      const p = progressFromScroll(y, stopY);
      expect(p).toBeGreaterThanOrEqual(previous);
      expect(p - previous).toBeLessThan(0.002);
      previous = p;
    }
  });

  it('handles stops that share a clamped position', () => {
    const clamped = [0, 900, 1500, 1500];
    expect(progressFromScroll(1500, clamped)).toBe(3);
    expect(progressFromScroll(1200, clamped)).toBeCloseTo(1.5, 10);
  });
});

describe('holds for sections taller than the viewport', () => {
  // Pixel 7 after F-008: the lobby is 1074 px tall in an 839 px viewport.
  const stopY = [0, 1074, 1913, 2752];
  const heights = [1074, 839, 839, 839];
  const holdY = holdPositions(stopY, heights, 839);

  it('holds a tall stop until its bottom reaches the viewport bottom', () => {
    expect(holdY).toEqual([235, 1074, 1913, 2752]);
    expect(progressFromScroll(0, stopY, holdY)).toBe(0);
    expect(progressFromScroll(120, stopY, holdY)).toBe(0);
    expect(progressFromScroll(235, stopY, holdY)).toBe(0);
    expect(progressFromScroll(235 + (1074 - 235) / 2, stopY, holdY)).toBeCloseTo(0.5, 10);
    expect(progressFromScroll(1074, stopY, holdY)).toBe(1);
  });

  it('equals the plain mapping when no section overflows', () => {
    const flat = holdPositions([0, 900, 1800], [900, 900, 900], 900);
    expect(flat).toEqual([0, 900, 1800]);
    for (let y = 0; y <= 1800; y += 50) {
      expect(progressFromScroll(y, [0, 900, 1800], flat)).toBe(
        progressFromScroll(y, [0, 900, 1800]),
      );
    }
  });

  it('is still monotonic and continuous', () => {
    let previous = 0;
    for (let y = 0; y <= 2752; y += 0.5) {
      const p = progressFromScroll(y, stopY, holdY);
      expect(p).toBeGreaterThanOrEqual(previous);
      expect(p - previous).toBeLessThan(0.002);
      previous = p;
    }
  });

  it('never holds past the next stop', () => {
    expect(holdPositions([0, 100], [5000, 900], 900)).toEqual([100, 100]);
    expect(progressFromScroll(100, [0, 100], [100, 100])).toBe(1);
    expect(progressFromScroll(99, [0, 100], [100, 100])).toBe(0);
  });
});

describe('nearestStop', () => {
  it('picks the closest stop position', () => {
    const stopY = [0, 900, 2100, 3000];
    expect(nearestStop(-50, stopY)).toBe(0);
    expect(nearestStop(440, stopY)).toBe(0);
    expect(nearestStop(460, stopY)).toBe(1);
    expect(nearestStop(2900, stopY)).toBe(3);
    expect(nearestStop(10, [])).toBe(0);
  });
});
