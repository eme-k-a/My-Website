// sitemap.xml and robots.txt (ARCHITECTURE §11.1; R9, WP-31). Pure text builders, called by
// scripts/prerender.ts with SITE_URL and the build date. The sitemap lists the gallery, the classic
// page and every exhibit page, always in the trailing-slash form. The PDF is linked from the pages,
// never listed, and the 404 page is noindex.
import { CLASSIC_PATH, exhibitPath, GALLERY_PATH } from '../app/routes';
import type { ExhibitId } from '../content/ids';

/** Every indexable path, in reading order: `/`, `/resume/`, then `/exhibit/<id>/`. */
export function sitemapPaths(ids: readonly ExhibitId[]): string[] {
  return [GALLERY_PATH, CLASSIC_PATH, ...ids.map((id) => exhibitPath(id))];
}

const escapeXml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** The sitemap document; `day` is the build date as YYYY-MM-DD. */
export function sitemapXml(siteUrl: string, paths: readonly string[], day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day))
    throw new Error(`sitemap lastmod '${day}' is not YYYY-MM-DD`);
  const urls = paths.map((path) => {
    if (!path.startsWith('/') || !path.endsWith('/')) {
      throw new Error(`sitemap path '${path}' must start and end with a slash`);
    }
    return [
      '  <url>',
      `    <loc>${escapeXml(`${siteUrl}${path}`)}</loc>`,
      `    <lastmod>${day}</lastmod>`,
      '  </url>',
    ].join('\n');
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/** robots.txt: everything allowed, pointing at the sitemap. */
export function robotsTxt(siteUrl: string): string {
  return ['User-agent: *', 'Allow: /', '', `Sitemap: ${siteUrl}/sitemap.xml`, ''].join('\n');
}
