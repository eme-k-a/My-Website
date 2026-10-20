// The Ticket Spindle's measurements and its one motion (EXPERIENCE §4.4), kept apart from the
// component so Node unit tests check them without WebGL. Local frame (EXPERIENCE §4): origin =
// plinth top center, +Y up, +Z toward the stop camera, +X the viewer's right. Meters, seconds.
import { Euler, Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three';
import { rng } from '../_kit/noise';

export type Vec3 = [number, number, number];

/** Walnut box: RoundedBox 0.30 x 0.12 x 0.22 centered at (0, 0.085, 0); bottom on the slot floor. */
export const BOX = {
  size: [0.3, 0.12, 0.22] as Vec3,
  radius: 0.01,
  center: [0, 0.085, 0] as Vec3,
  smoothness: 3,
  bevelSegments: 2,
} as const;
export const BOX_TOP = BOX.center[1] + BOX.size[1] / 2;

/** Brass spindle: base disc on the box top, rod, cone tip (top at y 0.575). */
export const DISC = { radius: 0.04, height: 0.006, segments: 32 } as const;
export const ROD = { radius: 0.005, bottom: 0.145, top: 0.545, segments: 12 } as const;
export const TIP = { radius: 0.005, height: 0.03, segments: 12 } as const;

/** Paper tickets: 14 on the stack plus the falling one, one InstancedMesh. */
export const TICKET = {
  size: [0.12, 0.0025, 0.08] as Vec3,
  /** Bottom face of the lowest stacked ticket. */
  base: 0.152,
  pitch: 0.006,
  stacked: 14,
  maxYawDeg: 12,
  maxOffset: 0.004,
} as const;
export const TICKET_COUNT = TICKET.stacked + 1;

/** Blank graphite stamp near the front right corner of each ticket's top face, turned 8 degrees. */
export const STAMP = {
  size: [0.035, 0.0005, 0.014] as Vec3,
  /** Center on the ticket's top face, in the ticket's own frame. */
  at: [0.03, 0.022] as [number, number],
  yawDeg: 8,
} as const;

/** The one motion: rest, descend (easeOutCubic), sink one pitch. Period 6 s. */
export const MOTION = {
  periodS: 6,
  restS: 2.8,
  descendS: 2.4,
  sinkS: 0.8,
  /** Bottom face of the falling ticket when it appears. */
  fromY: 0.52,
  /** The falling ticket grows in over this long at the start of its descent (no pop). */
  appearS: 0.3,
} as const;

/** Bottom face the leaving ticket reaches during the sink: its stamp is then below the box top. */
export const HIDDEN_Y = BOX_TOP - TICKET.size[1] - STAMP.size[1] - 0.001;

export const TICKET_SEED = 0xcf1a04;

const DEG = Math.PI / 180;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function easeOutCubic(u: number): number {
  return 1 - (1 - clamp01(u)) ** 3;
}

export function easeInOutCubic(u: number): number {
  const t = clamp01(u);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Ticket number `serial` (0, 1, 2, ... in landing order): its seeded yaw and offset, fixed for life. */
export function ticketJitter(serial: number): { yaw: number; dx: number; dz: number } {
  const next = rng((TICKET_SEED ^ Math.imul(serial + 1, 0x9e3779b1)) >>> 0);
  return {
    yaw: (next() * 2 - 1) * TICKET.maxYawDeg * DEG,
    dx: (next() * 2 - 1) * TICKET.maxOffset,
    dz: (next() * 2 - 1) * TICKET.maxOffset,
  };
}

/** Bottom face of stack level `level` (0 = lowest visible ticket). */
export const levelY = (level: number) => TICKET.base + level * TICKET.pitch;

export interface TicketPose {
  serial: number;
  /** Bottom face y. */
  y: number;
  /** 0 = not drawn, 1 = full size. */
  scale: number;
}

/**
 * The 15 tickets at clock `t`. Cycle c = floor(t / 6) starts with serials c to c + 13 stacked
 * (bottom to top) at rest; then serial c + 14 descends from y 0.52 onto the stack in 2.4 s, and
 * the stack sinks one pitch in 0.8 s while serial c slips into the box. At t = 0 (and under
 * reduced motion) the pose is the rest pose: 14 stacked, no falling ticket.
 */
export function ticketsAt(t: number): TicketPose[] {
  const clock = t > 0 ? t : 0;
  const cycle = Math.floor(clock / MOTION.periodS);
  const phase = clock - cycle * MOTION.periodS;
  const descend = clamp01((phase - MOTION.restS) / MOTION.descendS);
  const sinkStart = MOTION.restS + MOTION.descendS;
  const sink = easeInOutCubic((phase - sinkStart) / MOTION.sinkS);
  const out: TicketPose[] = [];
  for (let level = 0; level < TICKET.stacked; level++) {
    const serial = cycle + level;
    let y = levelY(level) - sink * TICKET.pitch;
    // The bottom ticket keeps going until it is inside the box.
    if (level === 0) y = levelY(0) + (HIDDEN_Y - levelY(0)) * sink;
    out.push({ serial, y, scale: level === 0 && sink >= 1 ? 0 : 1 });
  }
  const falling = cycle + TICKET.stacked;
  if (phase < MOTION.restS) {
    out.push({ serial: falling, y: MOTION.fromY, scale: 0 });
  } else {
    const landed = levelY(TICKET.stacked);
    const y = MOTION.fromY + (landed - MOTION.fromY) * easeOutCubic(descend) - sink * TICKET.pitch;
    const grow = clamp01((phase - MOTION.restS) / MOTION.appearS);
    out.push({ serial: falling, y, scale: easeOutCubic(grow) });
  }
  return out;
}

/** True while something moves (outside the rest phase). */
export function moving(t: number): boolean {
  const clock = t > 0 ? t : 0;
  return clock % MOTION.periodS >= MOTION.restS;
}

const position = new Vector3();
const quaternion = new Quaternion();
const scale = new Vector3();
const euler = new Euler();
const stampLocal = new Matrix4();

/** A ticket's matrix: the unit-free box geometry is the ticket's own size. */
export function ticketMatrix(pose: TicketPose, out: Matrix4): Matrix4 {
  const { yaw, dx, dz } = ticketJitter(pose.serial);
  position.set(dx, pose.y + TICKET.size[1] / 2, dz);
  quaternion.setFromEuler(euler.set(0, yaw, 0));
  scale.setScalar(pose.scale > 0 ? pose.scale : 1e-6);
  return out.compose(position, quaternion, scale);
}

/** The stamp on the ticket's top face, in the ticket's frame, composed with the ticket's matrix. */
export function stampMatrix(ticket: Matrix4, out: Matrix4): Matrix4 {
  position.set(STAMP.at[0], TICKET.size[1] / 2 + STAMP.size[1] / 2, STAMP.at[1]);
  quaternion.setFromEuler(euler.set(0, STAMP.yawDeg * DEG, 0));
  stampLocal.compose(position, quaternion, scale.setScalar(1));
  return out.multiplyMatrices(ticket, stampLocal);
}

export interface SpindleDriver {
  /** Writes tickets and stamps for clock `t`; returns true when the instance matrices changed. */
  apply(tickets: InstancedMesh, stamps: InstancedMesh, t: number, reducedMotion: boolean): boolean;
}

/** Writes matrices only when the pose can have changed: during motion, or once per new rest. */
export function createSpindleDriver(): SpindleDriver {
  const ticket = new Matrix4();
  const stamp = new Matrix4();
  let last = Number.NaN;
  let restCycle = -1;
  return {
    apply(tickets, stamps, t, reducedMotion) {
      const clock = reducedMotion ? 0 : t > 0 ? t : 0;
      if (clock === last) return false;
      if (!moving(clock)) {
        const cycle = Math.floor(clock / MOTION.periodS);
        last = clock;
        if (cycle === restCycle) return false;
        restCycle = cycle;
      } else {
        restCycle = -1;
        last = clock;
      }
      ticketsAt(clock).forEach((pose, i) => {
        ticketMatrix(pose, ticket);
        tickets.setMatrixAt(i, ticket);
        stamps.setMatrixAt(i, stampMatrix(ticket, stamp));
      });
      tickets.instanceMatrix.needsUpdate = true;
      stamps.instanceMatrix.needsUpdate = true;
      return true;
    },
  };
}
