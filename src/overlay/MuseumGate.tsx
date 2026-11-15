// Lazy museum loading (ARCHITECTURE §5.4, EXPERIENCE §8.1, §8.2). The museum chunk is requested
// only after the hero has painted (first contentful paint, fonts, one frame) and then `load` plus
// an idle callback (setTimeout where requestIdleCallback is missing), or on the first scroll,
// pointerdown or keydown, whichever comes first; under ?test=1 right after the hero paints. So it
// never competes with the hero (the LCP element). A chunk that fails to load, or an error thrown
// while the museum renders, shows the fallback notice with links to /resume/ and the PDF.
// `src/museum/**` is reached only through the dynamic import below. When the store's mode turns
// `classic` (the context-loss fallback on an exhibit page), the canvas unmounts, which disposes
// the renderer and every listener the museum installed (F-013); CSS alone would only hide it.
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
const FIRST_PAINT_TIMEOUT_MS = 3000;

/**
 * Calls `then` once the hero has painted: after the first contentful paint, the web fonts (they
 * repaint the hero, often the LCP entry) and one more frame, or FIRST_PAINT_TIMEOUT_MS without a
 * paint entry. Lighthouse's simulated mobile LCP charges every request that starts before the
 * observed LCP, so the museum chunk waits for it (WP-29 A6: 3.86 s before, about 2.03 s after).
 * Returns a cancel function that clears the observer, the timer and the frame.
 */
function afterFirstPaint(then: () => void): () => void {
  let cancelled = false;
  let called = false;
  let frame = 0;
  let fallback = 0;
  let observer: PerformanceObserver | undefined;
  const once = () => {
    if (called || cancelled) return;
    called = true;
    observer?.disconnect();
    window.clearTimeout(fallback);
    const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
    void fonts.then(() => {
      if (cancelled) return;
      frame = window.requestAnimationFrame(() => {
        if (!cancelled) then();
      });
    });
  };
  if (performance.getEntriesByName('first-contentful-paint').length > 0) {
    once();
  } else {
    try {
      observer = new PerformanceObserver(() => once());
      observer.observe({ type: 'paint', buffered: true });
    } catch {
      // No paint timing: the fallback timer below starts the museum.
    }
    fallback = window.setTimeout(once, FIRST_PAINT_TIMEOUT_MS);
  }
  return () => {
    cancelled = true;
    observer?.disconnect();
    window.clearTimeout(fallback);
    if (frame !== 0) window.cancelAnimationFrame(frame);
  };
}

/**
 * Resolves the trigger once: a first interaction (at once), or, after the hero has painted,
 * load plus idle (?test=1: right away).
 */
function useStartSignal(): boolean {
  const [start, setStart] = useState(false);
  useEffect(() => {
    let done = false;
    let idle = 0;
    let timer = 0;
    let cancelPaint = () => {};
    const cleanup = () => {
      for (const type of START_EVENTS) window.removeEventListener(type, go);
      window.removeEventListener('load', afterLoad);
      cancelPaint();
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
      // As soon as the hero has painted, after hydration has committed (the prerender rendered no
      // museum).
      cancelPaint = afterFirstPaint(() => {
        timer = window.setTimeout(go, 0);
      });
      return cleanup;
    }
    for (const type of START_EVENTS) {
      window.addEventListener(type, go, { passive: true, once: true });
    }
    cancelPaint = afterFirstPaint(() => {
      if (done) return;
      if (document.readyState === 'complete') afterLoad();
      else window.addEventListener('load', afterLoad, { once: true });
    });
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
  const classic = useMuseum((s) => s.mode === 'classic');
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
  if (!start || classic) return null;
  return (
    <MuseumBoundary>
      <Suspense fallback={null}>
        <MuseumCanvas />
      </Suspense>
    </MuseumBoundary>
  );
}
