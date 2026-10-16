// Brass trim (EXPERIENCE §2.3): 4 cm reveals lining the lobby arch and the wing doors, the thin
// frame around the lobby portrait, and the year-strip inlays (§6.9). Pure boxes in world meters;
// Scene draws all of one kind as one instanced mesh of the shared `brass` material.
import { Matrix4 } from 'three';
import type { Layout, Vec3 } from '../rail/layout';
import { FLOOR_INLAY_Y } from './labels3d';
import { PORTRAIT_CENTER, PORTRAIT_SIZE } from './lightPlan';
import { openings, wallSpans, WALL_THICKNESS, type Opening } from './shell';

/** Visible width of a door or arch reveal. */
export const REVEAL_WIDTH = 0.04;
/** A reveal stands this far proud of each wall face. */
export const REVEAL_PROUD = 0.005;
/** Portrait frame: bar width and depth. */
export const FRAME_BAR = 0.03;
export const FRAME_DEPTH = 0.03;
/** Year strips: brass inlay 0.03 m wide across x -3.3 to 3.3, flush with the floor. */
export const YEAR_STRIP_HALF = 3.3;
export const YEAR_STRIP_WIDTH = 0.03;
export const YEAR_STRIP_THICKNESS = 0.002;

export interface TrimBox {
  name: string;
  center: Vec3;
  size: Vec3;
}

const EPS = 1e-6;

/** The side of the wall line its thickness goes to (+1 toward +x or +z). */
function outwardOf(layout: Layout, opening: Opening): 1 | -1 {
  const span = wallSpans(layout).find(
    (s) =>
      s.axis === opening.axis &&
      Math.abs(s.at - opening.at) < EPS &&
      s.from <= opening.from + EPS &&
      s.to >= opening.to - EPS,
  );
  return span?.outward ?? 1;
}

/** Two jambs and a head lining an opening, each 4 cm wide on the wall faces. */
export function revealBoxes(layout: Layout, opening: Opening): TrimBox[] {
  const depth = WALL_THICKNESS + 2 * REVEAL_PROUD;
  const across = opening.at + (outwardOf(layout, opening) * WALL_THICKNESS) / 2;
  const box = (name: string, along: number, alongSize: number, y: number, h: number): TrimBox =>
    opening.axis === 'x'
      ? { name, center: [along, y, across], size: [alongSize, h, depth] }
      : { name, center: [across, y, along], size: [depth, h, alongSize] };
  const w = REVEAL_WIDTH;
  const top = opening.top;
  return [
    box(`${opening.name}-jamb-a`, opening.from + w / 2, w, top / 2, top),
    box(`${opening.name}-jamb-b`, opening.to - w / 2, w, top / 2, top),
    box(
      `${opening.name}-head`,
      (opening.from + opening.to) / 2,
      opening.to - opening.from,
      top - w / 2,
      w,
    ),
  ];
}

/** The four bars of the portrait frame, just in front of the lobby back wall. */
export function portraitFrameBoxes(): TrimBox[] {
  const [cx, cy, cz] = PORTRAIT_CENTER;
  const [w, h] = PORTRAIT_SIZE;
  const b = FRAME_BAR;
  const z = cz - 0.01;
  return [
    { name: 'frame-top', center: [cx, cy + h / 2 + b / 2, z], size: [w + 2 * b, b, FRAME_DEPTH] },
    {
      name: 'frame-bottom',
      center: [cx, cy - h / 2 - b / 2, z],
      size: [w + 2 * b, b, FRAME_DEPTH],
    },
    { name: 'frame-left', center: [cx - w / 2 - b / 2, cy, z], size: [b, h, FRAME_DEPTH] },
    { name: 'frame-right', center: [cx + w / 2 + b / 2, cy, z], size: [b, h, FRAME_DEPTH] },
  ];
}

/** Reveals for the arch and every wing door, plus the portrait frame. */
export function brassTrimBoxes(layout: Layout): TrimBox[] {
  const lined = openings(layout).filter((o) => o.name === 'arch' || o.name.endsWith('-door'));
  return [...lined.flatMap((o) => revealBoxes(layout, o)), ...portraitFrameBoxes()];
}

/** One brass inlay per `layout.yearMarks` entry. */
export function yearStripBoxes(layout: Layout): TrimBox[] {
  return layout.yearMarks.map((mark) => ({
    name: `year-${mark.year}`,
    center: [0, FLOOR_INLAY_Y / 2, mark.z],
    size: [2 * YEAR_STRIP_HALF, YEAR_STRIP_THICKNESS, YEAR_STRIP_WIDTH],
  }));
}

/** A unit-box instance matrix for an axis-aligned trim box. */
export function trimMatrix(box: TrimBox, rotationY = 0): Matrix4 {
  return new Matrix4()
    .makeTranslation(...box.center)
    .multiply(new Matrix4().makeRotationY(rotationY))
    .multiply(new Matrix4().makeScale(...box.size));
}
