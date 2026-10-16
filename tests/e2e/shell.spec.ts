// App shell (WP-10; ARCHITECTURE §5.2, §5.3, §5.9, §12, §13.7; EXPERIENCE §8.4 to §8.6, §10).
// Runs against serve-dist with the production _headers; the global guards in fixtures.ts fail any
// test on a console error, page error, CSP violation or foreign request.
// - @smoke: the museum boots with the HUD under the CSP (one sha256 source, the inline boot script),
//   the skip link is the first Tab stop, /resume/ ships zero scripts, unknown paths get the 404.
// - no-webgl project: / lands on /resume/#why-no-webgl2 with the banner and the classic content.
// - @a11y: axe (wcag2a, wcag2aa, wcag21aa, wcag22aa) finds 0 violations on /resume/ (light and
//   dark), /404.html, / at the lobby and at a door stop, and the no-WebGL landing.
// - @dom (WP-17): the checks that need no WebGL (classic view, 404, CSP, the desk card's links)
//   run in Firefox and WebKit too in WP-32.
// - @smoke (WP-18 A5, WP-17): a deploy preview (a host with "--") sends X-Robots-Tag: noindex,
//   production and the local server do not.
import { createHash } from 'node:crypto';
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { PDF_PATH } from '../../src/app/routes';
import { TEST_IDS } from '../../src/app/testIds';
import { content } from '../../src/content/index';
import { expect, test, type Guards } from './fixtures';
import { goToStop, museumUrl, waitForMuseum } from './helpers';

/** Every museum URL carries ?test=1 (CLAUDE.md); &mode=museum keeps it off the classic path. */
const MUSEUM_URL = '/?test=1&mode=museum';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'];
const MUSEUM_PROJECTS = ['desktop', 'pixel7', 'pixel7-landscape'];

const project = () => test.info().project.name;
const onlyMuseumProjects = () =>
  test.skip(!MUSEUM_PROJECTS.includes(project()), 'Needs WebGL2 (the museum path)');
const onlyNoWebgl = () => test.skip(project() !== 'no-webgl', 'The no-webgl project only');

/** The browser logs the 404 document response itself as a console error; nothing else may. */
/**
 * Chromium logs the deliberate 404 navigation to /nope/ as a console error. The reason phrase
 * depends on the server: "(Not Found)" from serve-dist over HTTP/1.1, "()" from Netlify over
 * HTTP/2 (the deploy smoke test of CI run 32). Only that URL is acknowledged.
 */
function acknowledgeNotFound(guards: Guards) {
  guards.acknowledge('console', /status of 404 \((Not Found)?\) \(\S+\/nope\/:\d+\)$/);
}

async function expectNoAxeViolations(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
  expect(summary, `axe violations on ${label}`).toEqual([]);
}

test.describe('app shell', { tag: '@smoke' }, () => {
  test('the museum boots with the HUD and no CSP violation', async ({ page }) => {
    onlyMuseumProjects();
    const response = await page.goto(MUSEUM_URL);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'museum');
    await expect(page.locator('html')).toHaveAttribute('data-test', '1');
    await expect(page.getByTestId(TEST_IDS.hud)).toBeVisible();
    await expect(page.getByTestId(TEST_IDS.hudPdf)).toHaveAttribute('href', '/resume.pdf');
    await expect(page.getByTestId(TEST_IDS.hudClassic)).toHaveAttribute('href', '/resume/');
    const boot = await page.evaluate(
      () => (window as { __BOOT__?: { mode: string; reason: string } }).__BOOT__,
    );
    expect(boot).toMatchObject({ mode: 'museum', reason: 'param' });
    await page.waitForLoadState('networkidle');
  });

  test(
    'the CSP allows exactly the inline boot script by hash',
    { tag: '@dom' },
    async ({ request }) => {
      const response = await request.get('/');
      const csp = response.headers()['content-security-policy'] ?? '';
      const hashes = csp.match(/'sha256-[A-Za-z0-9+/=]+'/g) ?? [];
      expect(hashes, 'one sha256 source in script-src').toHaveLength(1);
      const html = await response.text();
      const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
      expect(inline, 'one inline script (the boot script)').toHaveLength(1);
      const digest = createHash('sha256').update(inline[0]!, 'utf8').digest('base64');
      expect(hashes[0]).toBe(`'sha256-${digest}'`);
    },
  );

  test('the skip link is the first Tab stop', async ({ page }) => {
    onlyMuseumProjects();
    await page.goto(MUSEUM_URL);
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveText('Skip to classic resume');
    await expect(focused).toHaveAttribute('href', '/resume/');
    await expect(focused).toBeInViewport();
  });

  test(
    '/resume/ is the classic view with zero scripts',
    { tag: '@dom' },
    async ({ page, request }) => {
      const raw = await request.get('/resume/');
      expect(raw.status()).toBe(200);
      expect(await raw.text()).not.toMatch(/<script\b/i);
      await page.goto('/resume/');
      await expect(page.getByTestId(TEST_IDS.classicView)).toBeVisible();
      await expect(page.locator('script')).toHaveCount(0);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en-CA');
      await expect(page.getByTestId(TEST_IDS.classicView)).toContainText('Nasdaq Verafin');
      // Banners show only as the :target of /resume/#why-<reason>.
      await expect(page.locator('#why-no-webgl2')).toBeHidden();
      await expect(page.getByRole('link', { name: 'Try the gallery' })).toBeVisible();
    },
  );

  test('only a deploy preview sends X-Robots-Tag: noindex', async ({ request, baseURL }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    const preview = new URL(baseURL!).hostname.includes('--');
    const robots = response.headers()['x-robots-tag'];
    if (preview) expect(robots, 'a preview deploy is noindex').toMatch(/\bnoindex\b/);
    else expect(robots, 'production and local builds are indexable').toBeUndefined();
  });

  test(
    'an unknown path gets the 404 page with zero scripts',
    { tag: '@dom' },
    async ({ page, guards }) => {
      const response = await page.goto('/nope/');
      expect(response?.status()).toBe(404);
      await expect(page.getByTestId(TEST_IDS.notFound)).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('This room is closed.');
      await expect(page.getByRole('link', { name: 'Back to the gallery' })).toHaveAttribute(
        'href',
        '/',
      );
      await expect(page.getByRole('link', { name: 'Classic resume' })).toHaveAttribute(
        'href',
        '/resume/',
      );
      await expect(page.locator('script')).toHaveCount(0);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
      acknowledgeNotFound(guards);
    },
  );
});

test.describe('front desk card', { tag: '@dom' }, () => {
  test.use({ javaScriptEnabled: false });

  test('its links: mailto, LinkedIn, the PDF and GitHub', async ({ page }) => {
    await page.goto('/');
    const desk = page.getByTestId(TEST_IDS.card('desk'));
    await expect(desk).toBeAttached();
    const link = (name: string) => desk.getByRole('link', { name });
    await expect(link('Email me')).toHaveAttribute('href', `mailto:${content.contact.email}`);
    await expect(link('Connect on LinkedIn')).toHaveAttribute('href', content.contact.linkedin);
    await expect(link('Take home the catalogue (PDF)')).toHaveAttribute('href', PDF_PATH);
    expect(content.contact.github, 'GitHub is in the content').toBeTruthy();
    await expect(link('Browse code on GitHub')).toHaveAttribute('href', content.contact.github!);
    for (const external of [link('Connect on LinkedIn'), link('Browse code on GitHub')]) {
      await expect(external).toHaveAttribute('rel', 'me');
    }
  });
});

test.describe('no-WebGL fallback', { tag: '@dom' }, () => {
  test('/ lands on /resume/#why-no-webgl2 with the banner and the classic content', async ({
    page,
  }) => {
    onlyNoWebgl();
    await page.goto('/');
    await page.waitForURL('**/resume/#why-no-webgl2');
    const url = new URL(page.url());
    expect(url.pathname).toBe('/resume/');
    expect(url.hash).toBe('#why-no-webgl2');
    await expect(page.locator('#why-no-webgl2')).toBeVisible();
    await expect(page.locator('#why-no-webgl2')).toHaveText(
      "The gallery needs WebGL2, so you're seeing the classic resume.",
    );
    await expect(page.getByTestId(TEST_IDS.classicView)).toContainText('Nasdaq Verafin');
    // "Try the gallery" cannot work here, so it is hidden.
    await expect(page.getByRole('link', { name: 'Try the gallery' })).toBeHidden();
  });

  test('asking for the museum still lands on the classic resume', async ({ page }) => {
    onlyNoWebgl();
    await page.goto(MUSEUM_URL);
    await page.waitForURL('**/resume/#why-no-webgl2');
    await expect(page.locator('#why-no-webgl2')).toBeVisible();
  });
});

test.describe('accessibility', { tag: '@a11y' }, () => {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`/resume/ (${colorScheme}) has no axe violations`, async ({ page }) => {
      await page.emulateMedia({ colorScheme });
      await page.goto('/resume/');
      await expect(page.getByTestId(TEST_IDS.classicView)).toBeVisible();
      await expectNoAxeViolations(page, `/resume/ (${colorScheme})`);
    });
  }

  test('/resume/ with a fallback banner has no axe violations', async ({ page }) => {
    await page.goto('/resume/#why-software');
    await expect(page.locator('#why-software')).toBeVisible();
    await expectNoAxeViolations(page, '/resume/#why-software');
  });

  test('/404.html has no axe violations', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.getByTestId(TEST_IDS.notFound)).toBeVisible();
    await expectNoAxeViolations(page, '/404.html');
  });

  test('/ at the lobby has no axe violations', async ({ page }) => {
    onlyMuseumProjects();
    await page.goto(MUSEUM_URL);
    await expect(page.getByTestId(TEST_IDS.hero)).toBeVisible();
    await page.waitForLoadState('networkidle');
    await expectNoAxeViolations(page, '/ at the lobby');
  });

  test('/ at a door stop has no axe violations', async ({ page }) => {
    test.skip(!['desktop', 'pixel7'].includes(project()), 'desktop and pixel7');
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    await goToStop(page, 'projects-door');
    await expectNoAxeViolations(page, '/ at projects-door');
  });

  test('the no-WebGL landing has no axe violations', async ({ page }) => {
    onlyNoWebgl();
    await page.goto('/');
    await page.waitForURL('**/resume/#why-no-webgl2');
    await expectNoAxeViolations(page, '/resume/#why-no-webgl2');
  });
});
