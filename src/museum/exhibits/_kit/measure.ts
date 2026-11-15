// What ExhibitFrame measures after a reveal (ARCHITECTURE §7.4, dev and ?test=1 only): the
// exhibit's box in slot-local meters, its triangles and its draw calls, and whether it fits the
// slot. Vertex-precise, so a rotated part is not over-counted by its bounding box. Hidden
// sub-trees are skipped (they do not render). Pure three.js: unit-tested in Node.
import {
  Box3,
  Matrix4,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  type Object3D,
} from 'three';
import type { Vec3 } from '../../rail/layout';

export interface Measurement {
  /** Slot-local box (empty when nothing renders). */
  box: Box3;
  triangles: number;
  drawCalls: number;
}

/** Tolerance of the bounds check: EXPERIENCE §5.11 allows 1 cm. */
export const BOUNDS_TOLERANCE = 0.01;

type Drawable = Object3D & {
  geometry?: BufferGeometry;
  material?: Material | Material[];
  isMesh?: boolean;
  isLine?: boolean;
  isPoints?: boolean;
  isInstancedMesh?: boolean;
};

function drawnCount(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position');
  const total = geometry.index ? geometry.index.count : (position?.count ?? 0);
  const start = Math.max(0, geometry.drawRange.start);
  return Math.max(0, Math.min(total, start + geometry.drawRange.count) - start);
}

/** Measures every visible drawable under `root` (not `root`'s own visibility) in its frame. */
export function measureObject(root: Object3D): Measurement {
  root.updateWorldMatrix(true, true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const box = new Box3();
  const v = new Vector3();
  const objectToRoot = new Matrix4();
  const instance = new Matrix4();
  const full = new Matrix4();
  let triangles = 0;
  let drawCalls = 0;

  const visit = (object: Drawable) => {
    const geometry = object.geometry;
    const drawable = object.isMesh || object.isLine || object.isPoints;
    if (drawable && geometry && object.material) {
      const position = geometry.getAttribute('position');
      const instances = object.isInstancedMesh ? (object as unknown as InstancedMesh).count : 1;
      objectToRoot.multiplyMatrices(toRoot, object.matrixWorld);
      for (let k = 0; k < instances; k++) {
        if (object.isInstancedMesh) {
          (object as unknown as InstancedMesh).getMatrixAt(k, instance);
          full.multiplyMatrices(objectToRoot, instance);
        } else {
          full.copy(objectToRoot);
        }
        if (position) {
          for (let i = 0; i < position.count; i++) {
            box.expandByPoint(v.fromBufferAttribute(position, i).applyMatrix4(full));
          }
        }
      }
      if (object.isMesh) triangles += Math.floor(drawnCount(geometry) / 3) * instances;
      drawCalls += Array.isArray(object.material) ? Math.max(1, geometry.groups.length) : 1;
    }
    for (const child of object.children) if (child.visible) visit(child as Drawable);
  };
  for (const child of root.children) if (child.visible) visit(child as Drawable);
  return { box, triangles, drawCalls };
}

/** True when `box` lies inside `bounds` grown by `tolerance` on every side (an empty box fits). */
export function fitsBounds(
  box: Box3,
  bounds: { min: Readonly<Vec3>; max: Readonly<Vec3> },
  tolerance = BOUNDS_TOLERANCE,
): boolean {
  if (box.isEmpty()) return true;
  const min = box.min.toArray();
  const max = box.max.toArray();
  return [0, 1, 2].every(
    (i) => min[i]! >= bounds.min[i]! - tolerance && max[i]! <= bounds.max[i]! + tolerance,
  );
}
