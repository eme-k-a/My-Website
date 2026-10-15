import { describe, expect, it } from 'vitest';
import { content } from '../../../content/index';
import { entryById, exhibitNumber, wallLabelOf } from '../../../content/selectors';
import { computeLayout } from '../../rail/layout';
import { CAP_HEIGHT_RATIO } from './fonts';
import { ORGANIZATION_TRACKING, placardSpec } from './placard';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));

const specOf = (id: string) => {
  const slot = layout.slots.find((s) => s.id === id)!;
  return placardSpec(layout, slot, {
    number: exhibitNumber(content, slot.id),
    organization: wallLabelOf(entryById(content, slot.id)).toUpperCase(),
  });
};

describe('wall titles (EXPERIENCE §5.4)', () => {
  it('hangs on the wall behind each plinth, centered on the plinth z', () => {
    const cases: [string, number, number][] = [
      ['verafin', 3.49, -10],
      ['mysa', -3.49, -22],
      ['klarup', -11.49, -13.8],
      ['safe-sip', 11.49, -25.8],
      ['mun', -5.99, -57],
      // In front of the 2 cm walnut backing panel on the right wall.
      ['certifications', 5.97, -57],
    ];
    for (const [id, x, z] of cases) {
      const spec = specOf(id);
      expect(spec.position[0], id).toBeCloseTo(x, 6);
      expect(spec.position[2], id).toBeCloseTo(z, 6);
      // Text +Z turned into the room: right walls face -X, left walls +X.
      expect(Math.sin(spec.rotationY), id).toBeCloseTo(x > 0 ? -1 : 1, 6);
    }
  });

  it('uses the cap heights, baselines and widths of the table', () => {
    const main = specOf('verafin');
    expect(main.number).toMatchObject({ font: 'serif', capHeight: 0.32, baselineY: 2.75 });
    expect(main.organization).toMatchObject({
      font: 'sans',
      capHeight: 0.1,
      baselineY: 2.4,
      maxWidth: 3.6,
      letterSpacing: ORGANIZATION_TRACKING,
    });
    const wing = specOf('sdsj');
    expect(wing.number).toMatchObject({ capHeight: 0.3, baselineY: 2.55 });
    expect(wing.organization).toMatchObject({ capHeight: 0.14, baselineY: 2.22, maxWidth: 3.2 });
    const mun = specOf('mun');
    expect(mun.organization).toMatchObject({ capHeight: 0.14, maxWidth: 2.4 });
    const cert = specOf('certifications');
    expect(cert.organization).toMatchObject({ capHeight: 0.1, maxWidth: 3.6 });
    expect(cert.number.baselineY).toBeGreaterThan(1.6 + 0.425);
  });

  it('sizes troika text by em so the cap height comes out right', () => {
    const spec = specOf('verafin');
    expect(spec.number.fontSize * CAP_HEIGHT_RATIO.serif).toBeCloseTo(0.32, 9);
    expect(spec.organization.fontSize * CAP_HEIGHT_RATIO.sans).toBeCloseTo(0.1, 9);
  });

  it('carries the computed number and the uppercase wall label', () => {
    const spec = specOf('verafin');
    expect(spec.number.text).toBe('01');
    expect(spec.organization.text).toBe('NASDAQ VERAFIN');
    expect(specOf('klarup').number.text).toBe('P1');
  });
});
