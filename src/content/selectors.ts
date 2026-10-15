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
import type { Content, Copy, DateRange, ExhibitEntry, Work } from './types';

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
