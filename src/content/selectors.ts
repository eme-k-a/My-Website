// Track selectors (ARCHITECTURE §3.7, EXPERIENCE §3.1). Their signatures are frozen at
// contracts-v1; WP-03 appends the copy selectors (heroLines, stopCards, threeDStrings) and WP-04
// printModel.
import { doorId, type ExhibitId, type StopId, type TrackId, type WingId } from './ids';
import type { Content, ExhibitEntry } from './types';

// Content ids are validated against EXHIBIT_IDS by the content tests, so the casts below are safe.
const asExhibit = (id: string) => id as ExhibitId;

/** `lobby`, each work id followed by the doors of the wings that follow it, education, certifications, `desk`. */
export function mainTrack(c: Content): StopId[] {
  const stops: StopId[] = ['lobby'];
  for (const work of c.experiences) {
    stops.push(asExhibit(work.id));
    for (const wing of c.wings) if (wing.after === work.id) stops.push(doorId(wing.id));
  }
  for (const edu of c.education) stops.push(asExhibit(edu.id));
  stops.push(asExhibit(c.certifications.id), 'desk');
  return stops;
}

/** `[<wing>-door, ...items]`: the door pose is index 0 of its wing track. */
export function wingTrack(c: Content, wingId: WingId): StopId[] {
  const wing = c.wings.find((w) => w.id === wingId);
  if (!wing) throw new Error(`No wing '${wingId}' in content`);
  return [doorId(wing.id), ...wing.items.map(asExhibit)];
}

/** The track a stop lives on: a wing for wing items, otherwise `main` (doors are on main). */
export function trackOf(c: Content, id: StopId): TrackId {
  const wing = c.wings.find((w) => w.items.includes(id));
  if (wing) return wing.id;
  if (mainTrack(c).includes(id)) return 'main';
  throw new Error(`Unknown stop '${id}'`);
}

/** Catalogue order: main-track exhibits with each wing's items right after its door. */
export function readingOrder(c: Content): ExhibitId[] {
  const order: ExhibitId[] = [];
  for (const stop of mainTrack(c)) {
    const wing = c.wings.find((w) => doorId(w.id) === stop);
    if (wing) order.push(...wing.items.map(asExhibit));
    else if (stop !== 'lobby' && stop !== 'desk') order.push(stop as ExhibitId);
  }
  return order;
}

/** The content entry behind an exhibit id. */
export function entryById(c: Content, id: ExhibitId): ExhibitEntry {
  const entries: ExhibitEntry[] = [
    ...c.experiences,
    ...c.projects,
    ...c.volunteer,
    ...c.education,
    c.certifications,
  ];
  const entry = entries.find((e) => e.id === id);
  if (!entry) throw new Error(`No content entry for exhibit '${id}'`);
  return entry;
}

/**
 * "01" to "06" in main-track order; wing items "P1", "P2", "V1", "V2" (the wing's first letter).
 * Displayed as "No. 01" or "No. P1". Computed, never stored.
 */
export function exhibitNumber(c: Content, id: ExhibitId): string {
  const wing = c.wings.find((w) => w.items.includes(id));
  if (wing) return `${wing.id.charAt(0).toUpperCase()}${wing.items.indexOf(id) + 1}`;
  const mainExhibits = mainTrack(c).filter(
    (s) => s !== 'lobby' && s !== 'desk' && !c.wings.some((w) => doorId(w.id) === s),
  );
  const index = mainExhibits.indexOf(id);
  if (index < 0) throw new Error(`Unknown exhibit '${id}'`);
  return String(index + 1).padStart(2, '0');
}
