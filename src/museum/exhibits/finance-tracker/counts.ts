// The Balance's measurements and its one motion (EXPERIENCE §4.6), kept apart from the component
// so Node unit tests check them without WebGL. Local frame (EXPERIENCE §4): origin = plinth top
// center, +Y up, +Z toward the stop camera, +X the viewer's right. Meters, seconds.
//
// The coin counts are seeded design noise, never data. The invariant Expenses <= Budget <= Income
// holds at every frame, not only at rest: each stack's integer count follows the same eased
// progress u from its old count to its new one, floor(from + (to - from) u). A straight blend of
// two ordered sets stays ordered, and floor keeps the order, so the integer counts are ordered at
// every instant. A coin then scales in (or out) over 200 ms, which makes each stack's visible
// height the mean of its integer count over the last 200 ms; a mean of ordered values is ordered.
import { Matrix4, type InstancedMesh } from 'three';
import { rng } from '../_kit/noise';

export type Vec3 = [number, number, number];

/** Ledger tray: walnut RoundedBox, its bottom on the slot floor (y 0.025). */
export const TRAY = {
  size: [0.56, 0.03, 0.3] as Vec3,
  radius: 0.008,
  center: [0, 0.04, 0] as Vec3,
  smoothness: 3,
  bevelSegments: 2,
} as const;

/** Top face of the tray: the stacks stand on it. */
export const TRAY_TOP = TRAY.center[1] + TRAY.size[1] / 2;

/** One coin: a cylinder, 24 segments (96 triangles with its caps). */
export const COIN = { radius: 0.055, height: 0.009, segments: 24 } as const;

/** Coins per stack (top of a full stack: 0.055 + 24 x 0.009 = 0.271). */
export const MIN_COINS = 8;
export const MAX_COINS = 24;

export type StackName = 'income' | 'expenses' | 'budget';
/** Left to right: Income (brass), Expenses (ceramicGraphite), Budget (frostedGlass). */
export const STACKS: readonly { name: StackName; x: number }[] = [
  { name: 'income', x: -0.17 },
  { name: 'expenses', x: 0 },
  { name: 'budget', x: 0.17 },
];
export const STACK_Z = 0;

export interface Counts {
  income: number;
  expenses: number;
  budget: number;
}

/** Set 0, the reduced-motion and ?test=1 pose (a design pose, not data). */
export const POSE: Counts = { income: 20, expenses: 14, budget: 17 };

/** Every 6 s the stacks ease to a new set over 1.2 s; each coin scales over 200 ms. */
export const REBALANCE = { periodS: 6, easeS: 1.2, coinS: 0.2 } as const;
/** From a cycle's start until the last coin has finished scaling. */
export const MOVE_S = REBALANCE.easeS + REBALANCE.coinS;

/** Seed of the count sets; set k uses its own stream, so set 0 never changes. */
export const COUNT_SEED = 0xba1a9c;

/** True when `c` is a valid set: every count in [8, 24], Expenses <= Budget <= Income. */
export function isBalanced(c: Counts): boolean {
  const ok = (n: number) => Number.isInteger(n) && n >= MIN_COINS && n <= MAX_COINS;
  return (
    ok(c.income) && ok(c.expenses) && ok(c.budget) && c.expenses <= c.budget && c.budget <= c.income
  );
}

/**
 * Count set `set`. Set 0 is the fixed pose; every other set is seeded: Income in [14, 24],
 * Expenses in [8, Income - 3] and Budget strictly between them, so the three stacks always differ.
 */
export function countsFor(set: number): Counts {
  if (set === 0) return POSE;
  const next = rng((COUNT_SEED ^ Math.imul(set + 1, 0x9e3779b1)) >>> 0);
  const pick = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  const income = pick(14, MAX_COINS);
  const expenses = pick(MIN_COINS, income - 3);
  const budget = pick(expenses + 1, income - 1);
  return { income, expenses, budget };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function easeInOutCubic(u: number): number {
  const t = clamp01(u);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** The inverse of easeInOutCubic on [0, 1]. */
export function easeInOutCubicInverse(y: number): number {
  const v = clamp01(y);
  return v < 0.5 ? Math.cbrt(v / 4) : 1 - Math.cbrt(2 * (1 - v)) / 2;
}

export interface RebalancePhase {
  /** The set the stacks reach in this cycle (cycle index). */
  set: number;
  /** Seconds since this cycle began. */
  elapsed: number;
  /** True while a coin of this cycle is still scaling. */
  moving: boolean;
}

/** Where clock `t` falls in the rebalance cycle. Set 0 holds for the first 6 s (and at t = 0). */
export function rebalancePhase(t: number): RebalancePhase {
  const clock = t > 0 ? t : 0;
  const set = Math.floor(clock / REBALANCE.periodS);
  const elapsed = clock - set * REBALANCE.periodS;
  return { set, elapsed, moving: set > 0 && elapsed < MOVE_S };
}

/**
 * Scale (0 to 1) of coin `j` (0 = bottom) in a stack moving from `from` to `to` coins, `elapsed`
 * seconds into the cycle. The integer count is floor(from + (to - from) u(s)) with u the eased
 * progress; coin j is present while that count exceeds j, and its scale is the share of the last
 * 200 ms it was present.
 */
export function coinScale(from: number, to: number, j: number, elapsed: number): number {
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  if (j < lo) return 1;
  if (j >= hi) return 0;
  // The time the count crosses j + 1 (entering when growing, leaving when shrinking).
  const cross = REBALANCE.easeS * easeInOutCubicInverse((j + 1 - from) / (to - from));
  const growing = to > from;
  const present = growing
    ? Math.min(REBALANCE.coinS, Math.max(0, elapsed - cross))
    : Math.min(REBALANCE.coinS, Math.max(0, cross - (elapsed - REBALANCE.coinS)));
  return present / REBALANCE.coinS;
}

/** Visible height of a stack in coins (the sum of its coin scales). */
export function stackHeight(from: number, to: number, elapsed: number): number {
  let h = 0;
  for (let j = 0; j < MAX_COINS; j++) h += coinScale(from, to, j, elapsed);
  return h;
}

/** The from and to sets at clock `t`; reduced motion pins set 0. */
export function setsAt(
  t: number,
  reducedMotion = false,
): { from: Counts; to: Counts; phase: RebalancePhase } {
  const phase = rebalancePhase(reducedMotion ? 0 : t);
  const to = countsFor(phase.set);
  return { from: phase.moving ? countsFor(phase.set - 1) : to, to, phase };
}

/** The visible heights of the three stacks at clock `t`, in coins. */
export function heightsAt(t: number, reducedMotion = false): Counts {
  const { from, to, phase } = setsAt(t, reducedMotion);
  return {
    income: stackHeight(from.income, to.income, phase.elapsed),
    expenses: stackHeight(from.expenses, to.expenses, phase.elapsed),
    budget: stackHeight(from.budget, to.budget, phase.elapsed),
  };
}

/**
 * Writes one stack's 24 coin matrices. Each coin is scaled uniformly by its scale and stacked on
 * the scaled coins below it, so the stack never shows a gap. Absent coins collapse to a point at
 * the stack top (inside the slot), so the mesh always draws all 24 and its triangle count is the
 * maximum one.
 */
export function writeStack(
  mesh: InstancedMesh,
  x: number,
  from: number,
  to: number,
  elapsed: number,
  matrix = new Matrix4(),
): number {
  let y = TRAY_TOP;
  for (let j = 0; j < MAX_COINS; j++) {
    const s = coinScale(from, to, j, elapsed);
    const h = COIN.height * s;
    matrix.makeScale(s, s, s).setPosition(x, y + h / 2, STACK_Z);
    mesh.setMatrixAt(j, matrix);
    y += h;
  }
  mesh.instanceMatrix.needsUpdate = true;
  return y;
}

export interface BalanceDriver {
  /** Writes the stacks for clock `t`; returns true when any instance matrix changed. */
  apply(meshes: readonly (InstancedMesh | null)[], t: number, reducedMotion: boolean): boolean;
  /** Sizes each mesh's bounding sphere for a full stack (frustum culling). */
  prepare(meshes: readonly (InstancedMesh | null)[]): void;
}

/**
 * Drives the three stacks from the exhibit clock. Outside a move nothing is written (the held set
 * is remembered), so a settled, idle scene has nothing to render. Reduced motion pins set 0.
 */
export function createBalanceDriver(): BalanceDriver {
  const matrix = new Matrix4();
  let held = -1;
  let lastT = Number.NaN;

  const write = (
    meshes: readonly (InstancedMesh | null)[],
    from: Counts,
    to: Counts,
    elapsed: number,
  ) => {
    STACKS.forEach(({ name, x }, k) => {
      const mesh = meshes[k];
      if (mesh) writeStack(mesh, x, from[name], to[name], elapsed, matrix);
    });
  };

  return {
    prepare(meshes) {
      const full: Counts = { income: MAX_COINS, expenses: MAX_COINS, budget: MAX_COINS };
      write(meshes, full, full, 0);
      for (const mesh of meshes) mesh?.computeBoundingSphere();
      held = -1;
      lastT = Number.NaN;
    },
    apply(meshes, t, reducedMotion) {
      const { from, to, phase } = setsAt(t, reducedMotion);
      if (!phase.moving) {
        if (held === phase.set) return false;
        held = phase.set;
        lastT = Number.NaN;
        write(meshes, to, to, phase.elapsed);
        return true;
      }
      if (t === lastT) return false;
      held = -1;
      lastT = t;
      write(meshes, from, to, phase.elapsed);
      return true;
    },
  };
}
