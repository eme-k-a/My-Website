// Rail clearance (EXPERIENCE §2.6, §2.8; ARCHITECTURE §6.6): every camera sample on every rail
// keeps at least MIN_CLEARANCE from every wall, and passes each opening's plane only inside the
// opening minus MIN_CLEARANCE on each side. Walls are 2D footprints in plan (x, z), taken from
// the shell (shell.ts: the room edges of `layout.rooms`, shared lines merged, with the arch, the
// wing doors, the Foundations opening and the desk opening as gaps), each as thick as the built
// wall, so the distance is to the real wall face. The rails come from rail.ts and are sampled
// with `poseAt` every `step` meters of arc length. Pure apart from three's curve maths.
import { Vector3 } from 'three';
import type { TrackId } from '../../content/ids';
import type { Layout } from '../rail/layout';
import { buildRails, poseAt, type Rail } from '../rail/rail';
import { openings, wallSpans, WALL_THICKNESS, type Opening } from './shell';

/** EXPERIENCE §2.6: the camera never comes closer than this to a wall or an opening's edge. */
export const MIN_CLEARANCE = 0.4;
/** Default sample spacing along each rail, in meters of arc length (EXPERIENCE §2.8). */
export const SAMPLE_STEP = 0.1;

const EPS = 1e-6;

/** One solid stretch of wall in plan: along `axis` on the line `at`, thick toward `outward`. */
export interface WallSegment {
  name: string;
  axis: 'x' | 'z';
  at: number;
  from: number;
  to: number;
  outward: 1 | -1;
}

export interface RailSample {
  track: TrackId;
  /** Progress in stop units (0 = first stop). */
  p: number;
  x: number;
  y: number;
  z: number;
}

export interface WallClearance {
  wall: string;
  /** Plan distance from the closest sample to the wall's footprint, meters. */
  distance: number;
  sample: RailSample;
}

export interface PlaneCrossing {
  track: TrackId;
  /** The opening crossed, or null when the rail crosses a wall line outside every opening. */
  opening: string | null;
  axis: 'x' | 'z';
  at: number;
  /** Where along the wall line the rail crosses it. */
  along: number;
  /** Distance from the crossing to the nearer edge of the opening (negative: through the wall). */
  margin: number;
}

const name = (axis: 'x' | 'z', at: number, from: number, to: number) =>
  `${axis === 'x' ? 'z' : 'x'} ${round(at)}, ${axis} ${round(from)} to ${round(to)}`;
const round = (v: number) => Math.round(v * 1000) / 1000;

/** Every solid wall stretch of the shell at eye level: the wall spans with their openings cut. */
export function wallSegments(layout: Layout): WallSegment[] {
  const holes = openings(layout);
  const out: WallSegment[] = [];
  for (const span of wallSpans(layout)) {
    const cuts = holes
      .filter(
        (o) =>
          o.axis === span.axis &&
          Math.abs(o.at - span.at) < EPS &&
          o.from < span.to - EPS &&
          o.to > span.from + EPS,
      )
      .sort((a, b) => a.from - b.from);
    let cursor = span.from;
    const push = (from: number, to: number) => {
      if (to > from + EPS) {
        out.push({ name: name(span.axis, span.at, from, to), ...span, from, to });
      }
    };
    for (const hole of cuts) {
      push(cursor, Math.max(cursor, hole.from));
      cursor = Math.max(cursor, hole.to);
    }
    push(cursor, span.to);
  }
  return out;
}

/** Plan distance from (x, z) to a wall segment's footprint (0 inside it). */
export function distanceToWall(x: number, z: number, wall: WallSegment): number {
  const [along, across] = wall.axis === 'x' ? [x, z] : [z, x];
  const lo = Math.min(wall.at, wall.at + wall.outward * WALL_THICKNESS);
  const hi = Math.max(wall.at, wall.at + wall.outward * WALL_THICKNESS);
  const da = Math.max(wall.from - along, 0, along - wall.to);
  const dc = Math.max(lo - across, 0, across - hi);
  return Math.hypot(da, dc);
}

/**
 * Camera positions along `rail` from its first stop to its last, about every `step` meters of
 * arc length, through `poseAt` (so exactly what the rig shows). Every stop is a sample.
 */
export function sampleRail(rail: Rail, step = SAMPLE_STEP): RailSample[] {
  const position = new Vector3();
  const look = new Vector3();
  const at = (p: number): RailSample => {
    poseAt(rail, p, position, look);
    return { track: rail.track, p, x: position.x, y: position.y, z: position.z };
  };
  const n = rail.stops.length;
  if (n === 0) return [];
  if (!rail.curve || n === 1) return [at(0)];
  const total = rail.curve.getLength();
  const samples: RailSample[] = [];
  for (let i = 0; i + 1 < n; i++) {
    const length = (rail.u[i + 1]! - rail.u[i]!) * total;
    const count = Math.max(1, Math.ceil(length / step));
    for (let k = 0; k < count; k++) samples.push(at(i + k / count));
  }
  samples.push(at(n - 1));
  return samples;
}

/** Samples of every track of the layout (main, then the wings). */
export function railSamples(layout: Layout, step = SAMPLE_STEP): RailSample[] {
  return Object.values(buildRails(layout)).flatMap((rail) => sampleRail(rail, step));
}

/** The closest sample to each wall, closest wall first. */
export function minClearance(
  layout: Layout,
  samples: readonly RailSample[] = railSamples(layout),
): WallClearance[] {
  return wallSegments(layout)
    .map((wall) => {
      let best: WallClearance | null = null;
      for (const s of samples) {
        const distance = distanceToWall(s.x, s.z, wall);
        if (!best || distance < best.distance) best = { wall: wall.name, distance, sample: s };
      }
      return best;
    })
    .filter((c): c is WallClearance => c !== null)
    .sort((a, b) => a.distance - b.distance);
}

const coord = (s: RailSample, axis: 'x' | 'z') => (axis === 'x' ? s.z : s.x);
const alongOf = (s: RailSample, axis: 'x' | 'z') => (axis === 'x' ? s.x : s.z);

/**
 * Every place a rail passes a wall line (between two consecutive samples of one track, on a line
 * the shell builds walls on), with its margin inside the opening there.
 */
export function planeCrossings(
  layout: Layout,
  samples: readonly RailSample[] = railSamples(layout),
): PlaneCrossing[] {
  const spans = wallSpans(layout);
  const holes = openings(layout);
  const out: PlaneCrossing[] = [];
  for (let i = 0; i + 1 < samples.length; i++) {
    const a = samples[i]!;
    const b = samples[i + 1]!;
    if (a.track !== b.track) continue;
    for (const span of spans) {
      const da = coord(a, span.axis) - span.at;
      const db = coord(b, span.axis) - span.at;
      if (da === db || (da > 0 && db > 0) || (da < 0 && db < 0)) continue;
      const t = da / (da - db);
      const along = alongOf(a, span.axis) + (alongOf(b, span.axis) - alongOf(a, span.axis)) * t;
      if (along < span.from - EPS || along > span.to + EPS) continue;
      // One crossing per line and place, even when the rail runs exactly on the line.
      const seen = out.some(
        (c) =>
          c.track === a.track &&
          c.axis === span.axis &&
          Math.abs(c.at - span.at) < EPS &&
          Math.abs(c.along - along) < 0.5,
      );
      if (seen) continue;
      const hole: Opening | undefined = holes.find(
        (o) =>
          o.axis === span.axis &&
          Math.abs(o.at - span.at) < EPS &&
          along >= o.from - EPS &&
          along <= o.to + EPS,
      );
      out.push({
        track: a.track,
        opening: hole?.name ?? null,
        axis: span.axis,
        at: span.at,
        along,
        margin: hole ? Math.min(along - hole.from, hole.to - along) : -1,
      });
    }
  }
  return out;
}

/** The smallest distance from any sample to its room's ceiling (all rails run at eye height). */
export function minCeilingClearance(
  layout: Layout,
  samples: readonly RailSample[] = railSamples(layout),
): number {
  let best = Infinity;
  for (const s of samples) {
    const rooms = layout.rooms.filter(
      (r) =>
        s.x >= r.min[0] - EPS &&
        s.x <= r.max[0] + EPS &&
        s.z >= r.min[1] - EPS &&
        s.z <= r.max[1] + EPS,
    );
    for (const r of rooms) best = Math.min(best, r.ceiling - s.y);
  }
  return best;
}
