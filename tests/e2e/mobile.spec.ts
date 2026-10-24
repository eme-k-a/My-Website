// Phone layout (WP-27; EXPERIENCE §5.8, §8.3, §8.4, §9, §11.1 item 3; ARCHITECTURE §9, §10.3).
// Runs on pixel7, pixel7-landscape and a 360 x 640 portrait context (Pixel 7 device, smaller
// viewport). At every stop (13: the ten main stops and the three wing exhibits):
// - the stop card does not intersect any visible HUD rect (the header, the year chip, the wing
//   head), and at the lobby the hero text does not either;
// - the card does not contain `screenPos(id)` and its top stays below the case floor (the front
//   edge of the glass case's bottom face, projected through the live camera);
// - every visible button and link in the card and the HUD is at least 44 x 44 CSS px.
// CLS from navigation to `ready` stays within perf/budgets.json web.cls, including the admission
// ticket stamp. In landscape the card is 300 px wide and Medium and Caption are hidden. The ticket
// stamp under ?test=1 is the frozen test date; the reduced-motion chip shows once and stays
// dismissed; the ticket tears on click, except under reduced motion.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { TEST_IDS } from '../../src/app/testIds';
import type { ExhibitId, StopId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { entryById, mainTrack } from '../../src/content/selectors';
import { caseBox, hitBox, slotMatrix, slotVariant } from '../../src/museum/exhibits/_kit/anatomy';
import { applyFraming, fovFor, framingFor, viewOffsetFor } from '../../src/museum/rail/framing';
import { computeLayout } from '../../src/museum/rail/layout';
import { TEST_STAMP } from '../../src/overlay/ticket';
import { expect, test } from './fixtures';
import { goToStop, museumUrl, observeLayoutShift, stats, waitForMuseum } from './helpers';

/** perf/budgets.json web.cls (ARCHITECTURE §9): the e2e gate, from navigation to `ready`. */
const CLS_BUDGET = (
  JSON.parse(
    readFileSync(fileURLToPath(new URL('../../perf/budgets.json', import.meta.url)), 'utf8'),
  ) as { web: { cls: number } }
).web.cls;

const LAYOUT = computeLayout(content, new Date());
const MAIN: StopId[] = mainTrack(content);
const WING_ITEMS = content.wings.flatMap((w) => w.items) as ExhibitId[];
const STOPS: StopId[] = [...MAIN, ...WING_ITEMS];
const EXHIBITS = new Set<StopId>(LAYOUT.slots.map((s) => s.id));
/** Hit targets (EXPERIENCE §7.8, §10.4); half a pixel for subpixel layout. */
const TARGET = 44 - 0.5;

const project = () => test.info().project.name;
const PHONES = ['pixel7', 'pixel7-landscape'];

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}
type Named = Rect & { what: string };

const intersects = (a: Rect, b: Rect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

async function openGallery(page: Page, path = '/'): Promise<void> {
  await page.goto(museumUrl(path));
  await waitForMuseum(page);
}

/** Visible rects of the HUD: header controls and labels, the phone progress, the wing head. */
async function hudRects(page: Page): Promise<Named[]> {
  return page.evaluate(
    ({ hud, rail }) => {
      const els = [
        ...document.querySelectorAll<HTMLElement>(
          `[data-testid="${hud}"] :is(a, p, button, span), [data-testid="${rail}"] :is(p, button)`,
        ),
      ];
      return els
        .filter((el) => {
          for (let e: HTMLElement | null = el; e; e = e.parentElement) {
            const s = getComputedStyle(e);
            if (s.display === 'none' || s.visibility === 'hidden' || s.clipPath !== 'none')
              return false;
          }
          return true;
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          const what = `${el.tagName.toLowerCase()} '${(el.textContent ?? '').trim().slice(0, 30)}'`;
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, what };
        })
        .filter(
          (r) => r.right > r.left && r.bottom > r.top && r.bottom > 0 && r.top < window.innerHeight,
        );
    },
    { hud: TEST_IDS.hud, rail: TEST_IDS.hudProgress },
  );
}

/** The stop's card rect (at the lobby: each text block of the hero's first viewport). */
async function cardRects(page: Page, id: StopId): Promise<Named[]> {
  return page.evaluate(
    ({ id, card, hero }) => {
      const els =
        id === 'lobby'
          ? [...document.querySelectorAll<HTMLElement>(`[data-testid="${hero}"] :is(p, h1, li, a)`)]
          : [document.querySelector<HTMLElement>(`[data-testid="${card}"]`)!];
      return els
        .map((el) => {
          const r = el.getBoundingClientRect();
          const what = `${el.tagName.toLowerCase()} '${(el.textContent ?? '').trim().slice(0, 30)}'`;
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, what };
        })
        .filter(
          (r) => r.right > r.left && r.bottom > r.top && r.bottom > 0 && r.top < window.innerHeight,
        );
    },
    { id, card: `card-${id}`, hero: TEST_IDS.hero },
  );
}

/** Visible buttons and links in the stop's card (or hero) and the HUD, with their sizes. */
async function targets(page: Page, id: StopId): Promise<Named[]> {
  return page.evaluate(
    ({ scope, hud, rail }) => {
      const els = [
        ...document.querySelectorAll<HTMLElement>(
          `[data-testid="${scope}"] :is(a, button), [data-testid="${hud}"] :is(a, button), [data-testid="${rail}"] button`,
        ),
      ];
      return els
        .filter((el) => {
          const s = getComputedStyle(el);
          if (s.display === 'none' || s.visibility === 'hidden') return false;
          return el.checkVisibility();
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          const what = `${el.tagName.toLowerCase()} '${(el.textContent ?? '').trim().slice(0, 30)}'`;
          return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, what };
        })
        .filter((r) => r.bottom > 0 && r.top < window.innerHeight && r.right > 0);
    },
    {
      scope: id === 'lobby' ? TEST_IDS.hero : `card-${id}`,
      hud: TEST_IDS.hud,
      rail: TEST_IDS.hudProgress,
    },
  );
}

/**
 * The glass case on screen, CSS px: the bounds of its eight projected corners, through the live
 * camera pose with the plain framing, moved by the offset between the projected hit-box center and
 * the live `screenPos` (the framing shift is a pure 2D translation). In portrait its bottom is the
 * front edge of the case floor.
 */
async function caseRect(page: Page, id: ExhibitId, live: { x: number; y: number }): Promise<Rect> {
  const slot = LAYOUT.slots.find((s) => s.id === id)!;
  const variant = slotVariant(slot);
  const frame = slotMatrix(slot);
  const { width, height } = page.viewportSize()!;
  const aspect = width / height;
  const { position, target } = (await stats(page)).camera;
  const camera = new PerspectiveCamera(fovFor(aspect), aspect, 0.1, 90);
  camera.position.set(...position);
  camera.lookAt(new Vector3(...target));
  applyFraming(camera, fovFor(aspect), viewOffsetFor(framingFor(aspect)), width, height);
  camera.updateMatrixWorld();
  const project = (local: [number, number, number]) => {
    const p = new Vector3(...local).applyMatrix4(frame).project(camera);
    return { x: ((p.x + 1) / 2) * width, y: ((1 - p.y) / 2) * height };
  };
  const anchor = project(hitBox(variant).center);
  const dx = live.x - anchor.x;
  const dy = live.y - anchor.y;
  const { center, size } = caseBox(variant);
  const xs: number[] = [];
  const ys: number[] = [];
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        const p = project([
          center[0] + (sx * size[0]) / 2,
          center[1] + (sy * size[1]) / 2,
          center[2] + (sz * size[2]) / 2,
        ]);
        xs.push(p.x + dx);
        ys.push(p.y + dy);
      }
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

/** Asserts the stop-by-stop layout rules on the current page. */
async function expectStopsClear(page: Page): Promise<void> {
  const report: string[] = [];
  for (const id of STOPS) {
    await goToStop(page, id);
    // The framing damps over tokens.motion.framingSmoothS (0.4 s) after a move; let it settle.
    await page.waitForTimeout(600);
    const cards = await cardRects(page, id);
    const hud = await hudRects(page);
    expect(cards.length, `${id}: the card is on screen`).toBeGreaterThan(0);
    for (const c of cards)
      for (const h of hud)
        expect
          .soft(
            intersects(c, h),
            `${id}: card ${c.what} ${JSON.stringify(c)} meets HUD ${h.what} ${JSON.stringify(h)}`,
          )
          .toBe(false);

    if (EXHIBITS.has(id)) {
      const card = cards[0]!;
      const live = await page.evaluate((e) => window.__MUSEUM__!.screenPos(e), id as ExhibitId);
      expect(live, `${id}: screenPos`).not.toBeNull();
      const inside =
        live!.x >= card.left &&
        live!.x <= card.right &&
        live!.y >= card.top &&
        live!.y <= card.bottom;
      expect
        .soft(
          inside,
          `${id}: card ${JSON.stringify(card)} contains screenPos ${JSON.stringify(live)}`,
        )
        .toBe(false);
      const glass = await caseRect(page, id as ExhibitId, live!);
      report.push(`${id}: case ${JSON.stringify(glass)}, card ${JSON.stringify(card)}`);
      expect
        .soft(
          intersects(card, glass),
          `${id}: card ${JSON.stringify(card)} covers the case ${JSON.stringify(glass)}`,
        )
        .toBe(false);
    }

    for (const t of await targets(page, id)) {
      const w = t.right - t.left;
      const h = t.bottom - t.top;
      expect
        .soft(w >= TARGET && h >= TARGET, `${id}: ${t.what} is ${w.toFixed(1)} x ${h.toFixed(1)}`)
        .toBe(true);
    }
  }
  test.info().annotations.push({ type: 'case floor', description: report.join('; ') });
}

async function expectCls(page: Page): Promise<void> {
  const cls = await observeLayoutShift(page);
  await openGallery(page);
  await expect(page.locator('[data-stamp]')).toHaveText(TEST_STAMP);
  const measured = await cls();
  test.info().annotations.push({ type: 'cls', description: JSON.stringify(measured) });
  expect(measured.value, `CLS to ready on ${project()}`).toBeLessThanOrEqual(CLS_BUDGET);
}

test.describe('phone layout', () => {
  test.describe.configure({ timeout: 180_000 });

  test('every stop: card clear of the HUD and the case, 44 px targets', async ({ page }) => {
    test.skip(!PHONES.includes(project()), 'pixel7 and pixel7-landscape');
    await openGallery(page);
    await expectStopsClear(page);
  });

  test('CLS from navigation to ready, with the ticket stamp', async ({ page }) => {
    test.skip(!PHONES.includes(project()), 'pixel7 and pixel7-landscape');
    await expectCls(page);
  });

  test('landscape: compact card, Medium and Caption hidden', async ({ page }) => {
    test.skip(project() !== 'pixel7-landscape', 'pixel7-landscape only');
    await openGallery(page);
    for (const id of ['verafin', 'wailo'] as const) {
      await goToStop(page, id);
      const card = page.getByTestId(TEST_IDS.card(id));
      const box = (await card.boundingBox())!;
      expect(Math.round(box.width), `${id}: card width`).toBe(300);
      const shown = await card.evaluate((el) =>
        [...el.querySelectorAll('p')]
          .filter((p) => /^Medium|^.{20,}$/.test(p.textContent ?? ''))
          .filter((p) => p.checkVisibility())
          .map((p) => p.textContent),
      );
      const caption = entryById(content, id).exhibit.caption;
      expect(
        shown.some((t) => t?.startsWith('Medium')),
        `${id}: Medium hidden`,
      ).toBe(false);
      expect(shown.includes(caption), `${id}: caption hidden`).toBe(false);
    }
  });

  test.describe('360 x 640', () => {
    test.use({ viewport: { width: 360, height: 640 } });

    test('360 x 640: every stop: card clear of the HUD and the case, 44 px targets', async ({
      page,
    }) => {
      test.skip(project() !== 'pixel7', 'pixel7 only (360 x 640 context)');
      await openGallery(page);
      await expectStopsClear(page);
    });

    test('360 x 640: CLS from navigation to ready, with the ticket stamp', async ({ page }) => {
      test.skip(project() !== 'pixel7', 'pixel7 only (360 x 640 context)');
      await expectCls(page);
    });
  });
});

test.describe('onboarding', () => {
  test('the ticket stamp is the frozen test date and keeps its prerendered width', async ({
    page,
  }) => {
    test.skip(project() !== 'pixel7', 'pixel7 only');
    await page.goto(museumUrl('/'));
    const stamp = page.locator('[data-stamp]');
    await expect(stamp).toHaveText(TEST_STAMP);
    const ssr = await page.request.get(museumUrl('/'));
    const html = await ssr.text();
    expect(html, 'the prerendered stamp is empty').toMatch(/data-stamp=""[^>]*><\/span>/);
    await expect(page.getByTestId(TEST_IDS.beginWalk)).toHaveAccessibleName('Begin the walk');
  });

  test('the ticket tears on click and the walk begins', async ({ page }) => {
    test.skip(project() !== 'pixel7', 'pixel7 only');
    await openGallery(page);
    const begin = page.getByTestId(TEST_IDS.beginWalk);
    await begin.tap();
    await expect(begin).toHaveAttribute('data-torn', '');
    await page.waitForFunction(() => window.__MUSEUM__?.stop === 'verafin');
  });

  test.describe('reduced motion', () => {
    test('no tear; the classic-view chip shows once and stays dismissed', async ({ page }) => {
      test.skip(project() !== 'pixel7', 'pixel7 only');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await openGallery(page);
      const chip = page.locator('[data-chip="reduced-motion"]');
      await expect(chip).toBeVisible();
      await expect(chip).toContainText('Prefer a quick read? Open the classic view.');
      await expect(chip.getByRole('link', { name: 'Open the classic view.' })).toHaveAttribute(
        'href',
        /\/resume\//,
      );
      const box = (await chip.boundingBox())!;
      const { width, height } = page.viewportSize()!;
      expect(box.x >= 0 && box.x + box.width <= width && box.y + box.height <= height).toBe(true);
      for (const h of await hudRects(page))
        expect(
          intersects(
            { left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height },
            h,
          ),
          `chip meets ${h.what}`,
        ).toBe(false);

      const begin = page.getByTestId(TEST_IDS.beginWalk);
      const stub = begin.locator('[data-stub]');
      await begin.tap();
      expect(await stub.evaluate((el) => el.getAnimations().length), 'no tear animation').toBe(0);
      await page.waitForFunction(() => window.__MUSEUM__?.stop === 'verafin');

      await goToStop(page, 'lobby');
      await chip.getByRole('button', { name: 'Close', exact: true }).tap();
      await expect(chip).toHaveCount(0);
      await openGallery(page);
      await page.waitForTimeout(300);
      await expect(chip).toHaveCount(0);
    });
  });

  test('no classic-view chip without reduced motion', async ({ page }) => {
    test.skip(project() !== 'pixel7', 'pixel7 only');
    await openGallery(page);
    await page.waitForTimeout(300);
    await expect(page.locator('[data-chip="reduced-motion"]')).toHaveCount(0);
  });
});

// F-046 (G3): on the desktop rail no year tick line crosses a stop dot (9 px) or its door stub.
test.describe('desktop rail', () => {
  test('F-046: year ticks clear the stop dots', async ({ page }) => {
    test.skip(project() !== 'desktop', 'desktop only');
    await openGallery(page);
    const { ticks, dots } = await page.evaluate((rail) => {
      const nav = document.querySelector(`[data-testid="${rail}"]`)!;
      const center = (el: Element) => {
        const r = el.getBoundingClientRect();
        return { y: (r.top + r.bottom) / 2, text: el.textContent ?? '' };
      };
      return {
        ticks: [...nav.querySelectorAll('span[aria-hidden="true"]')]
          .filter((el) => /^\d{4}$/.test(el.textContent ?? ''))
          .map(center),
        dots: [...nav.querySelectorAll('button[data-testid^="hud-stop-"]')].map((el) => ({
          ...center(el),
          text: el.getAttribute('data-testid') ?? '',
        })),
      };
    }, TEST_IDS.hudProgress);
    expect(ticks.length, 'year ticks').toBeGreaterThan(0);
    for (const t of ticks)
      for (const d of dots)
        expect
          .soft(Math.abs(t.y - d.y), `tick ${t.text} against ${d.text}`)
          .toBeGreaterThanOrEqual(6);
  });
});
