// The Climb's measurements and its one motion (EXPERIENCE §4.5), kept apart from the component so
// Node unit tests check them without WebGL. Local frame (EXPERIENCE §4): origin = plinth top
// center, +Y up, +Z toward the stop camera, +X the viewer's right. Meters, seconds.

export type Vec3 = [number, number, number];

/** Base tray: walnut RoundedBox, its bottom on the slot floor (y 0.025). */
export const TRAY = {
  size: [0.6, 0.03, 0.42] as Vec3,
  radius: 0.008,
  center: [0, 0.04, 0] as Vec3,
  smoothness: 3,
  bevelSegments: 2,
} as const;

/** Top face of the tray: the posts and the crate stand on it. */
export const TRAY_TOP = TRAY.center[1] + TRAY.size[1] / 2;

/** The five bone ceramic steps (RoundedBox), climbing to the back right. */
export const TILE = {
  size: [0.11, 0.03, 0.11] as Vec3,
  radius: 0.01,
  count: 5,
  smoothness: 2,
  bevelSegments: 1,
} as const;

/**
 * Tile `i` (0 to 4): its center. EXPERIENCE §4.5 gives y = 0.06 + 0.075 i, which sinks tile 0 a
 * centimeter into the tray; the staircase is raised 2.5 cm (approved 2026-10-24, pending the R0
 * spec update) so every tile, tile 0 included, stands on a visible post.
 */
export const TILE_LIFT = 0.025;

export function tileCenter(i: number): Vec3 {
  return [-0.22 + 0.11 * i, 0.06 + TILE_LIFT + 0.075 * i, 0.1 - 0.05 * i];
}

export function tileTop(i: number): number {
  return tileCenter(i)[1] + TILE.size[1] / 2;
}

export function tileBottom(i: number): number {
  return tileCenter(i)[1] - TILE.size[1] / 2;
}

/** Brass posts from the tray top up to each tile's underside. */
export const POST = { radius: 0.004, segments: 8 } as const;

/** The post under tile `i`, centered under the tile, from the tray top to its underside. */
export function postFor(i: number): { center: Vec3; height: number } {
  const height = tileBottom(i) - TRAY_TOP;
  const [x, , z] = tileCenter(i);
  return { center: [x, TRAY_TOP + height / 2, z], height };
}

/** A check mark lying on each tile top: two accentGlow bars with a square section. */
export const CHECK = {
  short: 0.035,
  long: 0.06,
  /** EXPERIENCE §4.5 says 0.008; 0.012 so the flat check reads from the stop camera (approved
   *  2026-10-24, pending the R0 spec update). */
  section: 0.012,
  /** The check's vertex, from the tile center: near the front edge, so the beads fit behind it. */
  vertex: { x: -0.009, z: 0.042 },
} as const;

const SQRT1_2 = Math.SQRT1_2;

/**
 * The two bars of tile `i`'s check, laid flat on its top. Each bar is a box `length x section x
 * section` along its local +X, yawed by `rotationY` (a yaw of θ turns +X to (cos θ, 0, -sin θ)).
 * Seen from the camera (+Z toward the viewer), the short stroke comes down from the upper left to
 * the vertex and the long stroke rises from it to the upper right. Each bar is pushed half a
 * section past the vertex, so the two meet in a closed corner.
 */
export function checkBars(i: number): { position: Vec3; rotationY: number; length: number }[] {
  const [cx, , cz] = tileCenter(i);
  const y = tileTop(i) + CHECK.section / 2;
  const vx = cx + CHECK.vertex.x;
  const vz = cz + CHECK.vertex.z;
  const tuck = CHECK.section / 2;
  // Short stroke: direction (1, 0, 1) / sqrt 2 toward the vertex; long: (1, 0, -1) / sqrt 2 away.
  const s = CHECK.short / 2 - tuck;
  const l = CHECK.long / 2 - tuck;
  return [
    {
      position: [vx - s * SQRT1_2, y, vz - s * SQRT1_2],
      rotationY: -Math.PI / 4,
      length: CHECK.short,
    },
    {
      position: [vx + l * SQRT1_2, y, vz - l * SQRT1_2],
      rotationY: Math.PI / 4,
      length: CHECK.long,
    },
  ];
}

/** The team: three static brass beads in a row along the back of the top tile, touching. */
export const BEAD = { radius: 0.018, widthSegments: 16, heightSegments: 12 } as const;

export function beadCenters(): Vec3[] {
  const top = TILE.count - 1;
  const [cx, , cz] = tileCenter(top);
  const z = cz - TILE.size[2] / 2 + BEAD.radius + 0.002;
  const y = tileTop(top) + BEAD.radius;
  const d = 2 * BEAD.radius;
  return [-d, 0, d].map((dx) => [cx + dx, y, z] as Vec3);
}

/** The build crate: a blank walnut cube on the tray, front right. */
export const CRATE = { size: 0.09, center: [0.22, 0.1, 0.15] as Vec3 } as const;

/** Brass strips along the crate's four vertical corner edges, slightly proud of the faces. */
export const STRIP = { width: 0.01, inset: 0.002 } as const;

export function stripCenters(): Vec3[] {
  const [x, y, z] = CRATE.center;
  const o = CRATE.size / 2 - STRIP.width / 2 + STRIP.inset;
  return [
    [x - o, y, z - o],
    [x + o, y, z - o],
    [x - o, y, z + o],
    [x + o, y, z + o],
  ];
}

/** Glow levels of the checks (EXPERIENCE §4.5): rest 0.1, lit 1.4. */
export const GLOW = { rest: 0.1, lit: 1.4 } as const;

/**
 * The climb, one 10 s cycle: tile i lights over 0.5 s from 0.1 + 1.6 i (the last lands at 7.0),
 * all five hold lit for 2 s, then reset together over 1 s (9.0 to 10.0).
 */
export const CLIMB = {
  periodS: 10,
  firstS: 0.1,
  stepS: 1.6,
  rampS: 0.5,
  holdS: 2,
  resetS: 1,
} as const;
export const ALL_LIT_S = CLIMB.firstS + (TILE.count - 1) * CLIMB.stepS + CLIMB.rampS;
export const RESET_START_S = ALL_LIT_S + CLIMB.holdS;

/**
 * The exhibit clock starts inside the hold, so clock 0 (the ?test=1 freeze and the reduced-motion
 * pin) is the all-lit pose, and an idle stop or a resume never needs a jump.
 */
export const CLOCK_OFFSET_S = ALL_LIT_S;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function easeInOutCubic(u: number): number {
  const t = clamp01(u);
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Seconds into the cycle at exhibit clock `t`. */
export function cyclePhase(t: number): number {
  const c = (t > 0 ? t : 0) + CLOCK_OFFSET_S;
  return c - Math.floor(c / CLIMB.periodS) * CLIMB.periodS;
}

/** How lit tile `i`'s check is at cycle phase `p` (0 = rest, 1 = lit). */
export function litAt(p: number, i: number): number {
  if (p >= RESET_START_S) return 1 - easeInOutCubic((p - RESET_START_S) / CLIMB.resetS);
  return easeInOutCubic((p - (CLIMB.firstS + i * CLIMB.stepS)) / CLIMB.rampS);
}

/** Tile `i`'s check emissive intensity at clock `t`; reduced motion pins clock 0 (all lit). */
export function glowAt(t: number, i: number, reducedMotion = false): number {
  const k = litAt(cyclePhase(reducedMotion ? 0 : t), i);
  return GLOW.rest + (GLOW.lit - GLOW.rest) * k;
}

/** Sets a check's own material instance to `level`; returns true when it changed. */
export function setGlow(material: { emissiveIntensity: number }, level: number): boolean {
  if (material.emissiveIntensity === level) return false;
  material.emissiveIntensity = level;
  return true;
}
