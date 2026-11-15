// ARCHITECTURE §7.3: every exhibit folder's eager manifest. Adding an exhibit never edits a shared
// list: a new src/museum/exhibits/<id>/index.ts is picked up here.
import type { ExhibitId } from '../../../content/ids';
import type { ExhibitManifest } from './types';

const mods = import.meta.glob<{ default: ExhibitManifest }>(['../*/index.ts', '!../_kit/**'], {
  eager: true,
});

export const registry = new Map<ExhibitId, ExhibitManifest>(
  Object.values(mods).map((m) => [m.default.id, m.default]),
);
