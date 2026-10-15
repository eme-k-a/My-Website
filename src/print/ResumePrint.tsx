// The one-page print template (ARCHITECTURE §4.1): Jake's Resume look in plain HTML for
// scripts/build-resume-pdf.ts, which renders it with renderToStaticMarkup and inlines print.css.
// Only the print model goes in; the phone appears only when the private build passes one.
import type { ReactNode } from 'react';
import type {
  PrintBullet,
  PrintContactItem,
  PrintDates,
  PrintEducation,
  PrintEntry,
  PrintModel,
  PrintProject,
  PrintSection,
  TrimCandidate,
} from '../content/selectors';

/** Rank of each trim candidate in the model's list, keyed by entry id and bullet number. */
type TrimMarks = Map<string, number>;

const trimKey = (id: string, n: number) => `${id}#${n}`;

// A word with an inner hyphen or slash ("end-to-end", "CI/CD") never breaks across lines, so text
// extraction (ATS, the PDF tests) always reads it whole.
const JOINED = /\S[-/]\S/;

function keepTogether(text: string): ReactNode[] {
  return text.split(' ').flatMap((word, i) => {
    const node = JOINED.test(word) ? (
      <span className="pr-nobr" key={i}>
        {word}
      </span>
    ) : (
      word
    );
    return i === 0 ? [node] : [' ', node];
  });
}

function Bullets({ id, bullets, marks }: { id: string; bullets: PrintBullet[]; marks: TrimMarks }) {
  if (bullets.length === 0) return null;
  return (
    <ul className="pr-bullets">
      {bullets.map((b) => {
        const rank = marks.get(trimKey(id, b.n));
        return (
          <li
            className="pr-bullet"
            key={b.n}
            data-entry={id}
            data-bullet={b.n}
            data-priority={b.priority}
            {...(rank !== undefined && { 'data-trim': rank })}
          >
            {keepTogether(b.text)}
          </li>
        );
      })}
    </ul>
  );
}

function Row({ left, right, kind }: { left: ReactNode; right: ReactNode; kind: 'head' | 'sub' }) {
  return (
    <div className={`pr-row pr-row-${kind}`}>
      <span className="pr-left">{left}</span>
      <span className="pr-right">{right}</span>
    </div>
  );
}

const datesText = (d: PrintDates | undefined) => d?.text ?? '';

function Entry({ entry, marks }: { entry: PrintEntry; marks: TrimMarks }) {
  return (
    <div className="pr-entry" data-entry={entry.id}>
      <Row kind="head" left={<strong>{entry.role}</strong>} right={entry.dates.text} />
      <Row kind="sub" left={<em>{entry.org}</em>} right={<em>{entry.location}</em>} />
      <Bullets id={entry.id} bullets={entry.bullets} marks={marks} />
    </div>
  );
}

function Education({ entry }: { entry: PrintEducation }) {
  return (
    <div className="pr-entry" data-entry={entry.id}>
      <Row kind="head" left={<strong>{entry.institution}</strong>} right={entry.location} />
      <Row kind="sub" left={<em>{entry.degree}</em>} right={<em>{entry.dates.text}</em>} />
    </div>
  );
}

function Project({ project, marks }: { project: PrintProject; marks: TrimMarks }) {
  return (
    <div className="pr-entry pr-project" data-entry={project.id}>
      <Row
        kind="head"
        left={
          <>
            <strong>{project.name}</strong>
            <span className="pr-sep"> | </span>
            <em>{project.stack}</em>
          </>
        }
        right={datesText(project.dates)}
      />
      <Bullets id={project.id} bullets={project.bullets} marks={marks} />
    </div>
  );
}

function Section({ section, marks }: { section: PrintSection; marks: TrimMarks }) {
  let body: ReactNode;
  switch (section.kind) {
    case 'education':
      body = section.entries.map((e) => <Education entry={e} key={e.id} />);
      break;
    case 'experience':
    case 'volunteer':
      body = section.entries.map((e) => <Entry entry={e} marks={marks} key={e.id} />);
      break;
    case 'projects':
      body = section.entries.map((p) => <Project project={p} marks={marks} key={p.id} />);
      break;
    case 'skills':
      body = (
        <ul className="pr-skills">
          {section.lines.map((line) => (
            <li key={line.label}>
              <strong>{line.label}</strong>: {line.items}
            </li>
          ))}
        </ul>
      );
      break;
    case 'certifications':
      body = <p className="pr-certs">{section.items.join(' | ')}</p>;
      break;
  }
  return (
    <section className={`pr-section pr-${section.kind}`}>
      <h2 className="pr-heading">{section.title}</h2>
      <div className="pr-body">{body}</div>
    </section>
  );
}

function ContactItem({ item }: { item: PrintContactItem }) {
  if (item.href === undefined) return <>{item.text}</>;
  return <a href={item.href}>{item.text}</a>;
}

export function ResumePrint({ model }: { model: PrintModel }) {
  // The overflow gate reads data-entry, data-bullet, data-priority and data-trim from the bullets.
  const marks: TrimMarks = new Map(
    model.trimCandidates.map((c: TrimCandidate, rank) => [trimKey(c.id, c.n), rank]),
  );
  return (
    <div className="pr-page">
      <header className="pr-header">
        <h1 className="pr-name">{model.name}</h1>
        <p className="pr-contact">
          {model.contact.map((item, i) => (
            <span key={item.kind}>
              {i > 0 && <span className="pr-sep"> | </span>}
              <ContactItem item={item} />
            </span>
          ))}
        </p>
      </header>
      {model.sections.map((section) => (
        <Section section={section} marks={marks} key={section.kind} />
      ))}
    </div>
  );
}
