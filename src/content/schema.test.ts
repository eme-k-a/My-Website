import { describe, expect, it } from 'vitest';
import { EXHIBIT_IDS } from './ids';
import { normalize } from './normalize';
import { resume } from './resume';
import { Resume } from './schema';
import type { ResumeInput } from './types';

const EM_DASH = '\u2014';
// Built at runtime: check-copy scans every tracked file for the phone pattern.
const PHONE_SHAPED = ['555', '010', '0199'].join('-');

const input = (): ResumeInput => structuredClone(resume);

/** Paths of every issue, joined with dots. */
function issuePaths(r: unknown): string[] {
  const result = Resume.safeParse(r);
  return result.success ? [] : result.error.issues.map((i) => i.path.join('.'));
}

function messages(r: unknown): string {
  const result = Resume.safeParse(r);
  return result.success ? '' : result.error.issues.map((i) => i.message).join('\n');
}

describe('content file', () => {
  it('parses', () => {
    const result = Resume.safeParse(resume);
    expect(result.success, result.success ? '' : JSON.stringify(result.error.issues)).toBe(true);
  });

  it('normalize(resume) deep-equals Resume.parse(resume)', () => {
    expect(normalize(resume)).toEqual(Resume.parse(resume));
  });

  it('normalize applies optional fields and defaults exactly like zod', () => {
    const r = input();
    r.experiences[1]!.exhibit.curatorNote = { text: 'A note.' };
    r.experiences[1]!.exhibit.takeaway = { text: 'A lesson.', draft: true };
    r.experiences[1]!.bullets = [
      { text: 'Kept off the PDF.', print: false, priority: 3 },
      { text: 'Printed.' },
    ];
    r.projects[0]!.exhibit.links = [{ label: 'Code', href: 'https://example.com' }];
    expect(normalize(r)).toEqual(Resume.parse(r));
  });

  it('has exactly the frozen exhibit ids', () => {
    const c = normalize(resume);
    const ids = [
      ...c.experiences,
      ...c.projects,
      ...c.volunteer,
      ...c.education,
      c.certifications,
    ].map((e) => e.id);
    expect(ids.sort()).toEqual([...EXHIBIT_IDS].sort());
  });
});

describe('guards (ARCHITECTURE §3.3)', () => {
  it('rejects a contact.phone key (strict object)', () => {
    const r = input() as unknown as { contact: Record<string, unknown> };
    r.contact.phone = 'redacted';
    expect(Resume.safeParse(r).success).toBe(false);
    expect(messages(r)).toMatch(/phone/i);
  });

  it('rejects phoneInPublicPdf: true', () => {
    const r = input() as unknown as { contact: { phoneInPublicPdf: boolean } };
    r.contact.phoneInPublicPdf = true;
    expect(issuePaths(r)).toContain('contact.phoneInPublicPdf');
  });

  it('rejects a string containing an em dash', () => {
    const r = input();
    r.experiences[0]!.exhibit.caption = `Before ${EM_DASH} after`;
    expect(issuePaths(r)).toContain('experiences.0.exhibit.caption');
  });

  it('rejects a phone-shaped string', () => {
    const r = input();
    r.gallery.desk.footnote = `Call ${PHONE_SHAPED}`;
    expect(issuePaths(r)).toContain('gallery.desk.footnote');
  });

  it('rejects a phone-shaped string outside a Line (deep walk)', () => {
    const r = input();
    r.contact.github = `https://github.com/${PHONE_SHAPED}`;
    expect(issuePaths(r)).toContain('contact.github');
  });

  it('rejects surrounding whitespace and over-long captions', () => {
    const r = input();
    r.experiences[0]!.role = ' Padded';
    r.experiences[1]!.exhibit.caption = 'x'.repeat(141);
    const paths = issuePaths(r);
    expect(paths).toContain('experiences.0.role');
    expect(paths).toContain('experiences.1.exhibit.caption');
  });
});

describe('refineResume rules (ARCHITECTURE §3.4)', () => {
  it('1: ids are unique', () => {
    const r = input();
    r.experiences[1]!.id = 'verafin';
    expect(issuePaths(r)).toContain('experiences.1.id');
  });

  it('2: reserved ids are rejected', () => {
    const r = input();
    r.experiences[3]!.id = 'lobby';
    r.volunteer[0]!.id = 'certifications';
    const paths = issuePaths(r);
    expect(paths).toContain('experiences.3.id');
    expect(paths).toContain('volunteer.0.id');
  });

  it('3: ranges never end before they start; education starts before graduation', () => {
    const r = input();
    r.experiences[2]!.dates = { start: '2025-08', end: '2025-05' };
    r.education[0]!.start = '2027-05';
    const paths = issuePaths(r);
    expect(paths).toContain('experiences.2.dates');
    expect(paths).toContain('education.0.start');
  });

  it('4: experiences, volunteer and dated projects are newest first', () => {
    const r = input();
    r.experiences[1]!.dates = { start: '2026-10', end: '2026-11' };
    // The volunteer wing holds one entry, so a second (older-first) entry is appended for the rule.
    r.volunteer.push({
      ...structuredClone(r.volunteer[0]!),
      dates: { start: '2025-10', end: 'present' },
    });
    r.projects[0]!.dates = { start: '2023-01', end: '2023-06' };
    r.projects[1]!.dates = { start: '2024-01', end: '2024-06' };
    const paths = issuePaths(r);
    expect(paths).toContain('experiences.1.dates.start');
    expect(paths).toContain('volunteer.1.dates.start');
    expect(paths).toContain('projects.1.dates.start');
  });

  it('5: every work entry has a printed bullet', () => {
    const r = input();
    r.experiences[2]!.bullets = [{ text: 'Not printed.', print: false }];
    expect(issuePaths(r)).toContain('experiences.2.bullets');
  });

  it('6: wings resolve', () => {
    const lastAfter = input();
    lastAfter.wings[0]!.after = 'cfia';
    expect(issuePaths(lastAfter)).toContain('wings.0.after');

    const notWork = input();
    notWork.wings[0]!.after = 'mun';
    expect(issuePaths(notWork)).toContain('wings.0.after');

    const shared = input();
    shared.wings[1]!.after = 'verafin';
    expect(issuePaths(shared)).toContain('wings.1.after');

    const wrongPool = input();
    wrongPool.wings[0]!.items = ['klarup', 'finance-tracker', 'sdsj'];
    wrongPool.wings[1]!.items = [];
    expect(issuePaths(wrongPool)).toContain('wings.0.items.2');

    const missing = input();
    missing.wings[1]!.items = [];
    expect(issuePaths(missing)).toContain('volunteer.0.id');

    const twice = input();
    twice.wings[0]!.items = ['klarup', 'klarup'];
    expect(issuePaths(twice)).toContain('projects.1.id');
  });

  it('7: main-track entries never sit in a wing', () => {
    const r = input();
    r.wings[1]!.items = ['sdsj', 'mun'];
    expect(messages(r)).toMatch(/'mun' belongs to the main track/);
  });

  it("8: every story has a 'p' block", () => {
    const r = input();
    r.volunteer[0]!.exhibit.story = [{ type: 'list', items: ['One', 'Two'] }];
    expect(issuePaths(r)).toContain('volunteer.0.exhibit.story');
  });

  it('9: the phone can never be stored (strict contact plus the pattern guard)', () => {
    const r = input();
    r.skills[0]!.items = [PHONE_SHAPED];
    expect(issuePaths(r)).toContain('skills.0.items.0');
  });
});
