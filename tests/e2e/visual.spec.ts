// Visual baselines for the M2 slice (WP-17; ARCHITECTURE §13.6). Compared in CI only: SwiftShader
// output differs by CPU, so locally every test skips unless VISUAL_LOCAL=1 (advisory, never
// committed). Baselines come from the `update-baselines` dispatch of ci.yml.
// - Canvas: the slice stops lobby, verafin, projects-door, volunteer-door and desk at
//   ?test=1 (tier medium) on desktop and pixel7, one page per project walked with goTo instant.
// - DOM, canvas masked: the verafin dialog (desktop panel, Pixel 7 sheet), /resume/
//   light and dark, and 404.html (desktop).
// Every shot hides `dialog-duration` and the cards' durations (ongoing roles change monthly).
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import type { ExhibitId, StopId } from '../../src/content/ids';
import { expect, test } from './fixtures';
import { compareScreenshots, goToStop, museumUrl, shot, waitForMuseum } from './helpers';

const SLICE_STOPS: StopId[] = ['lobby', 'verafin', 'projects-door', 'volunteer-door', 'desk'];
const DIALOGS: ExhibitId[] = ['verafin'];
const WEBGL_PROJECTS = ['desktop', 'pixel7'];

const project = () => test.info().project.name;

/** Skips before any page work when screenshots are not compared here. */
function onlyWhereCompared(projects: string[]): void {
  test.skip(!projects.includes(project()), projects.join(' and '));
  test.skip(
    !compareScreenshots(),
    'Screenshots are compared in CI only (ARCHITECTURE §13.6); VISUAL_LOCAL=1 for an advisory run',
  );
}

/** Waits for the panel or sheet slide-in to finish. */
async function settleDialog(page: Page): Promise<void> {
  await page
    .getByTestId(TEST_IDS.dialog)
    .evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
}

test.describe('visual', { tag: '@visual' }, () => {
  // Six stops on one page: a cold load plus five instant moves and their compiles under
  // SwiftShader, at 20 to 40 s a stop in CI (run 35 timings of goToStop-based specs).
  test.describe.configure({ timeout: 300_000 });

  test('slice stops (canvas)', async ({ page }) => {
    onlyWhereCompared(WEBGL_PROJECTS);
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    for (const id of SLICE_STOPS) {
      await goToStop(page, id);
      await shot(page, `stop-${id}`, { soft: true });
    }
  });

  test('story dialogs (DOM)', async ({ page }) => {
    onlyWhereCompared(WEBGL_PROJECTS);
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    for (const id of DIALOGS) {
      await goToStop(page, id);
      await page.getByTestId(TEST_IDS.open(id)).click();
      await expect(page.getByTestId(TEST_IDS.dialog)).toBeVisible();
      await settleDialog(page);
      await shot(page, `dialog-${id}`, { domOnly: true, soft: true });
      await page.keyboard.press('Escape');
      await expect(page.getByTestId(TEST_IDS.dialog)).toBeHidden();
    }
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`/resume/ ${colorScheme} (DOM)`, async ({ page }) => {
      onlyWhereCompared(['desktop']);
      await page.emulateMedia({ colorScheme });
      await page.goto('/resume/');
      await expect(page.getByTestId(TEST_IDS.classicView)).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await shot(page, `resume-${colorScheme}`, { domOnly: true, fullPage: true });
    });
  }

  test('404.html (DOM)', async ({ page }) => {
    onlyWhereCompared(['desktop']);
    await page.goto('/404.html');
    await expect(page.getByTestId(TEST_IDS.notFound)).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await shot(page, 'not-found', { domOnly: true });
  });
});
