import { afterEach, describe, expect, it } from 'vitest';
import { initialMuseumState, useMuseum } from './store';
import {
  installTestHook,
  registerNavProvider,
  registerStatsProvider,
  testParams,
  type MuseumStats,
  type TestHookHost,
} from './testHooks';

const host = (search: string): TestHookHost => ({ location: { search } });

afterEach(() => {
  useMuseum.setState(initialMuseumState(), true);
});

describe('testParams', () => {
  it('reads test, tier and idle', () => {
    expect(testParams('?test=1&tier=high&idle=1')).toEqual({
      test: true,
      tier: 'high',
      idle: true,
    });
    expect(testParams('?test=1&mode=museum')).toEqual({ test: true, tier: null, idle: false });
    expect(testParams('')).toEqual({ test: false, tier: null, idle: false });
  });

  it('ignores invalid values', () => {
    expect(testParams('?test=true&tier=ultra&idle=yes')).toEqual({
      test: false,
      tier: null,
      idle: false,
    });
  });
});

describe('installTestHook', () => {
  it('does nothing without ?test=1', () => {
    const h = host('?mode=museum');
    expect(installTestHook(h)).toBeNull();
    expect(h.__MUSEUM__).toBeUndefined();
  });

  it('defines __MUSEUM__ under ?test=1 and reads ready, settled and stop from the store', () => {
    const h = host('?test=1');
    const hook = installTestHook(h);
    expect(h.__MUSEUM__).toBe(hook);
    expect(hook).toMatchObject({ ready: false, settled: false, stop: 'lobby' });
    useMuseum.setState({ ready: true, settled: true, stop: 'mysa' });
    expect(hook).toMatchObject({ ready: true, settled: true, stop: 'mysa' });
  });

  it('throws "not available yet" while no provider is registered', async () => {
    const hook = installTestHook(host('?test=1'))!;
    await expect(hook.goTo('verafin')).rejects.toThrow('not available yet: goTo');
    expect(() => hook.screenPos('verafin')).toThrow('not available yet: screenPos');
    expect(() => hook.stats()).toThrow('not available yet: stats');
  });

  it('delegates to registered providers until they unregister', async () => {
    const hook = installTestHook(host('?test=1'))!;
    const visited: string[] = [];
    const offNav = registerNavProvider({
      goTo: async (id) => {
        visited.push(id);
      },
      screenPos: () => ({ x: 10, y: 20 }),
    });
    const stats = { frames: 3 } as MuseumStats;
    const offStats = registerStatsProvider(() => stats);

    await hook.goTo('klarup', { instant: true });
    expect(visited).toEqual(['klarup']);
    expect(hook.screenPos('klarup')).toEqual({ x: 10, y: 20 });
    expect(hook.stats()).toBe(stats);

    offNav();
    offStats();
    expect(() => hook.stats()).toThrow('not available yet: stats');
    await expect(hook.goTo('lobby')).rejects.toThrow('not available yet: goTo');
  });
});
