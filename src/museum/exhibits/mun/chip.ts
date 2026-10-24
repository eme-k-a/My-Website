// Work in Progress: measurements, placements and the one motion (EXPERIENCE §4.9), kept apart
// from the component so Node unit tests check them without WebGL. Local frame (EXPERIENCE §4, the
// MUN slot of §5.3): origin = top center of the 0.6 m plinth, +Y up, +Z toward the stop camera,
// +X the viewer's right; the slot is x and z in [-0.55, 0.55], y in [0.10, 1.20]. Meters, seconds.
import { Matrix4, Quaternion, Vector3 } from 'three';
import { rng } from '../_kit/noise';
import { TIER_COUNT } from './tiers';

export type Vec3 = [number, number, number];

/** Walnut base plate, y 0.10 to 0.13. */
export const PLATE = {
  size: [0.6, 0.03, 0.6] as Vec3,
  center: [0, 0.115, 0] as Vec3,
  radius: 0.006,
  smoothness: 3,
  bevelSegments: 2,
} as const;
export const PLATE_TOP = PLATE.center[1] + PLATE.size[1] / 2;

/** Brass post, y 0.13 to 0.53. */
export const POST = { radius: 0.02, bottom: 0.13, top: 0.53, segments: 24 } as const;

/** Graphite die, y 0.53 to 0.565. */
export const DIE = {
  size: [0.36, 0.035, 0.36] as Vec3,
  radius: 0.004,
  bottom: 0.53,
  smoothness: 2,
  bevelSegments: 1,
} as const;
export const DIE_CENTER_Y = DIE.bottom + DIE.size[1] / 2;
export const DIE_TOP = DIE.bottom + DIE.size[1];
const DIE_HALF = DIE.size[0] / 2;

/** Brass pins: 12 per edge on a 0.025 pitch, 0.008 wide, 0.004 high, 0.03 long, 5 mm into the die. */
export const PINS = {
  perEdge: 12,
  pitch: 0.025,
  size: [0.03, 0.004, 0.008] as Vec3, // radial x height x along the edge
  inset: 0.005,
} as const;
export const PIN_COUNT = PINS.perEdge * 4;
/** Where a pin's root starts on the die (traces end here). */
export const PIN_ROOT = DIE_HALF - PINS.inset;

/** Brass core square on the die top. */
export const CORE = { size: [0.08, 0.002, 0.08] as Vec3 } as const;
const CORE_HALF = CORE.size[0] / 2;

/** Brass traces on the die top: 0.004 wide, 0.0015 high. */
export const TRACE = { width: 0.004, height: 0.0015 } as const;
export const TRACE_SEED = 0x3a5e05;

/** The one motion: one revolution per 40 s, starting from the reduced-motion yaw of 30 degrees. */
export const TURN = { periodS: 40, restYawDeg: 30 } as const;

/**
 * Scaffold: 0.90 x 0.90 in plan, 5 tiers of 0.20 m from the slot floor (y 0.10, the top of the
 * kit riser, which spans the scaffold footprint: F-040), 0.012 m square rods.
 */
export const SCAFFOLD = {
  span: 0.9,
  tierHeight: 0.2,
  bottom: 0.1,
  rod: 0.012,
  rodsPerTier: 12,
} as const;

const DEG = Math.PI / 180;

/** Die yaw at clock `t` (radians). Reduced motion and ?test=1 (t = 0) hold 30 degrees. */
export function dieYaw(t: number, reducedMotion: boolean): number {
  const clock = reducedMotion || !(t > 0) ? 0 : t;
  const turns = (clock / TURN.periodS) % 1;
  return TURN.restYawDeg * DEG + turns * 2 * Math.PI;
}

/** A placed box: center, size along its own axes, yaw about +Y, then roll about +X. */
export interface Part {
  center: Vec3;
  size: Vec3;
  yaw?: number;
  pitch?: number;
}

const p = new Vector3();
const q = new Quaternion();
const s = new Vector3();
const yawQ = new Quaternion();
const pitchQ = new Quaternion();
const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_X = new Vector3(1, 0, 0);

/** The matrix that turns a unit box into `part`. */
export function partMatrix(part: Part, out = new Matrix4()): Matrix4 {
  yawQ.setFromAxisAngle(AXIS_Y, part.yaw ?? 0);
  pitchQ.setFromAxisAngle(AXIS_X, part.pitch ?? 0);
  q.multiplyQuaternions(yawQ, pitchQ);
  return out.compose(p.set(...part.center), q, s.set(...part.size));
}

/** Edge `e` (0 = +X, 1 = +Z, 2 = -X, 3 = -Z): the yaw that turns the +X edge onto it. */
const edgeYaw = (e: number) => -e * 90 * DEG;

/** Maps sector coordinates (u outward from the center, v along the edge) of edge `e` to (x, z). */
function sectorToLocal(e: number, u: number, v: number): [number, number] {
  const a = e * 90 * DEG;
  const c = Math.round(Math.cos(a));
  const sn = Math.round(Math.sin(a));
  // Outward direction (c, sn); along-edge direction (-sn, c).
  return [u * c - v * sn, u * sn + v * c];
}

/** The 48 pins (die-local: y relative to the plinth, the die group only turns about +Y). */
export function pinParts(): Part[] {
  const out: Part[] = [];
  const u = PIN_ROOT + PINS.size[0] / 2;
  for (let e = 0; e < 4; e++) {
    for (let k = 0; k < PINS.perEdge; k++) {
      const v = (k - (PINS.perEdge - 1) / 2) * PINS.pitch;
      const [x, z] = sectorToLocal(e, u, v);
      out.push({ center: [x, DIE_CENTER_Y, z], size: [...PINS.size], yaw: edgeYaw(e) });
    }
  }
  return out;
}

/** One straight trace run in sector coordinates, from (u0, v0) to (u1, v1); axis-aligned. */
export interface Run {
  edge: number;
  route: number;
  from: [number, number];
  to: [number, number];
}

/**
 * The seeded Manhattan pattern, 10 runs per edge (40 in all). Each edge carries a bus of three
 * traces that leave the core square, step sideways by 0.04 in a staircase (the outermost line
 * turns first, so no two cross) and run straight into three neighbouring pins, plus one straight
 * trace from the core to the pin on the other side. The step side and the step positions are
 * seeded per edge. Every run stays inside its edge's quarter of the die (u > |v|).
 */
export function traceRuns(): Run[] {
  const runs: Run[] = [];
  const pinV = (k: number) => (k - (PINS.perEdge - 1) / 2) * PINS.pitch; // k = 6 is +0.0125
  const jog = 0.04;
  for (let e = 0; e < 4; e++) {
    const next = rng((TRACE_SEED ^ Math.imul(e + 1, 0x9e3779b1)) >>> 0);
    const side = next() < 0.5 ? 1 : -1;
    const firstTurn = 0.082 + 0.008 * next();
    const step = 0.013 + 0.004 * next();
    // Ends at pins +0.0625, +0.0375, +0.0125 (mirrored when side is -1), outermost first.
    for (let k = 0; k < 3; k++) {
      const end = side * pinV(8 - k);
      const start = end - side * jog;
      const turn = firstTurn + k * step;
      const route = e * 4 + k;
      runs.push({ edge: e, route, from: [CORE_HALF, start], to: [turn, start] });
      runs.push({ edge: e, route, from: [turn, start], to: [turn, end] });
      runs.push({ edge: e, route, from: [turn, end], to: [PIN_ROOT, end] });
    }
    const straight = -side * pinV(7);
    runs.push({ edge: e, route: e * 4 + 3, from: [CORE_HALF, straight], to: [PIN_ROOT, straight] });
  }
  return runs;
}

export const TRACE_COUNT = 40;

/** Length of a run (along its axis, without the corner overlap). */
export const runLength = (r: Run) => Math.abs(r.to[0] - r.from[0]) + Math.abs(r.to[1] - r.from[1]);

/** A run as a box on the die top; each end overlaps by half a trace width for clean corners. */
export function traceParts(): Part[] {
  return traceRuns().map((r) => {
    const [x0, z0] = sectorToLocal(r.edge, ...r.from);
    const [x1, z1] = sectorToLocal(r.edge, ...r.to);
    const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    const length = runLength(r) + TRACE.width;
    return {
      center: [(x0 + x1) / 2, DIE_TOP + TRACE.height / 2, (z0 + z1) / 2],
      size: alongX ? [length, TRACE.height, TRACE.width] : [TRACE.width, TRACE.height, length],
    };
  });
}

/** Tier `i` (0 = bottom): its 12 rods, uprights, top rails and X-bracing on the +X and -X faces. */
export function tierParts(i: number): Part[] {
  const { span, tierHeight, bottom, rod } = SCAFFOLD;
  const half = span / 2;
  const y0 = bottom + i * tierHeight;
  const y1 = y0 + tierHeight;
  const out: Part[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      out.push({ center: [sx * half, (y0 + y1) / 2, sz * half], size: [rod, tierHeight, rod] });
    }
  }
  // Top rails: two along x (front and back), two along z (left and right); they cover the corners.
  for (const sz of [-1, 1]) out.push({ center: [0, y1, sz * half], size: [span + rod, rod, rod] });
  for (const sx of [-1, 1]) out.push({ center: [sx * half, y1, 0], size: [rod, rod, span + rod] });
  // X-bracing on the side faces, corner to corner, kept inside the tier's height (so the bottom
  // tier's braces end on the riser top, not in it: F-040) and the uprights' outer faces.
  const angle = Math.atan2(tierHeight, span);
  const length = Math.min(
    (tierHeight - rod * Math.cos(angle)) / Math.sin(angle),
    (span - rod * Math.sin(angle)) / Math.cos(angle),
  );
  for (const sx of [-1, 1]) {
    for (const dir of [-1, 1]) {
      out.push({
        center: [sx * half, (y0 + y1) / 2, 0],
        size: [rod, rod, length],
        pitch: dir * angle,
      });
    }
  }
  return out;
}

/** Brass tiers are the bottom `remaining`; the rest (from the top down) are glass ghosts. */
export function scaffoldParts(remaining: number): { standing: Part[]; ghosts: Part[] } {
  const standing: Part[] = [];
  const ghosts: Part[] = [];
  for (let i = 0; i < TIER_COUNT; i++) (i < remaining ? standing : ghosts).push(...tierParts(i));
  return { standing, ghosts };
}

/** Opacity of the ghost tiers (a frostedGlass instance). */
export const GHOST_OPACITY = 0.25;
