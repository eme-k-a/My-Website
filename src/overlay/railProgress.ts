// Feeds the HUD (the desktop bead, the phone bar and year chip) from the camera's damped progress
// (`progress.current`, written by CameraRig inside the canvas, ARCHITECTURE §5.5). The values live
// outside React, so listeners write styles directly and React never re-renders per frame.
// A requestAnimationFrame loop runs only while the value moves: a passive `scroll` listener or a
// store change wakes it, and it stops after 30 still frames. No wheel or touch listeners.
import { useMuseum } from '../app/store';
import { progress } from '../museum/rail/progress';

export type ProgressListener = (current: number) => void;

const listeners = new Set<ProgressListener>();
let frame = 0;
let stillFrames = 0;
let last = Number.NaN;
let unsubscribeStore: (() => void) | null = null;

function tick() {
  const current = progress.current;
  if (current !== last) {
    last = current;
    stillFrames = 0;
    for (const listener of listeners) listener(current);
  } else {
    stillFrames++;
  }
  frame = stillFrames < 30 && listeners.size > 0 ? requestAnimationFrame(tick) : 0;
}

function wake() {
  stillFrames = 0;
  if (frame === 0 && listeners.size > 0) frame = requestAnimationFrame(tick);
}

/** Calls `listener` now and whenever `progress.current` changes; returns the unsubscribe. */
export function watchRailProgress(listener: ProgressListener): () => void {
  listeners.add(listener);
  listener(progress.current);
  if (listeners.size === 1) {
    window.addEventListener('scroll', wake, { passive: true });
    unsubscribeStore = useMuseum.subscribe(wake);
  }
  wake();
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    window.removeEventListener('scroll', wake);
    unsubscribeStore?.();
    unsubscribeStore = null;
    if (frame !== 0) cancelAnimationFrame(frame);
    frame = 0;
    last = Number.NaN;
  };
}
