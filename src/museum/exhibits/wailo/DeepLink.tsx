// Exhibit No. 03, "The Deep Link" (EXPERIENCE §4.3): a graphite phone leans back in a walnut
// stand while one glowing link arcs into its screen from a paper envelope; the screen answers with
// a blank paper reset card (a brass key glyph and a glowing reset bar). A blank brass tag on a
// chain marks the App Store release. Shared library materials only, no lights, no text. One slow
// motion: a pulse rides the arc, then the reset bar flashes, on an 8 s loop driven only by
// useExhibitClock(). Under reduced motion, ?test=1 and tier low the pulse is hidden and the bar
// holds 1.0. Measurements live in ./link.
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TubeGeometry, Vector3, type Mesh, type MeshStandardMaterial } from 'three';
import {
  MergeStatic,
  useExhibitClock,
  useMaterial,
  useMaterialInstance,
  type ExhibitProps,
} from '../_kit';
import { clockFrozen } from '../_kit/clock';
import {
  ARC,
  arcCurve,
  BAR,
  CARD,
  chainPlacement,
  CHAIN,
  deliveryPose,
  envelopeCenter,
  ENVELOPE,
  ENVELOPE_ROTATION,
  flapGeometry,
  FLAP_HINGE,
  GLOW,
  GLYPH,
  PHONE,
  phonePosition,
  PHONE_ROTATION,
  PULSE,
  roundedSlab,
  SCREEN,
  STAND,
  TAG,
  tagCenter,
  TAG_ROTATION,
  TRAY,
  wedgeGeometry,
} from './link';

const DEG = Math.PI / 180;
const CURVE = arcCurve();
const PHONE_POSITION = phonePosition();
const ENVELOPE_CENTER = envelopeCenter();
const TAG_CENTER = tagCenter();
const CHAIN_PLACEMENT = chainPlacement();
const SHAFT_LENGTH = GLYPH.shaft.to - GLYPH.shaft.from;

export default function DeepLink({ runtime }: ExhibitProps) {
  const walnut = useMaterial('walnut');
  const graphite = useMaterial('ceramicGraphite');
  const frostedGlass = useMaterial('frostedGlass');
  const paper = useMaterial('paper');
  const brass = useMaterial('brass');
  // Clones share the compiled program: the arc and the pulse hold their own steady levels, and
  // the reset bar animates its own.
  const arcGlow = useMaterialInstance('accentGlow');
  const pulseGlow = useMaterialInstance('accentGlow');
  const barGlow = useMaterialInstance('accentGlow');
  const clock = useExhibitClock();
  const [frozen] = useState(() =>
    typeof window === 'undefined' ? false : clockFrozen(window.location.search),
  );
  const still = runtime.reducedMotion || frozen || runtime.tier === 'low';
  const pulse = useRef<Mesh>(null);
  const barMesh = useRef<Mesh>(null);
  const point = useMemo(() => new Vector3(), []);

  const geometry = useMemo(
    () => ({
      phone: roundedSlab(
        PHONE.size[0],
        PHONE.size[1],
        PHONE.size[2],
        PHONE.radius,
        PHONE.bevel,
        PHONE.curveSegments,
        PHONE.bevelSegments,
      ),
      tag: roundedSlab(
        TAG.size[0],
        TAG.size[1],
        TAG.size[2],
        TAG.radius,
        TAG.bevel,
        TAG.curveSegments,
        TAG.bevelSegments,
      ),
      wedge: wedgeGeometry(),
      flap: flapGeometry(),
      arc: new TubeGeometry(CURVE, ARC.tubularSegments, ARC.radius, ARC.radialSegments, false),
    }),
    [],
  );
  useLayoutEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry]);

  // Writes the pulse and the bar only when they change, so a held pose leaves them untouched.
  const apply = useCallback(
    (t: number) => {
      const pose = deliveryPose(t, still);
      const bar = barMesh.current?.material as MeshStandardMaterial | undefined;
      if (bar && bar.emissiveIntensity !== pose.bar) bar.emissiveIntensity = pose.bar;
      const mesh = pulse.current;
      if (!mesh) return;
      const visible = pose.pulseScale > 0;
      if (mesh.visible !== visible) mesh.visible = visible;
      if (!visible) return;
      CURVE.getPointAt(pose.pulseU, point);
      mesh.position.copy(point);
      mesh.scale.setScalar(pose.pulseScale);
    },
    [point, still],
  );

  // The first pose is in place before the kit compiles and reveals the exhibit.
  useLayoutEffect(() => apply(clock.current), [apply, clock]);
  useFrame(() => apply(clock.current));

  return (
    <group name="deep-link">
      <MergeStatic>
        <RoundedBox
          name="tray"
          args={TRAY.size}
          radius={TRAY.radius}
          smoothness={TRAY.smoothness}
          bevelSegments={TRAY.bevelSegments}
          position={TRAY.center}
          material={walnut}
        />
        <mesh
          name="stand"
          geometry={geometry.wedge}
          position-x={STAND.center[0]}
          material={walnut}
        />
        <group name="phone" position={PHONE_POSITION} rotation={PHONE_ROTATION}>
          <mesh name="body" geometry={geometry.phone} material={graphite} />
          <mesh name="screen" position-z={SCREEN.z} material={frostedGlass}>
            <planeGeometry args={SCREEN.size} />
          </mesh>
          <RoundedBox
            name="reset-card"
            args={CARD.size}
            radius={CARD.radius}
            smoothness={2}
            bevelSegments={1}
            position-z={CARD.z}
            material={paper}
          />
          <mesh name="glyph-bow" position={[GLYPH.bow.x, GLYPH.y, GLYPH.z]} material={brass}>
            <torusGeometry
              args={[
                GLYPH.bow.radius,
                GLYPH.bow.tube,
                GLYPH.bow.radialSegments,
                GLYPH.bow.tubularSegments,
              ]}
            />
          </mesh>
          <mesh
            name="glyph-shaft"
            position={[GLYPH.shaft.from + SHAFT_LENGTH / 2, GLYPH.y, GLYPH.z]}
            rotation-z={Math.PI / 2}
            material={brass}
          >
            <cylinderGeometry
              args={[GLYPH.shaft.radius, GLYPH.shaft.radius, SHAFT_LENGTH, GLYPH.shaft.segments]}
            />
          </mesh>
          <mesh ref={barMesh} name="reset-bar" position={[0, BAR.y, BAR.z]} material={barGlow}>
            <boxGeometry args={BAR.size} />
          </mesh>
        </group>
        <group name="envelope" position={ENVELOPE_CENTER} rotation={ENVELOPE_ROTATION}>
          <mesh name="body" material={paper}>
            <boxGeometry args={ENVELOPE.size} />
          </mesh>
          <mesh
            name="flap"
            geometry={geometry.flap}
            position={FLAP_HINGE}
            rotation-x={-ENVELOPE.flap.liftDeg * DEG}
            material={paper}
          />
        </group>
        <mesh
          name="link-arc"
          geometry={geometry.arc}
          material={arcGlow}
          material-emissiveIntensity={GLOW.arc}
        />
        <mesh
          name="tag"
          geometry={geometry.tag}
          position={TAG_CENTER}
          rotation={TAG_ROTATION}
          material={brass}
        />
        <mesh
          name="chain"
          position={CHAIN_PLACEMENT.position}
          quaternion={CHAIN_PLACEMENT.quaternion}
          material={brass}
        >
          <cylinderGeometry
            args={[CHAIN.radius, CHAIN.radius, CHAIN_PLACEMENT.length, CHAIN.segments]}
          />
        </mesh>
      </MergeStatic>
      {/* The pulse moves along the arc, so it stays out of the merge. */}
      <mesh
        name="pulse"
        ref={pulse}
        visible={false}
        material={pulseGlow}
        material-emissiveIntensity={GLOW.pulse}
      >
        <sphereGeometry args={[PULSE.radius, PULSE.widthSegments, PULSE.heightSegments]} />
      </mesh>
    </group>
  );
}
