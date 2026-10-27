import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import { tokens } from '../../design/tokens';
import { END_WALL } from '../environment/labels3d';
import { DESK_TOP_Y } from '../environment/lightPlan';
import {
  applyFraming,
  DESK_CARD_CLEARANCE,
  DESK_POINT_TAN,
  DESK_POINT_Y,
  DESK_PORTRAIT_Y,
  deskPortraitY,
  deskWeightAt,
  doorCorners,
  DOOR_DESKTOP_X,
  DOOR_DESKTOP_Y,
  doorFov,
  DOOR_FOV_DESKTOP,
  doorPortraitX,
  lobbyWeightAt,
  LOBBY_PORTRAIT_Y,
  END_WALL_TOP_TAN,
  END_WALL_TOP_Y,
  fovFor,
  framingFor,
  horizontalTangents,
  HUD_ROW_BOTTOM,
  MIN_LEFT_AREA,
  NUMBER_OVERSHOOT,
  numberTopCorners,
  stopWeightAt,
  TITLE_CASE_CLEARANCE_TAN,
  titleBottomCorners,
  titleClearDolly,
  titleTopCorners,
  topTangent,
  viewOffsetFor,
  WING_HEAD_BOTTOM,
  WING_HEAD_CLEARANCE,
  wingPortraitY,
} from './framing';
import { caseBox, EDGE_THICKNESS, slotMatrix, slotVariant } from '../exhibits/_kit/anatomy';
import { slotPlacard } from '../exhibits/_kit/placard';
import { SERIF_NUMBER_ADVANCE } from '../exhibits/_kit/titleMetrics';
import { computeLayout, DOOR_H } from './layout';

/** Where a world point lands on screen (fractions from the top left) through `camera`. */
function screenOf(camera: PerspectiveCamera, point: Vector3): { x: number; y: number } {
  camera.updateMatrixWorld();
  const ndc = point.clone().project(camera);
  return { x: (ndc.x + 1) / 2, y: (1 - ndc.y) / 2 };
}

/** A camera at a stop-like pose, looking at `look`, framed for `aspect` (and an open panel). */
function framedCamera(aspect: number, look: Vector3, panelLeft: number | null = null) {
  const camera = new PerspectiveCamera(50, aspect, 0.1, 90);
  camera.position.set(0.6, 1.6, -7.2);
  camera.lookAt(look);
  const height = 900;
  applyFraming(
    camera,
    fovFor(aspect),
    viewOffsetFor(framingFor(aspect, panelLeft)),
    aspect * height,
    height,
  );
  return camera;
}

describe('fovFor (EXPERIENCE §6.2)', () => {
  it('is 50 at aspect 1 or more, 68 at 0.6 or less and linear in between', () => {
    expect(fovFor(16 / 9)).toBe(tokens.camera.fovDesktop);
    expect(fovFor(1)).toBe(50);
    expect(fovFor(0.6)).toBe(tokens.camera.fovPortrait);
    expect(fovFor(412 / 915)).toBe(68);
    expect(fovFor(0.8)).toBeCloseTo(59, 10);
    expect(fovFor(0.7)).toBeCloseTo(63.5, 10);
    expect(fovFor(Number.NaN)).toBe(50);
  });
});

describe('framingFor', () => {
  it('puts the look-at point at 62% x 50% on desktop and 50% x 36% in portrait', () => {
    expect(framingFor(1440 / 900)).toEqual({ x: tokens.camera.framingDesktopX, y: 0.5 });
    expect(framingFor(1)).toEqual({ x: 0.62, y: 0.5 });
    expect(framingFor(412 / 839)).toEqual({ x: 0.5, y: tokens.camera.framingPortraitY });
    expect(framingFor(0.9)).toEqual({ x: 0.5, y: 0.36 });
  });

  it('frames into the area left of an open desktop panel', () => {
    // A 640 px panel on a 1440 px viewport starts at 800 px.
    expect(framingFor(1.6, 800 / 1440).x).toBeCloseTo(400 / 1440, 12);
    expect(framingFor(1.6, 800 / 1440).y).toBe(0.5);
    // A full-width sheet (or a panel that leaves almost nothing) keeps the normal framing.
    expect(framingFor(1.6, 0)).toEqual({ x: 0.62, y: 0.5 });
    expect(framingFor(1.6, MIN_LEFT_AREA - 0.01)).toEqual({ x: 0.62, y: 0.5 });
    // Portrait has no side panel: the sheet covers the stage.
    expect(framingFor(0.5, 0.56)).toEqual({ x: 0.5, y: 0.36 });
  });

  it('raises the portrait framing point at the front desk only (F-020)', () => {
    expect(DESK_PORTRAIT_Y).toBeLessThan(tokens.camera.framingPortraitY);
    expect(framingFor(412 / 839, null, 1)).toEqual({ x: 0.5, y: DESK_PORTRAIT_Y });
    expect(framingFor(412 / 839, null, 0)).toEqual({ x: 0.5, y: 0.36 });
    const half = framingFor(412 / 839, null, 0.5).y;
    expect(half).toBeCloseTo((0.36 + DESK_PORTRAIT_Y) / 2, 12);
    // Desktop frames the desk like every other stop.
    expect(framingFor(1440 / 900, null, 1)).toEqual({ x: 0.62, y: 0.5 });
  });

  it('takes a measured desk framing height (F-020)', () => {
    expect(framingFor(360 / 640, null, 1, 0.37)).toEqual({ x: 0.5, y: 0.37 });
    expect(framingFor(360 / 640, null, 0.5, 0.4).y).toBeCloseTo((0.36 + 0.4) / 2, 12);
    expect(framingFor(1440 / 900, null, 1, 0.37)).toEqual({ x: 0.62, y: 0.5 });
  });
});

describe('deskPortraitY (F-020)', () => {
  const fov = 68;
  const k = 1 / (2 * Math.tan((fov * Math.PI) / 360));
  /** Where the desk point and the end-wall line top land, in px, for a band and its framing. */
  const landing = (height: number, top: number, bottom: number) => {
    const y = deskPortraitY({ height, top, bottom }, fov);
    return {
      y,
      desk: (y + DESK_POINT_TAN * k) * height,
      line: (y - END_WALL_TOP_TAN * k) * height,
    };
  };

  it('keeps its heights in step with the environment', () => {
    expect(DESK_POINT_Y).toBeGreaterThan(DESK_TOP_Y);
    expect(DESK_POINT_Y).toBeLessThan(DESK_TOP_Y + 0.05);
    expect(END_WALL_TOP_Y).toBeGreaterThanOrEqual(END_WALL.baselineY + END_WALL.capHeight);
    expect(END_WALL_TOP_Y).toBeLessThan(END_WALL.baselineY + 1.5 * END_WALL.capHeight);
  });

  it('puts the desk above the card and the end-wall line below the HUD at 360 x 640', () => {
    // The compact phone desk card's top at 360 x 640 sits near 300 px; the HUD ends at 60 px.
    const at = landing(640, 60, 300);
    expect(at.desk).toBeLessThanOrEqual(300 - DESK_CARD_CLEARANCE);
    expect(at.line).toBeGreaterThanOrEqual(60);
  });

  it('centers the span from the line to the desk in the band at 412 x 839', () => {
    const at = landing(839, 60, 520);
    expect(at.desk).toBeLessThanOrEqual(520 - DESK_CARD_CLEARANCE);
    expect(at.line).toBeGreaterThanOrEqual(60);
    expect(at.line - 60).toBeCloseTo(520 - DESK_CARD_CLEARANCE - at.desk, 6);
  });

  it('keeps the desk above the card when the band is too short for the whole span', () => {
    const at = landing(640, 60, 200);
    expect(at.desk).toBeLessThanOrEqual(200 - DESK_CARD_CLEARANCE + 1e-9);
  });

  it('falls back to DESK_PORTRAIT_Y without a usable band, and stays in [0.22, 0.5]', () => {
    expect(deskPortraitY({ height: 0, top: 0, bottom: 0 }, fov)).toBe(DESK_PORTRAIT_Y);
    expect(deskPortraitY({ height: 640, top: 300, bottom: 200 }, fov)).toBe(DESK_PORTRAIT_Y);
    expect(deskPortraitY({ height: 640, top: 60, bottom: 90 }, fov)).toBe(0.22);
    expect(deskPortraitY({ height: 2000, top: 60, bottom: 1990 }, fov)).toBe(0.5);
  });
});

describe('deskWeightAt', () => {
  const ids = ['lobby', 'verafin', 'education', 'desk'];

  it('is 1 at the desk, 0 a half stop or more away, and smooth in between', () => {
    expect(deskWeightAt(ids, 3)).toBe(1);
    expect(deskWeightAt(ids, 2.5)).toBe(0);
    expect(deskWeightAt(ids, 2)).toBe(0);
    expect(deskWeightAt(ids, 0)).toBe(0);
    expect(deskWeightAt(ids, 2.75)).toBeCloseTo(0.5, 12);
    let last = 0;
    for (let p = 2.5; p <= 3; p += 0.05) {
      const w = deskWeightAt(ids, p);
      expect(w).toBeGreaterThanOrEqual(last);
      last = w;
    }
  });

  it('is 0 on a track without the desk', () => {
    expect(deskWeightAt(['projects-door', 'sdsj'], 1)).toBe(0);
    expect(deskWeightAt(ids, Number.NaN)).toBe(0);
  });
});

describe('projection shift', () => {
  const look = new Vector3(2.4, 1.35, -10);

  it('projects the look-at point to the framing point on every aspect', () => {
    for (const aspect of [2.1, 1440 / 900, 1, 0.8, 412 / 839, 0.4]) {
      const camera = framedCamera(aspect, look);
      const target = framingFor(aspect);
      const at = screenOf(camera, look);
      expect(at.x).toBeCloseTo(target.x, 9);
      expect(at.y).toBeCloseTo(target.y, 9);
      expect(camera.fov).toBe(fovFor(aspect));
    }
  });

  it('projects the look-at point to the center of the area left of the panel', () => {
    const camera = framedCamera(1.6, look, 0.56);
    expect(screenOf(camera, look).x).toBeCloseTo(0.28, 9);
    expect(screenOf(camera, look).y).toBeCloseTo(0.5, 9);
  });

  it('never moves the camera: only the projection changes', () => {
    const camera = new PerspectiveCamera(50, 1.6, 0.1, 90);
    camera.position.set(0.6, 1.6, -7.2);
    camera.lookAt(look);
    const position = camera.position.clone();
    const quaternion = camera.quaternion.clone();
    applyFraming(camera, 50, viewOffsetFor(framingFor(1.6)), 1440, 900);
    expect(camera.position.equals(position)).toBe(true);
    expect(camera.quaternion.equals(quaternion)).toBe(true);
  });

  it('keeps a point straight ahead on the view axis and shifts every other point equally', () => {
    const camera = new PerspectiveCamera(50, 1.6, 0.1, 90);
    camera.lookAt(new Vector3(0, 0, -1));
    const before = screenOf(camera, new Vector3(1, 0.5, -6));
    applyFraming(camera, 50, viewOffsetFor({ x: 0.62, y: 0.5 }), 1440, 900);
    expect(camera.aspect).toBe(1.6);
    const after = screenOf(camera, new Vector3(1, 0.5, -6));
    expect(after.x - before.x).toBeCloseTo(0.12, 9);
    expect(after.y - before.y).toBeCloseTo(0, 9);
  });

  it('reports whether anything changed', () => {
    const camera = new PerspectiveCamera(50, 1.6, 0.1, 90);
    expect(applyFraming(camera, 50, { x: -0.12, y: 0 }, 1440, 900)).toBe(true);
    expect(applyFraming(camera, 50, { x: -0.12, y: 0 }, 1440, 900)).toBe(false);
    expect(applyFraming(camera, 68, { x: -0.12, y: 0 }, 1440, 900)).toBe(true);
    expect(applyFraming(camera, 68, { x: 0, y: 0.14 }, 1440, 900)).toBe(true);
    // A resize (R3F sets the aspect and keeps the old view) re-applies the shift in new px.
    camera.aspect = 412 / 839;
    camera.updateProjectionMatrix();
    expect(applyFraming(camera, 68, { x: 0, y: 0.14 }, 412, 839)).toBe(true);
    expect(camera.view?.offsetY).toBeCloseTo(0.14 * 839, 9);
    expect(camera.aspect).toBeCloseTo(412 / 839, 12);
  });
});

describe('lobby framing (F-032)', () => {
  const ids = ['lobby', 'verafin', 'projects-door', 'desk'];
  it('applies at the lobby only, gone half a stop toward the first exhibit', () => {
    expect(lobbyWeightAt(ids, 0)).toBe(1);
    expect(lobbyWeightAt(ids, 0.5)).toBe(0);
    expect(lobbyWeightAt(ids, 1)).toBe(0);
    expect(lobbyWeightAt(ids, 0.25)).toBeCloseTo(0.5, 12);
    expect(lobbyWeightAt(['projects-door', 'klarup'], 0)).toBe(0);
    expect(lobbyWeightAt(ids, Number.NaN)).toBe(0);
  });

  it('frames the lobby low on portrait and leaves desktop alone', () => {
    expect(LOBBY_PORTRAIT_Y).toBeGreaterThan(0.36);
    expect(framingFor(412 / 839, null, 0, DESK_PORTRAIT_Y, 1)).toEqual({
      x: 0.5,
      y: LOBBY_PORTRAIT_Y,
    });
    expect(framingFor(412 / 839, null, 0, DESK_PORTRAIT_Y, 0.5).y).toBeCloseTo(
      (0.36 + LOBBY_PORTRAIT_Y) / 2,
      12,
    );
    expect(framingFor(1440 / 900, null, 0, DESK_PORTRAIT_Y, 1)).toEqual({ x: 0.62, y: 0.5 });
  });
});

describe('wing framing (F-039)', () => {
  const layout = computeLayout(content, new Date());
  const wingSlots = layout.slots.filter((s) => s.track !== 'main' && s.mount === 'plinth');
  const base = tokens.camera.framingPortraitY;

  it('measures the tangent three.js projects', () => {
    const camera = new PerspectiveCamera(68, 0.5, 0.1, 90);
    camera.position.set(5.6, 1.6, -30);
    camera.lookAt(new Vector3(9, 1.35, -31));
    const points: [number, number, number][] = [
      [11.5, 2.9, -32],
      [11.5, 2.9, -29.5],
    ];
    const tan = topTangent([5.6, 1.6, -30], [9, 1.35, -31], points);
    const k = 1 / (2 * Math.tan((68 * Math.PI) / 360));
    const top = Math.min(...points.map((p) => screenOf(camera, new Vector3(...p)).y));
    expect(0.5 - tan * k).toBeCloseTo(top, 6);
  });

  it('weights the nearest stop, gone half a stop away', () => {
    const ids = ['projects-door', 'klarup', 'finance-tracker'];
    expect(stopWeightAt(ids, 1)).toEqual({ id: 'klarup', weight: 1 });
    expect(stopWeightAt(ids, 1.5).weight).toBe(0);
    expect(stopWeightAt(ids, 1.25).weight).toBeCloseTo(0.5, 6);
    expect(stopWeightAt(ids, Number.NaN).weight).toBe(0);
    expect(stopWeightAt(ids, 9).id).toBe('finance-tracker');
  });

  it('never frames above the portrait point and drops at most to half the height', () => {
    expect(wingPortraitY(839, 140, 68, -1)).toBe(base);
    expect(wingPortraitY(640, 140, 68, 5)).toBe(0.5);
    expect(wingPortraitY(0, 140, 68, 0.3)).toBe(base);
  });

  it('applies on portrait only, blended by the stop weight', () => {
    expect(framingFor(1440 / 900, null, 0, DESK_PORTRAIT_Y, 0, 1, 0.45)).toEqual({
      x: 0.62,
      y: 0.5,
    });
    expect(framingFor(412 / 839, null, 0, DESK_PORTRAIT_Y, 0, 1, 0.45).y).toBe(0.45);
    expect(framingFor(412 / 839, null, 0, DESK_PORTRAIT_Y, 0, 0.5, 0.46).y).toBeCloseTo(
      (base + 0.46) / 2,
      9,
    );
    expect(framingFor(412 / 839, null, 0, DESK_PORTRAIT_Y, 0, 0, 0.46).y).toBe(base);
  });

  it.each([
    [412, 839],
    [360, 640],
  ])('keeps every wing title %i x %i under the wing head', (width, height) => {
    expect(wingSlots.length).toBeGreaterThanOrEqual(3);
    const aspect = width / height;
    const fov = fovFor(aspect);
    for (const slot of wingSlots) {
      const pose = layout.tracks[slot.track]!.stops.find((s) => s.id === slot.id)!;
      const corners = titleTopCorners(slotPlacard(layout, slot));
      const y = wingPortraitY(
        height,
        WING_HEAD_BOTTOM,
        fov,
        topTangent(pose.camera, pose.look, corners),
      );
      const camera = new PerspectiveCamera(fov, aspect, 0.1, 90);
      camera.position.set(...pose.camera);
      camera.lookAt(new Vector3(...pose.look));
      applyFraming(
        camera,
        fov,
        viewOffsetFor(framingFor(aspect, null, 0, DESK_PORTRAIT_Y, 0, 1, y)),
        width,
        height,
      );
      const top = Math.min(...corners.map((c) => screenOf(camera, new Vector3(...c)).y * height));
      expect(top, slot.id).toBeGreaterThanOrEqual(WING_HEAD_BOTTOM + WING_HEAD_CLEARANCE - 1e-6);
      // The look-at point (the case) stays in the upper half, above the phone card.
      expect(y, slot.id).toBeLessThanOrEqual(0.5);
    }
  });
});

describe('main-aisle portrait framing (F-048)', () => {
  const layout = computeLayout(content, new Date());
  const mainSlots = layout.slots.filter((s) => s.track === 'main');
  const base = tokens.camera.framingPortraitY;

  it('takes the number top from its own width and overshoot, inside the widest-line bound', () => {
    const spec = slotPlacard(
      layout,
      mainSlots.find((s) => s.id === 'cfia')!,
    );
    const [a, b] = numberTopCorners(spec, SERIF_NUMBER_ADVANCE);
    const [wa, wb] = titleTopCorners(spec);
    expect(a![1]).toBeCloseTo(
      spec.number.baselineY + spec.number.capHeight * (1 + NUMBER_OVERSHOOT),
      9,
    );
    expect(b![2]! - a![2]!).toBeCloseTo(
      spec.number.text.length * spec.number.fontSize * SERIF_NUMBER_ADVANCE,
      9,
    );
    expect(b![2]! - a![2]!).toBeLessThan(wb![2]! - wa![2]!);
  });

  it.each([
    [412, 839],
    [360, 640],
  ])('keeps every main-aisle title %i x %i under the HUD row', (width, height) => {
    expect(mainSlots.map((s) => s.id)).toEqual(
      expect.arrayContaining(['verafin', 'cfia', 'mun', 'certifications']),
    );
    const aspect = width / height;
    const fov = fovFor(aspect);
    for (const slot of mainSlots) {
      const pose = layout.tracks.main.stops.find((s) => s.id === slot.id)!;
      const corners = numberTopCorners(slotPlacard(layout, slot), SERIF_NUMBER_ADVANCE);
      const y = wingPortraitY(
        height,
        HUD_ROW_BOTTOM,
        fov,
        topTangent(pose.camera, pose.look, corners),
      );
      const camera = new PerspectiveCamera(fov, aspect, 0.1, 90);
      camera.position.set(...pose.camera);
      camera.lookAt(new Vector3(...pose.look));
      applyFraming(
        camera,
        fov,
        viewOffsetFor(framingFor(aspect, null, 0, DESK_PORTRAIT_Y, 0, 1, y)),
        width,
        height,
      );
      const top = Math.min(...corners.map((c) => screenOf(camera, new Vector3(...c)).y * height));
      expect(top, slot.id).toBeGreaterThanOrEqual(HUD_ROW_BOTTOM + WING_HEAD_CLEARANCE - 1e-6);
      // Only as far down as the title needs: the case stays in the upper half, above the card.
      expect(y, slot.id).toBeGreaterThanOrEqual(base);
      expect(y, slot.id).toBeLessThan(0.45);
    }
  });
});

describe('door framing (F-051)', () => {
  const layout = computeLayout(content, new Date());

  it('tightens the desktop lens and moves the point only at a door, blended by its weight', () => {
    expect(doorFov(1440 / 900, 1)).toBe(DOOR_FOV_DESKTOP);
    expect(doorFov(1440 / 900, 0)).toBe(fovFor(1440 / 900));
    expect(doorFov(1440 / 900, 0.5)).toBeCloseTo((DOOR_FOV_DESKTOP + fovFor(1.6)) / 2, 9);
    expect(doorFov(412 / 839, 1)).toBe(fovFor(412 / 839));
    const at = (door: number) =>
      framingFor(1440 / 900, null, 0, DESK_PORTRAIT_Y, 0, 0, undefined, door, 0.3);
    expect(at(1)).toEqual({ x: DOOR_DESKTOP_X, y: DOOR_DESKTOP_Y });
    expect(at(0)).toEqual({ x: tokens.camera.framingDesktopX, y: 0.5 });
    // The dialog framing wins on desktop.
    expect(framingFor(1.6, 800 / 1440, 0, DESK_PORTRAIT_Y, 0, 0, undefined, 1, 0.3).y).toBe(0.5);
    const portrait = framingFor(412 / 839, null, 0, DESK_PORTRAIT_Y, 0, 0, undefined, 1, 0.44);
    expect(portrait).toEqual({ x: 0.44, y: tokens.camera.framingPortraitY });
  });

  it('measures the horizontal tangent three.js projects', () => {
    const camera = new PerspectiveCamera(50, 1.6, 0.1, 90);
    camera.position.set(0, 1.6, -26.2);
    camera.lookAt(new Vector3(3.5, 1.5, -28));
    const points: [number, number, number][] = [
      [3.5, 0, -29.2],
      [3.5, 2.8, -26.8],
    ];
    const [lo, hi] = horizontalTangents([0, 1.6, -26.2], [3.5, 1.5, -28], points);
    const k = 1 / (2 * Math.tan((50 * Math.PI) / 360) * 1.6);
    const xs = points.map((p) => screenOf(camera, new Vector3(...p)).x);
    expect(0.5 + lo * k).toBeCloseTo(Math.min(...xs), 6);
    expect(0.5 + hi * k).toBeCloseTo(Math.max(...xs), 6);
  });

  // Phones: inside the edges; desktop: right of the stop card column (its right edge at 446)
  // and left of the rail's stop labels (from x 1240).
  it.each([
    [412, 839, 16, 396],
    [360, 640, 16, 344],
    [1440, 900, 446, 1240],
  ])('shows every doorway whole at %i x %i, between x %i and %i', (width, height, left, right) => {
    expect(layout.doors.length).toBe(2);
    const aspect = width / height;
    const fov = doorFov(aspect, 1);
    for (const door of layout.doors) {
      const pose = layout.tracks.main.stops.find((s) => s.id === `${door.wing}-door`)!;
      const corners = doorCorners(door.side, door.z, door.width, DOOR_H);
      const span = horizontalTangents(pose.camera, pose.look, corners);
      const x = aspect < 1 ? doorPortraitX(aspect, fov, span) : 0.5;
      const camera = new PerspectiveCamera(fov, aspect, 0.1, 90);
      camera.position.set(...pose.camera);
      camera.lookAt(new Vector3(...pose.look));
      applyFraming(
        camera,
        fov,
        viewOffsetFor(framingFor(aspect, null, 0, DESK_PORTRAIT_Y, 0, 0, undefined, 1, x)),
        width,
        height,
      );
      const xs = corners.map((c) => screenOf(camera, new Vector3(...c)).x * width);
      expect(Math.min(...xs), door.wing).toBeGreaterThan(left);
      expect(Math.max(...xs), door.wing).toBeLessThan(right);
    }
  });
});

describe('wing dialog dolly (F-042)', () => {
  const layout = computeLayout(content, new Date());
  const wingSlots = layout.slots.filter((s) => s.track !== 'main' && s.mount === 'plinth');
  const max = tokens.camera.dialogDollyM;
  const width = 1440;
  const height = 900;
  const aspect = width / height;
  /** The story panel's left edge on a 1440 px desktop (the measured value in the captures). */
  const panelLeft = 806 / 1440;

  function caseTops(slot: (typeof wingSlots)[number]): [number, number, number][] {
    const glass = caseBox(slotVariant(slot));
    const frame = slotMatrix(slot);
    const y = glass.center[1] + glass.size[1] / 2 + EDGE_THICKNESS / 2;
    return [-1, 1].flatMap((sx) =>
      [-1, 1].map(
        (sz) =>
          new Vector3(
            glass.center[0] + (sx * glass.size[0]) / 2,
            y,
            glass.center[2] + (sz * glass.size[2]) / 2,
          )
            .applyMatrix4(frame)
            .toArray() as [number, number, number],
      ),
    );
  }

  /** Title bottom and case top in screen px (from the top) with the dialog open, dolly `d`. */
  function dialogPose(slot: (typeof wingSlots)[number], d: number) {
    const pose = layout.tracks[slot.track]!.stops.find((s) => s.id === slot.id)!;
    const cam = new Vector3(...pose.camera);
    const look = new Vector3(...pose.look);
    cam.addScaledVector(look.clone().sub(cam).normalize(), d);
    const fov = fovFor(aspect);
    const camera = new PerspectiveCamera(fov, aspect, 0.1, 90);
    camera.position.copy(cam);
    camera.lookAt(look);
    applyFraming(camera, fov, viewOffsetFor(framingFor(aspect, panelLeft)), width, height);
    const ys = (ps: [number, number, number][]) =>
      ps.map((p) => screenOf(camera, new Vector3(...p)).y * height);
    return {
      titleBottom: Math.max(...ys(titleBottomCorners(slotPlacard(layout, slot)))),
      caseTop: Math.min(...ys(caseTops(slot))),
    };
  }

  it('finds the title bottom at the last organization baseline', () => {
    const corners = titleBottomCorners({
      position: [-11.49, 0, -18],
      width: 2,
      organization: { baselineY: 2.45, fontSize: 0.2, lineHeight: 1.25, lines: 2 },
    });
    expect(corners).toEqual([
      [-11.49, 2.2, -19],
      [-11.49, 2.2, -17],
    ]);
  });

  it('keeps the full dolly when it clears and none when the stop itself does not', () => {
    const tops: [number, number, number][] = [[0, 1.85, -3]];
    expect(titleClearDolly([0, 1.6, 0], [0, 1.35, -3], [[0, 3, -6]], tops, max)).toBe(max);
    expect(titleClearDolly([0, 1.6, 0], [0, 1.35, -3], [[0, 1.7, -6]], tops, max)).toBe(0);
  });

  it.each(['klarup', 'finance-tracker', 'sdsj'])(
    'keeps the whole %s title above the case top in the desktop dialog',
    (id) => {
      const slot = wingSlots.find((s) => s.id === id)!;
      const pose = layout.tracks[slot.track]!.stops.find((s) => s.id === id)!;
      const bottoms = titleBottomCorners(slotPlacard(layout, slot));
      const d = titleClearDolly(pose.camera, pose.look, bottoms, caseTops(slot), max);
      // The dolly still moves in, but less than the full 0.6 m, which cut the last line.
      expect(d).toBeGreaterThan(0.1);
      expect(d).toBeLessThan(max);
      const full = dialogPose(slot, max);
      expect(full.titleBottom, `${id} at the full dolly`).toBeGreaterThan(full.caseTop);
      const fixed = dialogPose(slot, d);
      const k = height / (2 * Math.tan((fovFor(aspect) * Math.PI) / 360));
      expect(fixed.caseTop - fixed.titleBottom).toBeGreaterThanOrEqual(
        TITLE_CASE_CLEARANCE_TAN * k * 0.9,
      );
    },
  );
});
