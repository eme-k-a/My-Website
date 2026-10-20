// Static-geometry merging for exhibits (F-M3a, R0 grant: merging only, no visual change). Every
// visible, opaque mesh under a root that shares its material (and render order) with another one
// is baked, in the root's frame, into one merged mesh per material; static instanced meshes are
// expanded instance by instance. The sources are hidden, not removed, so React keeps owning them
// and `unmergeStatic` restores them. The triangles drawn stay the same; only the draw calls drop.
// Pure three.js: unit-tested in Node.
import {
  Matrix4,
  Mesh,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Set `userData.keepUnmerged = true` on a mesh that must keep its own draw call. */
export const KEEP_UNMERGED = 'keepUnmerged';

export interface MergeResult {
  /** The merged meshes, children of the root, one per material bucket. */
  merged: Mesh[];
  /** The sources the merged meshes replace (hidden). */
  hidden: Object3D[];
}

type Candidate = Mesh & { isInstancedMesh?: boolean; isSkinnedMesh?: boolean };

/** Why a mesh keeps its own draw call, or null when it may be merged. */
function mergeBlocker(mesh: Candidate): string | null {
  const material = mesh.material as Material | Material[];
  if (Array.isArray(material)) return 'multi-material';
  if (material.transparent) return 'transparent';
  if (mesh.isSkinnedMesh) return 'skinned';
  if (mesh.userData[KEEP_UNMERGED] === true) return 'kept';
  if (Object.keys(mesh.geometry.morphAttributes).length > 0) return 'morph';
  const range = mesh.geometry.drawRange;
  if (range.start !== 0 || range.count !== Infinity) return 'draw range';
  if (mesh.isInstancedMesh && (mesh as unknown as InstancedMesh).instanceColor) {
    return 'instance colors';
  }
  return null;
}

/** Visible meshes under `root` (hidden sub-trees are skipped, as the renderer skips them). */
function visibleMeshes(root: Object3D): Candidate[] {
  const found: Candidate[] = [];
  const visit = (object: Object3D) => {
    if (!object.visible) return;
    if ((object as Candidate).isMesh) found.push(object as Candidate);
    for (const child of object.children) visit(child);
  };
  for (const child of root.children) visit(child);
  return found;
}

/** The mesh's geometry in the root frame, once per instance. */
function partsOf(mesh: Candidate, toRoot: Matrix4): BufferGeometry[] {
  const local = new Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld);
  if (!mesh.isInstancedMesh) return [mesh.geometry.clone().applyMatrix4(local)];
  const instanced = mesh as unknown as InstancedMesh;
  const instance = new Matrix4();
  const parts: BufferGeometry[] = [];
  for (let k = 0; k < instanced.count; k++) {
    instanced.getMatrixAt(k, instance);
    parts.push(mesh.geometry.clone().applyMatrix4(new Matrix4().multiplyMatrices(local, instance)));
  }
  return parts;
}

/** The attribute layout a merge needs to match: names, item sizes and normalization. */
function attributeSignature(geometry: BufferGeometry): string {
  return Object.entries(geometry.attributes)
    .map(([name, a]) => `${name}/${a.itemSize}/${a.normalized ? 1 : 0}`)
    .sort()
    .join();
}

/** All indexed, or all flattened, so mergeGeometries accepts the set. */
function harmonize(parts: BufferGeometry[]): BufferGeometry[] {
  if (parts.every((p) => p.index !== null)) return parts;
  return parts.map((p) => {
    if (p.index === null) return p;
    const flat = p.toNonIndexed();
    p.dispose();
    return flat;
  });
}

/**
 * Merges the static meshes under `root` (see the header). Call it once the sub-tree is final:
 * transforms set, instance matrices written. Buckets are per material, render order and
 * attribute layout; a bucket with a single source is left alone, and so is a mirrored source
 * (negative determinant: its winding would flip).
 */
export function mergeStatic(root: Object3D): MergeResult {
  root.updateWorldMatrix(true, true);
  const toRoot = new Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<
    string,
    { material: Material; renderOrder: number; meshes: Candidate[] }
  >();
  for (const mesh of visibleMeshes(root)) {
    if (mergeBlocker(mesh) !== null) continue;
    const local = new Matrix4().multiplyMatrices(toRoot, mesh.matrixWorld);
    if (local.determinant() <= 0) continue;
    const material = mesh.material as Material;
    const key = `${material.uuid}:${mesh.renderOrder}:${attributeSignature(mesh.geometry)}`;
    const bucket = buckets.get(key) ?? { material, renderOrder: mesh.renderOrder, meshes: [] };
    bucket.meshes.push(mesh);
    buckets.set(key, bucket);
  }

  const merged: Mesh[] = [];
  const hidden: Object3D[] = [];
  for (const { material, renderOrder, meshes } of buckets.values()) {
    const draws = meshes.reduce(
      (n, m) => n + (m.isInstancedMesh ? Math.min(1, (m as unknown as InstancedMesh).count) : 1),
      0,
    );
    if (draws < 2) continue;
    const parts = harmonize(meshes.flatMap((m) => partsOf(m, toRoot)));
    const geometry = mergeGeometries(parts);
    parts.forEach((p) => p.dispose());
    if (!geometry) continue;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, material);
    mesh.name = `merged-${material.name || material.type}`;
    mesh.renderOrder = renderOrder;
    root.add(mesh);
    mesh.updateMatrixWorld(true);
    merged.push(mesh);
    for (const source of meshes) {
      source.visible = false;
      hidden.push(source);
    }
  }
  return { merged, hidden };
}

/** Undoes `mergeStatic`: removes and disposes the merged meshes, shows the sources again. */
export function unmergeStatic({ merged, hidden }: MergeResult): void {
  for (const mesh of merged) {
    mesh.removeFromParent();
    mesh.geometry.dispose();
  }
  for (const source of hidden) source.visible = true;
}
