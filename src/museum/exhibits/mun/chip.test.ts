import { Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  CORE,
  DIE,
  DIE_CENTER_Y,
  DIE_TOP,
  dieYaw,
  partMatrix,
  PIN_COUNT,
  PIN_ROOT,
  pinParts,
  PLATE,
  PLATE_TOP,
  POST,
  runLength,
  SCAFFOLD,
  scaffoldParts,
  tierParts,
  TRACE,
  TRACE_COUNT,
  traceParts,
  traceRuns,
  type Part,
} from './chip';

/** EXPERIENCE §5.3: the MUN slot, local meters. */
const SLOT = { min: [-0.55, 0.1, -0.55], max: [0.55, 1.2, 0.55] };

function corners(part: Part, yaw = 0): Vector3[] {
  const m = new Matrix4().makeRotationY(yaw).multiply(partMatrix(part));
  const out: Vector3[] = [];
  for (const sx of [-0.5, 0.5])
    for (const sy of [-0.5, 0.5])
      for (const sz of [-0.5, 0.5]) out.push(new Vector3(sx, sy, sz).applyMatrix4(m));
  return out;
}

function inSlot(p: Vector3): boolean {
  const v = p.toArray();
  return [0, 1, 2].every((i) => v[i]! >= SLOT.min[i]! - 1e-9 && v[i]! <= SLOT.max[i]! + 1e-9);
}

describe('mun geometry (EXPERIENCE §4.9)', () => {
  it('stacks plate, post and die at the specified heights', () => {
    expect(PLATE.center[1] - PLATE.size[1] / 2).toBeCloseTo(0.1, 9);
    expect(PLATE_TOP).toBeCloseTo(0.13, 9);
    expect(POST.bottom).toBeCloseTo(PLATE_TOP, 9);
    expect(POST.top).toBeCloseTo(DIE.bottom, 9);
    expect(DIE_TOP).toBeCloseTo(0.565, 9);
  });

  it('has 48 pins, 12 per edge, rooted in the die edge', () => {
    const pins = pinParts();
    expect(pins).toHaveLength(PIN_COUNT);
    expect(PIN_COUNT).toBe(48);
    for (const pin of pins) {
      const r = Math.max(Math.abs(pin.center[0]), Math.abs(pin.center[2]));
      expect(r - 0.015).toBeCloseTo(PIN_ROOT, 9);
      expect(pin.center[1]).toBeCloseTo(DIE_CENTER_Y, 9);
      for (const c of corners(pin)) {
        expect(Math.max(Math.abs(c.x), Math.abs(c.z))).toBeGreaterThanOrEqual(PIN_ROOT - 1e-9);
      }
    }
  });

  it('lays about 40 Manhattan traces, 0.04 to 0.16 long, on the die top', () => {
    const runs = traceRuns();
    expect(runs).toHaveLength(TRACE_COUNT);
    for (const run of runs) {
      expect(runLength(run)).toBeGreaterThanOrEqual(0.04 - 1e-9);
      expect(runLength(run)).toBeLessThanOrEqual(0.16 + 1e-9);
      // Axis-aligned, inside its edge's quarter (u > |v|) beyond the core edge.
      expect(run.from[0] === run.to[0] || run.from[1] === run.to[1]).toBe(true);
      for (const [u, v] of [run.from, run.to]) {
        expect(u).toBeGreaterThanOrEqual(CORE.size[0] / 2 - 1e-9);
        expect(u).toBeLessThanOrEqual(PIN_ROOT + 1e-9);
        expect(u - Math.abs(v)).toBeGreaterThan(TRACE.width / 2 - 1e-9);
      }
    }
    for (const part of traceParts()) {
      expect(part.center[1]).toBeCloseTo(DIE_TOP + TRACE.height / 2, 9);
      for (const c of corners(part)) {
        expect(Math.abs(c.x)).toBeLessThanOrEqual(DIE.size[0] / 2);
        expect(Math.abs(c.z)).toBeLessThanOrEqual(DIE.size[2] / 2);
      }
    }
  });

  it('never lets traces of different routes touch outside the core', () => {
    const runs = traceRuns();
    const rect = (r: (typeof runs)[number]) => {
      const h = TRACE.width / 2;
      return {
        u0: Math.min(r.from[0], r.to[0]) - h,
        u1: Math.max(r.from[0], r.to[0]) + h,
        v0: Math.min(r.from[1], r.to[1]) - h,
        v1: Math.max(r.from[1], r.to[1]) + h,
      };
    };
    const core = CORE.size[0] / 2;
    for (const a of runs) {
      for (const b of runs) {
        if (a.edge !== b.edge || a.route === b.route) continue;
        const ra = rect(a);
        const rb = rect(b);
        const u0 = Math.max(ra.u0, rb.u0, core);
        const u1 = Math.min(ra.u1, rb.u1);
        const gap = 0.002;
        const overlap = u0 < u1 + gap && Math.max(ra.v0, rb.v0) < Math.min(ra.v1, rb.v1) + gap;
        expect(overlap, `routes ${a.route} and ${b.route}`).toBe(false);
      }
    }
  });

  it('builds 5 tiers of 12 rods in a 0.90 x 0.90 lattice from y 0.13 to 1.13', () => {
    expect(tierParts(0)).toHaveLength(SCAFFOLD.rodsPerTier);
    const all = [0, 1, 2, 3, 4].flatMap((i) => tierParts(i));
    const ys = all.flatMap((p) => corners(p).map((c) => c.y));
    expect(Math.min(...ys)).toBeCloseTo(0.13, 2);
    expect(Math.max(...ys)).toBeLessThanOrEqual(1.13 + SCAFFOLD.rod);
    const xs = all.flatMap((p) => corners(p).map((c) => Math.abs(c.x)));
    expect(Math.max(...xs)).toBeCloseTo(0.45 + SCAFFOLD.rod / 2, 9);
  });

  it('splits the tiers: bottom ones brass, the rest glass ghosts from the top down', () => {
    expect(scaffoldParts(1).standing).toEqual(tierParts(0));
    expect(scaffoldParts(1).ghosts).toHaveLength(4 * 12);
    expect(scaffoldParts(0).standing).toHaveLength(0);
    expect(scaffoldParts(5).ghosts).toHaveLength(0);
  });

  it('keeps every part inside the MUN slot at every die yaw', () => {
    const scaffold = scaffoldParts(5).standing;
    for (const part of scaffold) expect(corners(part).every(inSlot)).toBe(true);
    for (let deg = 0; deg < 360; deg += 15) {
      const yaw = (deg * Math.PI) / 180;
      for (const part of [...pinParts(), ...traceParts()]) {
        for (const c of corners(part, yaw)) {
          expect(inSlot(c)).toBe(true);
          // Clear of the scaffold uprights' inner faces.
          expect(Math.max(Math.abs(c.x), Math.abs(c.z))).toBeLessThan(0.45 - SCAFFOLD.rod / 2);
        }
      }
    }
  });

  it('stays under 20k triangles (about 2,100 to 3,000)', () => {
    // RoundedBox plate and die, post, core, 48 pins, 40 traces, 60 rods (boxes are 12 each).
    const boxes = (PIN_COUNT + TRACE_COUNT + 60 + 1) * 12;
    expect(boxes + 2 * 600 + POST.segments * 4).toBeLessThan(20_000);
  });
});

describe('mun motion (one: the die turns once per 40 s)', () => {
  it('rests at 30 degrees under reduced motion and at t = 0', () => {
    const rest = (30 * Math.PI) / 180;
    expect(dieYaw(0, false)).toBeCloseTo(rest, 12);
    expect(dieYaw(17, true)).toBeCloseTo(rest, 12);
  });

  it('turns one revolution per 40 s', () => {
    expect(dieYaw(10, false) - dieYaw(0, false)).toBeCloseTo(Math.PI / 2, 9);
    expect(dieYaw(40, false)).toBeCloseTo(dieYaw(0, false), 9);
  });
});
