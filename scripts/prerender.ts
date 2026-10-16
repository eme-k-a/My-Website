// Prerender (R9; first version written by WP-10 under a grant, extended by WP-14 and WP-31).
// Called first by scripts/postbuild.ts, so the CSP hash in _headers is taken from the final HTML.
// It imports dist-ssr/entry-server.js (ARCHITECTURE §5.1, §11.1) and writes:
// - dist/index.html: the Vite template with <!--ssr:head--> and <!--ssr:app--> filled in;
// - dist/exhibit/<id>/index.html for every id in EXHIBIT_IDS (WP-14): the same gallery shell with
//   <body data-page="exhibit">, the exhibit's own head tags, and its story in <!--ssr:story-->
//   (`#story-static`, readable with JS off). The shell keeps exactly one inline script, the boot
//   script, so one CSP hash covers every page;
// - dist/resume/index.html: the classic resume, linking the hashed `classic` CSS from
//   dist/.vite/manifest.json, with no script at all;
// - dist/404.html: the 404 page with the gallery CSS, `noindex`, and no script at all.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DIST = join(ROOT, 'dist');
export const DIST_SSR = join(ROOT, 'dist-ssr');

export type ExhibitRoute = { kind: 'exhibit'; id: string };
export type HeadRoute = 'gallery' | 'classic' | 'notFound' | ExhibitRoute;

/** What dist-ssr/entry-server.js exports (src/entry-server.tsx). */
export interface EntryServer {
  renderApp(path: string): string;
  renderStory(id: string): string;
  renderClassic(): string;
  renderNotFound(): string;
  headTags(route: HeadRoute): string;
  EXHIBIT_IDS: readonly string[];
}

export interface ManifestChunk {
  file: string;
  css?: string[];
  isEntry?: boolean;
}
export type Manifest = Record<string, ManifestChunk>;

export const MARKERS = {
  head: '<!--ssr:head-->',
  app: '<!--ssr:app-->',
  story: '<!--ssr:story-->',
} as const;
export const CLASSIC_CSS_KEY = 'src/classic/classic.css';
export const GALLERY_KEY = 'index.html';

/** The CSS files of a manifest entry (a CSS-only input is its own `file`). */
export function cssFiles(manifest: Manifest, key: string): string[] {
  const chunk = manifest[key];
  if (!chunk) throw new Error(`dist/.vite/manifest.json has no entry '${key}'`);
  const files = [...(chunk.file.endsWith('.css') ? [chunk.file] : []), ...(chunk.css ?? [])];
  if (files.length === 0) throw new Error(`manifest entry '${key}' has no CSS`);
  return files;
}

/** Replaces exactly one marker; a missing marker means dist/index.html was already prerendered. */
function fill(html: string, marker: string, value: string): string {
  if (!html.includes(marker)) {
    throw new Error(`dist/index.html has no ${marker}: run vite build again before prerendering`);
  }
  return html.replace(marker, () => value);
}

const GALLERY_BODY = '<body data-page="gallery">';

/** The gallery page from the Vite template. The template's dev-only <title> gives way to head tags. */
export function galleryPage(template: string, entry: EntryServer): string {
  let html = template.replace(/[ \t]*<title>[^<]*<\/title>\n?/, '');
  html = fill(html, MARKERS.head, entry.headTags('gallery'));
  html = fill(html, MARKERS.app, entry.renderApp('/'));
  return fill(html, MARKERS.story, '');
}

/** An exhibit page: the gallery shell, the exhibit's head tags and its static story. */
export function exhibitPage(template: string, entry: EntryServer, id: string): string {
  let html = template.replace(/[ \t]*<title>[^<]*<\/title>\n?/, '');
  if (!html.includes(GALLERY_BODY)) throw new Error(`dist/index.html has no ${GALLERY_BODY}`);
  html = html.replace(GALLERY_BODY, '<body data-page="exhibit">');
  html = fill(html, MARKERS.head, entry.headTags({ kind: 'exhibit', id }));
  html = fill(html, MARKERS.app, entry.renderApp(`/exhibit/${id}/`));
  html = fill(html, MARKERS.story, entry.renderStory(id));
  const inline = html.match(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>/gi);
  if ((inline?.length ?? 0) > 1) {
    throw new Error(`exhibit/${id}/index.html would have more than one inline script`);
  }
  if (/<[a-z][^>]*\son[a-z]+=/i.test(html.replace(/<script[\s\S]*?<\/script>/gi, ''))) {
    throw new Error(`exhibit/${id}/index.html would have an inline event handler attribute`);
  }
  return html;
}

interface StaticPage {
  head: string;
  stylesheets: string[];
  htmlAttrs: string;
  bodyAttrs?: string;
  body: string;
}

/** A complete zero-JS document (the classic resume and the 404 page). */
export function staticPage(page: StaticPage, base = '/'): string {
  const links = page.stylesheets.map((file) => `<link rel="stylesheet" href="${base}${file}" />`);
  const html = [
    '<!doctype html>',
    `<html ${page.htmlAttrs}>`,
    '  <head>',
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />',
    `    ${page.head}`,
    ...links.map((link) => `    ${link}`),
    '  </head>',
    `  <body${page.bodyAttrs ? ` ${page.bodyAttrs}` : ''}>`,
    `    ${page.body}`,
    '  </body>',
    '</html>',
    '',
  ].join('\n');
  if (/<script\b/i.test(html)) throw new Error('A zero-JS page would contain a <script> element');
  return html;
}

export interface PrerenderOptions {
  dist?: string;
  ssr?: string;
  base?: string;
}

export async function prerenderPages(options: PrerenderOptions = {}): Promise<string[]> {
  const dist = resolve(options.dist ?? DIST);
  const ssr = resolve(options.ssr ?? DIST_SSR);
  const base = options.base ?? process.env.BASE_PATH ?? '/';
  const entry = (await import(pathToFileURL(join(ssr, 'entry-server.js')).href)) as EntryServer;
  const manifest = JSON.parse(
    await readFile(join(dist, '.vite', 'manifest.json'), 'utf8'),
  ) as Manifest;

  const written: string[] = [];
  const write = async (file: string, html: string) => {
    const path = join(dist, file);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, html);
    written.push(relative(dist, path));
  };

  const template = await readFile(join(dist, 'index.html'), 'utf8');
  await write('index.html', galleryPage(template, entry));
  for (const id of entry.EXHIBIT_IDS) {
    await write(join('exhibit', id, 'index.html'), exhibitPage(template, entry, id));
  }

  await write(
    join('resume', 'index.html'),
    staticPage(
      {
        htmlAttrs: 'lang="en-CA" data-page="classic"',
        head: ['<meta name="color-scheme" content="light dark" />', entry.headTags('classic')].join(
          '\n    ',
        ),
        stylesheets: cssFiles(manifest, CLASSIC_CSS_KEY),
        body: entry.renderClassic(),
      },
      base,
    ),
  );

  await write(
    '404.html',
    staticPage(
      {
        htmlAttrs: 'lang="en-CA"',
        head: ['<meta name="color-scheme" content="dark" />', entry.headTags('notFound')].join(
          '\n    ',
        ),
        stylesheets: cssFiles(manifest, GALLERY_KEY),
        bodyAttrs: 'data-page="not-found"',
        body: entry.renderNotFound(),
      },
      base,
    ),
  );

  console.log(`prerendered ${written.join(', ')}`);
  return written;
}

const entryArg = process.argv[1];
if (entryArg !== undefined && import.meta.url === pathToFileURL(resolve(entryArg)).href) {
  await prerenderPages();
}
