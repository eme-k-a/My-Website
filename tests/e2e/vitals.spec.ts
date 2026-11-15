// Web vitals in e2e (ARCHITECTURE §9, EXPERIENCE §8.6, WP-29 A4; R7 under a grant). On `desktop`
// and `pixel7`, loading `/?test=1&mode=museum` until `__MUSEUM__.ready`:
// - the latest largest-contentful-paint entry's element is the h1 (the canvas is never an LCP
//   candidate, and no stop card or intro may outgrow the h1);
// - CLS, summed over `layout-shift` entries without recent input from navigation to `ready`, is
//   at most perf/budgets.json web.cls (Lighthouse gates the looser web.clsLhciGate);
// - the `ready` time is recorded, and over readyMs (desktop or mobile) it is a warning
//   annotation, never a failure (readyMs.level is "warn").
// LCP time itself is Lighthouse's gate (lighthouserc.cjs); here it is recorded only.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { museumUrl, observeLayoutShift } from './helpers';

const BUDGETS = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../perf/budgets.json', import.meta.url)), 'utf8'),
) as {
  web: { cls: number };
  readyMs: { desktop: number; mobile: number; level: 'warn' | 'error' };
};

const PROJECTS: Record<string, 'desktop' | 'mobile'> = { desktop: 'desktop', pixel7: 'mobile' };

declare global {
  interface Window {
    __LCP__?: { element: string; startTime: number; entries: number };
  }
}

/** Records every largest-contentful-paint entry of each document from now on (before goto). */
async function observeLcp(page: Page): Promise<void> {
  await page.addInitScript(() => {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        element?: Element | null;
      })[]) {
        const el = entry.element;
        window.__LCP__ = {
          element: el ? `${el.tagName.toLowerCase()}:${(el.textContent ?? '').trim()}` : 'none',
          startTime: entry.startTime,
          entries: (window.__LCP__?.entries ?? 0) + 1,
        };
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
}

/** Navigation-relative time (ms) at which `__MUSEUM__.ready` first reads true. */
async function readyTime(page: Page): Promise<number> {
  const handle = await page.waitForFunction(
    () => (window.__MUSEUM__?.ready === true ? performance.now() : false),
    undefined,
    { polling: 'raf', timeout: 60_000 },
  );
  return (await handle.jsonValue()) as number;
}

test.describe('web vitals to ready', () => {
  test.beforeEach(() => {
    test.skip(!(test.info().project.name in PROJECTS), 'measured on desktop and pixel7');
  });

  test('the LCP element is the h1, CLS is within web.cls, ready time is recorded', async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const project = test.info().project.name;
    const kind = PROJECTS[project]!;
    await observeLcp(page);
    const cls = await observeLayoutShift(page);

    await page.goto(museumUrl('/'));
    const readyMs = await readyTime(page);
    // Fonts and two frames, so a late font swap would have produced its LCP and shift entries.
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    });

    const lcp = await page.evaluate(() => window.__LCP__ ?? null);
    const shift = await cls();
    const h1 = (await page.locator('h1').first().textContent())?.trim() ?? '';
    const limit = BUDGETS.readyMs[kind];
    const measured = {
      project,
      lcp,
      cls: { value: Number(shift.value.toFixed(4)), entries: shift.entries },
      readyMs: Math.round(readyMs),
      readyLimitMs: limit,
    };
    test.info().annotations.push({ type: 'vitals', description: JSON.stringify(measured) });
    if (readyMs > limit) {
      test.info().annotations.push({
        type: 'warning',
        description: `ready took ${Math.round(readyMs)} ms on ${project}, over readyMs.${kind} (${limit} ms); a warning only (readyMs.level ${BUDGETS.readyMs.level}).`,
      });
    }

    expect(lcp, 'a largest-contentful-paint entry was recorded').not.toBeNull();
    expect(lcp!.element, 'the LCP element').toBe(`h1:${h1}`);
    expect(shift.value, `CLS from navigation to ready on ${project}`).toBeLessThanOrEqual(
      BUDGETS.web.cls,
    );
  });
});
