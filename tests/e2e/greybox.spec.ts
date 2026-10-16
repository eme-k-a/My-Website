// Greybox render and draw-call checks (WP-08; R8 owns this spec after the merge). The stage
// renders the hall from computeLayout, every slot shows the placeholder crate until its exhibit
// exists, and every stop stays within the medium-tier budgets (ARCHITECTURE §9): at most 80 draw
// calls and 150k triangles. The global guards in fixtures.ts fail any test here on a console
// error, a CSP violation, a request to another origin or a troika fallback-font request.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TEST_IDS } from '../../src/app/testIds';
import { EXHIBIT_IDS, type ExhibitId, type StopId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { buildDateFromEnv } from '../../src/content/temporal';
import { stopDistance } from '../../src/museum/exhibits/_kit/stopDistance';
import { computeLayout } from '../../src/museum/rail/layout';
import { expect, test } from './fixtures';
import { canvasLuminance, goToStop, museumUrl, stats, waitForMuseum } from './helpers';

const GREYBOX_PROJECTS = new Set(['desktop', 'pixel7']);
/** perf/budgets.json render.drawCalls.medium (?test=1 fixes the tier at medium). */
const MAX_CALLS = 80;
/** perf/budgets.json render.triangles.mobile, the stricter of the two. */
const MAX_TRIANGLES = 150_000;
/** The canvas center must not be black: mean luminance above 8/255. */
const MIN_LUMINANCE = 8 / 255;

const layout = computeLayout(content, buildDateFromEnv());
const EXHIBITS_DIR = fileURLToPath(new URL('../../src/museum/exhibits/', import.meta.url));
const hasFolder = (id: ExhibitId) => existsSync(`${EXHIBITS_DIR}${id}/index.ts`);
const isExhibit = (id: StopId): id is ExhibitId => (EXHIBIT_IDS as readonly string[]).includes(id);

/** Every stop once: the main track, then each wing's items (doors are on the main track). */
const ALL_STOPS: StopId[] = [
  ...layout.tracks.main.stops.map((s) => s.id),
  ...layout.tracks.projects.stops.slice(1).map((s) => s.id),
  ...layout.tracks.volunteer.stops.slice(1).map((s) => s.id),
];

test.describe('greybox', () => {
  test.beforeEach(() => {
    const project = test.info().project.name;
    test.skip(!GREYBOX_PROJECTS.has(project), 'the greybox checks run on desktop and pixel7');
  });

  test('the stage renders the lobby within budget', { tag: '@smoke' }, async ({ page }) => {
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);

    const stage = page.getByTestId(TEST_IDS.stage);
    await expect(stage).toHaveAttribute('aria-hidden', 'true');
    await expect(stage).toHaveCSS('position', 'fixed');
    await expect(stage).toHaveCSS('opacity', '1');
    await expect(stage.locator('canvas')).toHaveCount(1);

    const s = await stats(page);
    const luminance = await canvasLuminance(page);
    test.info().annotations.push({
      type: 'stats at the lobby',
      description: JSON.stringify({
        calls: s.calls,
        triangles: s.triangles,
        geometries: s.geometries,
        textures: s.textures,
        programs: s.programs,
        textureMB: Number(s.textureMB.toFixed(2)),
        mounted: s.mounted,
        dpr: s.dpr,
        tier: s.tier,
        centerLuminance255: Number((luminance * 255).toFixed(1)),
      }),
    });
    expect(s.tier).toBe('medium');
    expect(s.calls).toBeGreaterThan(0);
    expect(s.calls).toBeLessThanOrEqual(MAX_CALLS);
    expect(s.triangles).toBeLessThanOrEqual(MAX_TRIANGLES);

    const near = EXHIBIT_IDS.filter((id) => stopDistance(layout, 'lobby', id) <= 2);
    expect(near.length).toBeGreaterThan(0);
    for (const id of near) expect(s.mounted, `${id} is within 2 stops`).toContain(id);
    for (const id of s.mounted) {
      expect(stopDistance(layout, 'lobby', id), `${id} mounted`).toBeLessThanOrEqual(4);
    }

    expect(luminance).toBeGreaterThan(MIN_LUMINANCE);

    // A slot without an exhibit folder shows the crate, and its card says so.
    for (const id of near.filter((n) => !hasFolder(n))) {
      await expect(page.getByTestId(TEST_IDS.card(id))).toContainText('Installation in progress');
    }

    // Late font and chunk requests still fall inside the guarded window.
    await page.waitForLoadState('networkidle');
  });

  test('every stop renders within the draw-call budget', async ({ page }) => {
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    for (const stop of ALL_STOPS) {
      await goToStop(page, stop);
      const s = await stats(page);
      expect(s.calls, `${stop} draw calls`).toBeLessThanOrEqual(MAX_CALLS);
      expect(s.triangles, `${stop} triangles`).toBeLessThanOrEqual(MAX_TRIANGLES);
      if (isExhibit(stop)) expect(s.mounted, `${stop} is mounted at its stop`).toContain(stop);
    }
  });
});
