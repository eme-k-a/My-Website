// The camera rail (ARCHITECTURE §6.7, EXPERIENCE §6.2): one centripetal Catmull-Rom curve per track
// through its stop cameras, its via points (a wing's threshold T, which is not a stop) and a short
// lead-in and lead-out, so the end stops have a natural tangent. Each stop has an arc-length
// parameter u_i; progress p maps piecewise linearly onto u, so the camera moves at constant speed
// within each segment. Gaze is a simple blend between the two stops' look-at points here; the full
// EXPERIENCE §6.3 gaze, framing and parallax are WP-15. Museum chunk only (imports three.js).
import { CatmullRomCurve3, Vector3 } from 'three';
import type { TrackId } from '../../content/ids';
import type { Layout, StopPose, Track, Vec3 } from './layout';

/** Arc-length samples per curve (ARCHITECTURE §6.7: `curve.getLengths(4096)`). */
export const ARC_DIVISIONS = 4096;
/** How far the lead-in and lead-out points sit beyond the first and last stop cameras. */
export const LEAD_M = 1;

export interface Rail {
  track: TrackId;
  stops: readonly StopPose[];
  /** null when the track has fewer than two stops (a wing missing from the content). */
  curve: CatmullRomCurve3 | null;
  /** Arc-length fraction of each stop on the curve, strictly increasing. */
  u: number[];
}

const vec = (v: Readonly<Vec3>) => new Vector3(v[0], v[1], v[2]);

/** `from` moved `distance` meters away from `toward` (the direction from `toward` to `from`). */
function beyond(from: Vector3, toward: Vector3, distance: number): Vector3 {
  const dir = from.clone().sub(toward);
  if (dir.lengthSq() === 0) dir.set(0, 0, 1);
  return from.clone().add(dir.normalize().multiplyScalar(distance));
}

/** Builds the rail of one track from its layout stops and via points. */
export function buildRail(track: Track): Rail {
  const stops = track.stops;
  if (stops.length < 2) return { track: track.id, stops, curve: null, u: stops.map(() => 0) };

  // Stop cameras with each via point right after the stop it follows; remember each stop's index.
  const points: Vector3[] = [];
  const stopPoint: number[] = [];
  stops.forEach((stop, i) => {
    stopPoint.push(points.length);
    points.push(vec(stop.camera));
    for (const via of track.via) if (via.after === i) points.push(vec(via.point));
  });
  const first = points[0]!;
  const last = points[points.length - 1]!;
  points.unshift(beyond(first, points[1]!, LEAD_M));
  points.push(beyond(last, points[points.length - 2]!, LEAD_M));

  const curve = new CatmullRomCurve3(points, false, 'centripetal');
  // getPointAt maps u through getLengths() with the curve's own division count, so both use 4096.
  curve.arcLengthDivisions = ARC_DIVISIONS;
  const lengths = curve.getLengths(ARC_DIVISIONS);
  const total = lengths[ARC_DIVISIONS]!;
  // Control point k sits at t = k / (points - 1); its arc length interpolates the sample table.
  const u = stopPoint.map((k) => {
    const s = ((k + 1) / (points.length - 1)) * ARC_DIVISIONS;
    const j = Math.min(ARC_DIVISIONS - 1, Math.floor(s));
    const length = lengths[j]! + (lengths[j + 1]! - lengths[j]!) * (s - j);
    return length / total;
  });
  return { track: track.id, stops, curve, u };
}

/** One rail per track of the layout. */
export function buildRails(layout: Layout): Record<TrackId, Rail> {
  return {
    main: buildRail(layout.tracks.main),
    projects: buildRail(layout.tracks.projects),
    volunteer: buildRail(layout.tracks.volunteer),
  };
}

const smoothstep = (x: number) => x * x * (3 - 2 * x);

/**
 * The camera position and look-at point at progress `p` (stop units, clamped to the track). At a
 * whole stop it is exactly that stop's layout pose. Writes into `position` and `look`.
 */
export function poseAt(rail: Rail, p: number, position: Vector3, look: Vector3): void {
  const n = rail.stops.length;
  if (n === 0) {
    position.set(0, 0, 0);
    look.set(0, 0, -1);
    return;
  }
  const clamped = Math.min(n - 1, Math.max(0, Number.isFinite(p) ? p : 0));
  const i = Math.min(n - 2, Math.floor(clamped));
  const f = clamped - Math.max(0, i);
  if (!rail.curve || n === 1 || f === 0 || f === 1) {
    const stop = rail.stops[n === 1 ? 0 : f === 1 ? i + 1 : Math.max(0, i)]!;
    position.set(...stop.camera);
    look.set(...stop.look);
    return;
  }
  const a = rail.stops[i]!;
  const b = rail.stops[i + 1]!;
  rail.curve.getPointAt(rail.u[i]! + (rail.u[i + 1]! - rail.u[i]!) * f, position);
  const w = smoothstep(f);
  look.set(
    a.look[0] + (b.look[0] - a.look[0]) * w,
    a.look[1] + (b.look[1] - a.look[1]) * w,
    a.look[2] + (b.look[2] - a.look[2]) * w,
  );
}

/** poseAt as plain arrays (tests and the test hook). */
export function poseArraysAt(rail: Rail, p: number): { position: Vec3; look: Vec3 } {
  const position = new Vector3();
  const look = new Vector3();
  poseAt(rail, p, position, look);
  return { position: position.toArray(), look: look.toArray() };
}
