// Material library names and type (EXPERIENCE §7.6). WP-05 (R2) adds the implementation and the
// useMaterial / useMaterialInstance hooks next to these names; exhibits reach them only through
// props.materials or the kit re-exports, never by importing this folder.
import type { Material } from 'three';

/** The only materials an exhibit may use. */
export const EXHIBIT_MATERIALS = [
  'brass',
  'frostedGlass',
  'walnut',
  'ceramic',
  'ceramicGraphite',
  'paper',
  'accentGlow',
  'wall',
] as const;

/** Environment and kit only. */
export const KIT_MATERIALS = [
  'floor',
  'caseGlass',
  'plinth',
  'beam',
  'shadowDecal',
  'ceilingSlot',
  'portrait',
] as const;

export type ExhibitMaterialName = (typeof EXHIBIT_MATERIALS)[number];
export type KitMaterialName = (typeof KIT_MATERIALS)[number];
export type MaterialLibrary = Readonly<Record<ExhibitMaterialName | KitMaterialName, Material>>;

// Implementation (WP-05, R2): docs/ART_DIRECTION.md §5.
export {
  ACCENT_GLOW,
  createMaterialLibrary,
  disposeMaterialLibrary,
  floorReflectorParams,
  materialSpecs,
  RADIAL_DECAL_SIZE,
  radialDecalPixels,
  type BuiltMaterialLibrary,
  type ColorToken,
  type MaterialLibraryOptions,
  type MaterialName,
  type MaterialSpec,
  type MaterialTypes,
  type TextureSlot,
} from './library';
export {
  MaterialsProvider,
  useMaterial,
  useMaterialInstance,
  useMaterialLibrary,
} from './MaterialsProvider';
export {
  createWalnutGrain,
  WALNUT_GRAIN_RANGE,
  WALNUT_GRAIN_SEED,
  WALNUT_GRAIN_SIZE,
  walnutGrainPixels,
} from './walnutGrain';
