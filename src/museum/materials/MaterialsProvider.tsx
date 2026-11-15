// One material library per canvas (ARCHITECTURE §7.1: MaterialsProvider sits inside <Canvas>
// and wraps the Suspense with the scene) plus the hooks the kit re-exports to exhibits.
// Exhibits never import this folder; they use props.materials or the kit's useMaterial and
// useMaterialInstance (EXPERIENCE §4, ARCHITECTURE §7.5).
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Texture } from 'three';
import type { ExhibitMaterialName } from './index';
import {
  createMaterialLibrary,
  disposeMaterialLibrary,
  type BuiltMaterialLibrary,
  type MaterialTypes,
} from './library';
import { createWalnutGrain } from './walnutGrain';

const MaterialsContext = createContext<BuiltMaterialLibrary | null>(null);

interface OwnedLibrary {
  library: BuiltMaterialLibrary;
  grain: Texture | undefined;
}

function createOwnedLibrary(): OwnedLibrary {
  // The grain needs a canvas; without a DOM (SSR, Node tests) walnut simply has no map.
  const grain = typeof document === 'undefined' ? undefined : createWalnutGrain();
  return { library: createMaterialLibrary({ grain }), grain };
}

/** Creates the library once for the canvas it is mounted in and disposes it on unmount. */
export function MaterialsProvider({ children }: { children?: ReactNode }) {
  const [owned] = useState(createOwnedLibrary);
  useEffect(
    () => () => {
      disposeMaterialLibrary(owned.library);
      owned.grain?.dispose();
    },
    [owned],
  );
  return <MaterialsContext.Provider value={owned.library}>{children}</MaterialsContext.Provider>;
}

/** The whole library: for the kit and environment (R3), which also use the kit-only rows. */
export function useMaterialLibrary(): BuiltMaterialLibrary {
  const library = useContext(MaterialsContext);
  if (!library) {
    throw new Error('Material hooks need a <MaterialsProvider> inside the <Canvas>');
  }
  return library;
}

/** The shared instance of an exhibit-allowed material. Do not mutate it. */
export function useMaterial<N extends ExhibitMaterialName>(name: N): MaterialTypes[N] {
  return useMaterialLibrary()[name];
}

/**
 * A clone of an exhibit-allowed material for this component's own animated `emissiveIntensity`,
 * `opacity` or `color`. Same parameters, so it shares the compiled shader program; disposed on
 * unmount. Change uniforms only: flipping `transparent`, `side`, `blending` or a map would make
 * it a new program and compile mid-walk.
 */
export function useMaterialInstance<N extends ExhibitMaterialName>(name: N): MaterialTypes[N] {
  const source = useMaterial(name);
  // Material.clone() copies every parameter (and shares textures) into a new instance.
  const instance = useMemo(() => source.clone() as MaterialTypes[N], [source]);
  useEffect(() => () => instance.dispose(), [instance]);
  return instance;
}
