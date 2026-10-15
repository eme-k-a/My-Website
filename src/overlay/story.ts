// Seam (WP-02): WP-10 and WP-14 (R6) add the history wiring (routes.ts transitions), focus return
// and the cold-load path. For now the dialog state lives only in the store.
import { useMuseum } from '../app/store';
import type { ExhibitId } from '../content/ids';
import { content } from '../content/index';
import { readingOrder } from '../content/selectors';

export interface OpenStoryOptions {
  /** The control that opened the dialog, for focus return (WP-14). */
  opener?: HTMLElement | null;
  /** What opened it (card button, case click, Enter, door-card link); WP-14 defines the values. */
  source?: string;
}

export type StoryDirection = 'newer' | 'older';

export function openStory(id: ExhibitId, _opts?: OpenStoryOptions): void {
  useMuseum.setState({ openId: id });
}

export function closeStory(): void {
  useMuseum.setState({ openId: null });
}

/** Moves along the catalogue order; returns the new id, or null at either end or when closed. */
export function stepStory(direction: StoryDirection): ExhibitId | null {
  const { openId } = useMuseum.getState();
  if (openId === null) return null;
  const order = readingOrder(content);
  const next = order[order.indexOf(openId) + (direction === 'newer' ? -1 : 1)];
  if (next === undefined) return null;
  useMuseum.setState({ openId: next });
  return next;
}
