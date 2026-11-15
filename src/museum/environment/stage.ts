// Stage height rule (ARCHITECTURE §10.3): the stage is 100lvh, pinned in px through --stage-h, and
// re-measured only when the width changes, or on coarse pointers when the height changes by 20%
// or more. So the iOS address bar collapsing never resizes the drawing buffer mid-scroll. Fine
// pointers (desktop windows) re-measure on every resize.

/** Height-only changes below this fraction are ignored on coarse pointers. */
export const STAGE_HEIGHT_CHANGE = 0.2;

export interface ViewportSize {
  width: number;
  height: number;
}

export function shouldRemeasureStage(
  last: ViewportSize,
  next: ViewportSize,
  coarse: boolean,
): boolean {
  if (next.width !== last.width) return true;
  if (next.height === last.height) return false;
  if (!coarse) return true;
  if (last.height <= 0) return true;
  return Math.abs(next.height - last.height) / last.height >= STAGE_HEIGHT_CHANGE;
}

/**
 * The vignette layer over the canvas (EXPERIENCE §7.5, ARCHITECTURE §8.6): CSS only, fixed to the
 * stage, never a pointer target, its gradient from the `--vignette` token. A child element instead
 * of `.stage::after`, for the same reason the stage style is inline (no museum CSS file).
 */
export function vignetteStyle(): Record<string, string | number> {
  return {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    background: 'var(--vignette)',
  };
}

/**
 * The stage's inline style (ARCHITECTURE §6.1, §10.3): fixed under the track (z-index 1), 100lvh
 * tall through --stage-h, transparent until `ready`, then a 600 ms fade (none under reduced motion
 * and ?test=1). Inline rather than a CSS module: a stylesheet would turn the museum chunk into a
 * JS plus CSS pair, and a blocked or failed museum load would then also fail on the CSS preload.
 */
export function stageStyle(ready: boolean, instant: boolean): Record<string, string | number> {
  return {
    position: 'fixed',
    inset: 0,
    height: 'var(--stage-h, 100lvh)',
    zIndex: 0,
    background: 'var(--ink)',
    opacity: ready ? 1 : 0,
    transition: instant ? 'none' : 'opacity var(--dur-slow) var(--ease-out)',
  };
}
