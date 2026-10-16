// What the demand frame loop needs right now (ARCHITECTURE §8.5, EXPERIENCE §6.7, §9.4), pure so
// it is unit-tested. FrameDriver evaluates it on every animation frame while it runs and on every
// wake-up (input, store change, visibility, the sheet flag), and publishes the result here, so
// QualityController and the kit can follow it without a store change.
//
//   paused   the tab is hidden, the phone sheet is open or the context is lost: no frames at all
//   full     the camera moves, a scripted glide runs, or a mount is compiling: every frame
//   idle     only idle motion runs: every frame on fine pointers, 30 fps on coarse pointers
//   stopped  settled and idle for idleStopMs (15 s), or idle motion is off: zero frames

export type FrameDemand = 'paused' | 'full' | 'idle' | 'stopped';

/** |progress.current - progress.target| above this (stop units) means the camera still moves. */
export const MOVING_EPSILON = 0.0005;

/** Coarse-pointer idle motion runs at 30 fps (EXPERIENCE §9.4). */
export const COARSE_IDLE_INTERVAL_MS = 1000 / 30;

/**
 * Frames arrive on vsync, so a frame due at 33.3 ms may come a little early: with this slack the
 * idle cadence lands on every 2nd frame at 60 Hz, every 3rd at 90 Hz and every 4th at 120 Hz.
 */
export const FRAME_SLACK_MS = 4;

/** Input writes to the store's lastInputAt are spaced at least this far apart. */
export const INPUT_WRITE_INTERVAL_MS = 100;

export interface FrameDemandInput {
  hidden: boolean;
  sheetOpen: boolean;
  contextLost: boolean;
  moving: boolean;
  compiling: boolean;
  /** Idle motion is allowed at all (see `motionAllowed`). */
  motionAllowed: boolean;
  /** Milliseconds since the last input. */
  sinceInputMs: number;
  idleStopMs: number;
}

export function frameDemand(input: FrameDemandInput): FrameDemand {
  if (input.hidden || input.sheetOpen || input.contextLost) return 'paused';
  if (input.moving || input.compiling) return 'full';
  if (idleMotionActive(input)) return 'idle';
  return 'stopped';
}

/**
 * True while exhibits may run their idle motion: allowed, the tab visible and an input within
 * the last idleStopMs. This is the `motionActive` FrameDriver publishes; the kit's runtime
 * (useExhibitRuntime) derives `runtime.motion` from the same store field, `lastInputAt`.
 */
export function idleMotionActive(
  input: Pick<FrameDemandInput, 'hidden' | 'motionAllowed' | 'sinceInputMs' | 'idleStopMs'>,
): boolean {
  return !input.hidden && input.motionAllowed && input.sinceInputMs < input.idleStopMs;
}

export interface MotionPolicy {
  reducedMotion: boolean;
  /** ?test=1 */
  test: boolean;
  /** &idle=1 re-enables idle motion under ?test=1. */
  idleParam: boolean;
  tier: 'low' | 'medium' | 'high';
}

/** Idle motion is off under reduced motion, ?test=1 without &idle=1, and on tier low (§5.1). */
export function motionAllowed(policy: MotionPolicy): boolean {
  return !(policy.reducedMotion || (policy.test && !policy.idleParam) || policy.tier === 'low');
}

/** The camera is still travelling toward the scroll target, or a scripted glide runs. */
export function cameraMoving(current: number, target: number, gliding: boolean): boolean {
  return gliding || Math.abs(current - target) > MOVING_EPSILON;
}

/** In the idle state: is a frame due now? Every frame on fine pointers, 30 fps on coarse ones. */
export function idleFrameDue(now: number, lastIdleFrame: number, coarse: boolean): boolean {
  if (!coarse) return true;
  return now - lastIdleFrame >= COARSE_IDLE_INTERVAL_MS - FRAME_SLACK_MS;
}

// ---------------------------------------------------------------------------------------------
// The published frame state (written only by FrameDriver)

export interface FrameState {
  demand: FrameDemand;
  /** Increments whenever `demand` changes: each steady run gets its own PerformanceMonitor. */
  run: number;
  /** See idleMotionActive. */
  motionActive: boolean;
}

let state: FrameState = { demand: 'stopped', run: 0, motionActive: false };
const listeners = new Set<() => void>();

export function frameState(): FrameState {
  return state;
}

/** FrameDriver publishes here; listeners hear only real changes. */
export function publishFrameState(demand: FrameDemand, motionActive: boolean): void {
  if (demand === state.demand && motionActive === state.motionActive) return;
  state = { demand, run: demand === state.demand ? state.run : state.run + 1, motionActive };
  for (const listener of listeners) listener();
}

/** For useSyncExternalStore; returns the unsubscribe function. */
export function subscribeFrameState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
