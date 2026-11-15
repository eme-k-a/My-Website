// The first focusable element on the gallery pages (EXPERIENCE §8.4, §8.5): the escape hatch to the
// zero-WebGL classic resume. Hidden until it receives keyboard focus.
import { CLASSIC_PATH } from './model';
import styles from './Hud.module.css';

export function SkipLink() {
  return (
    <a className={styles.skip} href={CLASSIC_PATH}>
      Skip to classic resume
    </a>
  );
}
