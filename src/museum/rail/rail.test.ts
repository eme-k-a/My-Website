import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import type { TrackId } from '../../content/ids';
import { computeLayout } from './layout';
import { buildRail, buildRails, poseArraysAt, poseAt } from './rail';

const NOW = new Date('2026-10-15T00:00:00Z');
const layout = computeLayout(content, NOW);
const rails = buildRails(layout);
const TRACKS: TrackId[] = ['main', 'projects', 'volunteer'];

const distance = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);

describe('rail', () => {
  it('has one rail per track with a u per stop', () => {
    for (const track of TRACKS) {
      expect(rails[track].stops.map((s) => s.id)).toEqual(
        layout.tracks[track].stops.map((s) => s.id),
      );
      expect(rails[track].u).toHaveLength(layout.tracks[track].stops.length);
      expect(rails[track].curve).not.toBeNull();
    }
    expect(rails.main.stops).toHaveLength(10);
    expect(rails.projects.stops.map((s) => s.id)).toEqual([
      'projects-door',
      'klarup',
      'finance-tracker',
    ]);
  });

  it('gives every stop a strictly increasing arc-length parameter inside (0, 1)', () => {
    for (const track of TRACKS) {
      const { u } = rails[track];
      expect(u[0]).toBeGreaterThan(0);
      expect(u.at(-1)).toBeLessThan(1);
      for (let i = 1; i < u.length; i++) expect(u[i]).toBeGreaterThan(u[i - 1]!);
    }
  });

  it('places the curve point at each u exactly on that stop camera', () => {
    for (const track of TRACKS) {
      const rail = rails[track];
      rail.stops.forEach((stop, i) => {
        const point = rail.curve!.getPointAt(rail.u[i]!, new Vector3()).toArray();
        expect(distance(point, stop.camera), `${track} ${stop.id}`).toBeLessThan(1e-6);
      });
    }
  });

  it('equals the layout pose at every integer progress', () => {
    for (const track of TRACKS) {
      layout.tracks[track].stops.forEach((stop, i) => {
        const pose = poseArraysAt(rails[track], i);
        expect(pose.position).toEqual(stop.camera);
        expect(pose.look).toEqual(stop.look);
      });
    }
  });

  it('is continuous: no jump above 5 cm between samples 0.001 apart', () => {
    for (const track of TRACKS) {
      const rail = rails[track];
      const last = rail.stops.length - 1;
      let previous = poseArraysAt(rail, 0);
      let worst = 0;
      for (let k = 1; k <= last * 1000; k++) {
        const pose = poseArraysAt(rail, k / 1000);
        worst = Math.max(worst, distance(pose.position, previous.position));
        expect(distance(pose.look, previous.look)).toBeLessThan(0.05);
        previous = pose;
      }
      expect(worst, `${track} largest step`).toBeLessThan(0.05);
    }
  });

  it('moves at constant speed within a segment', () => {
    const rail = rails.main;
    const at = (p: number) => poseArraysAt(rail, p).position;
    const steps = [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => distance(at(2 + f), at(2 + f + 0.01)));
    for (const step of steps) expect(step).toBeCloseTo(steps[0]!, 3);
  });

  it('passes a wing through its door threshold T', () => {
    for (const wing of ['projects', 'volunteer'] as const) {
      const T = layout.tracks[wing].via[0]!.point;
      let nearest = Infinity;
      for (let k = 0; k <= 1000; k++) {
        nearest = Math.min(nearest, distance(poseArraysAt(rails[wing], k / 1000).position, T));
      }
      expect(nearest, `${wing} passes T`).toBeLessThan(0.02);
    }
  });

  it('clamps progress to the track and treats non-finite progress as 0', () => {
    const rail = rails.main;
    expect(poseArraysAt(rail, -3)).toEqual(poseArraysAt(rail, 0));
    expect(poseArraysAt(rail, 42)).toEqual(poseArraysAt(rail, 9));
    expect(poseArraysAt(rail, Number.NaN)).toEqual(poseArraysAt(rail, 0));
  });

  it('blends the gaze from one stop to the next', () => {
    const rail = rails.main;
    const a = layout.tracks.main.stops[1]!.look;
    const b = layout.tracks.main.stops[2]!.look;
    const mid = poseArraysAt(rail, 1.5).look;
    mid.forEach((v, i) => expect(v).toBeCloseTo((a[i]! + b[i]!) / 2, 6));
  });

  it('survives a track with fewer than two stops', () => {
    const empty = buildRail({ id: 'projects', stops: [], via: [] });
    const position = new Vector3(9, 9, 9);
    const look = new Vector3();
    poseAt(empty, 0.5, position, look);
    expect(position.toArray()).toEqual([0, 0, 0]);
    const single = buildRail({ id: 'projects', stops: [layout.tracks.main.stops[0]!], via: [] });
    expect(poseArraysAt(single, 0.7).position).toEqual(layout.tracks.main.stops[0]!.camera);
  });
});
