// Seeded randomness for exhibits (ARCHITECTURE §7.5: exhibits never call Math.random). Both
// functions are pure and deterministic, so ?test=1 screenshots are identical on every run.

/** mulberry32: a fast 32-bit PRNG. Returns a generator of floats in [0, 1). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A lattice hash of (seed, ix, iy) to [0, 1). */
function hash2(seed: number, ix: number, iy: number): number {
  let h = (seed ^ Math.imul(ix | 0, 0x27d4eb2d) ^ Math.imul(iy | 0, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * 2D value noise for `seed`: random values on the integer lattice, smoothstep-interpolated in
 * between. Returns `(x, y) => value` in [0, 1), continuous in x and y.
 */
export function noise2(seed: number): (x: number, y: number) => number {
  const s = seed >>> 0;
  return (x, y) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const a = hash2(s, x0, y0);
    const b = hash2(s, x0 + 1, y0);
    const c = hash2(s, x0, y0 + 1);
    const d = hash2(s, x0 + 1, y0 + 1);
    const top = a + (b - a) * fx;
    const bottom = c + (d - c) * fx;
    return top + (bottom - top) * fy;
  };
}
