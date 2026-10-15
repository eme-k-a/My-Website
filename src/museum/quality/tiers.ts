// Seam (WP-02): WP-16 (R7) implements the full tier table (ARCHITECTURE §8.4). For now an explicit
// valid ?tier= wins, otherwise 'medium'.
import type { QualityTier } from '../exhibits/_kit/types';

export interface TierInput {
  coarse: boolean;
  cores: number;
  saveData: boolean;
  renderer: string;
  params: { test?: boolean; tier?: string | null };
}

const TIERS: readonly QualityTier[] = ['low', 'medium', 'high'];

export function chooseTier(input: TierInput): QualityTier {
  return TIERS.find((t) => t === input.params.tier) ?? 'medium';
}
