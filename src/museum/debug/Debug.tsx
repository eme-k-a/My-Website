// The ?debug panel (ARCHITECTURE §15.1), lazy-loaded by QualityController into its own chunk; the
// only place leva and r3f-perf may be imported (check-budgets fails if either reaches the entry or
// museum chunk). It is a tuning aid, never part of the product:
// - leva: tier override (sets ?tier= and reloads, because the tier is fixed per session), a
//   progress slider, railSmoothTime, spotlight and light-pool intensity factors, the reflector mix,
//   and toggles for stop markers, slot bounds boxes and the rail curve;
// - r3f-perf in the top-left corner (calls, triangles, GPU time, programs);
// - `F` toggles a free OrbitControls camera that detaches the view from CameraRig (debug-only key;
//   ignored with modifiers, in form fields and while the story dialog is open).
import { Line } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls } from 'leva';
import { Perf } from 'r3f-perf';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box3,
  Color,
  Vector3,
  type Material,
  type Object3D,
  type PerspectiveCamera,
  type SpotLight,
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useMuseum } from '../../app/store';
import { tokens } from '../../design/tokens';
import { galleryLayout } from '../environment/gallery';
import { slotOrigin } from '../exhibits/_kit/anatomy';
import { progress, wake } from '../rail/progress';
import { QUALITY_TIERS } from '../quality/tiers';

type Vec3 = [number, number, number];

const MARKER_COLOR = '#7FD1C7';
const BOUNDS_COLOR = new Color('#D98B4A');
const TRACK_COLORS = { main: '#B08D57', projects: '#7FD1C7', volunteer: '#C9A0DC' } as const;

/** Every material in the scene, once. */
function sceneMaterials(scene: Object3D): Material[] {
  const found = new Set<Material>();
  scene.traverse((object) => {
    const material = (object as { material?: Material | Material[] }).material;
    if (Array.isArray(material)) material.forEach((m) => found.add(m));
    else if (material) found.add(material);
  });
  return [...found];
}

/** Scales a numeric property from the value it had the first time the panel touched it. */
function scaleFromBase(target: object, key: string, factor: number): void {
  const record = target as Record<string, unknown> & { userData?: Record<string, unknown> };
  const value = record[key];
  if (typeof value !== 'number') return;
  const store = (record.userData ??= {});
  const baseKey = `debugBase:${key}`;
  if (typeof store[baseKey] !== 'number') store[baseKey] = value;
  record[key] = (store[baseKey] as number) * factor;
}

function isFormField(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

/** `F` toggles the free camera (debug-only key). */
function useFreeCameraKey(): boolean {
  const [free, setFree] = useState(false);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'f' && event.key !== 'F') return;
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (isFormField(event.target) || useMuseum.getState().openId !== null) return;
      setFree((on) => !on);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return free;
}

/**
 * A free camera that starts where the rig camera is. While it is on, a priority-1 frame callback
 * renders the scene through it, so CameraRig keeps driving its own (now unseen) camera. Rotate
 * and pan by dragging over the page; zoom is off, so the wheel still scrolls the page natively.
 */
function FreeCamera() {
  const get = useThree((s) => s.get);
  const free = useRef<PerspectiveCamera | null>(null);

  useEffect(() => {
    const { camera: rig, invalidate } = get();
    const source = document.getElementById('app');
    if (!source) return;
    const camera = rig.clone() as PerspectiveCamera;
    const controls = new OrbitControls(camera, source);
    controls.enableZoom = false;
    controls.target.copy(rig.getWorldDirection(new Vector3()).add(rig.position));
    controls.update();
    // OrbitControls sets touch-action on its element; native page scrolling must stay untouched.
    source.style.touchAction = '';
    const onChange = () => invalidate();
    controls.addEventListener('change', onChange);
    free.current = camera;
    invalidate();
    return () => {
      controls.removeEventListener('change', onChange);
      controls.dispose();
      source.style.touchAction = '';
      free.current = null;
      invalidate();
    };
  }, [get]);

  useFrame(({ gl, scene, camera: rig, size }) => {
    const camera = free.current;
    if (!camera) {
      gl.render(scene, rig);
      return;
    }
    const aspect = size.width / Math.max(1, size.height);
    if (camera.aspect !== aspect) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    gl.render(scene, camera);
  }, 1);

  return null;
}

function StopMarkers({ positions }: { positions: Vec3[] }) {
  return (
    <group name="debug-stop-markers">
      {positions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.08, 12, 8]} />
          <meshBasicMaterial color={MARKER_COLOR} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function SlotBounds() {
  const slots = useMemo(
    () =>
      galleryLayout().slots.map((slot) => ({
        id: slot.id,
        origin: slotOrigin(slot),
        rotationY: slot.rotationY,
        box: new Box3(new Vector3(...slot.bounds.min), new Vector3(...slot.bounds.max)),
      })),
    [],
  );
  return (
    <group name="debug-slot-bounds">
      {slots.map((s) => (
        <group key={s.id} position={s.origin} rotation-y={s.rotationY}>
          <box3Helper args={[s.box, BOUNDS_COLOR]} />
        </group>
      ))}
    </group>
  );
}

function RailCurves() {
  const tracks = useMemo(() => Object.entries(galleryLayout().tracks), []);
  return (
    <group name="debug-rail">
      {tracks.map(([track, { stops }]) =>
        stops.length > 1 ? (
          <Line
            key={track}
            points={stops.map((s) => s.camera)}
            color={TRACK_COLORS[track as keyof typeof TRACK_COLORS] ?? MARKER_COLOR}
            lineWidth={2}
          />
        ) : null,
      )}
    </group>
  );
}

export default function Debug() {
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const tier = useMuseum((s) => s.tier);
  const track = useMuseum((s) => s.track);
  const layout = useMemo(() => galleryLayout(), []);
  const stopCount = layout.tracks[track].stops.length;
  const free = useFreeCameraKey();

  const toggles = useControls('Quality', {
    tier: {
      value: tier,
      options: [...QUALITY_TIERS],
      onChange: (value: string, _path, context) => {
        if (context.initial || value === useMuseum.getState().tier) return;
        const url = new URL(window.location.href);
        url.searchParams.set('tier', value);
        window.location.replace(url.toString());
      },
    },
    progress: {
      value: progress.target,
      min: 0,
      max: Math.max(0, stopCount - 1),
      step: 0.01,
      onChange: (value: number, _path, context) => {
        if (context.initial) return;
        progress.target = value;
        wake();
      },
    },
    railSmoothTime: {
      value: tokens.motion.railSmoothTime,
      min: 0.05,
      max: 1.5,
      step: 0.01,
      onChange: (value: number) => {
        (tokens.motion as { railSmoothTime: number }).railSmoothTime = value;
      },
    },
    spotlights: {
      value: 1,
      min: 0,
      max: 3,
      step: 0.05,
      label: 'spotlight x',
      onChange: (value: number, _path, context) => {
        if (context.initial) return;
        scene.traverse((object) => {
          if ((object as SpotLight).isSpotLight) scaleFromBase(object, 'intensity', value);
        });
        invalidate();
      },
    },
    lightPools: {
      value: 1,
      min: 0,
      max: 3,
      step: 0.05,
      label: 'pools x',
      onChange: (value: number, _path, context) => {
        if (context.initial) return;
        for (const material of sceneMaterials(scene)) {
          if ((material as { lightMap?: unknown }).lightMap) {
            scaleFromBase(material, 'lightMapIntensity', value);
          }
        }
        invalidate();
      },
    },
    reflectorMix: {
      value: 1.5,
      min: 0,
      max: 4,
      step: 0.05,
      onChange: (value: number, _path, context) => {
        if (context.initial) return;
        for (const material of sceneMaterials(scene)) {
          const reflector = material as { mixStrength?: number };
          if (typeof reflector.mixStrength === 'number') reflector.mixStrength = value;
        }
        invalidate();
      },
    },
    stopMarkers: false,
    slotBounds: false,
    railCurve: false,
  });

  const markers = useMemo(
    () => Object.values(layout.tracks).flatMap(({ stops }) => stops.map((s) => s.camera)),
    [layout],
  );

  // Helpers appear and disappear on the next frame, even in a stopped demand loop.
  useEffect(
    () => invalidate(),
    [toggles.stopMarkers, toggles.slotBounds, toggles.railCurve, free, invalidate],
  );

  return (
    <>
      <Perf position="top-left" />
      {toggles.stopMarkers && <StopMarkers positions={markers} />}
      {toggles.slotBounds && <SlotBounds />}
      {toggles.railCurve && <RailCurves />}
      {free && <FreeCamera />}
    </>
  );
}
