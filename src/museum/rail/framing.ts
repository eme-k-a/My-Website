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
// - portrait at the lobby: 50% of the width, LOBBY_PORTRAIT_Y of the height (F-032). The hero
//   (name, links, "Begin the walk", the welcome line) fills the top 60% of a phone's first
//   viewport, so the arch, the first case and the warm pool are framed into the free band under
//   it, and the h1 sits over plain ink. It blends out over the first half of the walk to the
//   first exhibit (`lobbyWeightAt`), so every main exhibit keeps the 36% framing.
// - portrait at an exhibit: 50% of the width, `wingPortraitY` of the height (F-039 for the wing
//   exhibits, F-048 for the main aisle). The wing head (the wing chip and "Return to the aisle")
//   sits under the HUD, and the wing wall titles hang high on the end wall, so at 36% a phone
//   draws the head over the title; on a small phone (360 x 640) the HUD's top row reaches the
//   number of the tall main-aisle titles (mun, certifications, cfia) the same way. CameraRig
//   measures the bottom of the wing head (wing exhibits) or of the HUD's top row (main-aisle
//   exhibits), and the framing point drops just enough that the top of the wall title lands
//   WING_HEAD_CLEARANCE px under it (never above the 36% point, at most 50%). When the band is
//   too short for the title and the whole case, the title wins: text over text is worse than the
//   case floor meeting the card. It blends in over the half stop next to the exhibit
//   (`stopWeightAt`), so the door stops keep their framing (F-038).
// - at a wing door (F-051): on desktop the FOV tightens to DOOR_FOV_DESKTOP around the normal
//   framing point (moved to DOOR_DESKTOP_X, DOOR_DESKTOP_Y), so the doorway, its transom title and the room's
//   glow fill the picture; on
//   portrait the framing x centers the doorway's projected span (`doorPortraitX`), so neither
//   jamb is cut by the edge. Both blend in over the half stop next to the door (`stopWeightAt`).
// Vertical FOV is 50 at aspect >= 1, 68 at aspect <= 0.6, linear in between. CameraRig damps shift
// changes over `tokens.motion.framingSmoothS` (0.4 s). Pure math: three.js only as a type.
import type { PerspectiveCamera } from 'three';
import { tokens } from '../../design/tokens';
import {
  AISLE_HALF,
  DESK_CAM_DZ,
  DESK_DZ,
  DESK_LOOK_Y,
  DESK_ROOM_LENGTH,
  EYE_Y,
  type Vec3,
} from './layout';

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
/** The stop that gets the lobby framing. */
const LOBBY_ID = 'lobby';
/**
 * The portrait framing height at the lobby (F-032): the arch's top edge lands just under the
 * hero's welcome line and its floor pool above the swipe hint on a 412 x 839 phone (FOV 68).
 */
export const LOBBY_PORTRAIT_Y = 0.8;

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

/** How far the lobby framing applies at progress `p`: 1 at the lobby, 0 half a stop away. */
export function lobbyWeightAt(ids: readonly string[], p: number): number {
  const at = ids.indexOf(LOBBY_ID);
  if (at < 0 || !Number.isFinite(p)) return 0;
  return 1 - smooth(0, 0.5, Math.abs(p - at));
}

/**
 * The stop nearest to progress `p` on a track whose stop ids are `ids`, and how far its own
 * framing applies: 1 at the stop, 0 half a stop away (smoothstep), as for the desk.
 */
export function stopWeightAt(
  ids: readonly string[],
  p: number,
): { id: string | undefined; weight: number } {
  if (!Number.isFinite(p) || ids.length === 0) return { id: undefined, weight: 0 };
  const at = Math.min(ids.length - 1, Math.max(0, Math.round(p)));
  return { id: ids[at], weight: 1 - smooth(0, 0.5, Math.abs(p - at)) };
}

/** The top of a wing wall title keeps at least this many CSS px under the wing head (F-039). */
export const WING_HEAD_CLEARANCE = 8;
/**
 * The wing head's bottom in CSS px until CameraRig has measured it: the HUD, the wing chip and
 * the 44 px exit control on a phone (y 140 on Pixel 7 and at 360 x 640).
 */
export const WING_HEAD_BOTTOM = 140;
/**
 * The bottom of the HUD's top row (its controls, not the header's own bottom padding) in CSS px
 * until CameraRig has measured it: 8 px of inset plus the 44 px controls (F-048).
 */
export const HUD_ROW_BOTTOM = 52;
/** The wing framing point never drops below this fraction of the height. */
const WING_Y_MAX = 0.5;

/**
 * How far above the view axis the highest of `points` is seen from a camera at `camera` looking
 * at `look` (no roll), as a tangent: projected, it sits tangent / (2 tan(fov / 2)) of the height
 * above the framing point, whatever the shift.
 */
export function topTangent(camera: Vec3, look: Vec3, points: readonly Vec3[]): number {
  const f = look.map((v, i) => v - camera[i]!) as Vec3;
  const fl = Math.hypot(...f);
  if (!(fl > 0)) return Number.NaN;
  for (let i = 0; i < 3; i++) f[i] = f[i]! / fl;
  // right = forward x world up, up = right x forward.
  const r: Vec3 = [-f[2], 0, f[0]];
  const rl = Math.hypot(...r);
  if (!(rl > 0)) return Number.NaN;
  const u: Vec3 = [
    (r[1] * f[2] - r[2] * f[1]) / rl,
    (r[2] * f[0] - r[0] * f[2]) / rl,
    (r[0] * f[1] - r[1] * f[0]) / rl,
  ];
  let top = -Infinity;
  for (const point of points) {
    const v = point.map((c, i) => c - camera[i]!);
    const depth = v[0]! * f[0] + v[1]! * f[1] + v[2]! * f[2];
    if (!(depth > 0)) continue;
    top = Math.max(top, (v[0]! * u[0] + v[1]! * u[1] + v[2]! * u[2]) / depth);
  }
  return Number.isFinite(top) ? top : Number.NaN;
}

/** The parts of a wall title (exhibits/_kit/placard.ts `PlacardSpec`) that bound its top. */
export interface TitleTop {
  /** Bottom center of the title on its wall; every slot wall runs along z. */
  position: Vec3;
  /** Width of the widest line, meters. */
  width: number;
  /** The exhibit number, the title's top line. */
  number: { baselineY: number; capHeight: number };
}

/** The two ends of a wall title's top edge (the number's cap line, as wide as the widest line). */
export function titleTopCorners(title: TitleTop): Vec3[] {
  const [x, , z] = title.position;
  const y = title.number.baselineY + title.number.capHeight;
  const half = title.width / 2;
  return [
    [x, y, z - half],
    [x, y, z + half],
  ];
}

/**
 * How far a serif numeral's round tops (0, 6, 8, 9) rise above its cap line, as a share of the
 * cap height (F-048: the certifications 06 measured about 1 px over the cap line at 360 x 640).
 */
export const NUMBER_OVERSHOOT = 0.04;

/**
 * The two ends of a wall title's number top: the number's own cap line plus NUMBER_OVERSHOOT,
 * as wide as the number (`advance` em per character, titleMetrics SERIF_NUMBER_ADVANCE). Tighter
 * than `titleTopCorners`, whose ends take the widest organization line: on a wall seen at an
 * angle the far end of that line projects higher than the number ever reaches (F-048).
 */
export function numberTopCorners(
  title: {
    position: Vec3;
    number: { text: string; fontSize: number; baselineY: number; capHeight: number };
  },
  advance: number,
): Vec3[] {
  const [x, , z] = title.position;
  const { text, fontSize, baselineY, capHeight } = title.number;
  const y = baselineY + capHeight * (1 + NUMBER_OVERSHOOT);
  const half = (text.length * fontSize * advance) / 2;
  return [
    [x, y, z - half],
    [x, y, z + half],
  ];
}

/** The parts of a wall title that bound its bottom: the organization's last baseline. */
export interface TitleBottom {
  position: Vec3;
  width: number;
  organization: { baselineY: number; fontSize: number; lineHeight?: number; lines?: number };
}

/** The two ends of a wall title's bottom edge (the last organization baseline, widest line). */
export function titleBottomCorners(title: TitleBottom): Vec3[] {
  const [x, , z] = title.position;
  const { baselineY, fontSize, lineHeight = 1.25, lines = 1 } = title.organization;
  const y = baselineY - (lines - 1) * fontSize * lineHeight;
  const half = title.width / 2;
  return [
    [x, y, z - half],
    [x, y, z + half],
  ];
}

/**
 * Vertical tangents of `points` relative to the view axis of a camera at `camera` looking at
 * `look` (no roll), as [lowest, highest]; points behind the camera are skipped.
 */
export function verticalTangents(
  camera: Vec3,
  look: Vec3,
  points: readonly Vec3[],
): [number, number] {
  const f = look.map((v, i) => v - camera[i]!) as Vec3;
  const fl = Math.hypot(...f);
  if (!(fl > 0)) return [Number.NaN, Number.NaN];
  for (let i = 0; i < 3; i++) f[i] = f[i]! / fl;
  const r: Vec3 = [-f[2], 0, f[0]];
  const rl = Math.hypot(...r);
  if (!(rl > 0)) return [Number.NaN, Number.NaN];
  const u: Vec3 = [
    (r[1] * f[2] - r[2] * f[1]) / rl,
    (r[2] * f[0] - r[0] * f[2]) / rl,
    (r[0] * f[1] - r[1] * f[0]) / rl,
  ];
  let lo = Infinity;
  let hi = -Infinity;
  for (const point of points) {
    const v = point.map((c, i) => c - camera[i]!);
    const depth = v[0]! * f[0] + v[1]! * f[1] + v[2]! * f[2];
    if (!(depth > 0)) continue;
    const t = (v[0]! * u[0] + v[1]! * u[1] + v[2]! * u[2]) / depth;
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  return Number.isFinite(lo) ? [lo, hi] : [Number.NaN, Number.NaN];
}

/**
 * The wall title's bottom keeps at least this tangent above the case top in the dialog pose
 * (F-042): about 10 CSS px on a 900 px tall desktop view (FOV 50).
 */
export const TITLE_CASE_CLEARANCE_TAN = 0.01;

/**
 * The dialog dolly at a wing exhibit (F-042): the longest move toward the slot center, up to
 * `max`, at which the wall title's bottom (`titleBottoms`) still projects TITLE_CASE_CLEARANCE_TAN
 * above the case top (`caseTops`, its top corners). The dolly runs along the gaze, so the shift
 * moves both equally and only the parallax between the near case and the far wall matters; the
 * gap shrinks as the camera closes in, so a bisection finds the limit. 0 when even the stop pose
 * does not clear (the dolly then never makes it worse).
 */
export function titleClearDolly(
  camera: Vec3,
  look: Vec3,
  titleBottoms: readonly Vec3[],
  caseTops: readonly Vec3[],
  max: number,
): number {
  const dir = look.map((v, i) => v - camera[i]!) as Vec3;
  const length = Math.hypot(...dir);
  if (!(length > 0) || !(max > 0)) return 0;
  const at = (d: number): Vec3 => camera.map((c, i) => c + (dir[i]! / length) * d) as Vec3;
  const clears = (d: number) => {
    const pos = at(d);
    const [titleLow] = verticalTangents(pos, look, titleBottoms);
    const [, caseHigh] = verticalTangents(pos, look, caseTops);
    return titleLow - caseHigh >= TITLE_CASE_CLEARANCE_TAN;
  };
  if (clears(max)) return max;
  if (!clears(0)) return 0;
  let lo = 0;
  let hi = max;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (clears(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * In the desktop dialog the wall title's top keeps at least this share of the height under the
 * top edge (F-050): 65 px on a 900 px tall view, under the HUD wordmark that stays while the story
 * is open.
 */
export const TITLE_TOP_CLEARANCE = 0.072;

/**
 * The dialog dolly at the wall vitrine (F-050): the longest move toward the slot center, up to
 * `max`, at which the title's top (`tops`, e.g. `numberTopCorners`) still projects at least
 * TITLE_TOP_CLEARANCE of the height under the top edge, for a view of vertical FOV `fov` whose
 * framing point sits at mid-height (the desktop dialog framing). The number rises on screen as
 * the camera closes in, so a bisection finds the limit; 0 when even the stop pose does not clear.
 */
export function topClearDolly(
  camera: Vec3,
  look: Vec3,
  tops: readonly Vec3[],
  fov: number,
  max: number,
): number {
  const dir = look.map((v, i) => v - camera[i]!) as Vec3;
  const length = Math.hypot(...dir);
  if (!(length > 0) || !(max > 0)) return 0;
  const k = 1 / (2 * Math.tan((fov * Math.PI) / 360));
  const limit = (0.5 - TITLE_TOP_CLEARANCE) / k;
  const clears = (d: number) => {
    const pos = camera.map((c, i) => c + (dir[i]! / length) * d) as Vec3;
    return topTangent(pos, look, tops) <= limit;
  };
  if (clears(max)) return max;
  if (!clears(0)) return 0;
  let lo = 0;
  let hi = max;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (clears(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * The portrait framing height at an exhibit (F-039, F-048): the framing point that puts the wall
 * title's top (`tan`, from `topTangent`) WING_HEAD_CLEARANCE px under the measured bottom of the
 * wing head or the HUD's top row (`headBottom`, CSS px, in a canvas `height` px tall). Never above
 * the normal portrait point (where the title already clears the head, nothing moves), at most 0.5.
 */
export function wingPortraitY(
  height: number,
  headBottom: number,
  fov: number,
  tan: number,
): number {
  const base = tokens.camera.framingPortraitY;
  if (!(height > 0) || !Number.isFinite(tan) || !Number.isFinite(headBottom)) return base;
  const k = 1 / (2 * Math.tan((fov * Math.PI) / 360));
  const y = (headBottom + WING_HEAD_CLEARANCE) / height + tan * k;
  return Math.min(WING_Y_MAX, Math.max(base, y));
}

/**
 * Horizontal tangents of `points` relative to the view axis of a camera at `camera` looking at
 * `look` (no roll), as [leftmost, rightmost] (right is positive); points behind are skipped.
 */
export function horizontalTangents(
  camera: Vec3,
  look: Vec3,
  points: readonly Vec3[],
): [number, number] {
  const f = look.map((v, i) => v - camera[i]!) as Vec3;
  const fl = Math.hypot(...f);
  if (!(fl > 0)) return [Number.NaN, Number.NaN];
  for (let i = 0; i < 3; i++) f[i] = f[i]! / fl;
  const r: Vec3 = [-f[2], 0, f[0]];
  const rl = Math.hypot(...r);
  if (!(rl > 0)) return [Number.NaN, Number.NaN];
  let lo = Infinity;
  let hi = -Infinity;
  for (const point of points) {
    const v = point.map((c, i) => c - camera[i]!);
    const depth = v[0]! * f[0] + v[1]! * f[1] + v[2]! * f[2];
    if (!(depth > 0)) continue;
    const t = (v[0]! * r[0] + v[2]! * r[2]) / rl / depth;
    lo = Math.min(lo, t);
    hi = Math.max(hi, t);
  }
  return Number.isFinite(lo) ? [lo, hi] : [Number.NaN, Number.NaN];
}

/**
 * Vertical FOV at a wing door stop on desktop (the door composition, F-051). The door stop looks
 * at its doorway obliquely from the aisle, so at the aisle FOV (50) the doorway fills only the
 * middle of the frame: the left third showed the dark aisle ahead and the next case cut by the
 * edge (wailo at the volunteer door). A tighter lens around the framing point lets the doorway,
 * its transom title and the room's glow fill the picture and moves the neighbour out of frame.
 */
export const DOOR_FOV_DESKTOP = 44;
/**
 * The desktop framing height at a wing door: a little under the middle, so the larger transom
 * title keeps its headroom under the HUD's Resume and Classic buttons (the door's foot is out of
 * frame either way).
 */
export const DOOR_DESKTOP_Y = 0.57;
/**
 * The desktop framing x at a wing door: a little left of the aisle's 62%, so the larger doorway
 * and the room title behind it stay clear of the rail's stop label at the right.
 */
export const DOOR_DESKTOP_X = 0.58;
/** The portrait door framing never moves the doorway's center past these fractions of the width. */
const DOOR_X_MIN = 0.38;
const DOOR_X_MAX = 0.62;

/** The lining face width and the depth the reveal shows from the aisle, meters. */
const DOOR_LINING = 0.04;
const DOOR_REVEAL = 0.2;

/** The corners of a wing door's opening with its brass lining, seen from the aisle. */
export function doorCorners(
  side: 'left' | 'right',
  z: number,
  width: number,
  height: number,
): Vec3[] {
  const s = side === 'left' ? -1 : 1;
  // The lining's 4 cm face and the reveal's depth into the wall, read from the aisle.
  const half = width / 2 + DOOR_LINING;
  return [AISLE_HALF, AISLE_HALF + DOOR_REVEAL].flatMap((x) =>
    [z - half, z + half].flatMap((zz) =>
      [0, height + DOOR_LINING].map((y) => [s * x, y, zz] as Vec3),
    ),
  );
}

/**
 * The portrait framing x at a wing door (F-051): the doorway's projected span (`span`, from
 * `horizontalTangents` of `doorCorners`) is centered in the width, so neither jamb is cut by the
 * edge of a phone (the projects door lost its left jamb, the volunteer door its right one).
 */
export function doorPortraitX(
  aspect: number,
  fov: number,
  span: readonly [number, number],
): number {
  const [lo, hi] = span;
  if (!(aspect > 0) || !Number.isFinite(lo) || !Number.isFinite(hi)) return 0.5;
  const kx = 1 / (2 * Math.tan((fov * Math.PI) / 360) * aspect);
  const x = 0.5 - ((lo + hi) / 2) * kx;
  return Math.min(DOOR_X_MAX, Math.max(DOOR_X_MIN, x));
}

/**
 * The vertical FOV at progress weight `door` of a wing door stop (`stopWeightAt`): desktop blends
 * from the aisle FOV to DOOR_FOV_DESKTOP; portrait keeps `fovFor`.
 */
export function doorFov(aspect: number, door: number): number {
  const fov = fovFor(aspect);
  const w = Math.min(1, Math.max(0, door));
  if (aspect < 1 || !(w > 0)) return fov;
  return fov + (DOOR_FOV_DESKTOP - fov) * w;
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
 * at the desk (`deskPortraitY` of the measured band, or the DESK_PORTRAIT_Y fallback). `lobby`
 * is `lobbyWeightAt` (portrait only). `wing` is the `stopWeightAt` weight of an exhibit and
 * `wingY` its `wingPortraitY` (portrait only, F-039 and F-048). `door` is the `stopWeightAt`
 * weight of a wing door and `doorX` its `doorPortraitX` (portrait; on desktop the door lowers the point, F-051).
 */
export function framingFor(
  aspect: number,
  panelLeft: number | null = null,
  desk = 0,
  deskY = DESK_PORTRAIT_Y,
  lobby = 0,
  wing = 0,
  wingY: number = tokens.camera.framingPortraitY,
  door = 0,
  doorX = 0.5,
): ScreenPoint {
  const d = Math.min(1, Math.max(0, door));
  if (!(aspect < 1)) {
    if (panelLeft !== null && panelLeft >= MIN_LEFT_AREA && panelLeft < 1) {
      return { x: panelLeft / 2, y: 0.5 };
    }
    const x = tokens.camera.framingDesktopX;
    return { x: x + (DOOR_DESKTOP_X - x) * d, y: 0.5 + (DOOR_DESKTOP_Y - 0.5) * d };
  }
  const w = Math.min(1, Math.max(0, desk));
  const l = Math.min(1, Math.max(0, lobby));
  const base = tokens.camera.framingPortraitY;
  const g = Math.min(1, Math.max(0, wing));
  const y = l > 0 ? base + (LOBBY_PORTRAIT_Y - base) * l : base;
  const yDesk = w > 0 ? y + (deskY - y) * w : y;
  return { x: 0.5 + (doorX - 0.5) * d, y: g > 0 ? yDesk + (wingY - yDesk) * g : yDesk };
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
