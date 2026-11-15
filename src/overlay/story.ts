// Story state and history (ARCHITECTURE §5.6, EXPERIENCE §3.5, §5.10). Every history write goes
// through the frozen transitions of src/app/routes.ts:
// - open: pushState('/exhibit/<id>/', { inApp: true, id, track }), so Back closes the dialog;
// - Newer and Older: replaceState with the next exhibit in catalogue order (never a new entry);
//   the camera follows behind the dialog only when that exhibit is on the active track;
// - close: history.back() when the entry is in-app (popstate closes the dialog), else, for a
//   cold-loaded deep link, replaceState({ inApp: false, track }, '', '/');
// - cold load of /exhibit/<id>/: replaceState({ inApp: false, id, track }), open at hydration,
//   and travel to the exhibit's stop instantly once the museum is ready.
// Stop arrivals never touch history. Focus after a close follows EXPERIENCE §5.10: the exhibit's
// "Read the story" when the exhibit is on the active track (its section scrolled into view
// instantly), otherwise the control that opened the dialog.
import {
  applyHistoryOp,
  deriveUi,
  parsePath,
  readHere,
  readHistoryState,
  transitions,
} from '../app/routes';
import { useMuseum } from '../app/store';
import { TEST_IDS } from '../app/testIds';
import type { ExhibitId } from '../content/ids';
import { content } from '../content/index';
import { readingOrder, trackOf } from '../content/selectors';
import { travelTo } from '../museum/rail/navigation';

export interface OpenStoryOptions {
  /** The control that opened the dialog, for focus return. */
  opener?: HTMLElement | null;
  /** What opened it: 'card' (Read the story), 'card-link' (an artwork title or door-card link),
   * 'case' (a click on the current case), 'enter' (the Enter key), 'cold' (a deep link). */
  source?: 'card' | 'card-link' | 'case' | 'enter' | 'cold';
}

export type StoryDirection = 'newer' | 'older';

const ignore = () => {};
const ORDER: readonly ExhibitId[] = readingOrder(content);

/** The neighbour in catalogue order (Newer is towards No. 01), or null at either end. */
export function neighbourOf(id: ExhibitId, direction: StoryDirection): ExhibitId | null {
  const index = ORDER.indexOf(id);
  if (index < 0) return null;
  return ORDER[index + (direction === 'newer' ? -1 : 1)] ?? null;
}

/** Whether an exhibit is on the active track (the camera can stand at it without a track swap). */
export const onActiveTrack = (id: ExhibitId): boolean =>
  trackOf(content, id) === useMuseum.getState().track;

let opener: HTMLElement | null = null;
/** The exhibit of a cold-loaded deep link, until its dialog closes. */
let coldId: ExhibitId | null = null;
/** A history.back() is on its way; popstate will close the dialog. */
let closing = false;
/** Cancels the cold load's wait for `ready`. */
let cancelColdTravel: () => void = ignore;

const openButton = (id: ExhibitId) =>
  document.querySelector<HTMLElement>(`[data-testid="${TEST_IDS.open(id)}"]`);

/** Open `id`'s story from the app: push one entry, keep the active track, then show the dialog. */
export function openStory(id: ExhibitId, opts: OpenStoryOptions = {}): void {
  const state = useMuseum.getState();
  if (state.openId !== null) return;
  const active = document.activeElement;
  opener =
    opts.opener ?? (active instanceof HTMLElement && active !== document.body ? active : null);
  coldId = null;
  closing = false;
  // The gallery entry restores nothing on Back: the close places the scroll itself (§5.10), and
  // the browser's own restoration, which lands after popstate, would undo it. The story entry
  // keeps 'auto', so a reload stays put.
  window.history.scrollRestoration = 'manual';
  applyHistoryOp(transitions.openStory(readHere(), id, state.track));
  window.history.scrollRestoration = 'auto';
  useMuseum.setState({ openId: id });
}

/** Newer or Older: replace the entry with the neighbour; returns it, or null at either end. */
export function stepStory(direction: StoryDirection): ExhibitId | null {
  const { openId, track } = useMuseum.getState();
  if (openId === null || closing) return null;
  const next = neighbourOf(openId, direction);
  if (next === null) return null;
  const here = readHere();
  const op = transitions.stepStory(here, next, track);
  // A cold-loaded deep link stays `inApp: false` after Newer or Older, so its close still replaces
  // with `/` instead of going back off the site (the frozen transition writes `inApp: true`; the
  // R0 request is in review/reports/WP-14.json).
  if (op.type === 'replace' && readHistoryState(here.state)?.inApp === false) {
    op.state = { ...op.state, inApp: false };
  }
  applyHistoryOp(op);
  useMuseum.setState({ openId: next });
  // The camera moves behind the dialog only when the exhibit is on the active track (§3.5).
  if (onActiveTrack(next)) travelTo(next).catch(ignore);
  return next;
}

/** Close (button, Esc, backdrop): back for an in-app entry, else replace the deep link with `/`. */
export function closeStory(): void {
  if (useMuseum.getState().openId === null || closing) return;
  const op = transitions.closeStory(readHere());
  if (op.type === 'back') {
    closing = true;
    applyHistoryOp(op);
    return;
  }
  applyHistoryOp(op);
  useMuseum.setState({ openId: null });
}

/**
 * Called by the dialog right after it has closed for `id`: scroll the exhibit's section into view
 * and focus its "Read the story" when it is on the active track, else return focus to the opener
 * (after a cold deep link, the deep-linked exhibit's button).
 */
export function restoreFocus(id: ExhibitId): void {
  cancelColdTravel();
  cancelColdTravel = ignore;
  const fallback = opener?.isConnected ? opener : coldId ? openButton(coldId) : null;
  opener = null;
  coldId = null;
  closing = false;
  const button = openButton(id);
  if (button && onActiveTrack(id)) {
    travelTo(id, { instant: true })
      .catch(ignore)
      .finally(() => button.focus({ preventScroll: true }));
    // Focus now as well, so focus is never lost while a wing glide is still settling.
    button.focus({ preventScroll: true });
    return;
  }
  fallback?.focus();
}

function onPopState(): void {
  closing = false;
  const ui = deriveUi(window.location.pathname, window.history.state);
  if (ui.openId === null && useMuseum.getState().openId !== null) {
    useMuseum.setState({ openId: null });
  }
}

/** Runs `fn` once the museum is ready (now, when it already is); returns a cancel function. */
function whenReady(fn: () => void): () => void {
  if (useMuseum.getState().ready) {
    fn();
    return ignore;
  }
  const off = useMuseum.subscribe((s) => {
    if (!s.ready) return;
    off();
    fn();
  });
  return off;
}

/**
 * Installs the popstate listener and handles a cold load of /exhibit/<id>/. The dialog calls it in
 * a layout effect, so the cold-load entry is written before the rail's own popstate and wing
 * handling installs (a deep link into a wing then enters it without a history entry).
 */
export function installStory(): () => void {
  window.addEventListener('popstate', onPopState);
  const parsed = parsePath(window.location.pathname);
  if (parsed?.kind === 'exhibit' && useMuseum.getState().openId === null) {
    const id = parsed.id;
    applyHistoryOp(transitions.coldLoad(readHere(), (exhibit) => trackOf(content, exhibit)));
    opener = null;
    coldId = id;
    closing = false;
    useMuseum.setState({ openId: id });
    cancelColdTravel = whenReady(() => {
      cancelColdTravel = ignore;
      if (useMuseum.getState().openId !== null) travelTo(id, { instant: true }).catch(ignore);
    });
  }
  return () => {
    window.removeEventListener('popstate', onPopState);
    cancelColdTravel();
    cancelColdTravel = ignore;
  };
}

/** Test seam: forget the module state between unit tests. */
export function resetStoryForTests(): void {
  opener = null;
  coldId = null;
  closing = false;
  cancelColdTravel = ignore;
}
