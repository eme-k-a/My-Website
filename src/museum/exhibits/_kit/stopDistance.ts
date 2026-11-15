// Stop-graph distance and the mount window (ARCHITECTURE §7.4, §8.5; EXPERIENCE §5.1). Pure: the
// layout is the only input, so the numbers move with the content like everything else.
// - Main stops sit at their index on the main track.
// - A wing item sits `depth` hops inside its wing: its door's main index plus its position on the
//   wing track (the door is position 0, the first item 1). So lobby to klarup is the projects-door
//   index plus 1.
// - Two stops in the same wing are |depth a - depth b| apart; otherwise a walk goes out to the
//   main track, along it, and into the other wing.
import { WING_IDS, type StopId, type TrackId } from '../../../content/ids';
import type { Layout } from '../../rail/layout';

/** Exhibits mount (hidden, then compile and reveal) at most this many stops away. */
export const MOUNT_DISTANCE = 2;
/** `manifest.load()` runs (chunk preload) at most this many stops away. */
export const PRELOAD_DISTANCE = 3;
/** A mounted exhibit stays mounted up to this distance and is disposed beyond it. */
export const KEEP_DISTANCE = 4;

export interface GraphPosition {
  /** The track the stop belongs to ('main' for doors and main stops). */
  track: TrackId;
  /** Index on the main track; a wing item uses its door's index. */
  main: number;
  /** Hops into the wing (0 on the main track). */
  depth: number;
}

/** Where a stop sits on the stop graph. Throws for an id the layout does not know. */
export function graphPosition(layout: Layout, id: StopId): GraphPosition {
  const mainStops = layout.tracks.main.stops;
  const mainIndex = mainStops.findIndex((s) => s.id === id);
  if (mainIndex >= 0) return { track: 'main', main: mainIndex, depth: 0 };
  for (const wing of WING_IDS) {
    const stops = layout.tracks[wing].stops;
    const depth = stops.findIndex((s) => s.id === id);
    if (depth <= 0) continue; // index 0 is the door, which the main track already holds
    const door = stops[0]!.id;
    const doorIndex = mainStops.findIndex((s) => s.id === door);
    if (doorIndex < 0) throw new Error(`stopDistance: door '${door}' is not on the main track`);
    return { track: wing, main: doorIndex, depth };
  }
  throw new Error(`stopDistance: unknown stop '${id}'`);
}

/** Hops between two stops on the stop graph. */
export function stopDistance(layout: Layout, a: StopId, b: StopId): number {
  const pa = graphPosition(layout, a);
  const pb = graphPosition(layout, b);
  if (pa.track !== 'main' && pa.track === pb.track) return Math.abs(pa.depth - pb.depth);
  return pa.depth + Math.abs(pa.main - pb.main) + pb.depth;
}

export interface MountDecision {
  /** Render the exhibit (hidden until compiled). */
  mount: boolean;
  /** Start loading the exhibit chunk. */
  preload: boolean;
}

/**
 * The mount window with hysteresis: mount at distance <= 2, keep a mounted exhibit up to 4,
 * dispose beyond 4; preload the chunk at <= 3.
 */
export function mountDecision(wasMounted: boolean, distance: number): MountDecision {
  return {
    mount: distance <= MOUNT_DISTANCE || (wasMounted && distance <= KEEP_DISTANCE),
    preload: distance <= PRELOAD_DISTANCE,
  };
}

/** The stop nearest to rail progress `p` on `track` (the visitor's stop while walking). */
export function stopAtProgress(layout: Layout, track: TrackId, p: number): StopId {
  const stops = layout.tracks[track].stops;
  if (stops.length === 0) return layout.tracks.main.stops[0]?.id ?? 'lobby';
  const i = Math.min(stops.length - 1, Math.max(0, Math.round(Number.isFinite(p) ? p : 0)));
  return stops[i]!.id;
}
