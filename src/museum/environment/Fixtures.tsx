// Plinths, base strips, glass cases, brass edges, the certifications wall panels and the desk
// block (EXPERIENCE §5.2, §5.3), one instanced draw call per kind. Matrices from fixtures.ts.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { BufferGeometry, InstancedMesh, Material, Matrix4 } from 'three';
import { useMaterialLibrary } from '../materials';
import type { Layout } from '../rail/layout';
import { fixtureInstances, openBottomBox, unitBox } from './fixtures';

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

export function Fixtures({ layout }: { layout: Layout }) {
  const library = useMaterialLibrary();
  const instances = useMemo(() => fixtureInstances(layout), [layout]);
  const box = useMemo(() => unitBox(), []);
  const glass = useMemo(() => openBottomBox(), []);
  useEffect(() => () => box.dispose(), [box]);
  useEffect(() => () => glass.dispose(), [glass]);
  const desk = useMemo(() => (instances.desk ? [instances.desk] : []), [instances]);
  return (
    <group name="fixtures">
      <Instanced
        name="plinths"
        geometry={box}
        material={library.plinth}
        matrices={instances.standardPlinths}
      />
      <Instanced
        name="base-strips"
        geometry={box}
        material={library.brass}
        matrices={instances.baseStrips}
      />
      <Instanced
        name="wide-plinths"
        geometry={box}
        material={library.plinth}
        matrices={instances.widePlinths}
      />
      <Instanced
        name="wall-panels"
        geometry={box}
        material={library.walnut}
        matrices={instances.wallPanels}
      />
      <Instanced name="desk" geometry={box} material={library.plinth} matrices={desk} />
      <Instanced
        name="case-edges"
        geometry={box}
        material={library.brass}
        matrices={instances.edges}
      />
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
