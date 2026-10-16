// The quality tier (ARCHITECTURE §8.4, EXPERIENCE §7.5): chosen once at boot by main.tsx from what
// the boot script saw, written to html[data-tier] and the store, and never changed at runtime.
// Light count, floor material and antialias follow the tier for the whole session; only the
// device pixel ratio adapts (QualityController). Pure data and functions: main.tsx imports this
// file, so it must never import three.js, R3F or drei (it lives in the entry chunk, R-M1-2).
import { tokens } from '../../design/tokens';
import type { QualityTier } from '../exhibits/_kit/types';

export interface TierInput {
  /** `(pointer: coarse)` matches. */
  coarse: boolean;
  /** `navigator.hardwareConcurrency` (0 when unknown). */
  cores: number;
  /** `navigator.connection.saveData`; only reachable with an explicit museum choice. */
  saveData: boolean;
  /** The unmasked WebGL renderer string ('' when unknown). */
  renderer: string;
  params: { test?: boolean; tier?: string | null };
}

export const QUALITY_TIERS: readonly QualityTier[] = ['low', 'medium', 'high'];

/** Phone GPUs that get `low` (rule 4). Safari has no deviceMemory, so memory is not used. */
export const WEAK_MOBILE_GPU = /Mali-4|Mali-T|Adreno \(TM\) [345]\d\d|PowerVR SGX/i;

/** Desktop renderers that never get `high` (rule 5); Apple GPUs are not on the list. */
export const NOT_HIGH_GPU = /Intel|Mali|Adreno|SwiftShader|llvmpipe/i;

/** Cores a phone needs for `medium`, and a desktop for `high`. */
export const MIN_COARSE_CORES = 4;
export const MIN_HIGH_CORES = 8;

/** The five ordered rules of ARCHITECTURE §8.4; the first that applies wins. */
export function chooseTier(input: TierInput): QualityTier {
  // 1. An explicit, valid ?tier= wins (debug and tests).
  const explicit = QUALITY_TIERS.find((tier) => tier === input.params.tier);
  if (explicit) return explicit;
  // 2. ?test=1 is medium.
  if (input.params.test) return 'medium';
  // 3. Save-Data is low.
  if (input.saveData) return 'low';
  // 4. Coarse pointers: medium, or low with few cores or a weak GPU.
  if (input.coarse) {
    return input.cores < MIN_COARSE_CORES || WEAK_MOBILE_GPU.test(input.renderer)
      ? 'low'
      : 'medium';
  }
  // 5. Fine pointers: high with 8 or more cores and a GPU off the list, otherwise medium.
  return input.cores >= MIN_HIGH_CORES && !NOT_HIGH_GPU.test(input.renderer) ? 'high' : 'medium';
}

/** The DPR cap of a tier: 2, 1.5 and 1 for high, medium and low (tokens.render.maxDpr). */
export function maxDpr(tier: QualityTier): number {
  return tokens.render.maxDpr[tier];
}

/**
 * The DPR the canvas starts at and may climb back to: `min(devicePixelRatio, maxDpr)`. Under
 * ?test=1 it is fixed at 1 (ARCHITECTURE §13.3).
 */
export function startDpr(tier: QualityTier, devicePixelRatio: number, test: boolean): number {
  if (test) return 1;
  const device = devicePixelRatio > 0 ? devicePixelRatio : 1;
  return Math.min(device, maxDpr(tier));
}
