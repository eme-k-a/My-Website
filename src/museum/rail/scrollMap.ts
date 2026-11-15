// Scroll-to-progress mapping (ARCHITECTURE §6.2, EXPERIENCE §6.1). Pure: no window, no DOM, no
// three.js, so the entry chunk can use it and Node tests can pin it. The DOM side (measuring the
// sections, the one passive scroll listener) lives in scrollRuntime.ts.
//
// stopY[i] is the scroll position at which stop i is reached: its section's real top, clamped to
// the largest scroll position (the last sections may not reach the top of the viewport). Progress
// in stop units is piecewise linear between consecutive stops and clamped to [0, N - 1].
//
// A section taller than the viewport (the lobby on phones grows past 100svh, F-008) holds its stop
// while its own overflow scrolls by: from stopY[i] to holdY[i] = stopY[i] + (height - viewport)
// the progress stays i, and only the rest of the way to stopY[i + 1] moves the camera. Without
// such a section holdY equals stopY and the mapping is exactly ARCHITECTURE §6.2.

/** `stopY[i] = min(top[i], scrollHeight - viewportHeight)`, never below 0. */
export function stopPositions(
  tops: readonly number[],
  scrollHeight: number,
  viewportHeight: number,
): number[] {
  const maxY = Math.max(0, scrollHeight - viewportHeight);
  return tops.map((top) => Math.max(0, Math.min(top, maxY)));
}

/**
 * Where each stop's hold ends: `stopY[i]` plus the part of section i that does not fit in the
 * viewport, never past the next stop. The last stop holds nothing (there is no next stop).
 */
export function holdPositions(
  stopY: readonly number[],
  heights: readonly number[],
  viewportHeight: number,
): number[] {
  return stopY.map((y, i) => {
    const next = stopY[i + 1];
    if (next === undefined) return y;
    const overflow = Math.max(0, (heights[i] ?? 0) - viewportHeight);
    return Math.min(y + overflow, next);
  });
}

/**
 * Progress in stop units for scroll position `y`: for `holdY[i] <= y < stopY[i + 1]`,
 * `p = i + (y - holdY[i]) / (stopY[i + 1] - holdY[i])`; `i` from `stopY[i]` to `holdY[i]`.
 * Clamped to `[0, N - 1]`; 0 with no stops. `holdY` defaults to `stopY` (no holds).
 */
export function progressFromScroll(
  y: number,
  stopY: readonly number[],
  holdY: readonly number[] = stopY,
): number {
  const last = stopY.length - 1;
  if (last <= 0) return 0;
  if (!(y > stopY[0]!)) return 0;
  if (y >= stopY[last]!) return last;
  let i = 0;
  while (i < last - 1 && y >= stopY[i + 1]!) i++;
  const from = Math.max(stopY[i]!, holdY[i] ?? stopY[i]!);
  const to = stopY[i + 1]!;
  if (y <= from) return i;
  if (to <= from) return i + 1;
  return i + (y - from) / (to - from);
}

/** The index of the stop whose position is nearest to `y` (the first one on a tie). */
export function nearestStop(y: number, stopY: readonly number[]): number {
  let best = 0;
  for (let i = 1; i < stopY.length; i++) {
    if (Math.abs(stopY[i]! - y) < Math.abs(stopY[best]! - y)) best = i;
  }
  return best;
}
