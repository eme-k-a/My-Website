// The lobby hero (EXPERIENCE §8.1, CONTENT_DRAFT §6.1, §6.2): the recruiter fast path. Eyebrow, the
// h1 name (the LCP element), the role and education lines from heroLines(), and three real links
// (Resume PDF, Email, Classic view), all inside the first phone viewport with or without JS. Then
// the reserved 20 px loading row, "Begin the walk" (an in-page anchor), the lobby headline as a lead
// sentence, the intro paragraph (below the fold on phones), the static hint, and the onboarding
// hint element, shown and hidden by the rail's useHint() (EXPERIENCE §8.3, WP-15). "Begin the walk"
// is the admission ticket (EXPERIENCE §11.1 item 3): a stub with a perforated edge, stamped with
// today's date after hydration (ticket.ts), that tears off on click (none under reduced motion).
import { useEffect, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { useMuseum } from '../app/store';
import { testParams } from '../app/testHooks';
import { TEST_IDS } from '../app/testIds';
import type { LobbyCard } from '../content/selectors';
import { hintStyle, useHint } from '../museum/rail/hint';
import { travelTo } from '../museum/rail/navigation';
import { Icon } from './icons';
import { LoadingRow } from './LoadingRow';
import { CLASSIC_PATH, EMAIL_HREF, FIRST_EXHIBIT, PDF_PATH } from './model';
import styles from './Intro.module.css';
import overlay from './overlay.module.css';
import { stampText, TEST_STAMP } from './ticket';
import ui from './ui.module.css';

const plainClick = (e: MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

/**
 * The name, with each hyphenated word kept whole: the h1 never breaks at the hyphen of
 * "Nduka-Nwagbo". The metric-matched serif fallback is missing on Linux and Android, and the
 * generic serif there is wide enough to break the surname at its hyphen, so the swap to
 * Instrument Serif removed a line and moved the rest of the hero (F-005, CLS). The other words
 * stay one text node, which keeps the shift record of a reflow small.
 */
function Name({ name }: { name: string }) {
  const parts = name.split(/(\S+-\S+)/).filter((part) => part !== '');
  return parts.map((part, i) =>
    part.includes('-') ? (
      <span key={i} className={styles.nowrap}>
        {part}
      </span>
    ) : (
      part
    ),
  );
}

let todayStamp: string | undefined;
const noSubscription = () => () => {};
/** Today's stamp on the client (the frozen test stamp under ?test=1); computed once. */
const clientStamp = () =>
  (todayStamp ??= testParams(window.location.search).test ? TEST_STAMP : stampText(new Date()));
/** The prerender (and so hydration) has no stamp: the area is reserved, then filled. */
const serverStamp = () => '';

/**
 * The ticket's state: the date stamp, empty in the prerender and filled right after hydration,
 * and whether the stub is torn. A torn stub comes back once the visitor has left the lobby and
 * returned to it.
 */
function useTicket() {
  const stamp = useSyncExternalStore(noSubscription, clientStamp, serverStamp);
  const [torn, setTorn] = useState(false);
  useEffect(() => {
    let left = false;
    return useMuseum.subscribe(({ stop }) => {
      if (stop !== 'lobby') left = true;
      else if (left) {
        left = false;
        setTorn(false);
      }
    });
  }, []);
  return { stamp, torn, tear: () => setTorn(true) };
}

export function Intro({ card }: { card: LobbyCard }) {
  const ready = useMuseum((s) => s.ready);
  const hint = useHint();
  const ticket = useTicket();
  const beginWalk = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!plainClick(e)) return;
    // With JS the walk starts through the rail, so no fragment is written to the URL.
    e.preventDefault();
    ticket.tear();
    useMuseum.setState({ inputSource: 'hud' });
    travelTo(FIRST_EXHIBIT).catch(() => {});
  };
  return (
    <div className={styles.lobby} data-ready={ready ? '' : undefined}>
      <div className={styles.hero} data-card="" data-testid={TEST_IDS.hero}>
        {/* The first phone viewport ends with this block (see .fold). */}
        <div className={styles.fold}>
          <p className={styles.eyebrow}>{card.eyebrow}</p>
          <h1 className={styles.name}>
            <Name name={card.name} />
          </h1>
          <p className={styles.role}>{card.roleLine}</p>
          <p className={styles.education}>{card.educationLine}</p>
          <ul className={styles.links}>
            <li>
              <a className={ui.primary} href={PDF_PATH} data-testid={TEST_IDS.heroPdf}>
                <Icon name="file-text" />
                Resume (PDF)
              </a>
            </li>
            <li>
              <a className={ui.secondary} href={EMAIL_HREF} data-testid={TEST_IDS.heroEmail}>
                <Icon name="mail" />
                Email
              </a>
            </li>
            <li>
              <a className={ui.secondary} href={CLASSIC_PATH} data-testid={TEST_IDS.heroClassic}>
                <Icon name="list" />
                Classic view
              </a>
            </li>
          </ul>
          <LoadingRow />
          <a
            className={`${ui.secondary} ${styles.begin}`}
            href={`#stop-${FIRST_EXHIBIT}`}
            data-testid={TEST_IDS.beginWalk}
            data-torn={ticket.torn ? '' : undefined}
            onClick={beginWalk}
          >
            <span className={styles.admit}>
              <Icon name="ticket" />
              Begin the walk
            </span>
            <span className={styles.stub} data-stub="" aria-hidden="true">
              <span className={styles.stamp} data-stamp="">
                {ticket.stamp}
              </span>
            </span>
          </a>
          <p className={styles.lead}>{card.headline}</p>
        </div>
        <p className={styles.intro}>{card.intro.text}</p>
        <p className={styles.hint}>{card.hint}</p>
      </div>
      <p
        className={styles.onboarding}
        data-testid={TEST_IDS.onboardingHint}
        data-variant={hint.variant}
        style={hintStyle(hint)}
      >
        {hint.variant === 'keys' ? (
          <span>Scroll, or press</span>
        ) : (
          <>
            <span className={styles.fine}>Scroll to walk through my work</span>
            <span className={styles.coarse}>Swipe up to walk</span>
          </>
        )}
        <Icon name="arrow-down" className={styles.arrow} />
        {hint.variant === 'keys' && <span className={overlay.visuallyHidden}>down arrow</span>}
      </p>
    </div>
  );
}
