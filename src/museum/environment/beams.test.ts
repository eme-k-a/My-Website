// Beam cones (EXPERIENCE §5.5, F-025): a faint ramp from nothing at the mount to full at the target.
import { describe, expect, it } from 'vitest';
import { BEAM_FADE_POWER, beamFade, unitBeamGeometry } from './Beams';

describe('beam cones (F-025)', () => {
  it('ramps the cone from black at the apex to white at the base', () => {
    const cone = unitBeamGeometry();
    const position = cone.getAttribute('position');
    const color = cone.getAttribute('color');
    expect(color.count).toBe(position.count);
    for (let i = 0; i < position.count; i++) {
      const depth = -position.getY(i);
      expect(color.getX(i)).toBeCloseTo(depth ** BEAM_FADE_POWER, 6);
      expect(color.getY(i)).toBe(color.getX(i));
    }
    // The apex sits at the origin and the open base one unit down.
    const ys = Array.from({ length: position.count }, (_, i) => position.getY(i));
    expect(Math.max(...ys)).toBeCloseTo(0, 9);
    expect(Math.min(...ys)).toBeCloseTo(-1, 9);
    cone.dispose();
  });

  it('clamps the fade to [0, 1]', () => {
    expect(beamFade(-1)).toBe(0);
    expect(beamFade(0)).toBe(0);
    expect(beamFade(0.5)).toBeCloseTo(0.5 ** BEAM_FADE_POWER, 9);
    expect(beamFade(2)).toBe(1);
  });
});
