// The story content (EXPERIENCE §5.9), skeleton: eyebrow ("No. 01 · ON VIEW NOW"), the H2 artwork
// title, the caption as the dek, the meta block (role; organization and location; dates and
// duration), and "The work" with the resume bullets verbatim. WP-14 adds Medium, the curator's
// note and story blocks, the object, links, Newer and Older, and Copy link.
import { TEST_IDS } from '../app/testIds';
import type { ExhibitId } from '../content/ids';
import { content } from '../content/index';
import { entryById, type ExhibitCard } from '../content/selectors';
import { cardOf } from './model';
import styles from './ExhibitDialog.module.css';

function workItems(id: ExhibitId): string[] {
  const entry = entryById(content, id);
  if (entry.kind === 'certifications') {
    return entry.items.map((item) => (item.issuer ? `${item.name}, ${item.issuer}` : item.name));
  }
  if (entry.kind === 'education') return [];
  return entry.bullets.map((b) => b.text);
}

export function StoryBody({ id, headingId }: { id: ExhibitId; headingId: string }) {
  const card = cardOf(id) as ExhibitCard;
  const items = workItems(id);
  return (
    <div className={styles.body}>
      <p className={styles.eyebrow}>
        {card.numberLabel}
        {card.pill && ` · ${card.pill}`}
      </p>
      <h2 className={styles.title} id={headingId}>
        {card.title}
      </h2>
      <p className={styles.dek}>{card.caption}</p>
      <div className={styles.meta}>
        {card.role && <p className={styles.metaRole}>{card.role}</p>}
        <p>{card.orgLine}</p>
        {card.dates && (
          <p className={styles.metaDates}>
            {card.dates}
            {card.duration && (
              <>
                {' · '}
                <span data-testid={TEST_IDS.dialogDuration}>{card.duration}</span>
              </>
            )}
          </p>
        )}
      </div>
      {items.length > 0 && (
        <section className={styles.section} aria-labelledby={`${headingId}-work`}>
          <h3 className={styles.sectionTitle} id={`${headingId}-work`}>
            The work
          </h3>
          <ul className={styles.bullets}>
            {items.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
