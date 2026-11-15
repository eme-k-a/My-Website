import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  ARC,
  arcCurve,
  arcEnd,
  arcStart,
  ARRIVE_S,
  BAR,
  boxCorners,
  CARD,
  CARD_FRONT,
  chainPlacement,
  curvePeakY,
  DELIVERY,
  deliveryPose,
  envelopeCenter,
  envelopeMatrix,
  ENVELOPE,
  flapGeometry,
  GLOW,
  phoneMatrix,
  phonePoint,
  PHONE,
  PHONE_FRONT,
  PULSE,
  roundedSlab,
  SCREEN,
  STAND,
  STAND_FRONT_Z,
  standTopY,
  TAG,
  tagMatrix,
  TRAY,
  TRAY_TOP,
  wedgeGeometry,
} from './link';

/** EXPERIENCE §4: the standard slot, local meters. */
const SLOT = new Box3(new Vector3(-0.325, 0.025, -0.325), new Vector3(0.325, 0.675, 0.325));

describe('wailo geometry (EXPERIENCE §4.3)', () => {
  it('stands the tray on the slot floor and the wedge on the tray', () => {
    expect(TRAY_TOP).toBeCloseTo(0.055, 9);
    expect(TRAY.center[1] - TRAY.size[1] / 2).toBeCloseTo(0.025, 9);
    const g = wedgeGeometry();
    g.computeBoundingBox();
    const box = g.boundingBox!.translate(new Vector3(STAND.center[0], 0, 0));
    const want = new Box3().setFromCenterAndSize(
      new Vector3(...STAND.center),
      new Vector3(...STAND.size),
    );
    expect(box.min.distanceTo(want.min)).toBeLessThan(1e-6);
    expect(box.max.distanceTo(want.max)).toBeLessThan(1e-6);
    // Rear raised: the top climbs from the front to the back.
    expect(standTopY(STAND_FRONT_Z)).toBeCloseTo(TRAY_TOP + STAND.frontHeight, 9);
    expect(standTopY(STAND_FRONT_Z - STAND.size[2])).toBeCloseTo(TRAY_TOP + STAND.size[1], 9);
    g.dispose();
  });

  it('leans the phone back 15 degrees in the stand: bottom near y 0.075, top near 0.50', () => {
    const m = phoneMatrix();
    const ys = boxCorners(PHONE.size).map((c) => c.applyMatrix4(m).y);
    expect(Math.min(...ys)).toBeCloseTo(0.075, 9);
    expect(Math.max(...ys)).toBeGreaterThan(0.49);
    expect(Math.max(...ys)).toBeLessThan(0.52);
    // Its bottom center sits inside the wedge, below the sloped top (slotted in, not floating).
    const bottom = phonePoint([0, -PHONE.size[1] / 2, 0]);
    expect(bottom.y).toBeLessThan(standTopY(bottom.z) - 0.005);
    expect(bottom.z).toBeLessThan(STAND_FRONT_Z);
    expect(bottom.z).toBeGreaterThan(STAND_FRONT_Z - STAND.size[2]);
    // Tilted back (top toward -Z) and yawed toward the envelope (front turned to -X).
    const top = phonePoint([0, PHONE.size[1] / 2, 0]);
    expect(top.z).toBeLessThan(bottom.z);
    const front = phonePoint([0, 0, 1]).sub(phonePoint([0, 0, 0]));
    expect(front.x).toBeLessThan(0);
    // The phone's footprint stays on the wedge.
    for (const x of [-1, 1]) {
      const corner = phonePoint([(x * PHONE.size[0]) / 2, -PHONE.size[1] / 2, 0]);
      expect(Math.abs(corner.x - STAND.center[0])).toBeLessThan(STAND.size[0] / 2);
    }
  });

  it('stacks the screen, the card, the key glyph and the reset bar on the phone front', () => {
    expect(SCREEN.z).toBeCloseTo(PHONE_FRONT + 0.001, 9);
    expect(CARD.z - CARD.size[2] / 2).toBeGreaterThan(SCREEN.z);
    expect(CARD.size[0]).toBeLessThan(SCREEN.size[0]);
    expect(CARD.size[1]).toBeLessThan(SCREEN.size[1]);
    expect(BAR.z - BAR.size[2] / 2).toBeCloseTo(CARD_FRONT, 9);
    expect(Math.abs(BAR.y) + BAR.size[1] / 2).toBeLessThan(CARD.size[1] / 2);
    expect(BAR.size[0]).toBe(0.1);
    expect(BAR.size[1]).toBe(0.008);
  });

  it('seats the envelope on the tray, tilted up 20 degrees, with its flap on top', () => {
    const m = envelopeMatrix();
    const ys = boxCorners(ENVELOPE.size).map((c) => c.applyMatrix4(m).y);
    expect(Math.min(...ys)).toBeCloseTo(TRAY_TOP, 9);
    const [x, y, z] = envelopeCenter();
    expect([x, z]).toEqual([-0.2, 0.12]);
    expect(y).toBeCloseTo(0.076, 3);
    const flap = flapGeometry();
    flap.computeBoundingBox();
    expect(flap.boundingBox!.min.y).toBeCloseTo(0, 6);
    expect(flap.boundingBox!.max.z).toBeCloseTo(ENVELOPE.flap.depth, 6);
    expect(flap.boundingBox!.max.x - flap.boundingBox!.min.x).toBeCloseTo(ENVELOPE.size[0], 6);
    flap.dispose();
  });

  it('runs one arc from inside the envelope to under the screen top right, peaking at 0.62', () => {
    const curve = arcCurve();
    expect(curvePeakY(curve, 2000)).toBeCloseTo(ARC.peakY, 4);
    // Tube included, the arc stays under the slot top (A5).
    expect(curvePeakY(curve, 2000) + Math.max(ARC.radius, PULSE.radius)).toBeLessThanOrEqual(0.675);
    // The start is inside the envelope; the end is inside the phone, under the screen.
    const start = arcStart().applyMatrix4(envelopeMatrix().invert());
    expect(Math.abs(start.y)).toBeLessThan(ENVELOPE.size[1] / 2);
    expect(start.x).toBeCloseTo(0, 9);
    expect(start.z).toBeCloseTo(0, 9);
    const end = arcEnd().applyMatrix4(phoneMatrix().invert());
    expect(end.z).toBeLessThan(PHONE_FRONT);
    expect(end.z).toBeGreaterThan(-PHONE.size[2] / 2);
    expect(end.x).toBeGreaterThan(CARD.size[0] / 2 - 0.01);
    expect(end.x).toBeLessThan(SCREEN.size[0] / 2);
    expect(end.y).toBeGreaterThan(CARD.size[1] / 2);
    expect(end.y).toBeLessThan(SCREEN.size[1] / 2);
    expect(curve.getPoint(0).distanceTo(arcStart())).toBeLessThan(1e-12);
    expect(curve.getPoint(1).distanceTo(arcEnd())).toBeLessThan(1e-12);
  });

  it('hangs the blank tag from the phone by a 5 cm chain, the tag resting on the stand edge', () => {
    const m = tagMatrix();
    const corners = boxCorners(TAG.size).map((c) => c.applyMatrix4(m));
    expect(Math.min(...corners.map((c) => c.y))).toBeCloseTo(TRAY_TOP, 9);
    // The back face touches the stand's front top edge.
    const inv = m.clone().invert();
    const edge = new Vector3(TAG.x, TRAY_TOP + STAND.frontHeight, STAND_FRONT_Z).applyMatrix4(inv);
    expect(edge.z).toBeCloseTo(-TAG.size[2] / 2, 9);
    expect(Math.abs(edge.y)).toBeLessThan(TAG.size[1] / 2);
    const chain = chainPlacement();
    expect(chain.length).toBeGreaterThan(0.045);
    expect(chain.length).toBeLessThan(0.055);
    // The phone end sits on the phone's right side, near its lower right corner.
    const local = chain.from.clone().applyMatrix4(phoneMatrix().invert());
    expect(local.x).toBeCloseTo(PHONE.size[0] / 2, 9);
    expect(local.y).toBeLessThan(-PHONE.size[1] / 2 + 0.05);
    // The chain clears the stand top all the way.
    for (let k = 0; k <= 20; k++) {
      const p = chain.from.clone().lerp(chain.to, k / 20);
      if (p.z < STAND_FRONT_Z) expect(p.y).toBeGreaterThan(standTopY(p.z));
    }
  });

  it('keeps every part inside the standard slot', () => {
    const box = new Box3();
    const add = (pts: Vector3[]) => pts.forEach((p) => box.expandByPoint(p));
    add(boxCorners(TRAY.size).map((c) => c.add(new Vector3(...TRAY.center))));
    add(boxCorners(PHONE.size).map((c) => c.applyMatrix4(phoneMatrix())));
    add(boxCorners(ENVELOPE.size).map((c) => c.applyMatrix4(envelopeMatrix())));
    add(boxCorners(TAG.size).map((c) => c.applyMatrix4(tagMatrix())));
    const curve = arcCurve();
    const r = new Vector3(PULSE.radius, PULSE.radius, PULSE.radius);
    for (let k = 0; k <= 200; k++) {
      const p = curve.getPoint(k / 200);
      add([p.clone().add(r), p.clone().sub(r)]);
    }
    expect(SLOT.containsBox(box), `box ${box.min.toArray()} to ${box.max.toArray()}`).toBe(true);
  });

  it('builds the tag as a 0.06 x 0.035 x 0.003 rounded slab', () => {
    const g = roundedSlab(...TAG.size, TAG.radius, TAG.bevel, TAG.curveSegments, TAG.bevelSegments);
    g.computeBoundingBox();
    const size = g.boundingBox!.getSize(new Vector3());
    expect(size.x).toBeCloseTo(0.06, 6);
    expect(size.y).toBeCloseTo(0.035, 6);
    expect(size.z).toBeCloseTo(0.003, 6);
    g.dispose();
  });
});

describe('wailo motion: the delivery (EXPERIENCE §4.3, R0 ruling 2026-10-15)', () => {
  it('sends the pulse along the arc in 1.6 s, then flashes the bar 0.4 to 1.6 to 0.4', () => {
    expect(DELIVERY.travelS).toBe(1.6);
    expect(DELIVERY.periodS).toBe(8);
    expect(deliveryPose(DELIVERY.departS - 0.01, false).pulseScale).toBe(0);
    const mid = deliveryPose(DELIVERY.departS + DELIVERY.travelS / 2, false);
    expect(mid.pulseU).toBeCloseTo(0.5, 9);
    expect(mid.pulseScale).toBe(1);
    expect(deliveryPose(ARRIVE_S, false).pulseScale).toBeCloseTo(0, 9);
    expect(deliveryPose(ARRIVE_S, false).bar).toBeCloseTo(GLOW.barRest, 9);
    expect(deliveryPose(ARRIVE_S + DELIVERY.flashRampS, false).bar).toBeCloseTo(GLOW.barPeak, 9);
    expect(deliveryPose(ARRIVE_S + 2 * DELIVERY.flashRampS, false).bar).toBeCloseTo(
      GLOW.barRest,
      9,
    );
    expect([GLOW.barRest, GLOW.barPeak]).toEqual([0.4, 1.6]);
    // Monotonic along the arc while it travels.
    let last = -1;
    for (let t = DELIVERY.departS; t < ARRIVE_S; t += 0.05) {
      const u = deliveryPose(t, false).pulseU;
      expect(u).toBeGreaterThanOrEqual(last);
      last = u;
    }
    for (const t of [0.7, 1.9, 2.4, 5]) {
      expect(deliveryPose(t + DELIVERY.periodS, false)).toEqual(deliveryPose(t, false));
    }
  });

  it('ramps the flash over at least 0.5 s each way (1.0 s in all) and never passes 1.6', () => {
    expect(DELIVERY.flashRampS).toBeGreaterThanOrEqual(0.5);
    let max = 0;
    for (let t = 0; t < DELIVERY.periodS; t += 0.01)
      max = Math.max(max, deliveryPose(t, false).bar);
    expect(max).toBeLessThanOrEqual(1.6 + 1e-12);
    expect(max).toBeGreaterThan(1.59);
  });

  it('shows the still pose: pulse hidden, reset bar at 1.0, whatever the clock', () => {
    for (const t of [0, 1.2, 2.6, 7]) {
      expect(deliveryPose(t, true)).toEqual({ pulseU: 0, pulseScale: 0, bar: 1 });
    }
  });
});
