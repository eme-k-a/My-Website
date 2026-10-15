// Glyph coverage for 3D text (ARCHITECTURE §8.3; WP-07 under a grant, R7 owns it afterwards).
// troika cannot read woff2 and, for a code point its font lacks, fetches a fallback font from
// `/fonts/unicode-fallback/` (a test failure, tests/e2e/fixtures.ts). This check catches that before
// any browser runs: every code point of `threeDStrings(content, buildDate)`, plus the strings
// exported by `src/museum/environment/labels3d.ts` once that file exists (WP-11), must have a glyph
// in the .woff troika uses for that label (fontkit `hasGlyphForCodePoint`). Instrument Serif 400
// draws numbers and big titles, IBM Plex Sans 500 organizations, room names and years.
//
// `npm run check:glyphs` prints every missing character with its label and exits 1.
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { content } from '../src/content/index';
import { threeDStrings, type ThreeDFont } from '../src/content/selectors';
import { buildDateFromEnv } from '../src/content/temporal';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** The .woff files the kit passes to `<Text font>` (WP-28 switches both to subset files). */
export const FONT_FILES: Record<ThreeDFont, string> = {
  serif: join(
    ROOT,
    'node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff',
  ),
  sans: join(
    ROOT,
    'node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff',
  ),
};

export const LABELS3D_FILE = join(ROOT, 'src/museum/environment/labels3d.ts');

const FONTS: readonly ThreeDFont[] = ['serif', 'sans'];

/** One string drawn in 3D and the font(s) it must render in. */
export interface GlyphLabel {
  text: string;
  /** One font when the label says which; both when a bare string does not. */
  fonts: readonly ThreeDFont[];
  /** Where the string comes from, for the report ("organization for verafin"). */
  label: string;
}

export interface MissingGlyph {
  char: string;
  /** "U+E000". */
  codePoint: string;
  font: ThreeDFont;
  label: string;
  text: string;
}

export interface GlyphReport {
  labels: number;
  codePoints: number;
  missing: MissingGlyph[];
}

/** The part of a fontkit Font this check uses (fontkit 2 ships no types). */
interface GlyphFont {
  hasGlyphForCodePoint(codePoint: number): boolean;
}
interface Fontkit {
  openSync(path: string): GlyphFont | { fonts: GlyphFont[] };
}

const loadCjs = createRequire(import.meta.url);
let fontkit: Fontkit | undefined;
const fontCache = new Map<string, GlyphFont>();

function openFont(path: string): GlyphFont {
  const cached = fontCache.get(path);
  if (cached) return cached;
  fontkit ??= loadCjs('fontkit') as Fontkit;
  const opened = fontkit.openSync(path);
  const font = 'fonts' in opened ? opened.fonts[0] : opened;
  if (!font) throw new Error(`No font in ${path}`);
  fontCache.set(path, font);
  return font;
}

/** `threeDStrings(content, now)` as labels, each in its own font. */
export function contentLabels(now: Date): GlyphLabel[] {
  return threeDStrings(content, now).map((s) => ({
    text: s.text,
    fonts: [s.font],
    label: `${s.kind} for ${s.for}`,
  }));
}

const isFontName = (value: unknown): value is ThreeDFont => FONTS.includes(value as ThreeDFont);

/**
 * Every string exported by a labels module. `{ text, font }` objects (the `ThreeDString` shape of
 * selectors.ts) are checked in their font; bare strings in both fonts. Arrays and plain objects are
 * walked; functions and other values are ignored.
 */
export function labelsFromModule(
  mod: Record<string, unknown>,
  source = 'labels3d.ts',
): GlyphLabel[] {
  const labels: GlyphLabel[] = [];
  const visit = (value: unknown, path: string, depth: number) => {
    if (depth > 4) return;
    if (typeof value === 'string') {
      labels.push({ text: value, fonts: FONTS, label: `${source} ${path}` });
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, `${path}[${i}]`, depth + 1));
    } else if (value !== null && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (typeof record.text === 'string') {
        const name = typeof record.for === 'string' ? ` (${record.for})` : '';
        labels.push({
          text: record.text,
          fonts: isFontName(record.font) ? [record.font] : FONTS,
          label: `${source} ${path}${name}`,
        });
        return;
      }
      for (const [key, item] of Object.entries(record)) visit(item, `${path}.${key}`, depth + 1);
    }
  };
  for (const [name, value] of Object.entries(mod)) visit(value, name, 0);
  return labels;
}

/** The environment labels of WP-11, or none while `labels3d.ts` does not exist. */
export async function environmentLabels(file = LABELS3D_FILE): Promise<GlyphLabel[]> {
  if (!existsSync(file)) return [];
  const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  return labelsFromModule(mod);
}

const codePointName = (cp: number) => `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

/** Checks every code point of every label (line breaks aside) in the label's font(s). */
export function findMissing(
  labels: readonly GlyphLabel[],
  fontFiles: Record<ThreeDFont, string> = FONT_FILES,
): GlyphReport {
  const missing: MissingGlyph[] = [];
  const seen = new Set<string>();
  const codePoints = new Set<string>();
  for (const { text, fonts, label } of labels) {
    for (const char of text) {
      if (char === '\n' || char === '\r') continue;
      const cp = char.codePointAt(0) ?? 0;
      for (const font of fonts) {
        codePoints.add(`${font}:${cp}`);
        if (openFont(fontFiles[font]).hasGlyphForCodePoint(cp)) continue;
        const key = `${font}:${cp}:${label}`;
        if (seen.has(key)) continue;
        seen.add(key);
        missing.push({ char, codePoint: codePointName(cp), font, label, text });
      }
    }
  }
  return { labels: labels.length, codePoints: codePoints.size, missing };
}

export interface CheckGlyphsOptions {
  /** Labels to check instead of the content and labels3d.ts strings (tests). */
  labels?: readonly GlyphLabel[];
  /** The build date for the year strips; scripts pass `buildDateFromEnv()`. */
  now?: Date;
  fontFiles?: Record<ThreeDFont, string>;
}

export async function checkGlyphs(options: CheckGlyphsOptions = {}): Promise<GlyphReport> {
  const labels = options.labels ?? [
    ...contentLabels(options.now ?? buildDateFromEnv()),
    ...(await environmentLabels()),
  ];
  return findMissing(labels, options.fontFiles);
}

const FONT_NAMES: Record<ThreeDFont, string> = {
  serif: 'Instrument Serif 400',
  sans: 'IBM Plex Sans 500',
};

/** The CLI's report lines. */
export function formatReport(report: GlyphReport): string {
  if (report.missing.length === 0) {
    return `glyphs ok: ${report.labels} labels, ${report.codePoints} code points checked in their fonts`;
  }
  const lines = report.missing.map(
    (m) =>
      `  ${m.codePoint} ${JSON.stringify(m.char)} missing from ${FONT_NAMES[m.font]} in ${m.label}: ${JSON.stringify(m.text)}`,
  );
  return [`missing 3D glyphs (${report.missing.length}):`, ...lines].join('\n');
}

/** Runs the check, prints the report and returns the exit code (0 ok, 1 missing glyphs). */
export async function main(options: CheckGlyphsOptions = {}): Promise<number> {
  const report = await checkGlyphs(options);
  if (report.missing.length > 0) {
    console.error(formatReport(report));
    return 1;
  }
  console.log(formatReport(report));
  return 0;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  process.exitCode = await main();
}
