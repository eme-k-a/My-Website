// Quality at runtime (ARCHITECTURE §8.4, §8.5, §15.1). The tier was fixed at boot (tiers.ts) and
// never changes here: light count, floor material and antialias stay as MuseumCanvas created
// them. Only the device pixel ratio adapts: drei's PerformanceMonitor samples steady rendering
// and each verdict moves the DPR one 0.25 step between 1 and `min(devicePixelRatio, maxDpr)`
// (dpr.ts). Under ?test=1 the monitor is off and the DPR stays at 1. No AdaptiveDpr.
//
// The monitor only samples while FrameDriver renders steadily (`full`, or `idle` motion), and
// each such run gets a fresh monitor: with frameloop="demand" a pause between frames would read
// as a very low frame rate, and coarse-pointer idle motion is paced at 30 fps on purpose, so it is
// judged against 30 fps bounds.
import { PerformanceMonitor } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useMuseum } from '../../app/store';
import { testParams } from '../../app/testHooks';
import { adaptDpr, initialDprState, monitorBounds, type DprState } from './dpr';
import { frameState, subscribeFrameState } from './frameDemand';
import { startDpr } from './tiers';

function useFrameState() {
  return useSyncExternalStore(subscribeFrameState, frameState, frameState);
}

/** The DPR control: starts at the tier's cap, then follows the monitor's verdicts. */
function DprMonitor() {
  const tier = useMuseum((s) => s.tier);
  const setDpr = useThree((s) => s.setDpr);
  const appliedDpr = useThree((s) => s.viewport.dpr);
  const [state, setState] = useState<DprState>(() =>
    initialDprState(startDpr(tier, window.devicePixelRatio, false)),
  );
  const [coarse] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const { demand, run } = useFrameState();

  // Apply the adapted DPR, and re-apply it if a re-render of <Canvas> reset it to the prop.
  useEffect(() => {
    if (appliedDpr !== state.dpr) setDpr(state.dpr);
  }, [appliedDpr, state.dpr, setDpr]);

  const onIncline = useCallback(() => setState((s) => adaptDpr(s, 'incline')), []);
  const onDecline = useCallback(() => setState((s) => adaptDpr(s, 'decline')), []);

  const bounds = state.locked ? null : monitorBounds(demand, coarse);
  if (!bounds) return null;
  return (
    <PerformanceMonitor key={run} bounds={bounds} onIncline={onIncline} onDecline={onDecline} />
  );
}

export function QualityController() {
  const [params] = useState(() => ({ test: testParams(window.location.search).test }));
  return params.test ? null : <DprMonitor />;
}
