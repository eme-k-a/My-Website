import { describe, expect, it } from 'vitest';
import type { MuseumState } from '../../app/store';
import { content } from '../../content/index';
import {
  arrivalMessage,
  classifyMove,
  createAnnouncer,
  HUD_WINDOW_MS,
  KEY_WINDOW_MS,
  wingEntryMessage,
  wingExitMessage,
} from './announce';

type View = Pick<MuseumState, 'ready' | 'settled' | 'stop' | 'track' | 'inputSource'>;

describe('wording (EXPERIENCE §8.4 aria-live rows)', () => {
  it('announces an exhibit as number, title, role, organization and dates', () => {
    expect(arrivalMessage('mysa')).toBe(
      'No. 02, Warm Start. Full Stack Software Developer (Co-op), Mysa, Jan 2026 – May 2026.',
    );
    const verafin = content.experiences.find((e) => e.id === 'verafin')!;
    expect(arrivalMessage('verafin')).toMatch(
      new RegExp(
        `^No\\. 01, ${verafin.exhibit.title}\\. ${verafin.role.replace(/[()]/g, '\\$&')}, `,
      ),
    );
  });

  it('announces doors, the lobby and the desk', () => {
    expect(arrivalMessage('projects-door')).toBe(
      'Projects wing door. Press Enter to step inside, or keep scrolling.',
    );
    expect(arrivalMessage('volunteer-door')).toBe(
      'Volunteer & Leadership wing door. Press Enter to step inside, or keep scrolling.',
    );
    expect(arrivalMessage('lobby')).toBe('Lobby.');
    expect(arrivalMessage('desk')).toBe('Front desk.');
  });

  it('announces wing entry and exit (EXPERIENCE §3.4)', () => {
    expect(wingEntryMessage('projects', 'klarup')).toBe(
      'Entered the Projects wing. No. P1, The Climb.',
    );
    expect(wingExitMessage('projects')).toBe('Back in the main aisle at the Projects wing door.');
    expect(wingExitMessage('volunteer')).toBe(
      'Back in the main aisle at the Volunteer & Leadership wing door.',
    );
  });

  it('never uses an em dash', () => {
    const all = ['lobby', 'verafin', 'projects-door', 'mysa', 'wailo', 'cfia', 'mun', 'desk'];
    for (const id of all) expect(arrivalMessage(id as never)).not.toContain('\u2014');
  });
});

describe('classifyMove (EXPERIENCE §10.3)', () => {
  const base = {
    now: 10_000,
    keyAt: -Infinity,
    stepAt: -Infinity,
    since: 5_000,
    hudAt: -Infinity,
    inputSource: 'scroll' as const,
  };

  it('is keyboard when a key was pressed within 1 s before the scroll began', () => {
    expect(classifyMove({ ...base, keyAt: 10_000 - KEY_WINDOW_MS })).toBe('keyboard');
    expect(classifyMove({ ...base, keyAt: 10_000 - KEY_WINDOW_MS - 1 })).toBe('scroll');
  });

  it('is keyboard for a stepping key since the last arrival, however late its scroll starts', () => {
    expect(classifyMove({ ...base, keyAt: 6_000, stepAt: 6_000 })).toBe('keyboard');
    expect(classifyMove({ ...base, keyAt: 4_000, stepAt: 4_000 })).toBe('scroll');
  });

  it('is hud right after a HUD control, and scroll otherwise', () => {
    expect(classifyMove({ ...base, inputSource: 'hud', hudAt: 9_900 })).toBe('hud');
    expect(classifyMove({ ...base, inputSource: 'hud', hudAt: 10_000 - HUD_WINDOW_MS - 1 })).toBe(
      'scroll',
    );
    expect(classifyMove({ ...base, inputSource: 'pointer', hudAt: 9_900 })).toBe('scroll');
    expect(classifyMove(base)).toBe('scroll');
  });
});

/** A fake store and clock around one announcer. */
function harness() {
  let now = 0;
  let keyAt = Number.NEGATIVE_INFINITY;
  let stepAt = Number.NEGATIVE_INFINITY;
  const written: string[] = [];
  let state: View = {
    ready: true,
    settled: false,
    stop: 'lobby',
    track: 'main',
    inputSource: 'scroll',
  };
  const announcer = createAnnouncer({
    write: (m) => written.push(m),
    now: () => now,
    keyAt: () => keyAt,
    stepAt: () => stepAt,
    consumeHud: () => set({ inputSource: 'scroll' }),
  });
  function set(patch: Partial<View>) {
    const previous = state;
    state = { ...state, ...patch };
    announcer.onStore(state, previous);
  }
  return {
    written,
    set,
    scroll: () => announcer.onScroll(),
    advance: (ms: number) => (now += ms),
    key: () => (keyAt = now),
    step: () => (keyAt = stepAt = now),
    /** A move: scroll events, then the settle at `stop`. */
    walk(stop: View['stop']) {
      announcer.onScroll();
      set({ settled: false });
      now += 300;
      announcer.onScroll();
      set({ settled: true, stop });
      now += 2_000;
    },
  };
}

describe('createAnnouncer', () => {
  it('stays silent for wheel, trackpad and touch walks', () => {
    const h = harness();
    h.set({ settled: true });
    for (const stop of ['verafin', 'projects-door', 'mysa', 'volunteer-door', 'wailo'] as const) {
      h.walk(stop);
    }
    expect(h.written).toEqual([]);
  });

  it('announces each keyboard arrival once', () => {
    const h = harness();
    h.set({ settled: true });
    for (const stop of ['verafin', 'projects-door', 'mysa'] as const) {
      h.key();
      h.advance(50);
      h.walk(stop);
    }
    expect(h.written).toEqual([
      arrivalMessage('verafin'),
      arrivalMessage('projects-door'),
      arrivalMessage('mysa'),
    ]);
  });

  it('does not announce the page load, nor a key pressed long before the scroll', () => {
    const h = harness();
    h.key();
    h.advance(100);
    h.set({ settled: true });
    h.advance(KEY_WINDOW_MS + 1);
    h.walk('verafin');
    expect(h.written).toEqual([]);
  });

  it('announces HUD moves, and a second HUD move after the first one is consumed', () => {
    const h = harness();
    h.set({ settled: true });
    h.set({ inputSource: 'hud' });
    h.walk('cfia');
    h.set({ inputSource: 'hud' });
    h.walk('desk');
    h.walk('mun');
    expect(h.written).toEqual([arrivalMessage('cfia'), arrivalMessage('desk')]);
  });

  it('announces a key step whose scroll starts more than 1 s after the press', () => {
    const h = harness();
    h.set({ settled: true });
    h.advance(800);
    h.step();
    h.advance(1_500);
    h.walk('verafin');
    h.walk('projects-door');
    expect(h.written).toEqual([arrivalMessage('verafin')]);
  });

  it('upgrades a wheel move when a key is pressed during it', () => {
    const h = harness();
    h.set({ settled: true });
    h.scroll();
    h.set({ settled: false });
    h.advance(500);
    h.key();
    h.scroll();
    h.set({ settled: true, stop: 'verafin' });
    expect(h.written).toEqual([arrivalMessage('verafin')]);
  });

  it('does not announce a settle back at the same stop', () => {
    const h = harness();
    h.set({ settled: true, stop: 'mysa' });
    h.key();
    h.walk('mysa');
    expect(h.written).toEqual([]);
  });

  it('announces wing entry and exit whatever the input, once each', () => {
    const h = harness();
    h.set({ settled: true, stop: 'projects-door' });
    h.set({ settled: false, track: 'projects' });
    h.walk('klarup');
    h.walk('finance-tracker');
    h.set({ settled: false, track: 'main' });
    h.walk('projects-door');
    expect(h.written).toEqual([
      'Entered the Projects wing. No. P1, The Climb.',
      'Back in the main aisle at the Projects wing door.',
    ]);
  });

  it('does not announce a wing entered while booting (a reload inside the wing)', () => {
    const h = harness();
    h.set({ ready: false, track: 'projects' });
    h.set({ ready: true });
    h.set({ settled: true, stop: 'klarup' });
    expect(h.written).toEqual([]);
  });
});
