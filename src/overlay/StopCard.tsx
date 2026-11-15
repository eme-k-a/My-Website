// One DOM card per stop section (EXPERIENCE §5.8, §8.4), from stopCards(): all readable stop
// information lives here, prerendered and identical with and without JS. Exhibit placards, door
// cards, the front desk card, and the lobby hero (Intro). Paper ages with layout.ageT. Without JS
// every story stays reachable: the artwork title and the door links are real links to
// /exhibit/<id>/; with JS a plain click opens the story dialog instead.
import type { CSSProperties, MouseEvent } from 'react';
import { useMuseum } from '../app/store';
import { TEST_IDS } from '../app/testIds';
import type { ExhibitId, StopId } from '../content/ids';
import type { DeskCard, DoorCard, ExhibitCard } from '../content/selectors';
import { enterWing, travelTo } from '../museum/rail/navigation';
import { Icon } from './icons';
import { Intro } from './Intro';
import { cardOf, PDF_PATH, paperOf } from './model';
import { openStory } from './story';
import styles from './StopCard.module.css';
import ui from './ui.module.css';

const ignore = () => {};

const plainClick = (e: MouseEvent) =>
  e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

const paper = (id: StopId): CSSProperties => ({ '--card-paper': paperOf(id) }) as CSSProperties;

/** A link to /exhibit/<id>/ that opens the story dialog on a plain click once hydrated. */
function StoryLink({ id, href, children }: { id: ExhibitId; href: string; children: string }) {
  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!plainClick(e)) return;
    e.preventDefault();
    openStory(id, { opener: e.currentTarget, source: 'card-link' });
  };
  return (
    <a className={styles.storyLink} href={href} onClick={onClick}>
      {children}
    </a>
  );
}

function ExhibitPlacard({ card }: { card: ExhibitCard }) {
  const installing = useMuseum((s) => s.placeholders.includes(card.id));
  return (
    <article
      className={styles.card}
      style={paper(card.id)}
      data-card=""
      data-testid={TEST_IDS.card(card.id)}
    >
      <p className={styles.numberRow}>
        <span className={styles.number}>{card.numberLabel}</span>
        {card.pill && (
          <span className={styles.pill} data-pill={card.pill === 'ON VIEW NOW' ? 'now' : 'ongoing'}>
            {card.pill}
          </span>
        )}
      </p>
      <h2 className={styles.title}>
        <StoryLink id={card.id} href={card.cta.href}>
          {card.title}
        </StoryLink>
      </h2>
      {card.role && <p className={styles.role}>{card.role}</p>}
      <p className={styles.org}>{card.orgLine}</p>
      {card.dates && (
        <p className={styles.dates}>
          <span className={styles.range}>{card.dates}</span>
          {card.duration && <span className={styles.dimensions}>Dimensions: {card.duration}</span>}
        </p>
      )}
      {card.medium.length > 0 && (
        <p className={styles.medium}>
          <span className={styles.mediumLabel}>Medium</span> {card.medium.join(', ')}
        </p>
      )}
      <p className={styles.caption}>{card.caption}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={ui.paperPrimary}
          data-testid={TEST_IDS.open(card.id)}
          aria-haspopup="dialog"
          onClick={(e) => openStory(card.id, { opener: e.currentTarget, source: 'card' })}
        >
          {card.cta.label}
          <kbd className={ui.kbd} aria-hidden="true">
            Enter
          </kbd>
        </button>
      </div>
      <p className={styles.status}>{installing ? 'Installation in progress' : ''}</p>
    </article>
  );
}

function DoorPlacard({ card }: { card: DoorCard }) {
  return (
    <article
      className={styles.card}
      style={paper(card.id)}
      data-card=""
      data-testid={TEST_IDS.card(card.id)}
    >
      <h2 className={styles.title}>{card.title}</h2>
      <p className={styles.count}>{card.count}</p>
      <ul className={styles.doorLinks}>
        {card.links.map((link) => (
          <li key={link.id}>
            <StoryLink id={link.id} href={link.href}>
              {link.label}
            </StoryLink>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <button
          type="button"
          className={ui.paperPrimary}
          data-testid={TEST_IDS.enterWing(card.wing)}
          onClick={() => {
            useMuseum.setState({ inputSource: 'hud' });
            enterWing(card.wing).catch(ignore);
          }}
        >
          <Icon name="door-open" />
          {card.cta.label}
          <kbd className={ui.kbd} aria-hidden="true">
            Enter
          </kbd>
        </button>
      </div>
      <p className={styles.helper}>Or keep scrolling to skip.</p>
    </article>
  );
}

function DeskPlacard({ card }: { card: DeskCard }) {
  const again = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!plainClick(e)) return;
    e.preventDefault();
    useMuseum.setState({ inputSource: 'hud' });
    travelTo('lobby').catch(ignore);
  };
  return (
    <article
      className={`${styles.card} ${styles.desk}`}
      style={paper(card.id)}
      data-card=""
      data-testid={TEST_IDS.card(card.id)}
    >
      <h2 className={styles.title}>{card.headline}</h2>
      <p className={styles.body}>{card.body.text}</p>
      <ul className={styles.deskLinks}>
        <li>
          <a className={ui.paperPrimary} href={card.email}>
            <Icon name="mail" />
            Email me
          </a>
        </li>
        <li>
          <a className={styles.deskLink} href={card.linkedin} rel="me">
            <Icon name="external-link" />
            Connect on LinkedIn
          </a>
        </li>
        <li>
          <a className={styles.deskLink} href={PDF_PATH}>
            <Icon name="file-text" />
            Take home the catalogue (PDF)
          </a>
        </li>
        {card.github && (
          <li>
            <a className={styles.deskLink} href={card.github} rel="me">
              <Icon name="external-link" />
              Browse code on GitHub
            </a>
          </li>
        )}
        <li>
          <a className={styles.deskLink} href="#stop-lobby" onClick={again}>
            Walk the aisle again
          </a>
        </li>
      </ul>
      <p className={styles.footnote}>{card.footnote}</p>
    </article>
  );
}

/** ScrollTrack's `renderCard`: the card for a stop, inside a full-height slot that places it. */
export function renderStopCard(id: StopId) {
  const card = cardOf(id);
  if (card.kind === 'lobby') return <Intro card={card} />;
  return (
    <div className={styles.slot}>
      {card.kind === 'exhibit' && <ExhibitPlacard card={card} />}
      {card.kind === 'door' && <DoorPlacard card={card} />}
      {card.kind === 'desk' && <DeskPlacard card={card} />}
    </div>
  );
}
