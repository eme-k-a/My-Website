import { describe, expect, it } from 'vitest';
import { tokens } from '../../design/tokens';
import { aimDolly, createDolly, stepDolly } from './dolly';

describe('dialog dolly (EXPERIENCE §6.5)', () => {
  it('moves 0.6 m in over 0.9 s with easeInOutCubic, and back over 0.8 s', () => {
    const dolly = createDolly();
    aimDolly(dolly, true, false);
    expect(stepDolly(dolly, 1000)).toBe(true);
    expect(dolly.value).toBe(0);
    stepDolly(dolly, 1450);
    expect(dolly.value).toBeCloseTo(tokens.camera.dialogDollyM / 2, 12);
    stepDolly(dolly, 1000 + 0.9 * 250);
    expect(dolly.value).toBeCloseTo(0.6 * 4 * 0.25 ** 3, 12);
    expect(stepDolly(dolly, 1900)).toBe(false);
    expect(dolly.value).toBe(0.6);

    aimDolly(dolly, false, false);
    stepDolly(dolly, 5000);
    stepDolly(dolly, 5400);
    expect(dolly.value).toBeCloseTo(0.3, 12);
    expect(stepDolly(dolly, 5800)).toBe(false);
    expect(dolly.value).toBe(0);
  });

  it('reverses from where it is when closed mid-way', () => {
    const dolly = createDolly();
    aimDolly(dolly, true, false);
    stepDolly(dolly, 0);
    stepDolly(dolly, 450);
    aimDolly(dolly, false, false);
    expect(dolly.from).toBeCloseTo(0.3, 12);
    stepDolly(dolly, 500);
    expect(dolly.value).toBeCloseTo(0.3, 12);
    stepDolly(dolly, 1300);
    expect(dolly.value).toBe(0);
  });

  it('keeps heading in when the story changes (Newer and Older)', () => {
    const dolly = createDolly();
    aimDolly(dolly, true, false);
    stepDolly(dolly, 0);
    stepDolly(dolly, 300);
    const value = dolly.value;
    aimDolly(dolly, true, false);
    expect(dolly.from).toBe(0);
    stepDolly(dolly, 300);
    expect(dolly.value).toBe(value);
  });

  it('is instant under reduced motion', () => {
    const dolly = createDolly();
    aimDolly(dolly, true, true);
    expect(dolly.value).toBe(0.6);
    expect(stepDolly(dolly, 0)).toBe(false);
    aimDolly(dolly, false, true);
    expect(dolly.value).toBe(0);
  });
});
