// `npm run og` (ARCHITECTURE §11.2, §11.4; R9, WP-31). Regenerates the committed share images:
// - public/og/<id>.png, 1200 x 630, for every exhibit plus `home` and `resume`: src/seo/OgCard.tsx
//   rendered to static markup and screenshotted in Chromium (Playwright, no WebGL);
// - public/og/manifest.json: a sha256 of each card's input strings (src/seo/ogCards.ts), which
//   scripts/gen-og.test.ts compares with the current content ("run npm run og" when stale);
// - public/favicon.svg, public/favicon-32.png and public/apple-touch-icon.png (180 px): the brass
//   monogram on ink, drawn as Instrument Serif outlines (fontkit) so the SVG needs no font, and
//   rasterized with sharp.
// Fonts come from the @fontsource packages as data URIs; the renderer makes no network request.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { content } from '../src/content/index';
import { buildDateFromEnv } from '../src/content/temporal';
import type { Content } from '../src/content/types';
import { OG_CSS, OG_HEIGHT, OG_WIDTH, OgCard } from '../src/seo/OgCard';
import { OG_TEMPLATE_VERSION, ogCards, type OgCardData, type OgCardId } from '../src/seo/ogCards';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PUBLIC = join(ROOT, 'public');
export const OG_DIR = join(PUBLIC, 'og');
export const MANIFEST = join(OG_DIR, 'manifest.json');

const FONTSOURCE = join(ROOT, 'node_modules', '@fontsource');
export const FONT_FILES = {
  serif: join(FONTSOURCE, 'instrument-serif', 'files', 'instrument-serif-latin-400-normal.woff2'),
  serifOutline: join(
    FONTSOURCE,
    'instrument-serif',
    'files',
    'instrument-serif-latin-400-normal.woff',
  ),
  plex400: join(FONTSOURCE, 'ibm-plex-sans', 'files', 'ibm-plex-sans-latin-400-normal.woff2'),
  plex500: join(FONTSOURCE, 'ibm-plex-sans', 'files', 'ibm-plex-sans-latin-500-normal.woff2'),
} as const;

// ---------------------------------------------------------------------------------------------
// Manifest

/** sha256 (hex) of a card's strings and the template version. */
export function ogCardHash(card: OgCardData): string {
  const input = JSON.stringify({ v: OG_TEMPLATE_VERSION, card });
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** What public/og/manifest.json holds. */
export interface OgManifest {
  templateVersion: number;
  cards: Record<string, string>;
}

export function ogManifest(cards: readonly OgCardData[]): OgManifest {
  return {
    templateVersion: OG_TEMPLATE_VERSION,
    cards: Object.fromEntries(cards.map((card) => [card.id, ogCardHash(card)])),
  };
}

// ---------------------------------------------------------------------------------------------
// Cards

const dataUri = (path: string) => `data:font/woff2;base64,${readFileSync(path).toString('base64')}`;

function fontFaces(): string {
  const face = (family: string, weight: number, path: string) =>
    `@font-face { font-family: '${family}'; font-weight: ${weight}; font-style: normal; src: url(${dataUri(path)}) format('woff2'); }`;
  return [
    face('Serif', 400, FONT_FILES.serif),
    face('Plex', 400, FONT_FILES.plex400),
    face('Plex', 500, FONT_FILES.plex500),
  ].join('\n');
}

/** The standalone document for one card. */
export function ogDocument(card: OgCardData, faces = fontFaces()): string {
  const body = renderToStaticMarkup(createElement(OgCard, { card }));
  return `<!doctype html><html lang="en-CA"><head><meta charset="utf-8" /><style>${faces}\n${OG_CSS}</style></head><body>${body}</body></html>`;
}

/** Shrinks a title that would run past two lines (92 px down to 60 px at most). */
function fitTitle(): void {
  const title = document.querySelector<HTMLElement>('.title');
  if (!title) return;
  let size = 92;
  while (title.scrollHeight > title.clientHeight + 1 && size > 60) {
    size -= 2;
    title.style.fontSize = `${size}px`;
  }
}

async function renderCards(cards: readonly OgCardData[]): Promise<void> {
  const { chromium } = await import('@playwright/test');
  const sharp = (await import('sharp')).default;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: OG_WIDTH, height: OG_HEIGHT },
      deviceScaleFactor: 1,
    });
    // Belt and braces: the document is self-contained, so any request is a bug.
    await page.route('**/*', (route) => route.abort());
    const faces = fontFaces();
    for (const card of cards) {
      await page.setContent(ogDocument(card, faces), { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await page.evaluate(fitTitle);
      const missing = await page.evaluate(() =>
        ['400 92px Serif', '400 30px Plex', '500 22px Plex'].filter(
          (f) => !document.fonts.check(f),
        ),
      );
      if (missing.length > 0) throw new Error(`OG card '${card.id}': fonts not loaded: ${missing}`);
      const shot = await page.screenshot({
        clip: { x: 0, y: 0, width: OG_WIDTH, height: OG_HEIGHT },
      });
      // A dithered palette PNG: about a quarter of the size, no visible banding on the light pool.
      await sharp(shot)
        .png({ palette: true, quality: 95, effort: 10, dither: 1 })
        .toFile(join(OG_DIR, `${card.id}.png`));
    }
  } finally {
    await browser.close();
  }
}

// ---------------------------------------------------------------------------------------------
// Icons

/**
 * The monogram letters. A proposal pending R2 and Emeka: `[placeholder: monogram letters, R2
 * proposes, Emeka approves]`. Until then it is the preferred name's initial and the family
 * name's initial, read from content.
 */
export function monogramLetters(c: Content): string {
  const family = c.contact.name.split(' ').slice(1).join(' ');
  return `${c.contact.preferredName[0] ?? ''}${family[0] ?? ''}`.toUpperCase();
}

interface OutlineGlyph {
  path: { toSVG(): string };
}
interface OutlineFont {
  unitsPerEm: number;
  capHeight: number;
  layout(text: string): { glyphs: OutlineGlyph[]; positions: { xAdvance: number }[] };
}

const INK = '#0B0B0D';
const BRASS = '#C9A36A';
const ICON_VIEW = 64;

/** favicon.svg: brass letters on an ink tile with a brass hairline, no font needed. */
export function faviconSvg(
  letters: string,
  opts: { rounded: boolean } = { rounded: true },
): string {
  const fontkit = createRequire(import.meta.url)('fontkit') as {
    openSync(path: string): OutlineFont;
  };
  const font = fontkit.openSync(FONT_FILES.serifOutline);
  const run = font.layout(letters);
  const tracking = -0.02 * font.unitsPerEm;
  let x = 0;
  const parts: string[] = [];
  run.glyphs.forEach((glyph, i) => {
    parts.push(`<path transform="translate(${x} 0)" d="${glyph.path.toSVG()}"/>`);
    x += (run.positions[i]?.xAdvance ?? 0) + (i < run.glyphs.length - 1 ? tracking : 0);
  });
  const width = x;
  const maxWidth = ICON_VIEW * 0.7;
  const maxCap = ICON_VIEW * 0.5;
  const scale = Math.min(maxWidth / width, maxCap / font.capHeight);
  const left = (ICON_VIEW - width * scale) / 2;
  const baseline = (ICON_VIEW + font.capHeight * scale) / 2;
  const r = opts.rounded ? 12 : 0;
  const round = (n: number) => Number(n.toFixed(4));
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ICON_VIEW} ${ICON_VIEW}">`,
    `<rect width="${ICON_VIEW}" height="${ICON_VIEW}" rx="${r}" fill="${INK}"/>`,
    `<rect x="4.5" y="4.5" width="${ICON_VIEW - 9}" height="${ICON_VIEW - 9}" rx="${Math.max(r - 4, 0)}" fill="none" stroke="${BRASS}" stroke-opacity="0.55"/>`,
    `<g fill="${BRASS}" transform="translate(${round(left)} ${round(baseline)}) scale(${round(scale)} ${round(-scale)})">`,
    ...parts,
    '</g>',
    '</svg>',
    '',
  ].join('\n');
}

async function writeIcons(c: Content): Promise<void> {
  const sharp = (await import('sharp')).default;
  const letters = monogramLetters(c);
  const svg = faviconSvg(letters);
  await writeFile(join(PUBLIC, 'favicon.svg'), svg);
  await sharp(Buffer.from(svg), { density: 72 * (32 / ICON_VIEW) * 4 })
    .resize(32, 32)
    .png()
    .toFile(join(PUBLIC, 'favicon-32.png'));
  // iOS rounds the corners itself, so the touch icon is a full-bleed square.
  const square = faviconSvg(letters, { rounded: false });
  await sharp(Buffer.from(square), { density: 72 * (180 / ICON_VIEW) * 2 })
    .resize(180, 180)
    .flatten({ background: INK })
    .png()
    .toFile(join(PUBLIC, 'apple-touch-icon.png'));
}

// ---------------------------------------------------------------------------------------------

export async function genOg(now: Date = buildDateFromEnv()): Promise<void> {
  const cards = ogCards(content, now);
  await mkdir(OG_DIR, { recursive: true });
  const keep = new Set<string>([...cards.map((card) => `${card.id}.png`), 'manifest.json']);
  for (const file of await readdir(OG_DIR)) {
    if (!keep.has(file)) await rm(join(OG_DIR, file));
  }
  await renderCards(cards);
  await writeFile(MANIFEST, `${JSON.stringify(ogManifest(cards), null, 2)}\n`);
  await writeIcons(content);
  const ids: OgCardId[] = cards.map((card) => card.id);
  console.log(`og: wrote ${ids.length} cards (${ids.join(', ')}), manifest.json and the icons`);
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await genOg();
}
