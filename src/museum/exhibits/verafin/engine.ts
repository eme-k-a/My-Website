// The Reporting Engine's measurements and its one motion (EXPERIENCE §4.1), kept apart from the
// component so Node unit tests check them without WebGL. Local frame (EXPERIENCE §4): origin =
// plinth top center, +Y up, +Z toward the stop camera, +X the viewer's right. Meters, seconds.
import { Matrix4, type InstancedMesh } from 'three';
import { rng } from '../_kit/noise';

export type Vec3 = [number, number, number];

/** Base tray: walnut RoundedBox, its bottom on the slot floor (y 0.025). */
export const TRAY = {
  size: [0.6, 0.03, 0.44] as Vec3,
  radius: 0.008,
  center: [0, 0.04, 0] as Vec3,
  /** RoundedBox tessellation: the 8 mm radius needs little at 3 m (556 triangles). */
  smoothness: 3,
  bevelSegments: 2,
} as const;

/** Top face of the tray: the column, conduit and bars all stand on it. */
export const TRAY_TOP = TRAY.center[1] + TRAY.size[1] / 2;

/** Column axis on the tray (x, z), back left of the grid. */
export const AXIS = { x: -0.19, z: -0.1 } as const;

/** Frosted glass column, y 0.055 to 0.515. */
export const COLUMN = { radius: 0.07, height: 0.46, segments: 48 } as const;
export const COLUMN_CENTER_Y = TRAY_TOP + COLUMN.height / 2;

/** The glowing core on the column axis, centered in the column; its emissive level is static. */
export const CORE = { radius: 0.012, height: 0.42, segments: 16, glow: 0.35 } as const;

/** Brass dock collar around the column; its inner edge rests on the glass (0.078 - 0.008). */
export const COLLAR = { y: 0.3, radius: 0.078, tube: 0.008, tubeSegments: 8, ringSegments: 48 };

/** Brass plugin cartridges: radial x tall x thick, docked through the collar. */
export const CARTRIDGE = {
  size: [0.07, 0.1, 0.018] as Vec3,
  radius: 0.004,
  /** 0 degrees = local +X, 90 degrees = local +Z (toward the camera). */
  azimuthsDeg: [90, 210, 330] as const,
  /** Radial span from the column axis: the glass surface out to 0.14. */
  inner: 0.07,
  y: 0.3,
  smoothness: 2,
  bevelSegments: 1,
} as const;

/** Brass conduit strip lying on the tray (length along its run x height x width). */
export const CONDUIT = { size: [0.24, 0.006, 0.03] as Vec3 } as const;

/** The report grid: 6 x 6 ceramic bars on a 0.048 pitch, one InstancedMesh. */
export const GRID = {
  n: 6,
  bar: 0.038,
  pitch: 0.048,
  center: { x: 0.12, z: 0.06 },
  minHeight: 0.02,
  maxHeight: 0.18,
} as const;
export const BAR_COUNT = GRID.n * GRID.n;

/** The report refresh: every 8 s, a 1.6 s ease per column, columns 40 ms apart left to right. */
export const REFRESH = { periodS: 8, easeS: 1.6, staggerS: 0.04 } as const;
/** From the first column starting to the last column landing. */
export const SWEEP_S = REFRESH.easeS + (GRID.n - 1) * REFRESH.staggerS;

/** Seed of the report sets; set k uses its own stream, so set 0 never changes. */
export const REPORT_SEED = 0x7e9a01;

const DEG = Math.PI / 180;
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function easeInOutCubic(u: number): number {
  const t = clamp01(u);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** A cartridge's center and yaw: its long (radial) edge points away from the column axis. */
export function cartridgePlacement(azimuthDeg: number): { position: Vec3; rotationY: number } {
  const a = azimuthDeg * DEG;
  const mid = CARTRIDGE.inner + CARTRIDGE.size[0] / 2;
  return {
    position: [AXIS.x + mid * Math.cos(a), CARTRIDGE.y, AXIS.z + mid * Math.sin(a)],
    // A yaw of -a turns local +X to (cos a, 0, sin a).
    rotationY: -a,
  };
}

/** Bar `index` (row-major, rows along z from the back, columns along x from the left). */
export function barCell(index: number): { col: number; row: number; x: number; z: number } {
  const col = index % GRID.n;
  const row = Math.floor(index / GRID.n);
  const offset = (k: number) => (k - (GRID.n - 1) / 2) * GRID.pitch;
  return { col, row, x: GRID.center.x + offset(col), z: GRID.center.z + offset(row) };
}

/** The grid's footprint on the tray. */
export function gridFootprint(): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const half = ((GRID.n - 1) / 2) * GRID.pitch + GRID.bar / 2;
  return {
    minX: GRID.center.x - half,
    maxX: GRID.center.x + half,
    minZ: GRID.center.z - half,
    maxZ: GRID.center.z + half,
  };
}

/**
 * The conduit runs from the column axis toward the grid center. Its far corner touches the left
 * face of the grid's first bar column; its near end starts inside the column base, so through the
 * frosted glass it reads as leaving the column and feeding the grid.
 */
export function conduitPlacement(): {
  position: Vec3;
  rotationY: number;
  start: [number, number];
  end: [number, number];
} {
  const dx = GRID.center.x - AXIS.x;
  const dz = GRID.center.z - AXIS.z;
  const length = Math.hypot(dx, dz);
  const ux = dx / length;
  const uz = dz / length;
  const halfWidth = CONDUIT.size[2] / 2;
  // The end corner nearest the grid sits at end + halfWidth * (uz, -ux); put its x on the grid edge.
  const edgeX = gridFootprint().minX;
  const endS = (edgeX - halfWidth * uz - AXIS.x) / ux;
  const startS = endS - CONDUIT.size[0];
  const midS = (startS + endS) / 2;
  return {
    position: [AXIS.x + midS * ux, TRAY_TOP + CONDUIT.size[1] / 2, AXIS.z + midS * uz],
    rotationY: -Math.atan2(uz, ux),
    start: [AXIS.x + startS * ux, AXIS.z + startS * uz],
    end: [AXIS.x + endS * ux, AXIS.z + endS * uz],
  };
}

/**
 * Report set `set`: 36 bar heights in [minHeight, maxHeight], all from rng(seed). A seeded level,
 * a left-right trend and a rise toward the back row (so the back rows show over the front ones
 * from the stop camera) plus per-bar variation: a stepped block, never one lone bar that stands
 * out from the rest.
 */
export function barHeights(set: number): Float32Array {
  const next = rng((REPORT_SEED ^ Math.imul(set + 1, 0x9e3779b1)) >>> 0);
  const level = 0.3 + 0.25 * next();
  const trendX = (next() - 0.5) * 0.7;
  const rise = 0.25 + 0.2 * next();
  const out = new Float32Array(BAR_COUNT);
  const span = GRID.maxHeight - GRID.minHeight;
  for (let i = 0; i < BAR_COUNT; i++) {
    const { col, row } = barCell(i);
    const across = col / (GRID.n - 1) - 0.5;
    const back = 0.5 - row / (GRID.n - 1);
    const value = level + trendX * across + rise * back + (next() - 0.5) * 0.3;
    out[i] = GRID.minHeight + span * clamp01(value);
  }
  return out;
}

export interface RefreshPhase {
  /** The set shown once this cycle's sweep lands (cycle index). */
  set: number;
  /** Seconds since this cycle began. */
  elapsed: number;
  /** True while the bars move from set - 1 to set. */
  easing: boolean;
}

/** Where clock `t` falls in the refresh cycle. Set 0 holds for the first 8 s (and at t = 0). */
export function refreshPhase(t: number): RefreshPhase {
  const clock = t > 0 ? t : 0;
  const set = Math.floor(clock / REFRESH.periodS);
  const elapsed = clock - set * REFRESH.periodS;
  return { set, elapsed, easing: set > 0 && elapsed < SWEEP_S };
}

/** Ease progress (0 to 1) of bar column `col` at `elapsed` seconds into a sweep. */
export function columnProgress(elapsed: number, col: number): number {
  return easeInOutCubic((elapsed - col * REFRESH.staggerS) / REFRESH.easeS);
}

/** The 36 heights at clock `t` (the reduced-motion and ?test=1 pose is `t = 0`, set 0). */
export function heightsAt(t: number, out: Float32Array = new Float32Array(BAR_COUNT)) {
  const phase = refreshPhase(t);
  const to = barHeights(phase.set);
  if (!phase.easing) {
    out.set(to);
    return out;
  }
  const from = barHeights(phase.set - 1);
  for (let i = 0; i < BAR_COUNT; i++) {
    const k = columnProgress(phase.elapsed, i % GRID.n);
    out[i] = from[i]! + (to[i]! - from[i]!) * k;
  }
  return out;
}

export interface RefreshDriver {
  /** Writes the bars for clock `t`; returns true when the instance matrices changed. */
  apply(mesh: InstancedMesh, t: number, reducedMotion: boolean): boolean;
  /** Sizes the mesh's bounding sphere for the tallest possible bars (frustum culling). */
  prepare(mesh: InstancedMesh): void;
}

/**
 * Drives the grid from the exhibit clock. Outside a sweep nothing is written (the held set is
 * remembered), so a settled, idle scene has nothing to render. Reduced motion pins set 0.
 */
export function createRefreshDriver(): RefreshDriver {
  const heights = new Float32Array(BAR_COUNT);
  const matrix = new Matrix4();
  const sets = new Map<number, Float32Array>();
  let held = -1;
  let lastT = Number.NaN;

  const setHeights = (set: number) => {
    let found = sets.get(set);
    if (!found) {
      if (sets.size >= 3) sets.clear();
      found = barHeights(set);
      sets.set(set, found);
    }
    return found;
  };

  const write = (mesh: InstancedMesh, values: ArrayLike<number>) => {
    for (let i = 0; i < BAR_COUNT; i++) {
      const h = values[i]!;
      const { x, z } = barCell(i);
      matrix.makeScale(1, h, 1).setPosition(x, TRAY_TOP + h / 2, z);
      mesh.setMatrixAt(i, matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  return {
    prepare(mesh) {
      write(mesh, new Float32Array(BAR_COUNT).fill(GRID.maxHeight));
      mesh.computeBoundingSphere();
      held = -1;
      lastT = Number.NaN;
    },
    apply(mesh, t, reducedMotion) {
      const phase = refreshPhase(reducedMotion ? 0 : t);
      if (!phase.easing) {
        if (held === phase.set) return false;
        held = phase.set;
        lastT = Number.NaN;
        write(mesh, setHeights(phase.set));
        return true;
      }
      if (t === lastT) return false;
      held = -1;
      lastT = t;
      const from = setHeights(phase.set - 1);
      const to = setHeights(phase.set);
      for (let i = 0; i < BAR_COUNT; i++) {
        const k = columnProgress(phase.elapsed, i % GRID.n);
        heights[i] = from[i]! + (to[i]! - from[i]!) * k;
      }
      write(mesh, heights);
      return true;
    },
  };
}
