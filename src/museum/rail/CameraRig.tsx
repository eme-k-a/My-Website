// The rail camera (ARCHITECTURE §6.3, §6.7; EXPERIENCE §6.2, §6.4). Every frame it damps
// `progress.current` toward the scroll target with maath (`tokens.motion.railSmoothTime`), or plays
// a scripted wing glide, or jumps (instant travel, before `ready`), then places the camera on the
// track's rail with `poseAt` and looks at the blended stop look-at (the full gaze, framing and
// parallax are WP-15). Under reduced motion it holds the last stop's pose and cuts to the next one
// once the scroll arrives (WP-15 adds the fade). It writes `settled` and `stop` to the store, only
// on change, and registers the test hook's nav provider: goTo travels through navigation.ts (the
// same path as the UI) and resolves when settled at the stop; screenPos projects a hit-box center.
import { useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';
import { useEffect } from 'react';
import { Box3, Vector3, type Object3D } from 'three';
import { useMuseum } from '../../app/store';
import { registerNavProvider } from '../../app/testHooks';
import type { ExhibitId, StopId } from '../../content/ids';
import { tokens } from '../../design/tokens';
import { LAYOUT } from '../../overlay/model';
import { reportCameraTarget } from '../quality/StatsProbe';
import { travelTo } from './navigation';
import { easeInOutCubic, finishGlide, progress, rig, setWaker } from './progress';
import { buildRails, poseAt } from './rail';
import { SETTLE, settledStop } from './settle';

const rails = buildRails(LAYOUT);

/** Largest frame step fed to the damping, in seconds. */
const MAX_DELTA = 0.1;

const position = new Vector3();
const look = new Vector3();
const box = new Box3();
const projected = new Vector3();

/** Forgets the damping velocity (after a jump or a glide, the walk starts from rest). */
function resetVelocity(): void {
  (progress as { __damp?: unknown }).__damp = undefined;
}

/** Waits until the store reports `settled` at `id`. */
function settledAt(id: StopId): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      const s = useMuseum.getState();
      return s.settled && s.stop === id;
    };
    if (check()) {
      resolve();
      return;
    }
    const unsubscribe = useMuseum.subscribe(() => {
      if (!check()) return;
      unsubscribe();
      resolve();
    });
  });
}

/** The layout center of an exhibit's case: its stop's look-at point is the slot center. */
function layoutCenter(id: ExhibitId): Vector3 | null {
  for (const track of Object.values(LAYOUT.tracks)) {
    const stop = track.stops.find((s) => s.id === id);
    if (stop) return new Vector3(...stop.look);
  }
  return null;
}

/** Whether the stats probe lists the exhibit as mounted (only under ?test=1). */
function listedAsMounted(id: ExhibitId): boolean {
  try {
    return window.__MUSEUM__?.stats().mounted.includes(id) ?? false;
  } catch {
    return false;
  }
}

/** World center of the exhibit's hit box (ExhibitFrame names it `hit-<id>`), or null. */
function hitCenter(scene: Object3D, id: ExhibitId): Vector3 | null {
  const hit = scene.getObjectByName(`hit-${id}`);
  if (hit) {
    hit.updateWorldMatrix(true, true);
    box.setFromObject(hit);
    return box.isEmpty() ? hit.getWorldPosition(new Vector3()) : box.getCenter(new Vector3());
  }
  return listedAsMounted(id) ? layoutCenter(id) : null;
}

export function CameraRig() {
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    rig.attached = true;
    rig.teleport = true;
    const offWaker = setWaker(invalidate);
    const unregister = registerNavProvider({
      async goTo(id, opts) {
        await travelTo(id, opts);
        await settledAt(id);
      },
      screenPos(id) {
        const { camera, scene, gl } = get();
        const center = hitCenter(scene, id);
        if (!center) return null;
        camera.updateMatrixWorld();
        projected.copy(center).project(camera);
        if (projected.z < -1 || projected.z > 1) return null;
        const rect = gl.domElement.getBoundingClientRect();
        const x = rect.left + ((projected.x + 1) / 2) * rect.width;
        const y = rect.top + ((1 - projected.y) / 2) * rect.height;
        if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return null;
        return { x, y };
      },
    });
    invalidate();
    return () => {
      rig.attached = false;
      finishGlide();
      offWaker();
      unregister();
    };
  }, [get, invalidate]);

  useFrame(({ camera }, delta) => {
    const state = useMuseum.getState();
    const glide = rig.glide;
    if (glide) {
      const now = performance.now();
      glide.start ??= now;
      const t = Math.min(1, (now - glide.start) / glide.ms);
      progress.current = glide.from + (glide.to - glide.from) * easeInOutCubic(t);
      rig.teleport = false;
      resetVelocity();
      if (t >= 1) finishGlide();
    } else if (rig.teleport || !state.ready) {
      // Instant travel, and everything before the canvas is revealed: no fly-through at load.
      progress.current = progress.target;
      rig.teleport = false;
      resetVelocity();
    } else if (state.reducedMotion) {
      // No in-between poses: hold until the scroll target is (almost) a whole stop, then cut.
      if (Math.abs(progress.target - Math.round(progress.target)) < SETTLE.whole) {
        progress.current = progress.target;
      }
      resetVelocity();
    } else {
      easing.damp(
        progress,
        'current',
        progress.target,
        tokens.motion.railSmoothTime,
        Math.min(delta, MAX_DELTA),
      );
    }

    const rail = rails[progress.track];
    const p = state.reducedMotion && !glide ? Math.round(progress.current) : progress.current;
    poseAt(rail, p, position, look);
    const moved = camera.position.distanceTo(position);
    camera.position.copy(position);
    camera.lookAt(look);
    reportCameraTarget([look.x, look.y, look.z]);

    const index = settledStop({
      current: progress.current,
      target: progress.target,
      moved,
      compilePending: state.compilePending,
      gliding: rig.glide !== null,
    });
    if (index !== null) {
      const stop = rail.stops[index]?.id;
      const patch: { settled?: boolean; stop?: StopId } = {};
      if (!state.settled) patch.settled = true;
      if (stop && stop !== state.stop) patch.stop = stop;
      if (patch.settled !== undefined || patch.stop !== undefined) useMuseum.setState(patch);
    } else {
      if (state.settled) useMuseum.setState({ settled: false });
      invalidate();
    }
  });

  return null;
}
