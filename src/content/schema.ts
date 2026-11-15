// Build and test time only. Client code may only `import type` from this file (ARCHITECTURE §3.3,
// §7.5). Frozen at contracts-v1; changes go through R0.
import { z } from 'zod';
import { ym } from './format';

const EM_DASH = '\u2014';
const PHONE = /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/;

export const Line = z
  .string()
  .min(1)
  .refine((s) => s === s.trim(), 'No leading or trailing whitespace')
  .refine(
    (s) => !s.includes(EM_DASH),
    'No em dashes (U+2014): use a comma, colon, parentheses or a hyphen',
  )
  .refine((s) => !PHONE.test(s), 'Phone-number pattern: the phone number is never committed');

export const Id = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'kebab-case id');
export const YearMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'YYYY-MM');
export const DateRange = z.object({
  start: YearMonth,
  end: z.union([YearMonth, z.literal('present')]),
});
export const Tense = z.enum(['present', 'past']);
export const HttpsUrl = z.url({ protocol: /^https$/ });
export const SiteUrl = z
  .string()
  .regex(/^https:\/\/[^/]+$/, 'https origin, no path, no trailing slash');

export const Location = z.object({
  city: Line,
  region: Line,
  mode: z.enum(['on-site', 'hybrid', 'remote']).default('on-site'),
});
export const Link = z.object({ label: Line, href: HttpsUrl });

const draft = z.boolean().default(false);
/** First-person or unconfirmed copy. RELEASE=1 fails while any draft is true. */
export const Copy = z.object({ text: Line, draft });

export const Bullet = z.object({
  text: Line,
  print: z.boolean().default(true), // included in the PDF and resume.tex
  priority: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2), // trim guidance: 1 keep, 3 cut first
  draft,
});

export const StoryBlock = z.discriminatedUnion('type', [
  z.object({ type: z.literal('p'), text: Line, draft }),
  z.object({ type: z.literal('list'), items: z.array(Line).min(1), draft }),
  z.object({
    type: z.literal('figure'),
    src: z.string().regex(/^\/images\/[a-z0-9-]+\.(avif|webp|jpg|png)$/),
    alt: Line,
    caption: Line.optional(),
    draft,
  }),
]);

export const Exhibit = z.object({
  title: Line.max(40), // concept title, e.g. "The Reporting Engine"
  label: Line.max(24).optional(), // big 3D organization label; defaults to org or name
  caption: Line.max(140), // one line: cards, OG description, meta description
  story: z.array(StoryBlock).min(1),
  object: Copy, // "The object" in the dialog: the one-sentence object description (EXPERIENCE §4); draft until the built object is confirmed
  curatorNote: Copy.optional(), // optional pull quote under "Curator's note", above the story; stored only once Emeka writes it
  takeaway: Copy.optional(), // "What I took away"
  tags: z.array(Line).max(8).default([]), // shown as "Medium"
  links: z.array(Link).default([]),
  draft, // R0 ruling (PLAN Addendum): covers title, caption, tags and object text; RELEASE=1 check:copy fails while true
});

const Bullets = z.array(Bullet).min(1);

export const Work = z.object({
  id: Id,
  kind: z.literal('work'),
  role: Line,
  shortRole: Line.optional(), // hero line, e.g. "Software Development Co-op"
  org: Line,
  employment: z.enum(['co-op', 'internship', 'full-time', 'part-time']),
  location: Location,
  dates: DateRange,
  tense: Tense, // build fails if 'present' after dates.end (§3.6)
  bullets: Bullets,
  exhibit: Exhibit,
});

export const Project = z.object({
  id: Id,
  kind: z.literal('project'),
  name: Line, // "KlarUp"
  tagline: Line, // "Collaborative Productivity App"
  role: Line.optional(), // [placeholder] until Emeka supplies it
  stack: z.array(Line).min(1),
  dates: DateRange.optional(),
  tense: Tense.optional(),
  bullets: Bullets,
  exhibit: Exhibit,
});

export const Volunteer = z.object({
  id: Id,
  kind: z.literal('volunteer'),
  role: Line,
  org: Line,
  location: Location,
  dates: DateRange,
  tense: Tense,
  bullets: Bullets,
  exhibit: Exhibit,
});

export const Education = z.object({
  id: Id,
  kind: z.literal('education'),
  institution: Line,
  degree: Line,
  shortInstitution: Line.optional(), // hero short form, e.g. "MUN" (PLAN §2)
  shortDegree: Line.optional(), // hero short form, e.g. "B.Eng Computer Engineering"
  location: Location,
  start: YearMonth.optional(), // [placeholder] until supplied
  graduation: YearMonth, // "expected" is derived, never stored
  exhibit: Exhibit,
});

export const Certification = z.object({
  name: Line,
  issuer: Line.optional(),
  date: YearMonth.optional(),
  url: HttpsUrl.optional(),
});
export const Certifications = z.object({
  id: z.literal('certifications'),
  kind: z.literal('certifications'),
  items: z.array(Certification).min(1),
  exhibit: Exhibit,
});

export const Wing = z.object({
  id: z.enum(['projects', 'volunteer']),
  title: Line, // door sign, e.g. "Projects"
  after: Id, // main-track work id the door follows
  side: z.enum(['left', 'right']), // which aisle wall the door is in
  items: z.array(Id).min(1).max(4), // newest first
});

export const SkillLine = z.object({ label: Line, items: z.array(Line).min(1) });

export const ResumeShape = z.object({
  meta: z.object({
    siteUrl: SiteUrl, // = SITE_URL from site.ts
    title: Line.max(60),
    description: Line.max(160),
    lang: z.literal('en-CA'),
  }),
  contact: z.strictObject({
    // strict: a `phone` key is a parse error
    name: Line, // full name for the PDF and JSON-LD
    preferredName: Line, // "Emeka"
    email: z.email(),
    linkedin: HttpsUrl, // no trailing slash
    github: HttpsUrl.optional(),
    location: Line,
    phoneInPublicPdf: z.literal(false), // Addendum: dist/ never contains the phone
  }),
  gallery: z.object({
    title: Line, // "Commit History"
    lobby: z.object({ eyebrow: Line, headline: Line, intro: Copy, hint: Line }),
    desk: z.object({ headline: Line, body: Copy, footnote: Line }),
  }),
  experiences: z.array(Work).min(1), // newest first; the main aisle
  projects: z.array(Project),
  volunteer: z.array(Volunteer),
  education: z.array(Education).min(1), // main track after the last work exhibit
  certifications: Certifications,
  skills: z.array(SkillLine).min(1).max(4),
  wings: z.array(Wing),
});

type ResumeOutput = z.output<typeof ResumeShape>;
type Path = (string | number)[];

const RESERVED_IDS = new Set([
  'lobby',
  'desk',
  'projects-door',
  'volunteer-door',
  'main',
  'projects',
  'volunteer',
]);

/** Every string anywhere in the value, with its path (rule 9's deep walk). */
function* strings(value: unknown, path: Path): Generator<[string, Path]> {
  if (typeof value === 'string') {
    yield [value, path];
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) yield* strings(value[i], [...path, i]);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) yield* strings(child, [...path, key]);
  }
}

/** Non-increasing by `dates.start`, newest first (rule 4). */
function checkNewestFirst(
  ctx: z.RefinementCtx<ResumeOutput>,
  entries: { dates?: { start: string } | undefined }[],
  path: Path,
): void {
  let previous: { start: number; index: number } | null = null;
  entries.forEach((entry, index) => {
    if (!entry.dates) return;
    const start = ym(entry.dates.start);
    if (previous && start > previous.start) {
      ctx.addIssue({
        code: 'custom',
        path: [...path, index, 'dates', 'start'],
        message: `Newest first: starts after entry ${previous.index}`,
      });
    }
    previous = { start, index };
  });
}

/** The nine rules of ARCHITECTURE §3.4. Each issue carries the exact path. */
function refineResume(r: ResumeOutput, ctx: z.RefinementCtx<ResumeOutput>): void {
  const issue = (path: Path, message: string) => ctx.addIssue({ code: 'custom', path, message });

  const groups = [
    ['experiences', r.experiences],
    ['projects', r.projects],
    ['volunteer', r.volunteer],
    ['education', r.education],
  ] as const;

  // 1. Unique ids across every entry, the certifications block included.
  const seen = new Map<string, string>();
  const claim = (id: string, path: Path) => {
    const first = seen.get(id);
    if (first !== undefined) issue([...path, 'id'], `Duplicate id '${id}' (also at ${first})`);
    else seen.set(id, path.join('.'));
  };
  for (const [key, entries] of groups) entries.forEach((e, i) => claim(e.id, [key, i]));
  claim(r.certifications.id, ['certifications']);

  // 2. Reserved ids; only the certifications block may use 'certifications'.
  for (const [key, entries] of groups) {
    entries.forEach((e, i) => {
      if (RESERVED_IDS.has(e.id) || e.id === 'certifications') {
        issue([key, i, 'id'], `Reserved id '${e.id}'`);
      }
    });
  }

  // 3. Date sanity.
  const checkRange = (range: { start: string; end: string } | undefined, path: Path) => {
    if (range && range.end !== 'present' && ym(range.end) < ym(range.start)) {
      issue([...path, 'dates'], 'Date range ends before it starts');
    }
  };
  r.experiences.forEach((e, i) => checkRange(e.dates, ['experiences', i]));
  r.projects.forEach((e, i) => checkRange(e.dates, ['projects', i]));
  r.volunteer.forEach((e, i) => checkRange(e.dates, ['volunteer', i]));
  r.education.forEach((e, i) => {
    if (e.start !== undefined && ym(e.start) >= ym(e.graduation)) {
      issue(['education', i, 'start'], 'Education start must be before graduation');
    }
  });

  // 4. Newest first.
  checkNewestFirst(ctx, r.experiences, ['experiences']);
  checkNewestFirst(ctx, r.volunteer, ['volunteer']);
  checkNewestFirst(ctx, r.projects, ['projects']);

  // 5. Every work entry has at least one printed bullet.
  r.experiences.forEach((e, i) => {
    if (!e.bullets.some((b) => b.print)) {
      issue(
        ['experiences', i, 'bullets'],
        'A work entry needs at least one bullet with print: true',
      );
    }
  });

  // 6. Wings resolve.
  const workIds = r.experiences.map((e) => e.id);
  const projectIds = new Set(r.projects.map((e) => e.id));
  const volunteerIds = new Set(r.volunteer.map((e) => e.id));
  const wingIds = new Set<string>();
  const afters = new Map<string, string>();
  const placed = new Map<string, number>();
  r.wings.forEach((wing, i) => {
    if (wingIds.has(wing.id)) issue(['wings', i, 'id'], `Duplicate wing '${wing.id}'`);
    wingIds.add(wing.id);
    const k = workIds.indexOf(wing.after);
    if (k < 0) issue(['wings', i, 'after'], `Wing '${wing.id}': '${wing.after}' is not a work id`);
    else if (k === workIds.length - 1) {
      issue(
        ['wings', i, 'after'],
        `Wing '${wing.id}': '${wing.after}' is the last work entry; a door needs a main exhibit on both sides`,
      );
    }
    const sharing = afters.get(wing.after);
    if (sharing !== undefined) {
      issue(
        ['wings', i, 'after'],
        `Wings '${sharing}' and '${wing.id}' share after '${wing.after}'`,
      );
    }
    afters.set(wing.after, wing.id);
    const pool = wing.id === 'projects' ? projectIds : volunteerIds;
    const pooled = wing.id === 'projects' ? r.projects : r.volunteer;
    wing.items.forEach((item, j) => {
      if (!pool.has(item)) {
        issue(['wings', i, 'items', j], `Wing '${wing.id}': '${item}' is not a ${wing.id} entry`);
      }
      placed.set(item, (placed.get(item) ?? 0) + 1);
    });
    const dated = wing.items
      .map((item) => pooled.find((e) => e.id === item))
      .filter((e) => e?.dates !== undefined);
    for (let j = 1; j < dated.length; j++) {
      const before = dated[j - 1]?.dates;
      const after = dated[j]?.dates;
      if (before && after && ym(after.start) > ym(before.start)) {
        issue(['wings', i, 'items'], `Wing '${wing.id}': items with dates must be newest first`);
      }
    }
  });
  const checkPlaced = (key: 'projects' | 'volunteer', entries: { id: string }[]) => {
    entries.forEach((e, i) => {
      const count = placed.get(e.id) ?? 0;
      if (count !== 1) {
        issue([key, i, 'id'], `'${e.id}' must appear in exactly one wing (found ${count})`);
      }
    });
  };
  checkPlaced('projects', r.projects);
  checkPlaced('volunteer', r.volunteer);

  // 7. The main aisle is work only: no work, education or certifications entry sits in a wing.
  const mainOnly = new Set([...workIds, ...r.education.map((e) => e.id), r.certifications.id]);
  r.wings.forEach((wing, i) => {
    wing.items.forEach((item, j) => {
      if (mainOnly.has(item)) {
        issue(['wings', i, 'items', j], `'${item}' belongs to the main track, not a wing`);
      }
    });
  });

  // 8. Every story has at least one 'p' block.
  const checkStory = (story: { type: string }[], path: Path) => {
    if (!story.some((b) => b.type === 'p')) {
      issue([...path, 'exhibit', 'story'], "A story needs at least one 'p' block");
    }
  };
  for (const [key, entries] of groups)
    entries.forEach((e, i) => checkStory(e.exhibit.story, [key, i]));
  checkStory(r.certifications.exhibit.story, ['certifications']);

  // 9. Phone: contact is strict and phoneInPublicPdf is the literal false (shape above). The deep
  // walk also covers strings that are not a Line (ids, URLs, emails), and em dashes with them.
  for (const [text, path] of strings(r, [])) {
    if (PHONE.test(text)) issue(path, 'Phone-number pattern: the phone number is never committed');
    if (text.includes(EM_DASH)) issue(path, 'No em dashes (U+2014)');
  }
}

export const Resume = ResumeShape.superRefine(refineResume);
