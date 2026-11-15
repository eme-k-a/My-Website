// The scaffold's tier state (EXPERIENCE §4.9, WP-21 ruling): computed inside the exhibit from the
// expected graduation month and the build date, never stored. Each remaining tier is a year of
// study still ahead; after graduation every tier is a ghost.

export const TIER_COUNT = 5;

/** Months from the build date's month to the graduation month ("YYYY-MM"); negative after it. */
export function monthsUntil(graduation: string, buildDate: string): number {
  const [gy, gm] = graduation.split('-').map(Number);
  const [by, bm] = buildDate.split('-').map(Number);
  if (!gy || !gm || !by || !bm) throw new Error(`Bad dates: '${graduation}', '${buildDate}'`);
  return gy * 12 + gm - (by * 12 + bm);
}

/** `clamp(ceil(monthsUntilGraduation / 12), 0, 5)`: brass tiers still standing. */
export function tiersRemaining(graduation: string, buildDate: string): number {
  const years = Math.ceil(monthsUntil(graduation, buildDate) / 12);
  // `+ 0` turns the -0 of ceil(-0.08) into 0.
  return Math.min(TIER_COUNT, Math.max(0, years)) + 0;
}
