import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokens } from '../../design/tokens';
import { fadeCut, fadeHalfMs, fadePhase, onFade, resetFade, type FadePhase } from './fade';

describe('fadeCut (EXPERIENCE §6.6)', () => {
  let phases: FadePhase[] = [];
  let off: () => void = () => {};

  beforeEach(() => {
    vi.useFakeTimers();
    phases = [];
    off = onFade((phase) => phases.push(phase));
  });

  afterEach(() => {
    off();
    resetFade();
    vi.useRealTimers();
  });

  it('is 100 ms to ink, the swap, then 100 ms back', async () => {
    expect(fadeHalfMs() * 2).toBe(tokens.motion.fadeCutMs);
    const swap = vi.fn();
    const done = vi.fn();
    void fadeCut(swap).then(done);
    expect(fadePhase()).toBe('out');
    vi.advanceTimersByTime(99);
    expect(swap).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(swap).toHaveBeenCalledTimes(1);
    expect(fadePhase()).toBe('in');
    vi.advanceTimersByTime(100);
    await Promise.resolve();
    expect(fadePhase()).toBe('clear');
    expect(done).toHaveBeenCalledTimes(1);
    expect(phases).toEqual(['out', 'in', 'clear']);
  });

  it('joins a cut that is still fading out: both swaps at the same ink, one fade', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const done = vi.fn();
    void fadeCut(first).then(done);
    vi.advanceTimersByTime(60);
    void fadeCut(second).then(done);
    vi.advanceTimersByTime(40);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    await Promise.resolve();
    expect(done).toHaveBeenCalledTimes(2);
    expect(phases).toEqual(['out', 'in', 'clear']);
  });

  it('starts a new fade out when asked while fading back', async () => {
    const swap = vi.fn();
    void fadeCut(swap);
    vi.advanceTimersByTime(150);
    void fadeCut(swap);
    expect(fadePhase()).toBe('out');
    vi.advanceTimersByTime(100);
    expect(swap).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(100);
    await Promise.resolve();
    expect(phases).toEqual(['out', 'in', 'out', 'in', 'clear']);
  });

  it('survives a failing swap', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    void fadeCut(() => {
      throw new Error('boom');
    });
    vi.advanceTimersByTime(200);
    expect(fadePhase()).toBe('clear');
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
