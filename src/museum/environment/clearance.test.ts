import { describe, expect, it } from 'vitest';
import { doorId } from '../../content/ids';
import { content } from '../../content/index';
import type { Content } from '../../content/types';
import { computeLayout, EYE_Y, type Layout } from '../rail/layout';
import {
  distanceToWall,
  MIN_CLEARANCE,
  minCeilingClearance,
  minClearance,
  planeCrossings,
  railSamples,
  wallSegments,
} from './clearance';
import { openings } from './shell';

const NOW = new Date('2026-10-15T00:00:00Z');
/** Millimeters, with -0 folded into 0. */
const r = (v: number) => Math.round(v * 1000) / 1000 + 0;

/** Today's content with the projects wing after mysa on the right and volunteer after wailo. */
function movedWings(): Content {
  const c = structuredClone(content);
  const projects = c.wings.find((w) => w.id === 'projects')!;
  const volunteer = c.wings.find((w) => w.id === 'volunteer')!;
  projects.after = 'mysa';
  projects.side = 'right';
  volunteer.after = 'wailo';
  return c;
}

const cases: [string, Layout][] = [
  ['today', computeLayout(content, NOW)],
  ['moved wings', computeLayout(movedWings(), NOW)],
];

describe.each(cases)('rail clearance, %s (EXPERIENCE §2.6, §2.8)', (_, layout) => {
  const samples = railSamples(layout);

  it('samples every rail about every 0.1 m, through every stop', () => {
    for (const track of ['main', 'projects', 'volunteer'] as const) {
      const own = samples.filter((s) => s.track === track);
      for (let i = 0; i + 1 < own.length; i++) {
        const a = own[i]!;
        const b = own[i + 1]!;
        expect(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)).toBeLessThanOrEqual(0.105);
      }
      for (const stop of layout.tracks[track].stops) {
        expect(
          own.some(
            (s) =>
              Math.hypot(s.x - stop.camera[0], s.y - stop.camera[1], s.z - stop.camera[2]) < 1e-9,
          ),
          stop.id,
        ).toBe(true);
      }
    }
  });

  it('(a) keeps every sample on the main and both wing rails 0.4 m from every wall', () => {
    const clearances = minClearance(layout, samples);
    expect(clearances.length).toBe(wallSegments(layout).length);
    const tooClose = clearances.filter((c) => c.distance < MIN_CLEARANCE);
    expect(tooClose).toEqual([]);
    // Wings: the room's walls are actually approached (the rail goes in).
    for (const door of layout.doors) {
      const room = layout.rooms.find((r) => r.id === door.wing)!;
      const inside = samples.filter(
        (s) => s.track === door.wing && Math.abs(s.x) > Math.abs(room.min[0] + room.max[0]) / 2 - 2,
      );
      expect(inside.length, door.wing).toBeGreaterThan(0);
    }
  });

  it('keeps the eye 0.4 m under every ceiling and opening head', () => {
    expect(minCeilingClearance(layout, samples)).toBeGreaterThanOrEqual(MIN_CLEARANCE);
    for (const o of openings(layout)) expect(o.top - EYE_Y, o.name).toBeGreaterThanOrEqual(0.4);
  });

  it('(b) crosses wall planes only inside an opening, 0.4 m clear of both edges', () => {
    const crossings = planeCrossings(layout, samples);
    expect(crossings.filter((c) => c.opening === null)).toEqual([]);
    expect(crossings.filter((c) => c.margin < MIN_CLEARANCE)).toEqual([]);
    // Each wing rail goes through its own door exactly once; the main rail through no door.
    for (const door of layout.doors) {
      const through = crossings.filter((c) => c.opening === doorId(door.wing));
      expect(
        through.map((c) => c.track),
        door.wing,
      ).toEqual([door.wing]);
    }
    // The main rail passes the arch, the Foundations opening and the desk opening once each.
    expect(
      crossings
        .filter((c) => c.track === 'main')
        .map((c) => c.opening)
        .sort(),
    ).toEqual(['arch', 'desk', 'foundations']);
  });
});

describe('moving a wing in content moves its whole room', () => {
  const [, today] = cases[0]!;
  const [, moved] = cases[1]!;
  const work = (l: Layout, id: string) => l.slots.find((s) => s.id === id)!.position[2];

  it('puts each door at the new midpoint, on the new side', () => {
    const projects = moved.doors.find((d) => d.wing === 'projects')!;
    const volunteer = moved.doors.find((d) => d.wing === 'volunteer')!;
    expect(projects.side).toBe('right');
    expect(projects.z).toBeCloseTo((work(moved, 'mysa') + work(moved, 'wailo')) / 2, 9);
    expect(volunteer.z).toBeCloseTo((work(moved, 'wailo') + work(moved, 'cfia')) / 2, 9);
  });

  it('moves rooms, plinths and stops by the door shift (mirrored for a side change)', () => {
    for (const wing of content.wings) {
      const a = today.doors.find((d) => d.wing === wing.id)!;
      const b = moved.doors.find((d) => d.wing === wing.id)!;
      const dz = b.z - a.z;
      const flip = (a.side === b.side ? 1 : -1) as 1 | -1;
      const map = ([x, z]: [number, number]): [number, number] => [r(x * flip), r(z + dz)];
      const roomA = today.rooms.find((r) => r.id === wing.id)!;
      const roomB = moved.rooms.find((r) => r.id === wing.id)!;
      const corners = [map(roomA.min), map(roomA.max)];
      expect([
        r(Math.min(corners[0]![0], corners[1]![0])),
        r(Math.min(corners[0]![1], corners[1]![1])),
      ]).toEqual(roomB.min.map(r));
      expect([
        r(Math.max(corners[0]![0], corners[1]![0])),
        r(Math.max(corners[0]![1], corners[1]![1])),
      ]).toEqual(roomB.max.map(r));
      for (const item of wing.items) {
        const sa = today.slots.find((s) => s.id === item)!.position;
        const sb = moved.slots.find((s) => s.id === item)!.position;
        expect([r(sb[0]), r(sb[2])], item).toEqual(map([sa[0], sa[2]]));
      }
      const stopsA = today.tracks[wing.id].stops;
      const stopsB = moved.tracks[wing.id].stops;
      expect(stopsB.map((s) => s.id)).toEqual(stopsA.map((s) => s.id));
      stopsA.forEach((s, i) => {
        const t = stopsB[i]!;
        expect([r(t.camera[0]), r(t.camera[2])], s.id).toEqual(map([s.camera[0], s.camera[2]]));
        expect([r(t.look[0]), r(t.look[2])], s.id).toEqual(map([s.look[0], s.look[2]]));
      });
    }
  });

  it('cuts the moved doors into the aisle walls and closes the old ones', () => {
    const doorHoles = (l: Layout) =>
      openings(l)
        .filter((o) => o.name.endsWith('-door'))
        .map((o) => [o.name, o.at, (o.from + o.to) / 2]);
    expect(doorHoles(moved)).toEqual([
      ['projects-door', 3.5, -28],
      ['volunteer-door', 3.5, -40],
    ]);
    // Today's projects door at (-3.5, -16) is solid wall in the moved layout.
    const left = wallSegments(moved).filter((w) => w.axis === 'z' && w.at === -3.5);
    expect(left.some((w) => distanceToWall(-3.5, -16, w) === 0)).toBe(true);
  });
});

describe('distanceToWall', () => {
  it('measures to the wall footprint, thickness included', () => {
    const wall = { name: 'w', axis: 'z' as const, at: 3.5, from: -10, to: 0, outward: 1 as const };
    expect(distanceToWall(3, -5, wall)).toBeCloseTo(0.5, 9);
    expect(distanceToWall(4, -5, wall)).toBeCloseTo(0.3, 9);
    expect(distanceToWall(3.6, -5, wall)).toBe(0);
    expect(distanceToWall(3.5, 0.3, wall)).toBeCloseTo(0.3, 9);
  });
});
