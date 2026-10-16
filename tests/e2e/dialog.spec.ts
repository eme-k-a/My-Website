// Story dialog, history rules and prerendered exhibit pages (WP-14; ARCHITECTURE §5.6, §11.1,
// §13.7; EXPERIENCE §3.5, §5.9, §5.10). Runs against serve-dist with the production _headers, so
// the global guards in fixtures.ts also prove there is no CSP violation.
// (a) a cold deep link closes to `/` on the same origin; (b) open, Older x3, one Back closes;
// (c) Back closes an in-app dialog and focus returns to "Read the story"; (d) Newer and Older never
// change history.length; (e) JS off: /exhibit/mysa/ shows every Mysa bullet; (f) every prerendered
// exhibit page has a unique og:title; (g) @a11y: axe finds 0 violations with the dialog open and
// on /exhibit/verafin/ with JS off. Plus the panel and sheet layouts, Esc, the backdrop, Copy link
// and the rendering-pause flag.
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import { content } from '../../src/content/index';
import { entryById } from '../../src/content/selectors';
import { SITE_URL } from '../../src/content/site';
import { expect, test } from './fixtures';
import { goToStop, museumUrl, waitForMuseum } from './helpers';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
const MUSEUM_PROJECTS = ['desktop', 'pixel7', 'pixel7-landscape'];
const DIST = join(process.cwd(), 'dist');

const project = () => test.info().project.name;
const onlyMuseumProjects = () =>
  test.skip(!MUSEUM_PROJECTS.includes(project()), 'Needs WebGL2 (the museum path)');

async function expectNoAxeViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

const dialogOf = (page: Page) => page.getByTestId(TEST_IDS.dialog);
const pathOf = (page: Page) => new URL(page.url()).pathname;
const historyLength = (page: Page) => page.evaluate(() => history.length);

/** From `/`, walk to verafin and open its story with "Read the story". */
async function openVerafinInApp(page: Page) {
  await page.goto(museumUrl('/'));
  await waitForMuseum(page);
  await goToStop(page, 'verafin');
  await page.getByTestId(TEST_IDS.open('verafin')).click();
  await expect(dialogOf(page)).toBeVisible();
  expect(pathOf(page)).toBe('/exhibit/verafin/');
  await settleDialog(page);
}

/** Waits for the panel or sheet slide-in to finish. */
async function settleDialog(page: Page) {
  await dialogOf(page).evaluate((el) =>
    Promise.all(el.getAnimations().map((animation) => animation.finished)),
  );
}

test.describe('story dialog and history', () => {
  test.beforeEach(() => onlyMuseumProjects());

  test('(a) a cold deep link opens the story and closes to / on the same origin', async ({
    page,
  }) => {
    await page.goto(museumUrl('/exhibit/verafin/'));
    const origin = new URL(page.url()).origin;
    const dialog = dialogOf(page);
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('The Reporting Engine');
    await waitForMuseum(page);
    const length = await historyLength(page);
    await page.getByTestId(TEST_IDS.dialogClose).click();
    await expect(dialog).toBeHidden();
    const url = new URL(page.url());
    expect(url.pathname).toBe('/');
    expect(url.origin).toBe(origin);
    expect(url.searchParams.get('test')).toBe('1');
    expect(await historyLength(page)).toBe(length);
    await expect(page.getByTestId(TEST_IDS.open('verafin'))).toBeFocused();
  });

  test('(b) open, Older three times, then one Back closes the dialog on /', async ({ page }) => {
    await openVerafinInApp(page);
    const dialog = dialogOf(page);
    for (const [id, title] of [
      ['klarup', 'The Climb'],
      ['finance-tracker', 'The Balance'],
      ['mysa', 'Warm Start'],
    ] as const) {
      await page.getByTestId(TEST_IDS.dialogOlder).click();
      await expect(dialog.getByRole('heading', { level: 2, name: title })).toBeVisible();
      expect(pathOf(page)).toBe(`/exhibit/${id}/`);
    }
    await page.goBack();
    await expect(dialog).toBeHidden();
    expect(pathOf(page)).toBe('/');
  });

  test('(c) browser Back closes an in-app dialog and focus returns to Read the story', async ({
    page,
  }) => {
    await openVerafinInApp(page);
    await page.goBack();
    await expect(dialogOf(page)).toBeHidden();
    expect(pathOf(page)).toBe('/');
    await expect(page.getByTestId(TEST_IDS.open('verafin'))).toBeFocused();
  });

  test('(d) Newer and Older replace the entry and never change history.length', async ({
    page,
  }) => {
    await openVerafinInApp(page);
    const length = await historyLength(page);
    await page.getByTestId(TEST_IDS.dialogOlder).click();
    await page.getByTestId(TEST_IDS.dialogOlder).click();
    await page.getByTestId(TEST_IDS.dialogNewer).click();
    expect(pathOf(page)).toBe('/exhibit/klarup/');
    expect(await historyLength(page)).toBe(length);
    const state = await page.evaluate(() => history.state as unknown);
    expect(state).toEqual({ inApp: true, id: 'klarup', track: 'main' });
  });

  test('Esc closes the dialog and returns focus; the step buttons name their target', async ({
    page,
  }) => {
    await openVerafinInApp(page);
    await expect(page.getByTestId(TEST_IDS.dialogNewer)).toHaveCount(0);
    await expect(page.getByTestId(TEST_IDS.dialogOlder)).toHaveAccessibleName(
      'Older exhibit: The Climb, KlarUp',
    );
    await page.keyboard.press('Escape');
    await expect(dialogOf(page)).toBeHidden();
    expect(pathOf(page)).toBe('/');
    await expect(page.getByTestId(TEST_IDS.open('verafin'))).toBeFocused();
  });

  test('desktop: a right-hand panel with Close story, a backdrop click closes it', async ({
    page,
  }) => {
    test.skip(project() !== 'desktop', 'The desktop panel');
    await openVerafinInApp(page);
    const box = await dialogOf(page).boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) throw new Error('no dialog box');
    expect(box.width).toBeGreaterThanOrEqual(420);
    expect(box.width).toBeLessThanOrEqual(640);
    expect(Math.round(box.x + box.width)).toBe(viewport.width);
    expect(Math.round(box.height)).toBe(viewport.height);
    const close = page.getByTestId(TEST_IDS.dialogClose);
    await expect(close).toHaveAccessibleName('Close story');
    const closeBox = await close.boundingBox();
    expect(closeBox?.width).toBeGreaterThanOrEqual(44);
    expect(closeBox?.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('html')).not.toHaveAttribute('data-sheet', 'open');
    await page.mouse.click(100, viewport.height / 2);
    await expect(dialogOf(page)).toBeHidden();
    expect(pathOf(page)).toBe('/');
  });

  test('desktop: Copy link copies the canonical exhibit URL', async ({ page, context }) => {
    test.skip(project() !== 'desktop', 'Clipboard permissions on desktop Chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openVerafinInApp(page);
    await dialogOf(page).getByRole('button', { name: 'Copy link' }).click();
    await expect(dialogOf(page).getByRole('button', { name: 'Link copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${SITE_URL}/exhibit/verafin/`,
    );
    await expect(dialogOf(page).getByRole('button', { name: 'Copy link' })).toBeVisible({
      timeout: 5_000,
    });
  });

  test('phone: one full-height sheet with Back to the aisle; rendering pauses', async ({
    page,
  }) => {
    test.skip(project() !== 'pixel7', 'The portrait phone sheet');
    await openVerafinInApp(page);
    const box = await dialogOf(page).boundingBox();
    const viewport = page.viewportSize();
    if (!box || !viewport) throw new Error('no dialog box');
    expect(Math.round(box.width)).toBe(viewport.width);
    expect(Math.round(box.height)).toBe(viewport.height);
    await expect(page.locator('html')).toHaveAttribute('data-sheet', 'open');
    const back = page.getByTestId(TEST_IDS.dialogClose);
    await expect(back).toHaveAccessibleName('Back to the aisle');
    const older = await page.getByTestId(TEST_IDS.dialogOlder).boundingBox();
    expect(older?.height).toBeGreaterThanOrEqual(48);
    await back.click();
    await expect(dialogOf(page)).toBeHidden();
    await expect(page.locator('html')).not.toHaveAttribute('data-sheet', 'open');
  });
});

test.describe('prerendered exhibit pages', () => {
  test.describe('with JavaScript off', () => {
    test.use({ javaScriptEnabled: false });

    test('(e) /exhibit/mysa/ shows story-static with every Mysa bullet', async ({ page }) => {
      await page.goto('/exhibit/mysa/');
      const article = page.getByTestId(TEST_IDS.storyStatic);
      await expect(article).toBeVisible();
      await expect(article.getByRole('heading', { level: 1 })).toHaveText('Warm Start');
      const entry = entryById(content, 'mysa');
      if (entry.kind !== 'work') throw new Error('mysa is a work entry');
      for (const bullet of entry.bullets) await expect(article).toContainText(bullet.text);
      await expect(article.getByRole('link', { name: /Newer/ })).toHaveAttribute(
        'href',
        '/exhibit/finance-tracker/',
      );
    });
  });

  test('(f) every dist/exhibit/*/index.html has a unique og:title', async () => {
    test.skip(project() !== 'desktop', 'Reads files once');
    test.skip(!existsSync(join(DIST, 'exhibit')), 'Needs a local build (dist/exhibit)');
    const ids = await readdir(join(DIST, 'exhibit'));
    expect(ids).toHaveLength(10);
    const titles: string[] = [];
    for (const id of ids) {
      const html = await readFile(join(DIST, 'exhibit', id, 'index.html'), 'utf8');
      const title = /<meta property="og:title" content="([^"]*)"/.exec(html)?.[1];
      expect(title, `og:title on /exhibit/${id}/`).toBeTruthy();
      titles.push(title ?? '');
      expect(html).toContain('<body data-page="exhibit">');
      expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/exhibit/${id}/" />`);
    }
    expect(new Set(titles).size).toBe(titles.length);
  });
});

test.describe('accessibility', { tag: '@a11y' }, () => {
  test('(g) the open dialog has no axe violations', async ({ page }) => {
    test.skip(!['desktop', 'pixel7'].includes(project()), 'desktop and pixel7');
    await openVerafinInApp(page);
    await expectNoAxeViolations(page, `the open dialog (${project()})`);
  });

  // axe cannot run in a page with JavaScript disabled (Playwright refuses to evaluate there), so
  // this serves the prerendered page as a JS-off browser renders it: every <script> removed and the
  // <noscript> notice shown, with the production stylesheets and headers.
  test('(g) /exhibit/verafin/ as rendered with JS off has no axe violations', async ({ page }) => {
    test.skip(!['desktop', 'pixel7'].includes(project()), 'desktop and pixel7');
    await page.route('**/exhibit/verafin/', async (route) => {
      const response = await route.fetch();
      const body = (await response.text())
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/<\/?noscript>/gi, '');
      await route.fulfill({ response, body });
    });
    await page.goto('/exhibit/verafin/');
    await expect(page.locator('html')).not.toHaveAttribute('data-mode', /.*/);
    await expect(page.getByTestId(TEST_IDS.storyStatic)).toBeVisible();
    await expect(page.locator('#app')).toBeHidden();
    await expectNoAxeViolations(page, '/exhibit/verafin/ with JS off');
  });
});
