// Keys (ARCHITECTURE §5.7, EXPERIENCE §10.2, PLAN Addendum "Keyboard stepping"). One `keydown`
// listener on window:
// - Enter, with focus on the body or the track: at an exhibit stop open its story; at a door stop
//   (on the main track) step inside the wing.
// - Esc, with no dialog open, inside a wing: leave the wing.
// - ArrowUp, ArrowDown, PageUp, PageDown, Space, Home and End: `scrollIntoView` on the neighbouring
//   section (R0 ruling), so one press is one stop under proximity snapping too. Ignored while focus
//   is in a form field or the dialog is open, with Ctrl, Alt or Meta held, and inside a section
//   taller than the viewport until its end is in view (those presses stay native, so its content
//   can be read). The scroll itself stays the browser's.
// Plus one passive `keydown` listener that records `inputSource: 'keyboard'` and the time of the
// press (`lastKeyAt`, read by announce.ts: a move started within 1 s of a key press is a keyboard
// move, EXPERIENCE §10.3). A stepping key also records when it started its scroll (`lastStepAt`):
// that scroll is a keyboard move however late the browser starts it.
import { useMuseum } from '../../app/store';
import { EXHIBIT_IDS, WING_IDS, type ExhibitId, type StopId, type WingId } from '../../content/ids';
import { openStory } from '../../overlay/story';
import { enterWing, exitWing } from './navigation';
import { progress } from './progress';
import { measure, measured, sectionOf } from './scrollRuntime';

export type StepKey = 'down' | 'up' | 'first' | 'last';

export interface StepInput {
  /** The current scroll position. */
  y: number;
  stopY: readonly number[];
  holdY: readonly number[];
  /** The stop an unfinished key step is heading to, if any. */
  pending: number | null;
}

/** Tolerance in CSS px for "at a stop" (fractional scroll positions, rounding). */
const AT = 2;

/** The index of the stop whose section holds the top of the viewport. */
export function sectionIndexAt(y: number, stopY: readonly number[]): number {
  let index = 0;
  for (let i = 1; i < stopY.length; i++) if (stopY[i]! <= y + AT) index = i;
  return index;
}

/**
 * The stop a stepping key goes to, or null to leave the key native (no stops, or still inside the
 * overflow of a section taller than the viewport). A pending step counts as already reached, so
 * pressing twice before the first scroll ends moves two stops.
 */
export function stepTarget(key: StepKey, input: StepInput): number | null {
  const { y, stopY, holdY, pending } = input;
  const last = stopY.length - 1;
  if (last < 0) return null;
  if (key === 'first') return 0;
  if (key === 'last') return last;
  if (pending !== null) {
    return key === 'down' ? Math.min(last, pending + 1) : Math.max(0, pending - 1);
  }
  const at = sectionIndexAt(y, stopY);
  const top = stopY[at]!;
  const holdEnd = Math.max(top, holdY[at] ?? top);
  if (key === 'down') {
    if (at < last && y < holdEnd - AT) return null;
    return Math.min(last, at + 1);
  }
  if (y > top + AT && y < holdEnd - AT) return null;
  return y > top + AT ? at : Math.max(0, at - 1);
}

const STEP_KEYS: Record<string, StepKey> = {
  ArrowDown: 'down',
  PageDown: 'down',
  ArrowUp: 'up',
  PageUp: 'up',
  Home: 'first',
  End: 'last',
};

/** Form fields keep their own keys (arrows, Space, PageUp and so on). */
function inFormField(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return el.matches('input, textarea, select, [role="textbox"], [role="listbox"], [role="slider"]');
}

/** Space activates buttons, links and other controls: only step on Space from plain content. */
function isControl(el: Element | null): boolean {
  if (!el) return false;
  return el.matches('a[href], button, summary, label, [role="button"], [role="link"], [tabindex]');
}

const dialogOpen = () =>
  useMuseum.getState().openId !== null || document.querySelector('dialog[open]') !== null;

/** Focus on the body or the track itself (not a link, button, field or the dialog). */
function focusOnTrack(): boolean {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return true;
  return el.id === 'track' || el.matches('section[data-stop]');
}

const isExhibit = (id: StopId): id is ExhibitId => (EXHIBIT_IDS as readonly string[]).includes(id);
const doorWing = (id: StopId): WingId | undefined => WING_IDS.find((wing) => id === `${wing}-door`);

/** The stop the visitor is at: the nearest stop to the scroll target on the active track. */
function currentStop(): StopId | undefined {
  const ids = measured.ids.length > 0 ? measured.ids : measure().ids;
  return ids[Math.max(0, Math.min(ids.length - 1, Math.round(progress.target)))];
}

let pending: { index: number; at: number } | null = null;
let stepAt = Number.NEGATIVE_INFINITY;

/** performance.now() of the last stepping key that started a scroll, or -Infinity. */
export const lastStepAt = (): number => stepAt;
/** A key step still heading to its stop after this long is forgotten. */
const PENDING_MS = 1200;

function pendingIndex(now: number): number | null {
  if (!pending) return null;
  const y = measured.stopY[pending.index];
  if (now - pending.at > PENDING_MS || y === undefined || Math.abs(window.scrollY - y) <= AT) {
    pending = null;
    return null;
  }
  return pending.index;
}

function onEnter(event: KeyboardEvent): void {
  if (!focusOnTrack() || dialogOpen()) return;
  const id = currentStop();
  if (!id) return;
  if (isExhibit(id)) {
    event.preventDefault();
    openStory(id, { source: 'enter' });
    return;
  }
  const wing = doorWing(id);
  if (wing && useMuseum.getState().track === 'main') {
    event.preventDefault();
    void enterWing(wing).catch(() => {});
  }
}

function onStep(event: KeyboardEvent, key: StepKey): void {
  if (dialogOpen() || inFormField(document.activeElement)) return;
  if (event.key === ' ' && isControl(document.activeElement)) return;
  const m = measure();
  const now = performance.now();
  const target = stepTarget(key, {
    y: window.scrollY,
    stopY: m.stopY,
    holdY: m.holdY,
    pending: pendingIndex(now),
  });
  if (target === null) return;
  const id = m.ids[target];
  const section = id ? sectionOf(id) : null;
  if (!section) return;
  event.preventDefault();
  pending = { index: target, at: now };
  stepAt = now;
  const behavior = useMuseum.getState().reducedMotion ? 'instant' : 'smooth';
  section.scrollIntoView({ behavior, block: 'start' });
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.isComposing) return;
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  if (event.key === 'Enter') {
    if (!event.shiftKey) onEnter(event);
    return;
  }
  if (event.key === 'Escape') {
    if (!dialogOpen() && useMuseum.getState().track !== 'main') void exitWing().catch(() => {});
    return;
  }
  if (event.key === ' ') {
    onStep(event, event.shiftKey ? 'up' : 'down');
    return;
  }
  const key = STEP_KEYS[event.key];
  if (key && !event.shiftKey) onStep(event, key);
}

let keyAt = Number.NEGATIVE_INFINITY;

/** performance.now() of the last key press, or -Infinity before any. */
export const lastKeyAt = (): number => keyAt;

function onAnyKey(): void {
  keyAt = performance.now();
  if (useMuseum.getState().inputSource !== 'keyboard')
    useMuseum.setState({ inputSource: 'keyboard' });
}

/** Installs both keydown listeners; returns the uninstall function. */
export function installKeys(): () => void {
  window.addEventListener('keydown', onAnyKey, { passive: true });
  window.addEventListener('keydown', onKeyDown);
  return () => {
    window.removeEventListener('keydown', onAnyKey);
    window.removeEventListener('keydown', onKeyDown);
    pending = null;
  };
}
