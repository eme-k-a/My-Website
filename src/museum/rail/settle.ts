// The definition of "settled" (ARCHITECTURE §6.3, EXPERIENCE §6.4), pure so it can be pinned by
// unit tests. CameraRig evaluates it every frame and writes `settled` and `stop` on change.

/** ARCHITECTURE §6.3 thresholds. */
export const SETTLE = {
  /** |current - target| below this, in stop units. */
  progress: 0.001,
  /** The target within this of a whole stop. */
  whole: 0.02,
  /** Camera movement in the last frame below this, in meters (0.1 mm). */
  moved: 0.0001,
} as const;

export interface SettleInput {
  current: number;
  target: number;
  /** Meters the camera moved in the last frame. */
  moved: number;
  /** Exhibits mounted but not yet compiled (the store's `compilePending`). */
  compilePending: number;
  /** A scripted glide is playing. */
  gliding: boolean;
}

/** The index of the stop the rail is settled at, or null while it is not settled. */
export function settledStop(input: SettleInput): number | null {
  const { current, target, moved, compilePending, gliding } = input;
  const nearest = Math.round(target);
  const settled =
    !gliding &&
    Math.abs(current - target) < SETTLE.progress &&
    Math.abs(target - nearest) < SETTLE.whole &&
    moved < SETTLE.moved &&
    compilePending === 0;
  return settled ? nearest : null;
}
