// Real since WP-02: the definition of `ready` is part of the test contract (ARCHITECTURE §13.4).
// Mounted inside the outer Suspense next to <Scene>, so it only runs once every Suspense boundary of
// the scene has resolved. When no troika text is syncing and no exhibit is compiling, it waits for
// two more rendered frames and then sets `ready: true`, once.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { useMuseum } from '../../app/store';

/** Frames that must render after the scene is complete before `ready` turns true. */
export const READY_FRAMES = 2;

export function ReadySignal() {
  const ready = useMuseum((s) => s.ready);
  const textPending = useMuseum((s) => s.textPending);
  const compilePending = useMuseum((s) => s.compilePending);
  const invalidate = useThree((s) => s.invalidate);
  // Frame callbacks seen since the scene became complete; null while not counting.
  const seen = useRef<number | null>(null);

  useEffect(() => {
    if (ready || textPending !== 0 || compilePending !== 0) {
      seen.current = null;
      return;
    }
    seen.current = 0;
    invalidate();
    return () => {
      seen.current = null;
    };
  }, [ready, textPending, compilePending, invalidate]);

  useFrame(() => {
    if (seen.current === null) return;
    // Frame callbacks run before each render, so at callback READY_FRAMES + 1 that many have rendered.
    seen.current += 1;
    if (seen.current <= READY_FRAMES) {
      invalidate();
      return;
    }
    seen.current = null;
    if (!useMuseum.getState().ready) useMuseum.setState({ ready: true });
  });

  return null;
}
