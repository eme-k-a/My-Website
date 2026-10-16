// Quality checks (WP-16, ARCHITECTURE §8.4, §8.5, §10.1, §10.2, §13.3; R8 owns this spec after the
// merge): shader programs stay stable after arrival, the demand frame loop stops 15 s after the
// last input and pauses under the phone sheet, a lost WebGL context remounts the canvas (and the
// second loss falls back to the classic resume, or on an exhibit page to classic mode without a
// canvas), a back/forward-cache return renders, and phones get the medium tier at DPR 1 under
// ?test=1. Desktop unless noted.
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import { content } from '../../src/content/index';
import { buildDateFromEnv } from '../../src/content/temporal';
import { tokens } from '../../src/design/tokens';
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
/** FrameDriver's idle stop (tokens.motion.idleStopMs, EXPERIENCE §6.7). */
const IDLE_STOP_MS = tokens.motion.idleStopMs;
/** How long after the idle stop the last frames may still land under SwiftShader (test (b)). */
const LATE_FRAMES_MS = 5_000;
/**
 * Context-loss recovery under SwiftShader (any ?test=1 run, CI included). The WP-16 ruling allows
 * 10 s because shader linking alone takes about 4.8 s there; real GPUs: 5 s, checked by hand at
 * G5. Since WP-11 the remount links 21 programs, and a profile of one recovery shows the main
 * thread waiting 4.4 s of 6.2 s in getProgramInfoLog (SwiftShader has no parallel compile). With
 * two workers on four cores, as in CI, the other worker's frames double that: F-M2 measured
 * 10.5 s and 11.8 s locally, and CI run 27 timed out (d) at 10 s. 20 s until R0 rules on the
 * CI figure the F-M2 report records.
 */
const SWIFTSHADER_RECOVERY_MS = 20_000;
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

  test('(b) frames stop after the 15 s idle stop', async ({ page }) => {
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
    // Idle motion keeps the canvas rendering for a while. Under SwiftShader in CI a frame of the
    // full desktop view takes 1 to 2 s (run 27 saw no frame at all in a 2 s window), so wait for
    // two frames, well inside the 15 s idle window.
    await expect
      .poll(() => frames(page), { timeout: 10_000, message: 'idle motion renders frames' })
      .toBeGreaterThan(atInput + 1);
    const running = await frames(page);
    const frameMs = (Date.now() - lastInput) / (running - atInput);

    // The loop stops requesting frames at 15 s. The last frames still land after it: the one in
    // flight, and the one the kit renders when its runtime turns idle. On a GPU that is within
    // a few ms; under SwiftShader with two workers (as in CI) F-M2 measured frames of 1.0 to
    // 1.5 s on average and one landing 2 to 4 s after 15 s. So the canvas must fall silent for
    // 2 s starting no later than LATE_FRAMES_MS after the idle stop; frames that never stop
    // (F-012) fail it.
    const deadline = lastInput + IDLE_STOP_MS + LATE_FRAMES_MS;
    await page.waitForTimeout(Math.max(0, lastInput + IDLE_STOP_MS - Date.now()));
    let count = await frames(page);
    let quietSince = Date.now();
    while (Date.now() - quietSince < 2_000 && quietSince <= deadline) {
      await page.waitForTimeout(200);
      const now = await frames(page);
      if (now !== count) {
        count = now;
        quietSince = Date.now();
      }
    }
    const description = JSON.stringify({
      atInput,
      running,
      frameMs: Math.round(frameMs),
      lastFrameS: (quietSince - lastInput) / 1000,
      frames: count,
    });
    test.info().annotations.push({ type: 'frames', description });
    console.log(`quality (b) frames: ${description}`);
    expect(
      quietSince,
      `no frame for 2 s, starting by ${(IDLE_STOP_MS + LATE_FRAMES_MS) / 1000} s after the input`,
    ).toBeLessThanOrEqual(deadline);
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
      { timeout: SWIFTSHADER_RECOVERY_MS },
    );
    const recoveryMs = Date.now() - restoredAt;
    console.log(`quality (c) recovery: ${recoveryMs} ms`);

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
    const restoredAt = Date.now();
    await page.evaluate(() => window.__LOSE_CONTEXT__?.restoreContext());
    await page.waitForFunction(
      (old) => {
        const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="stage"] canvas');
        return Number(canvas?.dataset.generation) > old && window.__MUSEUM__?.ready === true;
      },
      first,
      { timeout: SWIFTSHADER_RECOVERY_MS },
    );
    console.log(`quality (d) recovery: ${Date.now() - restoredAt} ms`);

    await loseContext(page);
    await page.waitForURL((url) => url.pathname === '/resume/' && url.hash === '#why-context-loss');
    const url = new URL(page.url());
    expect(url.pathname + url.hash).toBe('/resume/#why-context-loss');
    await expect(page.locator('#why-context-loss')).toBeVisible();
  });

  test('(h) the classic fallback on an exhibit page unmounts the canvas (F-013)', async ({
    page,
  }) => {
    onlyOn('desktop');
    await page.goto(museumUrl('/exhibit/verafin/'));
    await waitForMuseum(page);
    const first = await generation(page);
    expect((await stats(page)).frames).toBeGreaterThan(0);

    await loseContext(page);
    await expect(page.getByTestId(TEST_IDS.contextVeil)).toBeVisible();
    await page.evaluate(() => window.__LOSE_CONTEXT__?.restoreContext());
    await page.waitForFunction(
      (old) => {
        const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="stage"] canvas');
        return Number(canvas?.dataset.generation) > old && window.__MUSEUM__?.ready === true;
      },
      first,
      { timeout: SWIFTSHADER_RECOVERY_MS },
    );

    // The second loss: an exhibit page stays and switches to classic (ARCHITECTURE §10.1).
    await loseContext(page);
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'classic');
    await expect(page.getByTestId(TEST_IDS.storyStatic)).toBeVisible();
    // MuseumGate unmounted the canvas, so the renderer and its probes are gone, not just hidden.
    await expect(page.locator('canvas')).toHaveCount(0);
    const probe = await page.evaluate(() => {
      try {
        window.__MUSEUM__?.stats();
        return 'the stats provider is still registered';
      } catch (error) {
        return (error as Error).message;
      }
    });
    expect(probe).toBe('not available yet: stats');
    expect(new URL(page.url()).pathname).toBe('/exhibit/verafin/');
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
    test.setTimeout(120_000);
    // Idle motion on, so the canvas would keep rendering without the sheet.
    await page.goto(museumUrl('/', { idle: true }));
    await waitForMuseum(page);
    await goToStop(page, 'verafin');
    await page.mouse.move(100, 300);
    const running = await frames(page);
    await page.waitForTimeout(1_000);
    expect(await frames(page)).toBeGreaterThan(running);

    // Open the story. On phones WP-14's sheet sets html[data-sheet="open"] while it is open
    // (ARCHITECTURE §8.5); before WP-14 the spec sets the flag itself.
    await page.getByTestId(TEST_IDS.open('verafin')).click();
    await expect(page.getByTestId(TEST_IDS.dialog)).toBeVisible();
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

    // The flag alone (a story closed, a stale attribute) never pauses: frames come back.
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
