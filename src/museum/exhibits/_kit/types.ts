// Exhibit plugin types (ARCHITECTURE §7.2), frozen at contracts-v1. The `defineExhibit` function
// declared there is implemented in ./defineExhibit.ts (identity plus dev assertions).
import type { ComponentType } from 'react';
import type { ExhibitId } from '../../../content/ids';
import type { ExhibitEntry } from '../../../content/types';
import type { MaterialLibrary } from '../../materials';

export type QualityTier = 'low' | 'medium' | 'high';

export interface ExhibitSlot {
  id: ExhibitId;
  mount: 'plinth' | 'wall';
  bounds: { min: [number, number, number]; max: [number, number, number] }; // local meters; origin = plinth top center (wall: back-panel center), +Z toward the visitor (EXPERIENCE §4, §5.3)
}

export interface ExhibitRuntime {
  tier: QualityTier;
  reducedMotion: boolean;
  motion: boolean; // false when idle-stopped, reduced motion, ?test=1, or tier 'low'
  active: boolean; // this exhibit is the settled stop
  hovered: boolean;
  open: boolean; // its story dialog is open
}

export interface ExhibitProps {
  entry: ExhibitEntry;
  slot: ExhibitSlot;
  runtime: ExhibitRuntime;
  materials: MaterialLibrary;
}

export interface ExhibitManifest {
  id: ExhibitId; // equals the folder name
  title: string; // concept title, for debug and review
  load: () => Promise<{ default: ComponentType<ExhibitProps> }>;
  budget: { triangles: number; drawCalls: number; textureMB: number }; // triangles <= 20000
  motion: 'none' | 'slow'; // at most one slow motion
}
