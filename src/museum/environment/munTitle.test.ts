// F-041b: the mun wall title ("05" over "MEMORIAL UNIVERSITY") is in the frame and reads above
// the case. It hangs where the stop camera's sight line through the case meets the Foundations
// left wall (placard.ts, as F-022 did for the aisle and wing titles). Projected through three.js
// with the real layout, FOV and framing shift (the same math as framing.test): at the mun stop on
// a Pixel 7 (412 x 839, the browser's viewport) and at 360 x 640, and in the desktop dialog
// (1440 x 900, story panel at 806 px, the full main-aisle dialog dolly) the number and the
// organization project whole inside the viewport, and the organization's last line stays at
// least TITLE_CASE_CLEARANCE_TAN above the case top (its brass edge included).
import { PerspectiveCamera, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import { tokens } from '../../design/tokens';
import { caseBox, EDGE_THICKNESS, slotMatrix, slotVariant } from '../exhibits/_kit/anatomy';
import { slotPlacard } from '../exhibits/_kit/placard';
import { SERIF_NUMBER_ADVANCE } from '../exhibits/_kit/titleMetrics';
import {
  applyFraming,
  fovFor,
  framingFor,
  TITLE_CASE_CLEARANCE_TAN,
  viewOffsetFor,
} from '../rail/framing';
import { computeLayout, type Vec3 } from '../rail/layout';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));
const slot = layout.slots.find((s) => s.id === 'mun')!;
const pose = layout.tracks.main.stops.find((s) => s.id === 'mun')!;
const spec = slotPlacard(layout, slot);

interface Rect {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** A box on the title's wall: `half` either side of the title center along z, `y` up the wall. */
function wallBox(half: number, y: [number, number]): Vec3[] {
  const [x, , z] = spec.position;
  return [z - half, z + half].flatMap((zz) => y.map((yy) => [x, yy, zz] as Vec3));
}

const org = spec.organization;
const orgLast = org.baselineY - ((org.lines ?? 1) - 1) * org.fontSize * (org.lineHeight ?? 1.25);
/** The organization from its last baseline to its first cap line, as wide as the widest line. */
const orgBox = wallBox(spec.width / 2, [orgLast, org.baselineY + org.capHeight]);
/** The number from its baseline to its cap line, as wide as its advance estimate. */
const numberBox = wallBox(
  (spec.number.text.length * spec.number.fontSize * SERIF_NUMBER_ADVANCE) / 2,
  [spec.number.baselineY, spec.number.baselineY + spec.number.capHeight],
);

/** The four top corners of the case (brass edge included), in world meters. */
function caseTops(): Vec3[] {
  const glass = caseBox(slotVariant(slot));
  const frame = slotMatrix(slot);
  const y = glass.center[1] + glass.size[1] / 2 + EDGE_THICKNESS / 2;
  return [-1, 1].flatMap((sx) =>
    [-1, 1].map(
      (sz) =>
        new Vector3(
          glass.center[0] + (sx * glass.size[0]) / 2,
          y,
          glass.center[2] + (sz * glass.size[2]) / 2,
        )
          .applyMatrix4(frame)
          .toArray() as Vec3,
    ),
  );
}

interface View {
  name: string;
  width: number;
  height: number;
  /** Left edge of the open story panel in px (desktop dialog), or null at the stop. */
  panel: number | null;
  dolly: number;
}

const VIEWS: View[] = [
  { name: 'pixel7 stop', width: 412, height: 839, panel: null, dolly: 0 },
  { name: '360 x 640 stop', width: 360, height: 640, panel: null, dolly: 0 },
  { name: 'desktop stop', width: 1440, height: 900, panel: null, dolly: 0 },
  // Main-aisle exhibits keep the full dialog dolly (CameraRig: only wing exhibits shorten it).
  {
    name: 'desktop dialog',
    width: 1440,
    height: 900,
    panel: 806,
    dolly: tokens.camera.dialogDollyM,
  },
];

/** Screen rects (CSS px) of `boxes` through the mun camera in `view`. */
function project(view: View, boxes: Vec3[][]): Rect[] {
  const { width, height } = view;
  const aspect = width / height;
  const fov = fovFor(aspect);
  const camera = new PerspectiveCamera(fov, aspect, 0.1, 90);
  const eye = new Vector3(...pose.camera);
  const look = new Vector3(...pose.look);
  eye.addScaledVector(look.clone().sub(eye).normalize(), view.dolly);
  camera.position.copy(eye);
  camera.lookAt(look);
  const panelLeft = view.panel === null ? null : view.panel / width;
  applyFraming(camera, fov, viewOffsetFor(framingFor(aspect, panelLeft)), width, height);
  camera.updateMatrixWorld();
  return boxes.map((box) => {
    const ps = box.map((p) => {
      const q = new Vector3(...p).project(camera);
      return [((q.x + 1) / 2) * width, ((1 - q.y) / 2) * height] as const;
    });
    return {
      left: Math.min(...ps.map((p) => p[0])),
      right: Math.max(...ps.map((p) => p[0])),
      top: Math.min(...ps.map((p) => p[1])),
      bottom: Math.max(...ps.map((p) => p[1])),
    };
  });
}

describe('mun wall title in the frame (F-041b)', () => {
  it.each(VIEWS.map((v) => [v.name, v] as const))(
    '%s: the whole title is inside the viewport and clears the case top',
    (_, view) => {
      const [number, organization, kase] = project(view, [numberBox, orgBox, caseTops()]);
      for (const [name, r] of [
        ['number', number!],
        ['organization', organization!],
      ] as const) {
        expect(r.left, `${name} left`).toBeGreaterThanOrEqual(0);
        expect(r.right, `${name} right`).toBeLessThanOrEqual(view.width);
        expect(r.top, `${name} top`).toBeGreaterThanOrEqual(0);
        expect(r.bottom, `${name} bottom`).toBeLessThanOrEqual(view.height);
      }
      // Above the case, not beside it: the title's center is over the case's span.
      const middle = (organization!.left + organization!.right) / 2;
      expect(middle).toBeGreaterThan(kase!.left);
      expect(middle).toBeLessThan(kase!.right);
      // The last line clears the case top by the F-042 clearance (about 10 px at 900 px).
      const k = view.height / (2 * Math.tan((fovFor(view.width / view.height) * Math.PI) / 360));
      expect(kase!.top - organization!.bottom).toBeGreaterThanOrEqual(TITLE_CASE_CLEARANCE_TAN * k);
    },
  );

  it('sat out of the frame where it hung before (the slot z, 2.75 m number baseline)', () => {
    // The F-M4a measurement this fix answers: on a Pixel 7 the old title spanned x -0.465 to
    // -0.039 of the width. Rebuilt from the old numbers so the check above is not vacuous.
    // The old title: 0.14 m caps, so "UNIVERSITY" was 1.48 m wide.
    const half = 0.742;
    const old: Vec3[] = [-57 - half, -57 + half].flatMap((z) =>
      [2.04, 3.07].map((y) => [spec.position[0], y, z] as Vec3),
    );
    const [r] = project(VIEWS[0]!, [old]);
    expect(r!.right).toBeLessThan(0);
  });
});
