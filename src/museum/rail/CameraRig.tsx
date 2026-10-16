// The rail camera (ARCHITECTURE §6.3 to §6.5, §6.7; EXPERIENCE §6.2 to §6.6). Every frame it damps
// `progress.current` toward the scroll target with maath (`tokens.motion.railSmoothTime`), or plays
// a scripted wing glide, or jumps (instant travel, before `ready`), then places the camera on the
// track's rail with `poseAt` and turns it toward the gaze point of gaze.ts with `easing.dampLookAt`
// (`tokens.motion.gazeSmoothTime`), adds the damped pointer parallax of parallax.ts on top, and
// frames the result by projection shift (framing.ts: FOV by aspect, `setViewOffset`, shift changes
// damped over 0.4 s). Under reduced motion it holds the last stop's pose and cuts to the next one
// once the scroll arrives. It writes `settled` and `stop` to the store, only on change,
// and registers the test hook's nav provider: goTo travels through navigation.ts (the same path as
// the UI) and resolves when settled at the stop; screenPos projects a hit-box center.
import { useFrame, useThree } from '@react-three/fiber';
import { easing } from 'maath';
import { useEffect, useState } from 'react';
import {
  Box3,
  Camera,
  Euler,
  Quaternion,
  Vector3,
  type Object3D,
  type PerspectiveCamera,
} from 'three';
import { useMuseum } from '../../app/store';
import { registerNavProvider, testParams } from '../../app/testHooks';
import type { ExhibitId, StopId } from '../../content/ids';
import { tokens } from '../../design/tokens';
import { LAYOUT } from '../../overlay/model';
import { reportCameraTarget } from '../quality/StatsProbe';
import { applyFraming, fovFor, framingFor, viewOffsetFor } from './framing';
import { gazeAt } from './gaze';
import {
  installParallax,
  PARALLAX_SMOOTH_S,
  parallaxAngles,
  parallaxEnabled,
  pointer,
} from './parallax';
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
/** The damped gaze orientation (a Camera, so `lookAt` points its -Z at the target). */
const aim = new Camera();
const forward = new Vector3();
const lastForward = new Vector3();
/** The damped view offset (fractions of the full view); `framed` once the first frame set it. */
const shift = { x: 0, y: 0, framed: false };
/** The damped parallax angles in radians. */
const sway = { yaw: 0, pitch: 0 };
const swayEuler = new Euler(0, 0, 0, 'YXZ');
const swayQuaternion = new Quaternion();
/** Parallax damping stops this close to its goal, in radians. */
const SWAY_EPS = 1e-4;

/** The open story panel's left edge as a fraction of the stage width, measured once per open. */
const panel = { openId: null as ExhibitId | null, width: 0, left: null as number | null };

function panelLeft(openId: ExhibitId | null, width: number): number | null {
  if (openId === null) {
    panel.openId = null;
    panel.left = null;
    return null;
  }
  if (panel.openId !== openId || panel.width !== width || panel.left === null) {
    // offsetLeft ignores transforms, so a panel that is still sliding in reads where it will rest.
    const dialog = document.querySelector<HTMLElement>('dialog[open]');
    panel.openId = openId;
    panel.width = width;
    panel.left = dialog && width > 0 ? dialog.offsetLeft / width : null;
  }
  return panel.left;
}

/** Forgets the damping velocity (after a jump or a glide, the walk starts from rest). */
function resetVelocity(): void {
  (progress as { __damp?: unknown }).__damp = undefined;
}

/** Turns the gaze straight to `target` and forgets its damping velocity. */
function snapGaze(target: Vector3): void {
  aim.lookAt(target);
  (aim.quaternion as { __damp?: unknown }).__damp = undefined;
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
  const [test] = useState(() => testParams(window.location.search).test);

  useEffect(() => {
    rig.attached = true;
    rig.teleport = true;
    shift.framed = false;
    const offWaker = setWaker(invalidate);
    const offParallax = installParallax(invalidate);
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
      offParallax();
      unregister();
    };
  }, [get, invalidate]);

  useFrame(({ camera, size }, delta) => {
    const state = useMuseum.getState();
    const glide = rig.glide;
    const dt = Math.min(delta, MAX_DELTA);
    // Jumps and reduced motion turn the gaze at once; walking and glides damp it.
    let jump = state.reducedMotion;
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
      jump = true;
    } else if (state.reducedMotion) {
      // No in-between poses: hold until the scroll target is (almost) a whole stop, then cut.
      if (Math.abs(progress.target - Math.round(progress.target)) < SETTLE.whole) {
        progress.current = progress.target;
      }
      resetVelocity();
    } else {
      easing.damp(progress, 'current', progress.target, tokens.motion.railSmoothTime, dt);
    }

    const rail = rails[progress.track];
    const p = state.reducedMotion && !glide ? Math.round(progress.current) : progress.current;
    poseAt(rail, p, position, look);
    gazeAt(rail, p, look);
    const movedM = camera.position.distanceTo(position);
    camera.position.copy(position);
    aim.position.copy(position);
    if (jump) snapGaze(look);
    else easing.dampLookAt(aim, look, tokens.motion.gazeSmoothTime, dt);
    // "Moved" covers the turn too: the gaze direction's change, in meters at 1 m. Parallax and
    // framing are not rail movement and never hold back the settle.
    forward.set(0, 0, -1).applyQuaternion(aim.quaternion);
    const moved = Math.max(movedM, forward.distanceTo(lastForward));
    lastForward.copy(forward);
    const lookDistance = position.distanceTo(look);

    // Parallax on top of the gaze (fine pointers only; never under reduced motion or ?test=1).
    const swayGoal = parallaxEnabled({
      fine: pointer.fine,
      reducedMotion: state.reducedMotion,
      test,
      dialogOpen: state.openId !== null,
    })
      ? parallaxAngles(pointer.nx, pointer.ny)
      : { yaw: 0, pitch: 0 };
    if (state.reducedMotion) {
      sway.yaw = 0;
      sway.pitch = 0;
    } else {
      easing.damp(sway, 'yaw', swayGoal.yaw, PARALLAX_SMOOTH_S, dt, Infinity, undefined, SWAY_EPS);
      easing.damp(
        sway,
        'pitch',
        swayGoal.pitch,
        PARALLAX_SMOOTH_S,
        dt,
        Infinity,
        undefined,
        SWAY_EPS,
      );
    }
    camera.quaternion.copy(aim.quaternion);
    if (sway.yaw !== 0 || sway.pitch !== 0) {
      camera.quaternion.multiply(
        swayQuaternion.setFromEuler(swayEuler.set(sway.pitch, sway.yaw, 0)),
      );
    }
    // The real target: where the camera looks, at the gaze point's distance.
    forward.set(0, 0, -1).applyQuaternion(camera.quaternion);
    const target = forward.multiplyScalar(lookDistance).add(camera.position);
    reportCameraTarget([target.x, target.y, target.z]);

    // Framing by projection shift (EXPERIENCE §6.2): FOV by aspect, the look-at point moved on screen.
    let framing = false;
    const lens = camera as PerspectiveCamera;
    if (lens.isPerspectiveCamera && size.width > 0 && size.height > 0) {
      const aspect = size.width / size.height;
      const goal = viewOffsetFor(framingFor(aspect, panelLeft(state.openId, size.width)));
      if (!shift.framed || state.reducedMotion) {
        shift.x = goal.x;
        shift.y = goal.y;
        shift.framed = true;
        (shift as { __damp?: unknown }).__damp = undefined;
      } else {
        const smooth = tokens.motion.framingSmoothS;
        easing.damp(shift, 'x', goal.x, smooth, dt);
        easing.damp(shift, 'y', goal.y, smooth, dt);
      }
      applyFraming(lens, fovFor(aspect), shift, size.width, size.height);
      framing = shift.x !== goal.x || shift.y !== goal.y;
    }
    const animating = framing || sway.yaw !== swayGoal.yaw || sway.pitch !== swayGoal.pitch;

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
    if (animating) invalidate();
  });

  return null;
}
