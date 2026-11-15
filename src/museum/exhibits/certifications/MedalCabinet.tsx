// Exhibit No. 06, "The Medal Cabinet" (EXPERIENCE §4.10), in the wall vitrine: three brass
// medallions hang from a brass rail on two standoffs, each with its own relief emblem (a cloud, a
// compass rose, a turbine). Generic emblems only: no issuer logo, badge image or text; the names
// live in the DOM card. Brass only (the walnut back panel is the kit's). One slow motion: each
// medallion turns +-12 degrees on its strap, a third of the 12 s period after its neighbour.
// Under reduced motion and ?test=1 all three face front. Measurements live in ./cabinet.
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { DynamicDrawUsage, type InstancedMesh } from 'three';
import { useExhibitClock, useMaterial, type ExhibitProps } from '../_kit';
import { cabinetInstances, PRIMITIVES, writeCabinet, yawsAt, type Primitive } from './cabinet';

const INSTANCES = cabinetInstances();
const KINDS = Object.keys(INSTANCES) as Primitive[];

/** A primitive's geometry from ./cabinet (cylinder axes are +Y; ./cabinet turns them to +Z). */
function Geometry({ kind }: { kind: Primitive }) {
  const spec = PRIMITIVES[kind];
  switch (spec.type) {
    case 'cylinder':
      return <cylinderGeometry args={spec.args} />;
    case 'torus':
      return <torusGeometry args={spec.args} />;
    case 'box':
      return <boxGeometry />;
  }
}

export default function MedalCabinet({ runtime }: ExhibitProps) {
  const brass = useMaterial('brass');
  const clock = useExhibitClock();
  const meshes = useRef<Partial<Record<Primitive, InstancedMesh>>>({});
  const last = useRef(Number.NaN);
  const reducedMotion = runtime.reducedMotion;
  const refs = useMemo(
    () =>
      Object.fromEntries(
        KINDS.map((kind) => [
          kind,
          (mesh: InstancedMesh | null) => {
            if (mesh) meshes.current[kind] = mesh;
            else delete meshes.current[kind];
          },
        ]),
      ) as Record<Primitive, (mesh: InstancedMesh | null) => void>,
    [],
  );

  // The first pose is in place before the kit compiles and reveals the exhibit.
  useLayoutEffect(() => {
    for (const mesh of Object.values(meshes.current))
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    const t = reducedMotion ? 0 : clock.current;
    writeCabinet(INSTANCES, meshes.current, yawsAt(t, reducedMotion));
    last.current = t;
  }, [clock, reducedMotion]);

  // Writes matrices only when the clock has moved.
  useFrame(() => {
    const t = reducedMotion ? 0 : clock.current;
    if (t === last.current) return;
    last.current = t;
    writeCabinet(INSTANCES, meshes.current, yawsAt(t, reducedMotion));
  });

  return (
    <group name="medal-cabinet">
      {KINDS.map((kind) => (
        <instancedMesh
          key={kind}
          ref={refs[kind]}
          name={kind}
          args={[undefined, undefined, INSTANCES[kind].length]}
          material={brass}
          frustumCulled={false}
        >
          <Geometry kind={kind} />
        </instancedMesh>
      ))}
    </group>
  );
}
