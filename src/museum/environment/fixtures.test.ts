import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import { EDGES_PER_CASE, slotOrigin } from '../exhibits/_kit/anatomy';
import { computeLayout } from '../rail/layout';
import { fixtureInstances, openBottomBox } from './fixtures';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));
const inst = fixtureInstances(layout);
const count = (plinth: string) => layout.slots.filter((s) => s.plinth === plinth).length;

describe('fixture instancing (EXPERIENCE §5.2, §5.3)', () => {
  it('has one instance per slot of each variant', () => {
    expect(count('standard')).toBe(8);
    expect(inst.standardPlinths).toHaveLength(count('standard'));
    expect(inst.baseStrips).toHaveLength(count('standard'));
    expect(inst.widePlinths).toHaveLength(count('wide'));
    expect(inst.cases).toHaveLength(layout.slots.length);
    expect(inst.edges).toHaveLength(layout.slots.length * EDGES_PER_CASE);
    expect(inst.wallPanels).toHaveLength(2 * count('none'));
    expect(inst.desk).not.toBeNull();
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

  it('puts the desk block at the desk stop target', () => {
    const desk = layout.tracks.main.stops.find((s) => s.id === 'desk')!;
    const center = new Vector3().applyMatrix4(inst.desk!);
    expect(center.x).toBeCloseTo(desk.look[0], 6);
    expect(center.z).toBeCloseTo(desk.look[2], 6);
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
