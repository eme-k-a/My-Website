import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { content } from '../../../content/index';
import { computeLayout, SLOT_BOUNDS } from '../../rail/layout';
import {
  EDGES_PER_CASE,
  baseStripBox,
  caseBox,
  edgeBoxes,
  hitBox,
  plinthBox,
  slotMatrix,
  slotOrigin,
  slotVariant,
  type LocalBox,
} from './anatomy';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));
const slot = (id: string) => layout.slots.find((s) => s.id === id)!;

const lo = (b: LocalBox, i: number) => b.center[i]! - b.size[i]! / 2;
const hi = (b: LocalBox, i: number) => b.center[i]! + b.size[i]! / 2;

describe('exhibit anatomy (EXPERIENCE §5.2, §5.3, §5.6)', () => {
  it('maps slots to their variant', () => {
    expect(slotVariant(slot('verafin'))).toBe('standard');
    expect(slotVariant(slot('klarup'))).toBe('standard');
    expect(slotVariant(slot('mun'))).toBe('wide');
    expect(slotVariant(slot('certifications'))).toBe('wall');
  });

  it('puts the local origin on the plinth top (1.0 standard, 0.6 wide) or the wall', () => {
    expect(slotOrigin(slot('verafin'))).toEqual([2.4, 1, -10]);
    expect(slotOrigin(slot('mun'))[1]).toBeCloseTo(0.6, 9);
    expect(slotOrigin(slot('certifications'))).toEqual(slot('certifications').position);
  });

  it('places each slot center at its world slot center height (1.35, 1.25, 1.6)', () => {
    for (const [id, y] of [
      ['verafin', 1.35],
      ['mun', 1.25],
      ['certifications', 1.6],
    ] as const) {
      const s = slot(id);
      const center = s.bounds.min.map((v, i) => (v + s.bounds.max[i]!) / 2);
      const world = new Vector3(...(center as [number, number, number])).applyMatrix4(
        slotMatrix(s),
      );
      expect(world.y, id).toBeCloseTo(y, 6);
    }
  });

  it('turns local +Z toward the stop camera', () => {
    for (const s of layout.slots) {
      const pose = Object.values(layout.tracks)
        .flatMap((t) => t.stops)
        .find((p) => p.id === s.id)!;
      const origin = new Vector3(...slotOrigin(s));
      const forward = new Vector3(0, 0, 1).applyMatrix4(slotMatrix(s)).sub(origin);
      const toCamera = new Vector3(pose.camera[0] - origin.x, 0, pose.camera[2] - origin.z);
      expect(forward.angleTo(toCamera), s.id).toBeLessThan(1e-6);
    }
  });

  it('sizes the hit box to plinth plus case: standard 0.9 x 1.85 x 0.9', () => {
    const box = hitBox('standard');
    expect(box.size[0]).toBeCloseTo(0.9, 9);
    expect(box.size[1]).toBeCloseTo(1.85, 9);
    expect(box.size[2]).toBeCloseTo(0.9, 9);
    expect(lo(box, 1)).toBeCloseTo(-1, 9);
    expect(hi(box, 1)).toBeCloseTo(0.85, 9);
    const wide = hitBox('wide');
    expect(wide.size[1]).toBeCloseTo(1.9, 9);
    expect(hitBox('wall')).toEqual(caseBox('wall'));
  });

  it('keeps every slot variant inside its case and above its plinth', () => {
    for (const variant of ['standard', 'wide', 'wall'] as const) {
      const glass = caseBox(variant);
      const bounds = SLOT_BOUNDS[variant];
      for (let i = 0; i < 3; i++) {
        expect(lo(glass, i), `${variant} min ${i}`).toBeLessThanOrEqual(bounds.min[i]!);
        expect(hi(glass, i), `${variant} max ${i}`).toBeGreaterThanOrEqual(bounds.max[i]!);
      }
    }
    expect(hi(plinthBox('standard'), 1)).toBeCloseTo(0, 9);
    expect(lo(plinthBox('standard'), 1)).toBeCloseTo(-1, 9);
    expect(lo(baseStripBox(), 1)).toBeCloseTo(-1, 9);
    expect(hi(baseStripBox(), 1)).toBeCloseTo(-0.97, 9);
  });

  it('frames a case with 12 brass edges on its outline', () => {
    const glass = caseBox('standard');
    const edges = edgeBoxes(glass);
    expect(edges).toHaveLength(EDGES_PER_CASE);
    for (const edge of edges) {
      const onFaces = [0, 1, 2].filter(
        (i) =>
          Math.abs(edge.center[i]! - lo(glass, i)) < 1e-9 ||
          Math.abs(edge.center[i]! - hi(glass, i)) < 1e-9,
      );
      expect(onFaces).toHaveLength(2);
    }
  });
});
