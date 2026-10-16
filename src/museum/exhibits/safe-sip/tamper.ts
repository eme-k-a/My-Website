// Tamper Evident's measurements, geometry and its one motion (EXPERIENCE §4.7), kept apart from
// the component so Node unit tests check them without WebGL. Local frame (EXPERIENCE §4): origin =
// plinth top center, +Y up, +Z toward the stop camera, +X the viewer's right. Meters, seconds.
//
// Hierarchy: the walnut base, the two brass posts and the Euler gizmo are static. The gimbal ring
// and its four pivot pins pitch about X at the gimbal center; the cup, the lid, the board and the
// tamper ring roll about Z inside it (a real one-ring gimbal: outer pins at +-X carry the ring on
// the posts, inner pins at +-Z carry the cup). Both angles come from one clock.
//
// The object frame below is the exhibit frame turned by OBJECT_YAW about Y: the whole object
// stands a third of a turn off square, so the camera sees the gimbal, both pin axes and the gizmo
// arcs in three-quarter view instead of edge-on, while the lid's cut-away wedge still faces it.
import {
  BufferGeometry,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  ShapeUtils,
  Vector2,
  Vector3,
} from 'three';

export type Vec3 = [number, number, number];
/** A point of a lathe profile: [radius, y]. */
export type ProfilePoint = [number, number];

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

/**
 * Turn of the whole object about Y in the exhibit frame (negative: its front turns to the
 * viewer's left, its +X side comes forward on the right).
 */
export const OBJECT_YAW = -30 * DEG;

/** Walnut base disc, its bottom on the slot floor (y 0.025), top at y 0.055. */
export const BASE = { radius: 0.2, height: 0.03, center: [0, 0.04, 0] as Vec3, segments: 64 };
export const BASE_TOP = BASE.center[1] + BASE.height / 2;

/** Gimbal center: the pivot of both rotations, on the ring's plane. */
export const PIVOT: Vec3 = [0, 0.16, 0];

/** Brass gimbal ring, horizontal, around the pivot. */
export const GIMBAL = { radius: 0.13, tube: 0.006, radialSegments: 8, tubularSegments: 64 };

/** Brass posts at +-X carrying the ring through the outer pins. */
export const POST = {
  x: 0.15,
  radius: 0.005,
  bottom: BASE_TOP,
  top: PIVOT[1] + 0.006,
  segments: 16,
} as const;

/** Frosted cup: Lathe, bottom at y 0.10, top (rim) at y 0.36; wall 4 mm, floor 6 mm. */
export const CUP = {
  height: 0.26,
  bottomRadius: 0.075,
  topRadius: 0.095,
  wall: 0.004,
  floor: 0.006,
  bottomY: 0.1,
  segments: 48,
} as const;

/** Cup outer radius at a height above the cup bottom. */
export function cupRadiusAt(h: number): number {
  return CUP.bottomRadius + ((CUP.topRadius - CUP.bottomRadius) * h) / CUP.height;
}

/** The cup's lathe profile, counterclockwise in (radius, y), y from the cup bottom. */
export function cupProfile(): ProfilePoint[] {
  const innerBottom = cupRadiusAt(CUP.floor) - CUP.wall;
  return [
    [0, 0],
    [CUP.bottomRadius, 0],
    [CUP.topRadius, CUP.height],
    [CUP.topRadius - CUP.wall, CUP.height],
    [innerBottom, CUP.floor],
    [0, CUP.floor],
  ];
}

/**
 * Lid: bone ceramic, radius 0.10, 0.03 tall, ten 3 mm print layers stepping in toward the top.
 * The first two layers are the full-circle floor the board rests on; the eight above form the
 * cover, a 270 degree Lathe whose 90 degree cut-away wedge faces the camera. The cover holds
 * a pocket (radius 0.072, from the floor up to a 6 mm top plate) where the board sits.
 */
export const LID = {
  radius: 0.1,
  height: 0.03,
  layer: 0.003,
  layers: 10,
  floorLayers: 2,
  /** How far the top layer steps in from the bottom one (quadratic shoulder). */
  shoulder: 0.01,
  pocketRadius: 0.072,
  topPlate: 0.006,
  /**
   * The cut-away wedge is 90 degrees wide, centered at lathe phi -OBJECT_YAW in the object frame,
   * which is exhibit +Z: straight at the stop camera.
   */
  cutCenter: -OBJECT_YAW,
  cutWidth: Math.PI / 2,
  floorSegments: 48,
  coverSegments: 36,
} as const;

/** Lid y (bottom) in the exhibit frame: it sits on the cup rim. */
export const LID_Y = CUP.bottomY + CUP.height;

/** The lathe phi range of the cover (and the tamper ring): everything but the wedge. */
export const COVER_PHI = {
  start: LID.cutCenter + LID.cutWidth / 2,
  length: TAU - LID.cutWidth,
} as const;

/** Radius of print layer i (0 = bottom). */
export function layerRadius(i: number): number {
  const top = LID.layers - 1;
  return LID.radius - LID.shoulder * (i / top) ** 2;
}

/** Stair-stepped outer wall from layer `from` up to the lid top, as profile points. */
function steps(from: number, to: number): ProfilePoint[] {
  const out: ProfilePoint[] = [];
  for (let i = from; i < to; i++) {
    const r = layerRadius(i);
    out.push([r, i * LID.layer], [r, (i + 1) * LID.layer]);
  }
  return out;
}

/** Floor: layers 0 and 1, full circle (counterclockwise in (radius, y), y from the lid bottom). */
export function lidFloorProfile(): ProfilePoint[] {
  const top = LID.floorLayers * LID.layer;
  return [[0, 0], ...steps(0, LID.floorLayers), [0, top]];
}

/** Cover: layers 2 to 9 with the pocket, an inverted L in section (counterclockwise). */
export function lidCoverProfile(): ProfilePoint[] {
  const floorTop = LID.floorLayers * LID.layer;
  const plateBottom = LID.height - LID.topPlate;
  return [
    [LID.pocketRadius, floorTop],
    ...steps(LID.floorLayers, LID.layers),
    [0, LID.height],
    [0, plateBottom],
    [LID.pocketRadius, plateBottom],
  ];
}

/**
 * Pico W board (graphite) on the lid floor, in the wedge, long axis across it. Board, pads and
 * chip are given in the wedge frame: the lid frame turned by LID.cutCenter about Y, so its +Z is
 * the wedge's center line.
 */
export const BOARD = {
  size: [0.06, 0.004, 0.024] as Vec3,
  center: [0, LID.floorLayers * LID.layer + 0.002, 0.045] as Vec3,
} as const;

/** Twenty brass castellated pads, ten along each long edge, wrapping the edge. */
export const PADS = {
  count: 20,
  perEdge: 10,
  size: [0.0032, 0.005, 0.0045] as Vec3,
  pitch: 0.006,
  /** Pad center offset from the board's center line (the edge is at 0.012). */
  edgeOffset: 0.0113,
} as const;

/** Orientation sensor chip on the board top (graphite). */
export const CHIP = {
  size: [0.008, 0.002, 0.008] as Vec3,
  center: [0.013, BOARD.center[1] + BOARD.size[1] / 2 + 0.001, BOARD.center[2]] as Vec3,
} as const;

/** Pad centers in the wedge frame. */
export function padCenters(): Vec3[] {
  const [cx, cy, cz] = BOARD.center;
  const out: Vec3[] = [];
  for (const side of [-1, 1]) {
    for (let k = 0; k < PADS.perEdge; k++) {
      const x = cx + (k - (PADS.perEdge - 1) / 2) * PADS.pitch;
      // Bottom on the lid floor, 1 mm proud of the board top.
      out.push([x, cy + 0.0005, cz + side * PADS.edgeOffset]);
    }
  }
  return out;
}

/** Tamper ring: accentGlow torus on the lid top, cut like the cover (lid frame). */
export const TAMPER_RING = {
  radius: 0.085,
  tube: 0.003,
  y: LID.height + 0.003,
  radialSegments: 6,
  tubularSegments: 36,
} as const;

/**
 * Pivot pins (brass), in the pitch frame: outer pins on X between the ring and the posts, inner
 * pins on Z between the ring and the cup wall. Each is [center, axis, length, radius].
 */
export function pinPlacements(): {
  center: Vec3;
  axis: 'x' | 'z';
  length: number;
  radius: number;
}[] {
  const outerFrom = GIMBAL.radius - GIMBAL.tube;
  const outerTo = POST.x + POST.radius + 0.001;
  const cupWall = cupRadiusAt(PIVOT[1] - CUP.bottomY) - 0.001;
  const innerTo = GIMBAL.radius - GIMBAL.tube / 2;
  const outer = { length: outerTo - outerFrom, radius: 0.004 };
  const inner = { length: innerTo - cupWall, radius: 0.003 };
  const oc = (outerFrom + outerTo) / 2;
  const ic = (cupWall + innerTo) / 2;
  return [
    { center: [oc, 0, 0], axis: 'x', ...outer },
    { center: [-oc, 0, 0], axis: 'x', ...outer },
    { center: [0, 0, ic], axis: 'z', ...inner },
    { center: [0, 0, -ic], axis: 'z', ...inner },
  ];
}

/**
 * Euler gizmo: three static brass quarter-torus arcs around the cup at y 0.24, one per axis, each
 * with a cone arrowhead at its end. Radius 0.20, not the spec's 0.16: at 0.16 the arcs would cut
 * through the rocking lid (0.15 to 0.18 m from this center) and graze the gimbal ring (0.153 m).
 */
export const GIZMO = {
  center: [0, 0.24, 0] as Vec3,
  radius: 0.2,
  tube: 0.003,
  radialSegments: 6,
  tubularSegments: 32,
  arc: Math.PI / 2,
  cone: { radius: 0.008, height: 0.022, segments: 12 },
} as const;

export type GizmoAxis = 'roll' | 'pitch' | 'yaw';
export const GIZMO_AXES: readonly GizmoAxis[] = ['roll', 'pitch', 'yaw'];

/**
 * Orientation of each arc, applied to a three.js TorusGeometry arc (its plane XY, from +X toward
 * +Y over `arc` radians), about the gizmo center, in the object frame:
 * - roll (about Z): in the XY plane on the +X side, from 20 degrees below the equator up to 70
 *   degrees above it;
 * - pitch (about X): in the YZ plane over the top, from 60 degrees above the front to 30 degrees
 *   past the top toward the back;
 * - yaw (about Y): in the XZ plane at the gizmo height, from 70 to 160 degrees (0 = +X, 90 = +Z),
 *   which after OBJECT_YAW runs from just left of the camera line round to the viewer's left.
 */
export function gizmoArcMatrix(axis: GizmoAxis): Matrix4 {
  const r = new Matrix4();
  switch (axis) {
    case 'roll':
      r.makeRotationZ(-20 * DEG);
      break;
    case 'pitch':
      r.makeRotationX(-60 * DEG).multiply(new Matrix4().makeRotationY(-90 * DEG));
      break;
    case 'yaw':
      r.makeRotationY(-70 * DEG).multiply(new Matrix4().makeRotationX(90 * DEG));
      break;
  }
  return new Matrix4().makeTranslation(...GIZMO.center).multiply(r);
}

/** The arrowhead at the arc's end (u = arc), pointing along the arc, base on the arc end. */
export function gizmoConeMatrix(axis: GizmoAxis): Matrix4 {
  const u = GIZMO.arc;
  const R = GIZMO.radius;
  const tangent = new Vector3(-Math.sin(u), Math.cos(u), 0);
  const at = new Vector3(Math.cos(u) * R, Math.sin(u) * R, 0).addScaledVector(
    tangent,
    GIZMO.cone.height / 2,
  );
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), tangent);
  return gizmoArcMatrix(axis).multiply(new Matrix4().compose(at, q, new Vector3(1, 1, 1)));
}

/** Points along an arc's center line (exhibit frame), for clearance checks. */
export function gizmoArcPoints(axis: GizmoAxis, n = 64): Vector3[] {
  const m = gizmoArcMatrix(axis);
  const out: Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const u = (GIZMO.arc * i) / n;
    out.push(
      new Vector3(Math.cos(u) * GIZMO.radius, Math.sin(u) * GIZMO.radius, 0).applyMatrix4(m),
    );
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Motion (one): the cup and lid rock in the gimbal, period 9 s. The ring's glow follows the roll.

export const PERIOD_S = 9;
export const ROLL_AMPLITUDE = 9 * DEG;
export const PITCH_AMPLITUDE = 6 * DEG;
export const THRESHOLD = 8 * DEG;

/** Tamper ring glow: below the threshold, at its peak, and in the still pose. */
export const GLOW = { rest: 0.2, peak: 1.6, pose: 1.2 } as const;

/** Seconds the glow takes to rise after the roll crosses the threshold (and to fall before). */
export const GLOW_RAMP_S = 0.6;

/** Reduced-motion, low-tier and ?test=1 pose: rolled 10 degrees, ring lit at 1.2. */
export const POSE = { roll: 10 * DEG, pitch: 0, glow: GLOW.pose } as const;

/** Seconds to ease between the still pose and the live rocking when motion starts or stops. */
export const BLEND_S = 1;

const OMEGA = TAU / PERIOD_S;

export function rollAt(t: number): number {
  return ROLL_AMPLITUDE * Math.sin(OMEGA * t);
}

export function pitchAt(t: number): number {
  return PITCH_AMPLITUDE * Math.sin(2 * OMEGA * t + Math.PI / 4);
}

function smoothstep(e0: number, e1: number, x: number): number {
  const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return k * k * (3 - 2 * k);
}

/**
 * The ring's emissive intensity at time t: GLOW.rest while |roll| <= 8 degrees; past it, a
 * smoothstep rise to GLOW.peak over GLOW_RAMP_S, held, then a fall that ends exactly as the roll
 * comes back under the threshold. Measured in phase (asin |sin|), so it is a pure function of the
 * same clock as the rocking, not a second motion.
 */
export function glowAt(t: number): number {
  const phase = Math.asin(Math.min(1, Math.abs(Math.sin(OMEGA * t))));
  const start = Math.asin(THRESHOLD / ROLL_AMPLITUDE);
  const k = smoothstep(start, start + GLOW_RAMP_S * OMEGA, phase);
  return GLOW.rest + (GLOW.peak - GLOW.rest) * k;
}

export interface Pose {
  roll: number;
  pitch: number;
  glow: number;
}

/**
 * What the object shows: the still pose at blend 0, the live rocking at time t at blend 1, eased
 * in between (smoothstep), so motion starting or stopping never snaps.
 */
export function poseAt(t: number, blend: number): Pose {
  const k = smoothstep(0, 1, blend);
  const mix = (a: number, b: number) => a + (b - a) * k;
  return {
    roll: mix(POSE.roll, rollAt(t)),
    pitch: mix(POSE.pitch, pitchAt(t)),
    glow: mix(POSE.glow, glowAt(t)),
  };
}

/** The blend after a frame: toward 1 while motion runs, toward 0 otherwise, over BLEND_S. */
export function stepBlend(blend: number, delta: number, motion: boolean): number {
  const step = Math.max(0, Math.min(delta, 0.1)) / BLEND_S;
  return motion ? Math.min(1, blend + step) : Math.max(0, blend - step);
}

// ---------------------------------------------------------------------------------------------
// Geometry: a lathe with hard edges (each profile edge gets its own flat-in-section normals, so
// the 3 mm print steps catch the light as crisp lines), optional caps on the cut faces, merged into
// one BufferGeometry per material so the lid is one draw call.

interface Mesh {
  positions: number[];
  normals: number[];
  indices: number[];
}

function emptyMesh(): Mesh {
  return { positions: [], normals: [], indices: [] };
}

const EPS = 1e-12;

/** Adds a triangle wound so its face normal agrees with its vertices' normals; skips slivers. */
function addTriangle(mesh: Mesh, a: number, b: number, c: number): void {
  const p = mesh.positions;
  const n = mesh.normals;
  const ax = p[3 * a]!;
  const ay = p[3 * a + 1]!;
  const az = p[3 * a + 2]!;
  const ux = p[3 * b]! - ax;
  const uy = p[3 * b + 1]! - ay;
  const uz = p[3 * b + 2]! - az;
  const vx = p[3 * c]! - ax;
  const vy = p[3 * c + 1]! - ay;
  const vz = p[3 * c + 2]! - az;
  const cx = uy * vz - uz * vy;
  const cy = uz * vx - ux * vz;
  const cz = ux * vy - uy * vx;
  if (cx * cx + cy * cy + cz * cz < EPS * EPS) return;
  const nx = n[3 * a]! + n[3 * b]! + n[3 * c]!;
  const ny = n[3 * a + 1]! + n[3 * b + 1]! + n[3 * c + 1]!;
  const nz = n[3 * a + 2]! + n[3 * b + 2]! + n[3 * c + 2]!;
  if (cx * nx + cy * ny + cz * nz >= 0) mesh.indices.push(a, b, c);
  else mesh.indices.push(a, c, b);
}

function addVertex(mesh: Mesh, p: Vec3, n: Vec3): number {
  mesh.positions.push(...p);
  mesh.normals.push(...n);
  return mesh.positions.length / 3 - 1;
}

/** LatheGeometry's convention: (r, y) at phi maps to (r sin phi, y, r cos phi). */
function onLathe(r: number, y: number, phi: number): Vec3 {
  return [r * Math.sin(phi), y, r * Math.cos(phi)];
}

export interface LatheOptions {
  segments: number;
  phiStart?: number;
  phiLength?: number;
  /** Close both cut faces with the profile polygon (only for phiLength < 2 pi). */
  caps?: boolean;
  /** Vertical offset of the whole part. */
  y?: number;
}

/**
 * Revolves a closed counterclockwise (radius, y) polygon. Edges lying on the axis are skipped
 * (they have no area), every other edge gets its own vertex rows with the edge's outward normal.
 */
export function hardLathe(
  profile: ProfilePoint[],
  options: LatheOptions,
  into = emptyMesh(),
): Mesh {
  const { segments, phiStart = 0, phiLength = TAU, caps = false, y: dy = 0 } = options;
  const count = profile.length;
  for (let e = 0; e < count; e++) {
    const [r0, y0] = profile[e]!;
    const [r1, y1] = profile[(e + 1) % count]!;
    if (r0 < 1e-9 && r1 < 1e-9) continue;
    const len = Math.hypot(r1 - r0, y1 - y0);
    if (len < 1e-9) continue;
    const nr = (y1 - y0) / len;
    const ny = -(r1 - r0) / len;
    const first = into.positions.length / 3;
    for (let j = 0; j <= segments; j++) {
      const phi = phiStart + (phiLength * j) / segments;
      const normal: Vec3 = [nr * Math.sin(phi), ny, nr * Math.cos(phi)];
      addVertex(into, onLathe(r0, y0 + dy, phi), normal);
      addVertex(into, onLathe(r1, y1 + dy, phi), normal);
    }
    for (let j = 0; j < segments; j++) {
      const a0 = first + 2 * j;
      const b0 = a0 + 1;
      const a1 = a0 + 2;
      const b1 = a0 + 3;
      addTriangle(into, a0, b1, b0);
      addTriangle(into, a0, a1, b1);
    }
  }
  if (caps && phiLength < TAU) {
    const contour = profile.map(([r, y]) => new Vector2(r, y));
    const faces = ShapeUtils.triangulateShape(contour, []);
    for (const [phi, sign] of [
      [phiStart, -1],
      [phiStart + phiLength, 1],
    ] as const) {
      // The cut face's normal points out of the solid, along -/+ d(position)/d(phi).
      const normal: Vec3 = [sign * Math.cos(phi), 0, -sign * Math.sin(phi)];
      const first = into.positions.length / 3;
      for (const [r, y] of profile) addVertex(into, onLathe(r, y + dy, phi), normal);
      for (const [a, b, c] of faces) addTriangle(into, first + a!, first + b!, first + c!);
    }
  }
  return into;
}

function toGeometry(mesh: Mesh): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(mesh.normals, 3));
  geometry.setIndex(mesh.indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** The cup (frosted glass): outer wall, rim, inner wall and floor, 48 segments. */
export function cupGeometry(): BufferGeometry {
  return toGeometry(hardLathe(cupProfile(), { segments: CUP.segments }));
}

/** The lid (ceramic): full floor plus the 270 degree cover with its cut faces closed. */
export function lidGeometry(): BufferGeometry {
  const mesh = hardLathe(lidFloorProfile(), { segments: LID.floorSegments });
  hardLathe(
    lidCoverProfile(),
    {
      segments: LID.coverSegments,
      phiStart: COVER_PHI.start,
      phiLength: COVER_PHI.length,
      caps: true,
    },
    mesh,
  );
  return toGeometry(mesh);
}

/**
 * Rotation that lays a TorusGeometry arc (plane XY, from +X toward +Y) flat on the lid top over
 * the cover's phi range: rotateX(pi/2) puts u at lathe phi = pi/2 - u, then a turn about Y by
 * `turn` shifts phi by `turn`.
 */
export function tamperRingTurn(): number {
  return COVER_PHI.start + COVER_PHI.length - Math.PI / 2;
}
