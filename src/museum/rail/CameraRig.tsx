// The rail camera (ARCHITECTURE §6.3 to §6.5, §6.7; EXPERIENCE §6.2 to §6.6). Every frame it damps
// `progress.current` toward the scroll target with maath (`tokens.motion.railSmoothTime`), or plays
// a scripted wing glide, or jumps (instant travel, before `ready`), then places the camera on the
// track's rail with `poseAt` and turns it toward the gaze point of gaze.ts with `easing.dampLookAt`
// (`tokens.motion.gazeSmoothTime`), adds the damped pointer parallax of parallax.ts on top, and
// frames the result by projection shift (framing.ts: FOV by aspect, `setViewOffset`, shift changes
// damped over 0.4 s). An open story dollies the camera 0.6 m toward the case (dolly.ts). Under
// reduced motion there is no damping and no in-between pose: the camera holds the last stop and,
// once the scroll arrives at another, cuts to it behind ScrollTrack's ink fade (fade.ts). It
// writes `settled` and `stop` to the store, only on change, asks the demand loop for frames only
// while the camera still moves (settle.ts `railNeedsFrame`, also at rest between stops), damps
// with the real frame time while it moves (`rigStep`), and registers the test hook's nav
// provider: goTo travels through navigation.ts (the same path as the UI) and resolves when settled
// at the stop; screenPos projects a hit-box center.
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
import { TEST_IDS } from '../../app/testIds';
import { registerNavProvider, testParams } from '../../app/testHooks';
import { doorId, type ExhibitId, type StopId, type TrackId } from '../../content/ids';
import { tokens } from '../../design/tokens';
import { LAYOUT } from '../../overlay/model';
import { caseBox, EDGE_THICKNESS, slotMatrix, slotVariant } from '../exhibits/_kit/anatomy';
import { slotPlacard } from '../exhibits/_kit/placard';
import { SERIF_NUMBER_ADVANCE } from '../exhibits/_kit/titleMetrics';
import { reportCameraTarget } from '../quality/StatsProbe';
import { aimDolly, createDolly, stepDolly } from './dolly';
import { fadeCut } from './fade';
import {
  applyFraming,
  DESK_PORTRAIT_Y,
  deskPortraitY,
  deskWeightAt,
  doorCorners,
  doorFov,
  doorPortraitX,
  horizontalTangents,
  lobbyWeightAt,
  framingFor,
  HUD_ROW_BOTTOM,
  numberTopCorners,
  stopWeightAt,
  titleBottomCorners,
  titleClearDolly,
  titleTopCorners,
  topTangent,
  viewOffsetFor,
  WING_HEAD_BOTTOM,
  wingPortraitY,
} from './framing';
import { gazeAt } from './gaze';
import {
  installParallax,
  PARALLAX_SMOOTH_S,
  parallaxAngles,
  parallaxEnabled,
  pointer,
} from './parallax';
import { travelTo } from './navigation';
import { easeInOutCubic, finishGlide, progress, rig, setWaker, wake } from './progress';
import type { Vec3 } from './layout';
import { DOOR_H } from './layout';
import { buildRails, poseAt } from './rail';
import { railNeedsFrame, rigStep, SETTLE, settledStop } from './settle';

const rails = buildRails(LAYOUT);

/**
 * Whether the rig asked for the frame being rendered (it was still moving in the previous one).
 * Such a frame damps with its real duration; the first frame after a rest damps over the time
 * since the wake-up that started it (rigStep).
 */
let requested = false;

const position = new Vector3();
const look = new Vector3();
/** The rail position of the previous frame (the settle's "moved" ignores the dolly). */
const lastRail = new Vector3();
const toCase = new Vector3();
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

/** The dialog dolly (EXPERIENCE §6.5). */
const dolly = createDolly();

/**
 * Reduced motion (EXPERIENCE §6.6): the stop whose pose the camera holds, the whole stop the scroll
 * last arrived at (`next`), and the fade-cut in progress (`cutting`; `swap` once it reached ink).
 */
interface Held {
  track: TrackId;
  index: number;
}
const hold = {
  at: { track: 'main', index: 0 } as Held,
  next: null as Held | null,
  cutting: false,
  swap: false,
};
const heldId = (h: Held) => rails[h.track].stops[h.index]?.id;
/** Each track's stop ids, for the desk and lobby framing (framing.ts `deskWeightAt`). */
const railIds = new Map<string, readonly string[]>(
  Object.entries(rails).map(([track, rail]) => [track, rail.stops.map((s) => s.id)]),
);

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

/**
 * The portrait desk band (F-020, framing.ts `deskPortraitY`), measured from the DOM: the HUD
 * header's bottom, and how far the desk card's top rises above the bottom of its slot. At the desk
 * stop the slot fills the viewport, so the card's top on the canvas is the canvas height less
 * `rise`. Measured when the rig mounts and whenever the card, its slot or the HUD resizes.
 */
const deskBand = { hud: 0, rise: 0, ok: false };

function deskElements(): {
  card: HTMLElement | null;
  slot: HTMLElement | null;
  hud: HTMLElement | null;
} {
  const card = document.querySelector<HTMLElement>(`[data-testid="${TEST_IDS.card('desk')}"]`);
  const hud = document.querySelector<HTMLElement>(`[data-testid="${TEST_IDS.hud}"]`);
  return { card, slot: card?.parentElement ?? null, hud };
}

/** Re-measures the desk band; true when it changed. */
function measureDeskBand(): boolean {
  const { card, slot, hud } = deskElements();
  const before = `${deskBand.hud}|${deskBand.rise}|${deskBand.ok}`;
  if (card && slot) {
    deskBand.rise = slot.getBoundingClientRect().bottom - card.getBoundingClientRect().top;
    deskBand.hud = hud ? hud.getBoundingClientRect().bottom : 0;
    deskBand.ok = deskBand.rise > 0;
  } else {
    deskBand.ok = false;
  }
  return before !== `${deskBand.hud}|${deskBand.rise}|${deskBand.ok}`;
}

/** The portrait framing height at the desk for a canvas `height` px tall. */
function deskFramingY(height: number, fov: number): number {
  if (!deskBand.ok) return DESK_PORTRAIT_Y;
  return deskPortraitY({ height, top: deskBand.hud, bottom: height - deskBand.rise }, fov);
}

/**
 * Each exhibit's wall-title top seen from its stop (F-039 for the wing exhibits, F-048 for the
 * main aisle; framing.ts `topTangent`), from the placard Placard.tsx draws there.
 */
const titleTan = new Map<string, number>(
  LAYOUT.slots
    .filter((slot) => slot.mount === 'plinth' || slot.mount === 'wall')
    .flatMap((slot) => {
      const pose = LAYOUT.tracks[slot.track]?.stops.find((s) => s.id === slot.id);
      if (!pose) return [];
      const spec = slotPlacard(LAYOUT, slot);
      // Main-aisle titles are framed from the number's own top (F-048); the wing exhibits keep
      // the widest-line bound F-039 was tuned with.
      const corners =
        slot.track === 'main'
          ? numberTopCorners(spec, SERIF_NUMBER_ADVANCE)
          : titleTopCorners(spec);
      const tan = topTangent(pose.camera, pose.look, corners);
      return Number.isFinite(tan) ? [[slot.id as string, tan] as const] : [];
    }),
);

/**
 * The dialog dolly at each wing exhibit (F-042, framing.ts `titleClearDolly`): the longest move,
 * up to `dialogDollyM`, that keeps the wall title's last line above the case top (its brass edge
 * included). Main-aisle exhibits are not listed and keep the full dolly.
 */
const wingDolly = new Map<string, number>(
  LAYOUT.slots
    .filter((slot) => slot.track !== 'main' && slot.mount === 'plinth')
    .flatMap((slot) => {
      const pose = LAYOUT.tracks[slot.track]?.stops.find((s) => s.id === slot.id);
      if (!pose) return [];
      const glass = caseBox(slotVariant(slot));
      const frame = slotMatrix(slot);
      const topY = glass.center[1] + glass.size[1] / 2 + EDGE_THICKNESS / 2;
      const tops = [-1, 1].flatMap((sx) =>
        [-1, 1].map(
          (sz) =>
            new Vector3(
              glass.center[0] + (sx * glass.size[0]) / 2,
              topY,
              glass.center[2] + (sz * glass.size[2]) / 2,
            )
              .applyMatrix4(frame)
              .toArray() as Vec3,
        ),
      );
      const bottoms = titleBottomCorners(slotPlacard(LAYOUT, slot));
      const max = tokens.camera.dialogDollyM;
      return [[slot.id as string, titleClearDolly(pose.camera, pose.look, bottoms, tops, max)]];
    }),
);
/**
 * Each wing door's projected span seen from its stop (F-051, framing.ts `horizontalTangents` of
 * `doorCorners`), for the portrait door framing.
 */
const doorSpan = new Map<string, [number, number]>(
  LAYOUT.doors.flatMap((door) => {
    const id = doorId(door.wing);
    const pose = LAYOUT.tracks.main.stops.find((s) => s.id === id);
    if (!pose) return [];
    const corners = doorCorners(door.side, door.z, door.width, DOOR_H);
    return [[id as string, horizontalTangents(pose.camera, pose.look, corners)] as const];
  }),
);

/** The dolly scale of the story being shown (kept while the dolly runs back after a close). */
let dollyScale = 1;

/**
 * The wing head (the wing chip and the exit control, ProgressRail): its bottom in CSS px, measured
 * when it mounts and whenever it resizes, for the portrait wing framing (F-039).
 */
const wingHead = { el: null as HTMLElement | null, bottom: 0 };
let wingHeadSizes: ResizeObserver | null = null;

/** Re-measures the mounted wing head; true when its bottom changed. */
function measureWingHead(): boolean {
  const before = wingHead.bottom;
  wingHead.bottom = wingHead.el?.isConnected ? wingHead.el.getBoundingClientRect().bottom : 0;
  return before !== wingHead.bottom;
}

/** The wing head's bottom, finding it again after it remounts; WING_HEAD_BOTTOM until it shows. */
function wingHeadBottom(onResize: () => void): number {
  if (!wingHead.el?.isConnected) {
    const exit = document.querySelector<HTMLElement>(`[data-testid="${TEST_IDS.exitWing}"]`);
    wingHead.el = exit?.parentElement ?? null;
    wingHeadSizes?.disconnect();
    if (wingHead.el && typeof ResizeObserver !== 'undefined') {
      wingHeadSizes ??= new ResizeObserver(onResize);
      wingHeadSizes.observe(wingHead.el);
    }
    measureWingHead();
  }
  return wingHead.bottom > 0 ? wingHead.bottom : WING_HEAD_BOTTOM;
}

/**
 * The bottom of the HUD's top row in CSS px (its lowest visible control), measured when the rig
 * mounts and whenever the HUD resizes, for the portrait framing of main-aisle exhibits (F-048).
 */
const hudRow = { bottom: 0 };

/** Re-measures the HUD's top row; true when its bottom changed. */
function measureHudRow(): boolean {
  const before = hudRow.bottom;
  const hud = document.querySelector<HTMLElement>(`[data-testid="${TEST_IDS.hud}"]`);
  let bottom = 0;
  for (const el of hud?.querySelectorAll<HTMLElement>(':scope > *') ?? []) {
    const r = el.getBoundingClientRect();
    // The skip link waits above the viewport until it is focused.
    if (r.height > 0 && r.top >= 0) bottom = Math.max(bottom, r.bottom);
  }
  hudRow.bottom = bottom;
  return before !== hudRow.bottom;
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

/**
 * The front desk's point for `screenPos('desk')` (F-020): the center of its four object hit boxes
 * (Desk.tsx names them `desk-<action>`), so specs can check the desk top against the phone card.
 * The hook's type stays `ExhibitId` (contracts-v1); a spec passes 'desk' with a cast.
 */
const DESK_ACTIONS = ['email', 'linkedin', 'pdf', 'github'] as const;
function deskCenter(scene: Object3D): Vector3 | null {
  const desk = scene.getObjectByName('desk');
  if (!desk) return null;
  desk.updateWorldMatrix(true, true);
  box.makeEmpty();
  for (const action of DESK_ACTIONS) {
    const hit = desk.getObjectByName(`desk-${action}`);
    if (hit) box.expandByObject(hit);
  }
  return box.isEmpty() ? null : box.getCenter(new Vector3());
}

/** World center of the exhibit's hit box (ExhibitFrame names it `hit-<id>`), or null. */
function hitCenter(scene: Object3D, id: ExhibitId): Vector3 | null {
  if ((id as string) === 'desk') return deskCenter(scene);
  const hit = scene.getObjectByName(`hit-${id}`);
  if (hit) {
    hit.updateWorldMatrix(true, true);
    box.setFromObject(hit);
    return box.isEmpty() ? hit.getWorldPosition(new Vector3()) : box.getCenter(new Vector3());
  }
  return listedAsMounted(id) ? layoutCenter(id) : null;
}

/**
 * Reduced motion (EXPERIENCE §6.6, ARCHITECTURE §6.5): no damping and no in-between poses. The
 * camera holds its stop while the visitor scrolls; once the scroll target is (within 0.02 of) a
 * different whole stop, the ink fade starts, the held stop swaps to the latest arrival at ink, and
 * the fade clears. Returns the stop to show this frame.
 */
function holdStop(): Held {
  const nearest = Math.round(progress.target);
  if (Math.abs(progress.target - nearest) < SETTLE.whole) {
    const last = rails[progress.track].stops.length - 1;
    hold.next = { track: progress.track, index: Math.max(0, Math.min(last, nearest)) };
  }
  if (hold.swap) {
    hold.swap = false;
    if (hold.next) hold.at = hold.next;
  } else if (!hold.cutting && hold.next && heldId(hold.next) === heldId(hold.at)) {
    // The same stop on another track (a wing door): the pose is identical, nothing to cut.
    hold.at = hold.next;
  } else if (!hold.cutting && hold.next) {
    hold.cutting = true;
    void fadeCut(() => {
      hold.swap = true;
      wake();
    }).then(() => {
      hold.cutting = false;
      wake();
    });
  }
  if (hold.at.track === progress.track) progress.current = hold.at.index;
  return hold.at;
}

export function CameraRig() {
  const get = useThree((s) => s.get);
  const invalidate = useThree((s) => s.invalidate);
  const [test] = useState(() => testParams(window.location.search).test);
  const onWingHeadResize = () => {
    if (measureWingHead()) invalidate();
  };

  useEffect(() => {
    rig.attached = true;
    rig.teleport = true;
    shift.framed = false;
    requested = false;
    rig.wokeAt = null;
    const offWaker = setWaker(invalidate);
    const offParallax = installParallax(invalidate);
    // A story opening or closing starts the dolly and the framing change: ask for frames. A
    // compile that ends or `ready` turning true may complete a settle while the camera is
    // already at rest (railNeedsFrame is false then): one frame writes it.
    const offStore = useMuseum.subscribe((next, previous) => {
      if (
        next.openId !== previous.openId ||
        next.reducedMotion !== previous.reducedMotion ||
        next.compilePending !== previous.compilePending ||
        next.ready !== previous.ready
      ) {
        invalidate();
      }
    });
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
    // The desk band (F-020): the phone desk card changes height with the width and the fonts.
    measureDeskBand();
    measureHudRow();
    const remeasure = () => {
      const desk = measureDeskBand();
      const row = measureHudRow();
      if (measureWingHead() || desk || row) invalidate();
    };
    const sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(remeasure);
    const { card, slot, hud } = deskElements();
    for (const el of [card, slot, hud]) if (el) sizes?.observe(el);
    window.addEventListener('resize', remeasure);
    invalidate();
    return () => {
      sizes?.disconnect();
      wingHeadSizes?.disconnect();
      wingHeadSizes = null;
      wingHead.el = null;
      window.removeEventListener('resize', remeasure);
      rig.attached = false;
      finishGlide();
      offWaker();
      offParallax();
      offStore();
      unregister();
    };
  }, [get, invalidate]);

  useFrame(({ camera, size }, delta) => {
    const state = useMuseum.getState();
    const glide = rig.glide;
    const now = performance.now();
    const dt = rigStep(delta, requested, rig.wokeAt === null ? null : (now - rig.wokeAt) / 1000);
    rig.wokeAt = null;
    const reduced = state.reducedMotion;
    // Jumps and reduced motion turn the gaze at once; walking and glides damp it.
    let jump = reduced;
    // Under reduced motion the camera shows the held stop, not `progress.current`.
    let held: Held | null = null;
    if (glide) {
      glide.start ??= now;
      const t = Math.min(1, (now - glide.start) / glide.ms);
      progress.current = glide.from + (glide.to - glide.from) * easeInOutCubic(t);
      rig.teleport = false;
      resetVelocity();
      if (t >= 1) finishGlide();
    } else if (reduced && state.ready) {
      held = holdStop();
      rig.teleport = false;
      resetVelocity();
    } else if (rig.teleport || !state.ready) {
      // Instant travel, and everything before the canvas is revealed: no fly-through at load.
      progress.current = progress.target;
      rig.teleport = false;
      resetVelocity();
      jump = true;
    } else {
      easing.damp(progress, 'current', progress.target, tokens.motion.railSmoothTime, dt);
    }
    if (!held) {
      // Reduced motion starts (or resumes) from the stop nearest to where the camera is.
      hold.at = { track: progress.track, index: Math.round(progress.current) };
      hold.next = null;
    }

    const rail = rails[held?.track ?? progress.track];
    const p = held ? held.index : progress.current;
    poseAt(rail, p, position, look);
    gazeAt(rail, p, look);
    const movedM = lastRail.distanceTo(position);
    lastRail.copy(position);
    aim.position.copy(position);
    if (jump) snapGaze(look);
    else easing.dampLookAt(aim, look, tokens.motion.gazeSmoothTime, dt);
    // "Moved" covers the turn too: the gaze direction's change, in meters at 1 m. The dolly,
    // parallax and framing are not rail movement and never hold back the settle.
    forward.set(0, 0, -1).applyQuaternion(aim.quaternion);
    const moved = Math.max(movedM, forward.distanceTo(lastForward));
    lastForward.copy(forward);

    // The dialog dolly: toward the case along the gaze, never closer than 0.5 m to it.
    // At a wing exhibit it is shortened so the wall title stays whole above the case (F-042).
    if (state.openId !== null) {
      const max = tokens.camera.dialogDollyM;
      dollyScale = max > 0 ? (wingDolly.get(state.openId) ?? max) / max : 1;
    }
    aimDolly(dolly, state.openId !== null, reduced);
    const dollying = stepDolly(dolly, now);
    camera.position.copy(position);
    if (dolly.value > 0) {
      toCase.subVectors(look, position);
      const room = Math.max(0, toCase.length() - 0.5);
      if (room > 0)
        camera.position.addScaledVector(
          toCase.normalize(),
          Math.min(dolly.value * dollyScale, room),
        );
    }
    const lookDistance = camera.position.distanceTo(look);

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
      const ids = railIds.get(held?.track ?? progress.track) ?? [];
      const desk = deskWeightAt(ids, p);
      const lobby = lobbyWeightAt(ids, p);
      const near = stopWeightAt(ids, p);
      const span = near.id === undefined ? undefined : doorSpan.get(near.id);
      const door = span === undefined ? 0 : near.weight;
      const fov = doorFov(aspect, door);
      const deskY = desk > 0 ? deskFramingY(size.height, fov) : DESK_PORTRAIT_Y;
      // An exhibit on a portrait screen: keep the wall title under the wing head in a wing
      // (F-039) and under the HUD's top row in the main aisle (F-048).
      const tan = aspect >= 1 || near.id === undefined ? undefined : titleTan.get(near.id);
      const wing = tan === undefined ? 0 : near.weight;
      const head =
        (held?.track ?? progress.track) === 'main'
          ? hudRow.bottom > 0
            ? hudRow.bottom
            : HUD_ROW_BOTTOM
          : wingHeadBottom(onWingHeadResize);
      const wingY =
        tan === undefined || wing === 0
          ? tokens.camera.framingPortraitY
          : wingPortraitY(size.height, head, fov, tan);
      // A wing door: the doorway centered on a portrait screen (F-051).
      const doorX = span === undefined || aspect >= 1 ? 0.5 : doorPortraitX(aspect, fov, span);
      const goal = viewOffsetFor(
        framingFor(
          aspect,
          panelLeft(state.openId, size.width),
          desk,
          deskY,
          lobby,
          wing,
          wingY,
          door,
          doorX,
        ),
      );
      // A jump places the camera at once, so its framing lands at once too (the lobby's portrait
      // framing must not still be easing out at the first exhibit, F-032).
      if (!shift.framed || state.reducedMotion || jump) {
        shift.x = goal.x;
        shift.y = goal.y;
        shift.framed = true;
        (shift as { __damp?: unknown }).__damp = undefined;
      } else {
        const smooth = tokens.motion.framingSmoothS;
        easing.damp(shift, 'x', goal.x, smooth, dt);
        easing.damp(shift, 'y', goal.y, smooth, dt);
      }
      applyFraming(lens, fov, shift, size.width, size.height);
      framing = shift.x !== goal.x || shift.y !== goal.y;
    }
    const animating =
      framing || dollying || sway.yaw !== swayGoal.yaw || sway.pitch !== swayGoal.pitch;

    const gliding = rig.glide !== null || (held !== null && hold.cutting);
    const index = settledStop({
      // Under reduced motion the rail is where the held pose is, and a cut is a move.
      current: held ? (held.track === progress.track ? held.index : Number.NaN) : progress.current,
      target: progress.target,
      moved,
      compilePending: state.compilePending,
      gliding,
    });
    if (index !== null) {
      const stop = rails[progress.track].stops[index]?.id;
      const patch: { settled?: boolean; stop?: StopId } = {};
      if (!state.settled) patch.settled = true;
      if (stop && stop !== state.stop) patch.stop = stop;
      if (patch.settled !== undefined || patch.stop !== undefined) useMuseum.setState(patch);
    } else if (state.settled) {
      useMuseum.setState({ settled: false });
    }
    // Frames only while something still moves (F-012): at rest, on a stop or between two, the
    // demand loop stops; the gaze, framing, dolly, parallax and fade keep asking until they settle.
    requested =
      animating ||
      railNeedsFrame({
        current: held ? held.index : progress.current,
        goal: held ? held.index : progress.target,
        moved,
        gliding,
      });
    if (requested) invalidate();
  });

  return null;
}
