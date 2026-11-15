// axe across every DOM state (WP-30; ARCHITECTURE §13.7, EXPERIENCE §10.6). One place lists all
// the states the brief names, with the tags of §13.7 (wcag2a, wcag2aa, wcag21aa, wcag22aa) and 0
// violations each: `/` at the lobby, `/` at a door stop, the open dialog (desktop and Pixel 7), a
// cold `/exhibit/verafin/`, `/exhibit/mysa/` with JS off, `/resume/` light and dark, `/404.html`
// and the no-WebGL path. It also covers the states between them that carry their own controls:
// inside a wing (the wing head and its "Return to the aisle"), the front desk, and the lobby with
// reduced motion (the classic-view chip). Some of these repeat checks in shell.spec and
// dialog.spec on purpose, so the audit reads from one file.
//
// The structural rules axe does not check (EXPERIENCE §10.1) run here too: the landmarks, one
// heading per stop section (h1 in the lobby, h2 elsewhere), `aria-haspopup="dialog"` on every
// "Read the story", `aria-current="step"` on the rail, the aria-hidden canvas and `lang="en-CA"`.
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import { EXHIBIT_IDS, type StopId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { mainTrack } from '../../src/content/selectors';
import { expect, test } from './fixtures';
import { expectNoAxeViolations, goToStop, museumUrl, waitForMuseum } from './helpers';

const project = () => test.info().project.name;
const only = (...names: string[]) =>
  test.skip(!names.includes(project()), `${names.join(' and ')} only`);
/** The DOM-only pages: one desktop and one phone run is enough. */
const DOM_PROJECTS = ['desktop', 'pixel7'];

const pathOf = (page: Page) => new URL(page.url()).pathname;

/** Waits for the dialog's slide-in so axe sees its final colors. */
async function settleDialog(page: Page) {
  await page
    .getByTestId(TEST_IDS.dialog)
    .evaluate((el) => Promise.all(el.getAnimations().map((animation) => animation.finished)));
}

/** Serves `path` as a JS-off browser renders it: scripts removed, the <noscript> notice shown. */
async function gotoWithoutScripts(page: Page, path: string) {
  await page.route(`**${path}`, async (route) => {
    const response = await route.fetch();
    const body = (await response.text())
      .replace(/<script\b[\s\S]*?<\/script>/gi, '')
      .replace(/<\/?noscript>/gi, '');
    await route.fulfill({ response, body });
  });
  await page.goto(path);
  await expect(page.locator('html')).not.toHaveAttribute('data-mode', /.*/);
}

test.describe('axe across states', { tag: '@a11y' }, () => {
  test('/ at the lobby', async ({ page }) => {
    only('desktop', 'pixel7', 'pixel7-landscape');
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    await expect(page.getByTestId(TEST_IDS.hero)).toBeVisible();
    await expectNoAxeViolations(page, `/ at the lobby (${project()})`);
  });

  test('/ at a door stop', async ({ page }) => {
    only('desktop', 'pixel7');
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    await goToStop(page, 'projects-door');
    await expect(page.getByTestId(TEST_IDS.enterWing('projects'))).toBeVisible();
    await expectNoAxeViolations(page, `/ at projects-door (${project()})`);
  });

  test('/ inside a wing', async ({ page }) => {
    only('desktop', 'pixel7');
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    await goToStop(page, 'klarup');
    await expect(page.getByTestId(TEST_IDS.exitWing)).toBeVisible();
    await expectNoAxeViolations(page, `/ at klarup in the projects wing (${project()})`);
  });

  test('/ at the front desk', async ({ page }) => {
    only('desktop', 'pixel7');
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    await goToStop(page, 'desk');
    await expect(page.getByTestId(TEST_IDS.card('desk'))).toBeVisible();
    await expectNoAxeViolations(page, `/ at the desk (${project()})`);
  });

  test('/ at the lobby with reduced motion (the classic-view chip)', async ({ page }) => {
    only('desktop');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    await expect(page.locator('[data-chip="reduced-motion"]')).toBeVisible();
    await expectNoAxeViolations(page, '/ at the lobby, reduced motion');
  });

  test('the open dialog', async ({ page }) => {
    only('desktop', 'pixel7');
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    await goToStop(page, 'verafin');
    await page.getByTestId(TEST_IDS.open('verafin')).click();
    await expect(page.getByTestId(TEST_IDS.dialog)).toBeVisible();
    expect(pathOf(page)).toBe('/exhibit/verafin/');
    await settleDialog(page);
    await expectNoAxeViolations(page, `the open dialog (${project()})`);
  });

  test('a cold /exhibit/verafin/', async ({ page }) => {
    only('desktop', 'pixel7');
    await page.goto(museumUrl('/exhibit/verafin/'));
    await waitForMuseum(page);
    await expect(page.getByTestId(TEST_IDS.dialog)).toBeVisible();
    await settleDialog(page);
    await expectNoAxeViolations(page, `a cold /exhibit/verafin/ (${project()})`);
  });

  // axe cannot run with JavaScript disabled (Playwright refuses to evaluate there), so this serves
  // the prerendered page as a JS-off browser renders it, with the production styles and headers.
  test('/exhibit/mysa/ with JS off', async ({ page }) => {
    only(...DOM_PROJECTS);
    await gotoWithoutScripts(page, '/exhibit/mysa/');
    await expect(page.getByTestId(TEST_IDS.storyStatic)).toBeVisible();
    await expectNoAxeViolations(page, `/exhibit/mysa/ with JS off (${project()})`);
  });

  test('/ with JS off', async ({ page }) => {
    only(...DOM_PROJECTS);
    await gotoWithoutScripts(page, '/');
    await expect(page.getByTestId(TEST_IDS.hero)).toBeVisible();
    await expectNoAxeViolations(page, `/ with JS off (${project()})`);
  });

  for (const colorScheme of ['light', 'dark'] as const) {
    test(`/resume/ (${colorScheme})`, async ({ page }) => {
      only(...DOM_PROJECTS);
      await page.emulateMedia({ colorScheme });
      await page.goto('/resume/');
      await expect(page.getByTestId(TEST_IDS.classicView)).toBeVisible();
      await expectNoAxeViolations(page, `/resume/ (${colorScheme}, ${project()})`);
    });
  }

  test('/404.html', async ({ page }) => {
    only(...DOM_PROJECTS);
    await page.goto('/404.html');
    await expect(page.getByTestId(TEST_IDS.notFound)).toBeVisible();
    await expectNoAxeViolations(page, `/404.html (${project()})`);
  });

  test('the no-WebGL path', async ({ page }) => {
    only('no-webgl');
    await page.goto('/');
    await page.waitForURL('**/resume/#why-no-webgl2');
    await expect(page.locator('#why-no-webgl2')).toBeVisible();
    await expectNoAxeViolations(page, '/ without WebGL (/resume/#why-no-webgl2)');
  });
});

test.describe('semantics (EXPERIENCE §10.1)', { tag: '@a11y' }, () => {
  test('landmarks, headings, popup buttons, rail state, canvas and language', async ({ page }) => {
    only('desktop', 'pixel7');
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);

    await expect(page.locator('html')).toHaveAttribute('lang', 'en-CA');
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('main')).toHaveCount(1);
    // The rail is the Exhibits nav. Phones hide it for the 3 px bar (EXPERIENCE §9.2), so the
    // landmark is exposed only on desktop, while its attributes are checked everywhere below.
    const rail = page.locator('nav[aria-label="Exhibits"]');
    await expect(rail).toHaveCount(1);
    if (project() === 'desktop') {
      await expect(page.getByRole('navigation', { name: 'Exhibits' })).toHaveCount(1);
    }
    // The header holds the skip link, the wordmark and the two HUD links.
    const header = page.getByRole('banner');
    await expect(header.getByRole('link', { name: 'Skip to classic resume' })).toHaveCount(1);
    await expect(header.getByTestId(TEST_IDS.hudPdf)).toHaveCount(1);
    await expect(header.getByTestId(TEST_IDS.hudClassic)).toHaveCount(1);

    // The canvas sits inside the aria-hidden stage and never takes focus.
    const stage = page.getByTestId(TEST_IDS.stage);
    await expect(stage).toHaveAttribute('aria-hidden', 'true');
    await expect(stage.locator('canvas')).toHaveCount(1);
    expect(await stage.locator('canvas').getAttribute('tabindex')).toBeNull();

    // One heading per stop section: the hero h1 in the lobby, an h2 everywhere else.
    const sections = page.locator('#track > section[data-stop]');
    const stops = (await sections.evaluateAll((els) =>
      els.map((el) => (el as HTMLElement).dataset.stop),
    )) as StopId[];
    expect(stops).toEqual(expect.arrayContaining(mainTrack(content)));
    for (const stop of stops) {
      const section = page.getByTestId(TEST_IDS.stop(stop));
      const level = stop === 'lobby' ? 'h1' : 'h2';
      const other = stop === 'lobby' ? 'h2' : 'h1';
      await expect(section.locator(level), `${level} in ${stop}`).toHaveCount(1);
      await expect(section.locator(other), `no ${other} in ${stop}`).toHaveCount(0);
    }
    await expect(page.locator('h1')).toHaveCount(1);

    // "Read the story" announces its dialog; "Step inside" is a button.
    for (const id of EXHIBIT_IDS) {
      const open = page.getByTestId(TEST_IDS.open(id));
      await expect(open).toHaveJSProperty('tagName', 'BUTTON');
      await expect(open).toHaveAttribute('aria-haspopup', 'dialog');
    }
    for (const wing of content.wings) {
      await expect(page.getByTestId(TEST_IDS.enterWing(wing.id))).toHaveJSProperty(
        'tagName',
        'BUTTON',
      );
    }

    // The rail marks exactly the current stop.
    await expect(rail.locator('[aria-current="step"]')).toHaveCount(1);
    await expect(page.getByTestId(TEST_IDS.hudStop('lobby'))).toHaveAttribute(
      'aria-current',
      'step',
    );
    await goToStop(page, 'mysa');
    await expect(page.getByTestId(TEST_IDS.hudStop('mysa'))).toHaveAttribute(
      'aria-current',
      'step',
    );
    await expect(rail.locator('[aria-current="step"]')).toHaveCount(1);

    // No positive tabindex anywhere.
    const positive = await page.evaluate(() =>
      [...document.querySelectorAll('[tabindex]')]
        .filter((el) => Number(el.getAttribute('tabindex')) > 0)
        .map((el) => el.outerHTML.slice(0, 80)),
    );
    expect(positive).toEqual([]);
  });

  test('every focusable control is at least 44 x 44 CSS px', async ({ page }) => {
    only('desktop', 'pixel7');
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    // Inline links inside running text are exempt (WCAG 2.5.8 "inline"); so is the skip link,
    // which is off-screen until focused. Everything else that takes focus is a target.
    const small = await page.evaluate(() => {
      const out: string[] = [];
      const controls = document.querySelectorAll<HTMLElement>(
        '#app a[href], #app button, #app [tabindex="0"]',
      );
      for (const el of controls) {
        const style = getComputedStyle(el);
        if (style.display === 'inline') continue;
        if (el.matches('header a:first-child')) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.width < 43.5 || r.height < 43.5) {
          const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40);
          out.push(
            `${el.tagName.toLowerCase()} "${name}" ${r.width.toFixed(0)}x${r.height.toFixed(0)}`,
          );
        }
      }
      return out;
    });
    expect(small).toEqual([]);
  });
});
