import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { PDF_PATH } from '../../app/routes';
import { content } from '../../content/index';
import { cardOf } from '../../overlay/model';
import { computeLayout } from '../rail/layout';
import { DESK_TOP_Y } from './lightPlan';
import {
  DESK_SIZE,
  deskBodyBoxes,
  deskBoxMatrix,
  deskHref,
  deskLinks,
  deskObjects,
  deskOrigin,
  type DeskBox,
} from './deskParts';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));

/** The world-aligned bounds of a (possibly rotated) desk part. */
function bounds(box: DeskBox): Box3 {
  return new Box3(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5)).applyMatrix4(
    deskBoxMatrix(box),
  );
}

describe('front desk (EXPERIENCE §2.3, §11.1 item 4)', () => {
  it('stands under the desk stop look target, its top at DESK_TOP_Y', () => {
    const desk = layout.tracks.main.stops.find((s) => s.id === 'desk')!;
    expect(deskOrigin(layout)).toEqual([desk.look[0], 0, desk.look[2]]);
    expect(DESK_SIZE[1]).toBe(DESK_TOP_Y);
    const top = Math.max(...deskBodyBoxes().map((b) => bounds(b).max.y));
    expect(top).toBeCloseTo(DESK_TOP_Y, 9);
    const floor = Math.min(...deskBodyBoxes().map((b) => bounds(b).min.y));
    expect(floor).toBeCloseTo(0, 9);
  });

  it('is walnut and brass, the objects paper, walnut and brass (library materials only)', () => {
    const all = [...deskBodyBoxes(), ...deskObjects(true).flatMap((o) => o.parts)];
    expect(new Set(all.map((b) => b.material))).toEqual(new Set(['walnut', 'brass', 'paper']));
  });

  it('carries the envelope, postcard, catalogue and ledger, each on the desk top', () => {
    const objects = deskObjects(true);
    expect(objects.map((o) => o.action)).toEqual(['email', 'linkedin', 'pdf', 'github']);
    for (const object of objects) {
      for (const part of object.parts) {
        const b = bounds(part);
        expect(b.min.y, part.name).toBeGreaterThanOrEqual(DESK_TOP_Y - 1e-9);
        expect(Math.abs(b.max.x), part.name).toBeLessThanOrEqual(DESK_SIZE[0] / 2);
        expect(Math.abs(b.max.z), part.name).toBeLessThanOrEqual(DESK_SIZE[2] / 2);
      }
    }
    expect(deskObjects(false).map((o) => o.action)).toEqual(['email', 'linkedin', 'pdf']);
  });

  it('opens exactly the URLs the desk card buttons use', () => {
    const card = cardOf('desk');
    if (card.kind !== 'desk') throw new Error('no desk card');
    const links = deskLinks();
    expect(deskHref('email', links)).toBe(card.email);
    expect(deskHref('email', links)).toBe(`mailto:${content.contact.email}`);
    expect(deskHref('linkedin', links)).toBe(card.linkedin);
    expect(deskHref('pdf', links)).toBe(PDF_PATH);
    expect(deskHref('github', links)).toBe(card.github ?? null);
    expect(deskHref('github', { ...links, github: undefined })).toBeNull();
  });
});
