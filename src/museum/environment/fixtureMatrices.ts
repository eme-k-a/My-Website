// Instance matrices for the gallery fixtures (EXPERIENCE §5.2, §5.3): plinths, base strips, glass
// cases, brass case edges and the certifications wall panels, each drawn as one instanced unit
// box per kind, so the fixture count never adds draw calls. Every matrix starts from a layout slot
// (anatomy.ts gives the kit-local offsets). The front desk is its own module (deskParts.ts, Desk.tsx).
import { BoxGeometry, type BufferGeometry, type Matrix4 } from 'three';
import { PLINTH_TOP_V } from './lightPools';
import type { Layout } from '../rail/layout';
import {
  baseStripBox,
  boxMatrix,
  caseBox,
  edgeBoxes,
  plinthBox,
  riserBox,
  slotMatrix,
  slotVariant,
  wallPanelBoxes,
} from '../exhibits/_kit/anatomy';

export interface FixtureInstances {
  /** One per standard slot (plinth material). */
  standardPlinths: Matrix4[];
  /** One brass base strip per standard plinth. */
  baseStrips: Matrix4[];
  /** The wide mun plinth and the riser under its exhibit (anatomy `riserBox`). */
  widePlinths: Matrix4[];
  /** One glass case per slot, every variant (caseGlass). */
  cases: Matrix4[];
  /** Twelve brass edges per case. */
  edges: Matrix4[];
  /** Walnut backing panel and vitrine back per wall slot. */
  wallPanels: Matrix4[];
}

export function fixtureInstances(layout: Layout): FixtureInstances {
  const out: FixtureInstances = {
    standardPlinths: [],
    baseStrips: [],
    widePlinths: [],
    cases: [],
    edges: [],
    wallPanels: [],
  };
  for (const slot of layout.slots) {
    const frame = slotMatrix(slot);
    const variant = slotVariant(slot);
    if (variant === 'standard') {
      out.standardPlinths.push(boxMatrix(frame, plinthBox('standard')));
      out.baseStrips.push(boxMatrix(frame, baseStripBox()));
    } else if (variant === 'wide') {
      out.widePlinths.push(boxMatrix(frame, plinthBox('wide')));
      const riser = riserBox(slot.bounds.min[1]);
      if (riser) out.widePlinths.push(boxMatrix(frame, riser));
    } else {
      for (const panel of wallPanelBoxes()) out.wallPanels.push(boxMatrix(frame, panel));
    }
    const glass = caseBox(variant);
    out.cases.push(boxMatrix(frame, glass));
    for (const edge of edgeBoxes(glass)) out.edges.push(boxMatrix(frame, edge));
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

/**
 * A unit box for the plinths whose UVs feed the plinth glow lightmap (F-024): on the four side
 * faces v runs from 0 at the foot to 1 at the top (BoxGeometry's own side UVs), and the top and
 * bottom faces sample one row (PLINTH_TOP_V), so the top reads evenly through the glass.
 */
export function plinthGeometry(): BufferGeometry {
  const box = new BoxGeometry(1, 1, 1);
  const uv = box.getAttribute('uv');
  // BoxGeometry builds its faces in the order +x, -x, +y, -y, +z, -z: groups 2 and 3 are the caps.
  for (const group of [box.groups[2]!, box.groups[3]!]) {
    const index = box.getIndex()!;
    for (let i = group.start; i < group.start + group.count; i++) {
      uv.setXY(index.getX(i), 0.5, PLINTH_TOP_V);
    }
  }
  uv.needsUpdate = true;
  return box;
}
