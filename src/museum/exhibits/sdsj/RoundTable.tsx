// Exhibit No. V1, "The Round Table" (EXPERIENCE §4.8): six identical laptops face each other
// around a round walnut table on a brass pedestal, a brass cube (the shared project) at its
// center. Shared library materials only, no lights, no text. One slow motion: the screens light
// in turn on a 12 s loop, driven only by useExhibitClock(). Under reduced motion all six hold
// 0.8; with the clock at 0 (?test=1) the loop has not begun, which is the same pose.
// Measurements live in ./table.
import { useFrame } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef } from 'react';
import type { InstancedMesh, Mesh, MeshStandardMaterial, PlaneGeometry } from 'three';
import {
  MergeStatic,
  useExhibitClock,
  useMaterial,
  useMaterialInstance,
  type ExhibitProps,
} from '../_kit';
import type { ExhibitClock } from '../_kit';
import {
  CUBE,
  CUBE_CENTER_Y,
  FOOT,
  FOOT_CENTER_Y,
  LAPTOP,
  laptopFrame,
  PEDESTAL,
  PEDESTAL_CENTER_Y,
  screenGlow,
  screenPart,
  SHELL_COUNT,
  shellMatrices,
  TOP,
  TOP_CENTER_Y,
} from './table';

const SHELLS = shellMatrices();
const SCREEN = screenPart();
const LAPTOPS = Array.from({ length: LAPTOP.count }, (_, i) => ({ i, ...laptopFrame(i) }));

interface ScreenProps {
  index: number;
  clock: ExhibitClock;
  reducedMotion: boolean;
}

/** One screen with its own accentGlow clone, so each glow level is its own. */
function Screen({ index, clock, reducedMotion }: ScreenProps) {
  const glow = useMaterialInstance('accentGlow');
  const screen = useRef<Mesh<PlaneGeometry, MeshStandardMaterial>>(null);

  // Writes the level only when it changes (between hand-overs nothing does).
  const apply = useCallback(() => {
    const material = screen.current?.material;
    if (!material) return;
    const level = screenGlow(index, clock.current, reducedMotion);
    if (material.emissiveIntensity !== level) material.emissiveIntensity = level;
  }, [index, clock, reducedMotion]);

  // The first pose is in place before the kit compiles and reveals the exhibit.
  useLayoutEffect(apply, [apply, glow]);
  useFrame(apply);

  return (
    <mesh
      ref={screen}
      name={`screen-${index}`}
      position={SCREEN.position}
      rotation-x={SCREEN.rotationX}
      material={glow}
    >
      <planeGeometry args={LAPTOP.screen} />
    </mesh>
  );
}

export default function RoundTable({ runtime }: ExhibitProps) {
  const walnut = useMaterial('walnut');
  const brass = useMaterial('brass');
  const graphite = useMaterial('ceramicGraphite');
  const clock = useExhibitClock();
  const shells = useRef<InstancedMesh>(null);
  const reducedMotion = runtime.reducedMotion;

  // The laptop shells never move: written once, then culled by a sphere around all twelve.
  useLayoutEffect(() => {
    const mesh = shells.current;
    if (!mesh) return;
    SHELLS.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  return (
    <MergeStatic name="round-table">
      <mesh name="foot" position-y={FOOT_CENTER_Y} material={brass}>
        <cylinderGeometry args={[FOOT.radius, FOOT.radius, FOOT.height, FOOT.segments]} />
      </mesh>
      <mesh name="pedestal" position-y={PEDESTAL_CENTER_Y} material={brass}>
        <cylinderGeometry
          args={[PEDESTAL.radius, PEDESTAL.radius, PEDESTAL.height, PEDESTAL.segments, 1, true]}
        />
      </mesh>
      <mesh name="top" position-y={TOP_CENTER_Y} material={walnut}>
        <cylinderGeometry args={[TOP.radius, TOP.radius, TOP.height, TOP.segments]} />
      </mesh>
      <mesh name="project" position-y={CUBE_CENTER_Y} material={brass}>
        <boxGeometry args={[CUBE.size, CUBE.size, CUBE.size]} />
      </mesh>
      <instancedMesh
        ref={shells}
        name="laptop-shells"
        args={[undefined, undefined, SHELL_COUNT]}
        material={graphite}
      >
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      {LAPTOPS.map(({ i, position, rotationY }) => (
        <group key={i} name={`laptop-${i}`} position={position} rotation-y={rotationY}>
          <Screen index={i} clock={clock} reducedMotion={reducedMotion} />
        </group>
      ))}
    </MergeStatic>
  );
}
