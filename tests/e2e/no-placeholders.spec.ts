// No placeholder remains in the collection (WP-25 A1; EXPERIENCE §5.11). Runs on desktop and
// pixel7.
// - The registry: every exhibit id has its folder `src/museum/exhibits/<id>/index.ts` declaring
//   that id, and no folder outside the id list exists (registry.ts globs these files).
// - The walk: one page visits every stop with instant goTo. At each exhibit's own stop,
//   `stats().exhibits[id]` is reported (only a revealed real exhibit reports; the placeholder
//   crate does not), and at every stop no card says "Installation in progress".
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EXHIBIT_IDS, STOP_ONLY_IDS, type ExhibitId, type StopId } from '../../src/content/ids';
import { expect, test } from './fixtures';
import { goToStop, museumUrl, stats, waitForMuseum } from './helpers';

const EXHIBITS_DIR = fileURLToPath(new URL('../../src/museum/exhibits/', import.meta.url));
const INSTALLING = 'Installation in progress';
const PROJECTS = new Set(['desktop', 'pixel7']);
const EXHIBITS = new Set<StopId>(EXHIBIT_IDS);
/** Every stop: the 9 exhibits and the 4 stop-only ids (lobby, the two doors, desk). */
const STOPS: StopId[] = [...EXHIBIT_IDS, ...STOP_ONLY_IDS];
/**
 * A cold load plus 13 instant moves: about 45 s locally on desktop with two workers (each move 1
 * to 3 s once the lobby is ready). CI frames cost 2 to 3 s under SwiftShader, so three times that.
 */
const WALK_TIMEOUT_MS = 180_000;

test.describe('no placeholders', { tag: '@exhibit' }, () => {
  test.beforeEach(() => {
    const project = test.info().project.name;
    test.skip(!PROJECTS.has(project), 'no-placeholders runs on desktop and pixel7');
  });

  test('the registry holds a manifest for every exhibit id', () => {
    const folders = readdirSync(EXHIBITS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
      .map((entry) => entry.name)
      .sort();
    expect(folders, 'one folder per exhibit id, no others').toEqual([...EXHIBIT_IDS].sort());
    for (const id of EXHIBIT_IDS) {
      const manifest = `${EXHIBITS_DIR}${id}/index.ts`;
      expect(existsSync(manifest), `${id}/index.ts exists`).toBe(true);
      expect(readFileSync(manifest, 'utf8'), `${id}/index.ts declares its id`).toMatch(
        new RegExp(`\\bid: '${id}'`),
      );
    }
  });

  test('every stop shows its real exhibit and no card is installing', async ({ page }) => {
    test.setTimeout(WALK_TIMEOUT_MS);
    await page.goto(museumUrl('/'));
    await waitForMuseum(page);

    const revealed: ExhibitId[] = [];
    for (const id of STOPS) {
      await goToStop(page, id);
      await expect(
        page.locator('[data-testid^="card-"]').filter({ hasText: INSTALLING }),
        `no card says "${INSTALLING}" at ${id}`,
      ).toHaveCount(0);
      if (!EXHIBITS.has(id)) continue;
      const exhibit = id as ExhibitId;
      const own = (await stats(page)).exhibits[exhibit];
      expect(own, `stats().exhibits['${exhibit}'] is reported at its stop`).toBeDefined();
      revealed.push(exhibit);
    }
    expect(revealed.sort(), 'all nine exhibits revealed').toEqual([...EXHIBIT_IDS].sort());
  });
});
