// Boot-time shader compile (EXPERIENCE §7.6, ARCHITECTURE §8.5): one small hidden mesh per
// library material, compiled with `gl.compileAsync` against the real scene (its lights, fog and
// environment), so switching or cloning a library material never compiles a program mid-walk.
// The hold on the store's `compilePending` makes `ready` wait for it (ReadySignal).
//
// - It waits for the scene to be assembled (fog or a light present), because the light count,
//   fog and environment are part of every program's key; compiling earlier would build programs
//   nobody uses. After ASSEMBLY_TIMEOUT_MS it compiles anyway, so `ready` can never hang on it.
// - It compiles the canvas's own library: MuseumCanvas mounts QualityController, and with it this
//   component, inside <MaterialsProvider> (R0 ruling of 2026-10-15, F-011). Only outside a
//   provider (never in the app) does it build a private library from the same factory. Its
//   meshes stay mounted (hidden) so those programs live as long as the canvas.
// - Rows no scene mesh draws as they are (PRECOMPILE_SKIP, F-016) are left out.
// - A texture slot the kit fills later (wall wash, floor pools, portrait) gets a 1 x 1 stand-in on
//   a clone, so the precompiled program is the one the kit's material will ask for.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  DataTexture,
  PlaneGeometry,
  RGBAFormat,
  type Group,
  type Material,
  type Object3D,
  type Scene,
  type Texture,
} from 'three';
import { useMuseum } from '../../app/store';
import {
  createMaterialLibrary,
  createWalnutGrain,
  disposeMaterialLibrary,
  materialSpecs,
  useMaterialLibrary,
  type BuiltMaterialLibrary,
  type MaterialName,
  type MaterialSpec,
  type TextureSlot,
} from '../materials';

/** Compile anyway this long after mount if the scene never shows fog or a light. */
export const ASSEMBLY_TIMEOUT_MS = 3000;

/**
 * Library rows no scene mesh draws as they are (F-016): the beams use an instanced clone of
 * `beam` (Beams.tsx), a different program, and nothing mounts `shadowDecal` yet. Compiling them
 * cost about 10% of the link time of every load and recovery under SwiftShader (F-M2).
 */
export const PRECOMPILE_SKIP: ReadonlySet<MaterialName> = new Set(['beam', 'shadowDecal']);

/** Slots the kit fills on its own materials; the library leaves them empty. */
const KIT_SLOTS: ReadonlySet<TextureSlot> = new Set(['wallWash', 'floorPools', 'portrait']);

const noRaycast: Object3D['raycast'] = () => {};

/** The canvas's library inside <MaterialsProvider>, or null outside it. */
function useOptionalMaterialLibrary(): BuiltMaterialLibrary | null {
  try {
    return useMaterialLibrary();
  } catch {
    return null;
  }
}

/** True once Scene has committed: its fog and lights are part of every program key. */
export function sceneAssembled(scene: Scene): boolean {
  if (scene.fog) return true;
  let lit = false;
  scene.traverseVisible((object) => {
    if ((object as Object3D & { isLight?: boolean }).isLight) lit = true;
  });
  return lit;
}

export interface Precompile {
  materials: { name: MaterialName; material: Material }[];
  dispose: () => void;
}

/**
 * One material per library row the scene draws (all but PRECOMPILE_SKIP), with stand-ins for the
 * kit's empty texture slots.
 */
export function precompileSet(shared: BuiltMaterialLibrary | null): Precompile {
  const grain = shared ? undefined : createWalnutGrain();
  const library = shared ?? createMaterialLibrary({ grain });
  const standIn = new DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1, RGBAFormat);
  standIn.needsUpdate = true;
  const clones: Material[] = [];
  const names = (Object.keys(materialSpecs) as MaterialName[]).filter(
    (name) => !PRECOMPILE_SKIP.has(name),
  );
  const materials = names.map((name) => {
    const spec: MaterialSpec = materialSpecs[name];
    const source = library[name] as Material & { map?: Texture | null; lightMap?: Texture | null };
    const needsMap = spec.map !== undefined && KIT_SLOTS.has(spec.map) && !source.map;
    const needsLightMap =
      spec.lightMap !== undefined && KIT_SLOTS.has(spec.lightMap) && !source.lightMap;
    if (!needsMap && !needsLightMap) return { name, material: source as Material };
    const clone = source.clone() as typeof source;
    if (needsMap) clone.map = standIn;
    if (needsLightMap) clone.lightMap = standIn;
    clones.push(clone);
    return { name, material: clone as Material };
  });
  return {
    materials,
    dispose: () => {
      for (const clone of clones) clone.dispose();
      standIn.dispose();
      if (!shared) {
        disposeMaterialLibrary(library);
        grain?.dispose();
      }
    },
  };
}

export function PrecompileMaterials() {
  const shared = useOptionalMaterialLibrary();
  const set = useMemo(() => precompileSet(shared), [shared]);
  const geometry = useMemo(() => new PlaneGeometry(0.01, 0.01), []);
  const group = useRef<Group>(null);
  const phase = useRef<'waiting' | 'compiling' | 'done'>('waiting');
  const mountedAt = useRef(0);
  const release = useRef<() => void>(() => {});
  const get = useThree((s) => s.get);

  useEffect(
    () => () => {
      set.dispose();
    },
    [set],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Hold `compilePending` from mount until the compile settles (or the canvas unmounts).
  useLayoutEffect(() => {
    let held = true;
    mountedAt.current = performance.now();
    useMuseum.setState((s) => ({ compilePending: s.compilePending + 1 }));
    release.current = () => {
      if (!held) return;
      held = false;
      useMuseum.setState((s) => ({ compilePending: s.compilePending - 1 }));
    };
    return () => release.current();
  }, []);

  useFrame(() => {
    if (phase.current !== 'waiting' || !group.current) return;
    const { gl, scene, camera } = get();
    const waited = performance.now() - mountedAt.current;
    if (!sceneAssembled(scene) && waited < ASSEMBLY_TIMEOUT_MS) return;
    phase.current = 'compiling';
    const settle = () => {
      phase.current = 'done';
      release.current();
    };
    gl.compileAsync(group.current, camera, scene).then(settle, (error: unknown) => {
      console.warn('Material precompile failed; programs will compile on first use', error);
      settle();
    });
  });

  return (
    <group ref={group} name="precompile-materials" visible={false}>
      {set.materials.map(({ name, material }) => (
        <mesh
          key={name}
          name={`precompile-${name}`}
          geometry={geometry}
          material={material}
          frustumCulled={false}
          raycast={noRaycast}
        />
      ))}
    </group>
  );
}
