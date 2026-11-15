import { BoxGeometry, InstancedMesh, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  BOX,
  BOX_TOP,
  createSpindleDriver,
  DISC,
  HIDDEN_Y,
  levelY,
  MOTION,
  moving,
  ROD,
  STAMP,
  stampMatrix,
  TICKET,
  TICKET_COUNT,
  ticketJitter,
  ticketMatrix,
  ticketsAt,
  TIP,
} from './spindle';

/** EXPERIENCE §4: the standard slot, local meters. */
const SLOT = { min: [-0.325, 0.025, -0.325], max: [0.325, 0.675, 0.325] };

function boxCorners(size: number[], m: Matrix4): Vector3[] {
  const out: Vector3[] = [];
  for (const sx of [-0.5, 0.5])
    for (const sy of [-0.5, 0.5])
      for (const sz of [-0.5, 0.5])
        out.push(new Vector3(sx * size[0]!, sy * size[1]!, sz * size[2]!).applyMatrix4(m));
  return out;
}

function inSlot(p: Vector3): boolean {
  const v = p.toArray();
  return [0, 1, 2].every((i) => v[i]! >= SLOT.min[i]! - 1e-9 && v[i]! <= SLOT.max[i]! + 1e-9);
}

/** Tickets drawn at full size and above the box top at clock `t`. */
const visible = (t: number) =>
  ticketsAt(t).filter((p) => p.scale > 0.999 && p.y + TICKET.size[1] > BOX_TOP);

describe('cfia geometry (EXPERIENCE §4.4)', () => {
  it('puts the box on the slot floor and the spindle on its top', () => {
    expect(BOX.center[1] - BOX.size[1] / 2).toBeCloseTo(0.025, 9);
    expect(BOX_TOP).toBeCloseTo(0.285, 9);
    expect(ROD.bottom).toBeCloseTo(BOX_TOP, 9);
    expect(ROD.top + TIP.height).toBeCloseTo(0.665, 9);
    expect(BOX_TOP + DISC.height).toBeLessThan(TICKET.base);
  });

  it('stacks 14 tickets from y 0.292 at a 0.009 pitch', () => {
    const rest = ticketsAt(0);
    expect(rest).toHaveLength(TICKET_COUNT);
    expect(visible(0)).toHaveLength(14);
    expect(rest[0]!.y).toBeCloseTo(0.292, 9);
    expect(rest[13]!.y).toBeCloseTo(0.292 + 13 * 0.009, 9);
    expect(rest[14]!.scale).toBe(0);
  });

  it('keeps each ticket yaw within 12 degrees and its offset within 4 mm', () => {
    for (let serial = 0; serial < 200; serial++) {
      const { yaw, dx, dz } = ticketJitter(serial);
      expect(Math.abs(yaw)).toBeLessThanOrEqual((12 * Math.PI) / 180);
      expect(Math.abs(dx)).toBeLessThanOrEqual(0.004);
      expect(Math.abs(dz)).toBeLessThanOrEqual(0.004);
    }
    expect(ticketJitter(3)).toEqual(ticketJitter(3));
  });

  it('keeps every ticket and stamp inside the slot through a whole cycle', () => {
    const m = new Matrix4();
    const s = new Matrix4();
    for (let t = 0; t <= MOTION.periodS * 2; t += 0.05) {
      for (const pose of ticketsAt(t)) {
        ticketMatrix(pose, m);
        expect(boxCorners(TICKET.size, m).every(inSlot)).toBe(true);
        expect(boxCorners(STAMP.size, stampMatrix(m, s)).every(inSlot)).toBe(true);
      }
    }
    expect(boxCorners(BOX.size, new Matrix4().setPosition(...BOX.center)).every(inSlot)).toBe(true);
  });

  it('keeps every stamp on its own ticket top', () => {
    const m = new Matrix4();
    const s = new Matrix4();
    const pose = ticketsAt(0)[5]!;
    ticketMatrix(pose, m);
    const inverse = m.clone().invert();
    for (const corner of boxCorners(STAMP.size, stampMatrix(m, s))) {
      const local = corner.applyMatrix4(inverse);
      expect(Math.abs(local.x)).toBeLessThanOrEqual(TICKET.size[0] / 2);
      expect(Math.abs(local.z)).toBeLessThanOrEqual(TICKET.size[2] / 2);
      expect(local.y).toBeGreaterThanOrEqual(TICKET.size[1] / 2 - 1e-9);
    }
  });
});

describe('cfia motion (one: descend and settle, period 6 s)', () => {
  it('rests with no falling ticket until 2.8 s, then descends from y 0.60', () => {
    expect(moving(0)).toBe(false);
    expect(moving(2.79)).toBe(false);
    expect(moving(2.81)).toBe(true);
    const start = ticketsAt(MOTION.restS + 1e-6)[14]!;
    expect(start.y).toBeCloseTo(MOTION.fromY, 4);
    const landed = ticketsAt(MOTION.restS + MOTION.descendS)[14]!;
    expect(landed.y).toBeCloseTo(levelY(14), 9);
    expect(landed.scale).toBe(1);
  });

  it('sinks the stack one pitch so the bottom ticket goes into the box', () => {
    const end = ticketsAt(MOTION.periodS - 1e-9);
    expect(end[0]!.y).toBeLessThanOrEqual(HIDDEN_Y + 1e-6);
    expect(end[0]!.y + TICKET.size[1] + STAMP.size[1]).toBeLessThan(BOX_TOP);
    expect(end[1]!.y).toBeCloseTo(levelY(0), 6);
    expect(end[14]!.y).toBeCloseTo(levelY(13), 6);
  });

  it('is continuous across the cycle boundary (the stack hands over serials)', () => {
    const before = ticketsAt(MOTION.periodS - 1e-7);
    const after = ticketsAt(MOTION.periodS);
    for (const pose of after.filter((p) => p.scale > 0)) {
      const same = before.find((p) => p.serial === pose.serial);
      expect(same).toBeDefined();
      expect(pose.y).toBeCloseTo(same!.y, 5);
    }
  });

  it('never shows more than 14 settled tickets (the stack never grows)', () => {
    for (let t = 0; t <= 30; t += 0.1) {
      const settled = visible(t).filter((p) => p.serial < Math.floor(t / 6) + 14);
      expect(settled.length).toBeLessThanOrEqual(14);
    }
    expect(visible(6)).toHaveLength(14);
    expect(visible(12.5)).toHaveLength(14);
  });
});

describe('cfia driver', () => {
  const mesh = () => new InstancedMesh(new BoxGeometry(...TICKET.size), undefined, TICKET_COUNT);

  it('pins the rest pose under reduced motion and writes once', () => {
    const driver = createSpindleDriver();
    const t = mesh();
    const s = mesh();
    expect(driver.apply(t, s, 4, true)).toBe(true);
    expect(driver.apply(t, s, 5, true)).toBe(false);
    const m = new Matrix4();
    t.getMatrixAt(14, m);
    expect(new Vector3().setFromMatrixScale(m).x).toBeLessThan(1e-3);
  });

  it('writes during motion and not again during the same rest', () => {
    const driver = createSpindleDriver();
    const t = mesh();
    const s = mesh();
    expect(driver.apply(t, s, 0, false)).toBe(true);
    expect(driver.apply(t, s, 1, false)).toBe(false);
    expect(driver.apply(t, s, 3, false)).toBe(true);
    expect(driver.apply(t, s, 3, false)).toBe(false);
    expect(driver.apply(t, s, 6.5, false)).toBe(true);
    expect(driver.apply(t, s, 7, false)).toBe(false);
  });
});
