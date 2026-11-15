import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initialMuseumState, useMuseum } from '../app/store';
import { content } from '../content/index';
import { readingOrder } from '../content/selectors';

const travelTo = vi.fn((_id: string, _opts?: { instant?: boolean }) => Promise.resolve());
vi.mock('../museum/rail/navigation', () => ({
  travelTo: (id: string, opts?: { instant?: boolean }) => travelTo(id, opts),
}));

const story = await import('./story');

interface Entry {
  url: string;
  state: unknown;
}

/** A browser stand-in: one session history, location derived from the current entry. */
function fakeBrowser(startUrl: string) {
  const origin = 'https://example.test';
  const entries: Entry[] = [{ url: startUrl, state: null }];
  let index = 0;
  const listeners = new Set<() => void>();
  const current = () => new URL(entries[index]!.url, origin);
  const history = {
    scrollRestoration: 'auto',
    get state() {
      return entries[index]!.state;
    },
    get length() {
      return entries.length;
    },
    pushState(state: unknown, _title: string, url: string) {
      entries.splice(index + 1);
      entries.push({ url, state });
      index = entries.length - 1;
    },
    replaceState(state: unknown, _title: string, url: string) {
      entries[index] = { url, state };
    },
    back() {
      if (index === 0) throw new Error('back() would leave the site');
      index -= 1;
      listeners.forEach((fn) => fn());
    },
  };
  const window = {
    history,
    location: {
      get pathname() {
        return current().pathname;
      },
      get search() {
        return current().search;
      },
    },
    addEventListener: (type: string, fn: () => void) => {
      if (type === 'popstate') listeners.add(fn);
    },
    removeEventListener: (type: string, fn: () => void) => {
      if (type === 'popstate') listeners.delete(fn);
    },
  };
  return { window, history, entries, path: () => current().pathname + current().search };
}

let browser: ReturnType<typeof fakeBrowser>;
let uninstall: () => void = () => {};

function boot(url: string) {
  browser = fakeBrowser(url);
  vi.stubGlobal('window', browser.window);
  vi.stubGlobal('history', browser.history);
  vi.stubGlobal('HTMLElement', class {});
  vi.stubGlobal('document', { activeElement: null, body: null, querySelector: () => null });
  uninstall = story.installStory();
}

beforeEach(() => {
  useMuseum.setState(initialMuseumState());
  story.resetStoryForTests();
  travelTo.mockClear();
});

afterEach(() => {
  uninstall();
  vi.unstubAllGlobals();
});

describe('catalogue order', () => {
  it('steps Older from verafin through the projects wing, then mysa', () => {
    expect(readingOrder(content).slice(0, 4)).toEqual([
      'verafin',
      'klarup',
      'finance-tracker',
      'mysa',
    ]);
    expect(story.neighbourOf('verafin', 'older')).toBe('klarup');
    expect(story.neighbourOf('verafin', 'newer')).toBeNull();
    expect(story.neighbourOf('certifications', 'older')).toBeNull();
  });
});

describe('story history', () => {
  it('opening pushes one in-app entry with the active track and keeps the query', () => {
    boot('/?test=1&mode=museum');
    story.openStory('verafin');
    expect(browser.history.length).toBe(2);
    expect(browser.path()).toBe('/exhibit/verafin/?test=1&mode=museum');
    expect(browser.history.state).toEqual({ inApp: true, id: 'verafin', track: 'main' });
    expect(useMuseum.getState().openId).toBe('verafin');
  });

  it('Newer and Older replace the entry and never add one', () => {
    boot('/?test=1');
    story.openStory('verafin');
    const length = browser.history.length;
    expect(story.stepStory('older')).toBe('klarup');
    expect(story.stepStory('older')).toBe('finance-tracker');
    expect(story.stepStory('older')).toBe('mysa');
    expect(story.stepStory('newer')).toBe('finance-tracker');
    expect(browser.history.length).toBe(length);
    expect(browser.path()).toBe('/exhibit/finance-tracker/?test=1');
    expect(browser.history.state).toEqual({ inApp: true, id: 'finance-tracker', track: 'main' });
  });

  it('moves the camera behind the dialog only for exhibits on the active track', () => {
    boot('/');
    story.openStory('verafin');
    story.stepStory('older'); // klarup, projects wing: stays
    expect(travelTo).not.toHaveBeenCalled();
    story.stepStory('older');
    story.stepStory('older'); // mysa, main aisle: follows
    expect(travelTo).toHaveBeenCalledWith('mysa', undefined);
  });

  it('stops at either end of the catalogue', () => {
    boot('/');
    story.openStory('verafin');
    expect(story.stepStory('newer')).toBeNull();
    expect(useMuseum.getState().openId).toBe('verafin');
  });

  it('closing an in-app story goes back, and popstate closes the dialog', () => {
    boot('/?test=1');
    story.openStory('verafin');
    story.stepStory('older');
    story.stepStory('older');
    story.stepStory('older');
    story.closeStory();
    expect(browser.path()).toBe('/?test=1');
    expect(browser.history.state).toBeNull();
    expect(useMuseum.getState().openId).toBeNull();
  });

  it('a second close while Back is pending does not go back twice', () => {
    boot('/');
    story.openStory('verafin');
    const back = vi.spyOn(browser.history, 'back').mockImplementation(() => {});
    story.closeStory();
    story.closeStory();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('browser Back closes an in-app dialog', () => {
    boot('/');
    story.openStory('mysa');
    browser.history.back();
    expect(useMuseum.getState().openId).toBeNull();
  });

  it('never writes history on a stop arrival', () => {
    boot('/');
    useMuseum.setState({ stop: 'mysa', settled: true });
    expect(browser.entries).toEqual([{ url: '/', state: null }]);
  });
});

describe('cold deep links', () => {
  it('records the entry, opens the dialog and travels once ready', () => {
    boot('/exhibit/verafin/?test=1&mode=museum');
    expect(browser.history.state).toEqual({ inApp: false, id: 'verafin', track: 'main' });
    expect(useMuseum.getState().openId).toBe('verafin');
    expect(travelTo).not.toHaveBeenCalled();
    useMuseum.setState({ ready: true });
    expect(travelTo).toHaveBeenCalledWith('verafin', { instant: true });
  });

  it('records the wing track of a wing exhibit', () => {
    boot('/exhibit/klarup/');
    expect(browser.history.state).toEqual({ inApp: false, id: 'klarup', track: 'projects' });
  });

  it('closing replaces the deep link with / on the same entry, never going back', () => {
    boot('/exhibit/verafin/?test=1&mode=museum');
    story.stepStory('older');
    story.closeStory();
    expect(browser.history.length).toBe(1);
    expect(browser.path()).toBe('/?test=1&mode=museum');
    expect(browser.history.state).toEqual({ inApp: false, track: 'main' });
    expect(useMuseum.getState().openId).toBeNull();
  });

  it('does nothing on the gallery', () => {
    boot('/');
    expect(browser.history.state).toBeNull();
    expect(useMuseum.getState().openId).toBeNull();
  });
});
