// Framing (EXPERIENCE §6.2, ARCHITECTURE §6.4) is a projection shift, never a pose change: the
// camera always looks straight at its gaze point, and `setViewOffset` moves where that point lands
// on screen, so the pinned layout coordinates stay valid on every aspect and `layout.ts` stays
// aspect-free. The look-at point lands at:
// - aspect >= 1 (desktop): 62% of the width (right of center, away from the card column), 50% of
//   the height (`tokens.camera.framingDesktopX`);
// - portrait: 50% of the width, 36% of the height (the case sits above the card,
//   `tokens.camera.framingPortraitY`);
// - desktop with the story dialog open: the center of the area left of the panel;
// - portrait at the front desk: 50% of the width, `DESK_PORTRAIT_Y` of the height (F-020). The desk
//   is the one stop whose phone card is taller than the 36% point leaves room for, so its look-at
//   point rides higher and the desk top with its four objects clears the card's top edge. The
//   change blends in over the last half of the walk to the desk (`deskWeightAt`).
// Vertical FOV is 50 at aspect >= 1, 68 at aspect <= 0.6, linear in between. CameraRig damps shift
// changes over `tokens.motion.framingSmoothS` (0.4 s). Pure math: three.js only as a type.
import type { PerspectiveCamera } from 'three';
import { tokens } from '../../design/tokens';

/** A point on screen as fractions of the viewport, from the top left. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** The dialog frames into the area left of its panel only when that area keeps this share. */
export const MIN_LEFT_AREA = 0.25;

/**
 * Portrait framing height at the front desk (F-020). At 412 x 839 (Pixel 7) it keeps the end-wall
 * line clear of the HUD while the desk top sits above the (shortened) phone desk card.
 */
export const DESK_PORTRAIT_Y = 0.34;

/** The stop that gets the desk framing. */
const DESK_ID = 'desk';

/** Hermite smoothstep of `x` between `edge0` and `edge1`, clamped to [0, 1]. */
function smooth(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * How far the desk framing applies at progress `p` on a track whose stop ids are `ids`: 0 away
 * from the desk, 1 at it, and a smoothstep over the half stop next to it (the same half of the
 * walk in which the gaze turns to the desk, EXPERIENCE §6.3).
 */
export function deskWeightAt(ids: readonly string[], p: number): number {
  const at = ids.indexOf(DESK_ID);
  if (at < 0 || !Number.isFinite(p)) return 0;
  return 1 - smooth(0, 0.5, Math.abs(p - at));
}

/** Vertical field of view in degrees for a viewport aspect (width / height). */
export function fovFor(aspect: number): number {
  const { fovDesktop, fovPortrait, portraitAspect } = tokens.camera;
  if (!(aspect < 1)) return fovDesktop;
  if (aspect <= portraitAspect) return fovPortrait;
  const t = (aspect - portraitAspect) / (1 - portraitAspect);
  return fovPortrait + (fovDesktop - fovPortrait) * t;
}

/**
 * Where the look-at point lands for a viewport aspect. `panelLeft` is the left edge of the open
 * story panel as a fraction of the width (null while the dialog is closed); a full-width sheet
 * leaves no area to frame into and keeps the normal framing. `desk` is `deskWeightAt` (portrait
 * only; desktop frames the desk like every other stop).
 */
export function framingFor(aspect: number, panelLeft: number | null = null, desk = 0): ScreenPoint {
  if (!(aspect < 1)) {
    if (panelLeft !== null && panelLeft >= MIN_LEFT_AREA && panelLeft < 1) {
      return { x: panelLeft / 2, y: 0.5 };
    }
    return { x: tokens.camera.framingDesktopX, y: 0.5 };
  }
  const w = Math.min(1, Math.max(0, desk));
  const y = tokens.camera.framingPortraitY;
  return { x: 0.5, y: w > 0 ? y + (DESK_PORTRAIT_Y - y) * w : y };
}

/**
 * The `setViewOffset` offset, as fractions of the full view, that moves the view center (where the
 * camera looks) to `point`. With a sub-view as large as the full view at (ox, oy), the full view's
 * center lands at (0.5 - ox, 0.5 - oy).
 */
export function viewOffsetFor(point: ScreenPoint): ScreenPoint {
  return { x: 0.5 - point.x, y: 0.5 - point.y };
}

/**
 * Sets the FOV and the shift (`offset` in fractions of the full view) for a `width` x `height` px
 * view; returns false when nothing changed. `setViewOffset` also sets the aspect to
 * fullWidth / fullHeight, so the full view is given in px, never as a unit square.
 */
export function applyFraming(
  camera: PerspectiveCamera,
  fov: number,
  offset: ScreenPoint,
  width: number,
  height: number,
): boolean {
  const view = camera.view;
  const x = offset.x * width;
  const y = offset.y * height;
  if (
    camera.fov === fov &&
    camera.aspect === width / height &&
    view?.enabled &&
    view.fullWidth === width &&
    view.fullHeight === height &&
    view.width === width &&
    view.height === height &&
    view.offsetX === x &&
    view.offsetY === y
  ) {
    return false;
  }
  camera.fov = fov;
  // setViewOffset updates the aspect and the projection matrix (the FOV change included).
  camera.setViewOffset(width, height, x, y, width, height);
  return true;
}
