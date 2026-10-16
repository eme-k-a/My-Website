// Native scroll input on the rail (WP-09; ARCHITECTURE §6.1 to §6.3, §6.8; EXPERIENCE §3.6, §6.4;
// PLAN Addendum "Keyboard stepping"). R8 owns this spec after the merge.
// (a) a 40-event decaying wheel stream and (b) three 100 px notches settle on a whole stop with no
// skipped index; (c) one Pixel 7 flick moves exactly one stop, and the tall lobby (F-008) scrolls
// through its intro before the next swipe lands exactly on the next stop; (d) no non-passive
// wheel or touch listener; (e) walking every main stop writes no history: the HUD dots here, the
// keys in (f); (f) ArrowDown and PageDown each visit every main stop in order and back, writing no
// history.
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import type { StopId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { mainTrack } from '../../src/content/selectors';
import { expect, test } from './fixtures';
import {
  cdpFlick,
  countHistoryWrites,
  goToStop,
  listenerAudit,
  museumUrl,
  waitForMuseum,
  wheelNotches,
  wheelStream,
} from './helpers';

const MAIN: StopId[] = mainTrack(content);
const project = () => test.info().project.name;
const only = (name: string) => test.skip(project() !== name, `the ${name} project only`);

interface Rest {
  scrollY: number;
  stop: StopId;
  settled: boolean;
  /** stopY of every section of the active track (ARCHITECTURE §6.2), measured in the page. */
  stopY: number[];
  ids: StopId[];
}

interface RestOptions {
  /** The scroll position before the input: first wait up to `startMs` for the page to leave it. */
  from?: number;
  startMs?: number;
  quietMs?: number;
  timeoutMs?: number;
}

/**
 * The page at rest: the scroll position and the hook unchanged for `quietMs`, and settled. With
 * `from`, it first waits for the scroll to leave that position (SwiftShader renders a few frames
 * per second, so a smooth scroll can start late); an input that never moves the page times out
 * of that phase quietly and is then measured where it is.
 */
async function waitForRest(page: Page, opts: RestOptions = {}): Promise<Rest> {
  const { from, startMs = 4_000, quietMs = 700, timeoutMs = 30_000 } = opts;
  if (from !== undefined) {
    await page
      .waitForFunction((y) => Math.abs(window.scrollY - y) > 1, from, { timeout: startMs })
      .catch(() => {});
  }
  const deadline = Date.now() + timeoutMs;
  let last = '';
  let since = Date.now();
  for (;;) {
    const now = await page.evaluate(() => {
      const hook = window.__MUSEUM__!;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const sections = [...document.querySelectorAll<HTMLElement>('section[data-stop]')].filter(
        (s) => s.getClientRects().length > 0,
      );
      return {
        scrollY: window.scrollY,
        stop: hook.stop,
        settled: hook.settled,
        ids: sections.map((s) => s.dataset.stop as StopId),
        stopY: sections.map((s) =>
          Math.min(s.getBoundingClientRect().top + window.scrollY, Math.max(0, max)),
        ),
      };
    });
    const key = `${now.scrollY}|${now.stop}|${now.settled}`;
    if (key !== last) {
      last = key;
      since = Date.now();
    } else if (now.settled && Date.now() - since >= quietMs) {
      return now;
    }
    if (Date.now() > deadline) throw new Error(`no rest within ${timeoutMs} ms: ${key}`);
    await page.waitForTimeout(50);
  }
}

/** Asserts a whole stop: settled, and scrollY within 2 px of that stop's section position. */
function expectWholeStop(rest: Rest, label: string): number {
  const index = rest.ids.indexOf(rest.stop);
  expect(rest.settled, `${label}: settled`).toBe(true);
  expect(index, `${label}: ${rest.stop} is on the active track`).toBeGreaterThanOrEqual(0);
  expect(
    Math.abs(rest.scrollY - rest.stopY[index]!),
    `${label}: scrollY ${rest.scrollY} is at ${rest.stop} (${rest.stopY[index]})`,
  ).toBeLessThanOrEqual(2);
  return MAIN.indexOf(rest.stop);
}

/** Records `__MUSEUM__.stop` every 20 ms in the page; returns a reader of the distinct sequence. */
async function recordStops(page: Page): Promise<() => Promise<StopId[]>> {
  await page.evaluate(() => {
    const seen: string[] = [];
    (window as { __STOPS__?: string[] }).__STOPS__ = seen;
    window.setInterval(() => {
      const stop = window.__MUSEUM__?.stop;
      if (stop && seen.at(-1) !== stop) seen.push(stop);
    }, 20);
  });
  return () =>
    page.evaluate(() => ((window as { __STOPS__?: string[] }).__STOPS__ ?? []) as StopId[]);
}

function expectNoSkip(stops: StopId[], label: string): void {
  const indices = stops.map((id) => MAIN.indexOf(id));
  for (let i = 1; i < indices.length; i++) {
    expect(Math.abs(indices[i]! - indices[i - 1]!), `${label}: ${stops.join(' > ')}`).toBe(1);
  }
}

async function openGallery(page: Page): Promise<Rest> {
  await page.goto(museumUrl('/'));
  await waitForMuseum(page);
  const rest = await waitForRest(page);
  expect(rest.stop).toBe('lobby');
  return rest;
}

/** Milliseconds from each press to its rest in the running test (logged to size the timeout). */
const arrivals: number[] = [];

/**
 * Presses `key` and returns where the page comes to rest. A key always moves the page, so the
 * start phase may be long: in CI run 31 a press took more than 4 s to move it (frames of about
 * 2 s with two workers), and (f) measured its rest at the stop it had not left yet.
 */
async function press(page: Page, key: string): Promise<Rest> {
  const from = await page.evaluate(() => window.scrollY);
  const start = Date.now();
  await page.keyboard.press(key);
  const rest = await waitForRest(page, { from, startMs: 15_000 });
  arrivals.push(Date.now() - start);
  return rest;
}

/** Logs the arrival times of a walk: the CI log is where the walk timeout below is measured. */
function logArrivals(label: string): void {
  const total = arrivals.reduce((sum, ms) => sum + ms, 0);
  console.log(
    `${label}: ${arrivals.length} arrivals, ${Math.round(total / 1000)} s, ` +
      `mean ${Math.round(total / Math.max(1, arrivals.length))} ms, max ${Math.max(0, ...arrivals)} ms`,
  );
}

test.describe('rail input', () => {
  // SwiftShader draws the gallery at a few frames per second, and every walk waits for settling.
  // The 18-arrival walks of (f) set the limit. CI run 31 (F-014 rig, two workers): a keyboard
  // arrival took 10.9 s on average and 12.8 s at most, so (f) needs about 220 s with its load;
  // before F-014 an arrival took about 19 frames and these walks ran past 180 s. 300 s.
  test.describe.configure({ timeout: 300_000 });
  test.beforeEach(() => {
    arrivals.length = 0;
  });

  test('(a) a decaying wheel stream settles on a whole stop without skipping', async ({ page }) => {
    only('desktop');
    await openGallery(page);
    const stops = await recordStops(page);
    const total = await wheelStream(page);
    const rest = await waitForRest(page);
    const index = expectWholeStop(rest, 'after the stream');
    const sequence = await stops();
    expectNoSkip(sequence, 'stream');
    test.info().annotations.push({
      type: 'wheel stream',
      description: `${Math.round(total)} px in 40 events: rest at ${rest.stop} (index ${index}), scrollY ${rest.scrollY}, stops ${sequence.join(' > ')}`,
    });
  });

  test('(b) three 100 px wheel notches each settle on a whole stop', async ({ page }) => {
    only('desktop');
    await openGallery(page);
    const stops = await recordStops(page);
    const landed: string[] = [];
    for (let notch = 1; notch <= 3; notch++) {
      const from = await page.evaluate(() => window.scrollY);
      await wheelNotches(page, { count: 1, delta: 100 });
      const rest = await waitForRest(page, { from, startMs: 1_500 });
      expectWholeStop(rest, `notch ${notch}`);
      landed.push(`${rest.stop}@${rest.scrollY}`);
      await page.waitForTimeout(400);
    }
    expectNoSkip(await stops(), 'notches');
    test.info().annotations.push({ type: 'notches', description: landed.join(', ') });
  });

  test('(c) one flick moves exactly one stop', async ({ page }) => {
    only('pixel7');
    await openGallery(page);
    const height = page.viewportSize()!.height;
    await goToStop(page, 'verafin');
    let rest = await waitForRest(page);
    for (const expected of ['projects-door', 'mysa'] as const) {
      const from = MAIN.indexOf(rest.stop);
      await cdpFlick(page, { dy: Math.round(height * 0.6) });
      rest = await waitForRest(page, { from: rest.scrollY });
      const index = expectWholeStop(rest, `flick from ${MAIN[from]}`);
      expect(index, 'exactly one stop').toBe(from + 1);
      expect(rest.stop).toBe(expected);
    }
  });

  test('(c) the tall lobby scrolls to its intro, then the next swipe lands on the next stop', async ({
    page,
  }) => {
    only('pixel7');
    const start = await openGallery(page);
    const height = page.viewportSize()!.height;
    const lobby = page.getByTestId(TEST_IDS.stop('lobby'));
    const lobbyHeight = (await lobby.boundingBox())!.height;
    expect(lobbyHeight, 'the lobby is taller than the viewport (F-008)').toBeGreaterThan(height);
    const intro = page.getByTestId(TEST_IDS.hero).getByText(content.gallery.lobby.intro.text);
    await expect(intro).not.toBeInViewport({ ratio: 1 });

    // Mandatory snapping still scrolls through a section taller than the viewport.
    await cdpFlick(page, { dy: Math.round(height * 0.6) });
    let rest = await waitForRest(page, { from: 0 });
    expect(rest.stop, 'still the lobby while its intro scrolls by').toBe('lobby');
    expect(
      Math.abs(rest.scrollY - (lobbyHeight - height)),
      `scrollY ${rest.scrollY} is the end of the lobby`,
    ).toBeLessThanOrEqual(2);
    await expect(intro).toBeInViewport({ ratio: 1 });

    // The next swipe lands exactly on the next stop.
    await cdpFlick(page, { dy: Math.round(height * 0.6) });
    rest = await waitForRest(page, { from: rest.scrollY });
    expect(expectWholeStop(rest, 'swipe after the lobby end')).toBe(1);
    expect(rest.stop).toBe(MAIN[1]);
    expect(Math.abs(rest.scrollY - start.stopY[1]!)).toBeLessThanOrEqual(2);
  });

  test('(d) no non-passive wheel or touch listeners', async ({ page }) => {
    test.skip(!['desktop', 'pixel7'].includes(project()), 'desktop and pixel7');
    // Only page.evaluate before the audit: Playwright's injected script (created by locators and
    // waitForFunction) adds its own non-passive capture listeners to window, touchstart included
    // (hit-target interceptors), which are not the site's.
    await page.goto(museumUrl('/'));
    const deadline = Date.now() + 30_000;
    while (!(await page.evaluate(() => window.__MUSEUM__?.ready === true))) {
      if (Date.now() > deadline) throw new Error('the museum never became ready');
      await page.waitForTimeout(100);
    }
    expect(await page.evaluate(() => document.querySelectorAll('canvas').length)).toBe(1);
    expect(await listenerAudit(page)).toEqual([]);
    // Still none after travel along the aisle and into a wing.
    await page.evaluate(() => window.__MUSEUM__!.goTo('verafin', { instant: true }));
    await page.evaluate(() => window.__MUSEUM__!.goTo('klarup', { instant: true }));
    expect(await listenerAudit(page)).toEqual([]);
  });

  test('(e) walking every main stop never writes history', async ({ page }) => {
    only('desktop');
    const writes = await countHistoryWrites(page);
    await openGallery(page);
    const length = await page.evaluate(() => history.length);
    // The keyboard walks of (f) check the same history rules on every step, down and back, so
    // this walk starts at the desk and comes back with the progress rail's dots (HUD travel).
    // (F-M2: walking down with ArrowDown here too doubled (f) and cost 98 s in CI run 31.)
    await goToStop(page, 'desk');
    for (const id of [...MAIN].reverse().slice(1)) {
      const start = Date.now();
      await page.getByTestId(TEST_IDS.hudStop(id)).click();
      await page.waitForFunction(
        (stop) => window.__MUSEUM__?.settled === true && window.__MUSEUM__.stop === stop,
        id,
      );
      arrivals.push(Date.now() - start);
    }
    logArrivals('rail-input (e) HUD walk');
    expect(await writes()).toEqual({ push: 0, replace: 0, calls: [] });
    expect(await page.evaluate(() => history.length)).toBe(length);
    expect(new URL(page.url()).pathname).toBe('/');
  });

  for (const key of ['ArrowDown', 'PageDown'] as const) {
    test(`(f) ${key} visits every main stop in order`, async ({ page }) => {
      only('desktop');
      const writes = await countHistoryWrites(page);
      await openGallery(page);
      const length = await page.evaluate(() => history.length);
      const visited: StopId[] = ['lobby'];
      for (let i = 1; i < MAIN.length; i++) {
        const rest = await press(page, key);
        expectWholeStop(rest, `${key} ${i}`);
        visited.push(rest.stop);
      }
      expect(visited).toEqual(MAIN);
      // Back up with the opposite key, one stop per press.
      const up = key === 'ArrowDown' ? 'ArrowUp' : 'PageUp';
      const back: StopId[] = [];
      for (let i = MAIN.length - 2; i >= 0; i--) back.push((await press(page, up)).stop);
      logArrivals(`rail-input (f) ${key} and back`);
      expect(back).toEqual([...MAIN].reverse().slice(1));
      // (e): stop arrivals never write history.
      expect(await writes()).toEqual({ push: 0, replace: 0, calls: [] });
      expect(await page.evaluate(() => history.length)).toBe(length);
      expect(new URL(page.url()).pathname).toBe('/');
    });
  }

  test('(f) ArrowDown twice lands on projects-door, three times on mysa', async ({ page }) => {
    only('desktop');
    await openGallery(page);
    // Two quick presses: the second counts from the first one's target.
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.waitForFunction(() => window.scrollY > 0);
    expect((await waitForRest(page)).stop).toBe('projects-door');
    expect((await press(page, 'ArrowDown')).stop).toBe('mysa');
    expect((await press(page, 'End')).stop).toBe('desk');
    expect((await press(page, 'Home')).stop).toBe('lobby');
  });
});
