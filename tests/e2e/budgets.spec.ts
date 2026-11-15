// Render budgets per stop and tier (ARCHITECTURE §9, WP-29 A2; R7 under a grant). At every main
// and wing stop, on `desktop` at &tier=high and &tier=medium and on `pixel7` (medium, the ?test=1
// default): `stats().calls` within render.drawCalls[tier], `stats().triangles` within
// render.triangles (desktop or mobile), every mounted exhibit's `stats().exhibits[id].triangles`
// within render.triangles.perExhibit, and `stats().textureMB` within render.textureMB. Every
// limit comes from perf/budgets.json; none is written here. `calls` counts the reflector pass
// (`gl.info.autoReset = false` in StatsProbe) and the arrival frame (F-M3a).
//
// The walk visits the stops in order on one page, so exhibits kept mounted by the stop-graph
// hysteresis count too, the way a visitor scrolling through the aisle loads them. This spec is
// the single source of truth for the render budgets: environment.spec.ts (R8) repeats them and
// is asked, in review/reports/WP-29.json, to keep only its review captures.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { EXHIBIT_IDS, type StopId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { buildDateFromEnv } from '../../src/content/temporal';
import type { QualityTier } from '../../src/museum/exhibits/_kit/types';
import { computeLayout } from '../../src/museum/rail/layout';
import { expect, test } from './fixtures';
import { goToStop, museumUrl, stats, waitForMuseum } from './helpers';

interface RenderBudgets {
  drawCalls: Record<QualityTier, number>;
  triangles: { desktop: number; mobile: number; perExhibit: number };
  textureMB: { desktop: number; mobile: number };
}

const BUDGETS = (
  JSON.parse(
    readFileSync(fileURLToPath(new URL('../../perf/budgets.json', import.meta.url)), 'utf8'),
  ) as { render: RenderBudgets }
).render;

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
};

interface StopRow {
  stop: StopId;
  calls: number;
  triangles: number;
  textureMB: number;
  /** The largest per-exhibit triangle count among the mounted exhibits, with its id. */
  maxExhibit: { id: string; triangles: number } | null;
}

/** Two animation frames, so the last rendered frame shows the settled stop. */
async function nextFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
}

test('the walk covers every stop and every exhibit', () => {
  expect(new Set(ALL_STOPS).size).toBe(ALL_STOPS.length);
  for (const id of EXHIBIT_IDS) expect(ALL_STOPS, `${id} is a stop`).toContain(id);
});

for (const tier of ['high', 'medium'] as const) {
  test.describe(`render budgets, tier ${tier}`, () => {
    test.beforeEach(() => {
      const run = RUNS[test.info().project.name];
      test.skip(!run?.tiers.includes(tier), `tier ${tier} is not walked on this project`);
    });

    test(`every stop within the render budgets at tier ${tier}`, async ({ page }) => {
      test.setTimeout(240_000);
      const project = test.info().project.name;
      const mobile = RUNS[project]!.mobile;
      const limits = {
        calls: BUDGETS.drawCalls[tier],
        triangles: mobile ? BUDGETS.triangles.mobile : BUDGETS.triangles.desktop,
        perExhibit: BUDGETS.triangles.perExhibit,
        textureMB: mobile ? BUDGETS.textureMB.mobile : BUDGETS.textureMB.desktop,
      };

      await page.goto(museumUrl('/', { tier }));
      await waitForMuseum(page);

      const rows: StopRow[] = [];
      const exhibitPeak: Record<string, number> = {};
      for (const stop of ALL_STOPS) {
        await goToStop(page, stop);
        await nextFrames(page);
        const s = await stats(page);
        expect(s.tier, 'the tier is fixed at boot').toBe(tier);

        let maxExhibit: StopRow['maxExhibit'] = null;
        for (const [id, ex] of Object.entries(s.exhibits)) {
          if (!ex) continue;
          exhibitPeak[id] = Math.max(exhibitPeak[id] ?? 0, ex.triangles);
          if (!maxExhibit || ex.triangles > maxExhibit.triangles) {
            maxExhibit = { id, triangles: ex.triangles };
          }
          expect
            .soft(ex.triangles, `${stop}: ${id} triangles`)
            .toBeLessThanOrEqual(limits.perExhibit);
        }
        rows.push({
          stop,
          calls: s.calls,
          triangles: s.triangles,
          textureMB: Number(s.textureMB.toFixed(2)),
          maxExhibit,
        });
        expect.soft(s.calls, `${stop}: draw calls`).toBeLessThanOrEqual(limits.calls);
        expect.soft(s.calls, `${stop}: something rendered`).toBeGreaterThan(0);
        expect.soft(s.triangles, `${stop}: triangles`).toBeLessThanOrEqual(limits.triangles);
        expect.soft(s.textureMB, `${stop}: texture MB`).toBeLessThanOrEqual(limits.textureMB);
        if (EXHIBIT_IDS.includes(stop as (typeof EXHIBIT_IDS)[number])) {
          expect
            .soft(s.exhibits[stop as keyof typeof s.exhibits], `${stop}: reported`)
            .toBeTruthy();
        }
      }

      const table = { project, tier, limits, rows, exhibitPeak };
      test.info().annotations.push({ type: 'render budgets', description: JSON.stringify(table) });
      await test.info().attach(`render-budgets-${project}-${tier}.json`, {
        body: `${JSON.stringify(table, null, 2)}\n`,
        contentType: 'application/json',
      });
      expect(rows).toHaveLength(ALL_STOPS.length);
      for (const id of EXHIBIT_IDS)
        expect.soft(exhibitPeak[id], `${id} was measured`).toBeDefined();
    });
  });
}
