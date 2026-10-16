// Quality checks (WP-16, ARCHITECTURE §8.4, §8.5, §10.1, §10.2, §13.3; R8 owns this spec after the
// merge): shader programs stay stable after arrival, the demand frame loop stops 15 s after the
// last input and pauses under the phone sheet, a lost WebGL context remounts the canvas (and the
// second loss falls back to the classic resume), a back/forward-cache return renders, and phones
// get the medium tier at DPR 1 under ?test=1. Desktop unless noted.
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import { content } from '../../src/content/index';
import { buildDateFromEnv } from '../../src/content/temporal';
import { computeLayout } from '../../src/museum/rail/layout';
import { expect, test } from './fixtures';
import {
  canvasLuminance,
  goToStop,
  museumCanvas,
  museumUrl,
  stats,
  waitForMuseum,
} from './helpers';

/** The canvas center must not be black: mean luminance above 8/255. */
const MIN_LUMINANCE = 8 / 255;
/** Headless WebGL, as in playwright.config.ts (ARCHITECTURE §1.4). */
const SWIFTSHADER = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

const layout = computeLayout(content, buildDateFromEnv());
const MAIN_STOPS = layout.tracks.main.stops.map((s) => s.id);

const onlyOn = (project: string) =>
  test.skip(test.info().project.name !== project, `runs on the ${project} project`);

/** `stats().frames`, the count of rendered frames. */
const frames = async (page: Page) => (await stats(page)).frames;

/** The canvas generation that ContextLossHandler writes on the current canvas. */
const generation = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="stage"] canvas');
    return Number(canvas?.dataset.generation ?? NaN);
  });

declare global {
  interface Window {
    __LOSE_CONTEXT__?: WEBGL_lose_context;
    __PAGESHOW__?: boolean[];
  }
}

/** Calls WEBGL_lose_context.loseContext() on the museum canvas and waits for the veil. */
async function loseContext(page: Page): Promise<void> {
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="stage"] canvas');
    const gl = canvas?.getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('WEBGL_lose_context is not available');
    window.__LOSE_CONTEXT__ = extension;
    extension.loseContext();
  });
}

test.describe('quality', () => {
  test('(a) shader programs are stable after arrival at every main stop', async ({ page }) => {
    onlyOn('desktop');
    test.setTimeout(300_000);
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);

    const counts: Record<string, { early: number; late: number }> = {};
    for (const id of MAIN_STOPS) {
      await goToStop(page, id);
      await page.waitForTimeout(500);
      const early = (await stats(page)).programs;
      await page.waitForTimeout(2_500);
      const late = (await stats(page)).programs;
      counts[id] = { early, late };
    }
    test
      .info()
      .annotations.push({ type: 'programs per stop', description: JSON.stringify(counts) });
    console.log(`programs per stop: ${JSON.stringify(counts)}`);
    for (const [id, { early, late }] of Object.entries(counts)) {
      expect(late, `programs at ${id}: 0.5 s vs 3 s after arrival`).toBe(early);
    }
  });

  test('(b) frames stop 16 s after the last input', async ({ page }) => {
    onlyOn('desktop');
    test.setTimeout(120_000);
    await page.goto(museumUrl('/', { idle: true }));
    await waitForMuseum(page);
    await page.waitForFunction(() => window.__MUSEUM__?.settled === true);

    // The last input.
    await page.mouse.move(300, 300);
    await page.mouse.move(320, 310);
    const lastInput = Date.now();
    const atInput = await frames(page);
    await page.waitForTimeout(2_000);
    const twoSecondsLater = await frames(page);
    // Idle motion keeps the canvas rendering for a while.
    expect(twoSecondsLater).toBeGreaterThan(atInput);

    await page.waitForTimeout(Math.max(0, lastInput + 16_000 - Date.now()));
    const at16 = await frames(page);
    await page.waitForTimeout(2_000);
    const at18 = await frames(page);
    test.info().annotations.push({
      type: 'frames',
      description: JSON.stringify({ atInput, twoSecondsLater, at16, at18 }),
    });
    expect(at18, 'no frame renders between 16 s and 18 s after the last input').toBe(at16);
  });

  test('(c) a forced context loss remounts the canvas and recovers', async ({ page, guards }) => {
    onlyOn('desktop');
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    const before = await generation(page);

    await loseContext(page);
    await expect(page.getByTestId(TEST_IDS.contextVeil)).toBeVisible();
    const restoredAt = Date.now();
    await page.evaluate(() => window.__LOSE_CONTEXT__?.restoreContext());
    await page.waitForFunction(
      (old) => {
        const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="stage"] canvas');
        return Number(canvas?.dataset.generation) > old && window.__MUSEUM__?.ready === true;
      },
      before,
      { timeout: 5_000 },
    );
    const recoveryMs = Date.now() - restoredAt;

    await expect(page.getByTestId(TEST_IDS.contextVeil)).toBeHidden();
    await expect(page.getByTestId(TEST_IDS.stage).locator('canvas')).toHaveCount(1);
    const after = await generation(page);
    const s = await stats(page);
    const luminance = await canvasLuminance(page, museumCanvas(page));
    test.info().annotations.push({
      type: 'recovery',
      description: JSON.stringify({ before, after, recoveryMs, textures: s.textures, luminance }),
    });
    expect(after).toBeGreaterThan(before);
    expect(s.textures).toBeGreaterThan(0);
    expect(luminance).toBeGreaterThan(MIN_LUMINANCE);
    // Chromium logs the loss as a warning, never an error; the guards stay strict.
    expect((await guards.records()).console).toEqual([]);
  });

  test('(d) a second loss in the session falls back to the classic resume', async ({ page }) => {
    onlyOn('desktop');
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    const first = await generation(page);

    await loseContext(page);
    await expect(page.getByTestId(TEST_IDS.contextVeil)).toBeVisible();
    await page.evaluate(() => window.__LOSE_CONTEXT__?.restoreContext());
    await page.waitForFunction(
      (old) => {
        const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="stage"] canvas');
        return Number(canvas?.dataset.generation) > old && window.__MUSEUM__?.ready === true;
      },
      first,
      { timeout: 10_000 },
    );

    await loseContext(page);
    await page.waitForURL((url) => url.pathname === '/resume/' && url.hash === '#why-context-loss');
    const url = new URL(page.url());
    expect(url.pathname + url.hash).toBe('/resume/#why-context-loss');
    await expect(page.locator('#why-context-loss')).toBeVisible();
  });

  test('(f) phones get the medium tier at DPR 1 under ?test=1', async ({ page }) => {
    onlyOn('pixel7');
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    const s = await stats(page);
    expect(s.tier).toBe('medium');
    expect(s.dpr).toBe(1);
    await expect(page.locator('html')).toHaveAttribute('data-tier', 'medium');
  });

  test('(g) no frame renders while the phone sheet is open', async ({ page }) => {
    onlyOn('pixel7');
    test.setTimeout(90_000);
    // Idle motion on, so the canvas would keep rendering without the sheet.
    await page.goto(museumUrl('/', { idle: true }));
    await waitForMuseum(page);
    await page.mouse.move(100, 300);
    const running = await frames(page);
    await page.waitForTimeout(1_000);
    expect(await frames(page)).toBeGreaterThan(running);

    // The flag WP-14's phone sheet sets while it is open (ARCHITECTURE §8.5).
    await page.evaluate(() => {
      document.documentElement.dataset.sheet = 'open';
    });
    await page.waitForTimeout(300); // a frame already requested may still land
    const open = await frames(page);
    for (let i = 0; i < 4; i++) {
      await page.mouse.move(120 + i * 10, 320);
      await page.waitForTimeout(500);
    }
    const stillOpen = await frames(page);
    expect(stillOpen, 'frames while the sheet is open').toBe(open);

    await page.evaluate(() => {
      delete document.documentElement.dataset.sheet;
    });
    await page.mouse.move(200, 400);
    await expect.poll(() => frames(page)).toBeGreaterThan(stillOpen);
  });
});

test.describe('back/forward cache', () => {
  test('(e) returning from /resume/ with Back renders the gallery', async ({
    playwright,
    baseURL,
  }) => {
    onlyOn('desktop');
    // Playwright launches Chromium with the back/forward cache off; this browser keeps it on.
    const project = test.info().project.use;
    const browser = await playwright.chromium.launch({
      channel: project.channel,
      args: SWIFTSHADER,
      ignoreDefaultArgs: ['--disable-back-forward-cache'],
    });
    try {
      const context = await browser.newContext({ baseURL, viewport: project.viewport ?? null });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on('console', (message) => {
        // The same exemption as fixtures.ts: Chromium's own favicon probe (until WP-31).
        if (message.location().url.endsWith('/favicon.ico')) return;
        if (message.type() === 'error') errors.push(message.text());
      });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        window.addEventListener('pageshow', (event) => {
          (window.__PAGESHOW__ ??= []).push(event.persisted);
        });
      });
      await page.goto(museumUrl('/'));
      await waitForMuseum(page);

      await page.goto('/resume/');
      // A restore from the cache fires pageshow, not load.
      await page.goBack({ waitUntil: 'commit' });
      await expect.poll(() => new URL(page.url()).pathname).toBe('/');
      await waitForMuseum(page);
      await page.waitForTimeout(500);

      const pageshow = await page.evaluate(() => window.__PAGESHOW__ ?? []);
      const luminance = await canvasLuminance(page, museumCanvas(page));
      test.info().annotations.push({
        type: 'bfcache',
        description: JSON.stringify({ pageshow, luminance }),
      });
      // The return came from the back/forward cache, not a fresh load.
      expect(pageshow).toEqual([false, true]);
      expect(luminance).toBeGreaterThan(MIN_LUMINANCE);
      expect(await page.evaluate(() => window.__MUSEUM__?.ready)).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      await browser.close();
    }
  });
});
