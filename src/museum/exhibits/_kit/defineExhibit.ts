// ARCHITECTURE §7.2: identity plus dev assertions, so a bad manifest fails loudly in dev and tests.
// The assertions run everywhere except a production Vite build: under tsx or plain Node there is no
// import.meta.env, so a script that imports a manifest still runs them instead of throwing.
import { EXHIBIT_IDS } from '../../../content/ids';
import type { ExhibitManifest } from './types';

/** Hard per-exhibit triangle limit (PLAN §3, ARCHITECTURE §9). */
export const MAX_EXHIBIT_TRIANGLES = 20000;

export function defineExhibit(m: ExhibitManifest): ExhibitManifest {
  if (import.meta.env?.DEV !== false) {
    if (!(EXHIBIT_IDS as readonly string[]).includes(m.id)) {
      throw new Error(`defineExhibit: '${m.id}' is not in EXHIBIT_IDS`);
    }
    if (m.budget.triangles > MAX_EXHIBIT_TRIANGLES) {
      throw new Error(
        `defineExhibit: '${m.id}' budgets ${m.budget.triangles} triangles (limit ${MAX_EXHIBIT_TRIANGLES})`,
      );
    }
  }
  return m;
}
