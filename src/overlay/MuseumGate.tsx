// Lazy museum loading (ARCHITECTURE §5.4, EXPERIENCE §8.1, §8.2). The museum chunk is requested
// only after `load` plus an idle callback (setTimeout where requestIdleCallback is missing), or on
// the first scroll, pointerdown or keydown, whichever comes first; under ?test=1 immediately. So
// it never competes with the hero (the LCP element). A chunk that fails to load, or an error thrown
// while the museum renders, shows the fallback notice with links to /resume/ and the PDF.
// `src/museum/**` is reached only through the dynamic import below.
import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { create } from 'zustand';
import { useMuseum } from '../app/store';
import { testParams } from '../app/testHooks';
import { TEST_IDS } from '../app/testIds';
import { Icon } from './icons';
import { CLASSIC_PATH, PDF_PATH } from './model';
import styles from './MuseumGate.module.css';

export type GateStatus = 'idle' | 'loading' | 'loaded' | 'failed';

export interface GateState {
  status: GateStatus;
  /** The most mounted work (compiles plus troika texts) seen pending at once, for the percentage. */
  mostPending: number;
}

/** The gate's own state (not part of the frozen app store): drives the hero's loading row. */
export const useGate = create<GateState>()(() => ({ status: 'idle', mostPending: 0 }));

const MuseumCanvas = lazy(() =>
  import('../museum/MuseumCanvas').then((module) => {
    useGate.setState({ status: 'loaded' });
    return module;
  }),
);

const START_EVENTS = ['scroll', 'pointerdown', 'keydown'] as const;
const IDLE_TIMEOUT_MS = 2000;

/** Resolves the trigger once: load plus idle, a first interaction, or ?test=1. */
function useStartSignal(): boolean {
  const [start, setStart] = useState(false);
  useEffect(() => {
    let done = false;
    let idle = 0;
    let timer = 0;
    const cleanup = () => {
      for (const type of START_EVENTS) window.removeEventListener(type, go);
      window.removeEventListener('load', afterLoad);
      if (idle !== 0) window.cancelIdleCallback(idle);
      if (timer !== 0) window.clearTimeout(timer);
    };
    function go() {
      if (done) return;
      done = true;
      cleanup();
      setStart(true);
    }
    function afterLoad() {
      if (typeof window.requestIdleCallback === 'function') {
        idle = window.requestIdleCallback(go, { timeout: IDLE_TIMEOUT_MS });
      } else {
        timer = window.setTimeout(go, 50);
      }
    }
    if (testParams(window.location.search).test) {
      // Immediately, but after hydration has committed (the prerender rendered no museum).
      timer = window.setTimeout(go, 0);
      return cleanup;
    }
    for (const type of START_EVENTS) {
      window.addEventListener(type, go, { passive: true, once: true });
    }
    if (document.readyState === 'complete') afterLoad();
    else window.addEventListener('load', afterLoad, { once: true });
    return cleanup;
  }, []);
  return start;
}

export function FallbackNotice() {
  return (
    <aside className={styles.notice} data-testid={TEST_IDS.fallbackNotice} aria-label="Gallery">
      <p className={styles.text}>The gallery couldn't load. The resume is still here:</p>
      <p className={styles.links}>
        <a className={styles.link} href={CLASSIC_PATH}>
          <Icon name="list" />
          Classic resume
        </a>
        <a className={styles.link} href={PDF_PATH}>
          <Icon name="file-text" />
          Resume (PDF)
        </a>
      </p>
    </aside>
  );
}

interface BoundaryState {
  failed: boolean;
}

/** Catches a failed chunk load (lazy rejects) and errors thrown while the museum renders. */
class MuseumBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch() {
    useGate.setState({ status: 'failed' });
  }

  render() {
    return this.state.failed ? <FallbackNotice /> : this.props.children;
  }
}

export function MuseumGate() {
  const start = useStartSignal();
  useEffect(
    () =>
      useMuseum.subscribe((s) => {
        const pending = s.compilePending + s.textPending;
        if (pending > useGate.getState().mostPending) useGate.setState({ mostPending: pending });
      }),
    [],
  );
  useEffect(() => {
    if (start && useGate.getState().status === 'idle') useGate.setState({ status: 'loading' });
  }, [start]);
  if (!start) return null;
  return (
    <MuseumBoundary>
      <Suspense fallback={null}>
        <MuseumCanvas />
      </Suspense>
    </MuseumBoundary>
  );
}
