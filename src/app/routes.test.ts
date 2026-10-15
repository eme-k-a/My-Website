import { describe, expect, it, vi } from 'vitest';
import { content } from '../content/index';
import { EXHIBIT_IDS } from '../content/ids';
import { trackOf } from '../content/selectors';
import {
  ROUTE_TABLE,
  applyHistoryOp,
  deriveUi,
  exhibitPath,
  parsePath,
  readHistoryState,
  transitions,
  type HistoryOp,
  type HistoryState,
} from './routes';

const gallery = { pathname: '/', search: '' };
const trackOfId = (id: (typeof EXHIBIT_IDS)[number]) => trackOf(content, id);

/** Plays HistoryOps against an in-memory history, the way the browser would. */
function memoryHistory(initial: { url: string; state: HistoryState | null }) {
  const entries = [initial];
  let index = 0;
  const popped: { url: string; state: HistoryState | null }[] = [];
  const h = {
    pushState(state: HistoryState, _unused: string, url: string) {
      entries.splice(index + 1, entries.length, { url, state });
      index += 1;
    },
    replaceState(state: HistoryState, _unused: string, url: string) {
      entries[index] = { url, state };
    },
    back() {
      index -= 1;
      popped.push(entries[index]!);
    },
  };
  return {
    apply: (op: HistoryOp) => applyHistoryOp(op, h as unknown as History),
    get current() {
      return entries[index]!;
    },
    get here() {
      const { url, state } = entries[index]!;
      return {
        pathname: url.split('?')[0]!,
        search: url.includes('?') ? `?${url.split('?')[1]}` : '',
        state,
      };
    },
    get length() {
      return entries.length;
    },
    popped,
  };
}

describe('route table and paths (ARCHITECTURE §5.6)', () => {
  it('serves exactly the five routes', () => {
    expect(ROUTE_TABLE.map((r) => r.path)).toEqual([
      '/',
      '/exhibit/<id>/',
      '/resume/',
      '/resume.pdf',
      '/404.html',
    ]);
  });

  it('parsePath reads the gallery and every exhibit, trailing slash optional', () => {
    expect(parsePath('/')).toEqual({ kind: 'gallery' });
    for (const id of EXHIBIT_IDS) {
      expect(parsePath(`/exhibit/${id}/`)).toEqual({ kind: 'exhibit', id });
      expect(parsePath(`/exhibit/${id}`)).toEqual({ kind: 'exhibit', id });
    }
  });

  it('parsePath rejects unknown exhibits, other pages and hash routes', () => {
    for (const path of [
      '/exhibit/nope/',
      '/exhibit/',
      '/resume/',
      '/resume.pdf',
      '/404.html',
      '/#/exhibit/mysa',
    ]) {
      expect(parsePath(path), path).toBeNull();
    }
  });

  it('exhibitPath always ends with a slash', () => {
    expect(exhibitPath('safe-sip')).toBe('/exhibit/safe-sip/');
  });

  it('readHistoryState accepts only app state', () => {
    expect(readHistoryState(null)).toBeNull();
    expect(readHistoryState({ inApp: true })).toBeNull();
    expect(readHistoryState({ inApp: true, track: 'attic' })).toBeNull();
    expect(readHistoryState({ inApp: false, id: 'nope', track: 'main' })).toEqual({
      inApp: false,
      track: 'main',
    });
  });
});

describe('history transitions, one per ARCHITECTURE §5.6 row', () => {
  it('row 1: arriving at a stop writes no history, ever', () => {
    expect(transitions.arrive()).toEqual({ type: 'none' });
  });

  it('row 2: opening a story pushes /exhibit/<id>/ with the active track', () => {
    expect(transitions.openStory(gallery, 'verafin', 'main')).toEqual({
      type: 'push',
      url: '/exhibit/verafin/',
      state: { inApp: true, id: 'verafin', track: 'main' },
    });
    const inWing = {
      pathname: '/',
      search: '',
      state: { inApp: true, track: 'projects', mainScrollY: 900 },
    };
    expect(transitions.openStory(inWing, 'klarup', 'projects')).toMatchObject({
      state: { inApp: true, id: 'klarup', track: 'projects' },
    });
  });

  it('row 3: Newer and Older replace with the next exhibit and keep the track', () => {
    const here = {
      pathname: '/exhibit/verafin/',
      search: '',
      state: { inApp: true, id: 'verafin', track: 'main' },
    };
    expect(transitions.stepStory(here, 'klarup', 'main')).toEqual({
      type: 'replace',
      url: '/exhibit/klarup/',
      state: { inApp: true, id: 'klarup', track: 'main' },
    });
  });

  it('row 4: closing an in-app story goes back', () => {
    const h = memoryHistory({ url: '/', state: null });
    h.apply(transitions.openStory(h.here, 'mysa', 'main'));
    h.apply(transitions.stepStory(h.here, 'safe-sip', 'main'));
    h.apply(transitions.closeStory(h.here));
    expect(h.current.url).toBe('/');
    expect(deriveUi(h.here.pathname, h.here.state)).toEqual({ openId: null, track: 'main' });
  });

  it('row 5: closing a cold-loaded deep link replaces it with /', () => {
    const here = {
      pathname: '/exhibit/klarup/',
      search: '',
      state: { inApp: false, id: 'klarup', track: 'projects' },
    };
    expect(transitions.closeStory(here)).toEqual({
      type: 'replace',
      url: '/',
      state: { inApp: false, track: 'projects' },
    });
  });

  it('row 6: browser Back while the dialog is open closes it (popstate re-derives the UI)', () => {
    const h = memoryHistory({ url: '/', state: null });
    h.apply(transitions.openStory(h.here, 'wailo', 'main'));
    expect(deriveUi(h.here.pathname, h.here.state)).toEqual({ openId: 'wailo', track: 'main' });
    h.apply({ type: 'back' });
    const popped = h.popped.at(-1)!;
    expect(deriveUi(popped.url, popped.state)).toEqual({ openId: null, track: 'main' });
  });

  it('row 7: entering a wing pushes the same URL with the wing state', () => {
    expect(transitions.enterWing(gallery, 'projects', 1234)).toEqual({
      type: 'push',
      url: '/',
      state: { inApp: true, track: 'projects', mainScrollY: 1234 },
    });
  });

  it('row 8: exiting an in-app wing goes back to the main-track entry', () => {
    const h = memoryHistory({ url: '/', state: null });
    h.apply(transitions.enterWing(h.here, 'volunteer', 2400));
    expect(deriveUi(h.here.pathname, h.here.state).track).toBe('volunteer');
    const op = transitions.exitWing(h.here);
    expect(op).toEqual({ type: 'back' });
    h.apply(op);
    expect(deriveUi(h.here.pathname, h.here.state)).toEqual({ openId: null, track: 'main' });
    expect(h.current.url).toBe('/');
  });

  it('row 9: exiting a wing entered by a cold deep link replaces the state with main', () => {
    const here = { pathname: '/', search: '', state: { inApp: false, track: 'projects' } };
    expect(transitions.exitWing(here)).toEqual({
      type: 'replace',
      url: '/',
      state: { inApp: false, track: 'main' },
    });
  });

  it('row 10: a cold load of /exhibit/<id>/ replaces with the exhibit and its track', () => {
    expect(transitions.coldLoad({ pathname: '/exhibit/klarup/', search: '' }, trackOfId)).toEqual({
      type: 'replace',
      url: '/exhibit/klarup/',
      state: { inApp: false, id: 'klarup', track: 'projects' },
    });
    expect(
      transitions.coldLoad({ pathname: '/exhibit/cfia', search: '' }, trackOfId),
    ).toMatchObject({
      state: { inApp: false, id: 'cfia', track: 'main' },
    });
  });

  it('row 10b: a cold load of the gallery keeps its entry (a reload in a wing re-enters it)', () => {
    const here = {
      pathname: '/',
      search: '',
      state: { inApp: true, track: 'projects', mainScrollY: 10 },
    };
    expect(transitions.coldLoad(here, trackOfId)).toEqual({ type: 'none' });
    expect(deriveUi(here.pathname, here.state).track).toBe('projects');
  });

  it('keeps the query string (for example ?test=1) on every URL it writes', () => {
    const here = { pathname: '/', search: '?test=1&mode=museum', state: null };
    const urls = [
      transitions.openStory(here, 'mun', 'main'),
      transitions.enterWing(here, 'projects', 0),
      transitions.exitWing(here),
      transitions.closeStory({ ...here, pathname: '/exhibit/mun/' }),
    ].map((op) => (op.type === 'push' || op.type === 'replace' ? op.url : op.type));
    expect(urls).toEqual([
      '/exhibit/mun/?test=1&mode=museum',
      '/?test=1&mode=museum',
      '/?test=1&mode=museum',
      '/?test=1&mode=museum',
    ]);
  });

  it('walking every main stop never changes history length', () => {
    const h = memoryHistory({ url: '/', state: null });
    for (let i = 0; i < 10; i++) h.apply(transitions.arrive());
    expect(h.length).toBe(1);
  });

  it('applyHistoryOp calls the matching History method', () => {
    const h = { pushState: vi.fn(), replaceState: vi.fn(), back: vi.fn() };
    const state: HistoryState = { inApp: true, track: 'main' };
    applyHistoryOp({ type: 'push', url: '/a', state }, h);
    applyHistoryOp({ type: 'replace', url: '/b', state }, h);
    applyHistoryOp({ type: 'back' }, h);
    applyHistoryOp({ type: 'none' }, h);
    expect(h.pushState).toHaveBeenCalledWith(state, '', '/a');
    expect(h.replaceState).toHaveBeenCalledWith(state, '', '/b');
    expect(h.back).toHaveBeenCalledTimes(1);
  });
});
