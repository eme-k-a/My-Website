// The onboarding hint (EXPERIENCE §8.3): 1.2 s after `ready` (at once under ?test=1) a hint shows
// at the bottom of the lobby: "Scroll to walk through my work" on fine pointers, "Swipe up to walk"
// on coarse ones (Intro's CSS picks between the two, so the prerender and hydration agree), or
// "Scroll, or press" plus the down-arrow icon once any key has been pressed. It hides once the
// visitor leaves the lobby section (an arrival elsewhere, EXPERIENCE §6.4) and comes back after
// 8 s idle in the lobby. Intro.tsx calls `useHint()`. Entry chunk: no three.js.
import { useSyncExternalStore, type CSSProperties } from 'react';
import { useMuseum, type MuseumState } from '../../app/store';
import { testParams } from '../../app/testHooks';

/** The hint shows this long after `ready` (EXPERIENCE §8.3). */
export const HINT_DELAY_MS = 1200;
/** After the visitor has left the lobby, the hint returns after this long idle in it. */
export const HINT_IDLE_MS = 8000;

export type HintVariant = 'fine' | 'coarse' | 'keys';

export interface HintState {
  visible: boolean;
  variant: HintVariant;
  /** ?test=1: the hint appears with no fade. */
  instant: boolean;
}

export interface HintTiming {
  now: number;
  /** performance.now() when the gallery became ready. */
  readyAt: number;
  test: boolean;
  /** The visitor has left the lobby section since the gallery became ready. */
  left: boolean;
  /** The later of the last input and the return to the lobby. */
  quietSince: number;
}

/** Milliseconds until the hint shows in the lobby (0 or less: show it now). */
export function hintWait({ now, readyAt, test, left, quietSince }: HintTiming): number {
  if (!left) return test ? 0 : readyAt + HINT_DELAY_MS - now;
  return quietSince + HINT_IDLE_MS - now;
}

/** The hint's copy variant: keys once a key was pressed, else by the primary pointer. */
export function hintVariant(keyPressed: boolean, coarse: boolean): HintVariant {
  if (keyPressed) return 'keys';
  return coarse ? 'coarse' : 'fine';
}

const isTest = () => typeof window !== 'undefined' && testParams(window.location.search).test;
const isCoarse = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

// The hint's state lives outside React (an external store read with useSyncExternalStore): it
// follows the museum store and its own timers. The prerender and the first client render read the
// same initial snapshot, so hydration matches; the first subscription installs the controller.

interface Snapshot {
  visible: boolean;
  keyPressed: boolean;
  coarse: boolean;
  test: boolean;
}

const INITIAL: Snapshot = { visible: false, keyPressed: false, coarse: false, test: false };
let snapshot = INITIAL;
const listeners = new Set<() => void>();

function update(patch: Partial<Snapshot>): void {
  const next = { ...snapshot, ...patch };
  const keys = Object.keys(patch) as (keyof Snapshot)[];
  if (keys.every((key) => next[key] === snapshot[key])) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

/** The controller's per-install memory. */
const run = {
  readyAt: null as number | null,
  left: false,
  inLobby: null as boolean | null,
  back: 0,
  timer: 0,
  offStore: null as (() => void) | null,
};

function schedule(): void {
  const wait = hintWait({
    now: performance.now(),
    readyAt: run.readyAt ?? performance.now(),
    test: snapshot.test,
    left: run.left,
    quietSince: Math.max(run.back, useMuseum.getState().lastInputAt),
  });
  if (wait <= 0) update({ visible: true });
  else run.timer = window.setTimeout(schedule, wait);
}

function follow(state: MuseumState): void {
  // Any key press sets `inputSource: 'keyboard'` (keys.ts); the variant stays `keys` from then on.
  if (state.inputSource === 'keyboard') update({ keyPressed: true });
  if (!state.ready) return;
  run.readyAt ??= performance.now();
  const inLobby = state.track === 'main' && state.stop === 'lobby';
  if (inLobby === run.inLobby) return;
  run.inLobby = inLobby;
  window.clearTimeout(run.timer);
  if (!inLobby) {
    run.left = true;
    update({ visible: false });
    return;
  }
  run.back = performance.now();
  schedule();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (!run.offStore) {
    update({ test: isTest(), coarse: isCoarse() });
    run.offStore = useMuseum.subscribe(follow);
    follow(useMuseum.getState());
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0 || !run.offStore) return;
    run.offStore();
    window.clearTimeout(run.timer);
    Object.assign(run, { readyAt: null, left: false, inLobby: null, back: 0, offStore: null });
    snapshot = INITIAL;
  };
}

const getSnapshot = () => snapshot;
const getServerSnapshot = () => INITIAL;

export function useHint(): HintState {
  const { visible, keyPressed, coarse, test } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return { visible, variant: hintVariant(keyPressed, coarse), instant: test };
}

/**
 * The hint element's inline style: hidden (and out of the accessibility tree) until it shows, then
 * a fade over --dur-slow (none under ?test=1). Inline, so Intro's CSS module stays R6's.
 */
export function hintStyle({ visible, instant }: HintState): CSSProperties {
  return {
    visibility: visible ? 'visible' : 'hidden',
    opacity: visible ? 1 : 0,
    transition: instant
      ? 'none'
      : 'opacity var(--dur-slow) var(--ease-out), visibility var(--dur-slow) var(--ease-out)',
  };
}
