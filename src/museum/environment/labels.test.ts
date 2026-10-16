// Label legibility (EXPERIENCE §5.4; R0 ruling in the WP-11 brief): from each label's stop camera,
// the projected cap height cap / (2 d tan(fov / 2)) * viewport height is at least 14 CSS px on the
// desktop (1440 x 900, FOV 50) and on a Pixel 7 in portrait (412 x 915 CSS px, FOV 68). The year
// numerals are decorative and exempt. Checked as projection math, not as an e2e.
import { describe, expect, it } from 'vitest';
import type { StopId } from '../../content/ids';
import { content } from '../../content/index';
import { entryById, exhibitNumber, threeDStrings, wallLabelOf } from '../../content/selectors';
import { tokens } from '../../design/tokens';
import { placardSpec } from '../exhibits/_kit/placard';
import { computeLayout, type Layout, type StopPose, type Vec3 } from '../rail/layout';
import {
  COMMIT_HISTORY,
  END_WALL,
  FOUNDATIONS_SIGN,
  labelPlacements,
  MIN_CAP_PX,
  projectedCapPx,
  ROOM_NAMES,
  YEAR_DIGITS,
  type Viewport,
} from './labels3d';

const NOW = new Date('2026-10-15T00:00:00Z');
const layout = computeLayout(content, NOW);

const VIEWPORTS: Viewport[] = [
  { name: 'desktop', width: 1440, height: 900, fov: tokens.camera.fovDesktop },
  { name: 'pixel7', width: 412, height: 915, fov: tokens.camera.fovPortrait },
];

function poseOf(l: Layout, id: StopId): StopPose {
  for (const track of Object.values(l.tracks)) {
    const pose = track.stops.find((s) => s.id === id);
    if (pose) return pose;
  }
  throw new Error(`No pose for '${id}'`);
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Vec3) => Math.sqrt(dot(a, a));

interface Check {
  name: string;
  stop: StopId;
  center: Vec3;
  cap: number;
}

/** The middle of a label's cap band, in world meters (signs stand upright on their wall). */
function center(position: Vec3, baselineY: number, cap: number): Vec3 {
  return [position[0], position[1] + baselineY + cap / 2, position[2]];
}

function environmentChecks(l: Layout): Check[] {
  return labelPlacements(l)
    .filter((p) => p.stop !== null)
    .map((p) => ({
      name: `${p.label.text} (${p.label.for})`,
      stop: p.stop!,
      center: center(p.position, p.label.baselineY, p.label.capHeight),
      cap: p.label.capHeight,
    }));
}

function placardChecks(l: Layout): Check[] {
  return l.slots.flatMap((slot) => {
    const spec = placardSpec(l, slot, {
      number: exhibitNumber(content, slot.id),
      organization: wallLabelOf(entryById(content, slot.id)).toUpperCase(),
    });
    return [spec.number, spec.organization].map((label) => ({
      name: `${label.text} (${slot.id})`,
      stop: slot.id,
      center: center(spec.position, label.baselineY, label.capHeight),
      cap: label.capHeight,
    }));
  });
}

function report(checks: Check[], viewport: Viewport) {
  return checks.map((c) => {
    const pose = poseOf(layout, c.stop);
    const toLabel = sub(c.center, pose.camera);
    const view = sub(pose.look, pose.camera);
    return {
      name: c.name,
      px: projectedCapPx(c.cap, length(toLabel), viewport),
      ahead: dot(toLabel, view) > 0,
      viewport: viewport.name,
    };
  });
}

describe('3D label legibility (EXPERIENCE §5.4)', () => {
  it('reads every environment label from its stop at 14 CSS px or more', () => {
    const checks = environmentChecks(layout);
    // COMMIT HISTORY, two room names, FOUNDATIONS and the end wall.
    expect(checks).toHaveLength(3 + ROOM_NAMES.length);
    for (const viewport of VIEWPORTS) {
      for (const r of report(checks, viewport)) {
        expect(r.ahead, `${r.name} is in front of its stop camera`).toBe(true);
        expect(r.px, `${r.name} on ${r.viewport}`).toBeGreaterThanOrEqual(MIN_CAP_PX);
      }
    }
  });

  it('reads every wall title (number and organization) from its stop at 14 CSS px or more', () => {
    const checks = placardChecks(layout);
    expect(checks).toHaveLength(2 * layout.slots.length);
    for (const viewport of VIEWPORTS) {
      for (const r of report(checks, viewport)) {
        expect(r.px, `${r.name} on ${r.viewport}`).toBeGreaterThanOrEqual(MIN_CAP_PX);
      }
    }
  });

  it('matches the hand formula on a known case', () => {
    // 0.28 m cap, 8 m away, FOV 50, 900 px tall: 0.28 / (2 * 8 * tan 25deg) * 900.
    const expected = (0.28 / (2 * 8 * Math.tan((25 * Math.PI) / 180))) * 900;
    expect(projectedCapPx(0.28, 8, VIEWPORTS[0]!)).toBeCloseTo(expected, 9);
    expect(expected).toBeCloseTo(33.77, 1);
  });

  it('exempts only the year numerals', () => {
    const exempt = labelPlacements(layout).filter((p) => p.stop === null);
    expect(exempt.map((p) => p.label.kind)).toEqual(layout.yearMarks.map(() => 'year'));
  });
});

describe('labels3d.ts strings (EXPERIENCE §5.4, glyph check input)', () => {
  it('uses the specified fonts, cap heights and baselines', () => {
    expect(COMMIT_HISTORY).toMatchObject({
      text: 'COMMIT HISTORY',
      font: 'serif',
      capHeight: 0.28,
    });
    expect(COMMIT_HISTORY.baselineY).toBe(4.1);
    expect(FOUNDATIONS_SIGN).toMatchObject({ font: 'sans', capHeight: 0.22, baselineY: 4.3 });
    expect(END_WALL).toMatchObject({ font: 'serif', capHeight: 0.2, baselineY: 2.6 });
    expect(ROOM_NAMES.map((r) => r.text)).toEqual(['PROJECTS', 'VOLUNTEER & LEADERSHIP']);
    for (const r of ROOM_NAMES) expect(r).toMatchObject({ font: 'sans', capHeight: 0.14 });
    expect(YEAR_DIGITS.font).toBe('sans');
  });

  it('draws the same environment strings as threeDStrings', () => {
    const fromContent = new Set(
      threeDStrings(content, NOW)
        .filter((s) => s.kind === 'room' || s.kind === 'sign')
        .map((s) => `${s.font}:${s.text}`),
    );
    for (const label of [COMMIT_HISTORY, FOUNDATIONS_SIGN, END_WALL, ...ROOM_NAMES]) {
      expect(fromContent.has(`${label.font}:${label.text}`), label.text).toBe(true);
    }
  });

  it('places the signs on their walls and the numerals beside their strips', () => {
    const placements = labelPlacements(layout);
    const commit = placements.find((p) => p.label === COMMIT_HISTORY)!;
    expect(commit.position[2]).toBeCloseTo(-3.98, 6);
    const foundations = placements.find((p) => p.label === FOUNDATIONS_SIGN)!;
    expect(foundations.position[2]).toBeCloseTo(-51.98, 6);
    const end = placements.find((p) => p.label === END_WALL)!;
    expect(end.position[2]).toBeCloseTo(-69.98, 6);
    const years = placements.filter((p) => p.label.kind === 'year');
    years.forEach((p, i) => {
      expect(p.position[0]).toBe(0);
      expect(p.position[2]).toBeCloseTo(layout.yearMarks[i]!.z - 0.45, 6);
      expect(p.label.text).toBe(String(layout.yearMarks[i]!.year));
    });
  });
});
