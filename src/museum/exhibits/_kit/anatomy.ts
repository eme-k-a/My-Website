// Exhibit anatomy (EXPERIENCE §5.2, §5.3, §5.6): the sizes of plinths, cases, the wall vitrine and
// the hit box, all in slot-local meters. Origin = plinth top center (wall: back-panel center on
// the wall surface), +Y up, +Z toward the stop camera (wall: out of the wall). World placement
// always starts from a layout slot, so nothing here is a world coordinate.
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import type { Slot, Vec3 } from '../../rail/layout';

export type SlotVariant = 'standard' | 'wide' | 'wall';

export interface LocalBox {
  center: Vec3;
  size: Vec3;
}

/** Plinth footprint and height: standard 0.9 x 1.0 x 0.9, wide (mun) 1.4 x 0.6 x 1.4. */
export const PLINTH_SIZE = {
  standard: [0.9, 1.0, 0.9],
  wide: [1.4, 0.6, 1.4],
} as const satisfies Record<'standard' | 'wide', Vec3>;

/** Glass case: a 0.85 m cube, a 1.3 m cube on the wide plinth, a 0.85 x 0.85 x 0.30 wall box. */
export const CASE_SIZE = {
  standard: [0.85, 0.85, 0.85],
  wide: [1.3, 1.3, 1.3],
  wall: [0.85, 0.85, 0.3],
} as const satisfies Record<SlotVariant, Vec3>;

/** The brass strip around a standard plinth base: 3 cm tall, standing 5 mm proud of the plinth. */
export const BASE_STRIP_HEIGHT = 0.03;
export const BASE_STRIP_PROUD = 0.005;

/** Brass case edges: 1 cm square, 12 per case. */
export const EDGE_THICKNESS = 0.01;
export const EDGES_PER_CASE = 12;

/** Certifications wall: the walnut backing panel and the vitrine's own back panel. */
export const BACKING_PANEL_SIZE = [2.4, 1.6, 0.02] as const satisfies Vec3;
export const VITRINE_BACK_SIZE = [0.8, 0.8, 0.01] as const satisfies Vec3;

export function slotVariant(slot: Pick<Slot, 'mount' | 'plinth'>): SlotVariant {
  if (slot.mount === 'wall') return 'wall';
  return slot.plinth === 'wide' ? 'wide' : 'standard';
}

/** Height of the plinth top above the slot position (0 for the wall vitrine). */
export function plinthTop(variant: SlotVariant): number {
  return variant === 'wall' ? 0 : PLINTH_SIZE[variant][1];
}

/** World position of the slot-local origin. */
export function slotOrigin(slot: Slot): Vec3 {
  const [x, y, z] = slot.position;
  return [x, y + plinthTop(slotVariant(slot)), z];
}

/** The slot frame as a matrix: translate to the origin, rotate by `rotationY`. */
export function slotMatrix(slot: Slot): Matrix4 {
  const [x, y, z] = slotOrigin(slot);
  return new Matrix4().compose(
    new Vector3(x, y, z),
    new Quaternion().setFromEuler(new Euler(0, slot.rotationY, 0)),
    new Vector3(1, 1, 1),
  );
}

/** Local z where the backing panel, the vitrine back and the glass start (wall stack). */
const WALL_BACKING_Z = 0;
const WALL_VITRINE_BACK_Z = WALL_BACKING_Z + BACKING_PANEL_SIZE[2];
const WALL_GLASS_Z = WALL_VITRINE_BACK_Z + VITRINE_BACK_SIZE[2];

/** The glass case in slot-local space. */
export function caseBox(variant: SlotVariant): LocalBox {
  const size = CASE_SIZE[variant];
  if (variant === 'wall') {
    return { center: [0, 0, WALL_GLASS_Z + size[2] / 2], size: [...size] };
  }
  return { center: [0, size[1] / 2, 0], size: [...size] };
}

/** The plinth in slot-local space (its top is the origin). */
export function plinthBox(variant: 'standard' | 'wide'): LocalBox {
  const size = PLINTH_SIZE[variant];
  return { center: [0, -size[1] / 2, 0], size: [...size] };
}

/** The brass base strip of a standard plinth. */
export function baseStripBox(): LocalBox {
  const [w, h, d] = PLINTH_SIZE.standard;
  const out = 2 * BASE_STRIP_PROUD;
  return {
    center: [0, -h + BASE_STRIP_HEIGHT / 2, 0],
    size: [w + out, BASE_STRIP_HEIGHT, d + out],
  };
}

/** The walnut panels of the wall vitrine: the large backing panel and the vitrine back. */
export function wallPanelBoxes(): LocalBox[] {
  return [
    {
      center: [0, 0, WALL_BACKING_Z + BACKING_PANEL_SIZE[2] / 2],
      size: [...BACKING_PANEL_SIZE],
    },
    {
      center: [0, 0, WALL_VITRINE_BACK_Z + VITRINE_BACK_SIZE[2] / 2],
      size: [...VITRINE_BACK_SIZE],
    },
  ];
}

/** The 12 brass edges of a box, each as a thin box along one edge. */
export function edgeBoxes(box: LocalBox, thickness = EDGE_THICKNESS): LocalBox[] {
  const [cx, cy, cz] = box.center;
  const [w, h, d] = box.size;
  const t = thickness;
  const out: LocalBox[] = [];
  for (const sy of [-1, 1]) {
    for (const sz of [-1, 1]) {
      out.push({ center: [cx, cy + (sy * h) / 2, cz + (sz * d) / 2], size: [w + t, t, t] });
    }
  }
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      out.push({ center: [cx + (sx * w) / 2, cy, cz + (sz * d) / 2], size: [t, h + t, t] });
    }
  }
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      out.push({ center: [cx + (sx * w) / 2, cy + (sy * h) / 2, cz], size: [t, t, d + t] });
    }
  }
  return out;
}

/** The invisible hit box covering plinth and case (standard 0.9 x 1.85 x 0.9). */
export function hitBox(variant: SlotVariant): LocalBox {
  if (variant === 'wall') return caseBox('wall');
  const plinth = PLINTH_SIZE[variant];
  const glass = CASE_SIZE[variant];
  const bottom = -plinth[1];
  const top = glass[1];
  return {
    center: [0, (bottom + top) / 2, 0],
    size: [Math.max(plinth[0], glass[0]), top - bottom, Math.max(plinth[2], glass[2])],
  };
}

/** A unit-box instance matrix for `box` inside the frame `frame`. */
export function boxMatrix(frame: Matrix4, box: LocalBox): Matrix4 {
  const local = new Matrix4().compose(
    new Vector3(...box.center),
    new Quaternion(),
    new Vector3(...box.size),
  );
  return new Matrix4().multiplyMatrices(frame, local);
}
