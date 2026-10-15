// Greybox lighting plan (WP-08 only; WP-11 replaces it with the full EXPERIENCE §6.8 plan). One
// spotlight follows the visitor: it lights the current stop's target, or the next target ahead
// when the stop has none (the lobby and door stops). Targets are the slots and the desk. The
// mount follows EXPERIENCE §5.5: 0.6 m from the target toward its stop camera along the room's
// main axis (1.6 m out from the wall for the wall vitrine), just under the ceiling.
import type { StopId } from '../../content/ids';
import type { Layout, Room, StopPose, Vec3 } from '../rail/layout';

/** Horizontal distance from a plinth target to its spotlight mount. */
export const SPOT_OFFSET = 0.6;
/** Distance from the wall to the wall vitrine's spotlight mount. */
export const WALL_SPOT_OFFSET = 1.6;
/** Mount height: 0.3 m under the ceiling, never above 4.6 m (EXPERIENCE §5.5). */
export const SPOT_CEILING_GAP = 0.3;
export const SPOT_MAX_Y = 4.6;
/**
 * Greybox hemisphere light: light-0 from above, ink from below. EXPERIENCE §7.5 asks for 0.15
 * (sky #1A1C22) because the finished hall is lit by baked pools, wall washes and the Lightformer
 * environment; the greybox has none of them yet, so this fill keeps it readable until WP-11
 * replaces the lighting.
 */
export const GREYBOX_HEMI_INTENSITY = 8;

export interface SpotPlan {
  /** The stop whose target is lit. */
  for: StopId;
  position: Vec3;
  target: Vec3;
}

const inside = (room: Room, x: number, z: number) =>
  x >= room.min[0] - 1e-6 &&
  x <= room.max[0] + 1e-6 &&
  z >= room.min[1] - 1e-6 &&
  z <= room.max[1] + 1e-6;

function hasTarget(layout: Layout, id: StopId): boolean {
  return id === 'desk' || layout.slots.some((s) => s.id === id);
}

function poseOf(layout: Layout, id: StopId): StopPose {
  for (const track of Object.values(layout.tracks)) {
    const pose = track.stops.find((s) => s.id === id);
    if (pose) return pose;
  }
  throw new Error(`No pose for stop '${id}'`);
}

/** The stop whose target the greybox spotlight lights while the visitor is at `here`. */
export function litStop(layout: Layout, here: StopId): StopId {
  if (hasTarget(layout, here)) return here;
  const main = layout.tracks.main.stops.map((s) => s.id);
  const start = main.indexOf(here);
  const ahead = main.slice(Math.max(0, start + 1)).find((id) => hasTarget(layout, id));
  return ahead ?? main.find((id) => hasTarget(layout, id)) ?? here;
}

export function spotPlan(layout: Layout, here: StopId): SpotPlan {
  const id = litStop(layout, here);
  const pose = poseOf(layout, id);
  const slot = layout.slots.find((s) => s.id === id);
  const target = pose.look;
  const room = layout.rooms.find((r) => inside(r, target[0], target[2]));
  const y = room ? Math.min(room.ceiling - SPOT_CEILING_GAP, SPOT_MAX_Y) : SPOT_MAX_Y;
  const dx = pose.camera[0] - target[0];
  const dz = pose.camera[2] - target[2];
  let x = target[0];
  let z = target[2];
  if (slot?.mount === 'wall') {
    x = slot.position[0] + Math.sign(dx) * WALL_SPOT_OFFSET;
  } else if (Math.abs(dz) >= Math.abs(dx)) {
    z += Math.sign(dz) * SPOT_OFFSET;
  } else {
    x += Math.sign(dx) * SPOT_OFFSET;
  }
  return { for: id, position: [x, y, z], target: [...target] };
}
