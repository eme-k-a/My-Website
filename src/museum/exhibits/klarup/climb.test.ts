import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  ALL_LIT_S,
  BEAD,
  beadCenters,
  CHECK,
  checkBars,
  CLIMB,
  CRATE,
  cyclePhase,
  glowAt,
  GLOW,
  litAt,
  POST,
  postFor,
  RESET_START_S,
  STRIP,
  stripCenters,
  TILE,
  tileBottom,
  tileCenter,
  tileTop,
  TRAY,
  TRAY_TOP,
} from './climb';

/** EXPERIENCE §4: the standard slot, local meters. */
const SLOT = { min: [-0.325, 0.025, -0.325], max: [0.325, 0.675, 0.325] };
const TILES = [0, 1, 2, 3, 4];

/** Corners of a box of `size` centered at `center`, yawed by `rotationY`. */
function corners(size: number[], center: number[], rotationY = 0): Vector3[] {
  const m = new Matrix4().makeRotationY(rotationY).setPosition(center[0]!, center[1]!, center[2]!);
  const out: Vector3[] = [];
  for (const sx of [-0.5, 0.5])
    for (const sy of [-0.5, 0.5])
      for (const sz of [-0.5, 0.5])
        out.push(new Vector3(sx * size[0]!, sy * size[1]!, sz * size[2]!).applyMatrix4(m));
  return out;
}

function inSlot(p: Vector3): boolean {
  const v = p.toArray();
  return [0, 1, 2].every((i) => v[i]! >= SLOT.min[i]! - 1e-9 && v[i]! <= SLOT.max[i]! + 1e-9);
}

function inFootprint(p: Vector3, i: number, margin = 0): boolean {
  const [x, , z] = tileCenter(i);
  const h = TILE.size[0] / 2 - margin;
  return Math.abs(p.x - x) <= h + 1e-9 && Math.abs(p.z - z) <= h + 1e-9;
}

describe('klarup geometry (EXPERIENCE §4.5)', () => {
  it('places the five tiles on the spec staircase', () => {
    expect(TRAY_TOP).toBeCloseTo(0.055, 9);
    expect(tileCenter(0)).toEqual([-0.22, 0.06, 0.1]);
    const top = tileCenter(4);
    expect(top[0]).toBeCloseTo(0.22, 9);
    expect(top[1]).toBeCloseTo(0.36, 9);
    expect(top[2]).toBeCloseTo(-0.1, 9);
  });

  it('supports every tile: tile 0 is seated in the tray, tiles 1 to 4 stand on brass posts', () => {
    expect(tileBottom(0)).toBeLessThan(TRAY_TOP);
    expect(tileTop(0)).toBeGreaterThan(TRAY_TOP);
    expect(postFor(0)).toBeNull();
    for (const i of [1, 2, 3, 4]) {
      const post = postFor(i)!;
      expect(post).not.toBeNull();
      expect(post.center[1] - post.height / 2).toBeCloseTo(TRAY_TOP, 9);
      expect(post.center[1] + post.height / 2).toBeCloseTo(tileBottom(i), 9);
      expect(post.center[0]).toBeCloseTo(tileCenter(i)[0], 9);
      expect(post.center[2]).toBeCloseTo(tileCenter(i)[2], 9);
      // Under the tile and over the tray.
      expect(Math.abs(post.center[2])).toBeLessThan(TRAY.size[2] / 2 - POST.radius);
    }
  });

  it('lays each check flat on its own tile top, two bars meeting at the vertex', () => {
    for (const i of TILES) {
      const bars = checkBars(i);
      expect(bars.map((b) => b.length)).toEqual([CHECK.short, CHECK.long]);
      for (const b of bars) {
        expect(b.position[1] - CHECK.section / 2).toBeCloseTo(tileTop(i), 9);
        for (const p of corners([b.length, CHECK.section, CHECK.section], b.position, b.rotationY))
          expect(inFootprint(p, i)).toBe(true);
      }
      // Short stroke falls toward the vertex (+x, +z), long one rises away from it (+x, -z).
      const vx = tileCenter(i)[0] + CHECK.vertex.x;
      const vz = tileCenter(i)[2] + CHECK.vertex.z;
      expect(bars[0]!.position[0]).toBeLessThan(vx);
      expect(bars[0]!.position[2]).toBeLessThan(vz);
      expect(bars[1]!.position[0]).toBeGreaterThan(vx);
      expect(bars[1]!.position[2]).toBeLessThan(vz);
    }
  });

  it('rests the three beads together on the top tile, clear of its check', () => {
    const beads = beadCenters();
    expect(beads).toHaveLength(3);
    const top = 4;
    const bars = checkBars(top).flatMap((b) =>
      corners([b.length, CHECK.section, CHECK.section], b.position, b.rotationY),
    );
    const checkBackZ = Math.min(...bars.map((p) => p.z));
    for (const [k, c] of beads.entries()) {
      expect(c[1] - BEAD.radius).toBeCloseTo(tileTop(top), 9);
      expect(inFootprint(new Vector3(c[0], c[1], c[2]), top, BEAD.radius - 1e-3)).toBe(true);
      expect(c[2] + BEAD.radius).toBeLessThan(checkBackZ);
      if (k > 0) expect(c[0] - beads[k - 1]![0]).toBeCloseTo(2 * BEAD.radius, 9);
    }
  });

  it('stands the crate on the tray, clear of the tiles and posts', () => {
    expect(CRATE.center[1] - CRATE.size / 2).toBeCloseTo(TRAY_TOP, 9);
    const half = CRATE.size / 2 + STRIP.inset;
    for (const i of TILES) {
      const [x, , z] = tileCenter(i);
      const apartX = Math.abs(x - CRATE.center[0]) > half + TILE.size[0] / 2;
      const apartZ = Math.abs(z - CRATE.center[2]) > half + TILE.size[2] / 2;
      expect(apartX || apartZ).toBe(true);
    }
    for (const s of stripCenters()) {
      expect(s[1]).toBeCloseTo(CRATE.center[1], 9);
    }
  });

  it('keeps every part inside the standard slot', () => {
    const points: Vector3[] = [
      ...corners(TRAY.size, TRAY.center),
      ...TILES.flatMap((i) => corners(TILE.size, tileCenter(i))),
      ...TILES.flatMap((i) =>
        checkBars(i).flatMap((b) =>
          corners([b.length, CHECK.section, CHECK.section], b.position, b.rotationY),
        ),
      ),
      ...beadCenters().flatMap((c) =>
        corners([2 * BEAD.radius, 2 * BEAD.radius, 2 * BEAD.radius], c),
      ),
      ...corners([CRATE.size, CRATE.size, CRATE.size], CRATE.center),
      ...stripCenters().flatMap((c) => corners([STRIP.width, CRATE.size, STRIP.width], c)),
    ];
    for (const p of points) expect(inSlot(p), p.toArray().join(', ')).toBe(true);
  });
});

describe('klarup motion', () => {
  it('starts in the hold: clock 0 shows all five checks lit (the reduced-motion pose)', () => {
    for (const i of TILES) {
      expect(glowAt(0, i)).toBeCloseTo(GLOW.lit, 9);
      for (const t of [0, 2.5, 4, 17.3]) expect(glowAt(t, i, true)).toBeCloseTo(GLOW.lit, 9);
    }
  });

  it('lights one tile every 1.6 s up the stairs, holds 2 s, resets together over 1 s', () => {
    expect(CLIMB.periodS).toBe(10);
    expect(ALL_LIT_S).toBeCloseTo(7, 9);
    expect(RESET_START_S).toBeCloseTo(9, 9);
    // All rest at the start of the cycle.
    for (const i of TILES) expect(litAt(0.05, i)).toBe(0);
    for (const i of TILES) {
      const start = CLIMB.firstS + i * CLIMB.stepS;
      expect(litAt(start, i)).toBeCloseTo(0, 9);
      expect(litAt(start + CLIMB.rampS / 2, i)).toBeCloseTo(0.5, 9);
      expect(litAt(start + CLIMB.rampS, i)).toBeCloseTo(1, 9);
      // The next tile is still dark when this one lands, the one below already lit.
      if (i < 4) expect(litAt(start + CLIMB.rampS, i + 1)).toBe(0);
      if (i > 0) expect(litAt(start, i - 1)).toBe(1);
    }
    for (const p of [7, 8, 8.99]) for (const i of TILES) expect(litAt(p, i)).toBe(1);
    for (const i of TILES) {
      expect(litAt(9.5, i)).toBeCloseTo(0.5, 9);
      expect(litAt(9.999999, i)).toBeCloseTo(0, 4);
    }
  });

  it('maps the clock into the cycle with no jump and stays within rest and lit', () => {
    expect(cyclePhase(0)).toBeCloseTo(ALL_LIT_S, 9);
    expect(cyclePhase(10)).toBeCloseTo(ALL_LIT_S, 9);
    const step = 1 / 120;
    for (const i of TILES) {
      let last = glowAt(0, i);
      for (let t = step; t < 30; t += step) {
        const g = glowAt(t, i);
        expect(g).toBeGreaterThanOrEqual(GLOW.rest - 1e-9);
        expect(g).toBeLessThanOrEqual(GLOW.lit + 1e-9);
        // The fastest ramp (0.5 s easeInOutCubic, peak slope 3 / 0.5 s) bounds a frame's step.
        expect(Math.abs(g - last)).toBeLessThan((GLOW.lit - GLOW.rest) * 6 * step + 1e-6);
        last = g;
      }
    }
  });
});
