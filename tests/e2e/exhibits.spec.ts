// Slice exhibit behaviour beyond the per-exhibit contract (WP-17; EXPERIENCE §5.11, §6.7, §10.4;
// the WP-12 and WP-13 reports' open items). Pixel 7 only: the checks are about the exhibit, not
// the device, and a phone frame costs a fraction of a desktop one under SwiftShader.
// - With an exhibit chunk blocked, its slot shows the placeholder crate and the card says
//   "Installation in progress"; mysa, which has no exhibit folder yet, shows the same.
// - With idle motion on (&idle=1), each built exhibit moves; with reduced motion emulated too,
//   its canvas stays byte-identical for 10 s (exhibit-contract covers only the frozen ?test=1
//   clock).
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import type { ExhibitId } from '../../src/content/ids';
import { expect, test } from './fixtures';
import { goToStop, museumCanvas, museumUrl, stats, waitForMuseum } from './helpers';

const INSTALLING = 'Installation in progress';
/** The exhibits built in M2 (WP-12 verafin, WP-13 safe-sip). */
const BUILT: ExhibitId[] = ['verafin', 'safe-sip'];
/** EXPERIENCE §10.4: reduced motion holds every exhibit still; checked over this window. */
const STILL_MS = 10_000;
/**
 * How long idle motion may take to show a changed canvas. verafin's grid refreshes every 8 s
 * (WP-12), and a CI frame takes 2 to 3 s with two workers (F-M2): 8 s plus a few frames.
 */
const MOTION_WITHIN_MS = 25_000;

const canvasShot = (page: Page) => museumCanvas(page).screenshot();

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

    // mysa has no exhibit folder yet: its slot is the crate for good.
    await goToStop(page, 'mysa');
    await expect(page.getByTestId(TEST_IDS.card('mysa'))).toContainText(INSTALLING);
    expect((await stats(page)).exhibits.mysa).toBeUndefined();

    // The block is deliberate: acknowledge exactly what it logs, nothing else.
    expect(
      guards.acknowledge('console', /Exhibit 'verafin' failed; showing the placeholder/),
    ).not.toHaveLength(0);
    guards.acknowledge('console', /Failed to load resource: net::ERR_FAILED/);
    // The failed import also surfaces as an unhandled rejection (filed for R3 in the WP-17
    // report): the crate and the card are right, so only that exact error is acknowledged.
    guards.acknowledge(
      'pageerror',
      /Failed to fetch dynamically imported module: .*ReportingEngine/,
    );
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
      const first = await canvasShot(page);
      await expect
        .poll(async () => (await canvasShot(page)).equals(first), {
          message: `${id} moves under &idle=1`,
          timeout: MOTION_WITHIN_MS,
          intervals: [1_000],
        })
        .toBe(false);
    });

    test(`${id}: reduced motion holds the canvas still`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(museumUrl('/', { idle: true }));
      await waitForMuseum(page);
      await goToStop(page, id);
      const first = await canvasShot(page);
      await page.waitForTimeout(STILL_MS);
      const second = await canvasShot(page);
      expect(second.equals(first), `${id} is still under reduced motion`).toBe(true);
    });
  }
});
