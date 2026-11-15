// Keyboard-only reading (WP-17; ARCHITECTURE §13.7, EXPERIENCE §10.2 tab order and §10.6): from the
// top of `/`, Tab alone reaches every story in catalogue order (main-track cards, each door card
// carrying its wing's stories), Enter opens each one, Esc closes it, and focus returns where
// story.ts puts it (a main exhibit's "Read the story", a wing story's door link) before the next
// Tab. Desktop: the fine-pointer keyboard path.
//
// WP-30 adds: (b) the full Tab order of EXPERIENCE §10.2 (skip link, header controls, hero ending
// with "Begin the walk", then each card's controls in track order with the door cards carrying
// their wing stories, then the progress rail); (c) at each door, Enter with focus on the page
// steps inside and Esc returns with focus on "Step inside" (EXPERIENCE §3.4, §10.2); (d) inside a
// wing, a wing story opened from its own "Read the story" returns focus there on Esc, because
// the exhibit is on the active track (EXPERIENCE §5.10).
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import { doorId, EXHIBIT_IDS, type ExhibitId, type StopId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { entryById, mainTrack, readingOrder, wingTrack } from '../../src/content/selectors';
import { expect, test } from './fixtures';
import { museumUrl, waitForMuseum } from './helpers';

/** More than the page has focus stops (HUD, hero, ten cards with two or three controls, rail). */
const MAX_TABS = 200;

interface Focused {
  /** The story this control opens, or null. */
  story: ExhibitId | null;
  label: string;
}

/** What has focus: a "Read the story" button or a story link names its exhibit. */
const focused = (page: Page): Promise<Focused> =>
  page.evaluate(
    (ids) => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return { story: null, label: 'body' };
      const testId = el.dataset.testid ?? '';
      const href = el.getAttribute('href') ?? '';
      const fromButton = /^open-(.+)$/.exec(testId)?.[1];
      const fromLink = /^\/exhibit\/([^/]+)\/$/.exec(href)?.[1];
      const id = fromButton ?? fromLink ?? null;
      return {
        story: id && (ids as string[]).includes(id) ? (id as ExhibitId) : null,
        label: `${el.tagName.toLowerCase()}${testId ? `[${testId}]` : ''}${href ? `(${href})` : ''}`,
      };
    },
    EXHIBIT_IDS as readonly string[] as string[],
  );

test.describe('keyboard-only reading', { tag: '@a11y' }, () => {
  test('Tab and Enter reach every story in catalogue order; Esc returns focus', async ({
    page,
  }) => {
    test.skip(test.info().project.name !== 'desktop', 'desktop only');
    // Each focus move into the next card scrolls its section into view and the camera follows,
    // so the walk runs at SwiftShader frame speed (2 to 3 s a frame in CI, F-M2): ten stories,
    // about 60 Tab stops and ten dialogs. Sized like the 300 s keyboard walks of rail-input (f).
    test.setTimeout(300_000);
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);

    const expected = readingOrder(content);
    const reached: ExhibitId[] = [];
    const dialog = page.getByTestId(TEST_IDS.dialog);
    for (let tab = 0; tab < MAX_TABS && reached.length < expected.length; tab++) {
      await page.keyboard.press('Tab');
      const now = await focused(page);
      if (!now.story || reached.includes(now.story)) continue;
      reached.push(now.story);

      await page.evaluate(() => document.activeElement?.setAttribute('data-kbd-opener', ''));
      await page.keyboard.press('Enter');
      await expect(dialog, `Enter on ${now.label}`).toBeVisible();
      await expect(
        dialog.getByRole('heading', {
          level: 2,
          name: entryById(content, now.story).exhibit.title,
        }),
      ).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(`/exhibit/${now.story}/`);

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      expect(new URL(page.url()).pathname).toBe('/');
      // Focus goes to the story's "Read the story" when the exhibit is on the active track (main
      // here), else back to the opener: a door card's link to a wing story (story.ts
      // restoreFocus, EXPERIENCE §5.11).
      const onMain = mainTrack(content).includes(now.story);
      const back = onMain
        ? page.getByTestId(TEST_IDS.open(now.story))
        : page.locator('[data-kbd-opener]');
      await expect(back, `focus back after ${now.label}`).toBeFocused();
      await page.evaluate(() =>
        document.querySelector('[data-kbd-opener]')?.removeAttribute('data-kbd-opener'),
      );
    }
    expect(reached).toEqual(expected);
  });
});

/** One focus stop of the Tab walk: its test id or href, and the stop section that holds it. */
interface TabStop {
  key: string;
  stop: StopId | null;
  inHeader: boolean;
  inRail: boolean;
}

const tabStop = (page: Page): Promise<TabStop | null> =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return null;
    const section = el.closest<HTMLElement>('section[data-stop]');
    return {
      key: el.dataset.testid ?? el.getAttribute('href') ?? el.tagName.toLowerCase(),
      stop: (section?.dataset.stop ?? null) as StopId | null,
      inHeader: el.closest('header') !== null,
      inRail: el.closest('nav[aria-label="Exhibits"]') !== null,
    };
  });

/** Waits until the hook reports `settled` at `stop` on `track`. */
const settledAt = (page: Page, stop: StopId, track: string) =>
  page.waitForFunction(
    ([s, t]) => {
      const hook = window.__MUSEUM__;
      return hook?.settled === true && hook.stop === s && hook.stats().track === t;
    },
    [stop, track] as const,
    { timeout: 60_000 },
  );

test.describe('keyboard order and wings', { tag: '@a11y' }, () => {
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'desktop', 'desktop only');
  });

  test('(b) Tab order: skip link, header, hero, cards in track order, then the rail', async ({
    page,
  }) => {
    test.setTimeout(300_000);
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);

    const walk: TabStop[] = [];
    for (let tab = 0; tab < MAX_TABS; tab++) {
      await page.keyboard.press('Tab');
      const now = await tabStop(page);
      // Past the last rail button focus leaves the page (or wraps to the skip link).
      if (now === null || (walk.length > 0 && now.key === walk[0]!.key)) break;
      walk.push(now);
    }
    const keys = walk.map((s) => s.key);

    // The header, then the hero (EXPERIENCE §10.2), in this exact order.
    expect(keys.slice(0, 7)).toEqual([
      '/resume/',
      TEST_IDS.hudPdf,
      TEST_IDS.hudClassic,
      TEST_IDS.heroPdf,
      TEST_IDS.heroEmail,
      TEST_IDS.heroClassic,
      TEST_IDS.beginWalk,
    ]);
    expect(walk.slice(0, 3).every((s) => s.inHeader)).toBe(true);
    expect(walk.slice(3, 7).every((s) => s.stop === 'lobby')).toBe(true);

    // Then the cards, section by section in main-track order, then only the rail.
    const main = mainTrack(content);
    const firstRail = walk.findIndex((s) => s.inRail);
    expect(firstRail, 'the rail is reached').toBeGreaterThan(7);
    const cards = walk.slice(7, firstRail);
    const order = cards.map((s) => main.indexOf(s.stop!));
    expect(
      order.every((i) => i >= 1),
      'every card control sits in a main-track section',
    ).toBe(true);
    expect(order, 'card controls follow track order').toEqual([...order].sort((a, b) => a - b));
    expect([...new Set(cards.map((s) => s.stop))]).toEqual(main.slice(1));
    expect(
      walk.slice(firstRail).every((s) => s.inRail),
      'nothing after the rail',
    ).toBe(true);
    expect(walk.slice(firstRail).map((s) => s.key)).toEqual(main.map((id) => TEST_IDS.hudStop(id)));

    // Each exhibit card offers "Read the story"; each door card lists its wing stories as links
    // before "Step inside".
    for (const id of main) {
      const here = cards.filter((s) => s.stop === id).map((s) => s.key);
      const wing = content.wings.find((w) => doorId(w.id) === id);
      if (wing) {
        expect(here, `door card ${id}`).toEqual([
          ...wing.items.map((item) => `/exhibit/${item}/`),
          TEST_IDS.enterWing(wing.id),
        ]);
      } else if ((EXHIBIT_IDS as readonly string[]).includes(id)) {
        expect(here, `exhibit card ${id}`).toContain(TEST_IDS.open(id as ExhibitId));
      }
    }
  });

  for (const wing of content.wings) {
    test(`(c, d) ${wing.id} wing: Enter steps inside, Esc returns focus to "Step inside"`, async ({
      page,
    }) => {
      test.setTimeout(300_000);
      const door = doorId(wing.id);
      const main = mainTrack(content);
      await page.goto(museumUrl('/'));
      await waitForMuseum(page);

      // (c) ArrowDown to the door with focus on the page, then Enter steps inside.
      for (let i = 1; i <= main.indexOf(door); i++) {
        await page.keyboard.press('ArrowDown');
        await settledAt(page, main[i]!, 'main');
      }
      expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
      await page.keyboard.press('Enter');
      const inside = wingTrack(content, wing.id);
      await settledAt(page, inside[1]!, wing.id);

      // (d) Tab to the first wing story's "Read the story", open it, close it with Esc: focus
      // comes back to that button (the exhibit is on the active track).
      const first = inside[1] as ExhibitId;
      const open = page.getByTestId(TEST_IDS.open(first));
      for (let tab = 0; tab < MAX_TABS; tab++) {
        await page.keyboard.press('Tab');
        if (await open.evaluate((el) => el === document.activeElement)) break;
      }
      await expect(open).toBeFocused();
      await page.keyboard.press('Enter');
      const dialog = page.getByTestId(TEST_IDS.dialog);
      await expect(dialog).toBeVisible();
      expect(new URL(page.url()).pathname).toBe(`/exhibit/${first}/`);
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(open).toBeFocused();

      // Esc with no dialog open returns to the aisle, focus on the door's "Step inside".
      await page.keyboard.press('Escape');
      await settledAt(page, door, 'main');
      const stepInside = page.getByTestId(TEST_IDS.enterWing(wing.id));
      await expect(stepInside).toBeFocused();

      // "Step inside" itself, with Enter: in and out again, focus back on it.
      await page.keyboard.press('Enter');
      await settledAt(page, inside[1]!, wing.id);
      await page.keyboard.press('Escape');
      await settledAt(page, door, 'main');
      await expect(stepInside).toBeFocused();
    });
  }
});
