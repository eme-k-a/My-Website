// The hall (EXPERIENCE §2.3, §7.5; ARCHITECTURE §8.1): the whole shell (walls with their openings,
// lintels, the Foundations header beam and the ceilings) as one merged mesh of the `wall`
// material, whose lightMap is the shell's wall-wash tile (plain rows and 2 m seams); one instanced
// mesh of wash bays (the seamless scallop tile, tinted per target, centered on each wall title)
// behind every light target; and the dim ceiling light slots down the aisle and across each wing. The floors are
// Floor.tsx.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Color,
  PlaneGeometry,
  type InstancedMesh,
  type MeshStandardMaterial,
  type Texture,
} from 'three';
import { useMuseum } from '../../app/store';
import { useMaterialLibrary } from '../materials';
import type { Layout } from '../rail/layout';
import {
  createBayWash,
  createWallWash,
  WALL_WASH_INTENSITY,
  WALL_WASH_PLAIN_V,
  washLayout,
  washMatrix,
  type WashPlacement,
} from './lightPools';
import { applyWashUVs, ceilingSlotGeometry, shellGeometry } from './shell';

/** Fills the `wall` material's wallWash slot; the returned cleanup empties it again. */
function fillWallWash(wall: MeshStandardMaterial, wash: Texture): () => void {
  wall.lightMap = wash;
  wall.lightMapIntensity = WALL_WASH_INTENSITY;
  wall.needsUpdate = true;
  return () => {
    wall.lightMap = null;
    wall.needsUpdate = true;
  };
}

/** Writes the bays' matrices and temperature colors into the instanced mesh. */
function fillBays(mesh: InstancedMesh, bays: WashPlacement[]): void {
  const color = new Color();
  bays.forEach((b, i) => {
    mesh.setMatrixAt(i, washMatrix(b.bay));
    mesh.setColorAt(i, color.set(b.color).multiplyScalar(b.strength));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
}

/** A clone of `wall` carrying the wash tile (same program as the shell plus instancing). */
function bayMaterial(wall: MeshStandardMaterial, wash: Texture): MeshStandardMaterial {
  const m = wall.clone();
  m.name = 'wallWashBay';
  m.lightMap = wash;
  m.lightMapIntensity = WALL_WASH_INTENSITY;
  return m;
}

function WashBays({ layout }: { layout: Layout }) {
  const library = useMaterialLibrary();
  const tier = useMuseum((s) => s.tier);
  const { bays } = useMemo(() => washLayout(layout, tier), [layout, tier]);
  const plane = useMemo(() => new PlaneGeometry(1, 1), []);
  const [wash] = useState(createBayWash);
  useEffect(() => () => wash.dispose(), [wash]);
  // The wall material plus instance colors: the bay tile, tinted per bay.
  const material = useMemo(() => bayMaterial(library.wall, wash), [library, wash]);
  useEffect(() => () => plane.dispose(), [plane]);
  useEffect(() => () => material.dispose(), [material]);
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    if (ref.current) fillBays(ref.current, bays);
  }, [bays, material]);
  if (bays.length === 0) return null;
  return (
    <instancedMesh
      key={bays.length}
      ref={ref}
      name="wash-bays"
      args={[plane, material, bays.length]}
    />
  );
}

/** The aisle's ceiling slot and one per wing room, merged (shell.ts `ceilingSlots`). */
function CeilingSlot({ layout }: { layout: Layout }) {
  const library = useMaterialLibrary();
  const geometry = useMemo(() => ceilingSlotGeometry(layout), [layout]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh name="ceiling-slot" geometry={geometry} material={library.ceilingSlot} />;
}

export function Hall({ layout }: { layout: Layout }) {
  const library = useMaterialLibrary();
  const seams = useMemo(() => washLayout(layout).seams, [layout]);
  const shell = useMemo(
    () => applyWashUVs(shellGeometry(layout), seams, WALL_WASH_PLAIN_V),
    [layout, seams],
  );
  useEffect(() => () => shell.dispose(), [shell]);
  // The `wall` texture slot is R3's (materials/library.ts): filled before the first render, so
  // every program that uses `wall` is compiled with its lightMap from the start.
  const [wash] = useState(createWallWash);
  useLayoutEffect(() => fillWallWash(library.wall, wash), [library, wash]);
  useEffect(() => () => wash.dispose(), [wash]);
  return (
    <group name="hall">
      <mesh name="shell" geometry={shell} material={library.wall} />
      <WashBays layout={layout} />
      <CeilingSlot layout={layout} />
    </group>
  );
}
