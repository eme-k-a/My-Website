import { CylinderGeometry, InstancedMesh, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  COIN,
  coinScale,
  countsFor,
  createBalanceDriver,
  easeInOutCubic,
  easeInOutCubicInverse,
  heightsAt,
  isBalanced,
  MAX_COINS,
  MIN_COINS,
  MOVE_S,
  POSE,
  REBALANCE,
  rebalancePhase,
  setsAt,
  STACKS,
  stackHeight,
  TRAY,
  TRAY_TOP,
  writeStack,
} from './counts';

/** EXPERIENCE §4: the standard slot, local meters. */
const SLOT = { min: [-0.325, 0.025, -0.325], max: [0.325, 0.675, 0.325] };
const EPS = 1e-9;

const stack = () =>
  new InstancedMesh(
    new CylinderGeometry(COIN.radius, COIN.radius, COIN.height, COIN.segments),
    undefined,
    MAX_COINS,
  );

describe('finance-tracker counts (EXPERIENCE §4.6)', () => {
  it('1,000 seeded sets all keep 8 <= n <= 24 and Expenses <= Budget <= Income', () => {
    for (let k = 0; k < 1000; k++) {
      const c = countsFor(k);
      for (const n of [c.income, c.expenses, c.budget]) {
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(MIN_COINS);
        expect(n).toBeLessThanOrEqual(MAX_COINS);
      }
      expect(c.expenses).toBeLessThanOrEqual(c.budget);
      expect(c.budget).toBeLessThanOrEqual(c.income);
      expect(isBalanced(c)).toBe(true);
    }
  });

  it('is deterministic and actually varies', () => {
    expect(countsFor(7)).toEqual(countsFor(7));
    const distinct = new Set(
      Array.from({ length: 50 }, (_, k) => JSON.stringify(countsFor(k + 1))),
    );
    expect(distinct.size).toBeGreaterThan(30);
  });

  it('set 0 is the reduced-motion pose: Income 20, Expenses 14, Budget 17', () => {
    expect(countsFor(0)).toEqual({ income: 20, expenses: 14, budget: 17 });
    expect(POSE).toEqual(countsFor(0));
    expect(heightsAt(0)).toEqual(POSE);
    // Reduced motion pins set 0 whatever the clock says.
    for (const t of [0, 3, 6.5, 13.1, 600]) expect(heightsAt(t, true)).toEqual(POSE);
  });

  it('keeps Expenses <= Budget <= Income at every frame of 500 rebalances', () => {
    // Between moves the stacks hold an ordered set; sample each move (and a little past it) at
    // 240 frames a second.
    const frame = 1 / 240;
    const bad: string[] = [];
    for (let k = 1; k <= 500; k++) {
      for (let e = 0; e <= MOVE_S + 0.05; e += frame) {
        const t = k * REBALANCE.periodS + e;
        const h = heightsAt(t);
        const ordered = h.expenses <= h.budget + EPS && h.budget <= h.income + EPS;
        const inRange = [h.income, h.expenses, h.budget].every(
          (v) => v >= MIN_COINS - EPS && v <= MAX_COINS + EPS,
        );
        if (!ordered || !inRange) bad.push(`t ${t.toFixed(4)}: ${JSON.stringify(h)}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('rebalances every 6 s: the move ends by 1.4 s and the stacks hold the new set', () => {
    expect(rebalancePhase(5.99)).toMatchObject({ set: 0, moving: false });
    expect(rebalancePhase(6.1)).toMatchObject({ set: 1, moving: true });
    expect(rebalancePhase(6 + MOVE_S + 0.01)).toMatchObject({ set: 1, moving: false });
    expect(MOVE_S).toBeCloseTo(1.4, 9);
    const one = countsFor(1);
    for (const t of [6 + MOVE_S, 8, 11.99]) {
      const h = heightsAt(t);
      expect(h.income).toBeCloseTo(one.income, 9);
      expect(h.expenses).toBeCloseTo(one.expenses, 9);
      expect(h.budget).toBeCloseTo(one.budget, 9);
    }
  });

  it('scales each entering or leaving coin over 200 ms, at the top', () => {
    // Growing 10 -> 16: the new coins are 10 to 15, each crossing at an eased time in [0, 1.2].
    for (let j = 10; j < 16; j++) {
      const cross = REBALANCE.easeS * easeInOutCubicInverse((j + 1 - 10) / 6);
      expect(coinScale(10, 16, j, cross)).toBeCloseTo(0, 9);
      expect(coinScale(10, 16, j, cross + 0.1)).toBeCloseTo(0.5, 9);
      expect(coinScale(10, 16, j, cross + 0.2)).toBeCloseTo(1, 9);
    }
    // Coins below the lower count never change; coins above the higher count never show.
    for (const e of [0, 0.3, 0.7, 1.4]) {
      expect(coinScale(10, 16, 9, e)).toBe(1);
      expect(coinScale(10, 16, 16, e)).toBe(0);
      expect(coinScale(16, 10, 9, e)).toBe(1);
    }
    // Shrinking 16 -> 10: the top coin leaves first, over the first 200 ms.
    expect(coinScale(16, 10, 15, 0)).toBeCloseTo(1, 9);
    expect(coinScale(16, 10, 15, 0.1)).toBeCloseTo(0.5, 9);
    expect(coinScale(16, 10, 15, 0.2)).toBeCloseTo(0, 9);
    // At any instant the present coins form a solid run from the bottom (scales never increase
    // with height), so every change happens at the top.
    for (let e = 0; e <= MOVE_S; e += 0.01) {
      for (const [a, b] of [
        [10, 16],
        [16, 10],
      ] as const) {
        for (let j = 1; j < MAX_COINS; j++) {
          expect(coinScale(a, b, j, e)).toBeLessThanOrEqual(coinScale(a, b, j - 1, e) + EPS);
        }
      }
    }
    expect(stackHeight(10, 16, MOVE_S)).toBeCloseTo(16, 9);
    expect(stackHeight(16, 10, MOVE_S)).toBeCloseTo(10, 9);
  });

  it('inverts the ease', () => {
    for (let u = 0; u <= 1; u += 0.05)
      expect(easeInOutCubic(easeInOutCubicInverse(u))).toBeCloseTo(u, 9);
  });
});

describe('finance-tracker geometry', () => {
  it('stands the stacks on the tray and tops a full stack at y 0.271', () => {
    expect(TRAY_TOP).toBeCloseTo(0.055, 9);
    const mesh = stack();
    const top = writeStack(mesh, 0, MAX_COINS, MAX_COINS, 0);
    expect(top).toBeCloseTo(0.271, 9);
  });

  it('keeps the tray and full stacks inside the standard slot', () => {
    const half = TRAY.size.map((s) => s / 2);
    const trayMin = TRAY.center.map((c, i) => c - half[i]!);
    const trayMax = TRAY.center.map((c, i) => c + half[i]!);
    for (let i = 0; i < 3; i++) {
      expect(trayMin[i]).toBeGreaterThanOrEqual(SLOT.min[i]! - EPS);
      expect(trayMax[i]).toBeLessThanOrEqual(SLOT.max[i]! + EPS);
    }
    for (const { x } of STACKS) {
      expect(x - COIN.radius).toBeGreaterThanOrEqual(trayMin[0]!);
      expect(x + COIN.radius).toBeLessThanOrEqual(trayMax[0]!);
      expect(COIN.radius).toBeLessThanOrEqual(half[2]!);
    }
    // Neighbouring stacks never touch.
    expect(STACKS[1]!.x - STACKS[0]!.x).toBeGreaterThan(2 * COIN.radius);
    expect(0.055 + MAX_COINS * COIN.height).toBeLessThanOrEqual(SLOT.max[1]!);
  });

  it('collapses absent coins at the stack top, inside the slot', () => {
    const mesh = stack();
    const m = new Matrix4();
    const p = new Vector3();
    const top = writeStack(mesh, 0.17, 14, 14, 0);
    expect(top).toBeCloseTo(TRAY_TOP + 14 * COIN.height, 9);
    for (let j = 14; j < MAX_COINS; j++) {
      mesh.getMatrixAt(j, m);
      p.setFromMatrixPosition(m);
      // Instance matrices are float32.
      expect(p.y).toBeCloseTo(top, 6);
      expect(m.determinant()).toBe(0);
    }
  });
});

describe('finance-tracker driver', () => {
  it('writes only on a set change or while coins move; reduced motion pins set 0', () => {
    const meshes = [stack(), stack(), stack()];
    const driver = createBalanceDriver();
    driver.prepare(meshes);
    expect(driver.apply(meshes, 0, false)).toBe(true);
    expect(driver.apply(meshes, 3, false)).toBe(false);
    expect(driver.apply(meshes, 6.5, false)).toBe(true);
    expect(driver.apply(meshes, 6.5, false)).toBe(false);
    expect(driver.apply(meshes, 6.6, false)).toBe(true);
    expect(driver.apply(meshes, 9, false)).toBe(true);
    expect(driver.apply(meshes, 10, false)).toBe(false);
    expect(driver.apply(meshes, 13, true)).toBe(true);
    expect(driver.apply(meshes, 20, true)).toBe(false);
    const { to } = setsAt(20, true);
    expect(to).toEqual(POSE);
  });
});
