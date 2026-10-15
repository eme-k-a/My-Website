import { BoxGeometry, DataTexture, Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { collectResources, disposeResources, sharedResources } from './resources';

describe('exhibit disposal (ARCHITECTURE §7.4)', () => {
  it('disposes what the exhibit made and never the shared library', () => {
    const libraryMap = new DataTexture(new Uint8Array(4), 1, 1);
    const brass = new MeshStandardMaterial({ map: libraryMap });
    const library = { brass };
    const keep = sharedResources(library);

    const ownMap = new DataTexture(new Uint8Array(4), 1, 1);
    const clone = brass.clone(); // shares the library map
    const own = new MeshStandardMaterial({ map: ownMap });
    const root = new Group();
    const a = new Mesh(new BoxGeometry(), brass);
    const b = new Mesh(new BoxGeometry(), clone);
    const c = new Mesh(new BoxGeometry(), own);
    root.add(a, b, c);

    const found = collectResources(root, keep);
    expect(found.geometries.size).toBe(3);
    expect([...found.materials]).toEqual([clone, own]);
    expect([...found.textures]).toEqual([ownMap]);

    const spies = [brass, libraryMap].map((o) => vi.spyOn(o, 'dispose'));
    const ownSpy = vi.spyOn(ownMap, 'dispose');
    disposeResources(found);
    for (const spy of spies) expect(spy).not.toHaveBeenCalled();
    expect(ownSpy).toHaveBeenCalledTimes(1);
  });
});
