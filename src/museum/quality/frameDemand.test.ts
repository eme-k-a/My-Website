// ARCHITECTURE §8.5, EXPERIENCE §6.7: the demand frame loop's decisions.
import { describe, expect, it, vi } from 'vitest';
import {
  cameraMoving,
  frameDemand,
  frameState,
  idleFrameDue,
  idleMotionActive,
  motionAllowed,
  publishFrameState,
  subscribeFrameState,
  type FrameDemandInput,
} from './frameDemand';

const IDLE_STOP = 15_000;

const settledIdle = (patch: Partial<FrameDemandInput> = {}): FrameDemandInput => ({
  hidden: false,
  sheetOpen: false,
  ready: true,
  contextLost: false,
  moving: false,
  motionAllowed: true,
  sinceInputMs: 1_000,
  idleStopMs: IDLE_STOP,
  ...patch,
});

describe('frameDemand', () => {
  it('renders every frame while the camera moves', () => {
    expect(frameDemand(settledIdle({ moving: true }))).toBe('full');
    expect(frameDemand(settledIdle({ moving: true, motionAllowed: false }))).toBe('full');
  });

  it('runs idle motion until idleStopMs after the last input, then stops', () => {
    expect(frameDemand(settledIdle({ sinceInputMs: 0 }))).toBe('idle');
    expect(frameDemand(settledIdle({ sinceInputMs: IDLE_STOP - 1 }))).toBe('idle');
    expect(frameDemand(settledIdle({ sinceInputMs: IDLE_STOP }))).toBe('stopped');
    expect(frameDemand(settledIdle({ sinceInputMs: 60_000 }))).toBe('stopped');
  });

  it('renders nothing for a settled scene when idle motion is off', () => {
    expect(frameDemand(settledIdle({ motionAllowed: false, sinceInputMs: 0 }))).toBe('stopped');
  });

  it('pauses while hidden, under the phone sheet or with a lost context, even mid-move', () => {
    expect(frameDemand(settledIdle({ hidden: true, moving: true }))).toBe('paused');
    expect(frameDemand(settledIdle({ sheetOpen: true, moving: true }))).toBe('paused');
    expect(frameDemand(settledIdle({ contextLost: true }))).toBe('paused');
  });

  it('lets a gallery that is still loading finish behind a sheet opened at hydration', () => {
    expect(frameDemand(settledIdle({ sheetOpen: true, ready: false, moving: true }))).toBe('full');
    expect(frameDemand(settledIdle({ hidden: true, ready: false, moving: true }))).toBe('paused');
  });
});

describe('motion rules', () => {
  it('idle motion is off under reduced motion, ?test=1 without &idle=1, and tier low', () => {
    const base = { reducedMotion: false, test: false, idleParam: false, tier: 'medium' } as const;
    expect(motionAllowed(base)).toBe(true);
    expect(motionAllowed({ ...base, reducedMotion: true })).toBe(false);
    expect(motionAllowed({ ...base, test: true })).toBe(false);
    expect(motionAllowed({ ...base, test: true, idleParam: true })).toBe(true);
    expect(motionAllowed({ ...base, tier: 'low' })).toBe(false);
    expect(motionAllowed({ ...base, tier: 'high' })).toBe(true);
  });

  it('motionActive needs a visible tab, allowed motion and a recent input', () => {
    const input = { hidden: false, motionAllowed: true, sinceInputMs: 100, idleStopMs: IDLE_STOP };
    expect(idleMotionActive(input)).toBe(true);
    expect(idleMotionActive({ ...input, hidden: true })).toBe(false);
    expect(idleMotionActive({ ...input, motionAllowed: false })).toBe(false);
    expect(idleMotionActive({ ...input, sinceInputMs: IDLE_STOP })).toBe(false);
  });

  it('the camera moves while progress is more than 0.0005 from its target or a glide runs', () => {
    expect(cameraMoving(1, 1, false)).toBe(false);
    expect(cameraMoving(1.0004, 1, false)).toBe(false);
    expect(cameraMoving(1.001, 1, false)).toBe(true);
    expect(cameraMoving(1, 1, true)).toBe(true);
  });
});

describe('idleFrameDue', () => {
  it('is due on every frame on fine pointers', () => {
    expect(idleFrameDue(100, 99, false)).toBe(true);
  });

  /** Frames of a display at `hz` over one second; returns how many idle frames were due. */
  const idleFramesPerSecond = (hz: number) => {
    let last = -Infinity;
    let due = 0;
    for (let i = 0; i < hz; i++) {
      const now = (i * 1000) / hz;
      if (idleFrameDue(now, last, true)) {
        last = now;
        due++;
      }
    }
    return due;
  };

  it('paces coarse-pointer idle motion at 30 fps on 60, 90 and 120 Hz displays', () => {
    expect(idleFramesPerSecond(60)).toBe(30);
    expect(idleFramesPerSecond(90)).toBe(30);
    expect(idleFramesPerSecond(120)).toBe(30);
    // Low Power Mode caps rendering at 30 Hz: every frame is due.
    expect(idleFramesPerSecond(30)).toBe(30);
  });
});

describe('published frame state', () => {
  it('notifies on real changes and starts a new run when the demand changes', () => {
    const listener = vi.fn();
    const off = subscribeFrameState(listener);
    publishFrameState('full', true);
    const first = frameState();
    publishFrameState('full', true);
    expect(frameState()).toBe(first);
    publishFrameState('full', false);
    expect(frameState().run).toBe(first.run);
    publishFrameState('idle', true);
    expect(frameState()).toMatchObject({ demand: 'idle', run: first.run + 1, motionActive: true });
    off();
    publishFrameState('stopped', false);
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
