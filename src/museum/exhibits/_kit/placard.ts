// Wall-title placement (EXPERIENCE §5.4, revised by F-022 and F-027): the exhibit number and the
// organization label on the wall behind each slot. The wall comes from the room that holds the
// slot (main aisle walls at abs(x) 3.49, wing outer walls at abs(x) 11.49, the Foundations side
// walls for mun and certifications), so a layout change moves the titles with everything else.
//
// - Along the wall: main-aisle, wing and mun titles sit where the stop camera's line of sight
//   through the slot center meets the wall, so from the stop the title reads right above its case
//   (D2) instead of beside it, where it ran off the top of the frame and under the HUD (F-022;
//   mun F-041b, where it sat 19 to 32 degrees off the view axis). The center is clamped so the
//   widest line keeps TITLE_END_MARGIN to the ends of its wall. The certifications vitrine keeps
//   its slot z (its title hangs over the vitrine on the same wall).
// - Up the wall: the organization is broken into lines here (explicit '\n', so the line count is
//   known) and stacks upward from its last baseline (`orgBottom`), which sits just above the
//   case's top edge as seen from the stop; the number sits `gap` above the first line. A wrapped
//   name therefore grows upward and never drops behind the case (F-027).
// The wall wash behind each title (environment/lightPools.ts) is centered on `titleAlong`.
import type { StopId } from '../../../content/ids';
import { content } from '../../../content/index';
import { entryById, exhibitNumber, wallLabelOf, type ThreeDFont } from '../../../content/selectors';
import type { Layout, Room, Slot, StopPose, Vec3 } from '../../rail/layout';
import { BACKING_PANEL_SIZE } from './anatomy';
import {
  breakLines,
  fontSizeForCap,
  ORGANIZATION_LINE_HEIGHT,
  ORGANIZATION_TRACKING,
  sansLineWidth,
  SERIF_NUMBER_ADVANCE,
  TITLE_END_MARGIN,
  TITLE_METRICS,
  type PlacardKind,
} from './titleMetrics';

export {
  breakLines,
  ORGANIZATION_LINE_HEIGHT,
  ORGANIZATION_TRACKING,
  SANS_CAPS_ADVANCE,
  sansLineWidth,
  SERIF_NUMBER_ADVANCE,
  TITLE_END_MARGIN,
} from './titleMetrics';

/** Titles sit this far off the wall surface. */
export const PLACARD_WALL_GAP = 0.01;
export interface PlacardLabel {
  /** The text; organization labels carry their line breaks as '\n'. */
  text: string;
  font: ThreeDFont;
  capHeight: number;
  /** troika fontSize for that cap height. */
  fontSize: number;
  /** Baseline of the first line, in meters above the floor. */
  baselineY: number;
  letterSpacing: number;
  /** Wrap width at word boundaries; undefined means the text's own lines. */
  maxWidth?: number;
  /** troika lineHeight in em (multi-line labels); undefined is troika's 'normal'. */
  lineHeight?: number;
  /** Number of lines (1 unless the text carries '\n'). */
  lines?: number;
}

export interface PlacardSpec {
  /** On the wall surface plus the gap, at floor level; labels add their baseline y. */
  position: Vec3;
  /** Estimated width of the widest line (number or organization), meters. */
  width: number;
  /** Faces into the room (text +Z turned to the room). */
  rotationY: number;
  number: PlacardLabel;
  organization: PlacardLabel;
}

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

function stopPose(layout: Layout, id: StopId): StopPose | undefined {
  for (const track of Object.values(layout.tracks)) {
    const pose = track.stops.find((s) => s.id === id);
    if (pose) return pose;
  }
  return undefined;
}

/**
 * The title's center along its wall (world z; every slot wall runs along z): where the stop
 * camera's horizontal line of sight through the slot center meets the wall, clamped so a title
 * `halfWidth` wide keeps TITLE_END_MARGIN to both ends of the wall. The vitrine, and any slot
 * without a stop, keep the slot z.
 */
export function titleAlong(layout: Layout, slot: Slot, wallX: number, halfWidth: number): number {
  const kind = placardKind(slot);
  const z = slot.position[2];
  if (kind === 'wall') return z;
  const pose = stopPose(layout, slot.id);
  if (!pose) return z;
  const [cx, , cz] = pose.camera;
  const dx = slot.position[0] - cx;
  if (Math.abs(dx) < 1e-6) return z;
  const sight = cz + ((z - cz) * (wallX - cx)) / dx;
  const room = roomOfSlot(layout, slot);
  const lo = room.min[1] + TITLE_END_MARGIN + halfWidth;
  const hi = room.max[1] - TITLE_END_MARGIN - halfWidth;
  if (lo > hi) return (room.min[1] + room.max[1]) / 2;
  return Math.min(hi, Math.max(lo, sight));
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
  const t = TITLE_METRICS[kind];
  const orgSize = fontSizeForCap('sans', t.orgCap);
  const lines = breakLines(texts.organization, orgSize, ORGANIZATION_TRACKING, t.orgWidth);
  const lineStep = ORGANIZATION_LINE_HEIGHT * orgSize;
  const orgFirst = t.orgBottom + (lines.length - 1) * lineStep;
  const numberSize = fontSizeForCap('serif', t.numberCap);
  const halfWidth =
    Math.max(
      ...lines.map((l) => sansLineWidth(l, orgSize, ORGANIZATION_TRACKING)),
      texts.number.length * numberSize * SERIF_NUMBER_ADVANCE,
    ) / 2;
  const along = titleAlong(layout, slot, x, halfWidth);
  return {
    position: [x, 0, along],
    width: 2 * halfWidth,
    rotationY: right ? -Math.PI / 2 : Math.PI / 2,
    number: {
      text: texts.number,
      font: 'serif',
      capHeight: t.numberCap,
      fontSize: numberSize,
      baselineY: orgFirst + t.orgCap + t.gap,
      letterSpacing: 0,
    },
    organization: {
      text: lines.join('\n'),
      font: 'sans',
      capHeight: t.orgCap,
      fontSize: orgSize,
      baselineY: orgFirst,
      letterSpacing: ORGANIZATION_TRACKING,
      lineHeight: ORGANIZATION_LINE_HEIGHT,
      lines: lines.length,
    },
  };
}

/** The placard of a slot with its texts from the content (what Placard.tsx draws). */
export function slotPlacard(layout: Layout, slot: Slot): PlacardSpec {
  return placardSpec(layout, slot, {
    number: exhibitNumber(content, slot.id),
    organization: wallLabelOf(entryById(content, slot.id)).toUpperCase(),
  });
}
