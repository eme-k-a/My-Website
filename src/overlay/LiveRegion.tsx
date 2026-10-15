// The one polite live region (EXPERIENCE §10.3). Empty for now: WP-15's announcer writes one message
// per keyboard or HUD arrival and on wing entry and exit, never for wheel, trackpad or touch.
import { TEST_IDS } from '../app/testIds';
import styles from './overlay.module.css';

export function LiveRegion() {
  return (
    <div className={styles.visuallyHidden} aria-live="polite" data-testid={TEST_IDS.liveRegion} />
  );
}
