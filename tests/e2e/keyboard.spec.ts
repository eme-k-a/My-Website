// Keyboard-only reading (WP-17; ARCHITECTURE §13.7, EXPERIENCE §10.2 tab order and §10.6): from the
// top of `/`, Tab alone reaches every story in catalogue order (main-track cards, each door card
// carrying its wing's stories), Enter opens each one, Esc closes it, and focus returns where
// story.ts puts it (a main exhibit's "Read the story", a wing story's door link) before the next
// Tab. Desktop: the fine-pointer keyboard path.
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import { EXHIBIT_IDS, type ExhibitId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { entryById, mainTrack, readingOrder } from '../../src/content/selectors';
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
