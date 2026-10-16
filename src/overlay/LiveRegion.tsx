// The one polite live region (EXPERIENCE §10.3). The rail's announcer (useAnnouncer, WP-15) writes
// one message per keyboard or HUD arrival and on wing entry and exit, never for wheel, trackpad or
// touch.
import { TEST_IDS } from '../app/testIds';
import { useAnnouncer } from '../museum/rail/announce';
import styles from './overlay.module.css';

export function LiveRegion() {
  const message = useAnnouncer();
  return (
    <div className={styles.visuallyHidden} aria-live="polite" data-testid={TEST_IDS.liveRegion}>
      {message}
    </div>
  );
}
