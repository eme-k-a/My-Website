// Per-frame rail values live outside React (ARCHITECTURE §5.5): a mutable singleton read inside
// useFrame. The scroll listener writes `target`; CameraRig damps `current` toward it. Both are in
// stop units of `track` (inside a wing, index 0 is its door). Pure data, safe in the entry chunk.
import type { TrackId } from '../../content/ids';

export const progress = { target: 0, current: 0, track: 'main' as TrackId };

/** easeInOutCubic, the easing of the scripted glides (EXPERIENCE §6.5). */
export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/** A scripted glide (wing entry and exit, ARCHITECTURE §6.7), played by CameraRig. */
export interface Glide {
  /** Progress on `progress.track` at the start and the end. */
  from: number;
  to: number;
  /** Duration in ms; easeInOutCubic. */
  ms: number;
  /** performance.now() of the first frame, set by CameraRig. */
  start: number | null;
  /** Called once when the glide ends (or is dropped). */
  done: () => void;
}

/**
 * The channel between navigation (entry chunk) and CameraRig (museum chunk). `attached` is true
 * while a CameraRig is mounted; without one, navigation skips glides instead of waiting for them.
 */
export const rig = {
  attached: false,
  glide: null as Glide | null,
  /** The next frame sets `current = target` without damping (instant travel, cold load). */
  teleport: false,
};

let waker: (() => void) | null = null;

/** CameraRig registers R3F's `invalidate` here; returns the unregister function. */
export function setWaker(fn: () => void): () => void {
  waker = fn;
  return () => {
    if (waker === fn) waker = null;
  };
}

/** Asks for a frame (frameloop="demand"); a no-op until the canvas is mounted. */
export function wake(): void {
  waker?.();
}

/** Ends the current glide, if any, and calls its `done`. */
export function finishGlide(): void {
  const glide = rig.glide;
  if (!glide) return;
  rig.glide = null;
  glide.done();
}
