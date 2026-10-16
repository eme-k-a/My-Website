// Head tags for every prerendered page (ARCHITECTURE §11.1, CONTENT_DRAFT §6.6; R9). A pure
// function of the content and the build date, called by src/entry-server.tsx at prerender time
// (never shipped to the client). Every indexable page gets a unique <title>, a description, an
// absolute canonical URL with a trailing slash, Open Graph and a Twitter card. The 404 page is
// `noindex` and carries only its title, description and robots tag: it has no canonical address
// and is never shared. JSON-LD and the favicon links are WP-31's.
import { CLASSIC_PATH, exhibitPath, GALLERY_PATH } from '../app/routes';
import { EXHIBIT_IDS, type ExhibitId } from '../content/ids';
import type { Content } from '../content/types';
import { entryById, organizationOf, resumePageMeta } from '../content/selectors';
import { NOT_FOUND_TITLE } from '../overlay/NotFound';

export type MetaRoute = 'gallery' | 'classic' | 'notFound' | { kind: 'exhibit'; id: ExhibitId };

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const NOT_FOUND_DESCRIPTION = "The page you asked for isn't part of the collection.";

export interface PageMeta {
  title: string;
  description: string;
  /** Path with a trailing slash; absent on the 404 page. */
  path?: string;
  /** Open Graph title (the <title> without the site suffix on exhibit pages). */
  ogTitle: string;
  /** `/og/<name>.png` (generated in WP-31). */
  ogImage?: string;
  ogType?: 'profile' | 'article' | 'website';
  robots?: string;
}

/** `/og/home.png`, `/og/resume.png` or `/og/<id>.png`. */
export const ogImagePath = (name: ExhibitId | 'home' | 'resume') => `/og/${name}.png`;

/** "<exhibit title>, <org or name>" (CONTENT_DRAFT §6.6). */
export function exhibitHeading(c: Content, id: ExhibitId): string {
  const entry = entryById(c, id);
  return `${entry.exhibit.title}, ${organizationOf(entry)}`;
}

/** The data behind a page's head tags. */
export function pageMeta(c: Content, route: MetaRoute, now: Date): PageMeta {
  const site = c.gallery.title;
  if (route === 'gallery') {
    return {
      title: c.meta.title,
      description: c.meta.description,
      path: GALLERY_PATH,
      ogTitle: c.meta.title,
      ogImage: ogImagePath('home'),
      ogType: 'profile',
    };
  }
  if (route === 'classic') {
    const meta = resumePageMeta(c, now);
    return {
      ...meta,
      path: CLASSIC_PATH,
      ogTitle: meta.title,
      ogImage: ogImagePath('resume'),
      ogType: 'website',
    };
  }
  if (route === 'notFound') {
    return {
      title: NOT_FOUND_TITLE,
      description: NOT_FOUND_DESCRIPTION,
      ogTitle: NOT_FOUND_TITLE,
      robots: 'noindex',
    };
  }
  const heading = exhibitHeading(c, route.id);
  return {
    title: `${heading} | ${site}`,
    description: entryById(c, route.id).exhibit.caption,
    path: exhibitPath(route.id),
    ogTitle: heading,
    ogImage: ogImagePath(route.id),
    ogType: 'article',
  };
}

/** Escapes text for an HTML attribute value or element content. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const metaName = (name: string, value: string) =>
  `<meta name="${name}" content="${escapeHtml(value)}" />`;
const metaProperty = (property: string, value: string) =>
  `<meta property="${property}" content="${escapeHtml(value)}" />`;

/** The tags for `<!--ssr:head-->`, one per line, indented for the template's <head>. */
export function headTags(c: Content, route: MetaRoute, now: Date): string {
  const meta = pageMeta(c, route, now);
  const site = c.meta.siteUrl;
  const tags = [
    `<title>${escapeHtml(meta.title)}</title>`,
    metaName('description', meta.description),
  ];
  if (meta.robots) tags.push(metaName('robots', meta.robots));
  if (meta.path !== undefined) {
    const url = `${site}${meta.path}`;
    tags.push(
      `<link rel="canonical" href="${escapeHtml(url)}" />`,
      metaProperty('og:site_name', c.gallery.title),
      metaProperty('og:type', meta.ogType ?? 'website'),
      metaProperty('og:title', meta.ogTitle),
      metaProperty('og:description', meta.description),
      metaProperty('og:url', url),
    );
    if (meta.ogImage) {
      tags.push(
        metaProperty('og:image', `${site}${meta.ogImage}`),
        metaProperty('og:image:width', String(OG_IMAGE_WIDTH)),
        metaProperty('og:image:height', String(OG_IMAGE_HEIGHT)),
      );
    }
    tags.push(metaName('twitter:card', 'summary_large_image'));
  }
  return tags.join('\n    ');
}

/** Every route that gets head tags: the gallery, each exhibit page, the classic page, the 404. */
export const META_ROUTES: readonly MetaRoute[] = [
  'gallery',
  ...EXHIBIT_IDS.map((id): MetaRoute => ({ kind: 'exhibit', id })),
  'classic',
  'notFound',
];
