import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import { BACKING_PANEL_SIZE } from '../exhibits/_kit/anatomy';
import { slotPlacard } from '../exhibits/_kit/placard';
import { computeLayout, DOOR_H, type Layout, type Vec3 } from '../rail/layout';
import { DOOR_TRANSOM } from './labels3d';
import {
  ARCH_HEIGHT,
  CEILING_SLOT_WIDTH,
  ceilingSlotGeometry,
  ceilingSlots,
  FOUNDATIONS_BEAM_BOTTOM,
  FOUNDATIONS_BEAM_DEPTH,
  FLOOR_ROTATION_X,
  floorGeometry,
  openings,
  shellBoxes,
  shellGeometry,
  wallSpans,
  type AxisBox,
} from './shell';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));
const boxes = shellBoxes(layout);

/** Does the segment p to q pass through the open box (slab method, strict interior)? */
function segmentHitsBox(p: Vec3, q: Vec3, box: AxisBox, shrink = 1e-4): boolean {
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 3; i++) {
    const lo = box.min[i]! + shrink;
    const hi = box.max[i]! - shrink;
    const d = q[i]! - p[i]!;
    if (Math.abs(d) < 1e-12) {
      if (p[i]! <= lo || p[i]! >= hi) return false;
      continue;
    }
    let a = (lo - p[i]!) / d;
    let b = (hi - p[i]!) / d;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 >= t1) return false;
  }
  return true;
}

function distanceToBox(p: Vec3, box: AxisBox): number {
  const d = [0, 1, 2].map((i) => Math.max(box.min[i]! - p[i]!, 0, p[i]! - box.max[i]!));
  return Math.hypot(...d);
}

/** Camera path of a track: stop cameras with the via points spliced in. */
function cameraPath(l: Layout, track: keyof Layout['tracks']): Vec3[] {
  const t = l.tracks[track];
  const path: Vec3[] = [];
  t.stops.forEach((stop, i) => {
    path.push(stop.camera);
    for (const via of t.via) if (via.after === i) path.push(via.point);
  });
  return path;
}

describe('greybox shell (EXPERIENCE §2.2, §2.3)', () => {
  it('has a floor and a ceiling for every room', () => {
    const ceilings = boxes.filter((b) => b.kind === 'ceiling');
    expect(ceilings).toHaveLength(layout.rooms.length);
    for (const room of layout.rooms) {
      const floor = floorGeometry(room).rotateX(FLOOR_ROTATION_X);
      floor.computeBoundingBox();
      const bb = floor.boundingBox!;
      expect([bb.min.x, bb.max.x, bb.min.z, bb.max.z], room.id).toEqual([
        room.min[0],
        room.max[0],
        room.min[1],
        room.max[1],
      ]);
      expect(ceilings.some((c) => c.min[1] === room.ceiling)).toBe(true);
    }
  });

  it('cuts the arch, both doors, the Foundations opening and the desk opening', () => {
    const names = openings(layout).map((o) => o.name);
    expect(names).toEqual(['arch', 'projects-door', 'volunteer-door', 'foundations', 'desk']);
    const arch = openings(layout)[0]!;
    expect([arch.at, arch.from, arch.to, arch.top]).toEqual([-4, -2, 2, ARCH_HEIGHT]);
    // F-022: the top of each 2.8 m door is a solid transom that carries the room name.
    for (const door of openings(layout).filter((o) => o.name.endsWith('-door'))) {
      expect(door.top, door.name).toBeCloseTo(DOOR_H - DOOR_TRANSOM, 9);
      expect(door.to - door.from, door.name).toBeCloseTo(2.4, 9);
    }
    for (const hole of openings(layout)) {
      // A thin probe in the opening plane, from the floor to just under the opening top.
      const probe: AxisBox =
        hole.axis === 'x'
          ? {
              min: [hole.from + 0.01, 0.01, hole.at - 0.05],
              max: [hole.to - 0.01, hole.top - 0.01, hole.at + 0.05],
              kind: 'wall',
            }
          : {
              min: [hole.at - 0.05, 0.01, hole.from + 0.01],
              max: [hole.at + 0.05, hole.top - 0.01, hole.to - 0.01],
              kind: 'wall',
            };
      const blocked = boxes.filter((b) =>
        [0, 1, 2].every((i) => b.min[i]! < probe.max[i]! && b.max[i]! > probe.min[i]!),
      );
      expect(blocked, hole.name).toEqual([]);
    }
  });

  it('closes the wall above each opening (lintels and the 0.4 m Foundations beam)', () => {
    const beam = boxes.filter((b) => b.kind === 'beam');
    expect(beam).toHaveLength(1);
    expect(beam[0]!.min[1]).toBe(FOUNDATIONS_BEAM_BOTTOM);
    expect(beam[0]!.max[2] - beam[0]!.min[2]).toBeCloseTo(FOUNDATIONS_BEAM_DEPTH, 9);
    // The beam's sign face looks up the aisle from z = zEnd.
    expect(beam[0]!.max[2]).toBeCloseTo(layout.rooms.find((r) => r.id === 'aisle')!.min[1], 9);
    expect(boxes.filter((b) => b.kind === 'lintel').length).toBe(openings(layout).length - 1);
  });

  it('builds each shared wall once (the aisle walls are single spans per side)', () => {
    const aisle = layout.rooms.find((r) => r.id === 'aisle')!;
    for (const x of [aisle.min[0], aisle.max[0]]) {
      const spans = wallSpans(layout).filter((s) => s.axis === 'z' && s.at === x);
      expect(spans, `x ${x}`).toHaveLength(1);
      expect([spans[0]!.from, spans[0]!.to, spans[0]!.height]).toEqual([
        aisle.min[1],
        aisle.max[1],
        aisle.ceiling,
      ]);
    }
  });

  it('lets every rail pass through the openings: no wall between consecutive cameras', () => {
    for (const track of ['main', 'projects', 'volunteer'] as const) {
      const path = cameraPath(layout, track);
      for (let i = 0; i + 1 < path.length; i++) {
        const hits = boxes.filter((b) => segmentHitsBox(path[i]!, path[i + 1]!, b));
        expect(hits, `${track} segment ${i}`).toEqual([]);
      }
    }
  });

  it('gives every stop a clear view of its look target and 0.4 m around its camera', () => {
    for (const track of Object.values(layout.tracks)) {
      for (const stop of track.stops) {
        const hits = boxes.filter((b) => segmentHitsBox(stop.camera, stop.look, b));
        expect(hits, stop.id).toEqual([]);
        const nearest = Math.min(...boxes.map((b) => distanceToBox(stop.camera, b)));
        expect(nearest, stop.id).toBeGreaterThanOrEqual(0.4);
      }
    }
  });

  it('puts a wall face right behind every wall title', () => {
    for (const slot of layout.slots) {
      const spec = slotPlacard(layout, slot);
      const at: Vec3 = [spec.position[0], spec.number.baselineY, spec.position[2]];
      expect(
        boxes.some((b) => distanceToBox(at, b) === 0),
        slot.id,
      ).toBe(false);
      const behind = Math.min(...boxes.map((b) => distanceToBox(at, b)));
      // Over the wall vitrine the titles also clear the walnut backing panel.
      const panel = slot.mount === 'wall' ? BACKING_PANEL_SIZE[2] : 0;
      expect(behind, slot.id).toBeLessThanOrEqual(0.011 + panel);
    }
  });

  it('hangs a ceiling slot down the aisle and across each wing, on the door axis', () => {
    const strips = ceilingSlots(layout);
    expect(strips.map((s) => s.name)).toEqual(['aisle', 'projects', 'volunteer']);
    for (const door of layout.doors) {
      const wing = layout.rooms.find((r) => r.id === door.wing)!;
      const strip = strips.find((s) => s.name === door.wing)!;
      expect(strip.center[2]).toBe(door.z);
      expect(strip.center[1]).toBeCloseTo(wing.ceiling - 0.01, 9);
      expect(strip.size[1]).toBe(CEILING_SLOT_WIDTH);
      const [x0, x1] = [strip.center[0] - strip.size[0] / 2, strip.center[0] + strip.size[0] / 2];
      expect(x0).toBeGreaterThan(wing.min[0]);
      expect(x1).toBeLessThan(wing.max[0]);
    }
    const geometry = ceilingSlotGeometry(layout);
    geometry.computeVertexNormals();
    expect(geometry.getAttribute('normal').getY(0)).toBeCloseTo(-1, 9);
  });

  it('merges the whole shell into one geometry', () => {
    const geometry = shellGeometry(layout);
    const triangles = geometry.getIndex()!.count / 3;
    expect(triangles).toBe(boxes.length * 12);
    expect(geometry.groups.length).toBeLessThanOrEqual(1);
  });
});
