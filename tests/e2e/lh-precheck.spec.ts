// Lighthouse precheck (ARCHITECTURE §13.8, WP-29 A5; R7 under a grant). The CI `lighthouse` job
// runs this spec with --project=desktop before lhci. It launches Chromium with exactly the
// `chromeFlags` of lighthouserc.cjs (the SwiftShader flags) and opens every museum URL that
// lighthouserc.cjs and lighthouserc.desktop.cjs score, rewritten to this server's origin, at the
// mobile and desktop screen sizes Lighthouse emulates. Each must boot into museum mode
// (`document.documentElement.dataset.mode === 'museum'`) and reach `__MUSEUM__.ready`. If it does
// not, Lighthouse would be scoring the classic fallback (for example /resume/ after the boot
// redirect, which has great numbers and no WebGL), so the job fails before lhci runs.
import { createRequire } from 'node:module';
import { chromium, type BrowserContextOptions } from '@playwright/test';
import { expect, test } from './fixtures';

interface LhciConfig {
  ci: {
    collect: { url: string[]; settings: { chromeFlags: string; preset?: string } };
  };
}

const require = createRequire(import.meta.url);
const MOBILE = require('../../lighthouserc.cjs') as LhciConfig;
const DESKTOP = require('../../lighthouserc.desktop.cjs') as LhciConfig;

/** The museum URLs Lighthouse scores: every collected URL except /resume/ (zero WebGL). */
const museumUrls = (config: LhciConfig) =>
  config.ci.collect.url.filter((u) => !new URL(u).pathname.startsWith('/resume/'));

/** Lighthouse 12's emulated screens: moto g power (mobile) and the desktop preset. */
const SCREENS: Record<
  'mobile' | 'desktop',
  { config: LhciConfig; context: BrowserContextOptions }
> = {
  mobile: {
    config: MOBILE,
    context: {
      viewport: { width: 412, height: 823 },
      deviceScaleFactor: 1.75,
      isMobile: true,
      hasTouch: true,
    },
  },
  desktop: {
    config: DESKTOP,
    context: { viewport: { width: 1350, height: 940 }, deviceScaleFactor: 1 },
  },
};

/** lhci's chromeFlags as launch args; Playwright sets headless mode itself. */
const launchArgs = (config: LhciConfig) =>
  config.ci.collect.settings.chromeFlags
    .split(/\s+/)
    .filter((f) => f && !f.startsWith('--headless'));

test('the configs score the museum URLs with ?test=1&mode=museum and the SwiftShader flags', () => {
  for (const config of [MOBILE, DESKTOP]) {
    const urls = museumUrls(config);
    expect(urls.map((u) => new URL(u).pathname)).toEqual(['/', '/exhibit/verafin/']);
    for (const u of urls) {
      const search = new URL(u).searchParams;
      expect(search.get('test'), u).toBe('1');
      expect(search.get('mode'), u).toBe('museum');
    }
    const flags = launchArgs(config);
    for (const flag of [
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ]) {
      expect(flags).toContain(flag);
    }
  }
  expect(DESKTOP.ci.collect.settings.preset).toBe('desktop');
});

for (const [screen, { config, context }] of Object.entries(SCREENS)) {
  test.describe(`lighthouse ${screen} config`, () => {
    test.beforeEach(() => {
      test.skip(test.info().project.name !== 'desktop', 'run once, from the desktop project');
    });

    for (const lhUrl of museumUrls(config)) {
      const { pathname, search } = new URL(lhUrl);
      test(`${pathname}${search} boots the museum and reaches ready`, async ({ baseURL }) => {
        test.setTimeout(90_000);
        // Playwright adds --enable-unsafe-swiftshader on its own; lhci's chrome-launcher does not,
        // so drop it and let only lhci's chromeFlags decide whether WebGL exists.
        const browser = await chromium.launch({
          channel: 'chromium',
          args: launchArgs(config),
          ignoreDefaultArgs: ['--enable-unsafe-swiftshader'],
        });
        try {
          const page = await browser.newPage(context);
          const errors: string[] = [];
          page.on('pageerror', (e) => errors.push(e.message));
          await page.goto(new URL(`${pathname}${search}`, baseURL).href);
          // The boot script's choice first, so a classic boot fails with its reason, not a timeout.
          expect(
            await page.evaluate(() => [document.documentElement.dataset.mode, location.pathname]),
            'the boot script picked the museum',
          ).toEqual(['museum', pathname]);
          await page.waitForFunction(() => window.__MUSEUM__?.ready === true, undefined, {
            timeout: 60_000,
          });
          const state = await page.evaluate(() => ({
            mode: document.documentElement.dataset.mode,
            ready: window.__MUSEUM__?.ready,
            pathname: location.pathname,
          }));
          expect(state).toEqual({ mode: 'museum', ready: true, pathname });
          expect(errors, 'no page errors').toEqual([]);
        } finally {
          await browser.close();
        }
      });
    }
  });
}
