// Native scroll input on the rail (WP-09; ARCHITECTURE §6.1 to §6.3, §6.8; EXPERIENCE §3.6, §6.4;
// PLAN Addendum "Keyboard stepping"). R8 owns this spec after the merge.
// (a) a 40-event decaying wheel stream and (b) three 100 px notches settle on a whole stop with no
// skipped index; (c) one Pixel 7 flick moves exactly one stop, and the tall lobby (F-008) scrolls
// through its intro before the next swipe lands exactly on the next stop; (d) no non-passive
// wheel or touch listener; (e) walking every main stop writes no history: the HUD dots here, the
// keys in (f); (f) ArrowDown and PageDown each visit every main stop in order and back, writing no
// history; (g) at the wing stops on desktop, Pixel 7 and 360 x 640 no rail text (stop label, wing
// chip, exit control) overlaps the stop's own 3D wall title (F-036, F-039); and at each door reached on the wing track (Step
// inside, then ArrowUp once) no visible rail or HUD rect covers the door's transom title, on
// desktop and pixel7 (F-038).
import type { Page } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { TEST_IDS } from '../../src/app/testIds';
import { doorId, type ExhibitId, type StopId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { entryById, exhibitNumber, mainTrack, wallLabelOf } from '../../src/content/selectors';
import { applyFraming, fovFor, framingFor, viewOffsetFor } from '../../src/museum/rail/framing';
import { DOOR_TRANSOM, labelPlacements } from '../../src/museum/environment/labels3d';
import {
  CAP_HEIGHT_RATIO,
  ORGANIZATION_LINE_HEIGHT,
  ORGANIZATION_TRACKING,
  SANS_CAPS_ADVANCE,
  SERIF_NUMBER_ADVANCE,
  TITLE_END_MARGIN,
  TITLE_METRICS,
} from '../../src/museum/exhibits/_kit/titleMetrics';
import { hitBox, PLINTH_SIZE } from '../../src/museum/exhibits/_kit/anatomy';
import { computeLayout, DOOR_H, DOOR_W } from '../../src/museum/rail/layout';
import { expect, test } from './fixtures';
import {
  cdpFlick,
  countHistoryWrites,
  goToStop,
  listenerAudit,
  museumUrl,
  stats,
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

/** Slot positions and rooms do not depend on the date. */
const LAYOUT = computeLayout(content, new Date());

/**
 * The wing wall-title metrics placard.ts places the titles with (_kit/titleMetrics.ts, which
 * imports no font file, so Node loads it); the boxes carry a margin for the width estimate.
 */
const WING_TITLE = TITLE_METRICS.wing;
const SANS_CAP_RATIO = CAP_HEIGHT_RATIO.sans;
const SERIF_CAP_RATIO = CAP_HEIGHT_RATIO.serif;
const SANS_EM = SANS_CAPS_ADVANCE + ORGANIZATION_TRACKING;
const SERIF_EM = SERIF_NUMBER_ADVANCE;
const LINE_HEIGHT = ORGANIZATION_LINE_HEIGHT;
const MARGIN_PX = 6;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** The wall title's two blocks (number, organization) as world boxes on the wing's outer wall. */
function wingTitleBoxes(id: ExhibitId): WallBox[] {
  const slot = LAYOUT.slots.find((s) => s.id === id)!;
  const room = LAYOUT.rooms.find(
    (r) =>
      slot.position[0] >= r.min[0] &&
      slot.position[0] <= r.max[0] &&
      slot.position[2] >= r.min[1] &&
      slot.position[2] <= r.max[1],
  )!;
  const right = slot.side === 'right';
  const wallX = right ? room.max[0] - 0.01 : room.min[0] + 0.01;
  const orgSize = WING_TITLE.orgCap / SANS_CAP_RATIO;
  const lines: string[] = [];
  let line = '';
  for (const word of wallLabelOf(entryById(content, id)).toUpperCase().split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length * orgSize * SANS_EM > WING_TITLE.orgWidth) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  const orgHalf = Math.max(...lines.map((l) => l.length * orgSize * SANS_EM)) / 2;
  const numberSize = WING_TITLE.numberCap / SERIF_CAP_RATIO;
  const numberHalf = (exhibitNumber(content, id).length * numberSize * SERIF_EM) / 2;
  const half = Math.max(orgHalf, numberHalf);
  // Along the wall: the stop camera's sightline through the slot center, clamped to the wall.
  const camera = LAYOUT.tracks[slot.track]!.stops.find((s) => s.id === id)!.camera;
  const dx = slot.position[0] - camera[0];
  const sight = camera[2] + ((slot.position[2] - camera[2]) * (wallX - camera[0])) / dx;
  const lo = room.min[1] + TITLE_END_MARGIN + half;
  const hi = room.max[1] - TITLE_END_MARGIN - half;
  const along = Math.min(hi, Math.max(lo, sight));
  const orgTop =
    WING_TITLE.orgBottom + (lines.length - 1) * LINE_HEIGHT * orgSize + WING_TITLE.orgCap;
  const numberBase = orgTop + WING_TITLE.gap;
  return [
    { wallX, z: [along - orgHalf, along + orgHalf], y: [WING_TITLE.orgBottom - 0.05, orgTop] },
    {
      wallX,
      z: [along - numberHalf, along + numberHalf],
      y: [numberBase, numberBase + WING_TITLE.numberCap],
    },
  ];
}

/** A world box on a wall at x = `wallX`, spanning `z` along it and `y` up it. */
interface WallBox {
  wallX: number;
  z: [number, number];
  y: [number, number];
}

/**
 * The screen rects (CSS px) of a wing stop's wall title, as the live camera draws them (F-039):
 * projected with the plain framing, then moved by however far the live framing moves the stop's
 * hit-box center from there (`screenPos`, the real projection). A framing shift moves every point
 * on screen by the same amount, so this reads the real portrait wing framing without repeating it.
 */
async function wallTitleRects(page: Page, id: ExhibitId): Promise<Rect[]> {
  const slot = LAYOUT.slots.find((s) => s.id === id)!;
  const center = hitBox('standard').center;
  const hit = new Vector3(
    slot.position[0] + center[0],
    slot.position[1] + PLINTH_SIZE.standard[1] + center[1],
    slot.position[2] + center[2],
  );
  const live = await page.evaluate((stop) => window.__MUSEUM__!.screenPos(stop), id);
  expect(live, `${id}: screenPos`).not.toBeNull();
  return projectWallBoxes(page, wingTitleBoxes(id), { world: hit, screen: live! });
}

/**
 * The room name on a door's transom (src/museum/environment/labels3d.ts, F-022): one line centered
 * on the door, in the band from DOOR_H - DOOR_TRANSOM to DOOR_H, on the aisle wall. Its width is
 * the caps estimate of the wall titles, never wider than the door.
 */
function transomTitleBox(door: StopId): WallBox {
  const placement = labelPlacements(LAYOUT).find((p) => p.label.kind === 'room' && p.stop === door);
  if (!placement) throw new Error(`no room name on ${door}`);
  const { text, capHeight } = placement.label;
  const half = Math.min(DOOR_W, (text.length * capHeight * SANS_EM) / SANS_CAP_RATIO) / 2;
  const z = placement.position[2];
  return {
    wallX: placement.position[0],
    z: [z - half, z + half],
    y: [DOOR_H - DOOR_TRANSOM, DOOR_H],
  };
}

/**
 * Projects wall boxes through the live camera pose with the plain framing, to CSS px rects. With
 * an `anchor` (a world point and where the page draws it), the rects move by the anchor's offset.
 */
async function projectWallBoxes(
  page: Page,
  boxes: WallBox[],
  anchor?: { world: Vector3; screen: { x: number; y: number } },
): Promise<Rect[]> {
  const { width, height } = page.viewportSize()!;
  const aspect = width / height;
  const { position, target } = (await stats(page)).camera;
  const camera = new PerspectiveCamera(fovFor(aspect), aspect, 0.1, 90);
  camera.position.set(...position);
  camera.lookAt(new Vector3(...target));
  applyFraming(camera, fovFor(aspect), viewOffsetFor(framingFor(aspect)), width, height);
  camera.updateMatrixWorld();
  let dx = 0;
  let dy = 0;
  if (anchor) {
    const a = anchor.world.clone().project(camera);
    dx = anchor.screen.x - ((a.x + 1) / 2) * width;
    dy = anchor.screen.y - ((1 - a.y) / 2) * height;
  }
  return boxes.map(({ wallX, z, y }) => {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const zz of z)
      for (const yy of y) {
        const p = new Vector3(wallX, yy, zz).project(camera);
        xs.push(((p.x + 1) / 2) * width + dx);
        ys.push(((1 - p.y) / 2) * height + dy);
      }
    return {
      left: Math.min(...xs) - MARGIN_PX,
      right: Math.max(...xs) + MARGIN_PX,
      top: Math.min(...ys) - MARGIN_PX,
      bottom: Math.max(...ys) + MARGIN_PX,
    };
  });
}

/** Rects of the rail's visible text: stop labels not clipped away, the wing chip, the exit control. */
async function railTextRects(page: Page): Promise<(Rect & { text: string })[]> {
  return page.evaluate(
    (ids) => {
      const rail = document.querySelector(`[data-testid="${ids.rail}"]`);
      if (!rail) return [];
      const els = [
        ...rail.querySelectorAll<HTMLElement>('[data-testid^="hud-stop-"] > span'),
        ...rail.querySelectorAll<HTMLElement>('p'),
        ...rail.querySelectorAll<HTMLElement>(`[data-testid="${ids.exit}"]`),
      ];
      return els
        .filter((el) => {
          const style = getComputedStyle(el);
          return (
            style.visibility !== 'hidden' && style.display !== 'none' && style.clipPath === 'none'
          );
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            text: el.textContent ?? '',
          };
        })
        .filter((r) => r.right > r.left && r.bottom > r.top);
    },
    { rail: TEST_IDS.hudProgress, exit: TEST_IDS.exitWing },
  );
}

/**
 * Rects of every visible HUD and rail element (F-038): the rail's text and controls (stop labels
 * not clipped away, the wing chip, the exit control), its hairline, and the header's wordmark,
 * links and phone year chip.
 */
async function hudRects(page: Page): Promise<(Rect & { text: string })[]> {
  const rail = await railTextRects(page);
  const rest = await page.evaluate(
    (ids) => {
      const els = [
        ...document.querySelectorAll<HTMLElement>(`[data-testid="${ids.rail}"] > div`),
        ...document.querySelectorAll<HTMLElement>(`[data-testid="${ids.hud}"] :is(a, p, span)`),
      ];
      return els
        .filter((el) => {
          const style = getComputedStyle(el);
          return style.visibility !== 'hidden' && style.display !== 'none';
        })
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            text: el.textContent || el.className,
          };
        })
        .filter((r) => r.right > r.left && r.bottom > r.top);
    },
    { rail: TEST_IDS.hudProgress, hud: TEST_IDS.hud },
  );
  return [...rail, ...rest];
}

const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * (g), F-036 and F-039: at every wing exhibit stop the rail text (the stop label when shown, the
 * wing chip, the exit control) stays off the stop's own wall title (number and organization).
 */
async function expectRailClearOfWingTitles(page: Page): Promise<void> {
  await openGallery(page);
  const wingStops = content.wings.flatMap((w) => w.items as ExhibitId[]);
  expect(wingStops).toEqual(expect.arrayContaining(['sdsj', 'klarup', 'finance-tracker']));
  for (const id of wingStops) {
    await goToStop(page, id);
    const titles = await wallTitleRects(page, id);
    // The title is in the frame (F-022) and below the HUD, so the check is not vacuous.
    for (const t of titles) {
      expect(t.top, `${id} title top`).toBeGreaterThan(0);
      expect(t.right, `${id} title right`).toBeLessThan(page.viewportSize()!.width);
    }
    const texts = await railTextRects(page);
    expect(texts.length, `${id}: the wing chip and the exit control show`).toBeGreaterThanOrEqual(
      2,
    );
    for (const text of texts)
      for (const title of titles)
        expect(
          overlaps(text, title),
          `${id}: rail text '${text.text}' ${JSON.stringify(text)} over the title ${JSON.stringify(title)}`,
        ).toBe(false);
  }
}

test.describe('rail and wall titles (F-036)', () => {
  test.describe.configure({ timeout: 120_000 });

  test('(g) at each wing stop no rail text overlaps the 3D wall title', async ({ page }) => {
    test.skip(!['desktop', 'pixel7'].includes(project()), 'desktop and pixel7 only');
    await expectRailClearOfWingTitles(page);
  });

  // F-039: the smallest portrait phone, where the wing head reached furthest into the title.
  test.describe('360 x 640', () => {
    test.use({ viewport: { width: 360, height: 640 } });

    test('(g) 360 x 640: at each wing stop no rail text overlaps the 3D wall title', async ({
      page,
    }) => {
      only('pixel7');
      await expectRailClearOfWingTitles(page);
    });
  });

  // F-038: Step inside at a door, then one ArrowUp back: the page rests on the door section of
  // the wing track (EXPERIENCE §3.4 step 2), the camera at the door pose. The wing HUD must not be
  // drawn over the transom's room name there.
  test('(g) at each door reached on the wing track no HUD rect covers the transom title', async ({
    page,
    hasTouch,
  }) => {
    test.skip(!['desktop', 'pixel7'].includes(project()), 'desktop and pixel7 only');
    test.setTimeout(240_000);
    await openGallery(page);
    for (const wing of content.wings) {
      const door = doorId(wing.id);
      await goToStop(page, door);
      const enter = page.getByTestId(TEST_IDS.enterWing(wing.id));
      if (hasTouch) await enter.tap();
      else await enter.click();
      const first = wing.items[0] as StopId;
      await page.waitForFunction(
        (stop) => window.__MUSEUM__?.settled === true && window.__MUSEUM__.stop === stop,
        first,
      );
      await waitForRest(page);
      const rest = await press(page, 'ArrowUp');
      expect(rest.stop, `${wing.id}: ArrowUp lands on the door`).toBe(door);
      expect(await page.evaluate(() => window.__MUSEUM__!.stats().track), `${wing.id}: track`).toBe(
        wing.id,
      );
      const [title] = await projectWallBoxes(page, [transomTitleBox(door)]);
      // The title is in the frame, so the check is not vacuous.
      expect(title!.top, `${door} title top`).toBeGreaterThan(0);
      expect(title!.bottom, `${door} title bottom`).toBeLessThan(page.viewportSize()!.height);
      for (const rect of await hudRects(page))
        expect(
          overlaps(rect, title!),
          `${door} on the ${wing.id} track: HUD '${rect.text}' ${JSON.stringify(rect)} over the transom title ${JSON.stringify(title)}`,
        ).toBe(false);
      // Back to the aisle for the next door: Esc still exits from the door on the wing track.
      await page.keyboard.press('Escape');
      await page.waitForFunction(
        (stop) => window.__MUSEUM__?.settled === true && window.__MUSEUM__.stop === stop,
        door,
      );
    }
  });
});
