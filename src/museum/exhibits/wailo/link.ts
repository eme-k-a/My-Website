// The Deep Link's measurements and its one motion (EXPERIENCE §4.3), kept apart from the component
// so Node unit tests check them without WebGL. Local frame (EXPERIENCE §4): origin = plinth top
// center, +Y up, +Z toward the stop camera, +X the viewer's right. Meters, seconds.
import {
  BufferAttribute,
  CubicBezierCurve3,
  Euler,
  ExtrudeGeometry,
  Matrix4,
  Quaternion,
  Shape,
  Vector3,
  type BufferGeometry,
} from 'three';

export type Vec3 = [number, number, number];

const DEG = Math.PI / 180;

/** Base tray: walnut RoundedBox, its bottom on the slot floor (y 0.025); Verafin's edge radius. */
export const TRAY = {
  size: [0.6, 0.03, 0.4] as Vec3,
  radius: 0.008,
  center: [0, 0.04, 0] as Vec3,
  smoothness: 3,
  bevelSegments: 2,
} as const;

export const TRAY_TOP = TRAY.center[1] + TRAY.size[1] / 2;

/**
 * The walnut stand: a wedge in the 0.26 x 0.05 x 0.12 box at (0.08, 0.08, -0.04), its top
 * sloping up from a 2 cm front to the full 5 cm at the rear.
 */
export const STAND = {
  center: [0.08, 0.08, -0.04] as Vec3,
  size: [0.26, 0.05, 0.12] as Vec3,
  frontHeight: 0.02,
} as const;

export const STAND_FRONT_Z = STAND.center[2] + STAND.size[2] / 2;
export const STAND_BACK_Z = STAND.center[2] - STAND.size[2] / 2;

/** Height of the stand's sloped top at local z (inside its depth). */
export function standTopY(z: number): number {
  const rise = STAND.size[1] - STAND.frontHeight;
  return TRAY_TOP + STAND.frontHeight + (rise * (STAND_FRONT_Z - z)) / STAND.size[2];
}

/** The wedge's cross-section in (z, y), extruded along x (front bottom, back bottom, back top, front top). */
export function standProfile(): [number, number][] {
  return [
    [STAND_FRONT_Z, TRAY_TOP],
    [STAND_BACK_Z, TRAY_TOP],
    [STAND_BACK_Z, TRAY_TOP + STAND.size[1]],
    [STAND_FRONT_Z, TRAY_TOP + STAND.frontHeight],
  ];
}

/**
 * The phone: ceramicGraphite rounded slab 0.22 x 0.44 x 0.022 (corner radius 0.025), tilted back
 * 15 degrees and yawed 10 degrees toward the envelope (Euler YXZ: the yaw, then the tilt about the
 * phone's own X). Its bottom sits in the stand's slope (`sink` below the stand top at its bottom
 * center), its lowest point at y 0.075.
 */
export const PHONE = {
  size: [0.22, 0.44, 0.022] as Vec3,
  radius: 0.025,
  bevel: 0.004,
  tiltDeg: 15,
  yawDeg: 10,
  x: 0.08,
  bottomZ: -0.035,
  lowestY: 0.075,
  curveSegments: 4,
  bevelSegments: 2,
} as const;

export const PHONE_ROTATION = new Euler(-PHONE.tiltDeg * DEG, -PHONE.yawDeg * DEG, 0, 'YXZ');

const half = (v: Vec3) => v.map((x) => x / 2) as Vec3;

/** Box corners of `size` centered at the origin. */
export function boxCorners(size: Vec3): Vector3[] {
  const [hx, hy, hz] = half(size);
  const out: Vector3[] = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) out.push(new Vector3(sx * hx, sy * hy, sz * hz));
  return out;
}

/** The phone's center: its lowest corner at PHONE.lowestY, its bottom center at (x, bottomZ). */
export function phonePosition(): Vec3 {
  const q = new Quaternion().setFromEuler(PHONE_ROTATION);
  const lowest = Math.min(...boxCorners(PHONE.size).map((c) => c.applyQuaternion(q).y));
  const bottom = new Vector3(0, -PHONE.size[1] / 2, 0).applyQuaternion(q);
  return [PHONE.x - bottom.x, PHONE.lowestY - lowest, PHONE.bottomZ - bottom.z];
}

/** Phone-local to tray-local. */
export function phoneMatrix(): Matrix4 {
  const [x, y, z] = phonePosition();
  return new Matrix4().makeRotationFromEuler(PHONE_ROTATION).setPosition(x, y, z);
}

export function phonePoint(local: Vec3): Vector3 {
  return new Vector3(...local).applyMatrix4(phoneMatrix());
}

/** The phone front's outward normal (tray-local). */
export function phoneNormal(): Vector3 {
  return new Vector3(0, 0, 1).applyEuler(PHONE_ROTATION);
}

/** Phone front face (phone-local z). */
export const PHONE_FRONT = PHONE.size[2] / 2;

/** frostedGlass screen, 1 mm above the phone front. */
export const SCREEN = { size: [0.19, 0.4] as [number, number], z: PHONE_FRONT + 0.001 } as const;

/** The paper reset card centered on the screen, its key glyph and its accentGlow reset bar. */
export const CARD = {
  size: [0.15, 0.1, 0.004] as Vec3,
  radius: 0.0018,
  z: SCREEN.z + 0.0005 + 0.002,
} as const;
export const CARD_FRONT = CARD.z + CARD.size[2] / 2;
export const GLYPH = {
  y: 0.016,
  bow: { x: -0.022, radius: 0.012, tube: 0.0026, radialSegments: 6, tubularSegments: 24 },
  shaft: { radius: 0.0022, from: -0.0105, to: 0.0195, segments: 8 },
  z: CARD_FRONT + 0.0026,
} as const;
export const BAR = {
  size: [0.1, 0.008, 0.002] as Vec3,
  y: -0.026,
  z: CARD_FRONT + 0.001,
} as const;

/**
 * The paper envelope: 0.14 x 0.012 x 0.09 (thin side up), lying on the tray at (-0.20, z 0.12)
 * with its back edge raised 20 degrees, so its face turns to the camera. Its center y seats its
 * lowest edge on the tray top (0.076, the spec's "about 0.07").
 */
export const ENVELOPE = {
  size: [0.14, 0.012, 0.09] as Vec3,
  x: -0.2,
  z: 0.12,
  tiltDeg: 20,
  /** The raised V flap: a thin paper triangle hinged on the back edge, lifted 8 degrees. */
  flap: { depth: 0.05, thickness: 0.002, liftDeg: 8 },
} as const;

export const ENVELOPE_ROTATION = new Euler(ENVELOPE.tiltDeg * DEG, 0, 0);

export function envelopeCenter(): Vec3 {
  const q = new Quaternion().setFromEuler(ENVELOPE_ROTATION);
  const lowest = Math.min(...boxCorners(ENVELOPE.size).map((c) => c.applyQuaternion(q).y));
  return [ENVELOPE.x, TRAY_TOP - lowest, ENVELOPE.z];
}

export function envelopeMatrix(): Matrix4 {
  const [x, y, z] = envelopeCenter();
  return new Matrix4().makeRotationFromEuler(ENVELOPE_ROTATION).setPosition(x, y, z);
}

/** The flap's hinge on the envelope's top face, at its back edge (envelope-local). */
export const FLAP_HINGE: Vec3 = [0, ENVELOPE.size[1] / 2, -ENVELOPE.size[2] / 2];

/**
 * The link arc: one accentGlow tube (radius 0.005, 64 x 6 segments) on a cubic curve from inside
 * the envelope's center to just under the screen's top right, peaking at y 0.62. The ends sit
 * 4 mm inside the envelope and 6 mm inside the phone front, so the open tube ends never show.
 */
export const ARC = {
  radius: 0.005,
  tubularSegments: 64,
  radialSegments: 6,
  peakY: 0.62,
  startSink: 0.004,
  /** Phone-local end point: the screen's top right, inset, 6 mm under the phone front. */
  end: [0.07, 0.165, PHONE_FRONT - 0.006] as Vec3,
  /** How far the first control point leans from the envelope toward the phone (horizontal). */
  lean: 0.1,
  /** How far the last control point stands out from the screen along its normal. */
  approach: 0.16,
} as const;

export function arcStart(): Vector3 {
  return new Vector3(0, ENVELOPE.size[1] / 2 - ARC.startSink, 0).applyMatrix4(envelopeMatrix());
}

export function arcEnd(): Vector3 {
  return phonePoint(ARC.end);
}

function arcCurveFor(height: number): CubicBezierCurve3 {
  const p0 = arcStart();
  const p3 = arcEnd();
  const toward = new Vector3(p3.x - p0.x, 0, p3.z - p0.z).normalize().multiplyScalar(ARC.lean);
  const p1 = new Vector3(p0.x + toward.x, height, p0.z + toward.z);
  const p2 = p3.clone().addScaledVector(phoneNormal(), ARC.approach).setY(height);
  return new CubicBezierCurve3(p0, p1, p2, p3);
}

/** Highest y on a curve (dense sampling). */
export function curvePeakY(curve: CubicBezierCurve3, samples = 400): number {
  let peak = -Infinity;
  const v = new Vector3();
  for (let i = 0; i <= samples; i++) peak = Math.max(peak, curve.getPoint(i / samples, v).y);
  return peak;
}

/** The arc's curve: both control points at the height that makes the peak exactly ARC.peakY. */
export function arcCurve(): CubicBezierCurve3 {
  let lo: number = ARC.peakY;
  let hi = 2;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2;
    if (curvePeakY(arcCurveFor(mid)) > ARC.peakY) hi = mid;
    else lo = mid;
  }
  return arcCurveFor(lo);
}

/** The pulse sphere that rides the arc. */
export const PULSE = { radius: 0.014, widthSegments: 16, heightSegments: 12 } as const;

/**
 * The blank brass release tag (0.06 x 0.035 x 0.003, rounded corners) leans back 15 degrees on
 * the stand's front edge, its bottom on the tray, and hangs by a brass chain (radius 0.0015) from
 * a point on the phone's right side near its lower right corner.
 */
export const TAG = {
  size: [0.06, 0.035, 0.003] as Vec3,
  radius: 0.006,
  bevel: 0.001,
  x: 0.18,
  leanDeg: 15,
  /** Where the chain meets the tag: top center, 4 mm in from the top edge (tag-local). */
  hole: [0, 0.035 / 2 - 0.004, 0] as Vec3,
  curveSegments: 3,
  bevelSegments: 1,
} as const;

/** The chain's phone end: the phone's right side, 3 cm up from its bottom edge (phone-local). */
export const CHAIN = {
  radius: 0.0015,
  anchor: [PHONE.size[0] / 2, -PHONE.size[1] / 2 + 0.03, 0] as Vec3,
  segments: 6,
} as const;

export const TAG_ROTATION = new Euler(-TAG.leanDeg * DEG, 0, 0);

/** The tag's center: lowest edge on the tray, back face resting on the stand's front top edge. */
export function tagCenter(): Vec3 {
  const phi = TAG.leanDeg * DEG;
  const h = TAG.size[1] / 2;
  const t = TAG.size[2] / 2;
  const cy = TRAY_TOP + h * Math.cos(phi) + t * Math.sin(phi);
  // Back face (tag-local z = -t) point at local height `y` lands at the stand's front top edge.
  const edgeY = TRAY_TOP + STAND.frontHeight;
  const y = (edgeY - cy + t * Math.sin(phi)) / Math.cos(phi);
  const cz = STAND_FRONT_Z + y * Math.sin(phi) + t * Math.cos(phi);
  return [TAG.x, cy, cz];
}

export function tagMatrix(): Matrix4 {
  const [x, y, z] = tagCenter();
  return new Matrix4().makeRotationFromEuler(TAG_ROTATION).setPosition(x, y, z);
}

/** The chain as a cylinder: its midpoint, its orientation (+Y along the chain) and its length. */
export function chainPlacement(): {
  from: Vector3;
  to: Vector3;
  position: Vec3;
  quaternion: [number, number, number, number];
  length: number;
} {
  const from = phonePoint(CHAIN.anchor);
  const to = new Vector3(...TAG.hole).applyMatrix4(tagMatrix());
  const dir = to.clone().sub(from);
  const length = dir.length();
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
  const mid = from.clone().add(to).multiplyScalar(0.5);
  return { from, to, position: mid.toArray(), quaternion: [q.x, q.y, q.z, q.w], length };
}

// ---------------------------------------------------------------------------------------------
// The one motion: the delivery.

/** Glow levels (ART_DIRECTION §5: 1.6 is the exhibit ceiling). */
export const GLOW = {
  /** The arc's steady glow; it never changes. */
  arc: 0.5,
  pulse: 1.4,
  barRest: 0.4,
  barPeak: 1.6,
  /** The still pose (reduced motion, ?test=1, tier low): pulse hidden, reset bar at 1.0. */
  barStill: 1,
} as const;

/**
 * The pulse leaves the envelope at departS and reaches the screen travelS later (easeInOutSine);
 * the reset bar then flashes barRest to barPeak to barRest, each ramp flashRampS (R0 ruling
 * 2026-10-15: ramps of at least 0.5 s, so 1.0 s in all). The pulse grows and shrinks over
 * pulseScaleS at each end. Period 8 s.
 */
export const DELIVERY = {
  periodS: 8,
  departS: 0.5,
  travelS: 1.6,
  flashRampS: 0.5,
  pulseScaleS: 0.25,
} as const;

export const ARRIVE_S = DELIVERY.departS + DELIVERY.travelS;

export function easeInOutSine(u: number): number {
  const t = u < 0 ? 0 : u > 1 ? 1 : u;
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

export interface DeliveryPose {
  /** Arc-length fraction of the pulse along the arc (0 envelope, 1 screen). */
  pulseU: number;
  /** Pulse scale; 0 hides it. */
  pulseScale: number;
  bar: number;
}

/** The pose at clock `t`; `still` is the reduced-motion pose. */
export function deliveryPose(t: number, still: boolean): DeliveryPose {
  if (still) return { pulseU: 0, pulseScale: 0, bar: GLOW.barStill };
  const local = ((t % DELIVERY.periodS) + DELIVERY.periodS) % DELIVERY.periodS;
  let pulseU = 0;
  let pulseScale = 0;
  const travel = local - DELIVERY.departS;
  if (travel >= 0 && travel < DELIVERY.travelS) {
    pulseU = easeInOutSine(travel / DELIVERY.travelS);
    const edge = Math.min(travel, DELIVERY.travelS - travel) / DELIVERY.pulseScaleS;
    pulseScale = easeInOutSine(edge);
  }
  let bar: number = GLOW.barRest;
  const flash = local - ARRIVE_S;
  const span = GLOW.barPeak - GLOW.barRest;
  if (flash >= 0 && flash < DELIVERY.flashRampS)
    bar = GLOW.barRest + span * easeInOutSine(flash / DELIVERY.flashRampS);
  else if (flash >= DELIVERY.flashRampS && flash < 2 * DELIVERY.flashRampS)
    bar = GLOW.barPeak - span * easeInOutSine((flash - DELIVERY.flashRampS) / DELIVERY.flashRampS);
  return { pulseU, pulseScale, bar };
}

// ---------------------------------------------------------------------------------------------
// Geometry helpers (three core only; ARCHITECTURE §7.5 bans three/examples in exhibits). The same
// rounded slab as Warm Start's, copied (exhibits never import each other).

/** A centered rounded slab (corner `radius` in x-y, edges rounded by `bevel`), creased normals. */
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

/** The stand wedge: its (z, y) profile extruded along x, flat-shaded (centered on STAND x). */
export function wedgeGeometry(): BufferGeometry {
  const shape = new Shape();
  // Shape x = local z, shape y = local y; extruded along shape z, then turned so it runs along x.
  const [first, ...rest] = standProfile();
  shape.moveTo(first![0], first![1]);
  for (const [z, y] of rest) shape.lineTo(z, y);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, { depth: STAND.size[0], bevelEnabled: false });
  // A -90 degree turn about Y maps (sx, sy, sz) to (-sz, sy, sx): the profile lands in (z, y)
  // and the extrusion runs along -x, which the translation centers on x 0.
  geometry.rotateY(-Math.PI / 2);
  geometry.translate(STAND.size[0] / 2, 0, 0);
  return geometry;
}

/** The V flap: a thin triangle from the hinge (full width) to its apex, `depth` toward +z. */
export function flapGeometry(): BufferGeometry {
  const w = ENVELOPE.size[0] / 2;
  const shape = new Shape();
  shape.moveTo(-w, 0);
  shape.lineTo(w, 0);
  shape.lineTo(0, ENVELOPE.flap.depth);
  shape.closePath();
  const geometry = new ExtrudeGeometry(shape, {
    depth: ENVELOPE.flap.thickness,
    bevelEnabled: false,
  });
  // Shape y becomes +z (toward the envelope's front edge); the thickness rises from y 0.
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, ENVELOPE.flap.thickness, 0);
  return geometry;
}

/** Creased normals for a non-indexed geometry (see Warm Start's copy). */
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
