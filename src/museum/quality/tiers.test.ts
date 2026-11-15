// ARCHITECTURE §8.4: one test per ordered rule of chooseTier, plus the DPR caps.
import { describe, expect, it } from 'vitest';
import { tokens } from '../../design/tokens';
import { chooseTier, maxDpr, startDpr, type TierInput } from './tiers';

const DESKTOP_NVIDIA = 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)';
const PHONE_ADRENO_7XX = 'Adreno (TM) 730';

/** A strong desktop that would be `high` unless a rule says otherwise. */
const base = (patch: Partial<TierInput> = {}): TierInput => ({
  coarse: false,
  cores: 12,
  saveData: false,
  renderer: DESKTOP_NVIDIA,
  params: {},
  ...patch,
});

describe('chooseTier', () => {
  it('rule 1: an explicit valid ?tier= wins over every other rule', () => {
    expect(chooseTier(base({ params: { tier: 'low' } }))).toBe('low');
    expect(chooseTier(base({ params: { tier: 'high', test: true } }))).toBe('high');
    expect(
      chooseTier(base({ coarse: true, cores: 2, saveData: true, params: { tier: 'high' } })),
    ).toBe('high');
    // An invalid value is ignored and the next rules apply.
    expect(chooseTier(base({ params: { tier: 'ultra' } }))).toBe('high');
    expect(chooseTier(base({ params: { tier: null } }))).toBe('high');
  });

  it('rule 2: ?test=1 gives medium', () => {
    expect(chooseTier(base({ params: { test: true } }))).toBe('medium');
    expect(chooseTier(base({ saveData: true, params: { test: true } }))).toBe('medium');
    expect(chooseTier(base({ coarse: true, cores: 2, params: { test: true } }))).toBe('medium');
  });

  it('rule 3: Save-Data gives low', () => {
    expect(chooseTier(base({ saveData: true }))).toBe('low');
    expect(chooseTier(base({ saveData: true, coarse: true, cores: 8 }))).toBe('low');
  });

  it('rule 4: a coarse pointer gives medium, or low with fewer than 4 cores or a weak GPU', () => {
    expect(chooseTier(base({ coarse: true, cores: 8, renderer: PHONE_ADRENO_7XX }))).toBe('medium');
    expect(chooseTier(base({ coarse: true, cores: 4, renderer: 'Apple GPU' }))).toBe('medium');
    expect(chooseTier(base({ coarse: true, cores: 3, renderer: PHONE_ADRENO_7XX }))).toBe('low');
    expect(chooseTier(base({ coarse: true, cores: 0, renderer: '' }))).toBe('low');
    for (const weak of [
      'Mali-450 MP',
      'Mali-T880',
      'Adreno (TM) 306',
      'Adreno (TM) 540',
      'PowerVR SGX 544MP',
    ]) {
      expect(chooseTier(base({ coarse: true, cores: 8, renderer: weak })), weak).toBe('low');
    }
    // Newer Mali and Adreno parts are not on the weak list.
    expect(chooseTier(base({ coarse: true, cores: 8, renderer: 'Mali-G710' }))).toBe('medium');
    expect(chooseTier(base({ coarse: true, cores: 8, renderer: 'Adreno (TM) 640' }))).toBe(
      'medium',
    );
  });

  it('rule 5: a fine pointer gives high with 8+ cores and a GPU off the list, else medium', () => {
    expect(chooseTier(base({ cores: 8 }))).toBe('high');
    expect(chooseTier(base({ cores: 7 }))).toBe('medium');
    for (const renderer of [
      'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'Mali-G78',
      'Adreno (TM) 690',
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
      'llvmpipe (LLVM 15.0.7, 256 bits)',
    ]) {
      expect(chooseTier(base({ cores: 16, renderer })), renderer).toBe('medium');
    }
  });

  it('rule 5: an Apple GPU on a desktop qualifies for high', () => {
    expect(chooseTier(base({ cores: 8, renderer: 'Apple GPU' }))).toBe('high');
    expect(
      chooseTier(
        base({
          cores: 10,
          renderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)',
        }),
      ),
    ).toBe('high');
  });
});

describe('DPR caps', () => {
  it('maxDpr is 2, 1.5 and 1 for high, medium and low, from the tokens', () => {
    expect(maxDpr('high')).toBe(2);
    expect(maxDpr('medium')).toBe(1.5);
    expect(maxDpr('low')).toBe(1);
    expect(tokens.render.maxDpr).toEqual({ high: 2, medium: 1.5, low: 1 });
  });

  it('startDpr clamps the device ratio to the tier cap and is 1 under ?test=1', () => {
    expect(startDpr('high', 3, false)).toBe(2);
    expect(startDpr('medium', 2.625, false)).toBe(1.5);
    expect(startDpr('low', 3, false)).toBe(1);
    expect(startDpr('high', 1.25, false)).toBe(1.25);
    expect(startDpr('high', 0, false)).toBe(1);
    expect(startDpr('high', 3, true)).toBe(1);
  });
});
