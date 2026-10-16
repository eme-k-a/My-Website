// WebGL context loss and the back/forward cache (ARCHITECTURE §10.1 to §10.3, EXPERIENCE §8.2
// item 5). ContextLossHandler sits inside <Canvas> and listens on its canvas:
// - `webglcontextlost`: preventDefault, `contextLost: true` (R6's veil "Restoring the gallery"
//   shows), count the loss for the session;
// - `webglcontextrestored`: never trust three's in-place restore (CanvasTextures and troika glyph
//   atlases can come back blank): `canvasGeneration + 1` remounts <Canvas> with a new key, and
//   `ready` starts over for the new canvas;
// - the second loss of the session, or a loss not restored within 5 s of visible time, falls back
//   to classic: on `/` `location.replace('/resume/#why-context-loss')`, on an exhibit page
//   `data-mode="classic"` so the prerendered `#story-static` shows (the 5 s only run while the tab
//   is visible: iOS drops contexts in background tabs and restores them on return);
// - `pageshow` with `persisted` (back/forward cache): remount if the context did not survive,
//   re-read scrollY into progress.target, and render a frame.
// Pausing the exhibit clock on `visibilitychange` is the kit runtime's job (useExhibitRuntime sets
// `runtime.motion` false while hidden) together with FrameDriver, which stops rendering.
// No `unload` or `beforeunload` listeners: pages stay eligible for the back/forward cache.
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { useMuseum } from '../../app/store';
import { syncTarget } from '../rail/scrollRuntime';
import { afterLoss, fallbackFor, RESTORE_TIMEOUT_MS } from './lossRules';

/** Session state: survives the remount (the handler of the new canvas continues the count). */
const session = {
  losses: 0,
  /** A loss is waiting for its restore. */
  waiting: false,
  /** Visible milliseconds left before the fallback. */
  remainingMs: RESTORE_TIMEOUT_MS,
  timer: 0,
  startedAt: 0,
  fellBack: false,
};

function fallBack(): void {
  if (session.fellBack) return;
  session.fellBack = true;
  session.waiting = false;
  window.clearTimeout(session.timer);
  const target = fallbackFor(window.location.pathname);
  if (target.kind === 'replace') {
    window.location.replace(target.url);
    return;
  }
  // Exhibit page: the static story shows, #app (and the canvas in it) is hidden by CSS.
  document.documentElement.dataset.mode = 'classic';
  useMuseum.setState({ mode: 'classic', contextLost: false });
}

/** Runs the restore deadline only while the tab is visible. */
function armDeadline(): void {
  window.clearTimeout(session.timer);
  if (!session.waiting || session.fellBack || document.visibilityState === 'hidden') return;
  session.startedAt = performance.now();
  session.timer = window.setTimeout(fallBack, session.remainingMs);
}

function pauseDeadline(): void {
  if (!session.waiting || session.timer === 0) return;
  window.clearTimeout(session.timer);
  session.timer = 0;
  session.remainingMs = Math.max(0, session.remainingMs - (performance.now() - session.startedAt));
}

/** Remount <Canvas> with a new key; the new canvas signals `ready` again. */
function remount(): void {
  session.waiting = false;
  window.clearTimeout(session.timer);
  session.timer = 0;
  useMuseum.setState((s) => ({
    canvasGeneration: s.canvasGeneration + 1,
    contextLost: false,
    ready: false,
    settled: false,
  }));
}

export function ContextLossHandler(): null {
  const get = useThree((s) => s.get);

  useEffect(() => {
    // One handler per canvas: a new canvas (a new root) mounts a new handler.
    const { gl, invalidate } = get();
    const canvas = gl.domElement;
    let active = true;
    // The generation this canvas belongs to, readable by tests and the debug panel.
    canvas.dataset.generation = String(useMuseum.getState().canvasGeneration);

    const onLost = (event: Event) => {
      event.preventDefault();
      if (!active || session.fellBack) return;
      const { losses, fallback } = afterLoss(session.losses);
      session.losses = losses;
      useMuseum.setState({ contextLost: true });
      if (fallback) {
        fallBack();
        return;
      }
      session.waiting = true;
      session.remainingMs = RESTORE_TIMEOUT_MS;
      armDeadline();
    };

    const onRestored = () => {
      if (!active || session.fellBack) return;
      active = false; // this canvas is about to be replaced
      remount();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') pauseDeadline();
      else armDeadline();
    };

    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted || !active || session.fellBack) return;
      if (gl.getContext().isContextLost()) {
        active = false;
        remount();
        return;
      }
      syncTarget();
      invalidate();
    };

    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      active = false;
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [get]);

  return null;
}
