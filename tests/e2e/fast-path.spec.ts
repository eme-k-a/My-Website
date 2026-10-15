// Recruiter fast path (EXPERIENCE §8.1, §8.6; ARCHITECTURE §5.2, §9; WP-10 A5). At 360 x 640 and
// 390 x 844 the h1, the role line, the education line and the three hero links sit fully inside the
// first viewport, with JavaScript off and with JavaScript on before the museum is ready (its chunk
// is blocked, so `ready` never comes). The largest-contentful-paint element is the h1.
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import { expect, test, type Guards } from './fixtures';

const PHONES = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
] as const;

/** Every museum URL carries ?test=1 (CLAUDE.md); &mode=museum keeps it off the classic path. */
const MUSEUM_URL = '/?test=1&mode=museum';
const MUSEUM_CHUNK = '**/MuseumCanvas*';

/** The fast-path elements, in reading order. */
function fastPath(page: Page) {
  const hero = page.getByTestId(TEST_IDS.hero);
  return {
    h1: page.getByRole('heading', { level: 1 }),
    role: hero.locator('h1 + p'),
    education: hero.locator('h1 + p + p'),
    pdf: page.getByTestId(TEST_IDS.heroPdf),
    email: page.getByTestId(TEST_IDS.heroEmail),
    classic: page.getByTestId(TEST_IDS.heroClassic),
  };
}

async function expectInsideFirstViewport(page: Page, size: { width: number; height: number }) {
  const elements = fastPath(page);
  await expect(elements.role).toHaveText(/Nasdaq Verafin/);
  await expect(elements.education).toHaveText(/Computer Engineering/);
  for (const [name, locator] of Object.entries(elements)) {
    const box = await locator.boundingBox();
    expect(box, `${name} has a box`).not.toBeNull();
    const { x, y, width, height } = box!;
    expect(x, `${name} left edge`).toBeGreaterThanOrEqual(0);
    expect(y, `${name} top edge`).toBeGreaterThanOrEqual(0);
    expect(x + width, `${name} right edge`).toBeLessThanOrEqual(size.width);
    expect(y + height, `${name} bottom edge`).toBeLessThanOrEqual(size.height);
  }
  // Nothing scrolled the page to get there.
  expect(await page.evaluate(() => window.scrollY).catch(() => 0)).toBe(0);
}

/** The museum chunk is blocked on purpose: acknowledge exactly the errors that causes. */
function acknowledgeBlockedChunk(guards: Guards) {
  guards.acknowledge('console', /Failed to load resource: net::ERR_FAILED/);
  guards.acknowledge('console', /Failed to fetch dynamically imported module: .*MuseumCanvas/);
}

/** The element of the latest largest-contentful-paint entry, after fonts and two frames. */
async function lcpElement(page: Page): Promise<string> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return new Promise<string>((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries() as (PerformanceEntry & { element?: Element | null })[];
        const element = entries.at(-1)?.element;
        resolve(element ? `${element.tagName.toLowerCase()}:${element.textContent ?? ''}` : 'none');
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });
  });
}

test.describe('recruiter fast path', () => {
  test.beforeEach(() => {
    test.skip(
      test.info().project.name !== 'pixel7',
      'Phone sizes run once, on the pixel7 project (touch, mobile user agent)',
    );
  });

  for (const size of PHONES) {
    test.describe(`${size.width} x ${size.height}, JavaScript off`, () => {
      test.use({ viewport: size, javaScriptEnabled: false });

      test('the hero is fully inside the first viewport', async ({ page }) => {
        const response = await page.goto('/');
        expect(response?.status()).toBe(200);
        await expectInsideFirstViewport(page, size);
      });
    });

    test.describe(`${size.width} x ${size.height}, JavaScript on before ready`, () => {
      test.use({ viewport: size });

      test('the hero is fully inside the first viewport', async ({ page, guards }) => {
        await page.route(MUSEUM_CHUNK, (route) => route.abort());
        await page.goto(MUSEUM_URL);
        await expect(page.locator('html')).toHaveAttribute('data-mode', 'museum');
        const ready = await page.evaluate(
          () => (window as { __MUSEUM__?: { ready: boolean } }).__MUSEUM__?.ready,
        );
        expect(ready).toBe(false);
        await expectInsideFirstViewport(page, size);
        // The blocked chunk ends in the fallback notice, never in a broken page.
        await expect(page.getByTestId(TEST_IDS.fallbackNotice)).toBeVisible();
        acknowledgeBlockedChunk(guards);
      });

      test('the LCP element is the h1', async ({ page }) => {
        await page.goto(MUSEUM_URL);
        expect(await lcpElement(page)).toMatch(/^h1:/);
      });
    });
  }
});

test.describe('LCP on desktop', () => {
  test('the LCP element is the h1 at 1440 x 900', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'Desktop only');
    await page.goto(MUSEUM_URL);
    expect(await lcpElement(page)).toMatch(/^h1:/);
  });
});
