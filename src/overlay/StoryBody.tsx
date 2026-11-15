// The story content (EXPERIENCE §5.9), shared by the dialog and the prerendered exhibit page
// (ARCHITECTURE §5.2, §11.1), in this order: eyebrow ("No. 01 · ON VIEW NOW"), the artwork title,
// the caption as the dek, the meta block (role; organization and location; dates and duration),
// "Medium" (every tag), "The work" (the resume bullets verbatim), "Curator's note" (the optional
// pull quote, then the story blocks), "What I took away" (only with a takeaway), "The object" and
// the links. The dialog renders it under an h2; the static page (`#story-static`, never hydrated)
// under an h1 with Newer and Older links to the sibling pages. Both use ExhibitDialog.module.css,
// which the client bundle already carries, so the static page is styled with JS off.
import type { ReactNode } from 'react';
import { GALLERY_PATH, exhibitPath } from '../app/routes';
import { TEST_IDS } from '../app/testIds';
import type { ExhibitId } from '../content/ids';
import { content } from '../content/index';
import { entryById, organizationOf, type ExhibitCard } from '../content/selectors';
import type { StoryBlock } from '../content/types';
import { cardOf } from './model';
import { neighbourOf } from './story';
import styles from './ExhibitDialog.module.css';

interface WorkItem {
  text: string;
  href?: string;
}

/** "The work": the bullets verbatim; certifications list their items (linked when verifiable). */
function workItems(id: ExhibitId): WorkItem[] {
  const entry = entryById(content, id);
  if (entry.kind === 'certifications') {
    return entry.items.map((item) => ({
      text: item.issuer ? `${item.name}, ${item.issuer}` : item.name,
      href: item.url,
    }));
  }
  if (entry.kind === 'education') return [];
  return entry.bullets.map((b) => ({ text: b.text }));
}

/** The artwork title and organization of an exhibit: "Warm Start, Mysa". */
export function exhibitLabel(id: ExhibitId): string {
  const entry = entryById(content, id);
  return `${entry.exhibit.title}, ${organizationOf(entry)}`;
}

function Block({ block }: { block: StoryBlock }) {
  if (block.type === 'p') return <p>{block.text}</p>;
  if (block.type === 'list') {
    return (
      <ul className={styles.bullets}>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <figure className={styles.figure}>
      <img src={block.src} alt={block.alt} loading="lazy" decoding="async" />
      {block.caption && <figcaption>{block.caption}</figcaption>}
    </figure>
  );
}

interface SectionProps {
  id: string;
  title: string;
  level: 2 | 3;
  children: ReactNode;
}

function Section({ id, title, level, children }: SectionProps) {
  const Heading = level === 2 ? 'h2' : 'h3';
  return (
    <section className={styles.section} aria-labelledby={id}>
      <Heading className={styles.sectionTitle} id={id}>
        {title}
      </Heading>
      {children}
    </section>
  );
}

interface StoryContentProps {
  id: ExhibitId;
  headingId: string;
  /** The title's level: 2 in the dialog, 1 on the static page. Sections sit one level below. */
  level: 1 | 2;
  /** The dialog's duration carries the `dialog-duration` test id (masked in visual baselines). */
  durationTestId?: string;
  /** The dialog puts the eyebrow in its header row instead. */
  eyebrow?: boolean;
}

function StoryContent({ id, headingId, level, durationTestId, eyebrow = true }: StoryContentProps) {
  const card = cardOf(id) as ExhibitCard;
  const { exhibit } = entryById(content, id);
  const items = workItems(id);
  const Title = level === 1 ? 'h1' : 'h2';
  const sub = level === 1 ? 2 : 3;
  const sid = (name: string) => `${headingId}-${name}`;
  return (
    <>
      {eyebrow && <p className={styles.eyebrow}>{eyebrowText(id)}</p>}
      <Title className={styles.title} id={headingId}>
        {card.title}
      </Title>
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
                <span data-testid={durationTestId}>{card.duration}</span>
              </>
            )}
          </p>
        )}
      </div>
      {exhibit.tags.length > 0 && (
        <Section id={sid('medium')} title="Medium" level={sub}>
          <ul className={styles.chips}>
            {exhibit.tags.map((tag) => (
              <li key={tag} className={styles.chip}>
                {tag}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {items.length > 0 && (
        <Section id={sid('work')} title="The work" level={sub}>
          <ul className={styles.bullets}>
            {items.map((item) => (
              <li key={item.text}>
                {item.href ? (
                  <a className={styles.link} href={item.href}>
                    {item.text}
                  </a>
                ) : (
                  item.text
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}
      <Section id={sid('note')} title="Curator's note" level={sub}>
        {exhibit.curatorNote && (
          <blockquote className={styles.pullQuote}>
            <p>{exhibit.curatorNote.text}</p>
          </blockquote>
        )}
        <div className={styles.prose}>
          {exhibit.story.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </div>
      </Section>
      {exhibit.takeaway && (
        <Section id={sid('takeaway')} title="What I took away" level={sub}>
          <p className={styles.prose}>{exhibit.takeaway.text}</p>
        </Section>
      )}
      <Section id={sid('object')} title="The object" level={sub}>
        <p className={styles.prose}>{exhibit.object.text}</p>
      </Section>
      {exhibit.links.length > 0 && (
        <ul className={styles.links}>
          {exhibit.links.map((link) => (
            <li key={link.href}>
              <a className={styles.link} href={link.href}>
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** "No. 01 · ON VIEW NOW", or "No. 01" when the entry is not current. */
export function eyebrowText(id: ExhibitId): string {
  const card = cardOf(id) as ExhibitCard;
  return card.pill ? `${card.numberLabel} · ${card.pill}` : card.numberLabel;
}

/** The dialog's scrolling body. */
export function StoryBody({ id, headingId }: { id: ExhibitId; headingId: string }) {
  return (
    <StoryContent
      id={id}
      headingId={headingId}
      level={2}
      durationTestId={TEST_IDS.dialogDuration}
      eyebrow={false}
    />
  );
}

/** `#story-static` on /exhibit/<id>/: the whole story with JS off or in classic mode. */
export function StoryArticle({ id }: { id: ExhibitId }) {
  const newer = neighbourOf(id, 'newer');
  const older = neighbourOf(id, 'older');
  return (
    <article id="story-static" data-testid={TEST_IDS.storyStatic} className={styles.static}>
      <StoryContent id={id} headingId="story-static-title" level={1} />
      <nav className={styles.staticNav} aria-label="More exhibits">
        <ul>
          {newer && (
            <li>
              <a className={styles.link} href={exhibitPath(newer)}>
                <span className={styles.stepLabel}>Newer</span> {exhibitLabel(newer)}
              </a>
            </li>
          )}
          {older && (
            <li>
              <a className={styles.link} href={exhibitPath(older)}>
                <span className={styles.stepLabel}>Older</span> {exhibitLabel(older)}
              </a>
            </li>
          )}
          <li>
            <a className={styles.link} href={GALLERY_PATH}>
              Back to the gallery
            </a>
          </li>
        </ul>
      </nav>
    </article>
  );
}
