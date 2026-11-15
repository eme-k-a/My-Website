import { describe, expect, it } from 'vitest';
import { tokens } from '../../design/tokens';
import { parallaxAngles, parallaxEnabled, type ParallaxGate } from './parallax';

const DEG = Math.PI / 180;
const on: ParallaxGate = { fine: true, reducedMotion: false, test: false, dialogOpen: false };

describe('parallaxEnabled (EXPERIENCE §6.3)', () => {
  it('is on only for a fine pointer without reduced motion, ?test=1 or an open dialog', () => {
    expect(parallaxEnabled(on)).toBe(true);
    expect(parallaxEnabled({ ...on, fine: false })).toBe(false);
    expect(parallaxEnabled({ ...on, reducedMotion: true })).toBe(false);
    expect(parallaxEnabled({ ...on, test: true })).toBe(false);
    expect(parallaxEnabled({ ...on, dialogOpen: true })).toBe(false);
  });
});

describe('parallaxAngles', () => {
  it('is zero at the viewport center', () => {
    const { yaw, pitch } = parallaxAngles(0, 0);
    expect(Math.abs(yaw)).toBe(0);
    expect(Math.abs(pitch)).toBe(0);
  });

  it('reaches 1.5 degrees of yaw and 1 degree of pitch at the edges, toward the pointer', () => {
    expect(parallaxAngles(1, 0).yaw).toBeCloseTo(-tokens.camera.parallaxYawDeg * DEG, 12);
    expect(parallaxAngles(-1, 0).yaw).toBeCloseTo(1.5 * DEG, 12);
    expect(parallaxAngles(0, -1).pitch).toBeCloseTo(tokens.camera.parallaxPitchDeg * DEG, 12);
    expect(parallaxAngles(0, 1).pitch).toBeCloseTo(-1 * DEG, 12);
  });

  it('never exceeds the limits, whatever the input', () => {
    for (const [nx, ny] of [
      [5, -7],
      [-3, 3],
      [Number.NaN, Number.POSITIVE_INFINITY],
    ] as const) {
      const { yaw, pitch } = parallaxAngles(nx, ny);
      expect(Math.abs(yaw)).toBeLessThanOrEqual(1.5 * DEG + 1e-12);
      expect(Math.abs(pitch)).toBeLessThanOrEqual(1 * DEG + 1e-12);
    }
  });
});
