import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import { computeLayout } from '../rail/layout';
import { PORTRAIT_CENTER, PORTRAIT_SIZE } from './lightPlan';
import { openings } from './shell';
import {
  brassTrimBoxes,
  portraitFrameBoxes,
  REVEAL_WIDTH,
  trimMatrix,
  YEAR_STRIP_HALF,
  YEAR_STRIP_WIDTH,
  yearStripBoxes,
} from './trim';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));

describe('brass trim (EXPERIENCE §2.3, §6.9)', () => {
  it('lines the arch and every wing door with 4 cm reveals: two jambs and a head', () => {
    const lined = openings(layout).filter((o) => o.name === 'arch' || o.name.endsWith('-door'));
    expect(lined).toHaveLength(1 + layout.doors.length);
    const boxes = brassTrimBoxes(layout);
    for (const opening of lined) {
      const parts = boxes.filter((b) => b.name.startsWith(`${opening.name}-`));
      expect(parts.map((p) => p.name.split('-').at(-1))).toEqual(['a', 'b', 'head']);
      const [jamb, , head] = parts;
      const alongIndex = opening.axis === 'x' ? 0 : 2;
      expect(jamb!.size[alongIndex]).toBeCloseTo(REVEAL_WIDTH, 9);
      expect(jamb!.size[1]).toBeCloseTo(opening.top, 9);
      expect(head!.center[1] + head!.size[1] / 2).toBeCloseTo(opening.top, 9);
    }
  });

  it('frames the 0.8 x 1.0 m portrait with four thin bars', () => {
    const bars = portraitFrameBoxes();
    expect(bars).toHaveLength(4);
    const top = bars.find((b) => b.name === 'frame-top')!;
    expect(top.center[1] - top.size[1] / 2).toBeCloseTo(
      PORTRAIT_CENTER[1] + PORTRAIT_SIZE[1] / 2,
      9,
    );
    const left = bars.find((b) => b.name === 'frame-left')!;
    expect(left.center[0] + left.size[0] / 2).toBeCloseTo(
      PORTRAIT_CENTER[0] - PORTRAIT_SIZE[0] / 2,
      9,
    );
  });

  it('lays one 3 cm brass inlay across x -3.3 to 3.3 at every year mark', () => {
    const strips = yearStripBoxes(layout);
    expect(strips.map((s) => s.name)).toEqual(layout.yearMarks.map((m) => `year-${m.year}`));
    strips.forEach((strip, i) => {
      expect(strip.size[0]).toBeCloseTo(2 * YEAR_STRIP_HALF, 9);
      expect(strip.size[2]).toBeCloseTo(YEAR_STRIP_WIDTH, 9);
      expect(strip.center[2]).toBeCloseTo(layout.yearMarks[i]!.z, 9);
      expect(strip.center[1] - strip.size[1] / 2).toBeCloseTo(0, 9);
    });
  });

  it('builds unit-box matrices that reproduce each box', () => {
    const box = yearStripBoxes(layout)[1]!;
    const corner = new Vector3(0.5, 0.5, 0.5).applyMatrix4(trimMatrix(box));
    expect(corner.x).toBeCloseTo(box.center[0] + box.size[0] / 2, 9);
    expect(corner.z).toBeCloseTo(box.center[2] + box.size[2] / 2, 9);
  });
});
