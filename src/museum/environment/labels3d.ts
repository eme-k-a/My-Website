// Every 3D string the environment draws (EXPERIENCE §5.4, §6.9, §11.1) and where each one hangs.
// Each duplicates DOM text: the lobby h1 and title, the door cards, the Foundations section, the
// desk card headline and the year marks on the rail. `npm run check:glyphs` imports this module
// in Node and checks every exported `{ text, font }` in its .woff (so no three.js imports here).
// Strings come from the content where the content has them; the label specs are EXPERIENCE §5.4.
import { doorId, type StopId } from '../../content/ids';
import { content } from '../../content/index';
import type { ThreeDFont } from '../../content/selectors';
import { ARCH_Z, type Layout, type Vec3 } from '../rail/layout';

export interface EnvironmentLabel {
  kind: 'sign' | 'room' | 'year';
  text: string;
  font: ThreeDFont;
  /** The fixture or door it belongs to. */
  for: string;
  /** Cap height in meters (EXPERIENCE §5.4: R3 may raise these, never lower them). */
  capHeight: number;
  /** Baseline above the floor (signs) in meters; 0 for the flat year numerals. */
  baselineY: number;
  /** troika letterSpacing in em. */
  tracking: number;
}

/** "COMMIT HISTORY" above the lobby arch: Instrument Serif, cap 0.28 m, baseline 4.1. */
export const COMMIT_HISTORY: EnvironmentLabel = {
  kind: 'sign',
  text: content.gallery.title.toUpperCase(),
  font: 'serif',
  for: 'lobby',
  capHeight: 0.28,
  baselineY: 4.1,
  tracking: 0,
};

/** Room names above each door, aisle side: Plex Sans 500, cap 0.14 m, baseline 3.05, 0.12em. */
export const ROOM_NAMES: readonly EnvironmentLabel[] = content.wings.map((wing) => ({
  kind: 'room',
  text: wing.title.toUpperCase(),
  font: 'sans',
  for: doorId(wing.id),
  capHeight: 0.14,
  baselineY: 3.05,
  tracking: 0.12,
}));

/** "FOUNDATIONS" on the header beam at the aisle end: Plex Sans 500, cap 0.22 m, baseline 4.3. */
export const FOUNDATIONS_SIGN: EnvironmentLabel = {
  kind: 'sign',
  text: 'FOUNDATIONS',
  font: 'sans',
  for: 'foundations',
  capHeight: 0.22,
  baselineY: 4.3,
  tracking: 0.12,
};

/** The end wall (the desk card headline): Instrument Serif, cap 0.20 m, baseline 2.6. */
export const END_WALL: EnvironmentLabel = {
  kind: 'sign',
  text: content.gallery.desk.headline,
  font: 'serif',
  for: 'desk',
  capHeight: 0.2,
  baselineY: 2.6,
  tracking: 0,
};

/** Year numerals lie flat beside each strip: Plex Sans 500, cap 0.22 m, tracking 0.2em. */
export const YEAR_NUMERAL = { font: 'sans', capHeight: 0.22, tracking: 0.2 } as const;

/** Every glyph a year numeral can use (the years themselves are in threeDStrings). */
export const YEAR_DIGITS = { text: '0123456789', font: 'sans', for: 'year-strip' } as const;

/** A year numeral for `year`. */
export function yearLabel(year: number): EnvironmentLabel {
  return {
    kind: 'year',
    text: String(year),
    font: YEAR_NUMERAL.font,
    for: 'year-strip',
    capHeight: YEAR_NUMERAL.capHeight,
    baselineY: 0,
    tracking: YEAR_NUMERAL.tracking,
  };
}

// ---------------------------------------------------------------------------------------------
// Placement

/** Signs stand this far in front of their wall or beam face. */
export const SIGN_WALL_GAP = 0.02;
/** Year numerals lie this far from their strip, toward the far end (EXPERIENCE §6.9). */
export const YEAR_NUMERAL_DZ = 0.45;
/** Height of the year strips and numerals above the floor (flush, without z-fighting). */
export const FLOOR_INLAY_Y = 0.002;

export interface LabelPlacement {
  label: EnvironmentLabel;
  /** Group origin: on the wall face plus the gap, at floor level (the label adds its baseline). */
  position: Vec3;
  /** Euler XYZ; signs face into the room, numerals lie flat reading toward -z. */
  rotation: Vec3;
  /** The stop camera it is read from (the legibility rule). Null for the exempt year numerals. */
  stop: StopId | null;
}

function room(layout: Layout, id: string) {
  const found = layout.rooms.find((r) => r.id === id);
  if (!found) throw new Error(`The layout has no '${id}' room`);
  return found;
}

/** Where every environment label goes for this layout. */
export function labelPlacements(layout: Layout): LabelPlacement[] {
  const aisle = room(layout, 'aisle');
  const desk = room(layout, 'desk');
  const out: LabelPlacement[] = [
    {
      label: COMMIT_HISTORY,
      position: [0, 0, ARCH_Z + SIGN_WALL_GAP],
      rotation: [0, 0, 0],
      stop: 'lobby',
    },
  ];
  for (const door of layout.doors) {
    const label = ROOM_NAMES.find((r) => r.for === doorId(door.wing));
    if (!label) continue;
    const right = door.side === 'right';
    out.push({
      label,
      position: [right ? aisle.max[0] - SIGN_WALL_GAP : aisle.min[0] + SIGN_WALL_GAP, 0, door.z],
      rotation: [0, right ? -Math.PI / 2 : Math.PI / 2, 0],
      stop: doorId(door.wing),
    });
  }
  // FOUNDATIONS is read on the approach, from the last stop of the aisle.
  const aisleStops = layout.tracks.main.stops.filter((s) => s.camera[2] > aisle.min[1]);
  out.push({
    label: FOUNDATIONS_SIGN,
    position: [0, 0, aisle.min[1] + SIGN_WALL_GAP],
    rotation: [0, 0, 0],
    stop: aisleStops.at(-1)?.id ?? null,
  });
  out.push({
    label: END_WALL,
    position: [0, 0, desk.min[1] + SIGN_WALL_GAP],
    rotation: [0, 0, 0],
    stop: 'desk',
  });
  for (const mark of layout.yearMarks) {
    out.push({
      label: yearLabel(mark.year),
      position: [0, FLOOR_INLAY_Y, mark.z - YEAR_NUMERAL_DZ],
      rotation: [-Math.PI / 2, 0, 0],
      stop: null,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Legibility (EXPERIENCE §5.4): projected cap height >= 14 CSS px from the label's stop camera

export const MIN_CAP_PX = 14;

export interface Viewport {
  name: string;
  width: number;
  height: number;
  /** Vertical field of view in degrees. */
  fov: number;
}

/**
 * Projected cap height in CSS px of a cap `capHeight` m tall, `distance` m from the camera:
 * cap / (2 d tan(fov / 2)) * viewport height. Using the straight-line distance (not the depth
 * along the view axis) errs small for labels off the screen center, so the check is conservative.
 */
export function projectedCapPx(capHeight: number, distance: number, viewport: Viewport): number {
  const fov = (viewport.fov * Math.PI) / 180;
  return (capHeight / (2 * distance * Math.tan(fov / 2))) * viewport.height;
}
