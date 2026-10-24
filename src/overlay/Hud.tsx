// The HUD header (EXPERIENCE §7.8, §9.2, §10.1): skip link, "Commit History" wordmark, "Resume
// (PDF)" (primary) and "Classic view" (secondary). Phones show "PDF" and "Classic" and, in museum
// mode, the 3 px progress bar and the year chip at the camera's position (display only); in a
// wing the rail's "Return to the aisle" takes the chip's place (EXPERIENCE §9.2). The
// desktop progress rail is ProgressRail, after the track in DOM order (EXPERIENCE §10.2).
import { useEffect, useRef } from 'react';
import { useMuseum } from '../app/store';
import { TEST_IDS } from '../app/testIds';
import { content } from '../content/index';
import { progress } from '../museum/rail/progress';
import { Icon } from './icons';
import {
  chipLabel,
  CLASSIC_PATH,
  MAIN_STOPS,
  PDF_PATH,
  wingHeadShown,
  YEAR_TICKS,
  yearAt,
} from './model';
import { watchRailProgress } from './railProgress';
import { SkipLink } from './SkipLink';
import styles from './Hud.module.css';

const LAST = Math.max(1, MAIN_STOPS.length - 1);
const FIRST_YEAR = YEAR_TICKS[0]?.year ?? yearAt(0);

/**
 * Phone progress: a 3 px bar and the year chip, both written outside React per frame. The chip
 * follows the main aisle's year (inside a wing, its door's) and reads "Front desk" at the desk.
 */
function PhoneProgress() {
  const bar = useRef<HTMLSpanElement>(null);
  const year = useRef<HTMLSpanElement>(null);
  useEffect(
    () =>
      watchRailProgress((current) => {
        const p = Math.min(1, Math.max(0, current / LAST));
        bar.current?.style.setProperty('--p', String(p));
        const label = chipLabel(current, progress.track);
        if (year.current && year.current.textContent !== label) year.current.textContent = label;
      }),
    [],
  );
  return (
    <span className={styles.phoneProgress} aria-hidden="true">
      <span className={styles.bar} ref={bar} />
      <span className={styles.year} ref={year}>
        {FIRST_YEAR}
      </span>
    </span>
  );
}

export function Hud() {
  // In a wing the rail's wing head ("Return to the aisle") takes the year chip's place on phones.
  const wing = useMuseum((s) => wingHeadShown(s.track, s.stop));
  return (
    <header
      className={styles.hud}
      data-testid={TEST_IDS.hud}
      data-wing-head={wing ? '' : undefined}
    >
      <SkipLink />
      <p className={styles.wordmark}>{content.gallery.title}</p>
      <PhoneProgress />
      <div className={styles.actions}>
        <a className={styles.primary} href={PDF_PATH} data-testid={TEST_IDS.hudPdf}>
          <Icon name="file-text" />
          <span className={styles.long}>Resume (PDF)</span>
          <span className={styles.short}>PDF</span>
        </a>
        <a className={styles.secondary} href={CLASSIC_PATH} data-testid={TEST_IDS.hudClassic}>
          <Icon name="list" />
          <span className={styles.long}>Classic view</span>
          <span className={styles.short}>Classic</span>
        </a>
      </div>
    </header>
  );
}
