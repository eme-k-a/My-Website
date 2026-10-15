// Track selectors (ARCHITECTURE §3.7, EXPERIENCE §3.1). Their signatures are frozen at
// contracts-v1. WP-03 appended the copy selectors (displayName, heroLines, stopCards,
// threeDStrings); WP-04 adds printModel.
import {
  duration,
  formatLocation,
  formatMonth,
  formatRange,
  isCurrent,
  isExpected,
  toYearMonth,
  ym,
} from './format';
import { doorId, type ExhibitId, type StopId, type TrackId, type WingId } from './ids';
import type { Bullet, Content, Copy, DateRange, ExhibitEntry, Work } from './types';

// Content ids are validated against EXHIBIT_IDS by the content tests, so the casts below are safe.
const asExhibit = (id: string) => id as ExhibitId;

/** `lobby`, each work id followed by the doors of the wings that follow it, education, certifications, `desk`. */
export function mainTrack(c: Content): StopId[] {
  const stops: StopId[] = ['lobby'];
  for (const work of c.experiences) {
    stops.push(asExhibit(work.id));
    for (const wing of c.wings) if (wing.after === work.id) stops.push(doorId(wing.id));
  }
  for (const edu of c.education) stops.push(asExhibit(edu.id));
  stops.push(asExhibit(c.certifications.id), 'desk');
  return stops;
}

/** `[<wing>-door, ...items]`: the door pose is index 0 of its wing track. */
export function wingTrack(c: Content, wingId: WingId): StopId[] {
  const wing = c.wings.find((w) => w.id === wingId);
  if (!wing) throw new Error(`No wing '${wingId}' in content`);
  return [doorId(wing.id), ...wing.items.map(asExhibit)];
}

/** The track a stop lives on: a wing for wing items, otherwise `main` (doors are on main). */
export function trackOf(c: Content, id: StopId): TrackId {
  const wing = c.wings.find((w) => w.items.includes(id));
  if (wing) return wing.id;
  if (mainTrack(c).includes(id)) return 'main';
  throw new Error(`Unknown stop '${id}'`);
}

/** Catalogue order: main-track exhibits with each wing's items right after its door. */
export function readingOrder(c: Content): ExhibitId[] {
  const order: ExhibitId[] = [];
  for (const stop of mainTrack(c)) {
    const wing = c.wings.find((w) => doorId(w.id) === stop);
    if (wing) order.push(...wing.items.map(asExhibit));
    else if (stop !== 'lobby' && stop !== 'desk') order.push(stop as ExhibitId);
  }
  return order;
}

/** The content entry behind an exhibit id. */
export function entryById(c: Content, id: ExhibitId): ExhibitEntry {
  const entries: ExhibitEntry[] = [
    ...c.experiences,
    ...c.projects,
    ...c.volunteer,
    ...c.education,
    c.certifications,
  ];
  const entry = entries.find((e) => e.id === id);
  if (!entry) throw new Error(`No content entry for exhibit '${id}'`);
  return entry;
}

/**
 * "01" to "06" in main-track order; wing items "P1", "P2", "V1", "V2" (the wing's first letter).
 * Displayed as "No. 01" or "No. P1". Computed, never stored.
 */
export function exhibitNumber(c: Content, id: ExhibitId): string {
  const wing = c.wings.find((w) => w.items.includes(id));
  if (wing) return `${wing.id.charAt(0).toUpperCase()}${wing.items.indexOf(id) + 1}`;
  const mainExhibits = mainTrack(c).filter(
    (s) => s !== 'lobby' && s !== 'desk' && !c.wings.some((w) => doorId(w.id) === s),
  );
  const index = mainExhibits.indexOf(id);
  if (index < 0) throw new Error(`Unknown exhibit '${id}'`);
  return String(index + 1).padStart(2, '0');
}

// ---------------------------------------------------------------------------------------------
// Copy selectors (WP-03): every surface derives these from content and the build date, so numbers,
// pills, durations and "expected" are never stored (EXPERIENCE §5.8, §8.1; ARCHITECTURE §3.7).

/** "Chukwuemeka (Emeka) Nduka-Nwagbo": the first word of the name, the preferred name, the rest. */
export function displayName(c: Content): string {
  const [first = '', ...rest] = c.contact.name.split(' ');
  if (first === c.contact.preferredName) return c.contact.name;
  return [`${first} (${c.contact.preferredName})`, ...rest].join(' ');
}

/** The organization an entry belongs to: org, project name, institution, or the cabinet name. */
export function organizationOf(entry: ExhibitEntry): string {
  switch (entry.kind) {
    case 'work':
    case 'volunteer':
      return entry.org;
    case 'project':
      return entry.name;
    case 'education':
      return entry.institution;
    case 'certifications':
      return entry.exhibit.label ?? 'Certifications';
  }
}

/** The big 3D wall label (EXPERIENCE §5.4), before uppercasing: `exhibit.label` or the organization. */
export function wallLabelOf(entry: ExhibitEntry): string {
  return entry.exhibit.label ?? organizationOf(entry);
}

function newestWork(c: Content, now: Date): Work {
  const today = ym(toYearMonth(now));
  const started = c.experiences.find((w) => ym(w.dates.start) <= today);
  const newest = started ?? c.experiences[0];
  if (!newest) throw new Error('Content has no work entry');
  return newest;
}

/**
 * The recruiter fast path (EXPERIENCE §8.1): `[roleLine, educationLine]`. The role line is the
 * current work entry's short role and organization, or "Most recently: ..." when none is current;
 * the education line drops "expected" from the graduation month on.
 */
export function heroLines(c: Content, now: Date): [string, string] {
  const current = c.experiences.find((w) => isCurrent(w, now));
  const work = current ?? newestWork(c, now);
  const role = `${work.shortRole ?? work.role}, ${work.org}`;
  const edu = c.education[0];
  if (!edu) throw new Error('Content has no education entry');
  const month = formatMonth(edu.graduation);
  const education = [
    edu.shortDegree ?? edu.degree,
    edu.shortInstitution ?? edu.institution,
    isExpected(edu, now) ? `expected ${month}` : month,
  ].join(', ');
  return [current ? role : `Most recently: ${role}`, education];
}

/**
 * Title and meta description of the classic page `/resume/` (CONTENT_DRAFT §6.6, ARCHITECTURE
 * §11.1), built from the display name and the education entry, so they follow content updates.
 * Before the graduation month he is a "student at" the institution, from then on a "graduate of"
 * it, the same switch that drops "expected" from heroLines.
 */
export function resumePageMeta(c: Content, now: Date): { title: string; description: string } {
  const edu = c.education[0];
  if (!edu) throw new Error('Content has no education entry');
  const name = displayName(c);
  const standing = isExpected(edu, now) ? 'student at' : 'graduate of';
  return {
    title: `Resume | ${name}`,
    description: `Resume of ${name}: ${edu.shortDegree ?? edu.degree} ${standing} ${edu.institution}. Experience, projects, skills and PDF.`,
  };
}

export type StatusPill = 'ON VIEW NOW' | 'ONGOING';

/** A card's call to action: a label and, for links, where it goes. */
export interface Cta {
  label: string;
  href: string;
}

/** The lobby section's card is the hero (EXPERIENCE §3.2, §8.1). */
export interface LobbyCard {
  kind: 'lobby';
  id: 'lobby';
  track: 'main';
  eyebrow: string;
  name: string;
  roleLine: string;
  educationLine: string;
  headline: string;
  intro: Copy;
  hint: string;
}

/** An exhibit placard (EXPERIENCE §5.8), fields in display order. */
export interface ExhibitCard {
  kind: 'exhibit';
  id: ExhibitId;
  track: TrackId;
  entryKind: ExhibitEntry['kind'];
  /** "01" or "P1". */
  number: string;
  /** "No. 01" or "No. P1". */
  numberLabel: string;
  /** Only while the entry is current: "ON VIEW NOW", or "ONGOING" for an open-ended non-work role. */
  pill?: StatusPill;
  /** The artwork title. */
  title: string;
  /** Omitted while unknown (projects without a role). */
  role?: string;
  organization: string;
  /** formatLocation(), "Project" for projects, omitted for the certifications cabinet. */
  location?: string;
  /** organization and location joined with ", ". */
  orgLine: string;
  /** formatRange(), "Expected May 2027" for the degree; omitted while dates are unknown. */
  dates?: string;
  /** duration(), shown as "Dimensions"; omitted while the start is unknown. */
  duration?: string;
  /** The first 4 tags (the dialog shows all). */
  medium: string[];
  caption: string;
  cta: Cta;
  /** exhibit.draft: the title, caption, tags and object text await approval. */
  draft: boolean;
}

/** A wing door card (EXPERIENCE §5.8, §8.4). */
export interface DoorCard {
  kind: 'door';
  id: `${WingId}-door`;
  track: 'main';
  wing: WingId;
  /** "Projects wing". */
  title: string;
  /** "2 exhibits". */
  count: string;
  /** One link per wing exhibit: "The Climb, KlarUp" to /exhibit/klarup/. */
  links: (Cta & { id: ExhibitId })[];
  cta: { label: string };
}

/** The front desk card (EXPERIENCE §8.4). Button labels are UI copy (R6). */
export interface DeskCard {
  kind: 'desk';
  id: 'desk';
  track: 'main';
  headline: string;
  body: Copy;
  footnote: string;
  email: string;
  linkedin: string;
  github?: string;
}

export type StopCard = LobbyCard | ExhibitCard | DoorCard | DeskCard;

const COUNT_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const MEDIUM_ON_CARD = 4;

function statusPill(entry: ExhibitEntry, now: Date): StatusPill | undefined {
  if (!('dates' in entry) || entry.dates === undefined) return undefined;
  const dates: DateRange = entry.dates;
  if (!isCurrent({ dates }, now)) return undefined;
  return entry.kind !== 'work' && dates.end === 'present' ? 'ONGOING' : 'ON VIEW NOW';
}

function exhibitCard(c: Content, id: ExhibitId, track: TrackId, now: Date): ExhibitCard {
  const entry = entryById(c, id);
  const number = exhibitNumber(c, id);
  let role: string | undefined;
  let location: string | undefined;
  let dates: string | undefined;
  let length: string | undefined;
  let organization = organizationOf(entry);
  switch (entry.kind) {
    case 'work':
    case 'volunteer':
      role = entry.role;
      location = formatLocation(entry.location);
      dates = formatRange(entry.dates);
      length = duration(entry.dates, now);
      break;
    case 'project':
      role = entry.role;
      location = 'Project';
      if (entry.dates) {
        dates = formatRange(entry.dates);
        length = duration(entry.dates, now);
      }
      break;
    case 'education': {
      role = entry.degree;
      location = formatLocation(entry.location);
      const month = formatMonth(entry.graduation);
      dates = isExpected(entry, now) ? `Expected ${month}` : month;
      if (entry.start !== undefined) {
        // Time spent so far: up to the build month, never past graduation.
        const end =
          ym(toYearMonth(now)) < ym(entry.graduation) ? toYearMonth(now) : entry.graduation;
        length = duration({ start: entry.start, end }, now);
      }
      break;
    }
    case 'certifications': {
      const n = entry.items.length;
      role = `${COUNT_WORDS[n] ?? String(n)} ${n === 1 ? 'credential' : 'credentials'}`;
      organization = entry.items.map((item) => item.name).join('; ');
      const issued = entry.items.map((item) => item.date);
      if (issued.every((d): d is string => d !== undefined)) {
        const sorted = [...issued].sort();
        dates = formatRange({ start: sorted[0]!, end: sorted[sorted.length - 1]! });
      }
      break;
    }
  }
  const pill = statusPill(entry, now);
  return {
    kind: 'exhibit',
    id,
    track,
    entryKind: entry.kind,
    number,
    numberLabel: `No. ${number}`,
    ...(pill !== undefined && { pill }),
    title: entry.exhibit.title,
    ...(role !== undefined && { role }),
    organization,
    ...(location !== undefined && { location }),
    orgLine: location === undefined ? organization : `${organization}, ${location}`,
    ...(dates !== undefined && { dates }),
    ...(length !== undefined && { duration: length }),
    medium: entry.exhibit.tags.slice(0, MEDIUM_ON_CARD),
    caption: entry.exhibit.caption,
    cta: { label: 'Read the story', href: `/exhibit/${id}/` },
    draft: entry.exhibit.draft,
  };
}

function doorCard(c: Content, wingId: WingId): DoorCard {
  const wing = c.wings.find((w) => w.id === wingId);
  if (!wing) throw new Error(`No wing '${wingId}' in content`);
  const n = wing.items.length;
  return {
    kind: 'door',
    id: doorId(wing.id),
    track: 'main',
    wing: wing.id,
    title: `${wing.title} wing`,
    count: `${n} ${n === 1 ? 'exhibit' : 'exhibits'}`,
    links: wing.items.map((item) => {
      const entry = entryById(c, asExhibit(item));
      return {
        id: asExhibit(item),
        label: `${entry.exhibit.title}, ${organizationOf(entry)}`,
        href: `/exhibit/${item}/`,
      };
    }),
    cta: { label: 'Step inside' },
  };
}

/**
 * View models for every stop card, in prerendered section order: the main track with each wing's
 * exhibits right after its door (EXPERIENCE §3.3). Dates, durations and pills follow `now`.
 */
export function stopCards(c: Content, now: Date): StopCard[] {
  const [roleLine, educationLine] = heroLines(c, now);
  const cards: StopCard[] = [];
  for (const stop of mainTrack(c)) {
    const wing = c.wings.find((w) => doorId(w.id) === stop);
    if (stop === 'lobby') {
      cards.push({
        kind: 'lobby',
        id: 'lobby',
        track: 'main',
        eyebrow: c.gallery.lobby.eyebrow,
        name: displayName(c),
        roleLine,
        educationLine,
        headline: c.gallery.lobby.headline,
        intro: c.gallery.lobby.intro,
        hint: c.gallery.lobby.hint,
      });
    } else if (stop === 'desk') {
      cards.push({
        kind: 'desk',
        id: 'desk',
        track: 'main',
        headline: c.gallery.desk.headline,
        body: c.gallery.desk.body,
        footnote: c.gallery.desk.footnote,
        email: `mailto:${c.contact.email}`,
        linkedin: c.contact.linkedin,
        ...(c.contact.github !== undefined && { github: c.contact.github }),
      });
    } else if (wing) {
      cards.push(doorCard(c, wing.id));
      for (const item of wing.items) cards.push(exhibitCard(c, asExhibit(item), wing.id, now));
    } else {
      cards.push(exhibitCard(c, stop as ExhibitId, 'main', now));
    }
  }
  return cards;
}

export type ThreeDFont = 'serif' | 'sans';

/** One string drawn as 3D text, with the font troika uses for it (EXPERIENCE §5.4, §7.7). */
export interface ThreeDString {
  kind: 'number' | 'organization' | 'room' | 'sign' | 'year';
  text: string;
  /** 'serif' is Instrument Serif 400; 'sans' is IBM Plex Sans 500. */
  font: ThreeDFont;
  /** The exhibit, door or fixture the label belongs to. */
  for: string;
}

/**
 * Every string the scene draws as 3D text (EXPERIENCE §5.4): exhibit numbers, uppercase
 * organization labels, door room names, "FOUNDATIONS", "COMMIT HISTORY", the end-wall line and
 * the year numerals. With `now`, the years are the strips the layout draws (the build year down to
 * the oldest work start year, EXPERIENCE §6.9); without it, the newest year in the work dates
 * stands in for the build year. `scripts/check-glyphs.ts` checks each code point in its font.
 */
export function threeDStrings(c: Content, now?: Date): ThreeDString[] {
  const strings: ThreeDString[] = [];
  for (const id of readingOrder(c)) {
    const entry = entryById(c, id);
    strings.push({ kind: 'number', text: exhibitNumber(c, id), font: 'serif', for: id });
    strings.push({
      kind: 'organization',
      text: wallLabelOf(entry).toUpperCase(),
      font: 'sans',
      for: id,
    });
  }
  for (const wing of c.wings) {
    strings.push({
      kind: 'room',
      text: wing.title.toUpperCase(),
      font: 'sans',
      for: doorId(wing.id),
    });
  }
  strings.push(
    { kind: 'sign', text: 'FOUNDATIONS', font: 'sans', for: 'foundations' },
    { kind: 'sign', text: c.gallery.title.toUpperCase(), font: 'serif', for: 'lobby' },
    { kind: 'sign', text: c.gallery.desk.headline, font: 'serif', for: 'desk' },
  );
  const years = c.experiences.flatMap((w) => [w.dates.start, w.dates.end]);
  const yearOf = (yearMonth: string) => Math.floor(ym(yearMonth) / 12);
  const known = years.filter((d) => d !== 'present').map(yearOf);
  const newest = now ? now.getUTCFullYear() : Math.max(...known);
  const oldest = Math.min(...c.experiences.map((w) => yearOf(w.dates.start)));
  for (let year = newest; year >= oldest; year--) {
    strings.push({ kind: 'year', text: String(year), font: 'sans', for: 'year-strip' });
  }
  return strings;
}

// ---------------------------------------------------------------------------------------------
// Print model (WP-04, ARCHITECTURE §3.7, §4): the one selection behind dist/resume.pdf, the private
// PDF and resume/resume.tex. Only `print: true` bullets; project and volunteer entries with no
// printed bullet are left out (a work entry always keeps one, schema rule 5).

/** A date column in both spellings: `text` for the PDF (en dash), `tex` for resume.tex (`--`). */
export interface PrintDates {
  text: string;
  tex: string;
}

/** One item of the contact row under the name, in print order. */
export interface PrintContactItem {
  kind: 'phone' | 'email' | 'linkedin' | 'site' | 'location';
  text: string;
  href?: string;
}

/** A printed bullet. `n` is its 1-based position among the entry's bullets in content. */
export interface PrintBullet {
  text: string;
  n: number;
  priority: 1 | 2 | 3;
}

/** A work or volunteer entry: bold role and dates, then italic organization and location. */
export interface PrintEntry {
  id: string;
  role: string;
  dates: PrintDates;
  org: string;
  location: string;
  bullets: PrintBullet[];
}

/** Institution and location, then the degree and "Expected Graduation: May 2027". */
export interface PrintEducation {
  id: string;
  institution: string;
  location: string;
  degree: string;
  dates: PrintDates;
}

/** "KlarUp: Collaborative Productivity App" with its stack; dates only once they are known. */
export interface PrintProject {
  id: string;
  name: string;
  stack: string;
  dates?: PrintDates;
  bullets: PrintBullet[];
}

/** "Languages" and "Python, C++, ...". */
export interface PrintSkillLine {
  label: string;
  items: string;
}

export type PrintSection =
  | { kind: 'education'; title: 'Education'; entries: PrintEducation[] }
  | { kind: 'experience'; title: 'Experience'; entries: PrintEntry[] }
  | { kind: 'skills'; title: 'Technical Skills'; lines: PrintSkillLine[] }
  | { kind: 'projects'; title: 'Projects'; entries: PrintProject[] }
  | { kind: 'volunteer'; title: 'Volunteer Experience'; entries: PrintEntry[] }
  | { kind: 'certifications'; title: 'Certifications'; items: string[] };

/** A printed bullet the overflow gate may name; trimming is a content edit, never automatic. */
export interface TrimCandidate {
  id: string;
  n: number;
  priority: 2 | 3;
}

export interface PrintModel {
  name: string;
  contact: PrintContactItem[];
  /** Education, Experience, Technical Skills, Projects, Volunteer Experience, Certifications. */
  sections: PrintSection[];
  /** Priority 3 then 2; oldest entries first; never a work entry's first printed bullet. */
  trimCandidates: TrimCandidate[];
  /** Every skill item, for the PDF Keywords field. */
  keywords: string[];
}

export interface PrintOptions {
  /** Private build only (`npm run resume:private`): prepended to the contact row. */
  phone?: string;
  /** The build date; decides "Expected Graduation". Scripts pass buildDateFromEnv(). */
  now?: Date;
}

const PLACEHOLDER_MARK = '[placeholder';

const printDates = (r: DateRange): PrintDates => ({
  text: formatRange(r),
  tex: formatRange(r, { style: 'tex' }),
});

const printedBullets = (bullets: Bullet[]): PrintBullet[] =>
  bullets.flatMap((b, i) => (b.print ? [{ text: b.text, n: i + 1, priority: b.priority }] : []));

/** "linkedin.com/in/emekanduka": no scheme, no www, no trailing slash. */
export function linkedinDisplay(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
}

/** The site host for the header, or undefined while SITE_URL is still a placeholder. */
export function printSiteHost(siteUrl: string): string | undefined {
  if (siteUrl.includes(PLACEHOLDER_MARK)) return undefined;
  return siteUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
}

function printContact(c: Content, phone: string | undefined): PrintContactItem[] {
  const items: PrintContactItem[] = [];
  if (phone !== undefined) items.push({ kind: 'phone', text: phone });
  items.push({ kind: 'email', text: c.contact.email, href: `mailto:${c.contact.email}` });
  items.push({
    kind: 'linkedin',
    text: linkedinDisplay(c.contact.linkedin),
    href: c.contact.linkedin,
  });
  const host = printSiteHost(c.meta.siteUrl);
  if (host !== undefined) items.push({ kind: 'site', text: host, href: c.meta.siteUrl });
  items.push({ kind: 'location', text: c.contact.location });
  return items;
}

const END_OF_TIME = Number.MAX_SAFE_INTEGER;

export interface TrimSource {
  id: string;
  kind: 'work' | 'project' | 'volunteer';
  bullets: PrintBullet[];
  /** Month index of the end ('present' sorts last), undefined for undated projects. */
  end?: number;
  start?: number;
}

/**
 * Overflow-gate candidates: printed bullets of priority 3, then 2; within a priority the oldest
 * entries first (earliest end month, then earliest start; undated projects after dated entries),
 * and within an entry the last bullet first. A work entry's first printed bullet is never listed,
 * so following the list can never leave a work entry without a printed bullet.
 */
export function trimCandidates(entries: TrimSource[]): TrimCandidate[] {
  const age = (e: TrimSource): [number, number] => [
    e.end ?? END_OF_TIME + 1,
    e.start ?? END_OF_TIME,
  ];
  const ordered = [...entries].sort((a, b) => {
    const [ae, as] = age(a);
    const [be, bs] = age(b);
    return ae - be || as - bs;
  });
  const out: TrimCandidate[] = [];
  for (const priority of [3, 2] as const) {
    for (const entry of ordered) {
      const keep = entry.kind === 'work' ? entry.bullets[0] : undefined;
      for (const b of [...entry.bullets].reverse()) {
        if (b.priority === priority && b !== keep) out.push({ id: entry.id, n: b.n, priority });
      }
    }
  }
  return out;
}

const ageOf = (r: DateRange | undefined) =>
  r === undefined ? {} : { start: ym(r.start), end: r.end === 'present' ? END_OF_TIME : ym(r.end) };

/**
 * The resume as it prints (ARCHITECTURE §4.1, CONTENT_DRAFT §3): header, then Education,
 * Experience, Technical Skills, Projects, Volunteer Experience and Certifications. The public
 * build never passes `phone`; empty sections are left out.
 */
export function printModel(c: Content, options: PrintOptions = {}): PrintModel {
  const now = options.now ?? new Date();

  const education: PrintEducation[] = c.education.map((e) => {
    const month = formatMonth(e.graduation);
    const dates = isExpected(e, now) ? `Expected Graduation: ${month}` : month;
    return {
      id: e.id,
      institution: e.institution,
      location: formatLocation(e.location),
      degree: e.degree,
      dates: { text: dates, tex: dates },
    };
  });

  const entry = (e: Work | Content['volunteer'][number]): PrintEntry => ({
    id: e.id,
    role: e.role,
    dates: printDates(e.dates),
    org: e.org,
    location: formatLocation(e.location),
    bullets: printedBullets(e.bullets),
  });
  const experience = c.experiences.map(entry);
  const volunteer = c.volunteer.map(entry).filter((e) => e.bullets.length > 0);

  const projects: PrintProject[] = c.projects
    .map((p) => ({
      id: p.id,
      name: `${p.name}: ${p.tagline}`,
      stack: p.stack.join(', '),
      ...(p.dates !== undefined && { dates: printDates(p.dates) }),
      bullets: printedBullets(p.bullets),
    }))
    .filter((p) => p.bullets.length > 0);

  const skills: PrintSkillLine[] = c.skills.map((s) => ({
    label: s.label,
    items: s.items.join(', '),
  }));
  const certifications = c.certifications.items.map((item) => item.name);

  const sections: PrintSection[] = [];
  if (education.length > 0)
    sections.push({ kind: 'education', title: 'Education', entries: education });
  if (experience.length > 0)
    sections.push({ kind: 'experience', title: 'Experience', entries: experience });
  if (skills.length > 0)
    sections.push({ kind: 'skills', title: 'Technical Skills', lines: skills });
  if (projects.length > 0)
    sections.push({ kind: 'projects', title: 'Projects', entries: projects });
  if (volunteer.length > 0)
    sections.push({ kind: 'volunteer', title: 'Volunteer Experience', entries: volunteer });
  if (certifications.length > 0)
    sections.push({ kind: 'certifications', title: 'Certifications', items: certifications });

  const aged: TrimSource[] = [
    ...c.experiences.map((w, i) => ({
      id: w.id,
      kind: 'work' as const,
      bullets: experience[i]?.bullets ?? [],
      ...ageOf(w.dates),
    })),
    ...c.projects.map((p) => ({
      id: p.id,
      kind: 'project' as const,
      bullets: printedBullets(p.bullets),
      ...ageOf(p.dates),
    })),
    ...c.volunteer.map((v) => ({
      id: v.id,
      kind: 'volunteer' as const,
      bullets: printedBullets(v.bullets),
      ...ageOf(v.dates),
    })),
  ];

  return {
    name: c.contact.name,
    contact: printContact(c, options.phone),
    sections,
    trimCandidates: trimCandidates(aged),
    keywords: c.skills.flatMap((s) => s.items),
  };
}
