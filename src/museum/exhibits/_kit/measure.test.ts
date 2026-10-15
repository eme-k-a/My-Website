import {
  BoxGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Box3,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';
import { SLOT_BOUNDS } from '../../rail/layout';
import { fitsBounds, measureObject } from './measure';

const material = new MeshBasicMaterial();

describe('measureObject', () => {
  it('measures in the root frame, vertex-precise, ignoring the root transform', () => {
    const root = new Group();
    root.position.set(10, 1, -5);
    root.rotation.y = 0.7;
    const mesh = new Mesh(new BoxGeometry(0.2, 0.4, 0.2), material);
    mesh.position.set(0, 0.3, 0);
    mesh.rotation.y = Math.PI / 4;
    root.add(mesh);
    const { box, triangles, drawCalls } = measureObject(root);
    const half = 0.1 * Math.SQRT2;
    expect(box.min.x).toBeCloseTo(-half, 6);
    expect(box.max.x).toBeCloseTo(half, 6);
    expect(box.min.y).toBeCloseTo(0.1, 6);
    expect(box.max.y).toBeCloseTo(0.5, 6);
    expect(triangles).toBe(12);
    expect(drawCalls).toBe(1);
  });

  it('counts every instance of an instanced mesh and skips hidden sub-trees', () => {
    const root = new Group();
    const instanced = new InstancedMesh(new BoxGeometry(0.1, 0.1, 0.1), material, 3);
    for (let i = 0; i < 3; i++) {
      instanced.setMatrixAt(i, new Matrix4().makeTranslation(i * 0.1, 0.05, 0));
    }
    root.add(instanced);
    const hidden = new Mesh(new BoxGeometry(5, 5, 5), material);
    hidden.visible = false;
    root.add(hidden);
    const { box, triangles, drawCalls } = measureObject(root);
    expect(triangles).toBe(36);
    expect(drawCalls).toBe(1);
    expect(box.max.x).toBeCloseTo(0.25, 6);
    expect(box.max.y).toBeCloseTo(0.1, 6);
  });

  it('measures children even when the root itself is hidden (before reveal)', () => {
    const root = new Group();
    root.visible = false;
    root.add(new Mesh(new BoxGeometry(0.2, 0.2, 0.2), material));
    expect(measureObject(root).triangles).toBe(12);
  });
});

describe('fitsBounds', () => {
  const bounds = SLOT_BOUNDS.standard;
  const box = (min: [number, number, number], max: [number, number, number]) =>
    new Box3(new Vector3(...min), new Vector3(...max));

  it('accepts a box inside the slot plus 1 cm and rejects anything beyond', () => {
    expect(fitsBounds(box([-0.3, 0.05, -0.3], [0.3, 0.6, 0.3]), bounds)).toBe(true);
    expect(fitsBounds(box([-0.334, 0.016, -0.3], [0.334, 0.684, 0.3]), bounds)).toBe(true);
    expect(fitsBounds(box([-0.34, 0.05, -0.3], [0.3, 0.6, 0.3]), bounds)).toBe(false);
    expect(fitsBounds(box([-0.3, 0.05, -0.3], [0.3, 0.7, 0.3]), bounds)).toBe(false);
  });

  it('treats an empty box as fitting', () => {
    expect(fitsBounds(new Box3(), bounds)).toBe(true);
  });
});
