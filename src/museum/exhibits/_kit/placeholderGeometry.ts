// The placeholder crate (EXPERIENCE §5.7): a closed walnut crate 0.5 x 0.4 x 0.4 with two slat
// bands and brass corner caps, under 300 triangles. Pure three.js, so it builds in Node tests.
// In the wall vitrine (0.2 m of depth) the crate keeps its face and gets shallower.
import { BoxGeometry, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Vec3 } from '../../rail/layout';
import type { ExhibitSlot } from './types';

/** EXPERIENCE §5.7 crate size (x, y, z). */
export const CRATE_SIZE = [0.5, 0.4, 0.4] as const satisfies Vec3;
/** Edge of a brass corner cap; caps stand this far proud of the crate. */
export const CRATE_CAP = 0.05;
export const CRATE_CAP_PROUD = 0.005;
/** Slat bands: height and how far they stand off the body. */
export const CRATE_BAND = 0.04;
export const CRATE_BAND_PROUD = 0.004;
/** Hard ceiling from EXPERIENCE §5.7. */
export const PLACEHOLDER_MAX_TRIANGLES = 300;
/** Clearance kept from the slot bounds when the crate has to shrink. */
const FIT_MARGIN = 0.01;

export interface PlaceholderGeometries {
  crate: BufferGeometry;
  caps: BufferGeometry;
}

/** Crate body plus bands (walnut) and the eight corner caps (brass), centered on the origin. */
export function createPlaceholderGeometries(size: Readonly<Vec3>): PlaceholderGeometries {
  const [w, h, d] = size;
  const parts: BufferGeometry[] = [new BoxGeometry(w, h, d)];
  for (const y of [-h / 4, h / 4]) {
    const band = new BoxGeometry(w + 2 * CRATE_BAND_PROUD, CRATE_BAND, d + 2 * CRATE_BAND_PROUD);
    parts.push(band.translate(0, y, 0));
  }
  const caps: BufferGeometry[] = [];
  const offset = CRATE_CAP / 2 - CRATE_CAP_PROUD;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const cap = new BoxGeometry(CRATE_CAP, CRATE_CAP, CRATE_CAP);
        caps.push(
          cap.translate(sx * (w / 2 - offset), sy * (h / 2 - offset), sz * (d / 2 - offset)),
        );
      }
    }
  }
  const crate = mergeGeometries(parts);
  const capsGeometry = mergeGeometries(caps);
  parts.forEach((g) => g.dispose());
  caps.forEach((g) => g.dispose());
  if (!crate || !capsGeometry) throw new Error('Placeholder geometry failed to merge');
  crate.computeBoundingBox();
  capsGeometry.computeBoundingBox();
  return { crate, caps: capsGeometry };
}

/** Triangles drawn for a geometry (indexed or not). */
export function triangleCount(geometry: BufferGeometry): number {
  const count = geometry.index ? geometry.index.count : geometry.getAttribute('position').count;
  return Math.floor(count / 3);
}

export interface PlaceholderFit {
  size: Vec3;
  /** Center of the crate body in slot-local space. */
  center: Vec3;
}

/**
 * Size and position of the crate in a slot: on a plinth it stands on the plinth top (the caps
 * touch it); in the wall vitrine it hangs centered, just off the back panel. Each axis shrinks
 * only when the slot is smaller than the crate (the vitrine's depth).
 */
export function placeholderFit(slot: Pick<ExhibitSlot, 'mount' | 'bounds'>): PlaceholderFit {
  const { min, max } = slot.bounds;
  const extra = 2 * (CRATE_CAP_PROUD + FIT_MARGIN);
  const size = CRATE_SIZE.map((s, i) => Math.min(s, max[i]! - min[i]! - extra)) as Vec3;
  const mid = (i: number) => (min[i]! + max[i]!) / 2;
  if (slot.mount === 'wall') {
    return {
      size,
      center: [mid(0), mid(1), min[2] + FIT_MARGIN + CRATE_CAP_PROUD + size[2] / 2],
    };
  }
  return { size, center: [mid(0), CRATE_CAP_PROUD + size[1] / 2, mid(2)] };
}
