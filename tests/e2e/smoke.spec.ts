// Boot smoke (ARCHITECTURE §13.9 "boot without errors or CSP violations", Gate G1). Runs against
// serve-dist with the production `_headers`; the global guards in fixtures.ts fail any test here on
// a console error, page error, CSP violation, foreign request or fallback-font request, and (under
// @smoke) on a document without the CSP header. WP-10 adds the `/resume/` and 404 checks in its own
// spec.
import { expect, test } from './fixtures';
import { museumUrl } from './helpers';

test.describe('smoke', { tag: '@smoke' }, () => {
  test('/ loads with a visible h1 and no guard trips', async ({ page }) => {
    const response = await page.goto(museumUrl('/'));
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    // Lets late module and font requests finish inside the guarded window.
    await page.waitForLoadState('networkidle');
  });

  test('/resume.pdf is served as a PDF', async ({ request }) => {
    const response = await request.get('/resume.pdf');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/pdf');
  });

  test('the CSP header is present on /', async ({ request }) => {
    const response = await request.get('/');
    expect(response.status()).toBe(200);
    const csp = response.headers()['content-security-policy'];
    expect(csp, 'serve-dist applies dist/_headers (ARCHITECTURE §12.2)').toBeDefined();
    expect(csp).toContain("default-src 'self'");
  });
});
