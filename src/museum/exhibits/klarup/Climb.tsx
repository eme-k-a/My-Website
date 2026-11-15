// Exhibit No. P1, "The Climb" (EXPERIENCE §4.5): five bone ceramic tiles climb like a staircase
// on brass posts and tick themselves off one by one, while three brass beads wait together on the
// top step; the blank walnut crate at the base is the standalone Android build. Shared library
// materials only, no lights, no text. One slow motion: the checks light up the stairs on a 10 s
// loop, driven only by useExhibitClock(). Under reduced motion and ?test=1 all five are lit.
// Measurements live in ./climb.
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Matrix4, type InstancedMesh } from 'three';
import {
  MergeStatic,
  useExhibitClock,
  useMaterial,
  useMaterialInstance,
  type ExhibitClock,
  type ExhibitProps,
} from '../_kit';
import {
  BEAD,
  beadCenters,
  CHECK,
  checkBars,
  CRATE,
  glowAt,
  POST,
  postFor,
  setGlow,
  STRIP,
  stripCenters,
  TILE,
  tileCenter,
  TRAY,
} from './climb';

const TILES = Array.from({ length: TILE.count }, (_, i) => i);
const POSTS = TILES.map(postFor);
const BEADS = beadCenters();
const STRIPS = stripCenters();

/** One tile's check: its own accentGlow clone, so each step lights on its own. */
function Check({
  index,
  clock,
  reducedMotion,
}: {
  index: number;
  clock: ExhibitClock;
  reducedMotion: boolean;
}) {
  const glow = useMaterialInstance('accentGlow');
  const bars = useMemo(() => checkBars(index), [index]);

  // The first pose is in place before the kit compiles and reveals the exhibit.
  useLayoutEffect(() => {
    setGlow(glow, glowAt(clock.current, index, reducedMotion));
  }, [glow, clock, index, reducedMotion]);

  useFrame(() => {
    setGlow(glow, glowAt(clock.current, index, reducedMotion));
  });

  return (
    <group name={`check-${index}`}>
      {bars.map(({ position, rotationY, length }) => (
        <mesh key={length} position={position} rotation-y={rotationY} material={glow}>
          <boxGeometry args={[length, CHECK.section, CHECK.section]} />
        </mesh>
      ))}
    </group>
  );
}

/** Writes fixed instance matrices once (posts, beads, crate strips never move). */
function useInstances(ref: RefObject<InstancedMesh | null>, matrices: Matrix4[]) {
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    matrices.forEach((m, k) => mesh.setMatrixAt(k, m));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [ref, matrices]);
}

export default function Climb({ runtime }: ExhibitProps) {
  const walnut = useMaterial('walnut');
  const ceramic = useMaterial('ceramic');
  const brass = useMaterial('brass');
  const clock = useExhibitClock();
  const posts = useRef<InstancedMesh>(null);
  const beads = useRef<InstancedMesh>(null);
  const strips = useRef<InstancedMesh>(null);

  const postMatrices = useMemo(
    () =>
      POSTS.map(({ center, height }) =>
        new Matrix4().makeScale(1, height, 1).setPosition(...center),
      ),
    [],
  );
  const beadMatrices = useMemo(() => BEADS.map((c) => new Matrix4().setPosition(...c)), []);
  const stripMatrices = useMemo(() => STRIPS.map((c) => new Matrix4().setPosition(...c)), []);
  useInstances(posts, postMatrices);
  useInstances(beads, beadMatrices);
  useInstances(strips, stripMatrices);

  return (
    <MergeStatic name="climb">
      <RoundedBox
        name="tray"
        args={TRAY.size}
        radius={TRAY.radius}
        smoothness={TRAY.smoothness}
        bevelSegments={TRAY.bevelSegments}
        position={TRAY.center}
        material={walnut}
      />
      {TILES.map((i) => (
        <RoundedBox
          key={i}
          name={`tile-${i}`}
          args={TILE.size}
          radius={TILE.radius}
          smoothness={TILE.smoothness}
          bevelSegments={TILE.bevelSegments}
          position={tileCenter(i)}
          material={ceramic}
        />
      ))}
      <instancedMesh
        ref={posts}
        name="posts"
        args={[undefined, undefined, POSTS.length]}
        material={brass}
      >
        <cylinderGeometry args={[POST.radius, POST.radius, 1, POST.segments, 1, true]} />
      </instancedMesh>
      {TILES.map((i) => (
        <Check key={i} index={i} clock={clock} reducedMotion={runtime.reducedMotion} />
      ))}
      <instancedMesh
        ref={beads}
        name="team"
        args={[undefined, undefined, BEADS.length]}
        material={brass}
      >
        <sphereGeometry args={[BEAD.radius, BEAD.widthSegments, BEAD.heightSegments]} />
      </instancedMesh>
      <mesh name="crate" position={CRATE.center} material={walnut}>
        <boxGeometry args={[CRATE.size, CRATE.size, CRATE.size]} />
      </mesh>
      <instancedMesh
        ref={strips}
        name="crate-strips"
        args={[undefined, undefined, STRIPS.length]}
        material={brass}
      >
        <boxGeometry args={[STRIP.width, CRATE.size, STRIP.width]} />
      </instancedMesh>
    </MergeStatic>
  );
}
