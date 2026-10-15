// Instance matrices for the gallery fixtures (EXPERIENCE §5.2, §5.3): plinths, base strips, glass
// cases, brass case edges and the certifications wall panels, each drawn as one instanced unit
// box per kind, so the fixture count never adds draw calls. Every matrix starts from a layout slot
// (anatomy.ts gives the kit-local offsets); the desk block stands at the desk stop's look target.
import { BoxGeometry, Matrix4, type BufferGeometry } from 'three';
import type { Layout } from '../rail/layout';
import {
  baseStripBox,
  boxMatrix,
  caseBox,
  edgeBoxes,
  plinthBox,
  slotMatrix,
  slotVariant,
  wallPanelBoxes,
} from '../exhibits/_kit/anatomy';

/** The greybox desk block (WP-11 replaces it with the walnut and brass desk). */
export const DESK_BLOCK_SIZE = [1.8, 1.0, 0.7] as const;

export interface FixtureInstances {
  /** One per standard slot (plinth material). */
  standardPlinths: Matrix4[];
  /** One brass base strip per standard plinth. */
  baseStrips: Matrix4[];
  /** The wide mun plinth. */
  widePlinths: Matrix4[];
  /** One glass case per slot, every variant (caseGlass). */
  cases: Matrix4[];
  /** Twelve brass edges per case. */
  edges: Matrix4[];
  /** Walnut backing panel and vitrine back per wall slot. */
  wallPanels: Matrix4[];
  /** The desk block, or null when the layout has no desk stop. */
  desk: Matrix4 | null;
}

export function fixtureInstances(layout: Layout): FixtureInstances {
  const out: FixtureInstances = {
    standardPlinths: [],
    baseStrips: [],
    widePlinths: [],
    cases: [],
    edges: [],
    wallPanels: [],
    desk: null,
  };
  for (const slot of layout.slots) {
    const frame = slotMatrix(slot);
    const variant = slotVariant(slot);
    if (variant === 'standard') {
      out.standardPlinths.push(boxMatrix(frame, plinthBox('standard')));
      out.baseStrips.push(boxMatrix(frame, baseStripBox()));
    } else if (variant === 'wide') {
      out.widePlinths.push(boxMatrix(frame, plinthBox('wide')));
    } else {
      for (const panel of wallPanelBoxes()) out.wallPanels.push(boxMatrix(frame, panel));
    }
    const glass = caseBox(variant);
    out.cases.push(boxMatrix(frame, glass));
    for (const edge of edgeBoxes(glass)) out.edges.push(boxMatrix(frame, edge));
  }
  const desk = layout.tracks.main.stops.find((s) => s.id === 'desk');
  if (desk) {
    const [w, h, d] = DESK_BLOCK_SIZE;
    out.desk = new Matrix4()
      .makeTranslation(desk.look[0], h / 2, desk.look[2])
      .multiply(new Matrix4().makeScale(w, h, d));
  }
  return out;
}

/** A unit box. */
export function unitBox(): BufferGeometry {
  return new BoxGeometry(1, 1, 1);
}

/**
 * A unit box without its bottom face, for the glass cases: a case stands open on its plinth, and
 * a face lying on the plinth top would cover the whole footprint in the contact-shadow pass.
 */
export function openBottomBox(): BufferGeometry {
  const box = new BoxGeometry(1, 1, 1);
  const index = box.getIndex();
  if (!index) throw new Error('BoxGeometry is indexed');
  // BoxGeometry builds its faces in the order +x, -x, +y, -y, +z, -z: group 3 is the bottom.
  const bottom = box.groups[3]!;
  const kept: number[] = [];
  for (let i = 0; i < index.count; i++) {
    if (i < bottom.start || i >= bottom.start + bottom.count) kept.push(index.getX(i));
  }
  box.setIndex(kept);
  box.clearGroups();
  return box;
}
