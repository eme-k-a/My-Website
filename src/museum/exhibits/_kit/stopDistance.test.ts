import { describe, expect, it } from 'vitest';
import { EXHIBIT_IDS, type StopId } from '../../../content/ids';
import { content } from '../../../content/index';
import { computeLayout } from '../../rail/layout';
import {
  KEEP_DISTANCE,
  MOUNT_DISTANCE,
  PRELOAD_DISTANCE,
  graphPosition,
  mountDecision,
  stopAtProgress,
  stopDistance,
} from './stopDistance';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));
const mainIds = layout.tracks.main.stops.map((s) => s.id);
const allStops: StopId[] = [
  ...mainIds,
  ...layout.tracks.projects.stops.slice(1).map((s) => s.id),
  ...layout.tracks.volunteer.stops.slice(1).map((s) => s.id),
];

describe('stopDistance (ARCHITECTURE §8.5)', () => {
  it('counts main stops by index: lobby to verafin is 1', () => {
    expect(stopDistance(layout, 'lobby', 'verafin')).toBe(1);
    expect(stopDistance(layout, 'lobby', 'desk')).toBe(mainIds.length - 1);
    expect(stopDistance(layout, 'verafin', 'verafin')).toBe(0);
  });

  it('puts a wing item at its door index plus its position: lobby to klarup', () => {
    const door = mainIds.indexOf('projects-door');
    expect(door).toBeGreaterThan(0);
    expect(stopDistance(layout, 'lobby', 'klarup')).toBe(door + 1);
    expect(stopDistance(layout, 'lobby', 'finance-tracker')).toBe(door + 2);
    expect(graphPosition(layout, 'klarup')).toEqual({ track: 'projects', main: door, depth: 1 });
  });

  it('walks inside a wing directly and between wings through the aisle', () => {
    expect(stopDistance(layout, 'klarup', 'finance-tracker')).toBe(1);
    expect(stopDistance(layout, 'projects-door', 'klarup')).toBe(1);
    const p = mainIds.indexOf('projects-door');
    const v = mainIds.indexOf('volunteer-door');
    expect(stopDistance(layout, 'finance-tracker', 'sdsj')).toBe(2 + Math.abs(p - v) + 2);
    expect(stopDistance(layout, 'safe-sip', 'wailo')).toBe(1 + mainIds.indexOf('wailo') - v);
  });

  it('is symmetric and zero only on the diagonal', () => {
    for (const a of allStops) {
      for (const b of allStops) {
        const d = stopDistance(layout, a, b);
        expect(d, `${a} to ${b}`).toBe(stopDistance(layout, b, a));
        expect(d === 0, `${a} to ${b}`).toBe(a === b);
      }
    }
  });

  it('throws on an unknown stop', () => {
    expect(() => stopDistance(layout, 'lobby', 'nowhere' as StopId)).toThrow(/unknown stop/);
  });

  it('mounts only verafin at the lobby', () => {
    const mounted = EXHIBIT_IDS.filter((id) => stopDistance(layout, 'lobby', id) <= MOUNT_DISTANCE);
    expect(mounted).toEqual(['verafin']);
  });
});

describe('mount window (mount <= 2, preload 3, keep <= 4)', () => {
  it('uses the thresholds of the brief', () => {
    expect([MOUNT_DISTANCE, PRELOAD_DISTANCE, KEEP_DISTANCE]).toEqual([2, 3, 4]);
  });

  it('mounts at distance 2 and below', () => {
    for (const d of [0, 1, 2]) expect(mountDecision(false, d).mount, `d=${d}`).toBe(true);
    expect(mountDecision(false, 3).mount).toBe(false);
  });

  it('preloads at distance 3 and below, not at 4', () => {
    expect(mountDecision(false, 3)).toEqual({ mount: false, preload: true });
    expect(mountDecision(false, 4)).toEqual({ mount: false, preload: false });
  });

  it('keeps a mounted exhibit up to 4 and unmounts beyond 4', () => {
    expect(mountDecision(true, 3).mount).toBe(true);
    expect(mountDecision(true, 4).mount).toBe(true);
    expect(mountDecision(true, 5).mount).toBe(false);
    expect(mountDecision(false, 4).mount).toBe(false);
  });
});

describe('stopAtProgress', () => {
  it('rounds progress to the nearest stop and clamps to the track', () => {
    expect(stopAtProgress(layout, 'main', 0)).toBe('lobby');
    expect(stopAtProgress(layout, 'main', 0.49)).toBe('lobby');
    expect(stopAtProgress(layout, 'main', 0.51)).toBe('verafin');
    expect(stopAtProgress(layout, 'main', -3)).toBe('lobby');
    expect(stopAtProgress(layout, 'main', 99)).toBe('desk');
    expect(stopAtProgress(layout, 'main', Number.NaN)).toBe('lobby');
    expect(stopAtProgress(layout, 'projects', 1)).toBe('klarup');
    expect(stopAtProgress(layout, 'volunteer', 0)).toBe('volunteer-door');
  });
});
