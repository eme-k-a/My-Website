// The gaze turn toward each case (EXPERIENCE §6.3, ARCHITECTURE §6.4). For the segment from stop a
// to stop b at fraction f, with the stops' look-at points F_a and F_b and the forward point Fw (the
// rail point `tokens.camera.gazeForwardM` (6 m) ahead of the camera, at y 1.6):
// - f <= 0.35: lerp(F_a, Fw, smoothstep(0, 0.35, f))
// - 0.35 < f < 0.5: Fw
// - f >= 0.5: lerp(Fw, F_b, smoothstep(0.5, 1, f))
// So the camera looks down the aisle while walking and turns about 30 degrees toward each case as it
// arrives. "Ahead" is the direction of increasing progress (the walk from the lobby toward the
// desk), so the gaze is a pure function of progress: scrolling back rewinds the same turn.
// CameraRig damps the camera toward this point with `easing.dampLookAt` (`gazeSmoothTime`).
// Museum chunk only (imports three.js).
import { Vector3 } from 'three';
import { tokens } from '../../design/tokens';
import { segmentAt, uAt, type Rail } from './rail';

/** Height of the forward point Fw (EXPERIENCE §6.3). */
export const GAZE_FORWARD_Y = 1.6;

/** Hermite smoothstep of `x` between `edge0` and `edge1`, clamped to [0, 1]. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** The EXPERIENCE §6.3 blend of F_a, Fw and F_b at segment fraction `f`; writes into `out`. */
export function blendGaze(
  fa: Readonly<Vector3>,
  fw: Readonly<Vector3>,
  fb: Readonly<Vector3>,
  f: number,
  out: Vector3,
): Vector3 {
  const enter = tokens.camera.gazeEnterF;
  const hold = tokens.camera.gazeHoldF;
  if (f <= enter) return out.lerpVectors(fa, fw, smoothstep(0, enter, f));
  if (f < hold) return out.copy(fw);
  return out.lerpVectors(fw, fb, smoothstep(hold, 1, f));
}

const tangent = new Vector3();

/**
 * Fw: the rail point `gazeForwardM` ahead of progress `p` along the curve's arc length, at y 1.6.
 * Past the end of the curve it continues along the end tangent. Writes into `out`.
 */
export function forwardPoint(rail: Rail, p: number, out: Vector3): Vector3 {
  const curve = rail.curve;
  if (!curve) {
    const stop = rail.stops[0];
    return stop ? out.set(...stop.look) : out.set(0, GAZE_FORWARD_Y, -1);
  }
  const length = curve.getLength();
  const ahead = uAt(rail, p) + tokens.camera.gazeForwardM / length;
  if (ahead <= 1) {
    curve.getPointAt(ahead, out);
  } else {
    curve.getPointAt(1, out);
    curve.getTangentAt(1, tangent);
    out.addScaledVector(tangent, (ahead - 1) * length);
  }
  out.y = GAZE_FORWARD_Y;
  return out;
}

const fa = new Vector3();
const fb = new Vector3();
const fw = new Vector3();

/** The gaze point at progress `p` on the rail (EXPERIENCE §6.3); writes into `out`. */
export function gazeAt(rail: Rail, p: number, out: Vector3): Vector3 {
  const n = rail.stops.length;
  if (n === 0) return out.set(0, GAZE_FORWARD_Y, -1);
  if (n === 1 || !rail.curve) return out.set(...rail.stops[0]!.look);
  const { i, f } = segmentAt(rail, p);
  if (f === 0) return out.set(...rail.stops[i]!.look);
  if (f === 1) return out.set(...rail.stops[i + 1]!.look);
  fa.set(...rail.stops[i]!.look);
  fb.set(...rail.stops[i + 1]!.look);
  forwardPoint(rail, p, fw);
  return blendGaze(fa, fw, fb, f, out);
}

/** gazeAt as a plain array (tests). */
export function gazeArrayAt(rail: Rail, p: number): [number, number, number] {
  return gazeAt(rail, p, new Vector3()).toArray();
}
