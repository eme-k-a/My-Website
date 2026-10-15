import { describe, expect, it } from 'vitest';
import type { StopId } from '../../content/ids';
import { content } from '../../content/index';
import { computeLayout, type Vec3 } from '../rail/layout';
import { litStop, spotPlan } from './lighting';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));

describe('greybox spotlight', () => {
  it('lights the current stop, or the next target ahead for the lobby and doors', () => {
    expect(litStop(layout, 'lobby')).toBe('verafin');
    expect(litStop(layout, 'verafin')).toBe('verafin');
    expect(litStop(layout, 'projects-door')).toBe('mysa');
    expect(litStop(layout, 'volunteer-door')).toBe('wailo');
    expect(litStop(layout, 'klarup')).toBe('klarup');
    expect(litStop(layout, 'desk')).toBe('desk');
  });

  it('mounts like EXPERIENCE §5.5 and aims at the slot center', () => {
    const expected: [StopId, Vec3, Vec3][] = [
      ['verafin', [2.4, 4.6, -9.4], [2.4, 1.35, -10]],
      ['klarup', [-8.4, 3.7, -13.8], [-9, 1.35, -13.8]],
      ['sdsj', [8.4, 3.7, -30.2], [9, 1.35, -30.2]],
      ['mun', [-2.5, 4.6, -56.4], [-2.5, 1.25, -57]],
      ['certifications', [4.4, 4.6, -57], [5.85, 1.6, -57]],
      ['desk', [0, 3.7, -66.9], [0, 1.1, -67.5]],
    ];
    for (const [id, position, target] of expected) {
      const plan = spotPlan(layout, id);
      position.forEach((v, i) => expect(plan.position[i], `${id} position ${i}`).toBeCloseTo(v, 6));
      target.forEach((v, i) => expect(plan.target[i], `${id} target ${i}`).toBeCloseTo(v, 6));
    }
  });
});
