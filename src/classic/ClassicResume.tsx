// The classic resume at /resume/ (ARCHITECTURE §5.3, §5.6; EXPERIENCE §7.3, §8.4, §8.5): zero JS,
// zero WebGL, prerendered once with renderToStaticMarkup and never hydrated. Every entry with every
// bullet (not only the printed ones), dates through formatRange, locations, skills,
// certifications, education and contact links, plus "Download the PDF" and "Try the gallery". The
// four fallback banners show only as the CSS :target of /resume/#why-<reason>; "Try the gallery"
// hides on #why-no-webgl2, where the gallery cannot work. Styles: classic.css (`.cv-*`).
import { formatLocation, formatMonth, formatRange, isExpected } from '../content/format';
import { content } from '../content/index';
import { displayName, heroLines, linkedinDisplay } from '../content/selectors';
import type { Bullet, Content, DateRange } from '../content/types';

/** The banners of EXPERIENCE §8.4, by the boot script's reason (`param` and `stored` have none). */
export const FALLBACK_BANNERS = [
  { id: 'why-no-webgl2', text: "The gallery needs WebGL2, so you're seeing the classic resume." },
  { id: 'why-save-data', text: "Data saver is on, so you're seeing the classic resume." },
  {
    id: 'why-software',
    text: "Your browser is drawing 3D without a graphics card, so you're seeing the classic resume.",
  },
  {
    id: 'why-context-loss',
    text: "The gallery stopped responding, so you're seeing the classic resume.",
  },
] as const;

export const GALLERY_HREF = '/?mode=museum';
export const PDF_HREF = '/resume.pdf';

const hostOf = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');

function Dates({ range }: { range: DateRange }) {
  return <p className="cv-dates">{formatRange(range)}</p>;
}

function Bullets({ bullets }: { bullets: Bullet[] }) {
  return (
    <ul className="cv-bullets">
      {bullets.map((b) => (
        <li key={b.text}>{b.text}</li>
      ))}
    </ul>
  );
}

function Experience({ c }: { c: Content }) {
  return (
    <section className="cv-section" aria-labelledby="cv-experience">
      <h2 className="cv-section-title" id="cv-experience">
        Experience
      </h2>
      {c.experiences.map((w) => (
        <article className="cv-entry" key={w.id}>
          <div className="cv-entry-head">
            <h3 className="cv-entry-title">{w.role}</h3>
            <Dates range={w.dates} />
          </div>
          <p className="cv-entry-org">
            {w.org}, {formatLocation(w.location)}
          </p>
          <Bullets bullets={w.bullets} />
        </article>
      ))}
    </section>
  );
}

function Projects({ c }: { c: Content }) {
  if (c.projects.length === 0) return null;
  return (
    <section className="cv-section" aria-labelledby="cv-projects">
      <h2 className="cv-section-title" id="cv-projects">
        Projects
      </h2>
      {c.projects.map((p) => (
        <article className="cv-entry" key={p.id}>
          <div className="cv-entry-head">
            <h3 className="cv-entry-title">
              {p.name}: {p.tagline}
            </h3>
            {p.dates && <Dates range={p.dates} />}
          </div>
          {p.role && <p className="cv-entry-org">{p.role}</p>}
          <p className="cv-stack">{p.stack.join(', ')}</p>
          <Bullets bullets={p.bullets} />
        </article>
      ))}
    </section>
  );
}

function Volunteer({ c }: { c: Content }) {
  if (c.volunteer.length === 0) return null;
  return (
    <section className="cv-section" aria-labelledby="cv-volunteer">
      <h2 className="cv-section-title" id="cv-volunteer">
        Volunteer Experience
      </h2>
      {c.volunteer.map((v) => (
        <article className="cv-entry" key={v.id}>
          <div className="cv-entry-head">
            <h3 className="cv-entry-title">{v.role}</h3>
            <Dates range={v.dates} />
          </div>
          <p className="cv-entry-org">
            {v.org}, {formatLocation(v.location)}
          </p>
          <Bullets bullets={v.bullets} />
        </article>
      ))}
    </section>
  );
}

function Education({ c, now }: { c: Content; now: Date }) {
  return (
    <section className="cv-section" aria-labelledby="cv-education">
      <h2 className="cv-section-title" id="cv-education">
        Education
      </h2>
      {c.education.map((e) => {
        const month = formatMonth(e.graduation);
        return (
          <article className="cv-entry" key={e.id}>
            <div className="cv-entry-head">
              <h3 className="cv-entry-title">{e.institution}</h3>
              <p className="cv-dates">{isExpected(e, now) ? `Expected ${month}` : month}</p>
            </div>
            <p className="cv-entry-org">
              {e.degree}, {formatLocation(e.location)}
            </p>
          </article>
        );
      })}
    </section>
  );
}

function Skills({ c }: { c: Content }) {
  return (
    <section className="cv-section" aria-labelledby="cv-skills">
      <h2 className="cv-section-title" id="cv-skills">
        Technical Skills
      </h2>
      <dl className="cv-skills">
        {c.skills.map((s) => (
          <div className="cv-skill" key={s.label}>
            <dt>{s.label}</dt>
            <dd>{s.items.join(', ')}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Certifications({ c }: { c: Content }) {
  return (
    <section className="cv-section" aria-labelledby="cv-certifications">
      <h2 className="cv-section-title" id="cv-certifications">
        Certifications
      </h2>
      <ul className="cv-list">
        {c.certifications.items.map((item) => {
          const details = [item.issuer, item.date && formatMonth(item.date)].filter(Boolean);
          const text = details.length > 0 ? `${item.name} (${details.join(', ')})` : item.name;
          return <li key={item.name}>{item.url ? <a href={item.url}>{text}</a> : text}</li>;
        })}
      </ul>
    </section>
  );
}

export function ClassicResume({ now, c = content }: { now: Date; c?: Content }) {
  const [roleLine, educationLine] = heroLines(c, now);
  return (
    <div className="cv" data-testid="classic-view">
      <header className="cv-header">
        {FALLBACK_BANNERS.map((banner) => (
          <p className="cv-banner" id={banner.id} key={banner.id}>
            {banner.text}
          </p>
        ))}
        <h1 className="cv-name">{displayName(c)}</h1>
        <p className="cv-headline">
          {roleLine}
          <br />
          {educationLine}
        </p>
        <ul className="cv-contact">
          <li>
            <a href={`mailto:${c.contact.email}`}>{c.contact.email}</a>
          </li>
          <li>
            <a href={c.contact.linkedin} rel="me">
              {linkedinDisplay(c.contact.linkedin)}
            </a>
          </li>
          {c.contact.github && (
            <li>
              <a href={c.contact.github} rel="me">
                {hostOf(c.contact.github)}
              </a>
            </li>
          )}
          <li>{c.contact.location}</li>
        </ul>
        <p className="cv-actions">
          <a className="cv-button" href={PDF_HREF}>
            Download the PDF
          </a>
          <a className="cv-gallery" href={GALLERY_HREF}>
            Try the gallery
          </a>
        </p>
      </header>
      <main className="cv-main">
        <Education c={c} now={now} />
        <Experience c={c} />
        <Skills c={c} />
        <Projects c={c} />
        <Volunteer c={c} />
        <Certifications c={c} />
      </main>
    </div>
  );
}
