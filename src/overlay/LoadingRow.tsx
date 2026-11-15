// "Lights coming up" (EXPERIENCE §8.2): a reserved 20 px row under the hero links, in the
// prerendered HTML so nothing shifts. It shows while the museum loads: 10% once the chunk is
// requested, 40% once it has arrived, then the share of mounted work (Suspense, compiles, troika
// texts) already done, and it hides at `ready`. Without JS, or before the gate starts, it stays an
// empty reserved row.
import { useMuseum } from '../app/store';
import { useGate } from './MuseumGate';
import styles from './Intro.module.css';

function usePercent(): number | null {
  const status = useGate((s) => s.status);
  const ready = useMuseum((s) => s.ready);
  const most = useGate((s) => s.mostPending);
  const pending = useMuseum((s) => s.compilePending + s.textPending);
  if (ready || status === 'idle' || status === 'failed') return null;
  if (status === 'loading') return 10;
  if (most === 0) return 40;
  return Math.round(40 + 55 * (1 - Math.min(pending, most) / most));
}

export function LoadingRow() {
  const percent = usePercent();
  const active = percent !== null;
  return (
    <div className={styles.loading} data-active={active ? '' : undefined}>
      {active && (
        <div
          className={styles.progress}
          role="progressbar"
          aria-label="Lights coming up"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
        >
          <span className={styles.hairline} style={{ transform: `scaleX(${percent / 100})` }} />
          <span className={styles.loadingText}>Lights coming up {percent}%</span>
        </div>
      )}
    </div>
  );
}
