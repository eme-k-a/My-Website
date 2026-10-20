// Everything an exhibit may import (ARCHITECTURE §7.5): `import { ... } from '../_kit'`.
// Exhibits never import src/museum/materials, the store or the router; the material hooks are
// re-exported here. The frame, placeholder and placard are the kit's own and are not exported.
export type {
  ExhibitManifest,
  ExhibitProps,
  ExhibitRuntime,
  ExhibitSlot,
  QualityTier,
} from './types';
export { defineExhibit, MAX_EXHIBIT_TRIANGLES } from './defineExhibit';
export { useExhibitClock, type ExhibitClock } from './useExhibitClock';
export { noise2, rng } from './noise';
export { canvasTexture, type CanvasDraw } from './canvasTexture';
export { MergeStatic } from './MergeStatic';
export { KEEP_UNMERGED } from './mergeStatic';
export { useMaterial, useMaterialInstance } from '../../materials';
export type { ExhibitMaterialName, MaterialLibrary } from '../../materials';
