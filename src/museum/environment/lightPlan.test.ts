import { describe, expect, it } from 'vitest';
import type { StopId } from '../../content/ids';
import { content } from '../../content/index';
import { tokens } from '../../design/tokens';
import { computeLayout, type Vec3 } from '../rail/layout';
import {
  approach,
  assignLights,
  beamSpecs,
  DIALOG_DIM,
  lightPlan,
  lightTargets,
  matchLights,
  rampColor,
  spotIntensity,
  spotScaleGoal,
  targetColor,
  targetOfStop,
  type TargetId,
} from './lightPlan';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));
const ramp = tokens.light.ramp;
const main = layout.tracks.main.stops.map((s) => s.id);
const projects = layout.tracks.projects.stops.map((s) => s.id);
const at = (ids: StopId[], id: StopId) => ids.indexOf(id);

/** Linear sRGB mix of two #RRGGBB colors (the ramp interpolation). */
function mix(a: string, b: string, t: number): string {
  const rgb = (hex: string) => [0, 2, 4].map((i) => Number.parseInt(hex.slice(1 + i, 3 + i), 16));
  const [ca, cb] = [rgb(a), rgb(b)];
  return `#${ca
    .map((v, i) =>
      Math.round(v + (cb[i]! - v) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase();
}

describe('light plan per tier (EXPERIENCE §7.5, ART_DIRECTION §4)', () => {
  it('fixes 3 spotlights on high and 1 on medium and low', () => {
    expect(lightPlan('high').spots).toHaveLength(3);
    expect(lightPlan('medium').spots).toHaveLength(1);
    expect(lightPlan('low').spots).toHaveLength(1);
  });

  it('uses the recipe values and turns beams off only on low', () => {
    for (const tier of ['low', 'medium', 'high'] as const) {
      const plan = lightPlan(tier);
      expect(plan.hemisphere).toEqual({ sky: '#1A1C22', ground: '#0B0B0D', intensity: 0.15 });
      expect(plan.fog).toEqual({ color: '#0B0B0D', density: 0.045 });
      for (const spot of plan.spots) {
        expect(spot.angle).toBe(0.38);
        expect(spot.penumbra).toBe(0.6);
        expect(spot.decay).toBe(2);
        expect(spot.intensity).toBe(tokens.light.spotIntensity);
      }
      expect(plan.beams).toBe(tier !== 'low');
      expect(plan.floor).toBe(tier === 'high' ? 'reflector' : 'standard');
    }
  });
});

describe('warmth by age (EXPERIENCE §6.9 table)', () => {
  it('samples the ramp at 0, 1/3, 2/3 and 1 exactly on the four tokens', () => {
    expect([0, 1 / 3, 2 / 3, 1].map(rampColor)).toEqual([...ramp]);
  });

  it('gives every target the color of the table', () => {
    const expected: [TargetId, string][] = [
      ['verafin', ramp[0]],
      ['mysa', ramp[1]],
      ['wailo', ramp[2]],
      ['cfia', ramp[3]],
      ['mun', ramp[3]],
      ['certifications', ramp[3]],
      ['portrait', ramp[0]],
      ['desk', ramp[1]],
      // Wings take their door's t: projects 1/6 (between light-0 and light-1), volunteer 1/2.
      ['klarup', mix(ramp[0], ramp[1], 0.5)],
      ['finance-tracker', mix(ramp[0], ramp[1], 0.5)],
      ['sdsj', mix(ramp[1], ramp[2], 0.5)],
    ];
    for (const [id, color] of expected) expect(targetColor(layout, id), id).toBe(color);
    for (const t of lightTargets(layout)) expect(t.color, t.id).toBe(targetColor(layout, t.id));
  });
});

describe('light targets (EXPERIENCE §5.5, §6.8)', () => {
  const targets = new Map(lightTargets(layout).map((t) => [t.id, t]));

  it('lists the portrait, every slot and the desk', () => {
    expect(targets.size).toBe(layout.slots.length + 2);
    expect(lightTargets(layout)[0]!.id).toBe('portrait');
    expect(lightTargets(layout).at(-1)!.id).toBe('desk');
  });

  it('mounts each spotlight as EXPERIENCE §5.5 says and aims it at its target', () => {
    const expected: [TargetId, Vec3, Vec3][] = [
      ['portrait', [2.2, 5.4, -2.6], [3.0, 1.7, -3.95]],
      ['verafin', [2.4, 4.6, -9.4], [2.4, 1.35, -10]],
      ['klarup', [-8.4, 3.7, -13.8], [-9, 1.35, -13.8]],
      ['sdsj', [8.4, 3.7, -28], [9, 1.35, -28]],
      ['mun', [-2.5, 4.6, -56.4], [-2.5, 1.25, -57]],
      ['certifications', [4.4, 4.6, -57], [5.85, 1.6, -57]],
      ['desk', [0, 3.7, -66.9], [0, 0.765, -67.5]],
    ];
    for (const [id, mount, aim] of expected) {
      const t = targets.get(id)!;
      mount.forEach((v, i) => expect(t.mount[i], `${id} mount ${i}`).toBeCloseTo(v, 6));
      aim.forEach((v, i) => expect(t.aim[i], `${id} aim ${i}`).toBeCloseTo(v, 6));
    }
  });

  it('centers each aisle pool 0.3 m from the plinth toward the aisle center', () => {
    const verafin = targets.get('verafin')!;
    expect(verafin.pool[0]).toBeCloseTo(2.1, 6);
    expect(verafin.pool[1]).toBeCloseTo(-10, 6);
    const mysa = targets.get('mysa')!;
    expect(mysa.pool[0]).toBeCloseTo(-2.1, 6);
  });

  it('hangs each wash bay on the wall behind its target, facing into the room', () => {
    expect(targets.get('verafin')!.wash).toMatchObject({ axis: 'z', at: 3.5, normal: [-1, 0] });
    expect(targets.get('klarup')!.wash).toMatchObject({ axis: 'z', at: -11.5, normal: [1, 0] });
    expect(targets.get('certifications')!.wash).toMatchObject({ axis: 'z', at: 6 });
    expect(targets.get('portrait')!.wash).toMatchObject({ axis: 'x', at: -4, normal: [0, 1] });
    expect(targets.get('desk')!.wash).toMatchObject({ axis: 'x', at: -70, normal: [0, 1] });
  });
});

describe('assignment on arrival (EXPERIENCE §6.8)', () => {
  it('maps stops to targets: lobby the portrait, doors none', () => {
    expect(targetOfStop('lobby')).toBe('portrait');
    expect(targetOfStop('projects-door')).toBeNull();
    expect(targetOfStop('volunteer-door')).toBeNull();
    expect(targetOfStop('verafin')).toBe('verafin');
    expect(targetOfStop('desk')).toBe('desk');
  });

  it('lights the current target, or the next one ahead, on medium and low', () => {
    expect(assignLights(main, at(main, 'lobby'), 'medium')).toEqual(['portrait']);
    expect(assignLights(main, at(main, 'verafin'), 'low')).toEqual(['verafin']);
    expect(assignLights(main, at(main, 'projects-door'), 'medium')).toEqual(['mysa']);
    expect(assignLights(main, at(main, 'volunteer-door'), 'medium')).toEqual(['wailo']);
    expect(assignLights(main, at(main, 'desk'), 'medium')).toEqual(['desk']);
    expect(assignLights(projects, at(projects, 'projects-door'), 'medium')).toEqual(['klarup']);
  });

  it('gives lights 2 and 3 the next two targets ahead on high', () => {
    expect(assignLights(main, at(main, 'lobby'), 'high')).toEqual(['portrait', 'verafin', 'mysa']);
    expect(assignLights(main, at(main, 'projects-door'), 'high')).toEqual([
      'mysa',
      'wailo',
      'cfia',
    ]);
    expect(assignLights(main, at(main, 'certifications'), 'high')).toEqual([
      'certifications',
      'desk',
      null,
    ]);
    expect(assignLights(projects, at(projects, 'klarup'), 'high')).toEqual([
      'klarup',
      'finance-tracker',
      null,
    ]);
  });

  it('keeps a light on a target it already holds and moves only the others', () => {
    expect(matchLights(['portrait', 'verafin', 'mysa'], ['verafin', 'mysa', 'wailo'])).toEqual([
      'wailo',
      'verafin',
      'mysa',
    ]);
    expect(matchLights(['verafin'], ['mysa'])).toEqual(['mysa']);
    expect(matchLights([null, null, null], ['desk', null, null])).toEqual(['desk', null, null]);
  });
});

describe('light levels (ART_DIRECTION §4)', () => {
  const view = { current: 'verafin', hovered: null, openId: null } as const;

  it("lifts the visitor's own hovered light to 1.35x and dims the others while a story is open", () => {
    expect(spotScaleGoal('verafin', view)).toBe(1);
    expect(spotScaleGoal('verafin', { ...view, hovered: 'verafin' })).toBe(1.35);
    expect(spotScaleGoal('mysa', { ...view, hovered: 'mysa' })).toBe(1);
    expect(spotScaleGoal('verafin', { ...view, openId: 'verafin' })).toBe(1);
    expect(spotScaleGoal('mysa', { ...view, openId: 'verafin' })).toBe(DIALOG_DIM);
    expect(spotScaleGoal(null, { ...view, openId: 'verafin' })).toBe(1);
  });

  it('fades at a constant rate and jumps when the duration is 0', () => {
    expect(approach(0, 1, 0.25, 1, 1)).toBeCloseTo(0.25, 9);
    expect(approach(0.9, 1, 0.25, 1, 1)).toBe(1);
    expect(approach(1, 0.3, 0.2, 0.4, 0.7)).toBeCloseTo(0.65, 9);
    expect(approach(0, 1, 0.016, 0, 1)).toBe(1);
  });

  it('emits nothing without a target and scales with level and lift', () => {
    const spec = lightPlan('high').spots[0]!;
    expect(spotIntensity(spec, { target: null, level: 1, scale: 1 })).toBe(0);
    expect(spotIntensity(spec, { target: 'verafin', level: 0.5, scale: 1.35 })).toBeCloseTo(
      spec.intensity * 0.675,
      9,
    );
  });
});

describe('beam cones (EXPERIENCE §5.5)', () => {
  it('runs one cone per target from its mount to its aim, as wide as the bright core', () => {
    const beams = beamSpecs(layout);
    const targets = lightTargets(layout);
    expect(beams.map((b) => b.id)).toEqual(targets.map((t) => t.id));
    const verafin = beams.find((b) => b.id === 'verafin')!;
    const length = Math.hypot(0, 4.6 - 1.35, 0.6);
    expect(verafin.radius).toBeCloseTo(length * Math.tan(0.38 * 0.4), 6);
    expect(verafin.apex).toEqual(targets.find((t) => t.id === 'verafin')!.mount);
  });
});
