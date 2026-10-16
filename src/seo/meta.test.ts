import { describe, expect, it } from 'vitest';
import { EXHIBIT_IDS } from '../content/ids';
import { content } from '../content/index';
import { entryById } from '../content/selectors';
import { headTags, META_ROUTES, pageMeta, type MetaRoute } from './meta';

const NOW = new Date('2026-10-16T00:00:00Z');
const PHONE = /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/;

const attr = (html: string, pattern: RegExp) => pattern.exec(html)?.[1];
const titleOf = (html: string) => attr(html, /<title>([^<]*)<\/title>/);
const canonicalOf = (html: string) => attr(html, /<link rel="canonical" href="([^"]*)"/);
const property = (html: string, name: string) =>
  attr(html, new RegExp(`<meta property="${name}" content="([^"]*)"`));
const named = (html: string, name: string) =>
  attr(html, new RegExp(`<meta name="${name}" content="([^"]*)"`));

const all = META_ROUTES.map((route) => ({ route, html: headTags(content, route, NOW) }));
const indexable = all.filter(({ route }) => route !== 'notFound');

describe('headTags', () => {
  it('covers the gallery, every exhibit page, the classic page and the 404', () => {
    expect(all).toHaveLength(EXHIBIT_IDS.length + 3);
  });

  it('gives every page a unique <title> and every indexable page a unique og:title', () => {
    const titles = all.map(({ html }) => titleOf(html));
    expect(titles.every(Boolean)).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);
    const ogTitles = indexable.map(({ html }) => property(html, 'og:title'));
    expect(ogTitles.every(Boolean)).toBe(true);
    expect(new Set(ogTitles).size).toBe(ogTitles.length);
  });

  it('writes absolute canonical and og:url addresses with a trailing slash', () => {
    for (const { html } of indexable) {
      const canonical = canonicalOf(html);
      expect(canonical?.startsWith(`${content.meta.siteUrl}/`)).toBe(true);
      expect(canonical?.endsWith('/')).toBe(true);
      expect(property(html, 'og:url')).toBe(canonical);
    }
  });

  it('titles exhibit pages "<title>, <org> | Commit History" with the caption as description', () => {
    const html = headTags(content, { kind: 'exhibit', id: 'mysa' }, NOW);
    const entry = entryById(content, 'mysa');
    expect(titleOf(html)).toBe(`${entry.exhibit.title}, Mysa | ${content.gallery.title}`);
    expect(named(html, 'description')).toBe(entry.exhibit.caption.replace(/&/g, '&amp;'));
    expect(canonicalOf(html)).toBe(`${content.meta.siteUrl}/exhibit/mysa/`);
    expect(property(html, 'og:type')).toBe('article');
    expect(property(html, 'og:image')).toBe(`${content.meta.siteUrl}/og/mysa.png`);
  });

  it('marks the gallery as a profile with the home card', () => {
    const html = headTags(content, 'gallery', NOW);
    expect(titleOf(html)).toBe(content.meta.title);
    expect(canonicalOf(html)).toBe(`${content.meta.siteUrl}/`);
    expect(property(html, 'og:type')).toBe('profile');
    expect(property(html, 'og:image')).toBe(`${content.meta.siteUrl}/og/home.png`);
  });

  it('points the classic page at /resume/ and its card', () => {
    const html = headTags(content, 'classic', NOW);
    expect(canonicalOf(html)).toBe(`${content.meta.siteUrl}/resume/`);
    expect(property(html, 'og:image')).toBe(`${content.meta.siteUrl}/og/resume.png`);
  });

  it('carries the full Open Graph and Twitter set on indexable pages', () => {
    for (const { html } of indexable) {
      expect(property(html, 'og:site_name')).toBe(content.gallery.title);
      expect(property(html, 'og:description')).toBe(named(html, 'description'));
      expect(property(html, 'og:image:width')).toBe('1200');
      expect(property(html, 'og:image:height')).toBe('630');
      expect(named(html, 'twitter:card')).toBe('summary_large_image');
    }
  });

  it('keeps the 404 page noindex, without a canonical address', () => {
    const html = headTags(content, 'notFound', NOW);
    expect(titleOf(html)).toBe(`Page not found | ${content.gallery.title}`);
    expect(named(html, 'robots')).toBe('noindex');
    expect(canonicalOf(html)).toBeUndefined();
  });

  it('never contains a phone pattern or an em dash', () => {
    for (const { html } of all) {
      expect(PHONE.test(html)).toBe(false);
      expect(html.includes('\u2014')).toBe(false);
    }
  });

  it('escapes markup in copy', () => {
    const route: MetaRoute = 'gallery';
    const tricky = { ...content, meta: { ...content.meta, title: 'A <b> & "q"' } };
    expect(titleOf(headTags(tricky, route, NOW))).toBe('A &lt;b&gt; &amp; &quot;q&quot;');
    expect(pageMeta(tricky, route, NOW).title).toBe('A <b> & "q"');
  });
});
