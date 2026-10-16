// Environment v1 render budgets (WP-11 under a grant; R8 owns this spec after the merge).
// For every main and wing stop, on `desktop` at &tier=high and &tier=medium and on `pixel7` and
// `pixel7-landscape` (medium, the ?test=1 default): `stats().calls`, `triangles` and `textureMB`
// stay within perf/budgets.json (ARCHITECTURE §9). Each stop is also captured to
// out/wp11/<stop>-<project>[-high].png as a review artifact (not a baseline). The walk visits the
// stops in order on one page, so exhibits kept mounted by the stop-graph hysteresis count too.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { StopId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { buildDateFromEnv } from '../../src/content/temporal';
import type { QualityTier } from '../../src/museum/exhibits/_kit/types';
import { computeLayout } from '../../src/museum/rail/layout';
import { expect, test } from './fixtures';
import { goToStop, museumUrl, stats, waitForMuseum } from './helpers';

interface RenderBudgets {
  drawCalls: Record<QualityTier, number>;
  triangles: { desktop: number; mobile: number };
  textureMB: { desktop: number; mobile: number };
}

const BUDGETS = (
  JSON.parse(
    readFileSync(fileURLToPath(new URL('../../perf/budgets.json', import.meta.url)), 'utf8'),
  ) as { render: RenderBudgets }
).render;

const OUT_DIR = fileURLToPath(new URL('../../out/wp11/', import.meta.url));

const layout = computeLayout(content, buildDateFromEnv());

/** Every stop once: the main track, then each wing's items (doors are on the main track). */
const ALL_STOPS: StopId[] = [
  ...layout.tracks.main.stops.map((s) => s.id),
  ...layout.tracks.projects.stops.slice(1).map((s) => s.id),
  ...layout.tracks.volunteer.stops.slice(1).map((s) => s.id),
];

/** Which tiers each project walks, and whether its limits are the mobile ones. */
const RUNS: Record<string, { tiers: QualityTier[]; mobile: boolean }> = {
  desktop: { tiers: ['high', 'medium'], mobile: false },
  pixel7: { tiers: ['medium'], mobile: true },
  'pixel7-landscape': { tiers: ['medium'], mobile: true },
};

interface StopRow {
  stop: StopId;
  calls: number;
  triangles: number;
  textureMB: number;
  programs: number;
  mounted: number;
}

/** Two animation frames, so the last rendered frame shows the settled stop. */
async function nextFrames(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

for (const tier of ['high', 'medium'] as const) {
  test.describe(`environment budgets, tier ${tier}`, () => {
    test.beforeEach(() => {
      const run = RUNS[test.info().project.name];
      test.skip(!run?.tiers.includes(tier), `tier ${tier} is not walked on this project`);
    });

    test(`every stop within budget at tier ${tier}`, async ({ page }) => {
      test.setTimeout(240_000);
      const project = test.info().project.name;
      const mobile = RUNS[project]!.mobile;
      const limits = {
        calls: BUDGETS.drawCalls[tier],
        triangles: mobile ? BUDGETS.triangles.mobile : BUDGETS.triangles.desktop,
        textureMB: mobile ? BUDGETS.textureMB.mobile : BUDGETS.textureMB.desktop,
      };
      mkdirSync(OUT_DIR, { recursive: true });
      const suffix = project === 'desktop' && tier === 'high' ? '-high' : '';

      await page.goto(museumUrl('/', { tier }));
      await waitForMuseum(page);

      const rows: StopRow[] = [];
      for (const stop of ALL_STOPS) {
        await goToStop(page, stop);
        await nextFrames(page);
        const s = await stats(page);
        expect(s.tier, 'the tier is fixed at boot').toBe(tier);
        rows.push({
          stop,
          calls: s.calls,
          triangles: s.triangles,
          textureMB: Number(s.textureMB.toFixed(2)),
          programs: s.programs,
          mounted: s.mounted.length,
        });
        expect.soft(s.calls, `${stop}: draw calls`).toBeLessThanOrEqual(limits.calls);
        expect.soft(s.calls, `${stop}: something rendered`).toBeGreaterThan(0);
        expect.soft(s.triangles, `${stop}: triangles`).toBeLessThanOrEqual(limits.triangles);
        expect.soft(s.textureMB, `${stop}: texture MB`).toBeLessThanOrEqual(limits.textureMB);
        await page.screenshot({ path: `${OUT_DIR}${stop}-${project}${suffix}.png` });
      }

      const table = { project, tier, limits, rows };
      test.info().annotations.push({ type: 'render budgets', description: JSON.stringify(table) });
      writeFileSync(
        `${OUT_DIR}budgets-${project}-${tier}.json`,
        `${JSON.stringify(table, null, 2)}\n`,
      );
      expect(rows).toHaveLength(ALL_STOPS.length);
    });
  });
}
