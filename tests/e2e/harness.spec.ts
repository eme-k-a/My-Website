// Self-test of helpers.ts (WP-07), so the helpers every later WP leans on are proven before the
// museum exists. A synthetic page, answered by a route on the site's origin, stands in for the app:
// a fake `window.__MUSEUM__`, a painted 2D canvas, scrollable sections and two listeners for the
// audit. Nothing here tests the product.
import { expect, test } from './fixtures';
import {
  canvasLuminance,
  cdpFlick,
  countHistoryWrites,
  goToStop,
  listenerAudit,
  museumUrl,
  screenPosOf,
  stats,
  waitForMuseum,
  wheelNotches,
  wheelStream,
} from './helpers';

const HARNESS_PATH = '/__harness__/';

/** rgb(200, 100, 50): Rec. 709 luminance (0.2126 * 200 + 0.7152 * 100 + 0.0722 * 50) / 255. */
const CANVAS_RGB = [200, 100, 50] as const;
const CANVAS_LUMINANCE = (0.2126 * 200 + 0.7152 * 100 + 0.0722 * 50) / 255;

const HARNESS_HTML = `<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Harness</title>
<style>
  body { margin: 0; }
  section { height: 100vh; }
  canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: -1; }
</style>
</head>
<body>
<div id="app">${'<section></section>'.repeat(8)}</div>
<canvas></canvas>
<script>
  const canvas = document.querySelector('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = 'rgb(${CANVAS_RGB.join(', ')})';
  g.fillRect(0, 0, 64, 64);

  let stop = 'lobby';
  let settled = true;
  window.__MUSEUM__ = {
    get ready() { return true; },
    get settled() { return settled; },
    get stop() { return stop; },
    goTo(id) {
      settled = false;
      return new Promise((resolve) => setTimeout(() => { stop = id; settled = true; resolve(); }, 50));
    },
    screenPos(id) { return id === 'verafin' ? { x: 120, y: 80 } : null; },
    stats() {
      return { mounted: ['verafin'], exhibits: { verafin: { triangles: 1200, drawCalls: 3, inBounds: true } } };
    },
  };

  window.__wheelDelta = 0;
  window.addEventListener('wheel', (e) => { window.__wheelDelta += e.deltaY; }, { passive: true });
  document.getElementById('app').addEventListener('touchmove', () => {}, { passive: false });
</script>
</body>
</html>`;

declare global {
  interface Window {
    __wheelDelta?: number;
  }
}

test.describe('e2e helpers', { tag: '@harness' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route(HARNESS_PATH, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: HARNESS_HTML }),
    );
  });

  test('museumUrl adds the test parameters', () => {
    expect(museumUrl()).toBe('/?test=1&mode=museum');
    expect(museumUrl('/exhibit/verafin/', { tier: 'high', idle: true })).toBe(
      '/exhibit/verafin/?test=1&mode=museum&tier=high&idle=1',
    );
  });

  test('waitForMuseum, goToStop, stats and screenPosOf drive the test hook', async ({ page }) => {
    await page.goto(HARNESS_PATH);
    await waitForMuseum(page);
    await goToStop(page, 'mysa');
    expect(await page.evaluate(() => window.__MUSEUM__?.stop)).toBe('mysa');
    expect((await stats(page)).exhibits.verafin?.triangles).toBe(1200);
    expect(await screenPosOf(page, 'verafin')).toEqual({ x: 120, y: 80 });
    expect(await screenPosOf(page, 'cfia')).toBeNull();
  });

  test('countHistoryWrites counts pushState and replaceState', async ({ page }) => {
    const writes = await countHistoryWrites(page);
    await page.goto(HARNESS_PATH);
    expect(await writes()).toEqual({ push: 0, replace: 0, calls: [] });
    await page.evaluate(() => {
      history.pushState({}, '', '/__harness__/a');
      history.pushState({}, '', '/__harness__/b');
      history.replaceState({}, '', '/__harness__/');
    });
    expect(await writes()).toEqual({
      push: 2,
      replace: 1,
      calls: ['push /__harness__/a', 'push /__harness__/b', 'replace /__harness__/'],
    });
  });

  test('listenerAudit reports only non-passive wheel and touch listeners', async ({ page }) => {
    await page.goto(HARNESS_PATH);
    const found = await listenerAudit(page);
    expect(found.map((l) => `${l.target} ${l.type} passive=${l.passive}`)).toEqual([
      '#app touchmove passive=false',
    ]);
  });

  test('canvasLuminance averages the canvas center', async ({ page }) => {
    await page.goto(HARNESS_PATH);
    expect(await canvasLuminance(page)).toBeCloseTo(CANVAS_LUMINANCE, 2);
  });

  test('wheelStream and wheelNotches scroll the page natively', async ({ page, hasTouch }) => {
    test.skip(hasTouch, 'mouse wheel input is for the fine-pointer projects');
    await page.goto(HARNESS_PATH);
    const total = await wheelStream(page);
    await expect.poll(() => page.evaluate(() => window.__wheelDelta ?? 0)).toBeCloseTo(total, 0);
    await wheelNotches(page);
    await expect
      .poll(() => page.evaluate(() => window.__wheelDelta ?? 0))
      .toBeCloseTo(total + 300, 0);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test('cdpFlick scrolls the page by touch', async ({ page, hasTouch }) => {
    test.skip(!hasTouch, 'touch input is for the Pixel 7 projects');
    await page.goto(HARNESS_PATH);
    const height = page.viewportSize()?.height ?? 0;
    await cdpFlick(page, { dy: Math.round(height * 0.5) });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });
});
