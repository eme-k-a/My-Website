// Wall-title placement (EXPERIENCE §5.4): the exhibit number and the organization label on the
// wall behind each slot, centered on the slot z. The wall comes from the room that holds the slot
// (main aisle walls at abs(x) 3.49, wing outer walls at abs(x) 11.49, the Foundations side walls
// for mun and certifications), so a layout change moves the titles with everything else.
import type { ThreeDFont } from '../../../content/selectors';
import type { Layout, Room, Slot, Vec3 } from '../../rail/layout';
import { BACKING_PANEL_SIZE } from './anatomy';
import { fontSizeForCap } from './fonts';

/** Titles sit this far off the wall surface. */
export const PLACARD_WALL_GAP = 0.01;
/** Organization labels: tracking 0.12em (troika letterSpacing is in em). */
export const ORGANIZATION_TRACKING = 0.12;

export interface PlacardLabel {
  text: string;
  font: ThreeDFont;
  capHeight: number;
  /** troika fontSize for that cap height. */
  fontSize: number;
  /** Baseline of the first line, in meters above the floor. */
  baselineY: number;
  letterSpacing: number;
  /** Wrap width at word boundaries; undefined means one line. */
  maxWidth?: number;
}

export interface PlacardSpec {
  /** On the wall surface plus the gap, at floor level; labels add their baseline y. */
  position: Vec3;
  /** Faces into the room (text +Z turned to the room). */
  rotationY: number;
  number: PlacardLabel;
  organization: PlacardLabel;
}

type PlacardKind = 'main' | 'wing' | 'wide' | 'wall';

/** EXPERIENCE §5.4 table: [number cap, number baseline, org cap, org baseline, org max width]. */
const TITLES: Record<PlacardKind, [number, number, number, number, number]> = {
  main: [0.32, 2.75, 0.1, 2.4, 3.6],
  wing: [0.3, 2.55, 0.14, 2.22, 3.2],
  wide: [0.32, 2.75, 0.14, 2.4, 2.4],
  wall: [0.32, 2.75, 0.1, 2.4, 3.6],
};

function placardKind(slot: Slot): PlacardKind {
  if (slot.mount === 'wall') return 'wall';
  if (slot.plinth === 'wide') return 'wide';
  return slot.track === 'main' ? 'main' : 'wing';
}

const inside = (room: Room, x: number, z: number) =>
  x >= room.min[0] - 1e-6 &&
  x <= room.max[0] + 1e-6 &&
  z >= room.min[1] - 1e-6 &&
  z <= room.max[1] + 1e-6;

/** The room that holds a slot (the first one in layout order). */
export function roomOfSlot(layout: Layout, slot: Slot): Room {
  const [x, , z] = slot.position;
  const room = layout.rooms.find((r) => inside(r, x, z));
  if (!room) throw new Error(`No room holds slot '${slot.id}'`);
  return room;
}

export function placardSpec(
  layout: Layout,
  slot: Slot,
  texts: { number: string; organization: string },
): PlacardSpec {
  const room = roomOfSlot(layout, slot);
  const right = slot.side === 'right' || (slot.side === 'center' && slot.position[0] >= 0);
  const kind = placardKind(slot);
  // Over the wall vitrine the organization baseline (2.40) meets the top edge of the walnut
  // backing panel (EXPERIENCE §5.3), so both labels stand in front of the panel's face.
  const gap = PLACARD_WALL_GAP + (kind === 'wall' ? BACKING_PANEL_SIZE[2] : 0);
  const x = right ? room.max[0] - gap : room.min[0] + gap;
  const [numberCap, numberY, orgCap, orgY, orgWidth] = TITLES[kind];
  return {
    position: [x, 0, slot.position[2]],
    rotationY: right ? -Math.PI / 2 : Math.PI / 2,
    number: {
      text: texts.number,
      font: 'serif',
      capHeight: numberCap,
      fontSize: fontSizeForCap('serif', numberCap),
      baselineY: numberY,
      letterSpacing: 0,
    },
    organization: {
      text: texts.organization,
      font: 'sans',
      capHeight: orgCap,
      fontSize: fontSizeForCap('sans', orgCap),
      baselineY: orgY,
      letterSpacing: ORGANIZATION_TRACKING,
      maxWidth: orgWidth,
    },
  };
}
