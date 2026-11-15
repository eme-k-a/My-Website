// Exhibit No. 02, "Warm Start" (EXPERIENCE §4.2): a generic bone ceramic wall unit on a walnut
// tray carries a four-segment ring dial (build, end-to-end tests, dev release, store release); at
// its foot a brass key passes through a brass ring, the single sign-on token exchange. Shared
// library materials only, no lights, no text. One slow motion: the segments light in turn on a
// 10 s loop, driven only by useExhibitClock(). Under reduced motion, ?test=1 and tier low all
// four hold at 1.0. Measurements live in ./dial.
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Matrix4, type InstancedMesh, type Mesh, type MeshStandardMaterial } from 'three';
import {
  MergeStatic,
  useExhibitClock,
  useMaterial,
  useMaterialInstance,
  type ExhibitProps,
} from '../_kit';
import { clockFrozen } from '../_kit/clock';
import {
  BEZEL,
  DIAL,
  dialGlow,
  KEY,
  RING,
  roundedSlab,
  segmentStart,
  SEGMENTS,
  SLAB,
  SSO_YAW_DEG,
  STAND,
  TOOTH_Y,
  TRAY,
} from './dial';

const DEG = Math.PI / 180;
const DIAL_ARC = DIAL.arcDeg * DEG;
const SHAFT_LENGTH = KEY.shaft.to - KEY.shaft.from;
const STAND_HEIGHT = STAND.top - STAND.bottom;

export default function WarmStart({ runtime }: ExhibitProps) {
  const walnut = useMaterial('walnut');
  const ceramic = useMaterial('ceramic');
  const brass = useMaterial('brass');
  // One clone per dial segment, so each lights on its own; clones share the compiled program.
  const glow0 = useMaterialInstance('accentGlow');
  const glow1 = useMaterialInstance('accentGlow');
  const glow2 = useMaterialInstance('accentGlow');
  const glow3 = useMaterialInstance('accentGlow');
  const segments = [glow0, glow1, glow2, glow3];
  const segmentMeshes = useRef<(Mesh | null)[]>([]);
  const clock = useExhibitClock();
  const [frozen] = useState(() =>
    typeof window === 'undefined' ? false : clockFrozen(window.location.search),
  );
  const still = runtime.reducedMotion || frozen || runtime.tier === 'low';
  const levels = useRef([0, 0, 0, 0]);
  const teeth = useRef<InstancedMesh>(null);

  const slab = useMemo(
    () =>
      roundedSlab(
        SLAB.size[0],
        SLAB.size[1],
        SLAB.size[2],
        SLAB.radius,
        SLAB.bevel,
        SLAB.curveSegments,
        SLAB.bevelSegments,
      ),
    [],
  );
  useLayoutEffect(() => () => slab.dispose(), [slab]);

  // Writes only the levels that changed, so a held pose leaves the materials untouched.
  const apply = useCallback(
    (t: number) => {
      const next = dialGlow(t, still, levels.current);
      segmentMeshes.current.forEach((mesh, i) => {
        const material = mesh?.material as MeshStandardMaterial | undefined;
        if (material && material.emissiveIntensity !== next[i]) {
          material.emissiveIntensity = next[i]!;
        }
      });
    },
    [still],
  );

  // The first pose is in place before the kit compiles and reveals the exhibit.
  useLayoutEffect(() => apply(clock.current), [apply, clock]);
  useFrame(() => apply(clock.current));

  useLayoutEffect(() => {
    const mesh = teeth.current;
    if (!mesh) return;
    const m = new Matrix4();
    KEY.tooth.xs.forEach((x, i) => mesh.setMatrixAt(i, m.makeTranslation(x, TOOTH_Y, 0)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  return (
    <MergeStatic name="warm-start">
      <RoundedBox
        name="tray"
        args={TRAY.size}
        radius={TRAY.radius}
        smoothness={TRAY.smoothness}
        bevelSegments={TRAY.bevelSegments}
        position={TRAY.center}
        material={walnut}
      />
      <mesh name="slab" geometry={slab} position={SLAB.center} material={ceramic} />
      <group name="dial" position={DIAL.center}>
        {SEGMENTS.map((segment, i) => (
          <mesh
            key={segment}
            ref={(mesh) => {
              segmentMeshes.current[i] = mesh;
            }}
            name={`segment-${i}`}
            rotation-z={segmentStart(i)}
            material={segments[i]}
          >
            <torusGeometry
              args={[DIAL.radius, DIAL.tube, DIAL.radialSegments, DIAL.tubularSegments, DIAL_ARC]}
            />
          </mesh>
        ))}
      </group>
      <mesh name="bezel" position={[DIAL.center[0], DIAL.center[1], BEZEL.z]} material={brass}>
        <torusGeometry
          args={[BEZEL.radius, BEZEL.tube, BEZEL.radialSegments, BEZEL.tubularSegments]}
        />
      </mesh>
      <group
        name="sso"
        position={[RING.center[0], 0, RING.center[2]]}
        rotation-y={SSO_YAW_DEG * DEG}
      >
        <mesh name="stand" position-y={STAND.bottom + STAND_HEIGHT / 2} material={brass}>
          <cylinderGeometry args={[STAND.radius, STAND.radius, STAND_HEIGHT, STAND.segments]} />
        </mesh>
        <mesh name="ring" position-y={RING.center[1]} rotation-y={Math.PI / 2} material={brass}>
          <torusGeometry
            args={[RING.radius, RING.tube, RING.radialSegments, RING.tubularSegments]}
          />
        </mesh>
        <group name="key" position={[-RING.center[0], 0, KEY.z - RING.center[2]]}>
          <mesh name="bow" position={[KEY.bow.x, KEY.y, 0]} material={brass}>
            <torusGeometry
              args={[KEY.bow.radius, KEY.bow.tube, KEY.bow.radialSegments, KEY.bow.tubularSegments]}
            />
          </mesh>
          <mesh
            name="shaft"
            position={[KEY.shaft.from + SHAFT_LENGTH / 2, KEY.y, 0]}
            rotation-z={Math.PI / 2}
            material={brass}
          >
            <cylinderGeometry
              args={[KEY.shaft.radius, KEY.shaft.radius, SHAFT_LENGTH, KEY.shaft.segments]}
            />
          </mesh>
          <instancedMesh
            ref={teeth}
            name="teeth"
            args={[undefined, undefined, KEY.tooth.xs.length]}
            material={brass}
          >
            <boxGeometry args={KEY.tooth.size} />
          </instancedMesh>
        </group>
      </group>
    </MergeStatic>
  );
}
