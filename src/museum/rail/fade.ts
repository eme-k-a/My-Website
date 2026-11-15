// The fade-cut (EXPERIENCE §6.5, §6.6; ARCHITECTURE §6.5, §10.4): ScrollTrack's fixed ink layer
// over the canvas goes to ink over half of `tokens.motion.fadeCutMs` (100 ms), the camera pose
// swaps at ink, and the layer fades back over the other 100 ms. Reduced motion uses it for every
// stop change (no in-between camera poses); HUD jumps of more than 3 stops use it instead of a
// fly-through. Pure DOM-free timing, safe in the entry chunk.
import { tokens } from '../../design/tokens';

/** `out`: fading to ink; `in`: fading back; `clear`: no cut running. */
export type FadePhase = 'clear' | 'out' | 'in';

let phase: FadePhase = 'clear';
let atInk: (() => void)[] = [];
let finished: (() => void)[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<(phase: FadePhase) => void>();

/** Half of the 200 ms cut: the time to ink, and the time back. */
export const fadeHalfMs = (): number => tokens.motion.fadeCutMs / 2;

export function fadePhase(): FadePhase {
  return phase;
}

/** Calls `listener` on every phase change; returns the unsubscribe function. */
export function onFade(listener: (phase: FadePhase) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setPhase(next: FadePhase): void {
  phase = next;
  listeners.forEach((listener) => listener(next));
}

function finish(): void {
  timer = undefined;
  setPhase('clear');
  const done = finished;
  finished = [];
  done.forEach((resolve) => resolve());
}

function reachInk(): void {
  const swaps = atInk;
  atInk = [];
  for (const swap of swaps) {
    try {
      swap();
    } catch (error) {
      console.warn('fade-cut swap failed', error);
    }
  }
  setPhase('in');
  timer = setTimeout(finish, fadeHalfMs());
}

/**
 * Fades to ink, runs `swap` there, and fades back; resolves once the layer is clear again. A cut
 * requested while another is still fading out joins it (both swaps run at the same ink); one
 * requested while the layer fades back starts a new fade out.
 */
export function fadeCut(swap: () => void): Promise<void> {
  return new Promise((resolve) => {
    finished.push(resolve);
    atInk.push(swap);
    if (phase === 'out') return;
    if (timer !== undefined) clearTimeout(timer);
    setPhase('out');
    timer = setTimeout(reachInk, fadeHalfMs());
  });
}

/** Ends any cut at once, running pending swaps (tests, unmount). */
export function resetFade(): void {
  if (timer !== undefined) clearTimeout(timer);
  timer = undefined;
  if (atInk.length > 0) reachInk();
  if (timer !== undefined) clearTimeout(timer);
  finish();
}
