import { Group, Mesh, MeshBasicMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { content } from '../../../content/index';
import { computeLayout } from '../../rail/layout';
import { fitsBounds, measureObject } from './measure';
import {
  CRATE_SIZE,
  PLACEHOLDER_MAX_TRIANGLES,
  createPlaceholderGeometries,
  placeholderFit,
  triangleCount,
} from './placeholderGeometry';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));

describe('Placeholder crate (EXPERIENCE §5.7)', () => {
  it('stays under 300 triangles (three geometries built in Node)', () => {
    const { crate, caps } = createPlaceholderGeometries(CRATE_SIZE);
    const total = triangleCount(crate) + triangleCount(caps);
    expect(total).toBeGreaterThan(12);
    expect(total).toBeLessThan(PLACEHOLDER_MAX_TRIANGLES);
  });

  it('is 0.5 x 0.4 x 0.4 on a standard plinth, resting on the plinth top', () => {
    const slot = layout.slots.find((s) => s.id === 'verafin')!;
    const fit = placeholderFit(slot);
    expect(fit.size).toEqual([...CRATE_SIZE]);
    const crate = buildCrate(fit.size, fit.center);
    const { box } = measureObject(crate);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.max.y).toBeLessThanOrEqual(slot.bounds.max[1]);
  });

  it('fits inside every slot of the layout (x and z; the vitrine in all three axes)', () => {
    for (const slot of layout.slots) {
      const fit = placeholderFit(slot);
      const { box } = measureObject(buildCrate(fit.size, fit.center));
      const bounds =
        slot.mount === 'wall'
          ? slot.bounds
          : {
              min: [slot.bounds.min[0], 0, slot.bounds.min[2]] as [number, number, number],
              max: slot.bounds.max,
            };
      expect(fitsBounds(box, bounds, 0), slot.id).toBe(true);
    }
  });

  it('gets shallower, not smaller, in the wall vitrine', () => {
    const wall = layout.slots.find((s) => s.mount === 'wall')!;
    const fit = placeholderFit(wall);
    expect(fit.size[0]).toBe(CRATE_SIZE[0]);
    expect(fit.size[1]).toBe(CRATE_SIZE[1]);
    expect(fit.size[2]).toBeLessThan(wall.bounds.max[2] - wall.bounds.min[2]);
  });
});

function buildCrate(size: [number, number, number], center: [number, number, number]): Group {
  const { crate, caps } = createPlaceholderGeometries(size);
  const group = new Group();
  const material = new MeshBasicMaterial();
  for (const geometry of [crate, caps]) {
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...center);
    group.add(mesh);
  }
  return group;
}
