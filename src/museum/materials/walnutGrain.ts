// Seeded 256 px walnut grain, the `map` of the `walnut` material (EXPERIENCE §7.6). The pixels
// are a pure function of the seed (walnutGrainPixels, testable in Node); createWalnutGrain puts
// them on a canvas and is browser only. Nothing here touches `document` at import time.
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

export const WALNUT_GRAIN_SIZE = 256;
export const WALNUT_GRAIN_SEED = 20261015;

/** Lightest and darkest grain values. The map multiplies the walnut token color. */
export const WALNUT_GRAIN_RANGE = { min: 0.7, max: 1 } as const;

/** mulberry32: small, fast, deterministic. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Periodic 1-D value noise on [0, 1) with `cells` lattice points, so the tile wraps. */
function periodicNoise(rand: () => number, cells: number): (t: number) => number {
  const values = Array.from({ length: cells }, rand);
  return (t) => {
    const x = (((t % 1) + 1) % 1) * cells;
    const i = Math.floor(x);
    const f = x - i;
    const s = f * f * (3 - 2 * f);
    return values[i % cells]! * (1 - s) + values[(i + 1) % cells]! * s;
  };
}

/** Periodic 2-D value noise on [0, 1)^2 with a `cx` by `cy` lattice, so the tile wraps. */
function periodicNoise2(
  rand: () => number,
  cx: number,
  cy: number,
): (u: number, v: number) => number {
  const values = Array.from({ length: cx * cy }, rand);
  const at = (i: number, j: number) => values[(j % cy) * cx + (i % cx)]!;
  const smooth = (f: number) => f * f * (3 - 2 * f);
  return (u, v) => {
    const x = (((u % 1) + 1) % 1) * cx;
    const y = (((v % 1) + 1) % 1) * cy;
    const i = Math.floor(x);
    const j = Math.floor(y);
    const sx = smooth(x - i);
    const sy = smooth(y - j);
    const top = at(i, j) * (1 - sx) + at(i + 1, j) * sx;
    const bottom = at(i, j + 1) * (1 - sx) + at(i + 1, j + 1) * sx;
    return top * (1 - sy) + bottom * sy;
  };
}

/**
 * Grey RGBA pixels of a tileable grain: growth bands run along +X and drift a little from row
 * to row, long streaks break them up, and sparse pores add tooth. Same seed, same pixels.
 */
export function walnutGrainPixels(
  seed = WALNUT_GRAIN_SEED,
  size = WALNUT_GRAIN_SIZE,
): Uint8ClampedArray<ArrayBuffer> {
  const rand = mulberry32(seed);
  const broad = periodicNoise(rand, 10);
  const medium = periodicNoise(rand, 34);
  const fine = periodicNoise(rand, 96);
  const drift = periodicNoise(rand, 6);
  const streaks = periodicNoise2(rand, 3, 64);
  const { min, max } = WALNUT_GRAIN_RANGE;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    const v = y / size;
    // Each band wanders with its own phase; whole sine cycles across the tile keep it seamless.
    const phase = drift(v) * Math.PI * 4;
    for (let x = 0; x < size; x++) {
      const u = x / size;
      const t = v + 0.018 * Math.sin(Math.PI * 2 * u + phase);
      const band = 0.48 * broad(t) + 0.3 * medium(t) + 0.12 * fine(t) + 0.1 * streaks(u, t);
      const pore = rand() < 0.01 ? -0.05 : 0;
      const value = Math.min(
        max,
        Math.max(min, min + (max - min) * band + pore + 0.02 * (rand() - 0.5)),
      );
      const i = (y * size + x) * 4;
      const grey = Math.round(value * 255);
      data[i] = grey;
      data[i + 1] = grey;
      data[i + 2] = grey;
      data[i + 3] = 255;
    }
  }
  return data;
}

/** The walnut grain as a repeat-wrapped sRGB CanvasTexture. Browser only. */
export function createWalnutGrain(seed = WALNUT_GRAIN_SEED): CanvasTexture {
  if (typeof document === 'undefined') {
    throw new Error('createWalnutGrain needs a DOM canvas; in Node build the library without it');
  }
  const canvas = document.createElement('canvas');
  canvas.width = WALNUT_GRAIN_SIZE;
  canvas.height = WALNUT_GRAIN_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('createWalnutGrain: no 2D canvas context');
  context.putImageData(
    new ImageData(walnutGrainPixels(seed), WALNUT_GRAIN_SIZE, WALNUT_GRAIN_SIZE),
    0,
    0,
  );
  const texture = new CanvasTexture(canvas);
  texture.name = 'walnutGrain';
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  return texture;
}
