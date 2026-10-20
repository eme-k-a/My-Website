// Exhibit No. 05, "Work in Progress" (EXPERIENCE §4.9), on the large MUN plinth: a graphite
// silicon die with brass pins and traces stands on a brass post inside a five-tier brass
// scaffold. Each brass tier is a year of study still ahead; the tiers already taken down stay as
// frosted glass outlines. The tier state comes from the expected graduation month and the build
// date (./tiers), never from stored data. Shared library materials only, no lights, no text.
// One slow motion: the die turns once per 40 s. Under reduced motion and ?test=1 it rests at 30
// degrees. Measurements live in ./chip.
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Matrix4, type Group, type InstancedMesh } from 'three';
import { useExhibitClock, useMaterial, useMaterialInstance, type ExhibitProps } from '../_kit';
import {
  CORE,
  DIE,
  DIE_CENTER_Y,
  DIE_TOP,
  dieYaw,
  GHOST_OPACITY,
  partMatrix,
  pinParts,
  PLATE,
  POST,
  scaffoldParts,
  traceParts,
  type Part,
} from './chip';
import { tiersRemaining } from './tiers';

const PINS_PARTS = pinParts();
const TRACE_PARTS = traceParts();
const POST_HEIGHT = POST.top - POST.bottom;

/** Writes `parts` into a unit-box InstancedMesh once (the parts never move inside their group). */
function usePlaced(ref: RefObject<InstancedMesh | null>, parts: Part[]) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    parts.forEach((part, i) => mesh.setMatrixAt(i, partMatrix(part, m)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, parts]);
}

export default function WorkInProgress({ entry, runtime }: ExhibitProps) {
  const walnut = useMaterial('walnut');
  const brass = useMaterial('brass');
  const graphite = useMaterial('ceramicGraphite');
  const ghost = useMaterialInstance('frostedGlass');
  const clock = useExhibitClock();
  const die = useRef<Group>(null);
  const pins = useRef<InstancedMesh>(null);
  const traces = useRef<InstancedMesh>(null);
  const standing = useRef<InstancedMesh>(null);
  const ghosts = useRef<InstancedMesh>(null);
  const reducedMotion = runtime.reducedMotion;

  const graduation = 'graduation' in entry ? entry.graduation : undefined;
  const scaffold = useMemo(
    () => scaffoldParts(graduation ? tiersRemaining(graduation, __BUILD_DATE__) : 0),
    [graduation],
  );

  usePlaced(pins, PINS_PARTS);
  usePlaced(traces, TRACE_PARTS);
  usePlaced(standing, scaffold.standing);
  usePlaced(ghosts, scaffold.ghosts);

  // The first pose is in place before the kit compiles and reveals the exhibit.
  useLayoutEffect(() => {
    if (die.current) die.current.rotation.y = dieYaw(clock.current, reducedMotion);
  }, [clock, reducedMotion]);

  useFrame(() => {
    const group = die.current;
    if (!group) return;
    const yaw = dieYaw(clock.current, reducedMotion);
    if (group.rotation.y !== yaw) group.rotation.y = yaw;
  });

  return (
    <group name="work-in-progress">
      <RoundedBox
        name="plate"
        args={PLATE.size}
        radius={PLATE.radius}
        smoothness={PLATE.smoothness}
        bevelSegments={PLATE.bevelSegments}
        position={PLATE.center}
        material={walnut}
      />
      <mesh name="post" position-y={POST.bottom + POST_HEIGHT / 2} material={brass}>
        <cylinderGeometry args={[POST.radius, POST.radius, POST_HEIGHT, POST.segments]} />
      </mesh>
      <group ref={die} name="die">
        <RoundedBox
          name="die-body"
          args={DIE.size}
          radius={DIE.radius}
          smoothness={DIE.smoothness}
          bevelSegments={DIE.bevelSegments}
          position-y={DIE_CENTER_Y}
          material={graphite}
        />
        <mesh name="core" position-y={DIE_TOP + CORE.size[1] / 2} material={brass}>
          <boxGeometry args={CORE.size} />
        </mesh>
        <instancedMesh
          ref={pins}
          name="pins"
          args={[undefined, undefined, PINS_PARTS.length]}
          material={brass}
        >
          <boxGeometry />
        </instancedMesh>
        <instancedMesh
          ref={traces}
          name="traces"
          args={[undefined, undefined, TRACE_PARTS.length]}
          material={brass}
        >
          <boxGeometry />
        </instancedMesh>
      </group>
      {scaffold.standing.length > 0 && (
        <instancedMesh
          key={`standing-${scaffold.standing.length}`}
          ref={standing}
          name="scaffold"
          args={[undefined, undefined, scaffold.standing.length]}
          material={brass}
        >
          <boxGeometry />
        </instancedMesh>
      )}
      {scaffold.ghosts.length > 0 && (
        <instancedMesh
          key={`ghosts-${scaffold.ghosts.length}`}
          ref={ghosts}
          name="scaffold-ghosts"
          args={[undefined, undefined, scaffold.ghosts.length]}
          material={ghost}
          material-opacity={GHOST_OPACITY}
        >
          <boxGeometry />
        </instancedMesh>
      )}
    </group>
  );
}
