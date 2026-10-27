import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { content } from '../../../content/index';
import { entryById, wallLabelOf } from '../../../content/selectors';
import { computeLayout, type Slot, type StopPose } from '../../rail/layout';
import { CASE_SIZE, PLINTH_SIZE } from './anatomy';
import { CAP_HEIGHT_RATIO, KIT_FONT_FILES } from './fonts';
import {
  breakLines,
  ORGANIZATION_LINE_HEIGHT,
  ORGANIZATION_TRACKING,
  roomOfSlot,
  SANS_CAPS_ADVANCE,
  sansLineWidth,
  SERIF_NUMBER_ADVANCE,
  slotPlacard,
  TITLE_END_MARGIN,
} from './placard';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));

const slotOf = (id: string) => layout.slots.find((s) => s.id === id)!;
const specOf = (id: string) => slotPlacard(layout, slotOf(id));

function poseOf(slot: Slot): StopPose {
  for (const track of Object.values(layout.tracks)) {
    const pose = track.stops.find((s) => s.id === slot.id);
    if (pose) return pose;
  }
  throw new Error(`No stop for ${slot.id}`);
}

interface LayoutFont {
  unitsPerEm: number;
  layout(text: string): { advanceWidth: number };
}
const require = createRequire(import.meta.url);
const fontkit = require('fontkit') as { openSync(path: string): LayoutFont };
const sans = fontkit.openSync(require.resolve(KIT_FONT_FILES.sans));
const serif = fontkit.openSync(require.resolve(KIT_FONT_FILES.serif));
/** Measured width in meters of a tracked line, as troika lays it out (advances plus tracking). */
const measured = (font: LayoutFont, text: string, size: number, tracking: number) =>
  (font.layout(text).advanceWidth / font.unitsPerEm) * size + tracking * size * text.length;

const plinthSlots = layout.slots.filter((s) => s.mount === 'plinth' && s.plinth === 'standard');

describe('wall titles (EXPERIENCE §5.4, F-022, F-027)', () => {
  it('hangs on the wall behind each slot, facing into the room', () => {
    const cases: [string, number][] = [
      ['verafin', 3.49],
      ['mysa', -3.49],
      ['klarup', -11.49],
      ['sdsj', 11.49],
      ['mun', -5.99],
      // In front of the 2 cm walnut backing panel on the right wall.
      ['certifications', 5.97],
    ];
    for (const [id, x] of cases) {
      const spec = specOf(id);
      expect(spec.position[0], id).toBeCloseTo(x, 6);
      // Text +Z turned into the room: right walls face -X, left walls +X.
      expect(Math.sin(spec.rotationY), id).toBeCloseTo(x > 0 ? -1 : 1, 6);
    }
    // The vitrine keeps its slot z; mun's title moved onto the sight line (F-041b).
    expect(specOf('certifications').position[2]).toBeCloseTo(-57, 6);
  });

  it("centers main, wing and mun titles on the stop camera's sight line through the slot", () => {
    for (const slot of layout.slots.filter((s) => s.mount === 'plinth')) {
      const spec = specOf(slot.id);
      const room = roomOfSlot(layout, slot);
      const [cx, , cz] = poseOf(slot).camera;
      const t = (spec.position[0] - cx) / (slot.position[0] - cx);
      const sight = cz + (slot.position[2] - cz) * t;
      const half = spec.width / 2;
      const lo = room.min[1] + TITLE_END_MARGIN + half;
      const hi = room.max[1] - TITLE_END_MARGIN - half;
      // On the sight line, or as close to it as the wall ends allow.
      expect(spec.position[2], slot.id).toBeCloseTo(Math.min(hi, Math.max(lo, sight)), 6);
    }
    // Main-aisle titles are not clamped: verafin's hangs 1.7 m past its plinth (z -10).
    expect(specOf('verafin').position[2]).toBeCloseTo(-7.2 - (2.8 * 2.89) / 1.8, 6);
    // Mun's sight line meets the left wall at z -61.12, 0.88 m from the corner, so the end margin
    // holds the title 3.7 m past its plinth (F-041b).
    const mun = specOf('mun');
    expect(mun.position[2]).toBeCloseTo(-62 + TITLE_END_MARGIN + mun.width / 2, 6);
    expect(mun.position[2]).toBeLessThan(-60.5);
  });

  it('keeps every title inside its wall and clear of the door openings', () => {
    for (const slot of layout.slots) {
      const spec = specOf(slot.id);
      const room = roomOfSlot(layout, slot);
      const [lo, hi] = [spec.position[2] - spec.width / 2, spec.position[2] + spec.width / 2];
      expect(lo, slot.id).toBeGreaterThanOrEqual(room.min[1] + TITLE_END_MARGIN - 1e-9);
      expect(hi, slot.id).toBeLessThanOrEqual(room.max[1] - TITLE_END_MARGIN + 1e-9);
      for (const door of layout.doors) {
        const doorX = door.side === 'left' ? -3.5 : 3.5;
        if (Math.abs(Math.abs(spec.position[0]) - Math.abs(doorX)) > 0.05) continue;
        if (Math.sign(spec.position[0]) !== Math.sign(doorX)) continue;
        const clear = hi < door.z - door.width / 2 || lo > door.z + door.width / 2;
        expect(clear, `${slot.id} and the ${door.wing} door`).toBe(true);
      }
    }
  });

  it('stacks the organization up from its last baseline, the number above it', () => {
    const main = specOf('verafin');
    expect(main.number).toMatchObject({ font: 'serif', capHeight: 0.32 });
    expect(main.organization).toMatchObject({
      font: 'sans',
      capHeight: 0.125,
      baselineY: 2.32,
      lines: 1,
      letterSpacing: ORGANIZATION_TRACKING,
      lineHeight: ORGANIZATION_LINE_HEIGHT,
    });
    expect(main.number.baselineY).toBeCloseTo(2.32 + 0.125 + 0.2, 9);
    const wing = specOf('sdsj');
    expect(wing.organization.text).toBe("SOFTWARE DEVELOPERS\nOF ST. JOHN'S");
    expect(wing.organization).toMatchObject({ capHeight: 0.14, lines: 2 });
    const step = ORGANIZATION_LINE_HEIGHT * wing.organization.fontSize;
    // The last line sits at 2.20 m (F-027) whatever the line count; the first one a line step higher.
    expect(wing.organization.baselineY - step).toBeCloseTo(2.2, 9);
    expect(wing.number.baselineY).toBeCloseTo(wing.organization.baselineY + 0.14 + 0.06, 9);
    // Mun (F-041b, F-049): 0.20 m caps from 8.8 m away under a 0.26 m number, the last line at
    // 3.12 m, the number 0.06 m up.
    const mun = specOf('mun');
    expect(mun.organization).toMatchObject({ capHeight: 0.2, text: 'MEMORIAL\nUNIVERSITY' });
    expect(mun.number).toMatchObject({ capHeight: 0.26 });
    const munStep = ORGANIZATION_LINE_HEIGHT * mun.organization.fontSize;
    expect(mun.organization.baselineY - munStep).toBeCloseTo(3.12, 9);
    expect(mun.number.baselineY).toBeCloseTo(mun.organization.baselineY + 0.2 + 0.06, 9);
    const cert = specOf('certifications');
    expect(cert.organization).toMatchObject({ capHeight: 0.1, baselineY: 2.4, lines: 1 });
    expect(cert.number.baselineY).toBeGreaterThan(1.6 + 0.425);
  });

  it("keeps the organization's last line above the case edge seen from the stop", () => {
    for (const slot of plinthSlots) {
      const spec = specOf(slot.id);
      const [cx, cy, cz] = poseOf(slot).camera;
      const [px, , pz] = slot.position;
      // The case's top edge nearest the camera (the plinth is 0.9 m square, the case 0.85 m).
      const half = Math.max(PLINTH_SIZE.standard[0], CASE_SIZE.standard[0]) / 2;
      const top = PLINTH_SIZE.standard[1] + CASE_SIZE.standard[1];
      const toCase = Math.hypot(px - cx, pz - cz) - half;
      const toWall = Math.hypot(spec.position[0] - cx, spec.position[2] - cz);
      const edgeOnWall = cy + ((top - cy) * toWall) / toCase;
      const step = ORGANIZATION_LINE_HEIGHT * spec.organization.fontSize;
      const last = spec.organization.baselineY - ((spec.organization.lines ?? 1) - 1) * step;
      expect(last, slot.id).toBeGreaterThan(edgeOnWall);
    }
  });

  it('sizes troika text by em so the cap height comes out right', () => {
    const spec = specOf('verafin');
    expect(spec.number.fontSize * CAP_HEIGHT_RATIO.serif).toBeCloseTo(0.32, 9);
    expect(spec.organization.fontSize * CAP_HEIGHT_RATIO.sans).toBeCloseTo(0.125, 9);
  });

  it('carries the computed number and the uppercase wall label, broken into lines', () => {
    const spec = specOf('verafin');
    expect(spec.number.text).toBe('01');
    expect(spec.organization.text).toBe('NASDAQ VERAFIN');
    expect(specOf('klarup').number.text).toBe('P1');
    for (const slot of layout.slots) {
      const label = wallLabelOf(entryById(content, slot.id)).toUpperCase();
      expect(specOf(slot.id).organization.text.replaceAll('\n', ' '), slot.id).toBe(label);
    }
    expect(specOf('cfia').organization.text).toBe('CANADIAN FOOD\nINSPECTION AGENCY');
    expect(specOf('finance-tracker').organization.text).toBe('PERSONAL FINANCE\nTRACKER');
  });

  it('estimates line widths close to the measured font, never far under', () => {
    for (const slot of layout.slots) {
      const spec = specOf(slot.id);
      const org = spec.organization;
      for (const line of org.text.split('\n')) {
        const real = measured(sans, line, org.fontSize, org.letterSpacing);
        const estimate = sansLineWidth(line, org.fontSize, org.letterSpacing);
        expect(estimate / real, line).toBeGreaterThan(0.93);
        expect(estimate / real, line).toBeLessThan(1.2);
        expect(spec.width + 1e-9, line).toBeGreaterThanOrEqual(estimate);
      }
      const number = spec.number;
      const real = measured(serif, number.text, number.fontSize, 0);
      expect(number.text.length * number.fontSize * SERIF_NUMBER_ADVANCE).toBeGreaterThan(real);
    }
    expect(SANS_CAPS_ADVANCE).toBe(0.62);
  });

  it('breaks lines greedily at word boundaries', () => {
    expect(breakLines('A BB CCC', 1, 0, 100)).toEqual(['A BB CCC']);
    // 0.62 m per character at size 1: "A BB" is 2.48 m, "A BB CCC" 4.96 m.
    expect(breakLines('A BB CCC', 1, 0, 3)).toEqual(['A BB', 'CCC']);
    expect(breakLines('LONGWORD', 1, 0, 1)).toEqual(['LONGWORD']);
  });
});
