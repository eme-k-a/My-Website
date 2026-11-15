// The visitor's stop for mounting and the greybox light: the stop nearest to the rail progress on
// the current track (progress.ts, written by the scroll mapping and damped by CameraRig). It moves
// while walking, before `settled`, so exhibits ahead mount in time. React state changes only when
// the nearest stop changes.
import { useFrame } from '@react-three/fiber';
import { useState } from 'react';
import type { StopId } from '../../content/ids';
import { stopAtProgress } from '../exhibits/_kit/stopDistance';
import type { Layout } from '../rail/layout';
import { progress } from '../rail/progress';

export function useVisitorStop(layout: Layout): StopId {
  const [stop, setStop] = useState<StopId>(() =>
    stopAtProgress(layout, progress.track, progress.current),
  );
  useFrame(() => {
    const next = stopAtProgress(layout, progress.track, progress.current);
    if (next !== stop) setStop(next);
  });
  return stop;
}
