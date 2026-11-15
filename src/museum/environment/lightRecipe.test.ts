import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import { EXHIBIT_IDS, STOP_ONLY_IDS, WING_IDS, doorId, type StopId } from '../../content/ids';
import { tokens } from '../../design/tokens';
import type { QualityTier } from '../exhibits/_kit/types';
import { computeLayout } from '../rail/layout';
import { assignLights, beamSpecs, lightTargets, rampColor, targetColor } from './lightPlan';
import { floorPaint, washLayout } from './lightPools';
import { MAX_POOL_ALPHA, RECIPE_STOPS, STOP_RECIPES, stopRecipe } from './lightRecipe';

const layout = computeLayout(content, new Date('2026-10-24T00:00:00Z'));
const TIERS: QualityTier[] = ['high', 'medium', 'low'];
const DOORS = new Set<string>(WING_IDS.map(doorId));

describe('light recipe (WP-26, ART_DIRECTION §4)', () => {
  it('has a recipe for every stop id, and only for stop ids', () => {
    const all = [...STOP_ONLY_IDS, ...EXHIBIT_IDS].sort();
    expect([...RECIPE_STOPS].sort()).toEqual(all);
    expect(Object.keys(STOP_RECIPES).sort()).toEqual(all);
    for (const stop of layout.tracks.main.stops) expect(RECIPE_STOPS).toContain(stop.id);
  });

  it('keeps every value in range on every tier', () => {
    for (const stop of RECIPE_STOPS) {
      for (const tier of TIERS) {
        const r = stopRecipe(stop, tier);
        expect(r.spot, stop).toBeGreaterThanOrEqual(0);
        expect(r.spot, stop).toBeLessThanOrEqual(1);
        expect(r.pool, stop).toBeGreaterThan(0);
        expect(r.pool, stop).toBeLessThanOrEqual(MAX_POOL_ALPHA);
        expect(r.wash, stop).toBeGreaterThanOrEqual(0);
        expect(r.wash, stop).toBeLessThanOrEqual(1.5);
        expect(r.beam, stop).toBeGreaterThanOrEqual(0);
        expect(r.beam, stop).toBeLessThanOrEqual(1);
      }
    }
  });

  it('gives doors only a threshold pool, and every light target a spot', () => {
    for (const stop of RECIPE_STOPS) {
      const r = STOP_RECIPES[stop];
      if (DOORS.has(stop)) {
        expect([r.spot, r.wash, r.beam], stop).toEqual([0, 0, 0]);
        expect(r.pool, stop).toBeGreaterThanOrEqual(tokens.light.doorPoolAlpha);
      } else {
        expect(r.spot, stop).toBeGreaterThan(0);
      }
    }
  });

  it('turns the beams off on low and lifts pools and washes on the one-light tiers', () => {
    for (const stop of RECIPE_STOPS) {
      expect(stopRecipe(stop, 'low').beam).toBe(0);
      expect(stopRecipe(stop, 'medium').pool).toBeGreaterThanOrEqual(stopRecipe(stop, 'high').pool);
      expect(stopRecipe(stop, 'medium').wash).toBeGreaterThanOrEqual(stopRecipe(stop, 'high').wash);
    }
  });

  it('calms the certifications panel (F-043): a dim spot and a soft wash', () => {
    const r = stopRecipe('certifications', 'high');
    expect(r.spot).toBeLessThanOrEqual(0.6);
    expect(r.wash).toBeLessThan(1);
  });

  it('applies the recipe to pools, washes and beams', () => {
    for (const tier of TIERS) {
      const paint = floorPaint(layout, tier);
      for (const pool of paint.pools.filter((p) => p.kind === 'pool')) {
        const target = lightTargets(layout).find((t) => t.id === pool.for)!;
        expect(pool.alpha, pool.for).toBe(stopRecipe(target.stop, tier).pool);
      }
      for (const pool of paint.pools.filter((p) => p.kind === 'door')) {
        expect(pool.alpha, pool.for).toBe(stopRecipe(pool.for as StopId, tier).pool);
      }
      for (const bay of washLayout(layout, tier).bays) {
        const target = lightTargets(layout).find((t) => t.id === bay.for)!;
        expect(bay.strength, bay.for).toBe(stopRecipe(target.stop, tier).wash);
      }
      for (const beam of beamSpecs(layout, tier)) {
        const target = lightTargets(layout).find((t) => t.id === beam.id)!;
        expect(beam.strength, beam.id).toBe(stopRecipe(target.stop, tier).beam);
      }
    }
  });
});

describe('warmth with age (EXPERIENCE §6.9)', () => {
  const ramp = tokens.light.ramp;

  it('colors the four main exhibits with exactly the four ramp tokens', () => {
    expect(targetColor(layout, 'verafin')).toBe(ramp[0]);
    expect(targetColor(layout, 'mysa')).toBe(ramp[1]);
    expect(targetColor(layout, 'wailo')).toBe(ramp[2]);
    expect(targetColor(layout, 'cfia')).toBe(ramp[3]);
  });

  it('puts Foundations at light-3, lobby and portrait at light-0, the desk at light-1', () => {
    expect(targetColor(layout, 'mun')).toBe(ramp[3]);
    expect(targetColor(layout, 'certifications')).toBe(ramp[3]);
    expect(targetColor(layout, 'portrait')).toBe(ramp[0]);
    expect(targetColor(layout, 'desk')).toBe(ramp[1]);
  });

  it('gives each wing its door t: projects at 1/6, volunteer at 1/2', () => {
    for (const id of ['klarup', 'finance-tracker'] as const) {
      expect(targetColor(layout, id)).toBe(rampColor(1 / 6));
    }
    expect(targetColor(layout, 'sdsj')).toBe(rampColor(0.5));
  });

  it('pools, washes and beams carry their target color', () => {
    const colors = new Map(lightTargets(layout).map((t) => [t.id, t.color]));
    for (const pool of floorPaint(layout).pools.filter((p) => p.kind === 'pool')) {
      expect(pool.color).toBe(colors.get(pool.for as never));
    }
    for (const bay of washLayout(layout).bays) expect(bay.color).toBe(colors.get(bay.for));
    for (const beam of beamSpecs(layout)) expect(beam.color).toBe(colors.get(beam.id));
  });

  it('warms monotonically down the main aisle (red to blue ratio grows)', () => {
    const warmth = (hex: string) => {
      const n = Number.parseInt(hex.slice(1), 16);
      return ((n >> 16) & 255) / (n & 255);
    };
    const order = ['verafin', 'mysa', 'wailo', 'cfia'] as const;
    const w = order.map((id) => warmth(targetColor(layout, id)));
    for (let i = 1; i < w.length; i++) expect(w[i]!).toBeGreaterThan(w[i - 1]!);
  });
});

describe('real lights per tier (EXPERIENCE §6.8)', () => {
  const ids = layout.tracks.main.stops.map((s) => s.id);
  it('assigns 3 targets on high and 1 on medium and low', () => {
    const lobby = ids.indexOf('lobby');
    expect(assignLights(ids, lobby, 'high').filter(Boolean)).toHaveLength(3);
    expect(assignLights(ids, lobby, 'medium').filter(Boolean)).toHaveLength(1);
    expect(assignLights(ids, lobby, 'low').filter(Boolean)).toHaveLength(1);
  });
});
