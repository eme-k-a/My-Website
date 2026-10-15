// The reusable exhibit acceptance spec (ARCHITECTURE §7.2 to §7.5, EXPERIENCE §5.11). Written once
// from the frozen contracts (WP-07) and reused by every exhibit WP: a test is generated for each id
// in EXHIBIT_IDS whose folder `src/museum/exhibits/<id>/index.ts` exists when the spec is
// collected, so ids without a folder produce no test. Runs on `desktop` and `pixel7`.
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TEST_IDS } from '../../src/app/testIds';
import { EXHIBIT_IDS, type ExhibitId } from '../../src/content/ids';
import { content } from '../../src/content/index';
import { entryById } from '../../src/content/selectors';
import { expect, test } from './fixtures';
import { goToStop, museumCanvas, museumUrl, screenPosOf, stats, waitForMuseum } from './helpers';

const EXHIBITS_DIR = fileURLToPath(new URL('../../src/museum/exhibits/', import.meta.url));
const BUILT: ExhibitId[] = EXHIBIT_IDS.filter((id) => existsSync(`${EXHIBITS_DIR}${id}/index.ts`));

const CONTRACT_PROJECTS = new Set(['desktop', 'pixel7']);
/** EXPERIENCE §5.11 and CLAUDE.md rule 8. */
const MAX_TRIANGLES = 20_000;
/** ?test=1 freezes the exhibit clock, so two captures this far apart must match exactly. */
const STILLNESS_MS = 3_000;

test.describe('exhibit contract', { tag: '@exhibit' }, () => {
  test.beforeEach(() => {
    const project = test.info().project.name;
    test.skip(!CONTRACT_PROJECTS.has(project), `the exhibit contract runs on desktop and pixel7`);
  });

  for (const id of BUILT) {
    test(`${id} meets the exhibit contract`, async ({ page, hasTouch }) => {
      const title = entryById(content, id).exhibit.title;

      await page.goto(museumUrl('/'));
      await waitForMuseum(page);
      await goToStop(page, id);

      const s = await stats(page);
      const own = s.exhibits[id];
      expect(own, `stats().exhibits['${id}'] is reported after reveal`).toBeDefined();
      expect(own?.inBounds, 'fits its slot bounds').toBe(true);
      expect(own?.triangles, 'triangle budget').toBeLessThanOrEqual(MAX_TRIANGLES);
      expect(s.mounted).toContain(id);

      const canvas = museumCanvas(page);
      const first = await canvas.screenshot();
      await page.waitForTimeout(STILLNESS_MS);
      const second = await canvas.screenshot();
      expect(second.equals(first), 'canvas is still under ?test=1 (frozen clock)').toBe(true);

      const pos = await screenPosOf(page, id);
      expect(pos, `screenPos('${id}') at its own stop`).not.toBeNull();
      if (!pos) return;
      if (hasTouch) await page.touchscreen.tap(pos.x, pos.y);
      else await page.mouse.click(pos.x, pos.y);

      const dialog = page.getByTestId(TEST_IDS.dialog);
      await expect(dialog).toBeVisible();
      await expect(dialog).toContainText(title);

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(page.getByTestId(TEST_IDS.open(id))).toBeFocused();
    });
  }
});
