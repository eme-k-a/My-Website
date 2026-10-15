// Routes and history (ARCHITECTURE §5.6, EXPERIENCE §3.5). The route table and the history
// transitions are frozen at contracts-v1. Transitions are pure: they return a HistoryOp and never
// touch the browser; `applyHistoryOp` performs one. Stop arrivals never write history. No hash routes.
import { EXHIBIT_IDS, WING_IDS, type ExhibitId, type TrackId, type WingId } from '../content/ids';

export const GALLERY_PATH = '/';
export const CLASSIC_PATH = '/resume/';
export const PDF_PATH = '/resume.pdf';
export const NOT_FOUND_PATH = '/404.html';

/** Every path the site serves (ARCHITECTURE §5.6); anything else is the 404 page with status 404. */
export const ROUTE_TABLE = [
  { kind: 'gallery', path: GALLERY_PATH, file: 'index.html' },
  { kind: 'exhibit', path: '/exhibit/<id>/', file: 'exhibit/<id>/index.html' },
  { kind: 'classic', path: CLASSIC_PATH, file: 'resume/index.html' },
  { kind: 'pdf', path: PDF_PATH, file: 'resume.pdf' },
  { kind: 'notFound', path: NOT_FOUND_PATH, file: '404.html' },
] as const;
export type RouteKind = (typeof ROUTE_TABLE)[number]['kind'];

export type ParsedPath = { kind: 'gallery' } | { kind: 'exhibit'; id: ExhibitId };

const EXHIBIT_PATH = /^\/exhibit\/([a-z0-9-]+)\/?$/;
const isExhibitId = (id: unknown): id is ExhibitId =>
  typeof id === 'string' && (EXHIBIT_IDS as readonly string[]).includes(id);
const isTrackId = (id: unknown): id is TrackId =>
  id === 'main' || (WING_IDS as readonly unknown[]).includes(id);

/** The app routes only: the gallery and exhibit pages (trailing slash optional on input). */
export function parsePath(pathname: string): ParsedPath | null {
  if (pathname === '' || pathname === GALLERY_PATH) return { kind: 'gallery' };
  const match = EXHIBIT_PATH.exec(pathname);
  if (match && isExhibitId(match[1])) return { kind: 'exhibit', id: match[1] };
  return null;
}

/** Always with a trailing slash. */
export function exhibitPath(id: ExhibitId): `/exhibit/${ExhibitId}/` {
  return `/exhibit/${id}/`;
}

/** What the app keeps in `history.state`. Wings add `mainScrollY`; stories add `id`. */
export interface HistoryState {
  inApp: boolean;
  id?: ExhibitId;
  track: TrackId;
  mainScrollY?: number;
}

export type HistoryOp =
  | { type: 'push'; url: string; state: HistoryState }
  | { type: 'replace'; url: string; state: HistoryState }
  | { type: 'back' }
  | { type: 'none' };

/** Where the app is now: `location.pathname`, `location.search` and the raw `history.state`. */
export interface Here {
  pathname: string;
  search?: string;
  state?: unknown;
}

/** `history.state` validated (anything else, including null, reads as no app state). */
export function readHistoryState(raw: unknown): HistoryState | null {
  if (raw === null || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.inApp !== 'boolean' || !isTrackId(s.track)) return null;
  const state: HistoryState = { inApp: s.inApp, track: s.track };
  if (isExhibitId(s.id)) state.id = s.id;
  if (typeof s.mainScrollY === 'number' && Number.isFinite(s.mainScrollY)) {
    state.mainScrollY = s.mainScrollY;
  }
  return state;
}

export interface UiState {
  openId: ExhibitId | null;
  track: TrackId;
}

/**
 * UI state as a pure function of the URL and the history entry: the dialog is open on an exhibit
 * path; the track comes from the entry (`main` when it has no app state). Run it on every popstate.
 */
export function deriveUi(pathname: string, state: unknown): UiState {
  const parsed = parsePath(pathname);
  return {
    openId: parsed?.kind === 'exhibit' ? parsed.id : null,
    track: readHistoryState(state)?.track ?? 'main',
  };
}

const NONE: HistoryOp = { type: 'none' };
const BACK: HistoryOp = { type: 'back' };
// The query string (for example ?test=1) survives every URL the app writes.
const withSearch = (path: string, here: Here) => `${path}${here.search ?? ''}`;

/** Arrive at a stop (scroll, keys, HUD): never writes history. */
export function arrive(): HistoryOp {
  return NONE;
}

/** Open a story in the app: push `/exhibit/<id>/`, keeping the active track. */
export function openStory(here: Here, id: ExhibitId, track: TrackId): HistoryOp {
  return {
    type: 'push',
    url: withSearch(exhibitPath(id), here),
    state: { inApp: true, id, track },
  };
}

/** Newer or Older in the dialog: replace with the next exhibit, the active track unchanged. */
export function stepStory(here: Here, next: ExhibitId, track: TrackId): HistoryOp {
  return {
    type: 'replace',
    url: withSearch(exhibitPath(next), here),
    state: { inApp: true, id: next, track },
  };
}

/** Close the story: back when the app opened it, else replace a cold-loaded deep link with `/`. */
export function closeStory(here: Here): HistoryOp {
  const state = readHistoryState(here.state);
  if (state?.inApp) return BACK;
  return {
    type: 'replace',
    url: withSearch(GALLERY_PATH, here),
    state: { inApp: false, track: state?.track ?? 'main' },
  };
}

/** Enter a wing ("Step inside" or Enter at a door): push the same URL with the wing state. */
export function enterWing(here: Here, wing: WingId, mainScrollY: number): HistoryOp {
  return {
    type: 'push',
    url: withSearch(here.pathname, here),
    state: { inApp: true, track: wing, mainScrollY },
  };
}

/** Exit a wing: back when the app entered it, else (cold deep link) replace with the main track. */
export function exitWing(here: Here): HistoryOp {
  const state = readHistoryState(here.state);
  if (state?.inApp && state.track !== 'main') return BACK;
  return {
    type: 'replace',
    url: withSearch(here.pathname, here),
    state: { inApp: false, track: 'main' },
  };
}

/**
 * Cold load: an exhibit page records `{ inApp: false, id, track: trackOf(id) }` (its dialog opens at
 * hydration). The gallery keeps its entry, so a reload inside a wing re-enters it without pushing.
 */
export function coldLoad(here: Here, trackOf: (id: ExhibitId) => TrackId): HistoryOp {
  const parsed = parsePath(here.pathname);
  if (parsed?.kind !== 'exhibit') return NONE;
  return {
    type: 'replace',
    url: withSearch(here.pathname, here),
    state: { inApp: false, id: parsed.id, track: trackOf(parsed.id) },
  };
}

/** The frozen transition set (ARCHITECTURE §5.6 table). */
export const transitions = {
  arrive,
  openStory,
  stepStory,
  closeStory,
  enterWing,
  exitWing,
  coldLoad,
} as const;

/** Performs a HistoryOp. wouter's browser location observes pushState and replaceState. */
export function applyHistoryOp(
  op: HistoryOp,
  h: Pick<History, 'pushState' | 'replaceState' | 'back'> = window.history,
): void {
  if (op.type === 'push') h.pushState(op.state, '', op.url);
  else if (op.type === 'replace') h.replaceState(op.state, '', op.url);
  else if (op.type === 'back') h.back();
}

/** The current location and history entry (browser only). */
export function readHere(): Here {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    state: window.history.state,
  };
}
