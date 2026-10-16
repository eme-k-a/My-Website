// Wings (WP-09; ARCHITECTURE §5.6, §6.7, §6.8; EXPERIENCE §3.4, §3.6). R8 owns this spec after the
// merge. At a door, Enter (desktop) or tapping "Step inside" (pixel7) lands on the wing's first
// exhibit with the URL still `/` and one history entry; Esc, browser Back and "Return to the
// aisle" each return to the door with `scrollY === mainScrollY` and focus on "Step inside";
// `goTo` crosses tracks through the same path; inside a wing only the entry writes history (one
// pushState), arrivals and exits write none (WP-17; the main aisle's walk is in rail-input).
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

  test('each wing entry pushes one history entry; wing arrivals and exits write none', async ({
    page,
    hasTouch,
  }) => {
    // The main walk's zero-write rule is rail-input (e) and (f), with every key and HUD arrival
    // (WP-17 moved it there: this test walked the main aisle with goTo a third time, 132 s of
    // CI run 35). Here, per wing: an instant move to the door, Step inside, one smooth goTo
    // arrival inside the wing, and Esc. CI run 35 timed single wing round trips at 32 to 46 s on
    // desktop; two of them plus the boot fit 180 s.
    test.setTimeout(180_000);
    const writes = await countHistoryWrites(page);
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);
    const start = await where(page);
    let pushes = 0;
    for (const { wing, door, first } of WINGS) {
      await goToStop(page, door);
      expect(await writes(), `arriving at ${door}`).toMatchObject({ push: pushes, replace: 0 });
      const before = await where(page);
      // Esc left focus on the previous wing's "Step inside"; Enter must reach the page's own
      // handler for this door, not activate that button.
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await stepInside(page, wing, hasTouch);
      await settledAt(page, first as StopId);
      const inside = await where(page);
      expect(inside.pathname).toBe('/');
      expect(inside.track).toBe(wing);
      expect(inside.state).toEqual({ inApp: true, track: wing, mainScrollY: before.scrollY });
      pushes++;
      const entered = await writes();
      expect(entered, `entering ${wing}`).toMatchObject({ push: pushes, replace: 0 });
      expect(entered.calls.at(-1), 'the wing entry keeps the path and the query').toBe(
        `push ${new URL(page.url()).pathname}${new URL(page.url()).search}`,
      );
      // An arrival at the wing's next stop writes nothing.
      const last = wingTrack(content, wing).at(-1)!;
      await page.evaluate((stop) => window.__MUSEUM__!.goTo(stop), last);
      await settledAt(page, last);
      expect(await writes(), `arriving at ${last}`).toMatchObject({ push: pushes, replace: 0 });
      // Esc leaves through history.back(): no write either.
      await page.keyboard.press('Escape');
      await settledAt(page, door);
      expect(await writes(), `leaving ${wing}`).toMatchObject({ push: pushes, replace: 0 });
    }
    const end = await where(page);
    expect(end.pathname).toBe('/');
    expect(end.track).toBe('main');
    // Each wing entry stays as one forward-history entry only: length grew by one at most.
    expect(end.length).toBe(start.length + 1);
  });
});
