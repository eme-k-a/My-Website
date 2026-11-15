// The reduced-motion chip (EXPERIENCE §8.4, §10.5): under prefers-reduced-motion, a one-time,
// dismissible offer of the classic view, "Prefer a quick read? Open the classic view." It shows
// in museum mode at the lobby, never in the prerender (so it can never shift the page: it is
// fixed and appears after hydration), and a dismissal is remembered in localStorage (guarded,
// since storage can be blocked). Following the link counts as an answer too.
import { useSyncExternalStore } from 'react';
import { useMuseum } from '../app/store';
import { Icon } from './icons';
import { CLASSIC_PATH } from './model';
import styles from './MotionChip.module.css';
import ui from './ui.module.css';

const KEY = 'commit-history:motion-chip';

const listeners = new Set<() => void>();
let closed: boolean | undefined;

function readClosed(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'dismissed';
  } catch {
    return false;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Read once per page; the prerender (and hydration) counts as closed, so nothing is drawn. */
const clientClosed = () => (closed ??= readClosed());
const serverClosed = () => true;

function remember(): void {
  closed = true;
  try {
    window.localStorage.setItem(KEY, 'dismissed');
  } catch {
    // Storage is blocked: the chip comes back on the next visit, which is harmless.
  }
  listeners.forEach((listener) => listener());
}

export function MotionChip() {
  const reduced = useMuseum((s) => s.reducedMotion);
  const atLobby = useMuseum((s) => s.mode === 'museum' && s.stop === 'lobby');
  const isClosed = useSyncExternalStore(subscribe, clientClosed, serverClosed);
  if (isClosed || !reduced || !atLobby) return null;
  return (
    <aside className={styles.chip} data-chip="reduced-motion" aria-label="Classic view">
      <p className={styles.text}>
        Prefer a quick read?{' '}
        <a className={styles.link} href={CLASSIC_PATH} onClick={remember}>
          Open the classic view.
        </a>
      </p>
      <button type="button" className={`${ui.secondary} ${styles.close}`} onClick={remember}>
        <Icon name="x" />
        Close
      </button>
    </aside>
  );
}
