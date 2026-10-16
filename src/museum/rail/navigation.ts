// Travel between stops and tracks (ARCHITECTURE §5.6, §6.7; EXPERIENCE §3.4). Pure DOM and store
// code (no three.js), shared by the cards, the HUD, the keys, the popstate handler and the test
// hook's goTo, so tests exercise the same path as the UI.
// - Stop arrivals never write history. Only entering and leaving a wing do, through the frozen
//   transitions of routes.ts.
// - Entering a wing: save `mainScrollY`, push `{ inApp: true, track: wing, mainScrollY }`, swap
//   the track (ScrollTrack shows the wing's sections), scroll instantly to the first item while
//   CameraRig glides from the door through T to it (1.4 s, easeInOutCubic).
// - Leaving: `history.back()` when the app entered the wing (the rest runs on popstate), else
//   `replaceState` with the main track. CameraRig glides back to the door (1.2 s), then the main
//   track returns, a layout effect restores `mainScrollY` and focus moves to "Step inside".
// - Glides are skipped with `instant`, under reduced motion (WP-15 adds the fade-cut) and while no
//   CameraRig is mounted, so the DOM side never waits on the canvas.
import { applyHistoryOp, deriveUi, readHere, transitions } from '../../app/routes';
import { useMuseum } from '../../app/store';
import { TEST_IDS } from '../../app/testIds';
import { doorId, type StopId, type TrackId, type WingId } from '../../content/ids';
import { content } from '../../content/index';
import { trackOf } from '../../content/selectors';
import { tokens } from '../../design/tokens';
import { finishGlide, progress, rig, wake } from './progress';
import { measure, sectionOf, stopScrollY, syncTarget, trackStops } from './scrollRuntime';

export interface TravelOptions {
  instant?: boolean;
}

const reduced = () => useMuseum.getState().reducedMotion;
const behaviorFor = (instant: boolean | undefined): ScrollBehavior =>
  instant || reduced() ? 'instant' : 'smooth';

/** Plays a scripted glide on the active track; resolves at once when there is nothing to play. */
function glide(from: number, to: number, seconds: number, instant: boolean): Promise<void> {
  finishGlide();
  if (instant || reduced() || !rig.attached || from === to) return Promise.resolve();
  const ms = seconds * 1000;
  return new Promise((resolve) => {
    let timer = 0;
    const done = () => {
      window.clearTimeout(timer);
      resolve();
    };
    rig.glide = { from, to, ms, start: null, done };
    // A hidden tab renders no frames: the DOM side still finishes shortly after the glide's end.
    timer = window.setTimeout(() => {
      if (rig.glide?.done === done) finishGlide();
    }, ms + 400);
    useMuseum.setState({ settled: false });
    wake();
  });
}

// ---------------------------------------------------------------------------------------------
// Track swaps: the store changes `track`, ScrollTrack re-renders, and its layout effect calls
// `applyTrackSwap`, which measures the new sections and places the scroll before paint.

type SwapScroll = { kind: 'first' } | { kind: 'top'; y: number } | { kind: 'keep' };

interface Swap {
  track: TrackId;
  scroll: SwapScroll;
  focus?: WingId;
  done: () => void;
}

let pendingSwap: Swap | null = null;

/** Called by ScrollTrack in a layout effect after every render with a new `track`. */
export function applyTrackSwap(): void {
  const swap = pendingSwap;
  const m = measure();
  if (!swap || swap.track !== m.track) {
    syncTarget();
    return;
  }
  pendingSwap = null;
  if (swap.scroll.kind === 'first') window.scrollTo({ top: stopScrollY(1), behavior: 'instant' });
  else if (swap.scroll.kind === 'top') window.scrollTo({ top: swap.scroll.y, behavior: 'instant' });
  // The scroll event comes later; the rig must start from the new track's position now.
  syncTarget(rig.glide === null);
  if (swap.focus) {
    document
      .querySelector<HTMLElement>(`[data-testid="${TEST_IDS.enterWing(swap.focus)}"]`)
      ?.focus({ preventScroll: true });
  }
  swap.done();
}

/** Sets the active track and waits until ScrollTrack has applied it (or a short fallback). */
function swapTrack(track: TrackId, scroll: SwapScroll, focus?: WingId): Promise<void> {
  return new Promise((resolve) => {
    let timer = 0;
    const swap: Swap = {
      track,
      scroll,
      focus,
      done: () => {
        window.clearTimeout(timer);
        resolve();
      },
    };
    pendingSwap = swap;
    progress.track = track;
    useMuseum.setState({ track });
    // ScrollTrack applies the swap in its layout effect; this covers a render that never comes.
    timer = window.setTimeout(() => {
      if (pendingSwap === swap) applyTrackSwap();
    }, 250);
  });
}

// ---------------------------------------------------------------------------------------------
// Wings

interface WingOptions extends TravelOptions {
  /** false when history already holds the wing entry (popstate, reload): enter without pushing. */
  push?: boolean;
  /** Keep the current scroll position instead of jumping to the first item (reload in a wing). */
  keepScroll?: boolean;
}

let entering: Promise<void> | null = null;
let exiting: Promise<void> | null = null;
let exitInstant = false;
let exitWaiters: (() => void)[] = [];

/** Enter `wing` ("Step inside", Enter at its door, Forward, a reload inside it, or travel). */
export function enterWing(wing: WingId, opts: WingOptions = {}): Promise<void> {
  const { push = true, instant = false, keepScroll = false } = opts;
  if (entering) return entering;
  const run = async () => {
    if (exiting) await exiting;
    const state = useMuseum.getState();
    if (state.track === wing) return;
    if (state.track !== 'main') await exitWing({ instant: true });
    const fromHistory = (window.history.state as { mainScrollY?: unknown } | null)?.mainScrollY;
    const mainScrollY = push
      ? window.scrollY
      : typeof fromHistory === 'number'
        ? fromHistory
        : useMuseum.getState().mainScrollY;
    if (push) {
      // The main entry restores nothing when the visitor comes back to it: the exit applies
      // `mainScrollY` itself after the main sections return, and the browser's own restoration
      // (which lands a frame after popstate) would overwrite a scroll made in between, for
      // example the next wing's first item. The wing entry keeps 'auto' (a reload stays put);
      // finishExit sets the main entry back to 'auto'.
      window.history.scrollRestoration = 'manual';
      applyHistoryOp(transitions.enterWing(readHere(), wing, mainScrollY));
      window.history.scrollRestoration = 'auto';
    }
    useMuseum.setState({ mainScrollY, settled: false });
    // The door is index 0 of the wing rail with the same pose as on the main rail: no jump.
    progress.track = wing;
    progress.current = 0;
    progress.target = 0;
    rig.teleport = true;
    // Registered before the swap, so the swap's scroll does not teleport the camera past it.
    const gliding = glide(0, 1, tokens.motion.wingEnterS, instant || keepScroll);
    await swapTrack(wing, keepScroll ? { kind: 'keep' } : { kind: 'first' });
    await gliding;
    syncTarget(instant || keepScroll);
  };
  entering = run().finally(() => {
    entering = null;
  });
  return entering;
}

/** The second half of a wing exit: glide to the door, then swap to the main track. */
function finishExit(wing: WingId, instant: boolean): Promise<void> {
  const run = async () => {
    await glide(progress.current, 0, tokens.motion.wingExitS, instant);
    const door = trackStops('main').indexOf(doorId(wing));
    progress.current = Math.max(0, door);
    progress.target = progress.current;
    rig.teleport = true;
    await swapTrack(
      'main',
      { kind: 'top', y: useMuseum.getState().mainScrollY },
      useMuseum.getState().openId === null ? wing : undefined,
    );
    // Back on the main entry: a reload lands on the same stop again (ARCHITECTURE §5.6).
    window.history.scrollRestoration = 'auto';
  };
  exiting = run().finally(() => {
    exiting = null;
    const waiters = exitWaiters;
    exitWaiters = [];
    waiters.forEach((resolve) => resolve());
  });
  return exiting;
}

/** Leave the active wing (Esc, "Return to the aisle", travel). Resolves on the main track. */
export function exitWing(opts: TravelOptions = {}): Promise<void> {
  const track = useMuseum.getState().track;
  if (exiting) return exiting;
  if (track === 'main') return Promise.resolve();
  const op = transitions.exitWing(readHere(), track);
  if (op.type !== 'back') {
    applyHistoryOp(op);
    return finishExit(track, !!opts.instant);
  }
  // The popstate handler finishes the exit; this resolves when it has.
  exitInstant = !!opts.instant;
  return new Promise((resolve) => {
    exitWaiters.push(resolve);
    applyHistoryOp(op);
  });
}

/** Browser Back and Forward: re-derive the dialog and the track from the URL and the entry. */
function onPopState(): void {
  const ui = deriveUi(window.location.pathname, window.history.state);
  const state = useMuseum.getState();
  if (ui.openId !== state.openId) useMuseum.setState({ openId: ui.openId });
  if (ui.track === state.track) {
    // Nothing to swap: release an exitWing() that went back to an entry on the same track.
    exitInstant = false;
    const waiters = exitWaiters;
    exitWaiters = [];
    waiters.forEach((resolve) => resolve());
    return;
  }
  const instant = exitInstant;
  exitInstant = false;
  const after = () => {
    if (ui.track !== 'main') return enterWing(ui.track, { push: false, instant });
  };
  if (state.track !== 'main') void finishExit(state.track, instant).then(after);
  else void after();
}

// ---------------------------------------------------------------------------------------------
// Travel

/** The track a stop is reached on from `current`: the current track when the stop is on it. */
function trackFor(id: StopId, current: TrackId): TrackId {
  return trackStops(current).includes(id) ? current : trackOf(content, id);
}

/**
 * Travel to stop `id`: on the same track, scroll to its section (`instant` or under reduced
 * motion without animation); on another track, leave or enter the wing first.
 */
export async function travelTo(id: StopId, opts: TravelOptions = {}): Promise<void> {
  if (!trackStops('main').includes(id) && !content.wings.some((w) => w.items.includes(id))) {
    throw new Error(`No stop '${id}'`);
  }
  const instant = !!opts.instant;
  if (entering) await entering;
  if (exiting) await exiting;
  const current = useMuseum.getState().track;
  const target = trackFor(id, current);
  if (target !== current) {
    if (current !== 'main') await exitWing({ instant });
    if (target !== 'main') await enterWing(target, { instant });
  }
  const m = measure();
  const index = m.ids.indexOf(id);
  if (index < 0 || !sectionOf(id)) throw new Error(`No section for stop '${id}'`);
  window.scrollTo({ top: stopScrollY(index), behavior: behaviorFor(instant) });
  syncTarget(instant);
}

// ---------------------------------------------------------------------------------------------
// Install

/**
 * Installs the popstate handler and re-enters the wing of a reloaded wing entry without pushing
 * (ARCHITECTURE §5.6). ScrollTrack calls it once after hydration; returns the uninstall function.
 */
export function installNavigation(): () => void {
  window.addEventListener('popstate', onPopState);
  const ui = deriveUi(window.location.pathname, window.history.state);
  if (ui.track !== 'main' && useMuseum.getState().track === 'main') {
    void enterWing(ui.track, { push: false, instant: true, keepScroll: true });
  }
  return () => window.removeEventListener('popstate', onPopState);
}
