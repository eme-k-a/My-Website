// The dialog dolly (EXPERIENCE §6.5, §6.6): when a story opens, the camera moves
// `tokens.camera.dialogDollyM` (0.6 m) from its stop pose toward the slot center over
// `tokens.motion.dialogOpenS` (0.9 s, easeInOutCubic); when it closes, back over `dialogCloseS`
// (0.8 s). Instant under reduced motion. CameraRig applies the distance along the gaze direction;
// the stop pose itself never changes, so the dolly is not rail movement. Pure, unit-tested.
import { tokens } from '../../design/tokens';
import { easeInOutCubic } from './progress';

export interface Dolly {
  /** Meters toward the slot center now. */
  value: number;
  from: number;
  to: number;
  /** performance.now() of the move's first frame, or null until it starts. */
  start: number | null;
  ms: number;
}

export const createDolly = (): Dolly => ({ value: 0, from: 0, to: 0, start: null, ms: 0 });

/** Points the dolly in (story open) or out (closed); a no-op when it already heads there. */
export function aimDolly(dolly: Dolly, open: boolean, reducedMotion: boolean): void {
  const to = open ? tokens.camera.dialogDollyM : 0;
  if (reducedMotion) {
    Object.assign(dolly, { value: to, from: to, to, start: null, ms: 0 });
    return;
  }
  if (dolly.to === to) return;
  dolly.from = dolly.value;
  dolly.to = to;
  dolly.start = null;
  dolly.ms = (open ? tokens.motion.dialogOpenS : tokens.motion.dialogCloseS) * 1000;
}

/** Advances the dolly to `now`; returns true while it is still moving. */
export function stepDolly(dolly: Dolly, now: number): boolean {
  if (dolly.value === dolly.to) {
    dolly.start = null;
    return false;
  }
  dolly.start ??= now;
  const t = dolly.ms > 0 ? Math.min(1, (now - dolly.start) / dolly.ms) : 1;
  dolly.value = t >= 1 ? dolly.to : dolly.from + (dolly.to - dolly.from) * easeInOutCubic(t);
  return dolly.value !== dolly.to;
}
