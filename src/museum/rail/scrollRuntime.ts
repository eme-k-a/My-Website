// The DOM side of the scroll mapping (ARCHITECTURE §6.2, EXPERIENCE §6.1): measures the active
// track's sections and runs the one passive `scroll` listener that writes `progress.target`,
// `lastInputAt` and asks for a frame. Section positions are real measurements (never
// `i * innerHeight`), taken on install, by a ResizeObserver on #track, after `document.fonts.ready`
// and on resize. On touch screens a height-only resize under 20% (the address bar) is ignored
// (ARCHITECTURE §10.3). No wheel or touch listeners: input is the browser's own scroll.
import { useMuseum } from '../../app/store';
import type { StopId, TrackId } from '../../content/ids';
import { content } from '../../content/index';
import { mainTrack, wingTrack } from '../../content/selectors';
import { progress, rig, wake } from './progress';
import { holdPositions, progressFromScroll, stopPositions } from './scrollMap';

/** The stops of a track in order: the main stops, or `[<wing>-door, ...items]`. */
export function trackStops(track: TrackId): StopId[] {
  return track === 'main' ? mainTrack(content) : wingTrack(content, track);
}

export interface ScrollMeasure {
  track: TrackId;
  ids: StopId[];
  /** Scroll position of each stop (ARCHITECTURE §6.2). */
  stopY: number[];
  /** Where each stop's hold ends (scrollMap.ts); equals stopY unless a section overflows. */
  holdY: number[];
  /** The viewport height the positions were measured with. */
  viewportHeight: number;
}

/** The latest measurement of the active track. */
export const measured: ScrollMeasure = {
  track: 'main',
  ids: [],
  stopY: [],
  holdY: [],
  viewportHeight: 0,
};

export const sectionOf = (id: StopId): HTMLElement | null => document.getElementById(`stop-${id}`);

/** Measures the sections of the store's active track. */
export function measure(): ScrollMeasure {
  const track = useMuseum.getState().track;
  const ids = trackStops(track);
  const scrollY = window.scrollY;
  const tops: number[] = [];
  const heights: number[] = [];
  for (const id of ids) {
    const rect = sectionOf(id)?.getBoundingClientRect();
    tops.push(rect ? rect.top + scrollY : (tops.at(-1) ?? 0));
    heights.push(rect ? rect.height : 0);
  }
  const viewportHeight = window.innerHeight;
  const stopY = stopPositions(tops, document.documentElement.scrollHeight, viewportHeight);
  Object.assign(measured, {
    track,
    ids,
    stopY,
    holdY: holdPositions(stopY, heights, viewportHeight),
    viewportHeight,
  });
  return measured;
}

/** Progress for the current scroll position on the measured track. */
export function progressNow(): number {
  return progressFromScroll(window.scrollY, measured.stopY, measured.holdY);
}

/**
 * Writes `progress.target` from the current scroll position. With `teleport`, the camera jumps
 * there on the next frame instead of damping (instant travel, cold load, track swaps).
 */
export function syncTarget(teleport = false): void {
  progress.target = progressNow();
  if (teleport) {
    progress.current = progress.target;
    rig.teleport = true;
  }
  wake();
}

/** The scroll position that brings stop `index` of the measured track to the top. */
export function stopScrollY(index: number): number {
  return measured.stopY[Math.max(0, Math.min(measured.stopY.length - 1, index))] ?? 0;
}

function onScroll(): void {
  progress.target = progressNow();
  useMuseum.setState({ lastInputAt: performance.now() });
  wake();
}

/**
 * Installs the measurement and the passive scroll listener (ScrollTrack calls this once, after
 * hydration). Returns the uninstall function.
 */
export function installScrollMap(): () => void {
  let cancelled = false;
  const coarse = window.matchMedia('(pointer: coarse)');
  let width = window.innerWidth;
  let height = window.innerHeight;
  const remeasure = () => {
    if (cancelled) return;
    measure();
    syncTarget();
  };
  const onResize = () => {
    const nextWidth = window.innerWidth;
    const nextHeight = window.innerHeight;
    const heightOnly = nextWidth === width;
    const small = Math.abs(nextHeight - height) < 0.2 * height;
    if (coarse.matches && heightOnly && small) return;
    width = nextWidth;
    height = nextHeight;
    remeasure();
  };

  measure();
  // The page loads wherever the browser put it (a reload keeps the stop): no glide from the lobby.
  syncTarget(true);

  // Back/forward cache (ARCHITECTURE §10.2): re-read the scroll position, jump there.
  const onPageShow = (event: PageTransitionEvent) => {
    if (!event.persisted || cancelled) return;
    measure();
    syncTarget(true);
  };

  const track = document.getElementById('track');
  const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(remeasure) : null;
  if (track) observer?.observe(track);
  void document.fonts?.ready.then(remeasure);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('pageshow', onPageShow);
  return () => {
    cancelled = true;
    observer?.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pageshow', onPageShow);
  };
}
