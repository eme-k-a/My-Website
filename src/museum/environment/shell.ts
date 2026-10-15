// The greybox hall shell (EXPERIENCE §2.2, §2.3): walls, openings and ceilings for every room of
// `layout.rooms`, as axis-aligned boxes. Pure, so the unit tests can walk the rails through it.
// - Every room edge is a wall at the room's ceiling height. Where two rooms share a wall line the
//   wall is built once, as tall as the taller room, with its inner face on the shared line and its
//   thickness going into the room that comes later in layout order (the lobby's back wall goes
//   into the aisle, the aisle walls into the wings). So wall titles and signs on the earlier
//   room's side sit on a face exactly at the layout coordinate.
// - Openings are cut from those walls: the lobby arch (x -2 to 2, 3.6 m tall), each wing door
//   (2.4 x 2.8 m), the full-width Foundations opening under its 0.4 m deep header beam, and the
//   desk opening (x -2.5 to 2.5, 3.2 m tall). A lintel closes the wall above each opening.
import { BoxGeometry, PlaneGeometry, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DOOR_H, type Layout, type Room, type Vec3 } from '../rail/layout';

export const WALL_THICKNESS = 0.2;
export const CEILING_THICKNESS = 0.2;
/** EXPERIENCE §2.3: the arch in the lobby back wall. */
export const ARCH_HALF_WIDTH = 2;
export const ARCH_HEIGHT = 3.6;
/** EXPERIENCE §2.2 rule 3: the opening from Foundations into the desk zone. */
export const DESK_OPENING_HALF_WIDTH = 2.5;
export const DESK_OPENING_HEIGHT = 3.2;
/** EXPERIENCE §2.3: the "FOUNDATIONS" header beam spanning the aisle end (sign baseline 4.3). */
export const FOUNDATIONS_BEAM_BOTTOM = 4;
export const FOUNDATIONS_BEAM_DEPTH = 0.4;

const EPS = 1e-6;
const near = (a: number, b: number) => Math.abs(a - b) < EPS;
const key = (value: number) => Math.round(value / EPS) * EPS;

export type BoxKind = 'wall' | 'lintel' | 'beam' | 'ceiling';

export interface AxisBox {
  min: Vec3;
  max: Vec3;
  kind: BoxKind;
}

/** A straight wall line: along x at z = `at` (axis 'x'), or along z at x = `at` (axis 'z'). */
export interface WallSpan {
  axis: 'x' | 'z';
  at: number;
  from: number;
  to: number;
  height: number;
  /** The side the thickness goes to (+1 toward +z or +x). */
  outward: 1 | -1;
}

export interface Opening {
  name: string;
  axis: 'x' | 'z';
  at: number;
  from: number;
  to: number;
  /** Clear height of the opening. */
  top: number;
  /** Depth of the lintel when it is a beam rather than the wall's own thickness. */
  lintelDepth?: number;
}

interface Edge extends Omit<WallSpan, 'height'> {
  ceiling: number;
  order: number;
}

function roomEdges(room: Room, order: number): Edge[] {
  const [x0, z0] = room.min;
  const [x1, z1] = room.max;
  const c = room.ceiling;
  return [
    { axis: 'x', at: z0, from: x0, to: x1, outward: -1, ceiling: c, order },
    { axis: 'x', at: z1, from: x0, to: x1, outward: 1, ceiling: c, order },
    { axis: 'z', at: x0, from: z0, to: z1, outward: -1, ceiling: c, order },
    { axis: 'z', at: x1, from: z0, to: z1, outward: 1, ceiling: c, order },
  ];
}

/** Every wall line of the rooms, shared lines merged (see the file comment). */
export function wallSpans(layout: Layout): WallSpan[] {
  const lines = new Map<string, Edge[]>();
  layout.rooms.forEach((room, order) => {
    for (const edge of roomEdges(room, order)) {
      const id = `${edge.axis}:${key(edge.at)}`;
      lines.set(id, [...(lines.get(id) ?? []), edge]);
    }
  });
  const spans: WallSpan[] = [];
  for (const edges of lines.values()) {
    const cuts = [...new Set(edges.flatMap((e) => [key(e.from), key(e.to)]))].sort((a, b) => a - b);
    let current: WallSpan | null = null;
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i]!;
      const b = cuts[i + 1]!;
      const covering = edges
        .filter((e) => e.from <= a + EPS && e.to >= b - EPS)
        .sort((p, q) => p.order - q.order);
      const first = covering[0];
      if (!first) {
        if (current) spans.push(current);
        current = null;
        continue;
      }
      const height = Math.max(...covering.map((e) => e.ceiling));
      if (current && near(current.to, a) && current.height === height) {
        if (current.outward === first.outward) {
          current.to = b;
          continue;
        }
      }
      if (current) spans.push(current);
      current = { axis: first.axis, at: first.at, from: a, to: b, height, outward: first.outward };
    }
    if (current) spans.push(current);
  }
  return spans;
}

function roomById(layout: Layout, id: Room['id']): Room {
  const room = layout.rooms.find((r) => r.id === id);
  if (!room) throw new Error(`The layout has no '${id}' room`);
  return room;
}

const midX = (room: Room) => (room.min[0] + room.max[0]) / 2;

/** The arch, the wing doors, the Foundations opening and the desk opening. */
export function openings(layout: Layout): Opening[] {
  const lobby = roomById(layout, 'lobby');
  const aisle = roomById(layout, 'aisle');
  const foundations = roomById(layout, 'foundations');
  const desk = roomById(layout, 'desk');
  return [
    {
      name: 'arch',
      axis: 'x',
      at: lobby.min[1],
      from: midX(aisle) - ARCH_HALF_WIDTH,
      to: midX(aisle) + ARCH_HALF_WIDTH,
      top: ARCH_HEIGHT,
    },
    ...layout.doors.map((door): Opening => ({
      name: `${door.wing}-door`,
      axis: 'z',
      at: door.side === 'left' ? aisle.min[0] : aisle.max[0],
      from: door.z - door.width / 2,
      to: door.z + door.width / 2,
      top: DOOR_H,
    })),
    {
      name: 'foundations',
      axis: 'x',
      at: foundations.max[1],
      from: aisle.min[0],
      to: aisle.max[0],
      top: FOUNDATIONS_BEAM_BOTTOM,
      lintelDepth: FOUNDATIONS_BEAM_DEPTH,
    },
    {
      name: 'desk',
      axis: 'x',
      at: desk.max[1],
      from: midX(desk) - DESK_OPENING_HALF_WIDTH,
      to: midX(desk) + DESK_OPENING_HALF_WIDTH,
      top: DESK_OPENING_HEIGHT,
    },
  ];
}

function spanBox(
  span: WallSpan,
  from: number,
  to: number,
  y0: number,
  y1: number,
  depth: number,
  kind: BoxKind,
): AxisBox {
  const t0 = span.at;
  const t1 = span.at + span.outward * depth;
  const lo = Math.min(t0, t1);
  const hi = Math.max(t0, t1);
  return span.axis === 'x'
    ? { min: [from, y0, lo], max: [to, y1, hi], kind }
    : { min: [lo, y0, from], max: [hi, y1, to], kind };
}

/** Walls with their openings cut, lintels and the header beam, plus one ceiling slab per room. */
export function shellBoxes(layout: Layout): AxisBox[] {
  const holes = openings(layout);
  const boxes: AxisBox[] = [];
  for (const span of wallSpans(layout)) {
    const cuts = holes
      .filter(
        (o) =>
          o.axis === span.axis &&
          near(o.at, span.at) &&
          o.from < span.to - EPS &&
          o.to > span.from + EPS,
      )
      .sort((p, q) => p.from - q.from);
    let cursor = span.from;
    for (const hole of cuts) {
      const a = Math.max(hole.from, span.from);
      const b = Math.min(hole.to, span.to);
      if (a > cursor + EPS) {
        boxes.push(spanBox(span, cursor, a, 0, span.height, WALL_THICKNESS, 'wall'));
      }
      if (hole.top < span.height) {
        const depth = hole.lintelDepth ?? WALL_THICKNESS;
        const kind = hole.lintelDepth === undefined ? 'lintel' : 'beam';
        boxes.push(spanBox(span, a, b, hole.top, span.height, depth, kind));
      }
      cursor = Math.max(cursor, b);
    }
    if (span.to > cursor + EPS) {
      boxes.push(spanBox(span, cursor, span.to, 0, span.height, WALL_THICKNESS, 'wall'));
    }
  }
  for (const room of layout.rooms) {
    boxes.push({
      min: [room.min[0], room.ceiling, room.min[1]],
      max: [room.max[0], room.ceiling + CEILING_THICKNESS, room.max[1]],
      kind: 'ceiling',
    });
  }
  return boxes;
}

/** All shell boxes merged into one geometry (one draw call with the `wall` material). */
export function shellGeometry(layout: Layout): BufferGeometry {
  const parts = shellBoxes(layout).map((box) => {
    const size = [0, 1, 2].map((i) => box.max[i]! - box.min[i]!) as Vec3;
    const center = [0, 1, 2].map((i) => (box.max[i]! + box.min[i]!) / 2) as Vec3;
    return new BoxGeometry(...size).translate(...center);
  });
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  if (!merged) throw new Error('The hall shell failed to merge');
  merged.computeBoundingSphere();
  return merged;
}

/** The floor of one room: a plane at y 0 covering the room's footprint. */
export function floorGeometry(room: Room): BufferGeometry {
  const width = room.max[0] - room.min[0];
  const depth = room.max[1] - room.min[1];
  return new PlaneGeometry(width, depth)
    .rotateX(-Math.PI / 2)
    .translate(midX(room), 0, (room.min[1] + room.max[1]) / 2);
}
