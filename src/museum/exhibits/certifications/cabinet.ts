// The Medal Cabinet's measurements and its one motion (EXPERIENCE §4.10), kept apart from the
// component so Node unit tests check them without WebGL. Local frame (the wall vitrine slot of
// EXPERIENCE §5.3): origin = center of the vitrine's back panel, +Z out of the wall toward the
// visitor, +Y up, +X the viewer's right; the slot is x and y in [-0.325, 0.325], z in
// [0.05, 0.25]. Medallion parts are given in the medallion's own frame: origin at its center,
// face toward +Z. Meters, seconds.
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';

export type Vec3 = [number, number, number];

/** Hanging rail: brass rod, 0.60 long, horizontal at y 0.24, z 0.08. */
export const RAIL = { radius: 0.004, length: 0.6, y: 0.24, z: 0.08 } as const;

/** Two brass standoffs carry the rail from the slot's back face (z 0.05) to the rail axis. */
export const STANDOFF = { radius: 0.006, x: 0.27, back: 0.05 } as const;

/** Medallions: brass discs on straps under the rail, centers at x -0.21, 0, 0.21 and y 0.075. */
export const MEDALLION = {
  radius: 0.095,
  thickness: 0.012,
  segments: 48,
  xs: [-0.21, 0, 0.21] as const,
  y: 0.075,
  z: RAIL.z,
} as const;
const FACE = MEDALLION.thickness / 2;

/** The raised rim on the face. */
export const RIM = { radius: 0.088, tube: 0.004, tubeSegments: 8, ringSegments: 48 } as const;

/** Strap from the rail down to the medallion's top edge (0.012 x 0.07 x 0.002). */
export const STRAP = { size: [0.012, 0.07, 0.002] as Vec3 } as const;

/** Emblem relief height on the face. */
export const RELIEF = 0.004;

/** The one motion: each medallion turns +-12 degrees about its vertical axis; period 12 s. */
export const SWING = { amplitudeDeg: 12, periodS: 12, rampS: 3 } as const;

const DEG = Math.PI / 180;

/** Kinds of primitive, one InstancedMesh each. */
export type Primitive = 'disc' | 'rim' | 'box' | 'round' | 'boss' | 'facet' | 'slab';

/** A primitive's geometry: three's cylinder (axis +Y), torus or unit box arguments. */
export type PrimitiveGeometry =
  | {
      type: 'cylinder';
      args: [
        top: number,
        bottom: number,
        height: number,
        segments: number,
        heightSegments: number,
        open: boolean,
        thetaStart: number,
      ];
    }
  | {
      type: 'torus';
      args: [radius: number, tube: number, tubeSegments: number, ringSegments: number];
    }
  | { type: 'box' };

/**
 * The emblem primitives are bevelled (frustums and pyramids), not flat-topped: a flat brass face
 * square to the camera mirrors the dark room behind the visitor, while a sloped flank catches the
 * spotlight above, so the relief reads as a bright outline on the darker disc face.
 */
const SLAB_CORNER = Math.SQRT1_2;
export const PRIMITIVES: Record<Primitive, PrimitiveGeometry> = {
  disc: {
    type: 'cylinder',
    args: [
      MEDALLION.radius,
      MEDALLION.radius,
      MEDALLION.thickness,
      MEDALLION.segments,
      1,
      false,
      0,
    ],
  },
  rim: { type: 'torus', args: [RIM.radius, RIM.tube, RIM.tubeSegments, RIM.ringSegments] },
  box: { type: 'box' },
  /** Plain unit cylinder: the rail and standoffs. */
  round: { type: 'cylinder', args: [1, 1, 1, 24, 1, false, 0] },
  /** Low cylinder with a bevelled edge: cloud lobes, turbine blades and hub. */
  boss: { type: 'cylinder', args: [0.62, 1, 1, 24, 1, false, 0] },
  /** Four-sided pyramid with its tips on the axes: a faceted diamond. */
  facet: { type: 'cylinder', args: [0, 1, 1, 4, 1, false, 0] },
  /** Square frustum with its corners at 45 degrees: the cloud's base bar. */
  slab: { type: 'cylinder', args: [0.8, 1, 1, 4, 1, false, Math.PI / 4] },
};

/** Primitives whose geometry axis is +Y and that ./cabinet turns to face +Z. */
const TURNED = new Set<Primitive>(['disc', 'round', 'boss', 'facet', 'slab']);

/**
 * A part: a unit primitive turned so its axis points along +Z (the cylinder kinds, whose geometry
 * axis is +Y), scaled by `size` (x, y, z after that turn), rotated by `roll` about +Z, placed at
 * `center`. For the round kinds, x and y scale the unit radius; z is the full depth.
 */
export interface Part {
  kind: Primitive;
  center: Vec3;
  size: Vec3;
  roll?: number;
  /** Round only: lay its axis along +X instead (size = length, then the y and z radii). */
  alongX?: boolean;
}

/** Relief part on the face: `depth` along +Z, standing on the disc face. */
const relief = (kind: Primitive, x: number, y: number, w: number, h: number, depth = RELIEF) =>
  ({ kind, center: [x, y, FACE + depth / 2], size: [w, h, depth] }) satisfies Part;

/**
 * Emblem 1, AWS Certified Cloud Practitioner (not the AWS logo): a cloud of three overlapping low
 * cylinders (radii 0.024, 0.032, 0.022) on a flat base bar. Depths differ by 0.2 mm so the
 * overlaps never z-fight.
 */
export function cloudEmblem(): Part[] {
  const bar = { halfWidth: 0.054, halfHeight: 0.008 };
  return [
    relief('boss', -0.03, -0.008, 0.024, 0.024, 0.0038),
    relief('boss', 0.0, 0.01, 0.032, 0.032, 0.0042),
    relief('boss', 0.032, -0.01, 0.022, 0.022, 0.004),
    relief(
      'slab',
      0.001,
      -0.026,
      bar.halfWidth / SLAB_CORNER,
      bar.halfHeight / SLAB_CORNER,
      0.0036,
    ),
  ];
}

/** Emblem 2, Tech Stewardship Practice Program: a compass rose of four thin faceted diamonds. */
export function compassEmblem(): Part[] {
  const half = 0.036;
  return [0, 90, 180, 270].map((deg) => {
    const a = deg * DEG;
    const part = relief('facet', -Math.sin(a) * half, Math.cos(a) * half, 0.011, half);
    return { ...part, roll: a };
  });
}

/** Emblem 3, Tech Stewardship for the Energy Transition: a three-blade turbine on a hub. */
export function turbineEmblem(): Part[] {
  const blade = { halfWidth: 0.011, halfLength: 0.032, at: 0.042 };
  const blades = [0, 120, 240].map((deg) => {
    const a = deg * DEG;
    const part = relief(
      'boss',
      -Math.sin(a) * blade.at,
      Math.cos(a) * blade.at,
      blade.halfWidth,
      blade.halfLength,
      0.0038,
    );
    return { ...part, roll: a };
  });
  return [...blades, relief('boss', 0, 0, 0.014, 0.014, 0.0045)];
}

export const EMBLEMS = [cloudEmblem, compassEmblem, turbineEmblem] as const;

/** Everything one medallion carries, in its own frame: disc, rim, strap and its emblem. */
export function medallionParts(index: number): Part[] {
  const r = MEDALLION.radius;
  return [
    { kind: 'disc', center: [0, 0, 0], size: [1, 1, 1] },
    { kind: 'rim', center: [0, 0, FACE], size: [1, 1, 1] },
    { kind: 'box', center: [0, r + STRAP.size[1] / 2, 0], size: [...STRAP.size] },
    ...EMBLEMS[index]!(),
  ];
}

/** The static rail and standoffs, in the slot frame. */
export function railParts(): Part[] {
  const standoffLength = RAIL.z - STANDOFF.back;
  const standoffs = [-1, 1].map((sx): Part => ({
    kind: 'round',
    center: [sx * STANDOFF.x, RAIL.y, STANDOFF.back + standoffLength / 2],
    size: [STANDOFF.radius, STANDOFF.radius, standoffLength],
  }));
  return [
    {
      kind: 'round',
      center: [0, RAIL.y, RAIL.z],
      size: [RAIL.length, RAIL.radius, RAIL.radius],
      alongX: true,
    },
    ...standoffs,
  ];
}

const smoothstep = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));

/**
 * Medallion `index`'s yaw at clock `t` (radians): +-12 degrees, each a third of the period after
 * the one to its left. Each swing starts from rest at its own offset and its amplitude eases in
 * over 3 s, so t = 0 (?test=1) is the reduced-motion pose: all three face front.
 */
export function medallionYaw(index: number, t: number, reducedMotion: boolean): number {
  if (reducedMotion || !(t > 0)) return 0;
  const local = t - (index * SWING.periodS) / 3;
  if (local <= 0) return 0;
  const envelope = smoothstep(local / SWING.rampS);
  return envelope * SWING.amplitudeDeg * DEG * Math.sin((2 * Math.PI * local) / SWING.periodS);
}

const toZ = new Quaternion().setFromEuler(new Euler(Math.PI / 2, 0, 0));
const toX = new Quaternion().setFromEuler(new Euler(0, 0, -Math.PI / 2));
const rollQ = new Quaternion();
const yawQ = new Quaternion();
const q = new Quaternion();
const position = new Vector3();
const scale = new Vector3();
const local = new Matrix4();
const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_Z = new Vector3(0, 0, 1);

/** The unit primitive's matrix for `part` (in the frame the part is given in). */
export function partMatrix(part: Part, out = new Matrix4()): Matrix4 {
  rollQ.setFromAxisAngle(AXIS_Z, part.roll ?? 0);
  // Axis +Y primitives are first turned to +Z; scale then applies in that turned frame.
  const turned = TURNED.has(part.kind);
  if (part.alongX) {
    // The turn maps the primitive's y onto x and its x onto -y.
    q.copy(toX);
    scale.set(part.size[1], part.size[0], part.size[2]);
  } else if (turned) {
    // S applies after the turn: x, y in the face, z the depth. As compose(T, Q, S) applies S
    // first, swap the y and z scale (the turn maps the primitive's y onto z).
    q.multiplyQuaternions(rollQ, toZ);
    scale.set(part.size[0], part.size[2], part.size[1]);
  } else {
    q.copy(rollQ);
    scale.set(...part.size);
  }
  return out.compose(position.set(...part.center), q, scale);
}

/** Medallion `index`'s frame in the slot at yaw `yaw`. */
export function medallionMatrix(index: number, yaw: number, out = new Matrix4()): Matrix4 {
  yawQ.setFromAxisAngle(AXIS_Y, yaw);
  return out.compose(
    position.set(MEDALLION.xs[index]!, MEDALLION.y, MEDALLION.z),
    yawQ,
    scale.set(1, 1, 1),
  );
}

/** A part's final matrix in the slot frame: medallion frame times the part's own. */
export function placedMatrix(frame: Matrix4 | null, part: Part, out = new Matrix4()): Matrix4 {
  partMatrix(part, local);
  return frame ? out.multiplyMatrices(frame, local) : out.copy(local);
}

/** One instance: the part and the medallion that carries it (null for the static rail). */
export interface Placed {
  medallion: number | null;
  part: Part;
}

/** Every instance of the cabinet, grouped by primitive. */
export function cabinetInstances(): Record<Primitive, Placed[]> {
  const out = Object.fromEntries(
    (Object.keys(PRIMITIVES) as Primitive[]).map((kind) => [kind, [] as Placed[]]),
  ) as Record<Primitive, Placed[]>;
  for (const part of railParts()) out[part.kind].push({ medallion: null, part });
  MEDALLION.xs.forEach((_, i) => {
    for (const part of medallionParts(i)) out[part.kind].push({ medallion: i, part });
  });
  return out;
}

/** The three yaws at clock `t`. */
export function yawsAt(t: number, reducedMotion: boolean): [number, number, number] {
  return [0, 1, 2].map((i) => medallionYaw(i, t, reducedMotion)) as [number, number, number];
}

/** Writes every instance matrix for the given yaws. */
export function writeCabinet(
  instances: Record<Primitive, Placed[]>,
  meshes: Partial<
    Record<
      Primitive,
      { setMatrixAt(i: number, m: Matrix4): void; instanceMatrix: { needsUpdate: boolean } }
    >
  >,
  yaws: readonly number[],
): void {
  const frames = yaws.map((yaw, i) => medallionMatrix(i, yaw));
  const m = new Matrix4();
  for (const kind of Object.keys(instances) as Primitive[]) {
    const mesh = meshes[kind];
    if (!mesh) continue;
    instances[kind].forEach(({ medallion, part }, i) => {
      mesh.setMatrixAt(i, placedMatrix(medallion === null ? null : frames[medallion]!, part, m));
    });
    mesh.instanceMatrix.needsUpdate = true;
  }
}
