// Warm Start's measurements and its one motion (EXPERIENCE §4.2), kept apart from the component
// so Node unit tests check them without WebGL. Local frame (EXPERIENCE §4): origin = plinth top
// center, +Y up, +Z toward the stop camera, +X the viewer's right. Meters, seconds.
import { BufferAttribute, ExtrudeGeometry, Shape, Vector3, type BufferGeometry } from 'three';

export type Vec3 = [number, number, number];

const DEG = Math.PI / 180;

/** Base tray: walnut RoundedBox, its bottom on the slot floor (y 0.025); Verafin's edge radius. */
export const TRAY = {
  size: [0.58, 0.03, 0.36] as Vec3,
  radius: 0.008,
  center: [0, 0.04, 0] as Vec3,
  smoothness: 3,
  bevelSegments: 2,
} as const;

/** Top face of the tray: the slab and the key ring's stand stand on it. */
export const TRAY_TOP = TRAY.center[1] + TRAY.size[1] / 2;

/**
 * The wall-unit slab: bone ceramic, a rounded rectangle (corner radius 0.03 in the face plane)
 * with an 8 mm rounded edge front and back. drei's RoundedBox cannot take a radius over half the
 * 0.05 depth, so the slab is an extruded rounded rectangle (`roundedSlab`).
 */
export const SLAB = {
  size: [0.3, 0.48, 0.05] as Vec3,
  radius: 0.03,
  bevel: 0.008,
  center: [-0.1, 0.295, -0.08] as Vec3,
  curveSegments: 4,
  bevelSegments: 3,
} as const;

/** The slab's front face (local z). */
export const SLAB_FRONT_Z = SLAB.center[2] + SLAB.size[2] / 2;

/**
 * The ring dial: four accentGlow torus arcs of 80 degrees with 10 degree gaps, on the slab front.
 * The tube's back touches the face (center z -0.043, tube 0.012, face z -0.055).
 */
export const DIAL = {
  center: [-0.1, 0.33, -0.043] as Vec3,
  radius: 0.1,
  tube: 0.012,
  arcDeg: 80,
  gapDeg: 10,
  radialSegments: 8,
  tubularSegments: 24,
} as const;

/** Segment names, clockwise from the top (the DOM object description names them; no 3D text). */
export const SEGMENTS = ['build', 'end-to-end tests', 'dev release', 'store release'] as const;

/** Brass bezel around the dial: same center in the face plane, seated on the face. */
export const BEZEL = {
  radius: 0.125,
  tube: 0.004,
  z: SLAB_FRONT_Z + 0.004,
  radialSegments: 6,
  tubularSegments: 64,
} as const;

/**
 * Brass key ring, upright with its axis along the key. EXPERIENCE §4.2 puts that axis on local X;
 * seen from the stop camera (local +Z) the ring is then edge-on and reads as a bar, so the ring,
 * stand and key turn together by `SSO_YAW_DEG` about the stand's vertical axis, the key's bow
 * toward the camera (deviation recorded in review/reports/WP-20.json).
 */
export const RING = {
  center: [0.17, 0.24, 0.06] as Vec3,
  radius: 0.06,
  tube: 0.008,
  radialSegments: 8,
  tubularSegments: 48,
} as const;

/** Brass stand: from the tray top up into the ring's lowest tube section. */
export const STAND = {
  radius: 0.005,
  bottom: TRAY_TOP,
  top: RING.center[1] - RING.radius,
  segments: 8,
} as const;

/** The brass key, frozen mid-pass through the ring along local X. */
export const KEY = {
  y: RING.center[1],
  z: RING.center[2],
  bow: { x: 0.08, radius: 0.03, tube: 0.007, radialSegments: 8, tubularSegments: 32 },
  shaft: { radius: 0.006, from: 0.09, to: 0.25, segments: 10 },
  tooth: { size: [0.012, 0.018, 0.006] as Vec3, xs: [0.212, 0.227, 0.242] as const },
} as const;

/** The ring-and-key assembly's yaw about the stand axis (bow toward the camera). */
export const SSO_YAW_DEG = 35;

/** A point given in the unturned layout (key along local X), turned with the assembly. */
export function ssoPoint(p: Vec3): Vec3 {
  const a = SSO_YAW_DEG * DEG;
  const dx = p[0] - RING.center[0];
  const dz = p[2] - RING.center[2];
  // A yaw of +a (three.js rotation-y) maps (x, z) to (x cos a + z sin a, -x sin a + z cos a).
  return [
    RING.center[0] + dx * Math.cos(a) + dz * Math.sin(a),
    p[1],
    RING.center[2] - dx * Math.sin(a) + dz * Math.cos(a),
  ];
}

/** Center of the teeth: hanging under the shaft, their tops 2 mm inside it. */
export const TOOTH_Y = KEY.y - KEY.shaft.radius - KEY.tooth.size[1] / 2 + 0.002;

/**
 * Segment `i`'s start angle for TorusGeometry (radians, counter-clockwise from +X in the face
 * plane). Segment 0 spans 5 to 85 degrees clockwise from the top, segment 1 the next quarter, so
 * the four gaps sit at 12, 3, 6 and 9 o'clock.
 */
export function segmentStart(i: number): number {
  const half = DIAL.gapDeg / 2;
  // Clockwise-from-top angle c maps to 90 - c counter-clockwise from +X; the arc runs CCW.
  const fromCw = half + i * (DIAL.arcDeg + DIAL.gapDeg);
  return (90 - fromCw - DIAL.arcDeg) * DEG;
}

/** The segment arc's middle, clockwise from the top in degrees (for tests and the README). */
export function segmentMidCw(i: number): number {
  return DIAL.gapDeg / 2 + DIAL.arcDeg / 2 + i * (DIAL.arcDeg + DIAL.gapDeg);
}

// ---------------------------------------------------------------------------------------------
// The one motion: the release pipeline warming up.

/** Glow levels (ART_DIRECTION §5: 0.15 rest, 1.6 is the exhibit ceiling). */
export const GLOW = { rest: 0.15, peak: 1.6, reduced: 1 } as const;

/**
 * Segment i starts its 0.6 s ramp at firstS + i * stepS; all four hold until holdUntilS, then fade
 * together over fadeS; the loop is periodS long. Every ramp is at least 0.5 s (EXPERIENCE §10.4).
 */
export const WARMUP = {
  periodS: 10,
  firstS: 0.5,
  stepS: 2,
  rampS: 0.6,
  holdUntilS: 8.5,
  fadeS: 1,
} as const;

export function easeInOutSine(u: number): number {
  const t = u < 0 ? 0 : u > 1 ? 1 : u;
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

/** Segment `i`'s emissive intensity at clock `t` (seconds). */
export function segmentGlow(i: number, t: number): number {
  const local = ((t % WARMUP.periodS) + WARMUP.periodS) % WARMUP.periodS;
  const start = WARMUP.firstS + i * WARMUP.stepS;
  const span = GLOW.peak - GLOW.rest;
  if (local < start) return GLOW.rest;
  if (local < start + WARMUP.rampS)
    return GLOW.rest + span * easeInOutSine((local - start) / WARMUP.rampS);
  if (local < WARMUP.holdUntilS) return GLOW.peak;
  if (local < WARMUP.holdUntilS + WARMUP.fadeS)
    return GLOW.peak - span * easeInOutSine((local - WARMUP.holdUntilS) / WARMUP.fadeS);
  return GLOW.rest;
}

/** The four levels at clock `t`; the still pose (reduced motion, ?test=1, tier low) is all 1.0. */
export function dialGlow(t: number, still: boolean, out: number[] = [0, 0, 0, 0]): number[] {
  for (let i = 0; i < SEGMENTS.length; i++) out[i] = still ? GLOW.reduced : segmentGlow(i, t);
  return out;
}

// ---------------------------------------------------------------------------------------------
// Geometry helpers (three core only; ARCHITECTURE §7.5 bans three/examples in exhibits).

/**
 * A centered rounded slab: a rounded rectangle of `width` x `height` (corner `radius`) extruded to
 * `depth`, its front and back edges rounded by `bevel`. Normals are smoothed across faces less
 * than 60 degrees apart, so the corners shade round while the flat faces stay crisp.
 */
export function roundedSlab(
  width: number,
  height: number,
  depth: number,
  radius: number,
  bevel: number,
  curveSegments: number,
  bevelSegments: number,
): BufferGeometry {
  const w = width / 2 - bevel;
  const h = height / 2 - bevel;
  const r = radius - bevel;
  const shape = new Shape();
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.absarc(w - r, -h + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(w, h - r);
  shape.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
  shape.lineTo(-w + r, h);
  shape.absarc(-w + r, h - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(-w, -h + r);
  shape.absarc(-w + r, -h + r, r, Math.PI, Math.PI * 1.5, false);
  const core = depth - 2 * bevel;
  const geometry = new ExtrudeGeometry(shape, {
    depth: core,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments,
    curveSegments,
  });
  geometry.translate(0, 0, -core / 2);
  smoothNormals(geometry, 60 * DEG);
  return geometry;
}

/**
 * Creased normals for a non-indexed geometry: each vertex averages the (area-weighted) normals of
 * the faces that share its position and lie within `creaseAngle` of its own face.
 */
export function smoothNormals(geometry: BufferGeometry, creaseAngle: number): void {
  const position = geometry.getAttribute('position');
  const count = position.count;
  const faces = count / 3;
  const unit = new Float32Array(count * 3);
  const weighted = new Float32Array(count * 3);
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let f = 0; f < faces; f++) {
    a.fromBufferAttribute(position, f * 3);
    b.fromBufferAttribute(position, f * 3 + 1);
    c.fromBufferAttribute(position, f * 3 + 2);
    c.sub(b);
    a.sub(b);
    c.cross(a);
    const area = c.length();
    for (let k = 0; k < 3; k++) {
      const i = (f * 3 + k) * 3;
      weighted[i] = c.x;
      weighted[i + 1] = c.y;
      weighted[i + 2] = c.z;
      if (area > 0) {
        unit[i] = c.x / area;
        unit[i + 1] = c.y / area;
        unit[i + 2] = c.z / area;
      }
    }
  }
  const groups = new Map<string, number[]>();
  const key = (i: number) =>
    `${Math.round(position.getX(i) * 1e5)},${Math.round(position.getY(i) * 1e5)},${Math.round(position.getZ(i) * 1e5)}`;
  for (let i = 0; i < count; i++) {
    const k = key(i);
    const group = groups.get(k);
    if (group) group.push(i);
    else groups.set(k, [i]);
  }
  const cos = Math.cos(creaseAngle);
  const normals = new Float32Array(count * 3);
  for (const group of groups.values()) {
    for (const i of group) {
      let x = 0;
      let y = 0;
      let z = 0;
      for (const j of group) {
        const dot =
          unit[i * 3]! * unit[j * 3]! +
          unit[i * 3 + 1]! * unit[j * 3 + 1]! +
          unit[i * 3 + 2]! * unit[j * 3 + 2]!;
        if (dot < cos) continue;
        x += weighted[j * 3]!;
        y += weighted[j * 3 + 1]!;
        z += weighted[j * 3 + 2]!;
      }
      const length = Math.hypot(x, y, z) || 1;
      normals[i * 3] = x / length;
      normals[i * 3 + 1] = y / length;
      normals[i * 3 + 2] = z / length;
    }
  }
  geometry.setAttribute('normal', new BufferAttribute(normals, 3));
}
