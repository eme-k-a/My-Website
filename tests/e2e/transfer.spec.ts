// Transfer budgets (ARCHITECTURE §9, WP-28 A1). A fresh context loads the gallery, goes to wailo
// (the first three exhibits plus the neighbors their mount window loads) and sums `transferSize`
// of the navigation and every resource entry: at most perf/budgets.json transfer.firstThreeExhibitsMB.
// It then visits every stop on every track (the main aisle, then each wing's items through the
// wing's own door) and checks the total against transfer.fullWalkMB. serve-dist gzips text, an
// upper bound on Netlify's brotli, so these numbers are conservative. The global guards
// (fixtures.ts) also fail the run on any cross-origin or troika fallback-font request (A4).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { StopId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { buildDateFromEnv } from '../../src/content/temporal';
import { computeLayout } from '../../src/museum/rail/layout';
import { expect, test } from './fixtures';
import { goToStop, keepResourceTimings, museumUrl, transferBytes, waitForMuseum } from './helpers';

const TRANSFER = (
  JSON.parse(
    readFileSync(fileURLToPath(new URL('../../perf/budgets.json', import.meta.url)), 'utf8'),
  ) as { transfer: { firstThreeExhibitsMB: number; fullWalkMB: number } }
).transfer;
const MB = 1024 * 1024;

const layout = computeLayout(content, buildDateFromEnv());

/** Every stop once: the main track, then each wing's items (doors are on the main track). */
const ALL_STOPS: StopId[] = [
  ...layout.tracks.main.stops.map((s) => s.id),
  ...layout.tracks.projects.stops.slice(1).map((s) => s.id),
  ...layout.tracks.volunteer.stops.slice(1).map((s) => s.id),
];

const round = (bytes: number) => Number((bytes / MB).toFixed(3));

test.describe('transfer budgets', () => {
  test.beforeEach(() => {
    const project = test.info().project.name;
    test.skip(project !== 'desktop' && project !== 'pixel7', 'measured on desktop and pixel7');
  });

  test('first three exhibits, then the full walk, within the transfer budgets', async ({
    page,
  }) => {
    test.setTimeout(240_000);
    await keepResourceTimings(page);
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);

    await goToStop(page, 'wailo');
    const atWailo = await transferBytes(page);

    for (const stop of ALL_STOPS) await goToStop(page, stop);
    const fullWalk = await transferBytes(page);

    // The per-type split goes into the annotation and the report (review/reports/WP-28.json).
    const byType = await page.evaluate(() => {
      const sums: Record<string, number> = {};
      for (const entry of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) {
        const ext = /\.([a-z0-9]+)$/i.exec(new URL(entry.name).pathname)?.[1] ?? 'other';
        sums[ext] = (sums[ext] ?? 0) + (entry.transferSize || 0);
      }
      return sums;
    });
    const totals = {
      project: test.info().project.name,
      atWailoMB: round(atWailo),
      fullWalkMB: round(fullWalk),
      byTypeKB: Object.fromEntries(
        Object.entries(byType)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([ext, bytes]) => [ext, Number((bytes / 1024).toFixed(1))]),
      ),
    };
    test.info().annotations.push({ type: 'transfer', description: JSON.stringify(totals) });

    expect(atWailo, 'something was transferred').toBeGreaterThan(0);
    expect
      .soft(totals.atWailoMB, 'transfer to wailo (first three exhibits)')
      .toBeLessThanOrEqual(TRANSFER.firstThreeExhibitsMB);
    expect
      .soft(totals.fullWalkMB, 'transfer after the full walk')
      .toBeLessThanOrEqual(TRANSFER.fullWalkMB);
  });
});
