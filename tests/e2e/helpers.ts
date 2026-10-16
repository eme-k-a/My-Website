// Shared e2e helpers (ARCHITECTURE §13.3, §13.4, §13.6, §13.9). Museum helpers drive the test hook
// `window.__MUSEUM__` (enabled by ?test=1); input helpers produce the wheel, touch and listener
// evidence that EXPERIENCE §3.6, §6.11 and §9.5 ask for. Never replace `waitForMuseum` with a
// fixed sleep: `ready` already waits for Suspense, troika, compileAsync and two frames.
import type { Locator, Page, PageAssertionsToHaveScreenshotOptions } from '@playwright/test';
import type { MuseumStats } from '../../src/app/testHooks';
import { TEST_IDS } from '../../src/app/testIds';
import type { ExhibitId, StopId } from '../../src/content/ids';
import type { QualityTier } from '../../src/museum/exhibits/_kit/types';
import { expect, test } from './fixtures';

// ---------------------------------------------------------------------------------------------
// URLs and the test hook

export interface MuseumParams {
  /** `&tier=`: overrides the fixed `medium` tier of ?test=1. */
  tier?: QualityTier;
  /** `&idle=1`: re-enables idle motion (WP-16's idle-stop test only). */
  idle?: boolean;
}

/** `path?test=1&mode=museum`, plus `&tier=` and `&idle=1` when asked. Relative to `baseURL`. */
export function museumUrl(path = '/', params: MuseumParams = {}): string {
  const search = new URLSearchParams({ test: '1', mode: 'museum' });
  if (params.tier) search.set('tier', params.tier);
  if (params.idle) search.set('idle', '1');
  return `${path}?${search.toString()}`;
}

/** Waits for `__MUSEUM__.ready` (ARCHITECTURE §13.4). */
export async function waitForMuseum(page: Page): Promise<void> {
  await page.waitForFunction(() => window.__MUSEUM__?.ready === true);
}

/** `goTo(id, { instant: true })`, then waits until the hook reports `settled` at `id`. */
export async function goToStop(page: Page, id: StopId): Promise<void> {
  await page.evaluate(async (stop) => {
    const hook = window.__MUSEUM__;
    if (!hook) throw new Error('window.__MUSEUM__ is missing: does the URL have ?test=1?');
    await hook.goTo(stop, { instant: true });
  }, id);
  await page.waitForFunction((stop) => {
    const hook = window.__MUSEUM__;
    return hook?.settled === true && hook.stop === stop;
  }, id);
}

/** `__MUSEUM__.stats()` (ARCHITECTURE §13.3). */
export async function stats(page: Page): Promise<MuseumStats> {
  return page.evaluate(() => {
    const hook = window.__MUSEUM__;
    if (!hook) throw new Error('window.__MUSEUM__ is missing: does the URL have ?test=1?');
    return hook.stats();
  });
}

/** `__MUSEUM__.screenPos(id)`: client CSS px of the exhibit's hit-box center, or null. */
export async function screenPosOf(
  page: Page,
  id: ExhibitId,
): Promise<{ x: number; y: number } | null> {
  return page.evaluate((exhibit) => {
    const hook = window.__MUSEUM__;
    if (!hook) throw new Error('window.__MUSEUM__ is missing: does the URL have ?test=1?');
    return hook.screenPos(exhibit);
  }, id);
}

/** The museum canvas (the R3F canvas is the only one outside `?debug`). */
export const museumCanvas = (page: Page): Locator => page.locator('canvas').first();

// ---------------------------------------------------------------------------------------------
// Visual baselines (ARCHITECTURE §13.6)

export interface ShotOptions extends Omit<PageAssertionsToHaveScreenshotOptions, 'mask'> {
  /** Extra regions to mask. `dialog-duration` is always masked. */
  mask?: Locator[];
  /** A DOM-only shot (dialogs, `/resume/`, 404): the canvas is masked too. */
  domOnly?: boolean;
}

/** True where screenshots are compared: CI, or locally with VISUAL_LOCAL=1 (advisory). */
export const compareScreenshots = (): boolean =>
  !!process.env.CI || process.env.VISUAL_LOCAL === '1';

/**
 * `toHaveScreenshot` with the house settings. Skips the test outside CI unless VISUAL_LOCAL=1,
 * because SwiftShader output differs by CPU. Baselines are never committed from a container.
 */
export async function shot(page: Page, name: string, opts: ShotOptions = {}): Promise<void> {
  test.skip(
    !compareScreenshots(),
    'Screenshots are compared in CI only (ARCHITECTURE §13.6); set VISUAL_LOCAL=1 for an advisory local run',
  );
  const { mask = [], domOnly = false, ...rest } = opts;
  await expect(page).toHaveScreenshot(name.endsWith('.png') ? name : `${name}.png`, {
    maxDiffPixelRatio: 0.02,
    animations: 'disabled',
    caret: 'hide',
    ...rest,
    mask: [
      page.getByTestId(TEST_IDS.dialogDuration),
      ...(domOnly ? [page.locator('canvas')] : []),
      ...mask,
    ],
  });
}

// ---------------------------------------------------------------------------------------------
// Input (EXPERIENCE §3.6, §9.5): wheel streams and notches, a touch flick, listener audit

async function pointerToCenter(page: Page): Promise<{ width: number; height: number }> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('The page has no fixed viewport');
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  return viewport;
}

export interface WheelStreamOptions {
  events?: number;
  /** First deltaY in px; negative scrolls up. */
  start?: number;
  /** Each event's delta is the previous one times `decay`. */
  decay?: number;
  intervalMs?: number;
}

/**
 * A decaying trackpad-like wheel stream from the viewport center, one event every `intervalMs`
 * whatever the page's frame rate, as a real trackpad sends them. Returns the total deltaY.
 *
 * Each event goes out through CDP `Input.dispatchMouseEvent` (the call `page.mouse.wheel`
 * makes) without waiting for the renderer's ack before the next one; the acks are awaited at
 * the end. Awaiting each ack paced the stream at one event per rendered frame: under SwiftShader
 * in CI (frames of 2 to 3 s) the 40 events took 2 to 3 minutes and rendered 40 frames instead of
 * arriving within a second (F-M2, CI runs 31 and 32).
 */
export async function wheelStream(
  page: Page,
  { events = 40, start = 120, decay = 0.85, intervalMs = 16 }: WheelStreamOptions = {},
): Promise<number> {
  const { width, height } = await pointerToCenter(page);
  const cdp = await page.context().newCDPSession(page);
  const acks: Promise<unknown>[] = [];
  let total = 0;
  try {
    for (let i = 0; i < events; i++) {
      const delta = start * decay ** i;
      acks.push(
        cdp.send('Input.dispatchMouseEvent', {
          type: 'mouseWheel',
          x: width / 2,
          y: height / 2,
          deltaX: 0,
          deltaY: delta,
          pointerType: 'mouse',
        }),
      );
      total += delta;
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    await Promise.all(acks);
  } finally {
    await cdp.detach();
  }
  return total;
}

export interface WheelNotchOptions {
  count?: number;
  /** deltaY per notch in px; negative scrolls up. */
  delta?: number;
  gapMs?: number;
}

/** Discrete mouse-wheel notches from the viewport center, `gapMs` apart. */
export async function wheelNotches(
  page: Page,
  { count = 3, delta = 100, gapMs = 400 }: WheelNotchOptions = {},
): Promise<void> {
  await pointerToCenter(page);
  for (let i = 0; i < count; i++) {
    if (i > 0) await page.waitForTimeout(gapMs);
    await page.mouse.wheel(0, delta);
  }
}

export interface FlickOptions {
  /** Scroll distance in CSS px: positive moves the finger up (scrolls down), negative scrolls up. */
  dy: number;
  durationMs?: number;
}

/**
 * A one-finger flick through CDP `Input.dispatchTouchEvent`, in viewport coordinates at the
 * horizontal center, so the browser's own gesture and fling handling scroll the page (the
 * sections own scrolling; the canvas is never the target of a synthetic event). Needs a touch
 * project (`pixel7`, `pixel7-landscape`).
 */
export async function cdpFlick(page: Page, { dy, durationMs = 120 }: FlickOptions): Promise<void> {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('The page has no fixed viewport');
  if (Math.abs(dy) > viewport.height * 0.7) {
    throw new Error(
      `cdpFlick: |dy| must be at most 70% of the viewport height (${viewport.height})`,
    );
  }
  const x = viewport.width / 2;
  const startY = dy > 0 ? viewport.height * 0.85 : viewport.height * 0.15;
  const steps = Math.max(2, Math.round(durationMs / 16));
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y: startY }],
    });
    for (let i = 1; i <= steps; i++) {
      await page.waitForTimeout(durationMs / steps);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y: startY - (dy * i) / steps }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await cdp.detach();
  }
}

/**
 * Where an audited listener sits. The R3F wrapper is the `div` R3F renders around the canvas's
 * parent, its default event source; sections are labelled by their `data-stop` id.
 */
export type ListenerTarget =
  | 'window'
  | 'document'
  | '#app'
  | 'canvas'
  | 'canvas parent'
  | 'R3F wrapper'
  | `section[data-stop="${string}"]`;

export interface ListenerRecord {
  target: ListenerTarget;
  type: string;
  passive: boolean;
  useCapture: boolean;
  scriptId: string;
  lineNumber: number;
  columnNumber: number;
}

const AUDITED_LISTENERS = new Set(['wheel', 'mousewheel', 'touchstart', 'touchmove']);

/**
 * Page-side expression: `[label, node]` for every audited target that exists, each node once (a
 * canvas parent that is also `#app` is reported as `#app`). Evaluated in the page through CDP.
 */
const AUDITED_TARGETS = `(() => {
  const canvas = document.querySelector('canvas');
  const found = [
    ['window', window],
    ['document', document],
    ['#app', document.getElementById('app')],
    ['canvas', canvas],
    ['canvas parent', canvas?.parentElement],
    ['R3F wrapper', canvas?.parentElement?.parentElement],
  ];
  for (const section of document.querySelectorAll('section[data-stop]')) {
    found.push(['section[data-stop="' + section.getAttribute('data-stop') + '"]', section]);
  }
  const seen = new Set();
  return found.filter(([, node]) => node && !seen.has(node) && seen.add(node));
})()`;

/**
 * Non-passive `wheel`, `mousewheel`, `touchstart` and `touchmove` listeners on `window`,
 * `document`, `#app`, the canvas, the canvas's parent, the R3F wrapper around it and every
 * `section[data-stop]`, from CDP `DOMDebugger.getEventListeners`. Native scroll (CLAUDE.md rule 6)
 * means this returns `[]`. Missing targets are skipped.
 */
export async function listenerAudit(page: Page): Promise<ListenerRecord[]> {
  const cdp = await page.context().newCDPSession(page);
  try {
    const found: ListenerRecord[] = [];
    const labels = await cdp.send('Runtime.evaluate', {
      expression: `${AUDITED_TARGETS}.map(([label]) => label)`,
      returnByValue: true,
    });
    for (const [i, target] of (labels.result.value as ListenerTarget[]).entries()) {
      const { result } = await cdp.send('Runtime.evaluate', {
        expression: `${AUDITED_TARGETS}[${i}]?.[1]`,
      });
      if (!result.objectId) continue;
      const { listeners } = await cdp.send('DOMDebugger.getEventListeners', {
        objectId: result.objectId,
      });
      for (const listener of listeners) {
        if (!AUDITED_LISTENERS.has(listener.type) || listener.passive) continue;
        found.push({
          target,
          type: listener.type,
          passive: listener.passive,
          useCapture: listener.useCapture,
          scriptId: listener.scriptId,
          lineNumber: listener.lineNumber,
          columnNumber: listener.columnNumber,
        });
      }
    }
    return found;
  } finally {
    await cdp.detach();
  }
}

// ---------------------------------------------------------------------------------------------
// History writes and canvas pixels

export interface HistoryWrites {
  push: number;
  replace: number;
  /** "push /exhibit/verafin/" style entries, in call order. */
  calls: string[];
}

declare global {
  interface Window {
    __HISTORY_WRITES__?: HistoryWrites;
  }
}

/**
 * Counts `history.pushState` and `replaceState` calls in every document the page loads from now
 * on (an init script wraps both before any app code runs). Call it before `page.goto`. Returns a
 * reader for the current document's counts.
 */
export async function countHistoryWrites(page: Page): Promise<() => Promise<HistoryWrites>> {
  await page.addInitScript(() => {
    const writes: HistoryWrites = { push: 0, replace: 0, calls: [] };
    window.__HISTORY_WRITES__ = writes;
    const push = history.pushState;
    const replace = history.replaceState;
    history.pushState = function (this: History, ...args: Parameters<History['pushState']>) {
      writes.push++;
      writes.calls.push(`push ${String(args[2] ?? '')}`);
      return push.apply(this, args);
    };
    history.replaceState = function (this: History, ...args: Parameters<History['replaceState']>) {
      writes.replace++;
      writes.calls.push(`replace ${String(args[2] ?? '')}`);
      return replace.apply(this, args);
    };
  });
  return () => page.evaluate(() => window.__HISTORY_WRITES__ ?? { push: 0, replace: 0, calls: [] });
}

/**
 * Mean relative luminance (0 to 1, Rec. 709 weights on sRGB values) of the center 64 x 64 CSS px
 * of the canvas, from a screenshot clip. Used by the context-loss recovery spec (§13.9).
 */
export async function canvasLuminance(page: Page, canvas = museumCanvas(page)): Promise<number> {
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvasLuminance: the canvas is not visible');
  const size = 64;
  const png = await page.screenshot({
    clip: {
      x: box.x + box.width / 2 - size / 2,
      y: box.y + box.height / 2 - size / 2,
      width: size,
      height: size,
    },
    scale: 'css',
    animations: 'disabled',
  });
  const { default: sharp } = await import('sharp');
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let sum = 0;
  for (let i = 0; i + 2 < data.length; i += info.channels) {
    sum += 0.2126 * (data[i] ?? 0) + 0.7152 * (data[i + 1] ?? 0) + 0.0722 * (data[i + 2] ?? 0);
  }
  return sum / (info.width * info.height) / 255;
}
