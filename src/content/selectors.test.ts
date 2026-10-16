import { describe, expect, it } from 'vitest';
import { EXHIBIT_IDS } from './ids';
import { content } from './index';
import {
  displayName,
  entryById,
  exhibitNumber,
  heroLines,
  linkedinDisplay,
  mainTrack,
  printModel,
  printSiteHost,
  readingOrder,
  stopCards,
  threeDStrings,
  trackOf,
  wingTrack,
  type ExhibitCard,
  type PrintEntry,
  type PrintModel,
  type PrintSection,
  type StopCard,
} from './selectors';
import type { Content } from './types';

const OCT_2026 = new Date('2026-10-15T00:00:00Z');
const JAN_2027 = new Date('2027-01-05T00:00:00Z');
const MAY_2027 = new Date('2027-05-01T00:00:00Z');
// Spelled as escapes: en dashes appear only in date ranges, and em dashes nowhere.
const EN_DASH = '\u2013';
const EM_DASH = '\u2014';

const exhibitCards = (cards: StopCard[]) =>
  cards.filter((card): card is ExhibitCard => card.kind === 'exhibit');
const card = (cards: StopCard[], id: string) => {
  const found = cards.find((c) => c.id === id);
  if (!found) throw new Error(`No card '${id}'`);
  return found;
};

describe('track selectors (ARCHITECTURE §3.7, EXPERIENCE §3.1)', () => {
  it('mainTrack has the 10 main stops in order', () => {
    expect(mainTrack(content)).toEqual([
      'lobby',
      'verafin',
      'projects-door',
      'mysa',
      'volunteer-door',
      'wailo',
      'cfia',
      'mun',
      'certifications',
      'desk',
    ]);
  });

  it('wing tracks start with their door', () => {
    expect(wingTrack(content, 'projects')).toEqual(['projects-door', 'klarup', 'finance-tracker']);
    expect(wingTrack(content, 'volunteer')).toEqual(['volunteer-door', 'safe-sip', 'sdsj']);
  });

  it('trackOf puts wing items in their wing and everything else on main', () => {
    expect(trackOf(content, 'klarup')).toBe('projects');
    expect(trackOf(content, 'sdsj')).toBe('volunteer');
    expect(trackOf(content, 'verafin')).toBe('main');
    expect(trackOf(content, 'projects-door')).toBe('main');
    expect(trackOf(content, 'certifications')).toBe('main');
  });

  it('readingOrder is the catalogue order', () => {
    expect(readingOrder(content)).toEqual([
      'verafin',
      'klarup',
      'finance-tracker',
      'mysa',
      'safe-sip',
      'sdsj',
      'wailo',
      'cfia',
      'mun',
      'certifications',
    ]);
  });

  it('exhibitNumber numbers main exhibits 01 to 06 and wing items by letter', () => {
    const numbers = Object.fromEntries(EXHIBIT_IDS.map((id) => [id, exhibitNumber(content, id)]));
    expect(numbers).toEqual({
      verafin: '01',
      mysa: '02',
      wailo: '03',
      cfia: '04',
      mun: '05',
      certifications: '06',
      klarup: 'P1',
      'finance-tracker': 'P2',
      'safe-sip': 'V1',
      sdsj: 'V2',
    });
  });

  it('entryById finds every exhibit entry', () => {
    for (const id of EXHIBIT_IDS) expect(entryById(content, id).id).toBe(id);
    expect(entryById(content, 'mun').kind).toBe('education');
  });
});

describe('displayName and heroLines (EXPERIENCE §8.1)', () => {
  it('derives the site display name', () => {
    expect(displayName(content)).toBe('Chukwuemeka (Emeka) Nduka-Nwagbo');
  });

  it('reads the current role and the expected degree at 2026-10-15', () => {
    expect(heroLines(content, OCT_2026)).toEqual([
      'Software Development Co-op, Nasdaq Verafin',
      'B.Eng Computer Engineering, MUN, expected May 2027',
    ]);
  });

  it('falls back to "Most recently" when no work entry is current', () => {
    expect(heroLines(content, JAN_2027)[0]).toBe(
      'Most recently: Software Development Co-op, Nasdaq Verafin',
    );
  });

  it('drops "expected" from the graduation month on', () => {
    expect(heroLines(content, MAY_2027)[1]).toBe('B.Eng Computer Engineering, MUN, May 2027');
  });

  it('uses the full role and degree when no short form exists', () => {
    const c: Content = structuredClone(content);
    delete c.experiences[0]!.shortRole;
    delete c.education[0]!.shortDegree;
    delete c.education[0]!.shortInstitution;
    expect(heroLines(c, OCT_2026)).toEqual([
      'Software Development Co-op Student, Nasdaq Verafin',
      'B.Eng in Computer Engineering, Memorial University of Newfoundland, expected May 2027',
    ]);
  });
});

describe('stopCards (EXPERIENCE §5.8)', () => {
  const cards = stopCards(content, OCT_2026);

  it('has one card per section, wing exhibits right after their door', () => {
    expect(cards.map((c) => [c.id, c.track])).toEqual([
      ['lobby', 'main'],
      ['verafin', 'main'],
      ['projects-door', 'main'],
      ['klarup', 'projects'],
      ['finance-tracker', 'projects'],
      ['mysa', 'main'],
      ['volunteer-door', 'main'],
      ['safe-sip', 'volunteer'],
      ['sdsj', 'volunteer'],
      ['wailo', 'main'],
      ['cfia', 'main'],
      ['mun', 'main'],
      ['certifications', 'main'],
      ['desk', 'main'],
    ]);
  });

  it('matches the card data table at an October 2026 build', () => {
    const rows = exhibitCards(cards).map((c) => [
      c.numberLabel,
      c.id,
      c.title,
      c.role ?? null,
      c.orgLine,
      c.dates?.replace(EN_DASH, '-') ?? null,
      c.duration ?? null,
      c.pill ?? null,
    ]);
    expect(rows).toEqual([
      // prettier-ignore
      ['No. 01', 'verafin', 'The Reporting Engine', 'Software Development Co-op Student', "Nasdaq Verafin, St. John's, NL / Hybrid", 'Sep 2026 - Dec 2026', '4 months', 'ON VIEW NOW'],
      ['No. P1', 'klarup', 'The Climb', null, 'KlarUp, Project', null, null, null],
      // prettier-ignore
      ['No. P2', 'finance-tracker', 'The Balance', null, 'Personal Finance Tracker, Project', null, null, null],
      // prettier-ignore
      ['No. 02', 'mysa', 'Warm Start', 'Full Stack Software Developer (Co-op)', "Mysa, St. John's, NL", 'Jan 2026 - May 2026', '5 months', null],
      // prettier-ignore
      ['No. V1', 'safe-sip', 'Tamper Evident', 'Member (Right-To-Rise: Safe Sip)', "Enactus Memorial, St. John's, NL", 'Sep 2025 - Present', '1 yr 2 mo', 'ONGOING'],
      // prettier-ignore
      ['No. V2', 'sdsj', 'The Round Table', 'President', "Software Developers of St. John's, St. John's, NL", 'Jul 2024 - Present', '2 yr 4 mo', 'ONGOING'],
      // prettier-ignore
      ['No. 03', 'wailo', 'The Deep Link', 'Front End Developer (Co-op)', 'Wailo, Calgary, AB / Remote', 'May 2025 - Aug 2025', '4 months', null],
      // prettier-ignore
      ['No. 04', 'cfia', 'The Ticket Spindle', 'IT Support Technician (Intern)', 'Canadian Food Inspection Agency, Ottawa, ON / Remote', 'Dec 2022 - Aug 2024', '1 yr 9 mo', null],
      // prettier-ignore
      ['No. 05', 'mun', 'Work in Progress', 'B.Eng in Computer Engineering', "Memorial University of Newfoundland, St. John's, NL", 'Expected May 2027', null, null],
      // prettier-ignore
      ['No. 06', 'certifications', 'The Medal Cabinet', 'Three credentials', 'AWS Certified Cloud Practitioner; Tech Stewardship Practice Program; Tech Stewardship for the Energy Transition', null, null, null],
    ]);
  });

  it('formats ranges with a spaced en dash and never an em dash', () => {
    expect((card(cards, 'verafin') as ExhibitCard).dates).toBe(`Sep 2026 ${EN_DASH} Dec 2026`);
    expect(JSON.stringify(cards)).not.toContain(EM_DASH);
  });

  it('gives verafin ON VIEW NOW at 2026-10-15 and not at 2027-01-05', () => {
    expect((card(cards, 'verafin') as ExhibitCard).pill).toBe('ON VIEW NOW');
    const january = card(stopCards(content, JAN_2027), 'verafin') as ExhibitCard;
    expect(january.pill).toBeUndefined();
    expect(january.duration).toBe('4 months');
  });

  it('keeps ONGOING on open-ended volunteer roles and drops "Expected" after graduation', () => {
    const may = stopCards(content, MAY_2027);
    expect((card(may, 'sdsj') as ExhibitCard).pill).toBe('ONGOING');
    expect((card(may, 'sdsj') as ExhibitCard).duration).toBe('2 yr 11 mo');
    expect((card(may, 'mun') as ExhibitCard).dates).toBe('May 2027');
  });

  it('shows the first 4 tags as Medium, the caption and the story CTA', () => {
    const mysa = card(cards, 'mysa') as ExhibitCard;
    expect(mysa.medium).toEqual(['Detox', 'CI/CD', 'Keycloak', 'OAuth 2.0']);
    expect(mysa.caption).toBe(content.experiences[1]!.exhibit.caption);
    expect(mysa.cta).toEqual({ label: 'Read the story', href: '/exhibit/mysa/' });
    for (const c of exhibitCards(cards)) expect(c.medium.length).toBeLessThanOrEqual(4);
  });

  it('carries the exhibit draft flag', () => {
    const drafts = exhibitCards(cards)
      .filter((c) => c.draft)
      .map((c) => c.id);
    expect(drafts).toContain('verafin');
  });

  it('builds door cards from the wing content', () => {
    expect(card(cards, 'projects-door')).toEqual({
      kind: 'door',
      id: 'projects-door',
      track: 'main',
      wing: 'projects',
      title: 'Projects wing',
      count: '2 exhibits',
      links: [
        { id: 'klarup', label: 'The Climb, KlarUp', href: '/exhibit/klarup/' },
        {
          id: 'finance-tracker',
          label: 'The Balance, Personal Finance Tracker',
          href: '/exhibit/finance-tracker/',
        },
      ],
      cta: { label: 'Step inside' },
    });
    const volunteer = card(cards, 'volunteer-door');
    expect(volunteer.kind === 'door' && volunteer.title).toBe('Volunteer & Leadership wing');
    expect(volunteer.kind === 'door' && volunteer.links.map((l) => l.label)).toEqual([
      'Tamper Evident, Enactus Memorial',
      "The Round Table, Software Developers of St. John's",
    ]);
  });

  it('builds the lobby and desk cards from gallery copy and contact', () => {
    const lobby = card(cards, 'lobby');
    expect(lobby.kind === 'lobby' && [lobby.name, lobby.roleLine, lobby.educationLine]).toEqual([
      'Chukwuemeka (Emeka) Nduka-Nwagbo',
      'Software Development Co-op, Nasdaq Verafin',
      'B.Eng Computer Engineering, MUN, expected May 2027',
    ]);
    const desk = card(cards, 'desk');
    expect(desk.kind === 'desk' && [desk.headline, desk.email, desk.linkedin, desk.github]).toEqual(
      [
        "You've reached the beginning.",
        'mailto:cndukanwagbo@mun.ca',
        'https://linkedin.com/in/emekanduka',
        'https://github.com/eme-k-a',
      ],
    );
  });
});

describe('threeDStrings (EXPERIENCE §5.4)', () => {
  const strings = threeDStrings(content, OCT_2026);
  const texts = (kind: string) => strings.filter((s) => s.kind === kind).map((s) => s.text);

  it('numbers every exhibit in catalogue order', () => {
    expect(texts('number')).toEqual(['01', 'P1', 'P2', '02', 'V1', 'V2', '03', '04', '05', '06']);
  });

  it('has the uppercase organization labels of §5.4', () => {
    expect(new Set(texts('organization'))).toEqual(
      new Set([
        'NASDAQ VERAFIN',
        'MYSA',
        'WAILO',
        'CANADIAN FOOD INSPECTION AGENCY',
        'KLARUP',
        'PERSONAL FINANCE TRACKER',
        'ENACTUS MEMORIAL',
        "SOFTWARE DEVELOPERS OF ST. JOHN'S",
        'MEMORIAL UNIVERSITY',
        'CERTIFICATIONS',
      ]),
    );
  });

  it('has the room names, signs and end-wall line', () => {
    expect(texts('room')).toEqual(['PROJECTS', 'VOLUNTEER & LEADERSHIP']);
    expect(texts('sign')).toEqual([
      'FOUNDATIONS',
      'COMMIT HISTORY',
      "You've reached the beginning.",
    ]);
  });

  it('has the year numerals the layout draws (2026 down to 2022 today)', () => {
    expect(texts('year')).toEqual(['2026', '2025', '2024', '2023', '2022']);
    expect(threeDStrings(content, JAN_2027).filter((s) => s.kind === 'year')[0]?.text).toBe('2027');
    expect(
      threeDStrings(content)
        .filter((s) => s.kind === 'year')
        .map((s) => s.text),
    ).toEqual(['2026', '2025', '2024', '2023', '2022']);
  });

  it('assigns fonts: serif for numbers and big titles, Plex 500 for labels and years', () => {
    for (const s of strings) {
      const serif = s.kind === 'number' || (s.kind === 'sign' && s.text !== 'FOUNDATIONS');
      expect(s.font, s.text).toBe(serif ? 'serif' : 'sans');
    }
  });
});

describe('printModel (ARCHITECTURE §3.7, §4.1; CONTENT_DRAFT §3)', () => {
  const model = printModel(content, { now: OCT_2026 });
  // Built at runtime: check-copy scans every tracked file for a phone-shaped literal.
  const PHONE = new RegExp(['\\b\\d{3}', '\\d{3}', '\\d{4}\\b'].join('[-. ]'));
  const fakePhone = () => ['555', '010', '0199'].join('-');
  const section = <K extends PrintSection['kind']>(m: PrintModel, kind: K) => {
    const found = m.sections.find((s) => s.kind === kind);
    if (!found) throw new Error(`No ${kind} section`);
    return found as Extract<PrintSection, { kind: K }>;
  };
  const entryOf = (entries: PrintEntry[], id: string) => {
    const found = entries.find((e) => e.id === id);
    if (!found) throw new Error(`No print entry '${id}'`);
    return found;
  };
  const clone = (): Content => structuredClone(content);

  it('orders the sections like the original resume', () => {
    expect(model.sections.map((s) => s.title)).toEqual([
      'Education',
      'Experience',
      'Technical Skills',
      'Projects',
      'Volunteer Experience',
      'Certifications',
    ]);
  });

  it('prints the work entries newest first with formatRange dates and formatLocation places', () => {
    const experience = section(model, 'experience').entries;
    expect(experience.map((e) => e.id)).toEqual(['verafin', 'mysa', 'wailo', 'cfia']);
    const verafin = entryOf(experience, 'verafin');
    expect(verafin).toMatchObject({
      role: 'Software Development Co-op Student',
      org: 'Nasdaq Verafin',
      location: "St. John's, NL / Hybrid",
      dates: { text: `Sep 2026 ${EN_DASH} Dec 2026`, tex: 'Sep 2026 -- Dec 2026' },
    });
    expect(entryOf(experience, 'wailo').location).toBe('Calgary, AB / Remote');
    expect(entryOf(experience, 'cfia').location).toBe('Ottawa, ON / Remote');
    const sdsj = entryOf(section(model, 'volunteer').entries, 'sdsj');
    expect(sdsj.dates.text).toBe(`Jul 2024 ${EN_DASH} Present`);
  });

  it('keeps only print: true bullets, with their content positions', () => {
    const all = [...content.experiences, ...content.projects, ...content.volunteer];
    const printed = model.sections.flatMap((s) =>
      s.kind === 'experience' || s.kind === 'volunteer' || s.kind === 'projects'
        ? s.entries.flatMap((e) => e.bullets.map((b) => ({ id: e.id, ...b })))
        : [],
    );
    const expected = all.flatMap((e) =>
      e.bullets.flatMap((b, i) =>
        b.print ? [{ id: e.id, text: b.text, n: i + 1, priority: b.priority }] : [],
      ),
    );
    expect(printed).toEqual(expected);
    expect(printed.length).toBe(15);
  });

  it('leaves out Personal Finance Tracker (no printed bullet) but keeps KlarUp', () => {
    const projects = section(model, 'projects').entries;
    expect(projects.map((p) => p.id)).toEqual(['klarup']);
    expect(projects[0]).toMatchObject({
      name: 'KlarUp: Collaborative Productivity App',
      stack: 'React Native, Python, Expo',
    });
    expect(projects[0]?.dates).toBeUndefined();
  });

  it('omits a volunteer entry, and the whole section, once nothing in it prints', () => {
    const c = clone();
    for (const b of c.volunteer[0]!.bullets) b.print = false;
    expect(section(printModel(c, { now: OCT_2026 }), 'volunteer').entries.map((e) => e.id)).toEqual(
      ['sdsj'],
    );
    for (const v of c.volunteer) for (const b of v.bullets) b.print = false;
    for (const p of c.projects) for (const b of p.bullets) b.print = false;
    const kinds = printModel(c, { now: OCT_2026 }).sections.map((s) => s.kind);
    expect(kinds).toEqual(['education', 'experience', 'skills', 'certifications']);
  });

  it('prints the degree as expected until the graduation month', () => {
    const edu = section(model, 'education').entries[0];
    expect(edu).toMatchObject({
      institution: 'Memorial University of Newfoundland',
      degree: 'B.Eng in Computer Engineering',
      location: "St. John's, NL",
      dates: { text: 'Expected Graduation: May 2027' },
    });
    const later = section(printModel(content, { now: MAY_2027 }), 'education').entries[0];
    expect(later?.dates.text).toBe('May 2027');
  });

  it('prints four skill lines and one certifications line', () => {
    expect(section(model, 'skills').lines).toEqual([
      { label: 'Languages', items: 'Python, C++, C#, JavaScript, TypeScript, HTML, CSS' },
      { label: 'Frameworks', items: 'React, React Native, Next.js, Node.js, Express, FastAPI' },
      {
        label: 'Data, Cloud & DevOps',
        items: 'MongoDB, SQLite, AWS, Firebase, Kubernetes, Detox, GitHub Actions',
      },
      {
        label: 'Concepts',
        items: 'Algorithms, Data Structures, Agile, CI/CD, OAuth 2.0 / OIDC, Compiler & OS Basics',
      },
    ]);
    expect(section(model, 'certifications').items).toEqual([
      'AWS Certified Cloud Practitioner',
      'Tech Stewardship Practice Program',
      'Tech Stewardship for the Energy Transition',
    ]);
    expect(model.keywords).toEqual(content.skills.flatMap((s) => s.items));
  });

  it('has a public header of email, LinkedIn, the site host and location', () => {
    expect(model.name).toBe('Chukwuemeka Nduka-Nwagbo');
    expect(model.contact).toEqual([
      { kind: 'email', text: 'cndukanwagbo@mun.ca', href: 'mailto:cndukanwagbo@mun.ca' },
      {
        kind: 'linkedin',
        text: 'linkedin.com/in/emekanduka',
        href: 'https://linkedin.com/in/emekanduka',
      },
      {
        kind: 'site',
        text: 'emeka-nduka-nwagbo.netlify.app',
        href: 'https://emeka-nduka-nwagbo.netlify.app',
      },
      { kind: 'location', text: "St. John's, NL" },
    ]);
    expect(JSON.stringify(model)).not.toContain('[placeholder');
  });

  it('leaves the site host out while SITE_URL is a placeholder', () => {
    const c = clone();
    c.meta.siteUrl = 'https://[placeholder: netlify-subdomain].netlify.app';
    expect(printModel(c, { now: OCT_2026 }).contact.map((i) => i.kind)).toEqual([
      'email',
      'linkedin',
      'location',
    ]);
  });

  it('adds the site host before the location once SITE_URL is real', () => {
    const c = clone();
    c.meta.siteUrl = 'https://emeka.netlify.app';
    expect(printModel(c, { now: OCT_2026 }).contact.map((i) => i.text)).toEqual([
      'cndukanwagbo@mun.ca',
      'linkedin.com/in/emekanduka',
      'emeka.netlify.app',
      "St. John's, NL",
    ]);
    expect(printSiteHost('https://[placeholder: netlify-subdomain].netlify.app')).toBeUndefined();
    expect(linkedinDisplay('https://www.linkedin.com/in/emekanduka/')).toBe(
      'linkedin.com/in/emekanduka',
    );
  });

  it('prepends the phone only when the private build passes one', () => {
    expect(JSON.stringify(model)).not.toMatch(PHONE);
    expect(model.contact.some((i) => i.kind === 'phone')).toBe(false);
    const phone = fakePhone();
    const priv = printModel(content, { now: OCT_2026, phone });
    expect(priv.contact[0]).toEqual({ kind: 'phone', text: phone });
    expect(priv.contact.slice(1)).toEqual(model.contact);
  });

  it('lists trim candidates by priority 3 then 2, oldest entries first, never a priority 1', () => {
    expect(model.trimCandidates.map((t) => `${t.id} ${t.n} p${t.priority}`)).toEqual([
      'wailo 2 p3',
      'mysa 4 p3',
      'sdsj 1 p3',
      'wailo 3 p2',
      'mysa 3 p2',
      'verafin 3 p2',
      'verafin 2 p2',
      'safe-sip 1 p2',
      'klarup 2 p2',
    ]);
  });

  it("never names a work entry's first printed bullet, so a work entry keeps one", () => {
    const c = clone();
    for (const w of c.experiences) for (const b of w.bullets) b.priority = 3;
    const named = printModel(c, { now: OCT_2026 }).trimCandidates;
    for (const w of c.experiences) {
      const first = w.bullets.findIndex((b) => b.print) + 1;
      expect(
        named.some((t) => t.id === w.id && t.n === first),
        w.id,
      ).toBe(false);
    }
    expect(named.some((t) => t.id === 'cfia')).toBe(false);
  });

  it('has no em dash and no en dash outside date ranges', () => {
    const json = JSON.stringify(model);
    expect(json).not.toContain(EM_DASH);
    const dates = model.sections.flatMap((s) =>
      s.kind === 'experience' || s.kind === 'volunteer' ? s.entries.map((e) => e.dates.text) : [],
    );
    const withoutDates = dates.reduce((acc, d) => acc.replaceAll(d, ''), json);
    expect(withoutDates).not.toContain(EN_DASH);
  });
});
