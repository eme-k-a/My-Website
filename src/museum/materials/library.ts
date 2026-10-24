// The shared material library (EXPERIENCE §7.6, ARCHITECTURE §7.2, §8.1, §8.2,
// docs/ART_DIRECTION.md §5). Every material in the museum is built here, once per canvas, from
// the design tokens; exhibits receive them through props.materials or the kit's useMaterial /
// useMaterialInstance and never construct one. No textures are loaded: the walnut grain is a
// seeded CanvasTexture (walnutGrain.ts, browser only) and the shadow decal a DataTexture.
// Nothing here touches the DOM, so the library also builds in Node for the unit tests.
import type { MeshReflectorMaterialProps } from '@react-three/drei';
import {
  AdditiveBlending,
  Color,
  DataTexture,
  LinearFilter,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  MultiplyBlending,
  RGBAFormat,
  type Material,
  type Texture,
} from 'three';
import { tokens } from '../../design/tokens';
import type { ExhibitMaterialName, KitMaterialName } from './index';

export type MaterialName = ExhibitMaterialName | KitMaterialName;

/** Where a material's base color comes from: a `tokens.color` key, or the light ramp. */
export type ColorToken = keyof typeof tokens.color | 'light-0';

/** Texture slots. The library fills `walnutGrain` and `radialDecal`; R3's kit fills the rest. */
export type TextureSlot = 'walnutGrain' | 'radialDecal' | 'portrait' | 'wallWash' | 'floorPools';

export interface MaterialSpec {
  type: 'MeshStandardMaterial' | 'MeshPhysicalMaterial' | 'MeshBasicMaterial';
  /** Exhibits may use it (the first eight rows of EXPERIENCE §7.6); otherwise kit only. */
  exhibit: boolean;
  colorToken?: ColorToken;
  /** The value of `colorToken`, copied from tokens.ts (never a literal). */
  color?: string;
  emissiveToken?: keyof typeof tokens.color;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  envMapIntensity?: number;
  /** Always 0: no transmission anywhere (EXPERIENCE §11.2). */
  transmission?: 0;
  transparent?: boolean;
  opacity?: number;
  depthWrite?: boolean;
  premultipliedAlpha?: boolean;
  toneMapped?: boolean;
  blending?: 'additive' | 'multiply';
  map?: TextureSlot;
  lightMap?: TextureSlot;
}

/** `accentGlow` emissive intensity at rest and at its peak (EXPERIENCE §7.6). */
export const ACCENT_GLOW = { rest: 0.15, peak: 1.4 } as const;

const c = tokens.color;

/** EXPERIENCE §7.6, row by row. Colors come from tokens.ts. */
export const materialSpecs = {
  brass: {
    type: 'MeshStandardMaterial',
    exhibit: true,
    colorToken: 'brassMetal',
    color: c.brassMetal,
    metalness: 0.9,
    roughness: 0.42,
    envMapIntensity: 1,
  },
  frostedGlass: {
    type: 'MeshPhysicalMaterial',
    exhibit: true,
    colorToken: 'frost',
    color: c.frost,
    roughness: 0.55,
    metalness: 0,
    transmission: 0,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    envMapIntensity: 0.8,
  },
  walnut: {
    type: 'MeshStandardMaterial',
    exhibit: true,
    colorToken: 'walnut',
    color: c.walnut,
    roughness: 0.55,
    metalness: 0,
    map: 'walnutGrain',
  },
  ceramic: {
    type: 'MeshStandardMaterial',
    exhibit: true,
    colorToken: 'ceramic',
    color: c.ceramic,
    roughness: 0.85,
    metalness: 0,
  },
  ceramicGraphite: {
    type: 'MeshStandardMaterial',
    exhibit: true,
    colorToken: 'graphite',
    color: c.graphite,
    roughness: 0.8,
    metalness: 0,
  },
  paper: {
    type: 'MeshStandardMaterial',
    exhibit: true,
    colorToken: 'paper',
    color: c.paper,
    roughness: 0.95,
    metalness: 0,
  },
  accentGlow: {
    type: 'MeshStandardMaterial',
    exhibit: true,
    colorToken: 'ink',
    color: c.ink,
    emissiveToken: 'signal',
    emissive: c.signal,
    emissiveIntensity: ACCENT_GLOW.rest,
    toneMapped: true,
  },
  wall: {
    type: 'MeshStandardMaterial',
    exhibit: true,
    colorToken: 'wall',
    color: c.wall,
    roughness: 0.95,
    lightMap: 'wallWash',
  },
  floor: {
    // Medium and low tiers. High builds drei's MeshReflectorMaterial from floorReflectorParams.
    type: 'MeshStandardMaterial',
    exhibit: false,
    colorToken: 'floor',
    color: c.floor,
    roughness: 0.22,
    metalness: 0,
    envMapIntensity: 0.6,
    lightMap: 'floorPools',
  },
  caseGlass: {
    type: 'MeshPhysicalMaterial',
    exhibit: false,
    transmission: 0,
    transparent: true,
    opacity: 0.12,
    roughness: 0.05,
    envMapIntensity: 1.2,
    depthWrite: false,
  },
  plinth: {
    type: 'MeshStandardMaterial',
    exhibit: false,
    colorToken: 'plinth',
    color: c.plinth,
    roughness: 0.9,
  },
  beam: {
    // Default temperature light-0; the kit tints each cone per target (instance colors).
    type: 'MeshBasicMaterial',
    exhibit: false,
    colorToken: 'light-0',
    color: tokens.light.ramp[0],
    blending: 'additive',
    transparent: true,
    opacity: 0.035,
    depthWrite: false,
  },
  shadowDecal: {
    // Multiply over premultiplied alpha: the floor below is scaled by 1 - 0.45 * falloff.
    type: 'MeshBasicMaterial',
    exhibit: false,
    colorToken: 'ink',
    color: c.ink,
    blending: 'multiply',
    premultipliedAlpha: true,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    map: 'radialDecal',
  },
  ceilingSlot: {
    type: 'MeshBasicMaterial',
    exhibit: false,
    colorToken: 'ceilingSlot',
    color: c.ceilingSlot,
  },
  portrait: {
    type: 'MeshBasicMaterial',
    exhibit: false,
    map: 'portrait',
  },
} as const satisfies Record<MaterialName, MaterialSpec>;

type ClassOf<T> = T extends 'MeshPhysicalMaterial'
  ? MeshPhysicalMaterial
  : T extends 'MeshStandardMaterial'
    ? MeshStandardMaterial
    : MeshBasicMaterial;

/** The three.js class of each library material. */
export type MaterialTypes = { [N in MaterialName]: ClassOf<(typeof materialSpecs)[N]['type']> };

/** What createMaterialLibrary returns; assignable to the frozen `MaterialLibrary` type. */
export type BuiltMaterialLibrary = Readonly<MaterialTypes>;

/**
 * High-tier floor: the kit builds drei's `MeshReflectorMaterial` with these values plus the pool
 * lightMap (EXPERIENCE §7.6, ARCHITECTURE §8.2). Medium and low use the library `floor`.
 */
export const floorReflectorParams = {
  resolution: 512,
  blur: [300, 100],
  mixBlur: 1,
  mixStrength: 1.5,
  roughness: 0.8,
  metalness: 0.5,
  mirror: 0,
  color: c.floor,
} satisfies Pick<
  MeshReflectorMaterialProps,
  'resolution' | 'blur' | 'mixBlur' | 'mixStrength' | 'roughness' | 'metalness' | 'mirror' | 'color'
>;

/** Side of the shared radial shadow-decal texture (EXPERIENCE §5.2). */
export const RADIAL_DECAL_SIZE = 64;

/** RGBA pixels of the radial decal: white, alpha 1 at the center easing to 0 at the edge. */
export function radialDecalPixels(size = RADIAL_DECAL_SIZE): Uint8Array<ArrayBuffer> {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = ((x + 0.5) / size) * 2 - 1;
      const dy = ((y + 0.5) / size) * 2 - 1;
      const r = Math.min(1, Math.hypot(dx, dy));
      const alpha = 1 - r * r * (3 - 2 * r); // 1 - smoothstep(0, 1, r)
      const i = (y * size + x) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.round(alpha * 255);
    }
  }
  return data;
}

function createRadialDecal(): DataTexture {
  const texture = new DataTexture(
    radialDecalPixels(),
    RADIAL_DECAL_SIZE,
    RADIAL_DECAL_SIZE,
    RGBAFormat,
  );
  texture.name = 'radialDecal';
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export interface MaterialLibraryOptions {
  /** The walnut grain (createWalnutGrain() in the browser). Omitted: walnut has no map. */
  grain?: Texture;
  /**
   * A fixed environment map for the env-mapped materials. Omitted (the normal case): they use
   * `scene.environment` from drei's `<Environment frames={1}>`.
   */
  envMap?: Texture;
}

const SCALARS = [
  'roughness',
  'metalness',
  'envMapIntensity',
  'emissiveIntensity',
  'transmission',
  'transparent',
  'opacity',
  'depthWrite',
  'premultipliedAlpha',
  'toneMapped',
] as const;

function build(
  name: MaterialName,
  spec: MaterialSpec,
  options: MaterialLibraryOptions,
  decal: Texture,
): Material {
  // three warns on undefined parameters, so only the keys the spec sets are passed.
  const params: Record<string, unknown> = { name };
  for (const key of SCALARS) if (spec[key] !== undefined) params[key] = spec[key];
  if (spec.color) params.color = new Color(spec.color);
  if (spec.emissive) params.emissive = new Color(spec.emissive);
  if (spec.blending)
    params.blending = spec.blending === 'additive' ? AdditiveBlending : MultiplyBlending;
  if (spec.map === 'walnutGrain' && options.grain) params.map = options.grain;
  if (spec.map === 'radialDecal') params.map = decal;
  if (options.envMap && spec.envMapIntensity !== undefined) params.envMap = options.envMap;
  switch (spec.type) {
    case 'MeshPhysicalMaterial':
      return new MeshPhysicalMaterial(params);
    case 'MeshStandardMaterial':
      return new MeshStandardMaterial(params);
    case 'MeshBasicMaterial':
      return new MeshBasicMaterial(params);
  }
}

/**
 * Builds every library material (all of EXPERIENCE §7.6 except the high-tier reflector floor).
 * Call once per canvas (MaterialsProvider does). Texture slots the kit owns (`wallWash`,
 * `floorPools`, `portrait`) start empty; R3 assigns them before the boot `compileAsync`.
 */
export function createMaterialLibrary(options: MaterialLibraryOptions = {}): BuiltMaterialLibrary {
  const decal = createRadialDecal();
  const names = Object.keys(materialSpecs) as MaterialName[];
  const library = Object.fromEntries(
    names.map((name) => [name, build(name, materialSpecs[name], options, decal)]),
  );
  return Object.freeze(library) as unknown as BuiltMaterialLibrary;
}

/** Disposes every material and the decal texture the library made (not the caller's grain). */
export function disposeMaterialLibrary(library: BuiltMaterialLibrary): void {
  library.shadowDecal.map?.dispose();
  for (const material of Object.values(library)) material.dispose();
}
