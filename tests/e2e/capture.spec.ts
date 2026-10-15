// Capture tool for builders and reviewers (WP-07; used by WP-11 to WP-13, WP-19 and later reviews
// until WP-34 automates it). Not a test of the product: every test skips unless CAPTURE_DIR is set.
//
//   CAPTURE_DIR=out/wp07 CAPTURE_STOPS=lobby npx playwright test --grep @capture --project=desktop
//
// - CAPTURE_DIR: output folder (created if missing).
// - CAPTURE_STOPS: comma list of stop ids; default every main and wing stop, in section order.
// - CAPTURE_DIALOGS=1: also opens each captured exhibit's story and saves it.
// - CAPTURE_TIER=low|medium|high: adds `&tier=`.
// Writes `<stop>-<project>.png`, `<stop>-<project>.json` (stats() and the viewport) and, with
// dialogs, `<stop>-dialog-<project>.png`.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Page } from '@playwright/test';
import { TEST_IDS } from '../../src/app/testIds';
import {
  doorId,
  EXHIBIT_IDS,
  STOP_ONLY_IDS,
  type ExhibitId,
  type StopId,
} from '../../src/content/ids';
import { content } from '../../src/content/index';
import { mainTrack } from '../../src/content/selectors';
import type { QualityTier } from '../../src/museum/exhibits/_kit/types';
import { expect, test } from './fixtures';
import { goToStop, museumUrl, stats, waitForMuseum } from './helpers';

const TIERS: readonly QualityTier[] = ['low', 'medium', 'high'];
const KNOWN_STOPS = new Set<string>([...EXHIBIT_IDS, ...STOP_ONLY_IDS]);

/** Every main stop with each wing's items right after its door (the prerendered section order). */
function allStops(): StopId[] {
  const stops: StopId[] = [];
  for (const stop of mainTrack(content)) {
    stops.push(stop);
    const wing = content.wings.find((w) => doorId(w.id) === stop);
    if (wing) stops.push(...(wing.items as ExhibitId[]));
  }
  return stops;
}

function requestedStops(): StopId[] {
  const raw = process.env.CAPTURE_STOPS?.trim();
  if (!raw) return allStops();
  const stops = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const unknown = stops.filter((s) => !KNOWN_STOPS.has(s));
  if (unknown.length > 0)
    throw new Error(`CAPTURE_STOPS has unknown stop ids: ${unknown.join(', ')}`);
  return stops as StopId[];
}

function requestedTier(): QualityTier | undefined {
  const tier = process.env.CAPTURE_TIER?.trim();
  if (!tier) return undefined;
  const known = TIERS.find((t) => t === tier);
  if (!known) throw new Error(`CAPTURE_TIER must be one of ${TIERS.join(', ')}, got '${tier}'`);
  return known;
}

const isExhibit = (stop: StopId): stop is ExhibitId =>
  (EXHIBIT_IDS as readonly string[]).includes(stop);

async function statsOrError(page: Page): Promise<{ stats: unknown } | { statsError: string }> {
  try {
    return { stats: await stats(page) };
  } catch (error) {
    return { statsError: error instanceof Error ? error.message : String(error) };
  }
}

const CAPTURE_DIR = process.env.CAPTURE_DIR;
const STOPS = requestedStops();
const TIER = requestedTier();

test.describe('capture', { tag: '@capture' }, () => {
  test.skip(!CAPTURE_DIR, 'capture runs only with CAPTURE_DIR set');

  for (const stop of STOPS) {
    test(`capture ${stop}`, async ({ page }) => {
      const dir = CAPTURE_DIR ?? '';
      const project = test.info().project.name;
      await mkdir(dir, { recursive: true });

      const url = museumUrl('/', { tier: TIER });
      await page.goto(url);
      await waitForMuseum(page);
      // The museum boots at the lobby, so capturing it needs no move.
      const current = await page.evaluate(() => window.__MUSEUM__?.stop);
      if (current !== stop) await goToStop(page, stop);

      const base = join(dir, `${stop}-${project}`);
      await page.screenshot({ path: `${base}.png`, animations: 'disabled', caret: 'hide' });
      const record = {
        stop,
        project,
        url,
        viewport: page.viewportSize(),
        ...(await statsOrError(page)),
      };
      await writeFile(`${base}.json`, `${JSON.stringify(record, null, 2)}\n`);

      if (process.env.CAPTURE_DIALOGS === '1' && isExhibit(stop)) {
        const dialog = page.getByTestId(TEST_IDS.dialog);
        await page.getByTestId(TEST_IDS.open(stop)).click();
        await expect(dialog).toBeVisible();
        await page.screenshot({
          path: join(dir, `${stop}-dialog-${project}.png`),
          animations: 'disabled',
          caret: 'hide',
        });
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();
      }
    });
  }
});
