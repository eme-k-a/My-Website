import { describe, expect, it } from 'vitest';
import { EXHIBIT_IDS } from '../content/ids';
import { content } from '../content/index';
import { robotsTxt, sitemapPaths, sitemapXml } from './sitemap';

const SITE = content.meta.siteUrl;

describe('sitemap', () => {
  const paths = sitemapPaths(EXHIBIT_IDS);
  const xml = sitemapXml(SITE, paths, '2026-11-15');
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

  it('lists the gallery, the classic page and every exhibit page once', () => {
    expect(locs).toHaveLength(EXHIBIT_IDS.length + 2);
    expect(new Set(locs).size).toBe(locs.length);
    expect(locs[0]).toBe(`${SITE}/`);
    expect(locs[1]).toBe(`${SITE}/resume/`);
    for (const id of EXHIBIT_IDS) expect(locs).toContain(`${SITE}/exhibit/${id}/`);
  });

  it('uses absolute trailing-slash addresses and never lists the PDF or the 404', () => {
    for (const loc of locs) {
      expect(loc?.startsWith(`${SITE}/`)).toBe(true);
      expect(loc?.endsWith('/')).toBe(true);
    }
    expect(xml).not.toContain('.pdf');
    expect(xml).not.toContain('404');
  });

  it('stamps every entry with the build date', () => {
    const days = [...xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map((m) => m[1]);
    expect(days).toHaveLength(locs.length);
    expect(new Set(days)).toEqual(new Set(['2026-11-15']));
    expect(() => sitemapXml(SITE, paths, '2026-11')).toThrow(/YYYY-MM-DD/);
    expect(() => sitemapXml(SITE, ['/resume'], '2026-11-15')).toThrow(/slash/);
  });

  it('is a sitemaps.org urlset', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true);
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });
});

describe('robotsTxt', () => {
  it('allows everything and points at <SITE_URL>/sitemap.xml', () => {
    expect(robotsTxt(SITE)).toBe(`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  });
});
