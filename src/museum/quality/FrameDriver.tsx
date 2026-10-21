// The demand frame loop (ARCHITECTURE §8.5, §10.3, EXPERIENCE §6.7, §9.4). The canvas always runs
// frameloop="demand"; this component decides when to call `invalidate()` (frameDemand.ts):
// - every animation frame while the camera moves or a glide runs (a compiling mount adds none:
//   F-015, frameDemand.ts);
// - while only idle motion runs: every frame on fine pointers, 30 fps on coarse pointers;
// - idle motion stops tokens.motion.idleStopMs (15 s) after the last input, so a settled, idle
//   scene renders zero frames until the next input;
// - nothing while the tab is hidden, the phone sheet covers the canvas or the context is lost.
//   The sheet counts while html[data-sheet="open"] (set by WP-14's dialog on phones) and the
//   store's `openId` agree, so a stale flag never freezes the gallery, and only once `ready`, so
//   a cold deep link still loads behind its sheet; the desktop panel leaves the canvas visible
//   and keeps rendering (the dolly). A pause switches R3F to frameloop "never", so no other
//   component's invalidate() can render under the sheet either; on return it switches back to
//   "demand" and renders one frame.
// Every other component's invalidate() (the rig's gaze, framing, dolly, parallax and fade frames,
// a reveal) renders as usual: the idle stop only ends this driver's own requests, so it never
// cuts a fade or a dolly short.
// Input is noted by passive `scroll`, `pointermove`, `pointerdown` and `keydown` listeners, which
// write the store's `lastInputAt` (at most every 100 ms); the kit derives `runtime.motion` from
// the same field, and the published frame state carries `motionActive`.
// The loop itself sleeps when nothing is due: no requestAnimationFrame runs in the stopped or
// paused states, and any input, store change, visibility change or sheet change wakes it.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useMuseum } from '../../app/store';
import { testParams } from '../../app/testHooks';
import { tokens } from '../../design/tokens';
import { progress, rig } from '../rail/progress';
import {
  cameraMoving,
  frameDemand,
  idleFrameDue,
  idleMotionActive,
  INPUT_WRITE_INTERVAL_MS,
  motionAllowed,
  publishFrameState,
  type FrameDemandInput,
} from './frameDemand';

const INPUT_EVENTS = ['scroll', 'pointermove', 'pointerdown', 'keydown'] as const;

export function FrameDriver() {
  const get = useThree((s) => s.get);
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const { invalidate, setFrameloop } = get();
    const params = testParams(window.location.search);
    const coarse = window.matchMedia('(pointer: coarse)');
    const root = document.documentElement;
    // Mounting counts as input: the visitor just arrived (the kit's useIdle does the same).
    let lastInput = performance.now();
    let lastWrite = 0;
    let lastIdleFrame = -Infinity;
    let raf = 0;
    let paused = false;
    let disposed = false;

    const read = (now: number): FrameDemandInput => {
      const s = useMuseum.getState();
      return {
        hidden: document.visibilityState === 'hidden',
        sheetOpen: root.dataset.sheet === 'open' && s.openId !== null,
        ready: s.ready,
        contextLost: s.contextLost,
        moving: cameraMoving(progress.current, progress.target, rig.glide !== null),
        motionAllowed: motionAllowed({
          reducedMotion: s.reducedMotion,
          test: params.test,
          idleParam: params.idle,
          tier: s.tier,
        }),
        sinceInputMs: now - Math.max(lastInput, s.lastInputAt),
        idleStopMs: tokens.motion.idleStopMs,
      };
    };

    const setPaused = (next: boolean) => {
      if (next === paused) return;
      paused = next;
      if (paused) {
        setFrameloop('never');
        // R3F's loop still renders the frames already requested under "never" (an invalidate()
        // inside useFrame books two), so a dolly frame could land under the sheet: drop them.
        get().internal.frames = 0;
      } else {
        setFrameloop('demand');
        invalidate();
      }
    };

    const schedule = () => {
      if (raf === 0 && !disposed) raf = requestAnimationFrame(tick);
    };

    /** Evaluates the demand; renders a frame only when called from the loop's own frame. */
    const step = (now: number, fromFrame: boolean) => {
      if (disposed) return;
      const input = read(now);
      const demand = frameDemand(input);
      publishFrameState(demand, idleMotionActive(input));
      setPaused(demand === 'paused');
      if (demand === 'paused' || demand === 'stopped') return; // the loop sleeps
      if (fromFrame) {
        if (demand === 'full') {
          invalidate();
        } else if (idleFrameDue(now, lastIdleFrame, coarse.matches)) {
          lastIdleFrame = now;
          invalidate();
        }
      }
      schedule();
    };

    function tick(now: number) {
      raf = 0;
      step(now, true);
    }

    const wake = () => step(performance.now(), false);
    wakeRef.current = wake;

    const onInput = () => {
      const now = performance.now();
      lastInput = now;
      if (now - lastWrite >= INPUT_WRITE_INTERVAL_MS) {
        lastWrite = now;
        useMuseum.setState({ lastInputAt: now });
      }
      wake();
    };

    for (const type of INPUT_EVENTS) window.addEventListener(type, onInput, { passive: true });
    document.addEventListener('visibilitychange', wake);
    const sheet = new MutationObserver(wake);
    sheet.observe(root, { attributes: true, attributeFilter: ['data-sheet'] });
    const unsubscribe = useMuseum.subscribe(wake);
    wake();

    return () => {
      disposed = true;
      wakeRef.current = () => {};
      if (raf !== 0) cancelAnimationFrame(raf);
      for (const type of INPUT_EVENTS) window.removeEventListener(type, onInput);
      document.removeEventListener('visibilitychange', wake);
      sheet.disconnect();
      unsubscribe();
      if (paused) setFrameloop('demand');
    };
  }, [get]);

  // A frame someone else asked for (a scroll, a glide, a reveal) may start motion: re-evaluate.
  useFrame(() => wakeRef.current());

  return null;
}
