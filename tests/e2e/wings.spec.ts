// Wings (WP-09; ARCHITECTURE §5.6, §6.7, §6.8; EXPERIENCE §3.4, §3.6). R8 owns this spec after the
// merge. At a door, Enter (desktop) or tapping "Step inside" (pixel7) lands on the wing's first
// exhibit with the URL still `/` and one history entry; Esc, browser Back and "Return to the
// aisle" each return to the door with `scrollY === mainScrollY` and focus on "Step inside";
// `goTo` crosses tracks through the same path; scrolling the main aisle never adds history.
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import { doorId, type StopId, type WingId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { mainTrack, wingTrack } from '../../src/content/selectors';
import { expect, test } from './fixtures';
import { countHistoryWrites, goToStop, museumUrl, waitForMuseum } from './helpers';

const WING_PROJECTS = new Set(['desktop', 'pixel7']);
const MAIN: StopId[] = mainTrack(content);
const WINGS = content.wings.map((w) => ({ wing: w.id, door: doorId(w.id), first: w.items[0]! }));

interface Where {
  pathname: string;
  track: string | undefined;
  state: { inApp?: boolean; track?: string; mainScrollY?: number } | null;
  length: number;
  scrollY: number;
}

const where = (page: Page): Promise<Where> =>
  page.evaluate(() => ({
    pathname: window.location.pathname,
    track: document.getElementById('track')?.dataset.track,
    state: window.history.state as Where['state'],
    length: window.history.length,
    scrollY: window.scrollY,
  }));

/** Waits until the hook reports settled at `id`. */
async function settledAt(page: Page, id: StopId): Promise<void> {
  await page.waitForFunction(
    (stop) => window.__MUSEUM__?.settled === true && window.__MUSEUM__.stop === stop,
    id,
  );
}

/** Step inside at the door: Enter on desktop, a tap on "Step inside" on touch. */
async function stepInside(page: Page, wing: WingId, hasTouch: boolean): Promise<void> {
  if (hasTouch) await page.getByTestId(TEST_IDS.enterWing(wing)).tap();
  else await page.keyboard.press('Enter');
}

async function openAtDoor(page: Page, door: StopId): Promise<Where> {
  await page.goto(museumUrl('/'));
  await waitForMuseum(page);
  await goToStop(page, door);
  return where(page);
}

/** Inside the wing at its first exhibit: URL unchanged, one entry with the wing state. */
async function expectInWing(page: Page, wing: WingId, first: StopId, before: Where) {
  await settledAt(page, first);
  const inside = await where(page);
  expect(inside.pathname).toBe('/');
  expect(inside.track).toBe(wing);
  expect(inside.state).toEqual({ inApp: true, track: wing, mainScrollY: before.scrollY });
  expect(inside.length).toBe(before.length + 1);
  for (const id of wingTrack(content, wing)) {
    await expect(page.getByTestId(TEST_IDS.stop(id))).toBeAttached();
    expect(await page.getByTestId(TEST_IDS.stop(id)).isVisible()).toBe(true);
  }
  expect(await page.getByTestId(TEST_IDS.stop(MAIN[1]!)).isVisible()).toBe(false);
  return inside;
}

/** Back at the door: main track, the saved scroll position, focus on "Step inside". */
async function expectBackAtDoor(page: Page, wing: WingId, door: StopId, before: Where) {
  await settledAt(page, door);
  const back = await where(page);
  expect(back.pathname).toBe('/');
  expect(back.track).toBe('main');
  expect(back.scrollY, 'scrollY === mainScrollY').toBe(before.scrollY);
  await expect(page.getByTestId(TEST_IDS.enterWing(wing))).toBeFocused();
  expect(await page.getByTestId(TEST_IDS.stop(MAIN[1]!)).isVisible()).toBe(true);
}

test.describe('wings', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(() => {
    const project = test.info().project.name;
    test.skip(!WING_PROJECTS.has(project), 'the wing checks run on desktop and pixel7');
  });

  for (const { wing, door, first } of WINGS) {
    test(`${wing}: step inside lands on ${first}, Esc returns to ${door}`, async ({
      page,
      hasTouch,
    }) => {
      const before = await openAtDoor(page, door);
      await stepInside(page, wing, hasTouch);
      await expectInWing(page, wing, first as StopId, before);
      await page.keyboard.press('Escape');
      await expectBackAtDoor(page, wing, door, before);
      // Esc went back through history: the wing entry is now the forward entry.
      expect((await where(page)).length).toBe(before.length + 1);
    });

    test(`${wing}: step inside, then browser Back returns to ${door}`, async ({
      page,
      hasTouch,
    }) => {
      const before = await openAtDoor(page, door);
      await stepInside(page, wing, hasTouch);
      await expectInWing(page, wing, first as StopId, before);
      await page.goBack();
      await expectBackAtDoor(page, wing, door, before);
      // Forward re-enters the wing without a new entry.
      await page.goForward();
      await settledAt(page, first as StopId);
      expect((await where(page)).track).toBe(wing);
      expect((await where(page)).length).toBe(before.length + 1);
    });
  }

  test('"Return to the aisle" returns to the door', async ({ page, hasTouch }) => {
    const { wing, door, first } = WINGS[0]!;
    const before = await openAtDoor(page, door);
    await stepInside(page, wing, hasTouch);
    await expectInWing(page, wing, first as StopId, before);
    const exit = page.getByTestId(TEST_IDS.exitWing);
    if (hasTouch) await exit.tap();
    else await exit.click();
    await expectBackAtDoor(page, wing, door, before);
  });

  test('goTo crosses tracks through the wing history entry', async ({ page }) => {
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    const start = await where(page);
    const [projects, volunteer] = WINGS;
    const second = (w: WingId) => wingTrack(content, w).at(-1)!;

    await goToStop(page, second(projects!.wing));
    let now = await where(page);
    expect(now.track).toBe(projects!.wing);
    expect(now.state).toMatchObject({ inApp: true, track: projects!.wing });
    expect(now.length).toBe(start.length + 1);

    // Wing to wing: back out of one (history.back), push the other.
    await goToStop(page, volunteer!.first as StopId);
    now = await where(page);
    expect(now.track).toBe(volunteer!.wing);
    expect(now.state).toMatchObject({ inApp: true, track: volunteer!.wing });
    expect(now.length).toBe(start.length + 1);

    await goToStop(page, 'mysa');
    now = await where(page);
    expect(now.track).toBe('main');
    expect(now.pathname).toBe('/');
  });

  test('scrolling through all 10 main stops never changes history', async ({ page }) => {
    const writes = await countHistoryWrites(page);
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    const before = await where(page);
    for (const id of MAIN.slice(1)) {
      await page.evaluate((stop) => window.__MUSEUM__!.goTo(stop), id);
      await settledAt(page, id);
    }
    const after = await where(page);
    expect(MAIN).toHaveLength(10);
    expect(after.length).toBe(before.length);
    expect(after.pathname).toBe('/');
    expect(await writes()).toEqual({ push: 0, replace: 0, calls: [] });
  });
});
