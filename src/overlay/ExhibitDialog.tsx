// The story dialog (EXPERIENCE §5.9, §5.10, §9.3; ARCHITECTURE §5.6): one native <dialog> opened
// with showModal() whenever the store's `openId` is set (built-in focus trap and Esc). Desktop: a
// right-hand panel with the eyebrow and "Close" in its header and Newer, Older and "Copy link" in
// its footer. Phones in portrait: one full-height sheet with a sticky header ("Back to the aisle",
// "Copy link") and a sticky footer (Newer, Older); no drag handle, no partial heights, no swipe.
// Every way to close (button, Esc through the native `cancel`, a backdrop click, browser Back)
// ends in story.ts, which keeps history consistent; the dialog only mirrors `openId`. While the
// phone sheet is open, `html[data-sheet="open"]` tells the FrameDriver to stop rendering (WP-16).
// Only Enter and Esc are custom keys anywhere, and Esc here is the browser's own.
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from 'react';
import { exhibitPath } from '../app/routes';
import { useMuseum } from '../app/store';
import { TEST_IDS } from '../app/testIds';
import type { ExhibitId } from '../content/ids';
import { SITE_URL } from '../content/site';
import { Icon } from './icons';
import {
  closeStory,
  installStory,
  neighbourOf,
  restoreFocus,
  stepStory,
  type StoryDirection,
} from './story';
import { eyebrowText, exhibitLabel, StoryBody } from './StoryBody';
import styles from './ExhibitDialog.module.css';

const HEADING_ID = 'story-title';
/** The phone sheet (EXPERIENCE §5.9, §9.1): landscape phones get the compact panel instead. */
export const SHEET_QUERY = '(max-width: 1023px) and (orientation: portrait)';
const COPIED_MS = 2000;

/** Copies `text`; the textarea fallback lives inside the dialog, the only non-inert subtree. */
async function copyText(text: string, host: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const active = document.activeElement as HTMLElement | null;
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.setAttribute('aria-hidden', 'true');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none';
    host.appendChild(area);
    area.select();
    let ok: boolean;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    active?.focus({ preventScroll: true });
    return ok;
  }
}

function CopyLink({ id, className }: { id: ExhibitId; className: string }) {
  // "Link copied" belongs to the exhibit it was copied for; Newer or Older resets it.
  const [copiedFor, setCopiedFor] = useState<ExhibitId | null>(null);
  const copied = copiedFor === id;
  useEffect(() => {
    if (copiedFor === null) return;
    const timer = window.setTimeout(() => setCopiedFor(null), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copiedFor]);

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const host = e.currentTarget.closest('dialog') ?? document.body;
    void copyText(`${SITE_URL}${exhibitPath(id)}`, host).then((ok) => {
      if (ok) setCopiedFor(id);
    });
  };
  return (
    <button type="button" className={className} onClick={onClick}>
      <Icon name={copied ? 'check' : 'link'} />
      {copied ? 'Link copied' : 'Copy link'}
    </button>
  );
}

function StepButton({ id, direction }: { id: ExhibitId; direction: StoryDirection }) {
  const target = neighbourOf(id, direction);
  const newer = direction === 'newer';
  if (target === null) return <span className={styles.stepEmpty} aria-hidden="true" />;
  const label = exhibitLabel(target);
  return (
    <button
      type="button"
      className={`${styles.step} ${newer ? styles.stepNewer : styles.stepOlder}`}
      data-testid={newer ? TEST_IDS.dialogNewer : TEST_IDS.dialogOlder}
      aria-label={`${newer ? 'Newer' : 'Older'} exhibit: ${label}`}
      onClick={() => stepStory(direction)}
    >
      <span className={styles.stepLabel}>
        {newer && <Icon name="chevron-left" />}
        {newer ? 'Newer' : 'Older'}
        {!newer && <Icon name="chevron-right" />}
      </span>
      <span className={styles.stepTarget}>{label}</span>
    </button>
  );
}

export function ExhibitDialog() {
  const openId = useMuseum((s) => s.openId);
  const dialog = useRef<HTMLDialogElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const shown = useRef<ExhibitId | null>(null);

  // Before the rail installs its handlers: the popstate listener and the cold deep link.
  useLayoutEffect(() => installStory(), []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (openId !== null) {
      if (!el.open) el.showModal();
      if (scroller.current) scroller.current.scrollTop = 0;
      // Newer or Older at either end removes the focused button: keep focus inside the dialog.
      const active = document.activeElement;
      if (shown.current !== null && (!el.contains(active) || active === el)) {
        closeButton.current?.focus();
      }
      shown.current = openId;
      return;
    }
    if (el.open) el.close();
    const last = shown.current;
    shown.current = null;
    if (last !== null) restoreFocus(last);
  }, [openId]);

  // The rendering pause signal for the phone sheet.
  const isOpen = openId !== null;
  useEffect(() => {
    if (!isOpen) return;
    const root = document.documentElement;
    const query = window.matchMedia(SHEET_QUERY);
    const apply = () => {
      if (query.matches) root.dataset.sheet = 'open';
      else delete root.dataset.sheet;
    };
    apply();
    query.addEventListener('change', apply);
    return () => {
      query.removeEventListener('change', apply);
      delete root.dataset.sheet;
    };
  }, [isOpen]);

  // A click on the ::backdrop targets the dialog itself, outside its box.
  const onClick = (e: MouseEvent<HTMLDialogElement>) => {
    const el = dialog.current;
    if (!el || e.target !== el) return;
    const r = el.getBoundingClientRect();
    const inside =
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) closeStory();
  };

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      data-testid={TEST_IDS.dialog}
      aria-labelledby={openId ? HEADING_ID : undefined}
      onCancel={(e) => {
        e.preventDefault();
        closeStory();
      }}
      onClose={() => {
        // A cancel the browser would not let us prevent still ends in closeStory().
        if (useMuseum.getState().openId !== null) closeStory();
      }}
      onClick={onClick}
    >
      {openId && (
        <div className={styles.frame}>
          <div className={styles.header}>
            <p className={`${styles.eyebrow} ${styles.headerEyebrow}`}>{eyebrowText(openId)}</p>
            <button
              ref={closeButton}
              type="button"
              className={styles.close}
              data-testid={TEST_IDS.dialogClose}
              onClick={closeStory}
            >
              <span className={styles.panelOnly}>
                <Icon name="x" />
                Close<span className={styles.srOnly}> story</span>
              </span>
              <span className={styles.sheetOnly}>
                <Icon name="chevron-left" />
                Back to the aisle
              </span>
            </button>
            <CopyLink id={openId} className={`${styles.copy} ${styles.sheetOnlyFlex}`} />
          </div>
          {/* Focusable so keyboard users can scroll a story that has no links (axe
              scrollable-region-focusable). */}
          <div
            className={styles.scroller}
            ref={scroller}
            tabIndex={0}
            role="region"
            aria-labelledby={HEADING_ID}
          >
            <div className={styles.body}>
              <p className={`${styles.eyebrow} ${styles.bodyEyebrow}`}>{eyebrowText(openId)}</p>
              <StoryBody id={openId} headingId={HEADING_ID} />
            </div>
          </div>
          <div className={styles.footer}>
            <StepButton id={openId} direction="newer" />
            <StepButton id={openId} direction="older" />
            <CopyLink id={openId} className={`${styles.copy} ${styles.panelOnlyFlex}`} />
          </div>
        </div>
      )}
    </dialog>
  );
}
