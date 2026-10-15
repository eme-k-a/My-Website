// Prerender (R9; first version written by WP-10 under a grant, extended by WP-14 and WP-31).
// Called first by scripts/postbuild.ts, so the CSP hash in _headers is taken from the final HTML.
// It imports dist-ssr/entry-server.js (ARCHITECTURE §5.1, §11.1) and writes:
// - dist/index.html: the Vite template with <!--ssr:head--> and <!--ssr:app--> filled in;
// - dist/resume/index.html: the classic resume, linking the hashed `classic` CSS from
//   dist/.vite/manifest.json, with no script at all;
// - dist/404.html: the 404 page with the gallery CSS, `noindex`, and no script at all.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DIST = join(ROOT, 'dist');
export const DIST_SSR = join(ROOT, 'dist-ssr');

/** What dist-ssr/entry-server.js exports (src/entry-server.tsx). */
export interface EntryServer {
  renderApp(path: string): string;
  renderClassic(): string;
  renderNotFound(): string;
  headTags(route: 'gallery' | 'classic' | 'notFound'): string;
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

/** The gallery page from the Vite template. The template's dev-only <title> gives way to head tags. */
export function galleryPage(template: string, entry: EntryServer): string {
  let html = template.replace(/[ \t]*<title>[^<]*<\/title>\n?/, '');
  html = fill(html, MARKERS.head, entry.headTags('gallery'));
  html = fill(html, MARKERS.app, entry.renderApp('/'));
  return fill(html, MARKERS.story, '');
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
