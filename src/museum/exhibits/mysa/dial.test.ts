import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  BEZEL,
  DIAL,
  dialGlow,
  GLOW,
  KEY,
  RING,
  roundedSlab,
  segmentGlow,
  segmentMidCw,
  segmentStart,
  SEGMENTS,
  SLAB,
  SLAB_FRONT_Z,
  ssoPoint,
  SSO_YAW_DEG,
  STAND,
  TOOTH_Y,
  TRAY,
  TRAY_TOP,
  WARMUP,
} from './dial';

/** EXPERIENCE §4: the standard slot, local meters. */
const SLOT = { min: [-0.325, 0.025, -0.325], max: [0.325, 0.675, 0.325] };

function inSlot(p: number[]): boolean {
  return [0, 1, 2].every((i) => p[i]! >= SLOT.min[i]! - 1e-9 && p[i]! <= SLOT.max[i]! + 1e-9);
}

describe('mysa geometry (EXPERIENCE §4.2)', () => {
  it('stands the slab on the tray top', () => {
    expect(TRAY_TOP).toBeCloseTo(0.055, 9);
    expect(SLAB.center[1] - SLAB.size[1] / 2).toBeCloseTo(TRAY_TOP, 9);
    expect(TRAY.center[1] - TRAY.size[1] / 2).toBeCloseTo(SLOT.min[1]!, 9);
  });

  it('builds the slab as a 0.30 x 0.48 x 0.05 rounded rectangle', () => {
    const g = roundedSlab(...SLAB.size, SLAB.radius, SLAB.bevel, SLAB.curveSegments, 3);
    g.computeBoundingBox();
    const size = g.boundingBox!.getSize(new Vector3());
    expect(size.x).toBeCloseTo(0.3, 6);
    expect(size.y).toBeCloseTo(0.48, 6);
    expect(size.z).toBeCloseTo(0.05, 6);
    expect(g.boundingBox!.getCenter(new Vector3()).length()).toBeLessThan(1e-9);
    // Smoothed normals are unit length.
    const n = g.getAttribute('normal');
    for (let i = 0; i < n.count; i += 37) {
      expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 5);
    }
    g.dispose();
  });

  it('seats the dial and the bezel on the slab front', () => {
    expect(SLAB_FRONT_Z).toBeCloseTo(-0.055, 9);
    expect(DIAL.center[2] - DIAL.tube).toBeCloseTo(SLAB_FRONT_Z, 9);
    expect(BEZEL.z - BEZEL.tube).toBeCloseTo(SLAB_FRONT_Z, 9);
    // Dial and bezel fit inside the slab face.
    const reach = BEZEL.radius + BEZEL.tube;
    expect(DIAL.center[0] - reach).toBeGreaterThan(SLAB.center[0] - SLAB.size[0] / 2);
    expect(DIAL.center[0] + reach).toBeLessThan(SLAB.center[0] + SLAB.size[0] / 2);
    expect(DIAL.center[1] + reach).toBeLessThan(SLAB.center[1] + SLAB.size[1] / 2);
    expect(DIAL.center[1] - reach).toBeGreaterThan(SLAB.center[1] - SLAB.size[1] / 2);
  });

  it('lays out four 80 degree segments clockwise from the top, gaps at 12, 3, 6 and 9', () => {
    expect(SEGMENTS).toEqual(['build', 'end-to-end tests', 'dev release', 'store release']);
    expect(SEGMENTS.map((_, i) => segmentMidCw(i))).toEqual([45, 135, 225, 315]);
    for (let i = 0; i < 4; i++) {
      const startDeg = (segmentStart(i) * 180) / Math.PI;
      // Counter-clockwise from +X: segment i spans [5 - 90 i, 85 - 90 i].
      expect(startDeg).toBeCloseTo(5 - 90 * i, 9);
      expect(4 * DIAL.arcDeg + 4 * DIAL.gapDeg).toBe(360);
    }
  });

  it('passes the key through the ring and keeps the stand under it', () => {
    // In the unturned layout the key runs along X through the ring center.
    expect(KEY.y).toBe(RING.center[1]);
    expect(KEY.z).toBe(RING.center[2]);
    expect(KEY.shaft.from).toBeLessThan(RING.center[0] - RING.tube);
    expect(KEY.shaft.to).toBeGreaterThan(RING.center[0] + RING.tube);
    expect(KEY.shaft.radius).toBeLessThan(RING.radius - RING.tube);
    // Bow on one side of the ring, teeth on the other; the shaft starts within the bow (x 0.09).
    expect(KEY.bow.x + KEY.bow.radius + KEY.bow.tube).toBeLessThan(RING.center[0] - RING.tube);
    expect(KEY.shaft.from).toBeGreaterThan(KEY.bow.x);
    expect(KEY.shaft.from).toBeLessThan(KEY.bow.x + KEY.bow.radius + KEY.bow.tube);
    for (const x of KEY.tooth.xs) {
      expect(x - KEY.tooth.size[0] / 2).toBeGreaterThan(RING.center[0] + RING.tube);
      expect(x + KEY.tooth.size[0] / 2).toBeLessThanOrEqual(KEY.shaft.to);
    }
    expect(TOOTH_Y + KEY.tooth.size[1] / 2).toBeGreaterThan(KEY.y - KEY.shaft.radius);
    // The stand runs from the tray top into the ring's lowest tube section.
    expect(STAND.bottom).toBeCloseTo(TRAY_TOP, 9);
    expect(STAND.top).toBeCloseTo(RING.center[1] - RING.radius, 9);
    // The turn keeps the ring on its stand axis.
    expect(ssoPoint(RING.center)).toEqual(RING.center);
    expect(SSO_YAW_DEG).toBeGreaterThan(0);
    // Bow toward the camera (+Z), tip away.
    expect(ssoPoint([KEY.bow.x, KEY.y, KEY.z])[2]).toBeGreaterThan(RING.center[2]);
    expect(ssoPoint([KEY.shaft.to, KEY.y, KEY.z])[2]).toBeLessThan(RING.center[2]);
  });

  it('keeps every part inside the standard slot', () => {
    const box = new Box3();
    const add = (p: number[]) => box.expandByPoint(new Vector3(p[0], p[1], p[2]));
    for (const sx of [-0.5, 0.5])
      for (const sy of [-0.5, 0.5])
        for (const sz of [-0.5, 0.5]) {
          add([
            TRAY.center[0] + sx * TRAY.size[0],
            TRAY.center[1] + sy * TRAY.size[1],
            TRAY.center[2] + sz * TRAY.size[2],
          ]);
          add([
            SLAB.center[0] + sx * SLAB.size[0],
            SLAB.center[1] + sy * SLAB.size[1],
            SLAB.center[2] + sz * SLAB.size[2],
          ]);
        }
    // The ring and the key, sampled generously (outer radii), in the turned assembly.
    const r = RING.radius + RING.tube;
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * Math.PI * 2;
      for (const dx of [-RING.tube, RING.tube])
        add(
          ssoPoint([
            RING.center[0] + dx,
            RING.center[1] + r * Math.sin(a),
            RING.center[2] + r * Math.cos(a),
          ]),
        );
      const b = KEY.bow.radius + KEY.bow.tube;
      for (const dz of [-KEY.bow.tube, KEY.bow.tube])
        add(ssoPoint([KEY.bow.x + b * Math.cos(a), KEY.y + b * Math.sin(a), KEY.z + dz]));
    }
    add(ssoPoint([KEY.shaft.to, KEY.y, KEY.z + KEY.shaft.radius]));
    add(ssoPoint([KEY.shaft.to, KEY.y, KEY.z - KEY.shaft.radius]));
    const min = box.min.toArray();
    const max = box.max.toArray();
    expect(inSlot(min), `min ${min.join(', ')}`).toBe(true);
    expect(inSlot(max), `max ${max.join(', ')}`).toBe(true);
  });
});

describe('mysa motion: the warm-up (EXPERIENCE §4.2, §10.4)', () => {
  it('lights the segments in order, one every 2 s, each ramping 0.15 to 1.6 over 0.6 s', () => {
    for (let i = 0; i < 4; i++) {
      const start = WARMUP.firstS + i * WARMUP.stepS;
      expect(segmentGlow(i, start - 0.01)).toBe(GLOW.rest);
      expect(segmentGlow(i, start)).toBeCloseTo(GLOW.rest, 9);
      expect(segmentGlow(i, start + WARMUP.rampS / 2)).toBeCloseTo((GLOW.rest + GLOW.peak) / 2, 9);
      expect(segmentGlow(i, start + WARMUP.rampS)).toBe(GLOW.peak);
      if (i < 3) expect(segmentGlow(i + 1, start + WARMUP.rampS)).toBe(GLOW.rest);
    }
    expect(WARMUP.stepS).toBe(2);
    expect(WARMUP.rampS).toBe(0.6);
  });

  it('holds all four until 8.5 s, fades them together over 1 s, and loops every 10 s', () => {
    expect(dialGlow(8.49, false)).toEqual([1.6, 1.6, 1.6, 1.6]);
    const mid = dialGlow(9, false);
    expect(new Set(mid).size).toBe(1);
    expect(mid[0]).toBeCloseTo((GLOW.rest + GLOW.peak) / 2, 9);
    expect(dialGlow(9.5, false)).toEqual([0.15, 0.15, 0.15, 0.15]);
    for (const t of [0.3, 1.1, 4.2, 7.7, 9.2]) {
      expect(dialGlow(t + WARMUP.periodS, false)).toEqual(dialGlow(t, false));
    }
  });

  it('stays within the glow ceiling and never changes faster than a 0.5 s ramp', () => {
    let maxStep = 0;
    const dt = 0.01;
    for (let t = 0; t < 2 * WARMUP.periodS; t += dt) {
      for (let i = 0; i < 4; i++) {
        const v = segmentGlow(i, t);
        expect(v).toBeGreaterThanOrEqual(GLOW.rest - 1e-12);
        expect(v).toBeLessThanOrEqual(1.6 + 1e-12);
        maxStep = Math.max(maxStep, Math.abs(segmentGlow(i, t + dt) - v));
      }
    }
    // easeInOutSine's steepest slope is pi / 2 over the ramp: a 0.6 s ramp of 1.45 at most.
    expect(maxStep / dt).toBeLessThanOrEqual(((Math.PI / 2) * (GLOW.peak - GLOW.rest)) / 0.5);
    expect(Math.min(WARMUP.rampS, WARMUP.fadeS)).toBeGreaterThanOrEqual(0.5);
  });

  it('shows the still pose: all four lit at 1.0, whatever the clock', () => {
    for (const t of [0, 3.3, 9.1]) expect(dialGlow(t, true)).toEqual([1, 1, 1, 1]);
  });
});
