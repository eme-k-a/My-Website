// The definition of "settled" (ARCHITECTURE §6.3, EXPERIENCE §6.4), pure so it can be pinned by
// unit tests. CameraRig evaluates it every frame and writes `settled` and `stop` on change. Also
// when the rig still needs frames under the demand loop.

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

// ---------------------------------------------------------------------------------------------
// When the rig needs frames (F-012)

export interface FrameNeedInput {
  /** Where the rail is: progress.current, or the held stop under reduced motion. */
  current: number;
  /** Where it heads: progress.target, or the held stop under reduced motion. */
  goal: number;
  /** Meters the camera moved in the last frame, the gaze turn included. */
  moved: number;
  /** A scripted glide or a reduced-motion fade-cut is playing. */
  gliding: boolean;
}

/**
 * True while the rail still moves the camera: a glide or a cut plays, the damped progress has not
 * reached its goal, or the camera (or its gaze) moved in the last frame. False once the camera
 * holds the pose for the current scroll progress, also when the scroll rests between two stops
 * (`settled` stays false there, but nothing is left to draw). Settling is not a reason to draw:
 * CameraRig asks for one more frame when `compilePending` or `ready` changes.
 */
export function railNeedsFrame(input: FrameNeedInput): boolean {
  const { current, goal, moved, gliding } = input;
  return gliding || !(Math.abs(current - goal) < SETTLE.progress) || !(moved < SETTLE.moved);
}
