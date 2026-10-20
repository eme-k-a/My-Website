import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';
import { measureObject } from './measure';
import { KEEP_UNMERGED, mergeStatic, unmergeStatic } from './mergeStatic';

const walnut = new MeshStandardMaterial({ name: 'walnut' });
const brass = new MeshStandardMaterial({ name: 'brass' });
const glass = new MeshStandardMaterial({ name: 'glass', transparent: true });

function scene() {
  const root = new Group();
  root.position.set(4, 1, -2);
  root.rotation.y = 0.6;
  const a = new Mesh(new BoxGeometry(0.2, 0.1, 0.2), walnut);
  a.position.set(0, 0.05, 0);
  const inner = new Group();
  inner.position.set(0.1, 0.2, 0);
  inner.rotation.z = 0.4;
  const b = new Mesh(new BoxGeometry(0.1, 0.1, 0.1), walnut);
  b.position.set(0.05, 0, 0);
  b.scale.set(1, 2, 1);
  inner.add(b);
  const c = new Mesh(new CylinderGeometry(0.02, 0.02, 0.3, 12), brass);
  const posts = new InstancedMesh(new CylinderGeometry(0.01, 0.01, 1, 8, 1, true), brass, 3);
  for (let k = 0; k < 3; k++) {
    posts.setMatrixAt(k, new Matrix4().makeScale(1, 0.1 * (k + 1), 1).setPosition(k * 0.05, 0, 0));
  }
  const pane = new Mesh(new BoxGeometry(0.3, 0.3, 0.01), glass);
  const pane2 = new Mesh(new BoxGeometry(0.3, 0.3, 0.01), glass);
  root.add(a, inner, c, posts, pane, pane2);
  return { root, a, b, c, posts, pane, pane2 };
}

describe('mergeStatic', () => {
  it('merges per material, keeps transparent meshes, and draws the same triangles', () => {
    const { root, a, b, c, posts, pane, pane2 } = scene();
    const before = measureObject(root);
    const result = mergeStatic(root);
    const after = measureObject(root);
    expect(result.merged.map((m) => m.name).sort()).toEqual(['merged-brass', 'merged-walnut']);
    expect(result.hidden).toEqual(expect.arrayContaining([a, b, c, posts]));
    expect(pane.visible && pane2.visible).toBe(true);
    expect(after.triangles).toBe(before.triangles);
    // walnut 2 -> 1, brass 2 -> 1, the two glass panes stay.
    expect(before.drawCalls).toBe(6);
    expect(after.drawCalls).toBe(4);
    for (const axis of ['min', 'max'] as const) {
      expect(after.box[axis].distanceTo(before.box[axis])).toBeLessThan(1e-6);
    }
  });

  it('places vertices exactly where the sources put them', () => {
    const { root, b } = scene();
    root.updateWorldMatrix(true, true);
    const corner = new Vector3(0.05, 0.05, 0.05).applyMatrix4(b.matrixWorld);
    const { merged } = mergeStatic(root);
    const walnutMesh = merged.find((m) => m.material === walnut)!;
    const position = walnutMesh.geometry.getAttribute('position');
    const v = new Vector3();
    let best = Infinity;
    for (let i = 0; i < position.count; i++) {
      v.fromBufferAttribute(position, i).applyMatrix4(walnutMesh.matrixWorld);
      best = Math.min(best, v.distanceTo(corner));
    }
    expect(best).toBeLessThan(1e-6);
  });

  it('leaves single, kept and mirrored meshes alone, and unmerges cleanly', () => {
    const root = new Group();
    const lone = new Mesh(new BoxGeometry(), brass);
    const kept = new Mesh(new BoxGeometry(), walnut);
    kept.userData[KEEP_UNMERGED] = true;
    const mirrored = new Mesh(new BoxGeometry(), walnut);
    mirrored.scale.x = -1;
    const plain = new Mesh(new BoxGeometry(), walnut);
    root.add(lone, kept, mirrored, plain);
    const result = mergeStatic(root);
    expect(result.merged).toHaveLength(0);
    expect([lone, kept, mirrored, plain].every((m) => m.visible)).toBe(true);

    const { root: full } = scene();
    const merged = mergeStatic(full);
    const count = full.children.length;
    unmergeStatic(merged);
    expect(full.children.length).toBe(count - merged.merged.length);
    expect(merged.hidden.every((m) => m.visible)).toBe(true);
  });

  it('skips hidden sub-trees', () => {
    const { root, inner } = (() => {
      const s = scene();
      return { root: s.root, inner: s.b.parent! };
    })();
    inner.visible = false;
    const { merged } = mergeStatic(root);
    // Only one walnut mesh is visible, so walnut is not merged.
    expect(merged.map((m) => m.name)).toEqual(['merged-brass']);
  });
});
