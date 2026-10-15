// Feeds buildRuntime from the store and the page (EXPERIENCE §5.1): idle after
// tokens.motion.idleStopMs without input, hidden while the tab is hidden.
import { useEffect, useMemo, useState } from 'react';
import { useMuseum } from '../../../app/store';
import { testParams } from '../../../app/testHooks';
import type { ExhibitId } from '../../../content/ids';
import { tokens } from '../../../design/tokens';
import { buildRuntime } from './runtime';
import type { ExhibitRuntime } from './types';

/**
 * True once no input has arrived for `idleStopMs`. Clock-agnostic: any change of the store's
 * `lastInputAt` counts as input now, and mounting counts as input (the visitor just arrived).
 */
export function useIdle(idleStopMs: number = tokens.motion.idleStopMs): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), idleStopMs);
    const unsubscribe = useMuseum.subscribe((state, previous) => {
      if (state.lastInputAt === previous.lastInputAt) return;
      window.clearTimeout(timer);
      setIdle(false);
      timer = window.setTimeout(() => setIdle(true), idleStopMs);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [idleStopMs]);
  return idle;
}

/** True while `document.visibilityState` is 'hidden'. */
export function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden');
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return hidden;
}

export function useExhibitRuntime(id: ExhibitId): ExhibitRuntime {
  const tier = useMuseum((s) => s.tier);
  const reducedMotion = useMuseum((s) => s.reducedMotion);
  const active = useMuseum((s) => s.settled && s.stop === id);
  const hovered = useMuseum((s) => s.hovered === id);
  const open = useMuseum((s) => s.openId === id);
  const idle = useIdle();
  const hidden = usePageHidden();
  const [params] = useState(() => testParams(window.location.search));
  return useMemo(
    () =>
      buildRuntime({
        tier,
        reducedMotion,
        test: params.test,
        idleParam: params.idle,
        idle,
        hidden,
        active,
        hovered,
        open,
      }),
    [tier, reducedMotion, params, idle, hidden, active, hovered, open],
  );
}
