// Plinth glow (F-024): a faint wash up each plinth side and a highlight along its top edge.
import { describe, expect, it } from 'vitest';
import { plinthGeometry } from './fixtureMatrices';
import {
  PLINTH_GLOW,
  PLINTH_GLOW_ROWS,
  PLINTH_TOP_V,
  plinthGlow,
  plinthGlowPixels,
} from './lightPools';

describe('plinth glow (F-024)', () => {
  it('rises from a faint foot to a bright top edge', () => {
    expect(plinthGlow(0)).toBeCloseTo(PLINTH_GLOW.base, 9);
    expect(plinthGlow(0.5)).toBeGreaterThan(plinthGlow(0.1));
    expect(plinthGlow(0.9)).toBeGreaterThan(plinthGlow(0.5));
    // The top edge band is far brighter than the face just under it.
    expect(plinthGlow(1)).toBeGreaterThan(2 * plinthGlow(0.9));
    expect(plinthGlow(1)).toBeLessThanOrEqual(1);
    expect(plinthGlow(-1)).toBe(plinthGlow(0));
  });

  it('bakes one column, row 0 at the top, rising monotonically toward it', () => {
    const px = plinthGlowPixels();
    expect(px).toHaveLength(PLINTH_GLOW_ROWS * 4);
    for (let row = 1; row < PLINTH_GLOW_ROWS; row++) {
      expect(px[(row - 1) * 4]!, `row ${row}`).toBeGreaterThanOrEqual(px[row * 4]!);
    }
  });

  it('maps v from foot to top on the side faces and one row on the caps', () => {
    const box = plinthGeometry();
    const position = box.getAttribute('position');
    const uv = box.getAttribute('uv');
    const normal = box.getAttribute('normal');
    for (let i = 0; i < position.count; i++) {
      if (Math.abs(normal.getY(i)) > 0.5) {
        expect(uv.getY(i)).toBeCloseTo(PLINTH_TOP_V, 6);
      } else {
        expect(uv.getY(i)).toBeCloseTo(position.getY(i) + 0.5, 6);
      }
    }
    box.dispose();
  });
});
