import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import { computeLayout } from '../rail/layout';
import { poseRotation } from './gallery';
import { shouldRemeasureStage, stageStyle } from './stage';

describe('stage height (ARCHITECTURE §10.3)', () => {
  const last = { width: 412, height: 915 };

  it('re-measures when the width changes', () => {
    expect(shouldRemeasureStage(last, { width: 915, height: 412 }, true)).toBe(true);
    expect(shouldRemeasureStage(last, { width: 413, height: 915 }, false)).toBe(true);
  });

  it('ignores height-only changes under 20% on coarse pointers (the iOS address bar)', () => {
    expect(shouldRemeasureStage(last, { width: 412, height: 839 }, true)).toBe(false);
    expect(shouldRemeasureStage(last, { width: 412, height: 980 }, true)).toBe(false);
    expect(shouldRemeasureStage(last, { width: 412, height: 700 }, true)).toBe(true);
    expect(shouldRemeasureStage(last, last, true)).toBe(false);
  });

  it('follows every height change on fine pointers', () => {
    expect(shouldRemeasureStage(last, { width: 412, height: 900 }, false)).toBe(true);
    expect(shouldRemeasureStage(last, last, false)).toBe(false);
  });
});

describe('initial camera pose', () => {
  it('looks from the lobby camera at the lobby look-at', () => {
    const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));
    const lobby = layout.tracks.main.stops[0]!;
    const camera = new PerspectiveCamera();
    camera.position.set(...lobby.camera);
    camera.rotation.set(...poseRotation(lobby));
    camera.updateMatrixWorld();
    const forward = camera.getWorldDirection(new Vector3());
    const wanted = new Vector3(...lobby.look).sub(new Vector3(...lobby.camera)).normalize();
    expect(forward.angleTo(wanted)).toBeLessThan(1e-6);
  });
});

describe('stage style (ARCHITECTURE §6.1, §10.3)', () => {
  it('is a fixed 100lvh layer under the track', () => {
    expect(stageStyle(false, false)).toMatchObject({
      position: 'fixed',
      inset: 0,
      height: 'var(--stage-h, 100lvh)',
      zIndex: 0,
    });
  });

  it('stays transparent until ready, then fades over --dur-slow unless instant', () => {
    expect(stageStyle(false, false).opacity).toBe(0);
    expect(stageStyle(true, false)).toMatchObject({
      opacity: 1,
      transition: 'opacity var(--dur-slow) var(--ease-out)',
    });
    expect(stageStyle(true, true)).toMatchObject({ opacity: 1, transition: 'none' });
  });
});
