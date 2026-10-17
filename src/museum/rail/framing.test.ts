import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { tokens } from '../../design/tokens';
import {
  applyFraming,
  DESK_PORTRAIT_Y,
  deskWeightAt,
  fovFor,
  framingFor,
  MIN_LEFT_AREA,
  viewOffsetFor,
} from './framing';

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
    expect(deskWeightAt(['projects-door', 'safe-sip'], 1)).toBe(0);
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
