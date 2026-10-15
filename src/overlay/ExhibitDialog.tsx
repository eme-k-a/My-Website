// The story dialog, skeleton (EXPERIENCE §5.9, ARCHITECTURE §5.6): one native <dialog> opened with
// showModal() whenever the store's `openId` is set (built-in focus trap and Esc). Esc (the native
// `cancel`, which closes it) and the close button both end in closeStory(). The full layout, Newer
// and Older, Copy link and the history wiring are WP-14. Only Enter and Esc are custom keys
// anywhere, and Esc here is the browser's own.
import { useEffect, useRef } from 'react';
import { useMuseum } from '../app/store';
import { TEST_IDS } from '../app/testIds';
import { Icon } from './icons';
import { closeStory } from './story';
import { StoryBody } from './StoryBody';
import styles from './ExhibitDialog.module.css';

const HEADING_ID = 'story-title';

export function ExhibitDialog() {
  const openId = useMuseum((s) => s.openId);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (openId !== null && !el.open) el.showModal();
    if (openId === null && el.open) el.close();
  }, [openId]);

  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      data-testid={TEST_IDS.dialog}
      aria-labelledby={openId ? HEADING_ID : undefined}
      onClose={() => {
        if (useMuseum.getState().openId !== null) closeStory();
      }}
    >
      <div className={styles.header}>
        <button
          type="button"
          className={styles.close}
          data-testid={TEST_IDS.dialogClose}
          aria-label="Close story"
          onClick={closeStory}
        >
          <Icon name="x" />
          Close
        </button>
      </div>
      {openId && <StoryBody id={openId} headingId={HEADING_ID} />}
    </dialog>
  );
}
