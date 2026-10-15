import { describe, expect, it } from 'vitest';
import { noise2, rng } from './noise';

describe('rng (mulberry32)', () => {
  it('matches the reference sequence', () => {
    const next = rng(1);
    expect(next()).toBeCloseTo(0.6270739405881613, 15);
    expect(next()).toBeCloseTo(0.002735721180215478, 15);
    expect(next()).toBeCloseTo(0.5274470399599522, 15);
  });

  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = rng(42);
    const b = rng(42);
    const c = rng(43);
    let differs = false;
    for (let i = 0; i < 1000; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
      if (x !== c()) differs = true;
    }
    expect(differs).toBe(true);
  });
});

describe('noise2 (value noise)', () => {
  it('is deterministic, seeded and in [0, 1)', () => {
    const n = noise2(7);
    const m = noise2(7);
    const o = noise2(8);
    let differs = false;
    for (let i = 0; i < 200; i++) {
      const x = i * 0.37;
      const y = i * 0.61 - 20;
      const v = n(x, y);
      expect(v).toBe(m(x, y));
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      if (v !== o(x, y)) differs = true;
    }
    expect(differs).toBe(true);
  });

  it('is continuous across lattice lines', () => {
    const n = noise2(3);
    for (const x of [-2, -1, 0, 1, 2, 5]) {
      for (const y of [-1.5, 0.25, 3]) {
        expect(Math.abs(n(x - 1e-7, y) - n(x + 1e-7, y))).toBeLessThan(1e-5);
        expect(Math.abs(n(y, x - 1e-7) - n(y, x + 1e-7))).toBeLessThan(1e-5);
      }
    }
  });
});
