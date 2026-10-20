// Plinths, base strips, glass cases, brass edges and the certifications wall panels (EXPERIENCE
// §5.2, §5.3), one instanced draw call per material. Matrices from fixtureMatrices.ts. The plinths
// use a clone of the library `plinth` carrying the plinth glow lightmap (lightPools.ts, F-024): a
// faint wash up each side and a highlight along the top edge, so a plinth reads as a solid object
// one step above the floor instead of a black void.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type {
  BufferGeometry,
  InstancedMesh,
  Material,
  Matrix4,
  MeshStandardMaterial,
  Texture,
} from 'three';
import { useMaterialLibrary } from '../materials';
import type { Layout } from '../rail/layout';
import { fixtureInstances, openBottomBox, plinthGeometry, unitBox } from './fixtureMatrices';
import { createPlinthGlow, PLINTH_GLOW_INTENSITY } from './lightPools';

interface InstancedProps {
  name: string;
  geometry: BufferGeometry;
  material: Material;
  matrices: readonly Matrix4[];
  renderOrder?: number;
}

/** One instanced mesh of `geometry`, one instance per matrix. Nothing when there are none. */
export function Instanced({ name, geometry, material, matrices, renderOrder }: InstancedProps) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [matrices]);
  if (matrices.length === 0) return null;
  return (
    <instancedMesh
      key={matrices.length}
      ref={ref}
      name={name}
      args={[geometry, material, matrices.length]}
      renderOrder={renderOrder}
    />
  );
}

/** A clone of the library `plinth` lit by the plinth glow tile. */
function plinthMaterial(plinth: MeshStandardMaterial, glow: Texture): MeshStandardMaterial {
  const m = plinth.clone();
  m.name = 'plinthGlow';
  m.lightMap = glow;
  m.lightMapIntensity = PLINTH_GLOW_INTENSITY;
  return m;
}

export function Fixtures({ layout }: { layout: Layout }) {
  const library = useMaterialLibrary();
  const instances = useMemo(() => fixtureInstances(layout), [layout]);
  const box = useMemo(() => unitBox(), []);
  const glass = useMemo(() => openBottomBox(), []);
  const plinthBox = useMemo(() => plinthGeometry(), []);
  const [glow] = useState(createPlinthGlow);
  const plinth = useMemo(() => plinthMaterial(library.plinth, glow), [library, glow]);
  useEffect(() => () => box.dispose(), [box]);
  useEffect(() => () => glass.dispose(), [glass]);
  useEffect(() => () => plinthBox.dispose(), [plinthBox]);
  useEffect(() => () => glow.dispose(), [glow]);
  useEffect(() => () => plinth.dispose(), [plinth]);
  // One instanced mesh per material: every plinth, every brass strip and case edge.
  const plinths = useMemo(
    () => [...instances.standardPlinths, ...instances.widePlinths],
    [instances],
  );
  const brass = useMemo(() => [...instances.baseStrips, ...instances.edges], [instances]);
  return (
    <group name="fixtures">
      <Instanced name="plinths" geometry={plinthBox} material={plinth} matrices={plinths} />
      <Instanced
        name="wall-panels"
        geometry={box}
        material={library.walnut}
        matrices={instances.wallPanels}
      />
      <Instanced name="fixture-brass" geometry={box} material={library.brass} matrices={brass} />
      {/* Glass last: transparent, no depth write. */}
      <Instanced
        name="cases"
        geometry={glass}
        material={library.caseGlass}
        matrices={instances.cases}
        renderOrder={1}
      />
    </group>
  );
}
