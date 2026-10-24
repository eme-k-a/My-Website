// The per-stop light recipe (WP-26; ART_DIRECTION §4 "Per-stop recipe"). Data, keyed by stop id,
// never hand-placed lights: every light target keeps its temperature from the age ramp
// (lightPlan.ts `targetColor`), and the recipe only scales how strongly each part of its light
// reads, per tier:
// - `spot`: the real spotlight's candela, as a share of `tokens.light.spotIntensity`;
// - `pool`: the baked floor pool's peak alpha (`tokens.light.poolAlpha` is the reference);
// - `wash`: the wall-wash bay's strength (multiplies its temperature tint);
// - `beam`: the beam cone's strength (multiplies its temperature tint; no cones on low).
// Door stops own no light target: their row holds only the threshold pool alpha (the door
// threshold pool), and `spot`, `wash` and `beam` stay 0.
// Medium and low have one real spotlight, so the baked pools and washes carry more of the room
// there: the tier step lifts both (TIER_LIFT), capped at MAX_POOL_ALPHA.
import { EXHIBIT_IDS, STOP_ONLY_IDS, type StopId } from '../../content/ids';
import { tokens } from '../../design/tokens';
import type { QualityTier } from '../exhibits/_kit/types';

const light = tokens.light;

export interface LightRecipe {
  spot: number;
  pool: number;
  wash: number;
  beam: number;
}

/** A pool never paints more than this alpha, whatever the tier lift. */
export const MAX_POOL_ALPHA = 0.95;

/** What medium and low add on top of the high recipe (one real light instead of three). */
export const TIER_LIFT: Record<QualityTier, { pool: number; wash: number }> = {
  high: { pool: 0, wash: 1 },
  medium: { pool: 0.06, wash: 1.15 },
  low: { pool: 0.06, wash: 1.15 },
};

const exhibit = (over: Partial<LightRecipe> = {}): LightRecipe => ({
  spot: 1,
  pool: light.poolAlpha,
  wash: 1,
  beam: 1,
  ...over,
});
const door = (over: Partial<LightRecipe> = {}): LightRecipe => ({
  spot: 0,
  pool: light.doorPoolAlpha,
  wash: 0,
  beam: 0,
  ...over,
});

/**
 * The high-tier recipe per stop (ART_DIRECTION §4 table). Reasons, in short:
 * - lobby: the portrait's wash and cone are a dim warm halo, not a grey wedge behind it (G3 D1);
 * - verafin: its pool and wash are what the lobby sees through the arch, so they read a step up;
 * - mysa, cfia: the left half of the desktop frame is their own aisle wall, so a fuller wash;
 * - certifications: a dim spot and a soft wash around the walnut panel (F-043), so the vitrine and
 *   the medals carry the light, never the panel;
 * - doors: the threshold pool invites a little more than the spec's floor (G3 D1).
 */
export const STOP_RECIPES: Record<StopId, LightRecipe> = {
  lobby: exhibit({ spot: 0.35, wash: 0.45, beam: 0.4 }),
  verafin: exhibit({ pool: 0.9, wash: 1.2 }),
  'projects-door': door({ pool: 0.42 }),
  klarup: exhibit(),
  'finance-tracker': exhibit(),
  mysa: exhibit({ wash: 1.2 }),
  'volunteer-door': door({ pool: 0.42 }),
  sdsj: exhibit(),
  wailo: exhibit({ wash: 1.1 }),
  cfia: exhibit({ wash: 1.15 }),
  mun: exhibit(),
  certifications: exhibit({ spot: 0.5, pool: 0.7, wash: 0.7, beam: 0.5 }),
  desk: exhibit(),
};

/** Every stop id the gallery can have (main, doors, wing items). */
export const RECIPE_STOPS: readonly StopId[] = [...STOP_ONLY_IDS, ...EXHIBIT_IDS];

/** A stop's recipe at a tier. */
export function stopRecipe(stop: StopId, tier: QualityTier): LightRecipe {
  const base = STOP_RECIPES[stop];
  const lift = TIER_LIFT[tier];
  return {
    spot: base.spot,
    pool: Math.min(MAX_POOL_ALPHA, base.pool + (base.pool > 0 ? lift.pool : 0)),
    wash: base.wash * lift.wash,
    beam: tier === 'low' ? 0 : base.beam,
  };
}
