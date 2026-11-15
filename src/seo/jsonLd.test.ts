import { describe, expect, it } from 'vitest';
import { content } from '../content/index';
import { HEADSHOT_PATH, jsonLdTag, personJsonLd } from './jsonLd';

const DURING = new Date('2026-10-15T00:00:00Z');
const AFTER = new Date('2027-01-05T00:00:00Z');
const PHONE = /\+?\d?[-. (]*\d{3}[-. )]*\d{3}[-. ]*\d{4}\b/;

const keysDeep = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.flatMap(keysDeep);
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => [k, ...keysDeep(v)]);
  }
  return [];
};

describe('personJsonLd', () => {
  for (const [label, now] of [
    ['during the co-op', DURING],
    ['after it', AFTER],
  ] as const) {
    it(`has no email, no telephone and no phone pattern ${label}`, () => {
      const person = personJsonLd(content, now);
      const keys = keysDeep(person);
      expect(keys).not.toContain('email');
      expect(keys).not.toContain('telephone');
      const tag = jsonLdTag(content, now);
      expect(tag).not.toMatch(PHONE);
      expect(tag).not.toContain(content.contact.email);
      expect(tag).not.toContain('mailto:');
    });
  }

  it('names the current employer at 2026-10-15', () => {
    const person = personJsonLd(content, DURING);
    const verafin = content.experiences.find((w) => w.id === 'verafin');
    expect(person.worksFor).toEqual({ '@type': 'Organization', name: verafin?.org });
    expect(person.jobTitle).toBe(verafin?.role);
  });

  it('drops jobTitle and worksFor at 2027-01-05, when no work entry is current', () => {
    const person = personJsonLd(content, AFTER);
    expect(person).not.toHaveProperty('worksFor');
    expect(person).not.toHaveProperty('jobTitle');
  });

  it('describes the person from content only', () => {
    const person = personJsonLd(content, DURING);
    const site = content.meta.siteUrl;
    expect(person['@type']).toBe('Person');
    expect(person.name).toBe(content.contact.name);
    expect(person.alternateName).toBe('Chukwuemeka (Emeka) Nduka-Nwagbo');
    expect(person.url).toBe(`${site}/`);
    expect(person.image).toBe(`${site}${HEADSHOT_PATH}`);
    expect(person.alumniOf).toEqual({
      '@type': 'CollegeOrUniversity',
      name: content.education[0]?.institution,
    });
    expect(person.address).toEqual({
      '@type': 'PostalAddress',
      addressLocality: "St. John's",
      addressRegion: 'NL',
      addressCountry: 'CA',
    });
    expect(person.sameAs).toEqual(
      [content.contact.linkedin, content.contact.github].filter(Boolean),
    );
    expect(person.knowsAbout).toEqual(content.skills.flatMap((l) => l.items));
  });
});

describe('jsonLdTag', () => {
  it('is a parseable ld+json data block that no content string can close', () => {
    const tag = jsonLdTag(content, DURING);
    const m = /^<script type="application\/ld\+json">([\s\S]*)<\/script>$/.exec(tag);
    expect(m).not.toBeNull();
    expect(m?.[1]).not.toContain('<');
    expect(JSON.parse(m?.[1] ?? '')).toEqual(personJsonLd(content, DURING));
  });
});
