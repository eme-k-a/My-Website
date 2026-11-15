// F-011: inside <MaterialsProvider> the precompile warms the canvas's own library, not a copy.
// F-016: it leaves out the rows no scene mesh draws as they are.
import { describe, expect, it } from 'vitest';
import { Texture } from 'three';
import { createMaterialLibrary, disposeMaterialLibrary, materialSpecs } from '../materials';
import { PRECOMPILE_SKIP, precompileSet } from './PrecompileMaterials';

describe('precompileSet (F-011)', () => {
  it('uses the shared library itself: one entry per drawn row, no private library', () => {
    const shared = createMaterialLibrary({ grain: new Texture() });
    const set = precompileSet(shared);
    expect(set.materials.map((m) => m.name)).toEqual(
      Object.keys(materialSpecs).filter((name) => name !== 'beam' && name !== 'shadowDecal'),
    );
    for (const { name, material } of set.materials) {
      const own = shared[name];
      if (material === own) continue;
      // Only a kit texture slot the library leaves empty gets a clone with a 1 x 1 stand-in.
      expect(material.name, `${name} is a clone of the shared material`).toBe(own.name);
      expect(material.type).toBe(own.type);
    }
    const sharedCount = set.materials.filter(({ name, material }) => material === shared[name]);
    expect(sharedCount.length).toBeGreaterThan(set.materials.length / 2);
    set.dispose();
    disposeMaterialLibrary(shared);
  });

  it('skips the rows no scene mesh draws: the plain beam and the shadow decal (F-016)', () => {
    expect([...PRECOMPILE_SKIP].sort()).toEqual(['beam', 'shadowDecal']);
    const shared = createMaterialLibrary({ grain: new Texture() });
    const set = precompileSet(shared);
    const names = set.materials.map((m) => m.name);
    expect(names).not.toContain('beam');
    expect(names).not.toContain('shadowDecal');
    expect(names).toHaveLength(Object.keys(materialSpecs).length - 2);
    set.dispose();
    disposeMaterialLibrary(shared);
  });

  it('leaves the shared library intact when it is disposed', () => {
    const shared = createMaterialLibrary({ grain: new Texture() });
    const disposed: string[] = [];
    for (const material of Object.values(shared)) {
      material.addEventListener('dispose', () => disposed.push(material.name));
    }
    precompileSet(shared).dispose();
    expect(disposed).toEqual([]);
    disposeMaterialLibrary(shared);
  });
});
