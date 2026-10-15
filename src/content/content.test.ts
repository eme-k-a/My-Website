// Content guards for the real copy (WP-03): order, ids, wings, dashes, phone, flags, captions,
// durations and tense. The schema rules themselves are tested in schema.test.ts.
import { describe, expect, it } from 'vitest';
import { duration, isCurrent } from './format';
import { EXHIBIT_IDS } from './ids';
import { content } from './index';
import { normalize } from './normalize';
import { resume } from './resume';
import { Resume } from './schema';
import { checkTemporal } from './temporal';
import type { Copy, ExhibitEntry } from './types';

const OCT_2026 = new Date('2026-10-15T00:00:00Z');
const JAN_2027 = new Date('2027-01-05T00:00:00Z');
// Spelled as escapes and built at runtime: check-copy scans every tracked file for both.
const EM_DASH = '\u2014';
const PHONE = new RegExp(['\\b\\d{3}', '\\d{3}', '\\d{4}\\b'].join('[-. ]'));
const PLACEHOLDER = '[placeholder';

const entries: ExhibitEntry[] = [
  ...content.experiences,
  ...content.projects,
  ...content.volunteer,
  ...content.education,
  content.certifications,
];
const byId = (id: string) => {
  const entry = entries.find((e) => e.id === id);
  if (!entry) throw new Error(`No entry '${id}'`);
  return entry;
};
const work = (id: string) => {
  const entry = content.experiences.find((e) => e.id === id);
  if (!entry) throw new Error(`No work entry '${id}'`);
  return entry;
};

type Visit = { text: string; path: string; draft: boolean };

/** Every string in the content, with its path and whether an enclosing object is `draft: true`. */
function walk(value: unknown, path = '', draft = false): Visit[] {
  if (typeof value === 'string') return [{ text: value, path, draft }];
  if (Array.isArray(value)) return value.flatMap((v, i) => walk(v, `${path}.${i}`, draft));
  if (value !== null && typeof value === 'object') {
    const here = draft || (value as { draft?: unknown }).draft === true;
    return Object.entries(value).flatMap(([k, v]) => walk(v, path ? `${path}.${k}` : k, here));
  }
  return [];
}
const allStrings = walk(content);

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;

describe('content parses', () => {
  it('passes the schema', () => {
    const result = Resume.safeParse(resume);
    expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(true);
  });

  it('normalize(resume) deep-equals Resume.parse(resume)', () => {
    expect(normalize(resume)).toEqual(Resume.parse(resume));
  });
});

describe('ids, order and wings', () => {
  it('entry ids equal EXHIBIT_IDS, unique, in catalogue groups', () => {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([...EXHIBIT_IDS]);
  });

  it('experiences are newest first: verafin, mysa, wailo, cfia', () => {
    expect(content.experiences.map((e) => e.id)).toEqual(['verafin', 'mysa', 'wailo', 'cfia']);
    const starts = content.experiences.map((e) => e.dates.start);
    expect(starts).toEqual([...starts].sort().reverse());
  });

  it('volunteer entries are newest first: safe-sip, sdsj', () => {
    expect(content.volunteer.map((e) => e.id)).toEqual(['safe-sip', 'sdsj']);
    const starts = content.volunteer.map((e) => e.dates.start);
    expect(starts).toEqual([...starts].sort().reverse());
  });

  it('wings resolve to the right pools', () => {
    const workIds = content.experiences.map((e) => e.id);
    for (const wing of content.wings) {
      expect(workIds).toContain(wing.after);
      expect(wing.after).not.toBe(workIds[workIds.length - 1]);
      const pool = wing.id === 'projects' ? content.projects : content.volunteer;
      for (const item of wing.items) expect(pool.map((e) => e.id)).toContain(item);
    }
    expect(content.wings.map((w) => [w.id, w.after, w.side])).toEqual([
      ['projects', 'verafin', 'left'],
      ['volunteer', 'mysa', 'right'],
    ]);
  });

  it('every project and volunteer entry sits in exactly one wing', () => {
    const placed = content.wings.flatMap((w) => w.items);
    for (const e of [...content.projects, ...content.volunteer]) {
      expect(
        placed.filter((id) => id === e.id),
        e.id,
      ).toHaveLength(1);
    }
  });
});

describe('strings', () => {
  it('no string contains an em dash (U+2014)', () => {
    expect(allStrings.filter((s) => s.text.includes(EM_DASH)).map((s) => s.path)).toEqual([]);
  });

  it('no string matches the phone pattern', () => {
    expect(allStrings.filter((s) => PHONE.test(s.text)).map((s) => s.path)).toEqual([]);
  });

  it('contact has no phone field and keeps the phone out of the public PDF', () => {
    expect(Object.keys(content.contact)).not.toContain('phone');
    expect(content.contact.phoneInPublicPdf).toBe(false);
  });

  it('every placeholder sits in a draft-flagged block or the release-checked site URL', () => {
    const loose = allStrings.filter(
      (s) => s.text.includes(PLACEHOLDER) && !s.draft && s.path !== 'meta.siteUrl',
    );
    expect(loose.map((s) => s.path)).toEqual([]);
  });

  it('no curator note is a placeholder (WP-02 ruling)', () => {
    for (const e of entries) {
      expect(e.exhibit.curatorNote?.text ?? '', e.id).not.toContain(PLACEHOLDER);
    }
  });

  it('meta title and description fit their limits', () => {
    expect(content.meta.title.length).toBeLessThanOrEqual(60);
    expect(content.meta.description.length).toBeLessThanOrEqual(160);
    expect(content.meta.lang).toBe('en-CA');
  });
});

describe('bullets and flags', () => {
  it('every work entry has at least one print: true bullet', () => {
    for (const e of content.experiences) {
      expect(
        e.bullets.some((b) => b.print),
        e.id,
      ).toBe(true);
    }
  });

  it('verafin has the three safe bullets, all draft, priorities 1, 2, 2', () => {
    const verafin = work('verafin');
    expect(verafin.bullets).toHaveLength(3);
    expect(verafin.bullets.every((b) => b.draft)).toBe(true);
    expect(verafin.bullets.map((b) => b.priority)).toEqual([1, 2, 2]);
    expect(verafin.bullets.every((b) => b.print)).toBe(true);
  });

  it('verafin is a draft exhibit (PLAN Addendum)', () => {
    expect(work('verafin').exhibit.draft).toBe(true);
  });

  it('only verafin bullets are draft', () => {
    const drafts = [...content.experiences, ...content.projects, ...content.volunteer].flatMap(
      (e) => e.bullets.filter((b) => b.draft).map(() => e.id),
    );
    expect(new Set(drafts)).toEqual(new Set(['verafin']));
  });

  it('every Finance Tracker bullet is print: false; every other bullet is print: true', () => {
    for (const e of [...content.experiences, ...content.projects, ...content.volunteer]) {
      for (const b of e.bullets) expect(b.print, e.id).toBe(e.id !== 'finance-tracker');
    }
  });

  it('tier-3 trim candidates have priority 3', () => {
    const priority3 = [...content.experiences, ...content.projects, ...content.volunteer].flatMap(
      (e) => e.bullets.flatMap((b, i) => (b.priority === 3 ? [`${e.id}.b${i + 1}`] : [])),
    );
    expect(priority3).toEqual(['mysa.b4', 'wailo.b2', 'finance-tracker.b1', 'sdsj.b1']);
  });

  it('every story block, object, curator note, takeaway, lobby intro and desk body is draft', () => {
    const copies: [string, Copy | { draft: boolean }][] = [
      ['gallery.lobby.intro', content.gallery.lobby.intro],
      ['gallery.desk.body', content.gallery.desk.body],
    ];
    for (const e of entries) {
      e.exhibit.story.forEach((b, i) => copies.push([`${e.id}.story.${i}`, b]));
      copies.push([`${e.id}.object`, e.exhibit.object]);
      if (e.exhibit.curatorNote) copies.push([`${e.id}.curatorNote`, e.exhibit.curatorNote]);
      if (e.exhibit.takeaway) copies.push([`${e.id}.takeaway`, e.exhibit.takeaway]);
    }
    expect(copies.filter(([, c]) => !c.draft).map(([path]) => path)).toEqual([]);
  });

  it('the desk body keeps the target-roles placeholder until Emeka names them', () => {
    expect(content.gallery.desk.body.text).toContain('[placeholder: target roles]');
  });
});

describe('tense', () => {
  const PAST_IRREGULAR = new Set(['Built', 'Led']);
  const isPastVerb = (word: string) => word.endsWith('ed') || PAST_IRREGULAR.has(word);

  it('ongoing roles are present tense and finished roles past tense', () => {
    for (const e of [...content.experiences, ...content.volunteer]) {
      expect(e.tense, e.id).toBe(isCurrent(e, OCT_2026) ? 'present' : 'past');
    }
    for (const p of content.projects) expect(p.tense, p.id).toBe('past');
  });

  it('bullets open with a verb in the entry tense ("Engineer", "Spearhead"; "Built", "Led")', () => {
    for (const e of [...content.experiences, ...content.projects, ...content.volunteer]) {
      for (const b of e.bullets) {
        const verb = b.text.split(' ')[0] ?? '';
        expect(isPastVerb(verb), `${e.id}: ${verb}`).toBe(e.tense === 'past');
      }
    }
  });

  it('checkTemporal passes at 2026-10-15 and fails for verafin at 2027-01-05', () => {
    expect(checkTemporal(content, OCT_2026)).toEqual([]);
    const errors = checkTemporal(content, JAN_2027);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/^verafin: /);
  });
});

describe('exhibits', () => {
  it('captions are one line: at most 18 words and 140 characters', () => {
    for (const e of entries) {
      expect(words(e.exhibit.caption), e.id).toBeLessThanOrEqual(18);
      expect(e.exhibit.caption.length, e.id).toBeLessThanOrEqual(140);
      expect(e.exhibit.caption, e.id).not.toMatch(/\n/);
    }
  });

  it('artwork titles follow EXPERIENCE §4', () => {
    expect(Object.fromEntries(entries.map((e) => [e.id, e.exhibit.title]))).toEqual({
      verafin: 'The Reporting Engine',
      mysa: 'Warm Start',
      wailo: 'The Deep Link',
      cfia: 'The Ticket Spindle',
      klarup: 'The Climb',
      'finance-tracker': 'The Balance',
      'safe-sip': 'Tamper Evident',
      sdsj: 'The Round Table',
      mun: 'Work in Progress',
      certifications: 'The Medal Cabinet',
    });
  });

  it('stories are p blocks of 60 to 110 words in total (CONTENT_DRAFT §5)', () => {
    for (const e of entries) {
      const text = e.exhibit.story.map((b) => (b.type === 'p' ? b.text : '')).join(' ');
      expect(e.exhibit.story.every((b) => b.type === 'p')).toBe(true);
      expect(words(text), e.id).toBeGreaterThanOrEqual(60);
      expect(words(text), e.id).toBeLessThanOrEqual(110);
    }
  });

  it('tags: at most 8 per exhibit, no duplicates', () => {
    for (const e of entries) {
      expect(e.exhibit.tags.length, e.id).toBeGreaterThan(0);
      expect(e.exhibit.tags.length, e.id).toBeLessThanOrEqual(8);
      expect(new Set(e.exhibit.tags).size, e.id).toBe(e.exhibit.tags.length);
    }
  });

  it('links are https only (none until verification links exist)', () => {
    for (const e of entries) {
      for (const link of e.exhibit.links) expect(link.href, e.id).toMatch(/^https:\/\//);
    }
  });

  it('verafin copy never suggests fraud detection or AML models (EXPERIENCE §4.1)', () => {
    const verafin = walk(byId('verafin')).map((s) => s.text);
    for (const text of verafin) {
      expect(text, text).not.toMatch(/\bmodels?\b|\bdetect(s|ed|ing)?\b|\bflag(s|ged)?\b/i);
      const mentions = text.match(/fraud detection/g)?.length ?? 0;
      const supported = text.match(/support(s|ing) fraud detection/g)?.length ?? 0;
      expect(supported, text).toBe(mentions);
    }
  });

  it('mysa never calls Cognito "database management" (PLAN §1 trim 1)', () => {
    for (const s of walk(byId('mysa'))) expect(s.text).not.toMatch(/database management/i);
  });
});

describe('skills', () => {
  it('has the four regrouped lines of CONTENT_DRAFT §3.4', () => {
    expect(content.skills.map((s) => s.label)).toEqual([
      'Languages',
      'Frameworks',
      'Data, Cloud & DevOps',
      'Concepts',
    ]);
    expect(content.skills[3]?.items).not.toContain('Cloud Computing');
    for (const line of content.skills) {
      expect(`${line.label}: ${line.items.join(', ')}`.length).toBeLessThan(92);
    }
  });
});

describe('durations (EXPERIENCE §5.8 required cases)', () => {
  it.each([
    ['verafin', '4 months'],
    ['mysa', '5 months'],
    ['wailo', '4 months'],
    ['cfia', '1 yr 9 mo'],
  ])('%s lasts %s', (id, expected) => {
    expect(duration(work(id).dates, OCT_2026)).toBe(expected);
  });
});
