import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import { tokens } from '../../design/tokens';
import { blendGaze, forwardPoint, GAZE_FORWARD_Y, gazeArrayAt, gazeAt, smoothstep } from './gaze';
import { computeLayout } from './layout';
import { buildRail, buildRails, poseArraysAt, uAt } from './rail';

const NOW = new Date('2026-10-15T00:00:00Z');
const layout = computeLayout(content, NOW);
const rails = buildRails(layout);
const main = rails.main;

const v = (a: readonly number[]) => new Vector3(a[0], a[1], a[2]);
const close = (actual: readonly number[], expected: readonly number[], digits = 6) =>
  actual.forEach((x, i) => expect(x).toBeCloseTo(expected[i]!, digits));

/** Horizontal angle in degrees between the directions from `from` to `a` and to `b`. */
function yawBetween(from: readonly number[], a: readonly number[], b: readonly number[]): number {
  const ya = Math.atan2(a[0]! - from[0]!, a[2]! - from[2]!);
  const yb = Math.atan2(b[0]! - from[0]!, b[2]! - from[2]!);
  let d = Math.abs(ya - yb);
  if (d > Math.PI) d = 2 * Math.PI - d;
  return (d * 180) / Math.PI;
}

describe('smoothstep', () => {
  it('clamps and eases between the edges', () => {
    expect(smoothstep(0, 0.35, -1)).toBe(0);
    expect(smoothstep(0, 0.35, 0)).toBe(0);
    expect(smoothstep(0, 0.35, 0.175)).toBeCloseTo(0.5, 12);
    expect(smoothstep(0, 0.35, 0.35)).toBe(1);
    expect(smoothstep(0.5, 1, 0.75)).toBeCloseTo(0.5, 12);
    expect(smoothstep(0.5, 1, 2)).toBe(1);
  });
});

describe('blendGaze (EXPERIENCE §6.3)', () => {
  const fa = new Vector3(2, 1, 0);
  const fw = new Vector3(0, 1.6, -6);
  const fb = new Vector3(-2, 1, -12);
  const at = (f: number) => blendGaze(fa, fw, fb, f, new Vector3()).toArray();

  it('starts at F_a, turns to Fw by 0.35, holds Fw until 0.5 and ends at F_b', () => {
    close(at(0), fa.toArray());
    const s = smoothstep(0, tokens.camera.gazeEnterF, 0.2);
    close(at(0.2), fa.clone().lerp(fw, s).toArray());
    close(at(0.35), fw.toArray());
    close(at(0.4), fw.toArray());
    close(at(0.49), fw.toArray());
    close(at(0.75), fw.clone().lerp(fb, 0.5).toArray());
    close(at(1), fb.toArray());
  });

  it('may write into one of its inputs', () => {
    const out = fa.clone();
    blendGaze(out, fw, fb, 0.2, out);
    close(out.toArray(), at(0.2));
  });
});

describe('forwardPoint', () => {
  it('is 6 m ahead along the rail at y 1.6', () => {
    const curve = main.curve!;
    const length = curve.getLength();
    for (const p of [0.3, 1.2, 3.5, 6.7]) {
      const fw = forwardPoint(main, p, new Vector3());
      expect(fw.y).toBe(GAZE_FORWARD_Y);
      const expected = curve.getPointAt(uAt(main, p) + tokens.camera.gazeForwardM / length);
      close([fw.x, fw.z], [expected.x, expected.z], 9);
      // The aisle is nearly straight: the chord is a little under the 6 m of arc.
      const camera = poseArraysAt(main, p).position;
      const chord = Math.hypot(fw.x - camera[0], fw.z - camera[2]);
      expect(chord).toBeGreaterThan(5);
      expect(chord).toBeLessThanOrEqual(tokens.camera.gazeForwardM + 1e-9);
    }
  });

  it('continues along the end tangent past the end of the curve', () => {
    const last = main.stops.length - 1;
    const fw = forwardPoint(main, last - 0.01, new Vector3());
    const end = main.curve!.getPointAt(1);
    const camera = v(poseArraysAt(main, last - 0.01).position);
    expect(fw.y).toBe(GAZE_FORWARD_Y);
    expect(Math.hypot(fw.x - end.x, fw.z - end.z)).toBeGreaterThan(0);
    expect(Math.hypot(fw.x - camera.x, fw.z - camera.z)).toBeGreaterThan(5);
  });
});

describe('gazeAt on the real rail', () => {
  // A main segment between two work exhibits on opposite sides of the aisle.
  const i = main.stops.findIndex((s) => s.id === 'mysa');
  const a = main.stops[i]!;
  const b = main.stops[i + 1]!;
  const fwAt = (f: number) => forwardPoint(main, i + f, new Vector3());

  it('follows the EXPERIENCE §6.3 formula at f = 0, 0.2, 0.4, 0.75 and 1', () => {
    close(gazeArrayAt(main, i), a.look);
    const s = smoothstep(0, 0.35, 0.2);
    close(gazeArrayAt(main, i + 0.2), v(a.look).lerp(fwAt(0.2), s).toArray());
    close(gazeArrayAt(main, i + 0.4), fwAt(0.4).toArray());
    close(gazeArrayAt(main, i + 0.75), fwAt(0.75).lerp(v(b.look), 0.5).toArray());
    close(gazeArrayAt(main, i + 1), b.look);
  });

  it('looks down the aisle mid-walk and turns about 30 degrees toward a case on arrival', () => {
    // Every segment that ends at a main-aisle work exhibit (doors look at the wall, wider).
    for (const id of ['verafin', 'mysa', 'wailo', 'cfia'] as const) {
      const k = main.stops.findIndex((s) => s.id === id);
      const camera = poseArraysAt(main, k).position;
      const ahead = forwardPoint(main, k - 0.01, new Vector3()).toArray();
      const turn = yawBetween(camera, ahead, main.stops[k]!.look);
      expect(turn).toBeGreaterThan(20);
      expect(turn).toBeLessThan(45);
    }
    const mid = poseArraysAt(main, i + 0.42);
    const down = gazeArrayAt(main, i + 0.42);
    // Mid-walk the gaze is (almost) along the aisle: nearly no sideways component.
    expect(Math.abs(down[0] - mid.position[0])).toBeLessThan(1);
  });

  it('is the stop look-at at every whole stop on every track', () => {
    for (const rail of Object.values(rails)) {
      rail.stops.forEach((stop, k) => close(gazeArrayAt(rail, k), stop.look, 12));
    }
  });

  it('is continuous along every track', () => {
    for (const rail of Object.values(rails)) {
      let previous = gazeArrayAt(rail, 0);
      for (let k = 1; k <= (rail.stops.length - 1) * 200; k++) {
        const next = gazeArrayAt(rail, k / 200);
        const step = Math.hypot(...next.map((x, j) => x - previous[j]!));
        expect(step).toBeLessThan(0.6);
        previous = next;
      }
    }
  });

  it('survives a track with fewer than two stops', () => {
    expect(gazeAt(buildRail({ id: 'projects', stops: [], via: [] }), 0.5, new Vector3()).y).toBe(
      GAZE_FORWARD_Y,
    );
    const single = buildRail({ id: 'projects', stops: [layout.tracks.main.stops[0]!], via: [] });
    close(gazeArrayAt(single, 0.7), layout.tracks.main.stops[0]!.look);
  });
});
