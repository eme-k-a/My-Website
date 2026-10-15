import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXHIBIT_IDS } from '../../../content/ids';
import { MAX_EXHIBIT_TRIANGLES, defineExhibit } from './defineExhibit';
import { registry } from './registry';
import type { ExhibitManifest } from './types';

// The same glob as registry.ts, keyed by path so each manifest can be checked against its folder.
const mods = import.meta.glob<{ default: ExhibitManifest }>(['../*/index.ts', '!../_kit/**'], {
  eager: true,
});
const entries = Object.entries(mods).map(([path, mod]) => ({
  folder: path.split('/')[1]!,
  manifest: mod.default,
}));

const valid: ExhibitManifest = {
  id: 'verafin',
  title: 'The Reporting Engine',
  load: () => Promise.reject(new Error('not loaded in unit tests')),
  budget: { triangles: 12000, drawCalls: 6, textureMB: 1 },
  motion: 'slow',
};

describe('exhibit registry (ARCHITECTURE §7.3)', () => {
  it('registers one manifest per exhibit folder (zero folders is fine)', () => {
    expect(registry.size).toBe(entries.length);
  });

  it('every manifest id equals its folder name and is in EXHIBIT_IDS', () => {
    for (const { folder, manifest } of entries) {
      expect(manifest.id, folder).toBe(folder);
      expect(EXHIBIT_IDS, folder).toContain(manifest.id);
      expect(registry.get(manifest.id)).toBe(manifest);
    }
  });

  it('every manifest stays within the triangle budget and declares at most one slow motion', () => {
    for (const { folder, manifest } of entries) {
      expect(manifest.budget.triangles, folder).toBeLessThanOrEqual(MAX_EXHIBIT_TRIANGLES);
      expect(['none', 'slow'], folder).toContain(manifest.motion);
      expect(typeof manifest.load, folder).toBe('function');
    }
  });
});

describe('defineExhibit', () => {
  it('returns the manifest unchanged', () => {
    expect(defineExhibit(valid)).toBe(valid);
  });

  it('rejects an unknown id and an over-budget manifest in dev', () => {
    const unknown = { ...valid, id: 'not-an-exhibit' } as unknown as ExhibitManifest;
    expect(() => defineExhibit(unknown)).toThrow(/not in EXHIBIT_IDS/);
    const heavy = { ...valid, budget: { ...valid.budget, triangles: MAX_EXHIBIT_TRIANGLES + 1 } };
    expect(() => defineExhibit(heavy)).toThrow(/triangles/);
  });

  describe('in a production build', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('skips the assertions when import.meta.env.DEV is false', () => {
      vi.stubEnv('DEV', false);
      const unknown = { ...valid, id: 'not-an-exhibit' } as unknown as ExhibitManifest;
      expect(defineExhibit(unknown)).toBe(unknown);
    });
  });
});
