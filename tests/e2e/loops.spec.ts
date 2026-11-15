// Twenty-loop resilience (WP-32 A1; ARCHITECTURE §10, EXPERIENCE §6.7). Desktop only, ?test=1&mode=museum.
// One page walks the whole gallery 20 times with the test hook's goTo, which travels through the
// UI's own navigation (ARCHITECTURE §6.7): every main stop in order and, at each door, into the
// wing, through every wing exhibit, back to the door on the wing track, and out again with the
// next main stop. The global guards (fixtures.ts) fail the test on any page error, console error,
// CSP violation or foreign request. Every loop ends at the desk, where `stats()` is sampled: the
// GPU geometry and texture counts after loop 20 stay within 5% of loop 2 (loop 1 still mounts
// exhibits for the first time). It is the guard against context churn and leaks, and it is slow,
// so it is not @smoke. First run (WP-32): it fails on drei ContactShadows, which never disposes
// its render targets, so each exhibit remount leaks 2 textures and 1 geometry; the fix is R3's
// (review/reports/WP-32.json, requests).
import type { Page } from '@playwright/test';
import type { MuseumStats } from '../../src/app/testHooks';
import { doorId, WING_IDS, type StopId, type WingId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { mainTrack, wingTrack } from '../../src/content/selectors';
import { expect, test } from './fixtures';
import { goToStop, museumUrl, stats, waitForMuseum } from './helpers';

const LOOPS = 20;
/** The loop whose counts are the baseline: loop 1 mounts every exhibit for the first time. */
const BASELINE_LOOP = 2;
/** Growth allowed between the baseline loop and the last one (WP-32 A1). */
const MARGIN = 0.05;
/**
 * A local two-worker run took 17 to 21 s a loop under SwiftShader (13 main and wing stops plus the
 * wing entries and exits); CI desktop frames cost up to 3 s (F-M2), so a minute a loop, plus the
 * boot.
 */
const TIMEOUT_MS = LOOPS * 60_000 + 60_000;

const MAIN: StopId[] = mainTrack(content);
const DOORS = new Map<StopId, WingId>(WING_IDS.map((wing) => [doorId(wing), wing]));

type Counts = Pick<MuseumStats, 'geometries' | 'textures' | 'programs' | 'textureMB'>;

/** One full walk: every main stop, and every wing entered, visited and exited. */
async function walk(page: Page): Promise<void> {
  for (const stop of MAIN) {
    await goToStop(page, stop);
    expect((await stats(page)).track, `${stop} is on the main track`).toBe('main');
    const wing = DOORS.get(stop);
    if (!wing) continue;
    const [door, ...items] = wingTrack(content, wing);
    for (const item of items) {
      await goToStop(page, item);
      expect((await stats(page)).track, `${item} is inside the ${wing} wing`).toBe(wing);
    }
    // Back to the door on the wing track; the next main stop exits the wing.
    await goToStop(page, door!);
    expect((await stats(page)).track, `back at ${door} inside the wing`).toBe(wing);
  }
}

test.describe('resilience', () => {
  test(`${LOOPS} loops through every stop and both wings leak nothing`, async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'desktop only');
    test.setTimeout(TIMEOUT_MS);
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);

    const counts: Counts[] = [];
    for (let loop = 1; loop <= LOOPS; loop++) {
      const start = Date.now();
      await walk(page);
      const { geometries, textures, programs, textureMB } = await stats(page);
      counts.push({ geometries, textures, programs, textureMB });
      console.log(
        `loops: ${loop}/${LOOPS} in ${Date.now() - start} ms, geometries ${geometries}, ` +
          `textures ${textures}, programs ${programs}, ${textureMB.toFixed(1)} MB`,
      );
    }
    test.info().annotations.push({ type: 'loops', description: JSON.stringify(counts) });

    const baseline = counts[BASELINE_LOOP - 1]!;
    const last = counts.at(-1)!;
    for (const key of ['geometries', 'textures'] as const) {
      expect(
        last[key],
        `${key} after loop ${LOOPS} (loop ${BASELINE_LOOP}: ${baseline[key]})`,
      ).toBeLessThanOrEqual(Math.floor(baseline[key] * (1 + MARGIN)));
    }
  });
});
