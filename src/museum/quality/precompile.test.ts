// F-011: inside <MaterialsProvider> the precompile warms the canvas's own library, not a copy.
import { describe, expect, it } from 'vitest';
import { Texture } from 'three';
import { createMaterialLibrary, disposeMaterialLibrary, materialSpecs } from '../materials';
import { precompileSet } from './PrecompileMaterials';

describe('precompileSet (F-011)', () => {
  it('uses the shared library itself: one entry per row, no private library', () => {
    const shared = createMaterialLibrary({ grain: new Texture() });
    const set = precompileSet(shared);
    expect(set.materials.map((m) => m.name)).toEqual(Object.keys(materialSpecs));
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
