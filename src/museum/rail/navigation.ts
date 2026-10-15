// Seam (WP-02): WP-09 (R4) replaces this with real travel, including wing entry and exit through
// the same code as the UI (ARCHITECTURE §6.7). Until then travelTo scrolls a main-track section into
// view and the wing functions reject.
import type { StopId, WingId } from '../../content/ids';

export interface TravelOptions {
  instant?: boolean;
}

/** Scrolls `#stop-<id>` into view (instantly with `instant`) and resolves. */
export function travelTo(id: StopId, opts: TravelOptions = {}): Promise<void> {
  const section = document.getElementById(`stop-${id}`);
  if (!section) return Promise.reject(new Error(`No section for stop '${id}'`));
  section.scrollIntoView({ behavior: opts.instant ? 'instant' : 'smooth', block: 'start' });
  return Promise.resolve();
}

export function enterWing(_wing: WingId): Promise<void> {
  return Promise.reject(new Error('not available yet: WP-09'));
}

export function exitWing(): Promise<void> {
  return Promise.reject(new Error('not available yet: WP-09'));
}
