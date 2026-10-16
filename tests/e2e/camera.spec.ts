// Camera feel (WP-15; EXPERIENCE §6.2 to §6.6, §6.11, §8.3, §10.3, §10.6; ARCHITECTURE §6.4,
// §6.5). R8 owns this spec after the merge.
// (a) under emulated reduced motion, 30 Hz samples of the camera during a scroll from verafin to
// mysa are all stop poses; (b) at every settled main exhibit the case's screen position is at 62%
// of the width (desktop) or 36% of the height (pixel7); (c) a wheel walk announces nothing, and
// keyboard moves announce exactly once per arrival with the EXPERIENCE §8.4 wording; (d) the
// onboarding hint shows at the lobby and hides at verafin; (e) no parallax under ?test=1.
import type { Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { TEST_IDS } from '../../src/app/testIds';
import { EXHIBIT_IDS, type ExhibitId, type StopId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { mainTrack, stopCards } from '../../src/content/selectors';
import { tokens } from '../../src/design/tokens';
import { hitBox, slotMatrix, slotVariant } from '../../src/museum/exhibits/_kit/anatomy';
import { fovFor } from '../../src/museum/rail/framing';
import { computeLayout } from '../../src/museum/rail/layout';
import { expect, test } from './fixtures';
import { cdpFlick, goToStop, museumUrl, screenPosOf, stats, waitForMuseum } from './helpers';

const MAIN: StopId[] = mainTrack(content);
const isExhibit = (id: StopId): id is ExhibitId => (EXHIBIT_IDS as readonly string[]).includes(id);
const MAIN_EXHIBITS: ExhibitId[] = MAIN.filter(isExhibit);
/** Slot positions do not depend on the date. */
const LAYOUT = computeLayout(content, new Date());

type Vec3 = [number, number, number];
interface ScreenPoint {
  x: number;
  y: number;
}

/** World center of an exhibit's hit box (what `screenPos` projects): plinth and case. */
function hitCenter(id: ExhibitId): Vector3 {
  const slot = LAYOUT.slots.find((s) => s.id === id)!;
  return new Vector3(...hitBox(slotVariant(slot)).center).applyMatrix4(slotMatrix(slot));
}

/**
 * Where `point` lands (fractions of the view) through a camera at `position` looking at `target`
 * with the EXPERIENCE §6.2 FOV and no projection shift. The look-at point itself lands at the
 * center; a projection shift moves every point by the same amount.
 */
function unshifted(position: Vec3, target: Vec3, aspect: number, point: Vector3): ScreenPoint {
  const camera = new PerspectiveCamera(fovFor(aspect), aspect, 0.1, 90);
  camera.position.set(...position);
  camera.lookAt(new Vector3(...target));
  camera.updateMatrixWorld();
  const ndc = point.clone().project(camera);
  return { x: (ndc.x + 1) / 2, y: (1 - ndc.y) / 2 };
}

const project = () => test.info().project.name;
const only = (...names: string[]) =>
  test.skip(!names.includes(project()), `the ${names.join(' and ')} projects only`);

async function openGallery(page: Page): Promise<void> {
  await page.goto(museumUrl('/'));
  await waitForMuseum(page);
}

/** Waits until the hook reports settled at `id`. */
async function settledAt(page: Page, id: StopId, timeout = 30_000): Promise<void> {
  await page.waitForFunction(
    (stop) => window.__MUSEUM__?.settled === true && window.__MUSEUM__.stop === stop,
    id,
    { timeout },
  );
}

interface Sample {
  scrollY: number;
  position: Vec3;
}

declare global {
  interface Window {
    __CAMERA_SAMPLES__?: Sample[];
    __CAMERA_SAMPLER__?: number;
  }
}

/** Samples `stats().camera.position` and the scroll position at 30 Hz in the page. */
async function startSampling(page: Page): Promise<() => Promise<Sample[]>> {
  await page.evaluate(() => {
    const samples: Sample[] = [];
    window.__CAMERA_SAMPLES__ = samples;
    window.__CAMERA_SAMPLER__ = window.setInterval(() => {
      const hook = window.__MUSEUM__;
      if (hook) samples.push({ scrollY: window.scrollY, position: hook.stats().camera.position });
    }, 1000 / 30);
  });
  return () =>
    page.evaluate(() => {
      window.clearInterval(window.__CAMERA_SAMPLER__);
      return window.__CAMERA_SAMPLES__ ?? [];
    });
}

declare global {
  interface Window {
    __ANNOUNCED__?: string[];
  }
}

/** Records every non-empty text the live region shows, in order. */
async function recordAnnouncements(page: Page): Promise<() => Promise<string[]>> {
  await page.evaluate((testId) => {
    const region = document.querySelector(`[data-testid="${testId}"]`)!;
    const seen: string[] = [];
    window.__ANNOUNCED__ = seen;
    new MutationObserver(() => {
      const text = region.textContent?.trim() ?? '';
      if (text !== '' && seen.at(-1) !== text) seen.push(text);
    }).observe(region, { childList: true, characterData: true, subtree: true });
  }, TEST_IDS.liveRegion);
  return () => page.evaluate(() => window.__ANNOUNCED__ ?? []);
}

/** Waits until the page is settled and its scroll position and stop held still for `quietMs`. */
async function waitForRest(page: Page, quietMs = 700, timeoutMs = 30_000): Promise<StopId> {
  const deadline = Date.now() + timeoutMs;
  let last = '';
  let since = Date.now();
  for (;;) {
    const now = await page.evaluate(() => ({
      y: window.scrollY,
      stop: window.__MUSEUM__!.stop,
      settled: window.__MUSEUM__!.settled,
    }));
    const key = `${now.y}|${now.stop}|${now.settled}`;
    if (key !== last) {
      last = key;
      since = Date.now();
    } else if (now.settled && Date.now() - since >= quietMs) {
      return now.stop;
    }
    if (Date.now() > deadline) throw new Error(`no rest within ${timeoutMs} ms: ${key}`);
    await page.waitForTimeout(50);
  }
}

/** The EXPERIENCE §8.4 exhibit row for today's content: number, title, role, organization, dates. */
function exhibitRow(id: ExhibitId): string {
  const card = stopCards(content, new Date()).find((c) => c.id === id);
  if (card?.kind !== 'exhibit') throw new Error(`No exhibit card for ${id}`);
  const details = [card.role, card.organization, card.dates].filter(Boolean).join(', ');
  return `${card.numberLabel}, ${card.title}. ${details}.`;
}

/** The scroll position of a stop's section in the page. */
const stopY = (page: Page, id: StopId): Promise<number> =>
  page.evaluate(
    (stop) => document.getElementById(`stop-${stop}`)!.getBoundingClientRect().top + window.scrollY,
    id,
  );

test.describe('camera feel', () => {
  // SwiftShader draws the gallery at a few frames per second, and every walk waits for settling.
  test.describe.configure({ timeout: 180_000 });

  test('(a) reduced motion: 30 Hz camera samples during a scroll are only stop poses', async ({
    page,
  }) => {
    only('desktop', 'pixel7');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openGallery(page);
    await goToStop(page, 'verafin');
    const from = await stopY(page, 'verafin');
    const to = await stopY(page, 'mysa');
    const stop = await startSampling(page);
    if (project() === 'desktop') {
      // A slow scroll in 30 steps through the projects door's section.
      for (let i = 1; i <= 30; i++) {
        await page.evaluate(
          (y) => window.scrollTo({ top: y, behavior: 'instant' }),
          from + ((to - from) * i) / 30,
        );
        await page.waitForTimeout(33);
      }
    } else {
      // Two flicks (one stop each under mandatory snapping): verafin, the door, mysa.
      const height = page.viewportSize()!.height;
      await cdpFlick(page, { dy: Math.round(height * 0.6) });
      await settledAt(page, 'projects-door');
      await cdpFlick(page, { dy: Math.round(height * 0.6) });
    }
    await settledAt(page, 'mysa');
    await page.waitForTimeout(300);
    const samples = await stop();
    const poses = LAYOUT.tracks.main.stops.map((s) => s.camera);
    const nearest = (p: Vec3) =>
      Math.min(...poses.map((q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])));
    expect(samples.length, 'samples taken').toBeGreaterThan(10);
    // The scroll really passed positions between the stops.
    const between = samples.filter(
      (s) =>
        s.scrollY > from + 2 && s.scrollY < to - 2 && Math.abs(s.scrollY - (from + to) / 2) > 2,
    );
    expect(between.length, 'samples taken mid-scroll').toBeGreaterThan(0);
    const worst = Math.max(...samples.map((s) => nearest(s.position)));
    expect(worst, 'farthest sample from a stop pose, in meters').toBeLessThanOrEqual(0.001);
    test.info().annotations.push({
      type: 'reduced motion',
      description: `${samples.length} samples, ${between.length} mid-scroll, worst ${worst.toExponential(2)} m`,
    });
  });

  test('(b) every settled main exhibit is framed at 62% of the width or 36% of the height', async ({
    page,
  }) => {
    only('desktop', 'pixel7');
    await openGallery(page);
    const box = (await page.getByTestId(TEST_IDS.stage).locator('canvas').boundingBox())!;
    const aspect = box.width / box.height;
    const desktop = project() === 'desktop';
    const want = desktop
      ? { x: tokens.camera.framingDesktopX, y: 0.5 }
      : { x: 0.5, y: tokens.camera.framingPortraitY };
    const found: string[] = [];
    for (const id of MAIN_EXHIBITS) {
      await goToStop(page, id);
      const at = await screenPosOf(page, id);
      expect(at, `${id} is on screen`).not.toBeNull();
      const hit = { x: (at!.x - box.x) / box.width, y: (at!.y - box.y) / box.height };
      // screenPos is the hit-box center (ARCHITECTURE §13.3), which covers plinth and case
      // (EXPERIENCE §5.6), so it sits below the case. The look-at point is the case center: it
      // lands where the hit-box center lands, minus their offset through the unshifted camera.
      const { position, target } = (await stats(page)).camera;
      const offset = unshifted(position, target, aspect, hitCenter(id));
      const look = { x: hit.x - (offset.x - 0.5), y: hit.y - (offset.y - 0.5) };
      found.push(
        `${id} case ${(look.x * 100).toFixed(1)}% x ${(look.y * 100).toFixed(1)}%, ` +
          `hit box ${(hit.x * 100).toFixed(1)}% x ${(hit.y * 100).toFixed(1)}%`,
      );
      expect(Math.abs(look.x - want.x), `${id}: case x ${look.x}`).toBeLessThanOrEqual(0.03);
      expect(Math.abs(look.y - want.y), `${id}: case y ${look.y}`).toBeLessThanOrEqual(0.03);
      // Desktop (EXPERIENCE §6.11): screenPos itself at 62% of the width (the hit box shares the
      // case's x).
      if (desktop) expect(Math.abs(hit.x - want.x), `${id}: x ${hit.x}`).toBeLessThanOrEqual(0.03);
    }
    test.info().annotations.push({ type: 'framing', description: found.join('; ') });
  });

  test('(c) a wheel walk announces nothing; each ArrowDown arrival is announced once', async ({
    page,
  }) => {
    only('desktop');
    await openGallery(page);
    expect(await waitForRest(page)).toBe('lobby');
    let announced = await recordAnnouncements(page);
    const viewport = page.viewportSize()!;
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    // Proximity snapping needs more than half a viewport per wheel gesture to leave a stop.
    const goal = MAIN.indexOf('wailo');
    const path: string[] = [];
    for (let i = 0; i < 20; i++) {
      const index = MAIN.indexOf(await waitForRest(page));
      if (index === goal) break;
      await page.mouse.wheel(0, index < goal ? 600 : -600);
      await page.waitForTimeout(300);
      path.push(MAIN[index]!);
    }
    expect(await waitForRest(page)).toBe('wailo');
    expect(await announced(), `wheel walk ${path.join(' > ')}`).toEqual([]);
    await expect(page.getByTestId(TEST_IDS.liveRegion)).toHaveText('');

    // ArrowDown from the lobby: verafin, the projects door, mysa (PLAN Addendum).
    await openGallery(page);
    expect(await waitForRest(page)).toBe('lobby');
    announced = await recordAnnouncements(page);
    const arrived: StopId[] = [];
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('ArrowDown');
      await page.waitForFunction(
        (stop) => window.__MUSEUM__?.stop !== stop,
        arrived.at(-1) ?? 'lobby',
      );
      arrived.push(await waitForRest(page));
    }
    expect(arrived).toEqual(['verafin', 'projects-door', 'mysa']);
    await expect.poll(announced).toHaveLength(3);
    expect(await announced()).toEqual([
      exhibitRow('verafin'),
      'Projects wing door. Press Enter to step inside, or keep scrolling.',
      'No. 02, Warm Start. Full Stack Software Developer (Co-op), Mysa, Jan 2026 \u2013 May 2026.',
    ]);
  });

  test('(d) the onboarding hint shows at the lobby and hides at verafin', async ({ page }) => {
    only('desktop', 'pixel7');
    await openGallery(page);
    const hint = page.getByTestId(TEST_IDS.onboardingHint);
    await expect(hint).toBeVisible();
    if (project() === 'desktop') {
      await expect(hint.getByText('Scroll to walk through my work')).toBeVisible();
      await expect(hint.getByText('Swipe up to walk')).toBeHidden();
      await expect(hint).toHaveAttribute('data-variant', 'fine');
    } else {
      await expect(hint).toHaveAttribute('data-variant', 'coarse');
    }
    await goToStop(page, 'verafin');
    await expect(hint).toBeHidden();
  });

  test('(e) no parallax under ?test=1: the camera target ignores the pointer', async ({ page }) => {
    only('desktop');
    await openGallery(page);
    await goToStop(page, 'verafin');
    const before = (await stats(page)).camera;
    const viewport = page.viewportSize()!;
    for (const [x, y] of [
      [5, 5],
      [viewport.width - 5, viewport.height - 5],
      [viewport.width - 5, 5],
    ] as const) {
      await page.mouse.move(x, y, { steps: 4 });
    }
    // Long enough for a 0.4 s damping to show, even at a few frames per second.
    await page.waitForTimeout(1_000);
    const after = (await stats(page)).camera;
    after.target.forEach((v, i) => expect(v).toBeCloseTo(before.target[i]!, 6));
    after.position.forEach((v, i) => expect(v).toBeCloseTo(before.position[i]!, 6));
  });
});
