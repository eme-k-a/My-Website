import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import type { Content } from '../../content/types';
import { computeLayout, type Layout, type Vec3 } from './layout';

const NOW = new Date('2026-10-15T00:00:00Z');
const layout = computeLayout(content, NOW);

/** Deep copy with every number rounded to 3 decimals (and -0 written as 0). */
function round3<T>(value: T): T {
  if (typeof value === 'number') return (Math.round(value * 1000) / 1000 || 0) as T;
  if (Array.isArray(value)) return value.map(round3) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, round3(v)])) as T;
  }
  return value;
}

function expectVec(actual: Vec3, expected: Vec3, label: string) {
  expected.forEach((v, i) => {
    expect(actual[i], `${label}[${i}]`).toBeCloseTo(v, 3);
  });
}

const stopIds = (l: Layout, track: keyof Layout['tracks']) =>
  l.tracks[track].stops.map((s) => s.id);
const pose = (l: Layout, id: string) =>
  Object.values(l.tracks)
    .flatMap((t) => t.stops)
    .find((s) => s.id === id)!;
const slot = (l: Layout, id: string) => l.slots.find((s) => s.id === id)!;

/** Mutable copy of the content for what-if layouts. */
const draftContent = (): Content => structuredClone(content);

// EXPERIENCE §2.4 (main track) and §2.5 (wing tracks): [camera, look].
const POSES: Record<string, [Vec3, Vec3]> = {
  lobby: [
    [0, 1.6, 4],
    [0, 1.6, -10],
  ],
  verafin: [
    [0.6, 1.6, -7.2],
    [2.4, 1.35, -10],
  ],
  'projects-door': [
    [0, 1.6, -14.2],
    [-3.5, 1.5, -16],
  ],
  mysa: [
    [-0.6, 1.6, -19.2],
    [-2.4, 1.35, -22],
  ],
  'volunteer-door': [
    [0, 1.6, -26.2],
    [3.5, 1.5, -28],
  ],
  wailo: [
    [0.6, 1.6, -31.2],
    [2.4, 1.35, -34],
  ],
  cfia: [
    [-0.6, 1.6, -43.2],
    [-2.4, 1.35, -46],
  ],
  mun: [
    [-0.3, 1.6, -54.4],
    [-2.5, 1.25, -57],
  ],
  certifications: [
    [2.2, 1.6, -57],
    [5.85, 1.6, -57],
  ],
  desk: [
    [0, 1.6, -64],
    [0, 1.1, -67.5],
  ],
  klarup: [
    [-5.6, 1.6, -14.6],
    [-9, 1.35, -13.8],
  ],
  'finance-tracker': [
    [-5.6, 1.6, -17.4],
    [-9, 1.35, -18.2],
  ],
  sdsj: [
    [5.6, 1.6, -28],
    [9, 1.35, -28],
  ],
};

describe('computeLayout snapshot (now = 2026-10-15)', () => {
  it('matches the pinned snapshot', () => {
    expect(round3(layout)).toMatchSnapshot();
  });
});

describe('tracks and poses (EXPERIENCE §2.4, §2.5)', () => {
  it('has the main track and two wing tracks', () => {
    expect(Object.keys(layout.tracks)).toEqual(['main', 'projects', 'volunteer']);
  });

  it('has 10 main stops in order', () => {
    expect(stopIds(layout, 'main')).toEqual([
      'lobby',
      'verafin',
      'projects-door',
      'mysa',
      'volunteer-door',
      'wailo',
      'cfia',
      'mun',
      'certifications',
      'desk',
    ]);
  });

  it('wing tracks are [door, ...items] with the door pose at index 0', () => {
    expect(stopIds(layout, 'projects')).toEqual(['projects-door', 'klarup', 'finance-tracker']);
    expect(stopIds(layout, 'volunteer')).toEqual(['volunteer-door', 'sdsj']);
    for (const wing of ['projects', 'volunteer'] as const) {
      const door = layout.tracks[wing].stops[0]!;
      expect(door).toEqual(pose(layout, `${wing}-door`));
      expect(layout.tracks.main.stops).toContainEqual(door);
    }
  });

  it('every camera and look-at equals the spec to 3 decimals', () => {
    const all = Object.values(layout.tracks).flatMap((t) => t.stops);
    expect(new Set(all.map((s) => s.id))).toEqual(new Set(Object.keys(POSES)));
    for (const stop of all) {
      const [camera, look] = POSES[stop.id]!;
      expectVec(stop.camera, camera, `${stop.id}.camera`);
      expectVec(stop.look, look, `${stop.id}.look`);
    }
  });

  it('wing tracks pass the threshold waypoint after the door', () => {
    expect(layout.tracks.main.via).toEqual([]);
    expect(round3(layout.tracks.projects.via)).toEqual([{ after: 0, point: [-3.5, 1.6, -16] }]);
    expect(round3(layout.tracks.volunteer.via)).toEqual([{ after: 0, point: [3.5, 1.6, -28] }]);
  });

  it('doors sit at z -16 (left) and -28 (right)', () => {
    expect(round3(layout.doors)).toEqual([
      { wing: 'projects', side: 'left', z: -16, width: 2.4 },
      { wing: 'volunteer', side: 'right', z: -28, width: 2.4 },
    ]);
  });
});

describe('slots and rooms', () => {
  it('places plinths per EXPERIENCE §2.2 and §2.5', () => {
    const positions = Object.fromEntries(layout.slots.map((s) => [s.id, round3(s.position)]));
    expect(positions).toEqual({
      verafin: [2.4, 0, -10],
      klarup: [-9, 0, -13.8],
      'finance-tracker': [-9, 0, -18.2],
      mysa: [-2.4, 0, -22],
      sdsj: [9, 0, -28],
      wailo: [2.4, 0, -34],
      cfia: [-2.4, 0, -46],
      mun: [-2.5, 0, -57],
      certifications: [6, 1.6, -57],
    });
  });

  it('uses the slot variants of EXPERIENCE §5.3', () => {
    expect(slot(layout, 'verafin').bounds).toEqual({
      min: [-0.325, 0.025, -0.325],
      max: [0.325, 0.675, 0.325],
    });
    expect(slot(layout, 'mun')).toMatchObject({
      plinth: 'wide',
      mount: 'plinth',
      bounds: { min: [-0.55, 0.1, -0.55], max: [0.55, 1.2, 0.55] },
    });
    expect(slot(layout, 'certifications')).toMatchObject({
      plinth: 'none',
      mount: 'wall',
      side: 'right',
      bounds: { min: [-0.325, -0.325, 0.05], max: [0.325, 0.325, 0.25] },
    });
    expect(slot(layout, 'certifications').rotationY).toBeCloseTo(-Math.PI / 2, 6);
  });

  it('turns local +Z toward the stop camera', () => {
    for (const s of layout.slots.filter((x) => x.mount === 'plinth')) {
      const camera = pose(layout, s.id).camera;
      const dx = camera[0] - s.position[0];
      const dz = camera[2] - s.position[2];
      const len = Math.hypot(dx, dz);
      expect(Math.sin(s.rotationY), s.id).toBeCloseTo(dx / len, 6);
      expect(Math.cos(s.rotationY), s.id).toBeCloseTo(dz / len, 6);
    }
  });

  it('has the zones of EXPERIENCE §2.3', () => {
    expect(round3(layout.rooms)).toEqual([
      { id: 'lobby', min: [-6, -4], max: [6, 6], ceiling: 6 },
      { id: 'aisle', min: [-3.5, -52], max: [3.5, -4], ceiling: 5 },
      { id: 'projects', min: [-11.5, -20], max: [-3.5, -12], ceiling: 4 },
      { id: 'volunteer', min: [3.5, -32], max: [11.5, -24], ceiling: 4 },
      { id: 'foundations', min: [-6, -62], max: [6, -52], ceiling: 5 },
      { id: 'desk', min: [-5, -70], max: [5, -62], ceiling: 4 },
    ]);
  });
});

describe('time in the space (EXPERIENCE §6.9)', () => {
  it('places the year strips within 0.1 m of the spec', () => {
    const expected = [
      [2026, -4],
      [2025, -25.5],
      [2024, -37.5],
      [2023, -44.5],
      [2022, -51.4],
    ] as const;
    expect(layout.yearMarks.map((m) => m.year)).toEqual(expected.map(([year]) => year));
    layout.yearMarks.forEach((m, i) => {
      expect(Math.abs(m.z - expected[i]![1]), String(m.year)).toBeLessThanOrEqual(0.1);
    });
  });

  it('ages stops from 0 (newest) to 1 (oldest)', () => {
    expect(round3(layout.ageT)).toEqual({
      lobby: 0,
      verafin: 0,
      mysa: 0.333,
      wailo: 0.667,
      cfia: 1,
      'projects-door': 0.167,
      klarup: 0.167,
      'finance-tracker': 0.167,
      'volunteer-door': 0.5,
      sdsj: 0.5,
      mun: 1,
      certifications: 1,
      desk: 0.333,
    });
  });
});

describe('computed from content (EXPERIENCE §2.7)', () => {
  it('a new newest job shifts every row as tabulated', () => {
    const c = draftContent();
    c.experiences.unshift({ ...structuredClone(c.experiences[0]!), id: 'new-job' });
    const l = computeLayout(c, NOW);
    const plinths = Object.fromEntries(
      l.slots.filter((s) => s.track === 'main').map((s) => [s.id, round3(s.position)]),
    );
    expect(plinths['new-job']).toEqual([2.4, 0, -10]);
    expect(plinths.verafin).toEqual([-2.4, 0, -22]);
    expect(plinths.mysa).toEqual([2.4, 0, -34]);
    expect(plinths.wailo).toEqual([-2.4, 0, -46]);
    expect(plinths.cfia).toEqual([2.4, 0, -58]);
    expect(round3(l.doors.map((d) => [d.wing, d.z]))).toEqual([
      ['projects', -28],
      ['volunteer', -40],
    ]);
    const foundations = l.rooms.find((r) => r.id === 'foundations')!;
    expect(round3([foundations.max[1], foundations.min[1]])).toEqual([-64, -74]);
    const desk = pose(l, 'desk').look;
    expect(round3([desk[0], desk[2]])).toEqual([0, -79.5]);
    expect(stopIds(l, 'main')).toEqual([
      'lobby',
      'new-job',
      'verafin',
      'projects-door',
      'mysa',
      'volunteer-door',
      'wailo',
      'cfia',
      'mun',
      'certifications',
      'desk',
    ]);
  });

  it("moving a wing's `after` moves its door, room, plinths and stops with it", () => {
    const c = draftContent();
    c.wings[0]!.after = 'mysa';
    c.wings[1]!.after = 'wailo';
    const l = computeLayout(c, NOW);
    expect(l.doors.find((d) => d.wing === 'projects')!.z).toBeCloseTo(-28, 6);
    expect(round3(l.rooms.find((r) => r.id === 'projects'))).toEqual({
      id: 'projects',
      min: [-11.5, -32],
      max: [-3.5, -24],
      ceiling: 4,
    });
    expect(round3(slot(l, 'klarup').position)).toEqual([-9, 0, -25.8]);
    expect(round3(slot(l, 'finance-tracker').position)).toEqual([-9, 0, -30.2]);
    expectVec(pose(l, 'projects-door').camera, [0, 1.6, -26.2], 'projects-door.camera');
    expectVec(pose(l, 'projects-door').look, [-3.5, 1.5, -28], 'projects-door.look');
    expectVec(pose(l, 'klarup').camera, [-5.6, 1.6, -26.6], 'klarup.camera');
    expectVec(pose(l, 'finance-tracker').camera, [-5.6, 1.6, -29.4], 'finance-tracker.camera');
    expect(stopIds(l, 'main').slice(0, 7)).toEqual([
      'lobby',
      'verafin',
      'mysa',
      'projects-door',
      'wailo',
      'volunteer-door',
      'cfia',
    ]);
  });
});

describe('a wing with one item (F-035)', () => {
  it('centres the lone item on its door axis, camera straight in front', () => {
    const l = computeLayout(draftContent(), NOW);
    const door = l.doors.find((d) => d.wing === 'volunteer')!;
    expect(round3(slot(l, 'sdsj').position)).toEqual([9, 0, door.z]);
    expectVec(pose(l, 'sdsj').camera, [5.6, 1.6, door.z], 'sdsj.camera');
    expectVec(pose(l, 'sdsj').look, [9, 1.35, door.z], 'sdsj.look');
    expect(slot(l, 'sdsj').rotationY).toBeCloseTo(-Math.PI / 2, 6);
  });

  it('keeps a two-item wing at +-2.2 m around its door', () => {
    const l = computeLayout(draftContent(), NOW);
    const door = l.doors.find((d) => d.wing === 'projects')!;
    expect(slot(l, 'klarup').position[2]).toBeCloseTo(door.z + 2.2, 6);
    expect(slot(l, 'finance-tracker').position[2]).toBeCloseTo(door.z - 2.2, 6);
  });
});

describe('validation (EXPERIENCE §2.2 rule 2)', () => {
  it('rejects a wing after the last work exhibit', () => {
    const c = draftContent();
    c.wings[0]!.after = 'cfia';
    expect(() => computeLayout(c, NOW)).toThrow(/Wing 'projects'.*last work exhibit/);
  });

  it('rejects two wings sharing `after`', () => {
    const c = draftContent();
    c.wings[1]!.after = 'verafin';
    expect(() => computeLayout(c, NOW)).toThrow(/'projects' and 'volunteer' share after/);
  });

  it('rejects a wing with no items or more than 2 items', () => {
    const empty = draftContent();
    empty.wings[0]!.items = [];
    expect(() => computeLayout(empty, NOW)).toThrow(/Wing 'projects' holds 0 items/);
    const three = draftContent();
    three.projects.push({ ...structuredClone(three.projects[0]!), id: 'third-project' });
    three.wings[0]!.items = ['klarup', 'finance-tracker', 'third-project'];
    expect(() => computeLayout(three, NOW)).toThrow(/Wing 'projects' holds 3 items/);
  });

  it('rejects an `after` that is not a work exhibit and items that do not resolve', () => {
    const notWork = draftContent();
    notWork.wings[1]!.after = 'mun';
    expect(() => computeLayout(notWork, NOW)).toThrow(/Wing 'volunteer'.*not a work exhibit/);
    const stray = draftContent();
    stray.wings[1]!.items = ['sdsj', 'klarup'];
    expect(() => computeLayout(stray, NOW)).toThrow(/Wing 'volunteer'.*'klarup' is not/);
  });
});

describe('validation (EXPERIENCE §2.2 rule 3)', () => {
  it('rejects anything but exactly one education entry (the Foundations room has one plinth)', () => {
    const two = draftContent();
    two.education.push({ ...structuredClone(two.education[0]!), id: 'second-degree' });
    expect(() => computeLayout(two, NOW)).toThrow(
      /Foundations room holds exactly one education entry \(found 2\)/,
    );
    const none = draftContent();
    none.education = [];
    expect(() => computeLayout(none, NOW)).toThrow(/\(found 0\)/);
  });
});
