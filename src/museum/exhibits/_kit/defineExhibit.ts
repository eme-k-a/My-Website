// ARCHITECTURE §7.2: identity plus dev assertions, so a bad manifest fails loudly in dev and tests.
import { EXHIBIT_IDS } from '../../../content/ids';
import type { ExhibitManifest } from './types';

/** Hard per-exhibit triangle limit (PLAN §3, ARCHITECTURE §9). */
export const MAX_EXHIBIT_TRIANGLES = 20000;

export function defineExhibit(m: ExhibitManifest): ExhibitManifest {
  if (import.meta.env.DEV) {
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
