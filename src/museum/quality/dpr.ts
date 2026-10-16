// DPR adaptation rules (ARCHITECTURE §8.4), pure so they are unit-tested. The tier never changes;
// only the device pixel ratio moves, in 0.25 steps between 1 and the start value
// `min(devicePixelRatio, maxDpr)`. QualityController feeds these with drei's PerformanceMonitor
// incline and decline events and applies the result with R3F's setDpr.
//
// The flip-flop limit is counted here, over real DPR changes across every sampling run, instead
// of with drei's own `flipflops` prop: drei increments its counter on every incline even when the
// DPR is already at its cap, so a fast device would trip `flipflops={3}` (and be locked at DPR 1)
// after about ten seconds of smooth rendering, and its counter restarts with each monitor mount.

export const DPR_STEP = 0.25;
export const DPR_FLOOR = 1;
/** More real DPR changes than this in one session lock the DPR at the floor (drei's `flipflops`). */
export const FLIPFLOPS = 3;

export interface DprState {
  /** The DPR applied now. */
  dpr: number;
  /** The ceiling inclines climb back to: `min(devicePixelRatio, maxDpr)`. */
  max: number;
  /** Real DPR changes so far (no-op events at a bound do not count). */
  changes: number;
  /** After the flip-flop limit (drei's onFallback): fixed at the floor for the session. */
  locked: boolean;
}

/** The floor never sits above the start value (a device ratio below 1 keeps its own ratio). */
const floorOf = (state: Pick<DprState, 'max'>): number => Math.min(DPR_FLOOR, state.max);

export function initialDprState(start: number): DprState {
  return { dpr: start, max: start, changes: 0, locked: false };
}

/** One PerformanceMonitor verdict: incline raises the DPR one step, decline lowers it. */
export function adaptDpr(state: DprState, direction: 'incline' | 'decline'): DprState {
  if (state.locked) return state;
  const next =
    direction === 'incline'
      ? Math.min(state.max, state.dpr + DPR_STEP)
      : Math.max(floorOf(state), state.dpr - DPR_STEP);
  if (next === state.dpr) return state;
  const changes = state.changes + 1;
  if (changes > FLIPFLOPS) return lockDpr({ ...state, changes });
  return { ...state, dpr: next, changes };
}

/** onFallback: the DPR stays at the floor for the rest of the session. */
export function lockDpr(state: DprState): DprState {
  return { ...state, dpr: floorOf(state), locked: true };
}

/** What the frame driver is doing (FrameDriver.tsx); only steady rendering is sampled. */
export type SampledDemand = 'full' | 'idle';

/** drei's default bounds: [lower, upper] fps for a refresh rate. */
export const defaultBounds = (refreshRate: number): [number, number] =>
  refreshRate > 100 ? [60, 100] : [40, 60];

/**
 * Bounds for coarse-pointer idle motion, which FrameDriver paces at 30 fps on purpose. drei counts
 * one frame more than the window holds, so a phone that keeps up reads about 33 to 34 fps here;
 * below 27 it is missing frames (under about 25 real fps).
 */
export const IDLE_30_BOUNDS: [number, number] = [27, 30];

/** The PerformanceMonitor bounds for a sampling run, or null when the run must not be sampled. */
export function monitorBounds(
  demand: string,
  coarse: boolean,
): ((refreshRate: number) => [number, number]) | null {
  if (demand === 'full') return defaultBounds;
  if (demand === 'idle') return coarse ? () => IDLE_30_BOUNDS : defaultBounds;
  return null;
}
