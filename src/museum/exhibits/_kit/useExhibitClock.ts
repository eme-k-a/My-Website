// The one clock an exhibit animates from (ARCHITECTURE §7.5; EXPERIENCE §4 "Deterministic").
// Seconds since the exhibit mounted, advanced by the frame delta only while `runtime.motion` is
// true, and frozen at 0 under ?test=1 unless &idle=1. Read `clock.current` inside useFrame:
//
//   const clock = useExhibitClock();
//   useFrame(() => { ring.current.rotation.y = clock.current * 0.2; });
import { useFrame } from '@react-three/fiber';
import { useContext, useRef, useState, type RefObject } from 'react';
import { advanceClock, clockFrozen } from './clock';
import { ExhibitRuntimeContext } from './runtime';

export type ExhibitClock = RefObject<number>;

export function useExhibitClock(): ExhibitClock {
  const runtime = useContext(ExhibitRuntimeContext);
  const [frozen] = useState(() =>
    typeof window === 'undefined' ? false : clockFrozen(window.location.search),
  );
  const clock = useRef(0);
  const running = !frozen && (runtime?.motion ?? true);
  useFrame((_, delta) => {
    clock.current = advanceClock(clock.current, delta, running);
  });
  return clock;
}
