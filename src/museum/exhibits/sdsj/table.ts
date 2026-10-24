// The Round Table's measurements and its one motion (EXPERIENCE §4.8), kept apart from the
// component so Node unit tests check them without WebGL. Local frame (EXPERIENCE §4): origin =
// plinth top center, +Y up, +Z toward the stop camera, +X the viewer's right. Meters, seconds.
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';

export type Vec3 = [number, number, number];

/**
 * Walnut table top: its top surface at y 0.36 (raised into the middle of the case so the table
 * reads in the thumbnail, F-045), diameter 0.54 m (the slot is 0.65 m).
 */
export const TOP = { radius: 0.27, height: 0.025, segments: 64, surfaceY: 0.36 } as const;
export const TOP_CENTER_Y = TOP.surfaceY - TOP.height / 2;

/**
 * Brass rim around the table edge (an open band, 128 triangles): it gives the dark walnut disc a
 * bright outline against the case floor (F-045).
 */
export const RIM = { radius: 0.272, height: 0.029, segments: 64 } as const;

/** Brass foot disc, standing on the slot floor (y 0.025). */
export const FOOT = { radius: 0.15, height: 0.01, segments: 48, bottomY: 0.025 } as const;
export const FOOT_CENTER_Y = FOOT.bottomY + FOOT.height / 2;

/** Brass pedestal from the foot disc up to the underside of the top (y 0.035 to 0.335). */
export const PEDESTAL = { radius: 0.03, height: 0.3, segments: 24 } as const;
export const PEDESTAL_CENTER_Y = FOOT.bottomY + FOOT.height + PEDESTAL.height / 2;

/** The shared project: a static brass cube standing at the table center. */
export const CUBE = { size: 0.04 } as const;
export const CUBE_CENTER_Y = TOP.surfaceY + CUBE.size / 2;

/** Six identical laptops at radius 0.19, 60 degrees apart, facing the center. */
export const LAPTOP = {
  count: 6,
  ringRadius: 0.19,
  /** Azimuth of laptop 0; 0 degrees = local +X, 90 degrees = local +Z (toward the camera). */
  startDeg: 0,
  stepDeg: 60,
  /** Width x thickness x depth; the depth runs from the hinge (back) to the front edge. */
  base: [0.085, 0.005, 0.06] as Vec3,
  /** Width x length x thickness, upright. */
  lid: [0.085, 0.06, 0.004] as Vec3,
  /** Opened from closed (lid on the base) by 105 degrees, so it leans 15 degrees past upright. */
  openDeg: 105,
  /** The screen plane on the lid's inner face. */
  screen: [0.075, 0.05] as [number, number],
  /** Gap between the lid's inner face and the screen plane (no z-fighting at 3 m). */
  screenLift: 0.0005,
} as const;

/** The two shell parts of a laptop, drawn by one InstancedMesh (base and lid per laptop). */
export const SHELL_COUNT = LAPTOP.count * 2;

/** The motion: screens light in turn, one rising to 1.4 while the previous falls to 0.25. */
export const GLOW = {
  high: 1.4,
  low: 0.25,
  /** The reduced-motion pose (and the clock at 0): all six screens at 0.8. */
  rest: 0.8,
  /** One laptop's turn; the loop is count x stepS = 12 s. */
  stepS: 2,
  /** The hand-over ease at the start of each turn (easeInOutCubic); the rest of the turn holds. */
  fadeS: 0.8,
  /** From the rest pose into the loop when the clock starts, so motion never begins with a jump. */
  introS: 1,
} as const;
export const PERIOD_S = LAPTOP.count * GLOW.stepS;

const DEG = Math.PI / 180;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function easeInOutCubic(u: number): number {
  const t = clamp01(u);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

export function laptopAzimuthDeg(index: number): number {
  return LAPTOP.startDeg + index * LAPTOP.stepDeg;
}

/**
 * Laptop `index` as a placement: base center on the table top at the ring radius, yawed so its
 * front edge (local +Z) points at the table center and its hinge (local -Z) faces outward.
 */
export function laptopFrame(index: number): { position: Vec3; rotationY: number } {
  const a = laptopAzimuthDeg(index) * DEG;
  const out = { x: Math.cos(a), z: Math.sin(a) };
  // A yaw of r turns local +Z to (sin r, 0, cos r); the front must point along -out.
  return {
    position: [LAPTOP.ringRadius * out.x, TOP.surfaceY, LAPTOP.ringRadius * out.z],
    rotationY: Math.atan2(-out.x, -out.z),
  };
}

export interface Part {
  position: Vec3;
  /** Rotation about the laptop's own X (the hinge axis), applied after the laptop's yaw. */
  rotationX: number;
}

/** The lid's tilt from upright: 15 degrees back for a 105 degree opening. */
export const LID_TILT = -(LAPTOP.openDeg - 90) * DEG;

/** The base in laptop space (origin on the table top under the base center). */
export function basePart(): Part {
  return { position: [0, LAPTOP.base[1] / 2, 0], rotationX: 0 };
}

/**
 * The lid in laptop space. Its back face passes through the hinge line (the base's back top
 * edge), and it rises along (0, cos tilt, sin tilt), leaning back past upright.
 */
export function lidPart(): Part {
  const hingeY = LAPTOP.base[1];
  const hingeZ = -LAPTOP.base[2] / 2;
  const up = { y: Math.cos(LID_TILT), z: Math.sin(LID_TILT) };
  // The lid's inner (front) normal: local +Z after the tilt.
  const n = { y: -Math.sin(LID_TILT), z: Math.cos(LID_TILT) };
  const along = LAPTOP.lid[1] / 2;
  const half = LAPTOP.lid[2] / 2;
  return {
    position: [0, hingeY + up.y * along + n.y * half, hingeZ + up.z * along + n.z * half],
    rotationX: LID_TILT,
  };
}

/** The screen plane in laptop space: centered on the lid's inner face, facing the center. */
export function screenPart(): Part {
  const lid = lidPart();
  const n = { y: -Math.sin(LID_TILT), z: Math.cos(LID_TILT) };
  const d = LAPTOP.lid[2] / 2 + LAPTOP.screenLift;
  return {
    position: [0, lid.position[1] + n.y * d, lid.position[2] + n.z * d],
    rotationX: LID_TILT,
  };
}

/** The exhibit-space matrix of a laptop part scaled by `scale` (a unit box or plane). */
export function partMatrix(index: number, part: Part, scale: Vec3, out = new Matrix4()): Matrix4 {
  const frame = laptopFrame(index);
  const laptop = new Matrix4().compose(
    new Vector3(...frame.position),
    new Quaternion().setFromEuler(new Euler(0, frame.rotationY, 0)),
    new Vector3(1, 1, 1),
  );
  const local = new Matrix4().compose(
    new Vector3(...part.position),
    new Quaternion().setFromEuler(new Euler(part.rotationX, 0, 0)),
    new Vector3(...scale),
  );
  return out.multiplyMatrices(laptop, local);
}

/** The shell instance matrices: base then lid for each laptop (unit box geometry). */
export function shellMatrices(): Matrix4[] {
  const out: Matrix4[] = [];
  for (let i = 0; i < LAPTOP.count; i++) {
    out.push(partMatrix(i, basePart(), LAPTOP.base));
    out.push(partMatrix(i, lidPart(), LAPTOP.lid));
  }
  return out;
}

/** The laptop whose turn it is at clock `t` (the one rising, then holding at 1.4). */
export function turnAt(t: number): { lit: number; elapsed: number } {
  const clock = t > 0 ? t : 0;
  const step = Math.floor(clock / GLOW.stepS);
  return { lit: step % LAPTOP.count, elapsed: clock - step * GLOW.stepS };
}

/** The loop alone: the lit screen eases up from 0.25 while the previous one eases down. */
export function loopGlow(index: number, t: number): number {
  const { lit, elapsed } = turnAt(t);
  const k = easeInOutCubic(elapsed / GLOW.fadeS);
  const span = GLOW.high - GLOW.low;
  if (index === lit) return GLOW.low + span * k;
  if (index === (lit + LAPTOP.count - 1) % LAPTOP.count) return GLOW.high - span * k;
  return GLOW.low;
}

/**
 * Screen `index`'s emissive intensity at clock `t`. Reduced motion holds the rest pose (all six at
 * 0.8). So does a clock at 0 (?test=1, tier low): the first second blends from the rest pose into
 * the loop, so the loop never starts with a jump.
 */
export function screenGlow(index: number, t: number, reducedMotion: boolean): number {
  if (reducedMotion) return GLOW.rest;
  const w = easeInOutCubic(t / GLOW.introS);
  if (w >= 1) return loopGlow(index, t);
  return GLOW.rest + (loopGlow(index, t) - GLOW.rest) * w;
}
