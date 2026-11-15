import { Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import { EDGES_PER_CASE, slotOrigin, WIDE_RISER_FOOTPRINT } from '../exhibits/_kit/anatomy';
import { computeLayout } from '../rail/layout';
import { fixtureInstances, openBottomBox } from './fixtureMatrices';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));
const inst = fixtureInstances(layout);
const count = (plinth: string) => layout.slots.filter((s) => s.plinth === plinth).length;

describe('fixture instancing (EXPERIENCE §5.2, §5.3)', () => {
  it('has one instance per slot of each variant', () => {
    expect(count('standard')).toBe(7);
    expect(inst.standardPlinths).toHaveLength(count('standard'));
    expect(inst.baseStrips).toHaveLength(count('standard'));
    // Each wide plinth carries a riser up to its slot floor (WP-21 open question 1).
    expect(inst.widePlinths).toHaveLength(2 * count('wide'));
    expect(inst.cases).toHaveLength(layout.slots.length);
    expect(inst.edges).toHaveLength(layout.slots.length * EDGES_PER_CASE);
    expect(inst.wallPanels).toHaveLength(2 * count('none'));
  });

  it('stands every plinth on the floor under its slot, top at the slot origin', () => {
    const standard = layout.slots.filter((s) => s.plinth === 'standard');
    standard.forEach((slot, i) => {
      const m = inst.standardPlinths[i]!;
      const top = new Vector3(0, 0.5, 0).applyMatrix4(m);
      const bottom = new Vector3(0, -0.5, 0).applyMatrix4(m);
      const origin = slotOrigin(slot);
      expect(top.x, slot.id).toBeCloseTo(origin[0], 6);
      expect(top.y, slot.id).toBeCloseTo(origin[1], 6);
      expect(top.z, slot.id).toBeCloseTo(origin[2], 6);
      expect(bottom.y, slot.id).toBeCloseTo(0, 6);
    });
  });

  it('seats each case on its plinth top (wall vitrine: on the wall)', () => {
    layout.slots.forEach((slot, i) => {
      const m = inst.cases[i]!;
      const origin = slotOrigin(slot);
      if (slot.mount === 'wall') {
        const center = new Vector3(0, 0, 0).applyMatrix4(m);
        expect(center.y, slot.id).toBeCloseTo(origin[1], 6);
      } else {
        const bottom = new Vector3(0, -0.5, 0).applyMatrix4(m);
        expect(bottom.y, slot.id).toBeCloseTo(origin[1], 6);
      }
    });
  });

  it('leaves the bottom face off the glass case geometry', () => {
    const box = openBottomBox();
    expect(box.getIndex()!.count / 3).toBe(10);
    const normal = box.getAttribute('normal');
    const index = box.getIndex()!;
    for (let i = 0; i < index.count; i++) {
      expect(normal.getY(index.getX(i))).not.toBe(-1);
    }
  });
});

describe('the mun riser (WP-21 open question 1)', () => {
  it('fills the plinth top up to the MUN slot floor under the base plate', () => {
    const mun = layout.slots.find((s) => s.id === 'mun')!;
    const riser = inst.widePlinths[1]!;
    const position = new Vector3();
    const scale = new Vector3();
    riser.decompose(position, new Quaternion(), scale);
    const top = slotOrigin(mun)[1];
    expect(position.y - scale.y / 2).toBeCloseTo(top, 9);
    expect(position.y + scale.y / 2).toBeCloseTo(top + mun.bounds.min[1], 9);
    expect(scale.x).toBeCloseTo(WIDE_RISER_FOOTPRINT, 9);
    expect(scale.z).toBeCloseTo(WIDE_RISER_FOOTPRINT, 9);
  });
});
