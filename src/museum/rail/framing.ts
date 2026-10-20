// Framing (EXPERIENCE §6.2, ARCHITECTURE §6.4) is a projection shift, never a pose change: the
// camera always looks straight at its gaze point, and `setViewOffset` moves where that point lands
// on screen, so the pinned layout coordinates stay valid on every aspect and `layout.ts` stays
// aspect-free. The look-at point lands at:
// - aspect >= 1 (desktop): 62% of the width (right of center, away from the card column), 50% of
//   the height (`tokens.camera.framingDesktopX`);
// - portrait: 50% of the width, 36% of the height (the case sits above the card,
//   `tokens.camera.framingPortraitY`);
// - desktop with the story dialog open: the center of the area left of the panel;
// - portrait at the front desk: 50% of the width, `deskPortraitY` of the height (F-020). The desk
//   is the one stop whose phone card is taller than the 36% point leaves room for. CameraRig
//   measures the band between the HUD's bottom and the desk card's top, and the framing point
//   puts the end-wall line and the desk top in the middle of that band, so the desk clears the
//   card on every portrait phone (360 x 640 as well as 412 x 839) and the line clears the HUD.
//   Without a measurement it falls back to `DESK_PORTRAIT_Y`. The change blends in over the last
//   half of the walk to the desk (`deskWeightAt`).
// Vertical FOV is 50 at aspect >= 1, 68 at aspect <= 0.6, linear in between. CameraRig damps shift
// changes over `tokens.motion.framingSmoothS` (0.4 s). Pure math: three.js only as a type.
import type { PerspectiveCamera } from 'three';
import { tokens } from '../../design/tokens';
import { DESK_CAM_DZ, DESK_DZ, DESK_LOOK_Y, DESK_ROOM_LENGTH, EYE_Y } from './layout';

/** A point on screen as fractions of the viewport, from the top left. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** The dialog frames into the area left of its panel only when that area keeps this share. */
export const MIN_LEFT_AREA = 0.25;

/**
 * Portrait framing height at the front desk (F-020) until CameraRig has measured the band between
 * the HUD and the desk card (`deskPortraitY`). At 412 x 839 (Pixel 7) it keeps the end-wall line
 * clear of the HUD while the desk top sits above the phone desk card.
 */
export const DESK_PORTRAIT_Y = 0.34;

/**
 * Heights the desk framing keeps in the band (F-020), meters above the floor: the desk point that
 * `screenPos('desk')` reports (the center of the four object hit boxes, on the 0.765 m desk top)
 * and the top of the end-wall line (environment/labels3d.ts END_WALL: baseline 2.6, cap 0.2,
 * plus the serif's ascenders). framing.test.ts checks them against the environment's values.
 */
export const DESK_POINT_Y = 0.79;
export const END_WALL_TOP_Y = 2.86;
/** The desk point keeps at least this many CSS px above the card's top edge. */
export const DESK_CARD_CLEARANCE = 16;
/** Bounds of the measured desk framing point (fractions of the height). */
const DESK_Y_MIN = 0.22;
const DESK_Y_MAX = 0.5;

/**
 * Tangents, relative to the desk camera's view axis, of the desk point (below the axis) and the
 * end-wall line top (above it), seen from the desk stop (layout.ts: eye height EYE_Y, the camera
 * DESK_CAM_DZ into the room, looking at DESK_LOOK_Y over the desk DESK_DZ in, the end wall
 * DESK_ROOM_LENGTH in). Projected, a point at tangent t sits t / (2 tan(fov / 2)) of the height
 * from the framing point, whatever the shift.
 */
const AXIS_PITCH = Math.atan((EYE_Y - DESK_LOOK_Y) / (DESK_DZ - DESK_CAM_DZ));
export const DESK_POINT_TAN = Math.tan(
  Math.atan((EYE_Y - DESK_POINT_Y) / (DESK_DZ - DESK_CAM_DZ)) - AXIS_PITCH,
);
export const END_WALL_TOP_TAN = Math.tan(
  Math.atan((END_WALL_TOP_Y - EYE_Y) / (DESK_ROOM_LENGTH - DESK_CAM_DZ)) + AXIS_PITCH,
);

/** The measured portrait band at the desk stop, in CSS px from the top of the canvas. */
export interface DeskBand {
  /** Canvas height. */
  height: number;
  /** Bottom of the HUD header (its own 8 px padding included). */
  top: number;
  /** Top of the desk card. */
  bottom: number;
}

/**
 * The portrait framing height at the front desk (F-020) for a measured band and vertical FOV:
 * the span from the end-wall line top to the desk point is centered in the band between the HUD
 * and the card (less DESK_CARD_CLEARANCE), and the desk point never drops below the card's top
 * edge less the clearance, even when the band is too short for the whole span (then the line
 * may reach under the HUD, never the desk under the card). Clamped to [0.22, 0.5].
 */
export function deskPortraitY(band: DeskBand, fov: number): number {
  const { height, top, bottom } = band;
  if (!(height > 0) || !(bottom > top)) return DESK_PORTRAIT_Y;
  const k = 1 / (2 * Math.tan((fov * Math.PI) / 360));
  const above = END_WALL_TOP_TAN * k;
  const below = DESK_POINT_TAN * k;
  const floor = (bottom - DESK_CARD_CLEARANCE) / height;
  const centered = (top / height + floor) / 2 + (above - below) / 2;
  const y = Math.min(centered, floor - below);
  return Math.min(DESK_Y_MAX, Math.max(DESK_Y_MIN, y));
}

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
 * only; desktop frames the desk like every other stop), and `deskY` the portrait framing height
 * at the desk (`deskPortraitY` of the measured band, or the DESK_PORTRAIT_Y fallback).
 */
export function framingFor(
  aspect: number,
  panelLeft: number | null = null,
  desk = 0,
  deskY = DESK_PORTRAIT_Y,
): ScreenPoint {
  if (!(aspect < 1)) {
    if (panelLeft !== null && panelLeft >= MIN_LEFT_AREA && panelLeft < 1) {
      return { x: panelLeft / 2, y: 0.5 };
    }
    return { x: tokens.camera.framingDesktopX, y: 0.5 };
  }
  const w = Math.min(1, Math.max(0, desk));
  const y = tokens.camera.framingPortraitY;
  return { x: 0.5, y: w > 0 ? y + (deskY - y) * w : y };
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
