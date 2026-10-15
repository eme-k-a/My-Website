// ExhibitRuntime (ARCHITECTURE §7.2, EXPERIENCE §5.1): what an exhibit may know about the walk.
// `buildRuntime` is pure; ExhibitFrame feeds it from the store and passes the result both as
// `props.runtime` and through ExhibitRuntimeContext (read by useExhibitClock).
import { createContext } from 'react';
import type { ExhibitRuntime, QualityTier } from './types';

export interface RuntimeInput {
  tier: QualityTier;
  reducedMotion: boolean;
  /** ?test=1 */
  test: boolean;
  /** &idle=1 (re-enables idle motion under ?test=1) */
  idleParam: boolean;
  /** No input for tokens.motion.idleStopMs. */
  idle: boolean;
  /** document.visibilityState === 'hidden' */
  hidden: boolean;
  active: boolean;
  hovered: boolean;
  open: boolean;
}

/** `motion` is false under reduced motion, ?test=1 without &idle=1, tier low, idle-stop or a hidden tab. */
export function buildRuntime(input: RuntimeInput): ExhibitRuntime {
  const frozenByTest = input.test && !input.idleParam;
  const motion = !(
    input.reducedMotion ||
    frozenByTest ||
    input.tier === 'low' ||
    input.idle ||
    input.hidden
  );
  return {
    tier: input.tier,
    reducedMotion: input.reducedMotion,
    motion,
    active: input.active,
    hovered: input.hovered,
    open: input.open,
  };
}

/** The runtime of the exhibit being rendered; null outside an ExhibitFrame. */
export const ExhibitRuntimeContext = createContext<ExhibitRuntime | null>(null);
