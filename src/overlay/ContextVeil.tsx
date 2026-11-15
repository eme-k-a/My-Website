// The context-loss veil (EXPERIENCE §8.2 item 5, ARCHITECTURE §10.1): shown while R7's handler
// reports a lost WebGL context, until the canvas remounts.
import { useMuseum } from '../app/store';
import { TEST_IDS } from '../app/testIds';
import styles from './overlay.module.css';

export function ContextVeil() {
  const lost = useMuseum((s) => s.contextLost);
  return (
    <div className={styles.veil} role="status" data-testid={TEST_IDS.contextVeil} hidden={!lost}>
      <p className={styles.veilText}>Restoring the gallery</p>
    </div>
  );
}
