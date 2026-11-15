// Visual baselines for the whole collection (WP-17, WP-25; ARCHITECTURE §13.6). Compared in CI
// only: SwiftShader output differs by CPU, so locally every test skips unless VISUAL_LOCAL=1
// (advisory, never committed). Baselines come from the `update-baselines` dispatch of ci.yml.
// - Canvas: every stop (10 main plus 3 wing exhibits) at ?test=1 (tier medium) on desktop and
//   pixel7: 26 cases.
// - DOM, canvas masked: every exhibit's story dialog (desktop panel, Pixel 7 sheet): 18 cases;
//   /resume/ light and dark, and 404.html (desktop).
// One test per shot, so each stop and each dialog is its own case and a mismatch never hides the
// shots after it. The cases of a group share one page and move with instant goTo: a cold load and
// its compiles cost 11 to 14 s locally, an instant move 1 to 3 s. The group runs in one worker in
// order; after a failure Playwright starts a new worker, whose beforeAll loads the page again (a
// cold load and a walk give the same image: the WP-17 slice baselines pass from either).
// The shared page is not the `page` fixture, so the global guards do not see it; each case
// checks the page's console errors and uncaught errors itself.
// Every shot hides `dialog-duration` and the cards' durations (ongoing roles change monthly).
import type { Browser, BrowserContextOptions, Page, TestInfo } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import { EXHIBIT_IDS, STOP_ONLY_IDS, type StopId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { entryById } from '../../src/content/selectors';
import { expect, isBrowserFaviconProbe, test } from './fixtures';
import { compareScreenshots, goToStop, museumUrl, shot, waitForMuseum } from './helpers';

/** Every stop in walking order (EXPERIENCE §3): wing exhibits follow their door. */
const STOPS: StopId[] = [
  'lobby',
  'verafin',
  'projects-door',
  'klarup',
  'finance-tracker',
  'mysa',
  'volunteer-door',
  'sdsj',
  'wailo',
  'cfia',
  'mun',
  'certifications',
  'desk',
];
const ALL_STOPS = new Set<StopId>([...EXHIBIT_IDS, ...STOP_ONLY_IDS]);
if (STOPS.length !== ALL_STOPS.size || !STOPS.every((id) => ALL_STOPS.has(id))) {
  throw new Error(`visual.spec STOPS must list every stop id once: ${[...ALL_STOPS].join(', ')}`);
}
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

/** The page a group shares, with the console and uncaught errors seen since the last check. */
interface SharedPage {
  page: Page;
  errors: string[];
}

/**
 * A new context with the project's device settings (beforeAll gets no `page` fixture), loaded at
 * the museum lobby and ready.
 */
async function openShared(browser: Browser, testInfo: TestInfo): Promise<SharedPage> {
  const use = testInfo.project.use;
  if (!use.baseURL) throw new Error('playwright.config.ts must set use.baseURL');
  const context = await browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport,
    // Device descriptors carry `screen`; the `use` type leaves it out.
    screen: (use as BrowserContextOptions).screen,
    userAgent: use.userAgent,
    deviceScaleFactor: use.deviceScaleFactor,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  const origin = new URL(use.baseURL).origin;
  page.on('console', (message) => {
    if (message.type() !== 'error' || isBrowserFaviconProbe(message, origin)) return;
    errors.push(`console: ${message.text()} (${message.location().url})`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  await page.goto(museumUrl('/'));
  await waitForMuseum(page);
  return { page, errors };
}

/** Fails the case on any console or uncaught error since the previous case, then clears them. */
function expectNoErrors(shared: SharedPage): void {
  const seen = shared.errors.splice(0);
  expect(seen, 'console and uncaught errors on the shared page').toEqual([]);
}

/** Waits for the panel or sheet slide-in to finish. */
async function settleDialog(page: Page): Promise<void> {
  await page
    .getByTestId(TEST_IDS.dialog)
    .evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
}

test.describe('visual', { tag: '@visual' }, () => {
  test.describe('stops (canvas)', () => {
    // One worker walks the group in order on one page (see the header).
    test.describe.configure({ mode: 'default' });
    let shared: SharedPage | undefined;

    test.beforeAll(async ({ browser }, testInfo) => {
      if (!WEBGL_PROJECTS.includes(testInfo.project.name) || !compareScreenshots()) return;
      // A cold load and its compiles: 14 s locally on desktop, under the 60 s default.
      shared = await openShared(browser, testInfo);
    });
    test.afterAll(async () => {
      await shared?.page.context().close();
    });

    for (const id of STOPS) {
      test(`stop ${id}`, async () => {
        onlyWhereCompared(WEBGL_PROJECTS);
        if (!shared) throw new Error('beforeAll did not open the shared page');
        await goToStop(shared.page, id);
        await shot(shared.page, `stop-${id}`);
        expectNoErrors(shared);
      });
    }
  });

  test.describe('story dialogs (DOM)', () => {
    test.describe.configure({ mode: 'default' });
    let shared: SharedPage | undefined;

    test.beforeAll(async ({ browser }, testInfo) => {
      if (!WEBGL_PROJECTS.includes(testInfo.project.name) || !compareScreenshots()) return;
      shared = await openShared(browser, testInfo);
    });
    test.afterAll(async () => {
      await shared?.page.context().close();
    });

    for (const id of EXHIBIT_IDS) {
      test(`dialog ${id}`, async () => {
        onlyWhereCompared(WEBGL_PROJECTS);
        if (!shared) throw new Error('beforeAll did not open the shared page');
        const { page } = shared;
        await goToStop(page, id);
        await page.getByTestId(TEST_IDS.open(id)).click();
        const dialog = page.getByTestId(TEST_IDS.dialog);
        await expect(dialog).toBeVisible();
        await expect(dialog).toContainText(entryById(content, id).exhibit.title);
        await settleDialog(page);
        await shot(page, `dialog-${id}`, { domOnly: true });
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
        expectNoErrors(shared);
      });
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
