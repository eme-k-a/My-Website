import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  basePart,
  CUBE,
  CUBE_CENTER_Y,
  easeInOutCubic,
  FOOT,
  FOOT_CENTER_Y,
  GLOW,
  LAPTOP,
  laptopAzimuthDeg,
  laptopFrame,
  lidPart,
  LID_TILT,
  loopGlow,
  partMatrix,
  PEDESTAL,
  PEDESTAL_CENTER_Y,
  RIM,
  PERIOD_S,
  screenGlow,
  screenPart,
  SHELL_COUNT,
  shellMatrices,
  TOP,
  TOP_CENTER_Y,
  turnAt,
} from './table';

/** EXPERIENCE §4: the standard slot, local meters. */
const SLOT = { min: [-0.325, 0.025, -0.325], max: [0.325, 0.675, 0.325] };

function inSlot(p: Vector3): boolean {
  const v = p.toArray();
  return [0, 1, 2].every((i) => v[i]! >= SLOT.min[i]! - 1e-9 && v[i]! <= SLOT.max[i]! + 1e-9);
}

/** The 8 corners of a unit box transformed by an instance matrix. */
function boxCorners(m: ReturnType<typeof partMatrix>): Vector3[] {
  const out: Vector3[] = [];
  for (const x of [-0.5, 0.5])
    for (const y of [-0.5, 0.5])
      for (const z of [-0.5, 0.5]) out.push(new Vector3(x, y, z).applyMatrix4(m));
  return out;
}

const all = (i: number) => Array.from({ length: LAPTOP.count }, (_, k) => screenGlow(k, i, false));

describe('sdsj geometry (EXPERIENCE §4.8)', () => {
  it('stacks foot, pedestal and top with the top surface at y 0.36', () => {
    expect(FOOT_CENTER_Y - FOOT.height / 2).toBeCloseTo(0.025, 9);
    expect(PEDESTAL_CENTER_Y - PEDESTAL.height / 2).toBeCloseTo(FOOT_CENTER_Y + FOOT.height / 2, 9);
    expect(PEDESTAL_CENTER_Y + PEDESTAL.height / 2).toBeCloseTo(TOP_CENTER_Y - TOP.height / 2, 9);
    expect(TOP_CENTER_Y + TOP.height / 2).toBeCloseTo(0.36, 9);
    // The brass rim wraps the top's edge.
    expect(RIM.radius).toBeGreaterThan(TOP.radius);
    expect(RIM.height).toBeGreaterThan(TOP.height);
    expect(TOP.radius * 2).toBeCloseTo(0.54, 9);
    expect(TOP.segments).toBe(64);
    expect([PEDESTAL.radius, PEDESTAL.height, FOOT.radius, FOOT.height]).toEqual([
      0.03, 0.3, 0.15, 0.01,
    ]);
  });

  it('stands the brass cube on the table center', () => {
    expect(CUBE.size).toBe(0.04);
    expect(CUBE_CENTER_Y - CUBE.size / 2).toBeCloseTo(TOP.surfaceY, 9);
  });

  it('places six laptops 60 degrees apart at radius 0.19', () => {
    expect(LAPTOP.count).toBe(6);
    const deg = Array.from({ length: 6 }, (_, i) => laptopAzimuthDeg(i));
    for (let i = 1; i < 6; i++) expect(deg[i]! - deg[i - 1]!).toBe(60);
    for (let i = 0; i < 6; i++) {
      const [x, y, z] = laptopFrame(i).position;
      expect(Math.hypot(x, z)).toBeCloseTo(0.19, 9);
      expect(y).toBeCloseTo(TOP.surfaceY, 9);
    }
  });

  it('turns every laptop to face the center: front edge inward, hinge outward', () => {
    for (let i = 0; i < 6; i++) {
      const center = new Vector3(...laptopFrame(i).position);
      const front = new Vector3(0, 0, 0.03).applyMatrix4(partMatrix(i, basePart(), [1, 1, 1]));
      const back = new Vector3(0, 0, -0.03).applyMatrix4(partMatrix(i, basePart(), [1, 1, 1]));
      const r = (v: Vector3) => Math.hypot(v.x, v.z);
      expect(r(front)).toBeCloseTo(0.16, 6);
      expect(r(back)).toBeCloseTo(0.22, 6);
      // The front edge lies on the line from the laptop to the table center.
      const toCenter = center.clone().setY(0).normalize().negate();
      const dir = front.clone().sub(back).setY(0).normalize();
      expect(dir.dot(toCenter)).toBeCloseTo(1, 9);
    }
  });

  it('hinges the lid at the back edge, open 105 degrees', () => {
    expect(LID_TILT).toBeCloseTo((-15 * Math.PI) / 180, 12);
    const m = partMatrix(0, lidPart(), [1, 1, 1]);
    const base = partMatrix(0, basePart(), [1, 1, 1]);
    // The lid's back bottom edge (local y -h/2, z -t/2) is the base's back top edge.
    const lidHinge = new Vector3(0, -LAPTOP.lid[1] / 2, -LAPTOP.lid[2] / 2).applyMatrix4(m);
    const baseHinge = new Vector3(0, LAPTOP.base[1] / 2, -LAPTOP.base[2] / 2).applyMatrix4(base);
    expect(lidHinge.distanceTo(baseHinge)).toBeLessThan(1e-9);
    // Lid direction against the base's front direction: 105 degrees.
    const up = new Vector3(0, 1, 0).transformDirection(m);
    const forward = new Vector3(0, 0, 1).transformDirection(base);
    expect((Math.acos(up.dot(forward)) * 180) / Math.PI).toBeCloseTo(105, 6);
  });

  it('puts each screen on its lid inner face, facing the table center', () => {
    for (let i = 0; i < 6; i++) {
      const m = partMatrix(i, screenPart(), [1, 1, 1]);
      const normal = new Vector3(0, 0, 1).transformDirection(m);
      const pos = new Vector3().setFromMatrixPosition(m);
      const inward = pos.clone().setY(0).normalize().negate();
      expect(normal.dot(inward)).toBeGreaterThan(0.9);
      const lid = partMatrix(i, lidPart(), [1, 1, 1]);
      const lidFront = new Vector3(0, 0, LAPTOP.lid[2] / 2).applyMatrix4(lid);
      expect(pos.distanceTo(lidFront)).toBeCloseTo(LAPTOP.screenLift, 9);
    }
    expect(LAPTOP.screen[0]).toBeLessThan(LAPTOP.lid[0]);
    expect(LAPTOP.screen[1]).toBeLessThan(LAPTOP.lid[1]);
  });

  it('builds identical laptops: twelve shells, same sizes', () => {
    const shells = shellMatrices();
    expect(shells).toHaveLength(SHELL_COUNT);
    const size = (k: number) => new Vector3().setFromMatrixScale(shells[k]!);
    for (let i = 0; i < 6; i++) {
      expect(size(2 * i).distanceTo(new Vector3(...LAPTOP.base))).toBeLessThan(1e-12);
      expect(size(2 * i + 1).distanceTo(new Vector3(...LAPTOP.lid))).toBeLessThan(1e-12);
    }
  });

  it('keeps every part inside the standard slot and inside the table rim', () => {
    const points = shellMatrices().flatMap(boxCorners);
    for (let i = 0; i < 6; i++) {
      const s = partMatrix(i, screenPart(), [LAPTOP.screen[0], LAPTOP.screen[1], 0]);
      points.push(...boxCorners(s));
    }
    for (const p of points) {
      expect(inSlot(p)).toBe(true);
      expect(Math.hypot(p.x, p.z)).toBeLessThan(TOP.radius);
      expect(p.y).toBeGreaterThanOrEqual(TOP.surfaceY - 1e-9);
    }
    expect(inSlot(new Vector3(TOP.radius, CUBE_CENTER_Y + CUBE.size / 2, 0))).toBe(true);
  });

  it('keeps neighbouring laptops apart and clear of the cube', () => {
    // At the front edge (radius 0.16) half a laptop spans less than half the 60 degree step.
    const halfAngle = Math.atan(LAPTOP.base[0] / 2 / (0.19 - LAPTOP.base[2] / 2));
    expect((halfAngle * 180) / Math.PI).toBeLessThan(30);
    expect(0.19 - LAPTOP.base[2] / 2).toBeGreaterThan((CUBE.size / 2) * Math.SQRT2);
  });
});

describe('sdsj motion (EXPERIENCE §4.8)', () => {
  it('loops every 12 s, 2 s per laptop', () => {
    expect(PERIOD_S).toBe(12);
    expect(turnAt(0).lit).toBe(0);
    expect(turnAt(2.5).lit).toBe(1);
    expect(turnAt(11.9).lit).toBe(5);
    expect(turnAt(12.1).lit).toBe(0);
    for (const t of [3, 7.3, 10.9])
      for (let i = 0; i < 6; i++) expect(loopGlow(i, t)).toBeCloseTo(loopGlow(i, t + PERIOD_S), 9);
  });

  it('raises one screen to 1.4 while the previous falls to 0.25', () => {
    const t = 2 * 3; // laptop 3's turn begins
    expect(loopGlow(3, t)).toBeCloseTo(GLOW.low, 9);
    expect(loopGlow(2, t)).toBeCloseTo(GLOW.high, 9);
    const mid = t + GLOW.fadeS / 2;
    expect(loopGlow(3, mid)).toBeCloseTo((GLOW.high + GLOW.low) / 2, 9);
    expect(loopGlow(2, mid)).toBeCloseTo((GLOW.high + GLOW.low) / 2, 9);
    const held = t + 1.5;
    expect(loopGlow(3, held)).toBe(GLOW.high);
    expect(loopGlow(2, held)).toBe(GLOW.low);
    for (const i of [0, 1, 4, 5]) expect(loopGlow(i, mid)).toBe(GLOW.low);
    expect([GLOW.high, GLOW.low]).toEqual([1.4, 0.25]);
  });

  it('wraps the hand-over from laptop 5 to laptop 0', () => {
    expect(loopGlow(5, 12)).toBeCloseTo(GLOW.high, 9);
    expect(loopGlow(0, 12 + 1.9)).toBe(GLOW.high);
    expect(loopGlow(5, 12 + 1.9)).toBe(GLOW.low);
  });

  it('holds all six at 0.8 under reduced motion and with the clock at 0', () => {
    for (let i = 0; i < 6; i++) {
      expect(screenGlow(i, 0, false)).toBe(0.8);
      for (const t of [0, 1.3, 7, 50]) expect(screenGlow(i, t, true)).toBe(0.8);
    }
  });

  it('blends from the rest pose into the loop without a jump', () => {
    let prev = all(0);
    for (let t = 0.01; t <= PERIOD_S * 2; t += 0.01) {
      const now = all(t);
      for (let i = 0; i < 6; i++) expect(Math.abs(now[i]! - prev[i]!)).toBeLessThan(0.05);
      prev = now;
    }
    expect(all(GLOW.introS + 0.5)).toEqual(
      Array.from({ length: 6 }, (_, i) => loopGlow(i, GLOW.introS + 0.5)),
    );
  });

  it('keeps every level between 0.25 and 1.4, with at most two screens away from 0.25', () => {
    for (let t = 1; t < PERIOD_S * 2; t += 0.05) {
      const levels = all(t);
      for (const v of levels) {
        expect(v).toBeGreaterThanOrEqual(GLOW.low - 1e-9);
        expect(v).toBeLessThanOrEqual(GLOW.high + 1e-9);
      }
      expect(levels.filter((v) => v > GLOW.low + 1e-9).length).toBeLessThanOrEqual(2);
    }
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });
});
