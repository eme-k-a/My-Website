// The pure rules behind useExhibitClock (kept apart from the hook so Node tests never load R3F).
import { testParams } from '../../../app/testHooks';

/** The longest step one frame may add, so a tab switch never jumps the animation. */
export const MAX_CLOCK_STEP_S = 0.1;

/** True under ?test=1 without &idle=1: the clock stays at 0. */
export function clockFrozen(search: string): boolean {
  const params = testParams(search);
  return params.test && !params.idle;
}

/** The next clock value after a frame of `delta` seconds. */
export function advanceClock(seconds: number, delta: number, running: boolean): number {
  if (!running || !(delta > 0)) return seconds;
  return seconds + Math.min(delta, MAX_CLOCK_STEP_S);
}
