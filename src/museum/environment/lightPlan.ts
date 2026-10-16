// The lighting plan (EXPERIENCE §5.5, §6.8, §6.9, §7.5; ARCHITECTURE §8.1; ART_DIRECTION §4).
// Pure, so the unit tests pin it:
// - `lightPlan(tier)`: what each tier gets, fixed at boot (3 real spotlights on high, 1 on medium
//   and low; beam cones off on low; the reflector floor only on high). Only DPR adapts at runtime.
// - Light targets: the portrait (lobby), every slot and the desk, each with its spotlight mount,
//   the point it aims at, its baked pool center and its temperature color from the age ramp.
// - `assignLights(trackStops, stopIndex, tier)`: light 1 takes the current stop's target (or the
//   next one ahead), on high lights 2 and 3 take the next two targets ahead.
// - `matchLights(current, wanted)`: which physical light goes where, so a light that already
//   holds a wanted target stays put and only the others move (and fade up from 0).
import { doorId, WING_IDS, type ExhibitId, type StopId } from '../../content/ids';
import { tokens } from '../../design/tokens';
import { slotOrigin, slotVariant } from '../exhibits/_kit/anatomy';
import type { QualityTier } from '../exhibits/_kit/types';
import {
  ARCH_Z,
  LOBBY_CEILING,
  type Layout,
  type Room,
  type Slot,
  type Vec3,
} from '../rail/layout';

const light = tokens.light;

/** A light target: an exhibit slot, the lobby portrait or the front desk. */
export type TargetId = ExhibitId | 'portrait' | 'desk';

export interface SpotSpec {
  angle: number;
  penumbra: number;
  decay: number;
  /** Candela at full level (tokens.light.spotIntensity). */
  intensity: number;
}

export interface LightPlan {
  tier: QualityTier;
  hemisphere: { sky: string; ground: string; intensity: number };
  /** One entry per real spotlight; the count never changes after boot. */
  spots: SpotSpec[];
  /** Additive beam cones from each mount to its target (off on low). */
  beams: boolean;
  /** drei MeshReflectorMaterial floor (high) or the env-mapped library `floor` (medium, low). */
  floor: 'reflector' | 'standard';
  fog: { color: string; density: number };
}

/** EXPERIENCE §7.5 tier table. */
export function lightPlan(tier: QualityTier): LightPlan {
  const spot: SpotSpec = {
    angle: light.spotAngle,
    penumbra: light.spotPenumbra,
    decay: light.spotDecay,
    intensity: light.spotIntensity,
  };
  return {
    tier,
    hemisphere: { sky: light.hemiSky, ground: light.hemiGround, intensity: light.hemiIntensity },
    spots: Array.from({ length: tier === 'high' ? 3 : 1 }, () => ({ ...spot })),
    beams: tier !== 'low',
    floor: tier === 'high' ? 'reflector' : 'standard',
    fog: { color: tokens.color.ink, density: light.fogDensity },
  };
}

// ---------------------------------------------------------------------------------------------
// The age ramp (EXPERIENCE §6.9)

const hexToRgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (rgb: readonly number[]) =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/**
 * The light ramp `light-0` (t = 0, newest) to `light-3` (t = 1, oldest) with stops at 0, 1/3,
 * 2/3 and 1, interpolated linearly per RGB component. Returns `#RRGGBB`.
 */
export function rampColor(t: number): string {
  const ramp = light.ramp;
  const k = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(k));
  const f = k - i;
  const a = hexToRgb(ramp[i]!);
  const b = hexToRgb(ramp[i + 1]!);
  return rgbToHex(a.map((v, c) => v + (b[c]! - v) * f));
}

/**
 * A target's temperature: exhibits by `layout.ageT` (wings use their door's t, Foundations 1),
 * the portrait like the lobby (`light-0`), the desk `light-1`.
 */
export function targetColor(layout: Layout, target: TargetId): string {
  if (target === 'portrait') return rampColor(layout.ageT.lobby ?? 0);
  if (target === 'desk') return rampColor(layout.ageT.desk ?? 1 / 3);
  return rampColor(layout.ageT[target] ?? 0);
}

// ---------------------------------------------------------------------------------------------
// Targets, mounts and aim points

/** Lobby portrait (EXPERIENCE §2.3): 0.8 x 1.0 m, center (3.4, 1.7, -3.95), facing +Z. */
export const PORTRAIT_CENTER: Vec3 = [3.4, 1.7, ARCH_Z + 0.05];
export const PORTRAIT_SIZE = [0.8, 1.0] as const;
/** Portrait spotlight (EXPERIENCE §5.5): (2.6, 5.4, -2.6), i.e. up and out from the frame. */
export const PORTRAIT_MOUNT: Vec3 = [PORTRAIT_CENTER[0] - 0.8, LOBBY_CEILING - 0.6, ARCH_Z + 1.4];

/** Desk top height above the floor (the low walnut desk, Desk.tsx). */
export const DESK_TOP_Y = 0.765;
/** Horizontal distance from a plinth or the desk to its spotlight mount. */
export const SPOT_OFFSET = 0.6;
/** Distance from the wall to the wall vitrine's spotlight mount. */
export const WALL_SPOT_OFFSET = 1.6;
/** Mount height: 0.3 m under the ceiling, never above 4.6 m (EXPERIENCE §5.5). */
export const SPOT_CEILING_GAP = 0.3;
export const SPOT_MAX_Y = 4.6;
/** The baked floor pool sits this far from the plinth toward the aisle center (EXPERIENCE §7.5). */
export const POOL_SHIFT = 0.3;
/** Width of the wall-wash bay behind each target (one 2 m wall panel). */
export const WASH_BAY_WIDTH = 2;

const EPS = 1e-6;
const inside = (room: Room, x: number, z: number) =>
  x >= room.min[0] - EPS &&
  x <= room.max[0] + EPS &&
  z >= room.min[1] - EPS &&
  z <= room.max[1] + EPS;

/** The room that holds a floor point (the first one in layout order). */
export function roomAt(layout: Layout, x: number, z: number): Room | undefined {
  return layout.rooms.find((r) => inside(r, x, z));
}

/** Where a target's wall-wash bay hangs: the wall line, its axis and the room side it faces. */
export interface WashBay {
  /** 'x': the wall runs along x at z = `at`; 'z': along z at x = `at`. */
  axis: 'x' | 'z';
  at: number;
  /** Bay center along the wall. */
  center: number;
  /** Unit normal of the wall face, pointing into the room, in the horizontal plane. */
  normal: [number, number];
  /** Room ceiling: the bay runs from the floor to it. */
  height: number;
}

export interface LightTarget {
  id: TargetId;
  /** The stop whose arrival lights it. */
  stop: StopId;
  /** Spotlight mount (EXPERIENCE §5.5). */
  mount: Vec3;
  /** What the spotlight and the beam cone aim at: the slot center, the desk top, the portrait. */
  aim: Vec3;
  /** Temperature color (`#RRGGBB`). */
  color: string;
  /** Floor pool center [x, z]. */
  pool: [number, number];
  wash: WashBay;
}

function slotAim(layout: Layout, slot: Slot): Vec3 {
  const pose = Object.values(layout.tracks)
    .flatMap((t) => t.stops)
    .find((s) => s.id === slot.id);
  if (pose) return [...pose.look];
  const [x, y, z] = slotOrigin(slot);
  return [x, y + 0.35, z];
}

function slotMount(layout: Layout, slot: Slot, aim: Vec3): Vec3 {
  const room = roomAt(layout, slot.position[0], slot.position[2]);
  const y = room ? Math.min(room.ceiling - SPOT_CEILING_GAP, SPOT_MAX_Y) : SPOT_MAX_Y;
  if (slotVariant(slot) === 'wall') {
    // Out from the wall, toward the room (local +Z of the slot).
    return [
      slot.position[0] + Math.sin(slot.rotationY) * WALL_SPOT_OFFSET,
      y,
      slot.position[2] + Math.cos(slot.rotationY) * WALL_SPOT_OFFSET,
    ];
  }
  if (slot.track === 'main') return [aim[0], y, aim[2] + SPOT_OFFSET];
  // Wing plinths: toward the door side of the wing, at the plinth z.
  const toAisle = -Math.sign(slot.position[0]);
  return [slot.position[0] + toAisle * SPOT_OFFSET, y, aim[2]];
}

/** The wall behind a target, seen from its stop: the nearest wall in the direction it faces away from. */
function washBehind(room: Room, x: number, z: number, away: [number, number]): WashBay {
  const [ax, az] = away;
  if (Math.abs(ax) >= Math.abs(az)) {
    const at = ax > 0 ? room.max[0] : room.min[0];
    return {
      axis: 'z',
      at,
      center: z,
      normal: [ax > 0 ? -1 : 1, 0],
      height: room.ceiling,
    };
  }
  const at = az > 0 ? room.max[1] : room.min[1];
  return { axis: 'x', at, center: x, normal: [0, az > 0 ? -1 : 1], height: room.ceiling };
}

/**
 * The pool sits POOL_SHIFT from the plinth toward the aisle center (EXPERIENCE §7.5): across the
 * aisle for the main-aisle plinths, toward the stop camera for the wing plinths, mun and the wall
 * vitrine (their rooms have no single aisle line).
 */
function poolCenter(slot: Slot, room: Room, facing: [number, number]): [number, number] {
  const [x, , z] = slot.position;
  if (room.id === 'aisle' && slot.mount === 'plinth') return [x - Math.sign(x) * POOL_SHIFT, z];
  return [x + facing[0] * POOL_SHIFT, z + facing[1] * POOL_SHIFT];
}

function roomOrThrow(layout: Layout, x: number, z: number, what: string): Room {
  const room = roomAt(layout, x, z);
  if (!room) throw new Error(`No room holds the ${what}`);
  return room;
}

/** Every light target in main-track order, then the wing items (portrait first, desk last on main). */
export function lightTargets(layout: Layout): LightTarget[] {
  const targets: LightTarget[] = [];
  const lobby = roomOrThrow(layout, PORTRAIT_CENTER[0], PORTRAIT_CENTER[2], 'portrait');
  targets.push({
    id: 'portrait',
    stop: 'lobby',
    mount: [...PORTRAIT_MOUNT],
    aim: [...PORTRAIT_CENTER],
    color: targetColor(layout, 'portrait'),
    pool: [PORTRAIT_CENTER[0], PORTRAIT_CENTER[2] + POOL_SHIFT],
    wash: { ...washBehind(lobby, PORTRAIT_CENTER[0], PORTRAIT_CENTER[2], [0, -1]) },
  });
  for (const slot of layout.slots) {
    const aim = slotAim(layout, slot);
    const room = roomOrThrow(layout, slot.position[0], slot.position[2], `slot '${slot.id}'`);
    const facing: [number, number] = [Math.sin(slot.rotationY), Math.cos(slot.rotationY)];
    // A wall vitrine washes its own wall; a plinth the side wall its wall titles hang on
    // (placard.ts): the aisle wall on its side, a wing's outer wall, the Foundations side wall.
    const away: [number, number] =
      slotVariant(slot) === 'wall'
        ? [-facing[0], -facing[1]]
        : [Math.sign(slot.position[0]) || -1, 0];
    targets.push({
      id: slot.id,
      stop: slot.id,
      mount: slotMount(layout, slot, aim),
      aim,
      color: targetColor(layout, slot.id),
      pool: poolCenter(slot, room, facing),
      wash: washBehind(room, slot.position[0], slot.position[2], away),
    });
  }
  const desk = layout.tracks.main.stops.find((s) => s.id === 'desk');
  if (desk) {
    const [x, , z] = desk.look;
    const room = roomOrThrow(layout, x, z, 'desk');
    targets.push({
      id: 'desk',
      stop: 'desk',
      mount: [x, Math.min(room.ceiling - SPOT_CEILING_GAP, SPOT_MAX_Y), z + SPOT_OFFSET],
      aim: [x, DESK_TOP_Y, z],
      color: targetColor(layout, 'desk'),
      pool: [x, z + POOL_SHIFT],
      wash: washBehind(room, x, z, [0, -1]),
    });
  }
  return targets;
}

// ---------------------------------------------------------------------------------------------
// Assignment (EXPERIENCE §6.8)

const DOORS = new Set<string>(WING_IDS.map(doorId));

/** The light target a stop owns: the lobby lights the portrait; doors own none. */
export function targetOfStop(id: StopId): TargetId | null {
  if (id === 'lobby') return 'portrait';
  if (DOORS.has(id)) return null;
  return id as TargetId;
}

/**
 * Light targets for the visitor at `trackStops[stopIndex]`: light 1 takes the stop's own target,
 * or the next target ahead on the track when the stop has none; on high, lights 2 and 3 take the
 * next two targets ahead. A light with nothing left ahead gets null (it stays dark). The array has
 * one entry per real spotlight of the tier.
 */
export function assignLights(
  trackStops: readonly StopId[],
  stopIndex: number,
  tier: QualityTier,
): (TargetId | null)[] {
  const count = lightPlan(tier).spots.length;
  const start = Math.min(Math.max(0, stopIndex), Math.max(0, trackStops.length - 1));
  const ahead: TargetId[] = [];
  for (let i = start; i < trackStops.length && ahead.length < count; i++) {
    const target = targetOfStop(trackStops[i]!);
    if (target && !ahead.includes(target)) ahead.push(target);
  }
  return Array.from({ length: count }, (_, i) => ahead[i] ?? null);
}

/**
 * Maps wanted targets onto physical lights. A light that already holds one of the wanted targets
 * keeps it; the remaining wanted targets go, in order, to the remaining lights. Returns the new
 * target per light (same length as `current`).
 */
export function matchLights(
  current: readonly (TargetId | null)[],
  wanted: readonly (TargetId | null)[],
): (TargetId | null)[] {
  const next: (TargetId | null)[] = current.map((t) => (t && wanted.includes(t) ? t : null));
  const kept = new Set(next.filter((t): t is TargetId => t !== null));
  const free = next.map((t, i) => (t === null ? i : -1)).filter((i) => i >= 0);
  for (const target of wanted) {
    if (!target || kept.has(target)) continue;
    const slot = free.shift();
    if (slot === undefined) break;
    next[slot] = target;
    kept.add(target);
  }
  return next;
}

// ---------------------------------------------------------------------------------------------
// Light levels (ART_DIRECTION §4): fade-in after a reassignment, hover lift, dialog dimming

/** What a real spotlight is doing right now: `level` fades 0 to 1, `scale` is the lift or dim. */
export interface SpotState {
  target: TargetId | null;
  level: number;
  scale: number;
}

/** While a story is open, every other real spot dims to this fraction (ART_DIRECTION §4). */
export const DIALOG_DIM = 0.3;
/** Seconds the dialog dimming takes. */
export const DIALOG_DIM_S = 0.4;

/**
 * The scale a spot heads for: 30% for every spot but the open exhibit's while a story is open,
 * 1.35x on the visitor's own target while it is hovered, otherwise 1.
 */
export function spotScaleGoal(
  target: TargetId | null,
  view: { current: TargetId | null; hovered: TargetId | null; openId: TargetId | null },
): number {
  if (!target) return 1;
  if (view.openId) return target === view.openId ? 1 : DIALOG_DIM;
  if (view.hovered === target && view.current === target) return tokens.motion.hoverLift;
  return 1;
}

/**
 * Moves `value` toward `goal` at the constant rate that covers `span` in `duration` seconds. A
 * duration of 0 (reduced motion, ?test=1) jumps straight to the goal.
 */
export function approach(
  value: number,
  goal: number,
  dt: number,
  duration: number,
  span: number,
): number {
  if (duration <= 0) return goal;
  const step = (Math.abs(span) * Math.max(0, dt)) / duration;
  if (Math.abs(goal - value) <= step) return goal;
  return value + Math.sign(goal - value) * step;
}

/** The candela a spot emits: the tier intensity times its fade level and its scale. */
export function spotIntensity(spec: SpotSpec, state: SpotState): number {
  return state.target ? spec.intensity * state.level * state.scale : 0;
}

// ---------------------------------------------------------------------------------------------
// Beam cones (EXPERIENCE §5.5): one additive cone per target, from its mount to its aim point

export interface BeamSpec {
  id: TargetId;
  /** The cone's apex (the mount) and the center of its open base (the aim point). */
  apex: Vec3;
  base: Vec3;
  /** Base radius: the spot's bright core (angle times 1 - penumbra) at the aim distance. */
  radius: number;
  color: string;
}

/** The beam cone of every light target, in lightTargets order. */
export function beamSpecs(layout: Layout): BeamSpec[] {
  const core = light.spotAngle * (1 - light.spotPenumbra);
  return lightTargets(layout).map((t) => {
    const length = Math.hypot(t.aim[0] - t.mount[0], t.aim[1] - t.mount[1], t.aim[2] - t.mount[2]);
    return {
      id: t.id,
      apex: [...t.mount],
      base: [...t.aim],
      radius: length * Math.tan(core),
      color: t.color,
    };
  });
}
