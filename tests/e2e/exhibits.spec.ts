// Exhibit behaviour beyond the per-exhibit contract (WP-17, WP-25; EXPERIENCE §5.11, §6.7, §10.4;
// the WP-12 and WP-13 reports' open items). Pixel 7 only: the checks are about the exhibit, not
// the device, and a phone frame costs a fraction of a desktop one under SwiftShader.
// - With an exhibit chunk blocked, its slot shows the placeholder crate and the card says
//   "Installation in progress"; an exhibit with no folder would show the same (none since WP-23).
// - With idle motion on (&idle=1), each of the nine exhibits moves; with reduced motion emulated too,
//   its canvas stays byte-identical for 10 s (exhibit-contract covers only the frozen ?test=1
//   clock).
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import { EXHIBIT_IDS, type ExhibitId } from '../../src/content/ids';
import { expect, test } from './fixtures';
import { goToStop, museumCanvas, museumUrl, stats, waitForMuseum } from './helpers';

const INSTALLING = 'Installation in progress';
/**
 * Idle motion and reduced motion run for all nine (WP-25): every manifest declares `motion: 'slow'`.
 * Locally on two workers the 18 tests take about 3.5 minutes; verafin and finance-tracker are the
 * slow movers (93 and 71 frames).
 */
const BUILT: ExhibitId[] = [...EXHIBIT_IDS];
/** Exhibits with no folder yet: none since WP-23 (M3). Kept for future exhibits. */
const UNBUILT: ExhibitId[] = [];
/** EXPERIENCE §10.4: reduced motion holds every exhibit still; checked over this window. */
const STILL_MS = 10_000;
/**
 * Rendered frames within which idle motion must show. The exhibit clock advances by the frame
 * delta capped at 0.1 s (MAX_CLOCK_STEP_S), so under SwiftShader it runs slower than real time:
 * verafin's first report refresh at 8 s of exhibit time needs about 80 frames (24 s in a local
 * two-worker run). 120 frames leave room for the time spent before the stop is settled.
 */
const MOTION_WITHIN_FRAMES = 120;
/** CI frames take up to 3 s on desktop (F-M2); a Pixel 7 frame is cheaper. 120 at 1.5 s. */
const MOTION_TIMEOUT_MS = 180_000;

const canvasShot = (page: Page) => museumCanvas(page).screenshot();

/**
 * A small pointer move away from the exhibit: input that keeps FrameDriver's 15 s idle stop
 * (EXPERIENCE §6.7) from freezing the motion mid-test (?test=1 turns parallax off, so the camera
 * ignores it). Without it a slow arrival left verafin's 8 s refresh after the idle stop (local
 * two-worker run).
 */
let nudges = 0;
const nudge = (page: Page) => page.mouse.move(20 + (nudges++ % 2) * 4, 20);

test.describe('exhibits', { tag: '@exhibit' }, () => {
  test.describe.configure({ timeout: 120_000 });
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'pixel7', 'the pixel7 project only');
  });

  test('a blocked exhibit chunk shows the crate and "Installation in progress"', async ({
    page,
    guards,
  }) => {
    // verafin's lazy chunk (src/museum/exhibits/verafin/ReportingEngine.tsx).
    await page.route('**/assets/ReportingEngine-*.js', (route) => route.abort());
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    await goToStop(page, 'verafin');
    await expect(page.getByTestId(TEST_IDS.card('verafin'))).toContainText(INSTALLING);
    const s = await stats(page);
    expect(s.mounted, 'the slot is mounted').toContain('verafin');
    expect(s.exhibits.verafin, 'no exhibit was revealed: the crate shows').toBeUndefined();

    // An exhibit with no folder yet keeps the crate for good (none at the moment).
    for (const id of UNBUILT) {
      await goToStop(page, id);
      await expect(page.getByTestId(TEST_IDS.card(id))).toContainText(INSTALLING);
      expect((await stats(page)).exhibits[id]).toBeUndefined();
    }

    // The block is deliberate: acknowledge exactly what it logs, nothing else.
    expect(
      guards.acknowledge('console', /Exhibit 'verafin' failed; showing the placeholder/),
    ).not.toHaveLength(0);
    guards.acknowledge('console', /Failed to load resource: net::ERR_FAILED/);
  });

  test('a revealed exhibit card does not say "Installation in progress"', async ({ page }) => {
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    await goToStop(page, 'verafin');
    expect((await stats(page)).exhibits.verafin).toBeDefined();
    await expect(page.getByTestId(TEST_IDS.card('verafin'))).not.toContainText(INSTALLING);
  });

  for (const id of BUILT) {
    test(`${id}: idle motion moves the canvas`, async ({ page }) => {
      await page.goto(museumUrl('/', { idle: true }));
      await waitForMuseum(page);
      await goToStop(page, id);
      test.setTimeout(MOTION_TIMEOUT_MS + 60_000);
      const first = await canvasShot(page);
      const from = (await stats(page)).frames;
      const start = Date.now();
      let rendered = 0;
      let moved = false;
      while (!moved && rendered < MOTION_WITHIN_FRAMES) {
        if (Date.now() - start > MOTION_TIMEOUT_MS) break;
        await nudge(page);
        await page.waitForTimeout(1_000);
        rendered = (await stats(page)).frames - from;
        moved = !(await canvasShot(page)).equals(first);
      }
      console.log(
        `exhibits: ${id} moved=${moved} after ${rendered} frames, ${Date.now() - start} ms`,
      );
      expect(moved, `${id} moves under &idle=1 within ${MOTION_WITHIN_FRAMES} frames`).toBe(true);
    });

    test(`${id}: reduced motion holds the canvas still`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(museumUrl('/', { idle: true }));
      await waitForMuseum(page);
      await goToStop(page, id);
      const first = await canvasShot(page);
      // Input every second keeps frames coming, so stillness is reduced motion, not the idle stop.
      for (let waited = 0; waited < STILL_MS; waited += 1_000) {
        await nudge(page);
        await page.waitForTimeout(1_000);
      }
      const second = await canvasShot(page);
      expect(second.equals(first), `${id} is still under reduced motion`).toBe(true);
    });
  }
});
