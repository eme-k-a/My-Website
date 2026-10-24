// Font subsets (WP-28; ARCHITECTURE §8.3, EXPERIENCE §7.7). `npm run fonts` writes six files to
// public/fonts/ from the @fontsource latin faces with subset-font (harfbuzz):
// - DOM (woff2): Instrument Serif 400 and 400 italic, IBM Plex Sans 400 and 500. Generous: every
//   content string, every character of the UI sources (overlay, classic, app, seo, content,
//   index.html), printable ASCII, the Latin-1 letters and signs, the en dash, the middle dot,
//   curly quotes and the ellipsis. public/credits.html uses system fonts and is not scanned.
// - 3D (woff, troika cannot read woff2): Instrument Serif 400 and IBM Plex Sans 500. Printable
//   ASCII (and U+FFFD, see below) plus every code point of `threeDStrings` and `labels3d.ts` in
//   that font (R0 ruling for M4: a plain-ASCII content edit never breaks the glyph check).
// Output is deterministic (sorted code points, fixed harfbuzz build, the source head table kept).
// Every subset keeps its layout features and the copyright, license and license URL name records
// (name IDs 0, 13 and 14) next to harfbuzz's default 1 to 6. `npm run check:glyphs` fails, with a
// hint to run this script, when a later edit uses a code point a subset lacks.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { content } from '../src/content/index';
import { threeDStrings, type ThreeDFont } from '../src/content/selectors';
import { buildDateFromEnv } from '../src/content/temporal';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const FONTS_DIR = join(ROOT, 'public/fonts');
export const LABELS3D_FILE = join(ROOT, 'src/museum/environment/labels3d.ts');

const FONTSOURCE = join(ROOT, 'node_modules/@fontsource');

export interface Subset {
  /** File name in public/fonts/. */
  file: string;
  /** The @fontsource latin face it is cut from. */
  source: string;
  format: 'woff2' | 'woff';
  use: 'dom' | '3d';
  /** The 3D font it serves (3D subsets only). */
  font?: ThreeDFont;
}

export const SUBSETS: readonly Subset[] = [
  {
    file: 'instrument-serif-400.woff2',
    source: join(FONTSOURCE, 'instrument-serif/files/instrument-serif-latin-400-normal.woff2'),
    format: 'woff2',
    use: 'dom',
  },
  {
    file: 'instrument-serif-400-italic.woff2',
    source: join(FONTSOURCE, 'instrument-serif/files/instrument-serif-latin-400-italic.woff2'),
    format: 'woff2',
    use: 'dom',
  },
  {
    file: 'ibm-plex-sans-400.woff2',
    source: join(FONTSOURCE, 'ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2'),
    format: 'woff2',
    use: 'dom',
  },
  {
    file: 'ibm-plex-sans-500.woff2',
    source: join(FONTSOURCE, 'ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2'),
    format: 'woff2',
    use: 'dom',
  },
  {
    file: 'instrument-serif-400.woff',
    source: join(FONTSOURCE, 'instrument-serif/files/instrument-serif-latin-400-normal.woff'),
    format: 'woff',
    use: '3d',
    font: 'serif',
  },
  {
    file: 'ibm-plex-sans-500.woff',
    source: join(FONTSOURCE, 'ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff'),
    format: 'woff',
    use: '3d',
    font: 'sans',
  },
];

/** The 3D subset of each troika font, as an absolute path. */
export const THREE_D_FILES: Record<ThreeDFont, string> = {
  serif: join(FONTS_DIR, 'instrument-serif-400.woff'),
  sans: join(FONTS_DIR, 'ibm-plex-sans-500.woff'),
};

/** The folders and files whose characters the DOM subsets keep (UI microcopy, EXPERIENCE §8.4). */
export const UI_SOURCES: readonly string[] = [
  'src/app',
  'src/classic',
  'src/content',
  'src/overlay',
  'src/seo',
  'src/entry-server.tsx',
  'index.html',
];

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** Printable ASCII, U+0020 to U+007E. */
export const PRINTABLE_ASCII: readonly number[] = range(0x20, 0x7e);

/**
 * U+FFFD, the replacement character, in every subset whose source has it (the Plex Sans faces;
 * Instrument Serif has none): its glyph has the highest glyph id there, so the subset's glyf table
 * never ends on an empty glyph. fontkit (the glyph and
 * metric tests) reads a glyph header even for an empty glyph, which ran past the end of the table
 * for the space of an ASCII-only Plex Sans subset.
 */
export const REPLACEMENT_CHARACTER = 0xfffd;

/**
 * The DOM base set: printable ASCII, Latin-1 (U+00A0 to U+00FF, which holds the middle dot
 * U+00B7), the en dash, curly quotes, the ellipsis and U+FFFD. Digits and basic Latin are in the
 * ASCII.
 */
export const DOM_BASE: readonly number[] = [
  ...PRINTABLE_ASCII,
  ...range(0xa0, 0xff),
  0x2013, // en dash, date ranges
  0x2018,
  0x2019,
  0x201c,
  0x201d,
  0x2026,
  REPLACEMENT_CHARACTER,
];

/** Code points of a string, line breaks and other C0 controls aside. */
export function codePointsOf(text: string): number[] {
  const out: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0) ?? 0;
    if (cp >= 0x20) out.push(cp);
  }
  return out;
}

/** Every string inside a value (objects and arrays walked; keys are not text). */
export function stringsIn(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => stringsIn(item, out));
  else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) stringsIn(item, out);
  }
  return out;
}

const UI_EXTENSIONS = new Set(['.ts', '.tsx', '.html']);

/** The UI source files under UI_SOURCES (tests and snapshots excluded), sorted. */
export function uiSourceFiles(root = ROOT): string[] {
  const files: string[] = [];
  const visit = (path: string) => {
    let stat;
    try {
      stat = statSync(path);
    } catch {
      return;
    }
    if (stat.isDirectory()) {
      for (const name of readdirSync(path).sort()) {
        if (name === '__snapshots__') continue;
        visit(join(path, name));
      }
    } else if (UI_EXTENSIONS.has(extname(path)) && !/\.test\.tsx?$/.test(path)) {
      files.push(path);
    }
  };
  for (const source of UI_SOURCES) visit(join(root, source));
  return files.sort();
}

/** Where each DOM code point comes from, for the check's report. */
export interface DomText {
  text: string;
  label: string;
}

/** The DOM texts: every content string, then every UI source file. */
export function domTexts(root = ROOT): DomText[] {
  return [
    ...stringsIn(content).map((text) => ({ text, label: 'content' })),
    ...uiSourceFiles(root).map((file) => ({
      text: readFileSync(file, 'utf8'),
      label: relative(root, file),
    })),
  ];
}

/** One 3D string and the font(s) troika draws it in. */
export interface ThreeDText {
  text: string;
  fonts: readonly ThreeDFont[];
  label: string;
}

const FONTS: readonly ThreeDFont[] = ['serif', 'sans'];
const isFontName = (value: unknown): value is ThreeDFont => FONTS.includes(value as ThreeDFont);

/** `threeDStrings(content, now)`, each in its own font. */
export function contentLabels(now: Date): ThreeDText[] {
  return threeDStrings(content, now).map((s) => ({
    text: s.text,
    fonts: [s.font],
    label: `${s.kind} for ${s.for}`,
  }));
}

/**
 * Every string exported by a labels module. `{ text, font }` objects (the `ThreeDString` shape of
 * selectors.ts) are checked in their font; bare strings in both fonts. Arrays and plain objects are
 * walked; functions and other values are ignored.
 */
export function labelsFromModule(
  mod: Record<string, unknown>,
  source = 'labels3d.ts',
): ThreeDText[] {
  const labels: ThreeDText[] = [];
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

/** The environment labels of `labels3d.ts`, or none while the file does not exist. */
export async function environmentLabels(file = LABELS3D_FILE): Promise<ThreeDText[]> {
  try {
    statSync(file);
  } catch {
    return [];
  }
  const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  return labelsFromModule(mod);
}

/** Every 3D string: the content's, then labels3d.ts's. */
export async function threeDTexts(now: Date = buildDateFromEnv()): Promise<ThreeDText[]> {
  return [...contentLabels(now), ...(await environmentLabels())];
}

// ---------------------------------------------------------------------------------------------
// Fonts

/** The part of a fontkit Font these scripts use (fontkit 2 ships no types). */
export interface CmapFont {
  hasGlyphForCodePoint(codePoint: number): boolean;
  characterSet: number[];
}
interface Fontkit {
  openSync(path: string): CmapFont | { fonts: CmapFont[] };
  create(buffer: Buffer): CmapFont | { fonts: CmapFont[] };
}

const loadCjs = createRequire(import.meta.url);
let fontkit: Fontkit | undefined;
const fontCache = new Map<string, CmapFont>();

/** Opens a font file with fontkit (cached per path). */
export function openFont(path: string): CmapFont {
  const cached = fontCache.get(path);
  if (cached) return cached;
  fontkit ??= loadCjs('fontkit') as Fontkit;
  const opened = fontkit.openSync(path);
  const font = 'fonts' in opened ? opened.fonts[0] : opened;
  if (!font) throw new Error(`No font in ${path}`);
  fontCache.set(path, font);
  return font;
}

/** The code points one subset keeps, before the source font's own coverage is applied. */
export function wantedCodePoints(
  subset: Subset,
  dom: readonly DomText[],
  threeD: readonly ThreeDText[],
): Set<number> {
  if (subset.use === 'dom') {
    return new Set([...DOM_BASE, ...dom.flatMap((t) => codePointsOf(t.text))]);
  }
  const font = subset.font!;
  return new Set([
    ...PRINTABLE_ASCII,
    REPLACEMENT_CHARACTER,
    ...threeD.filter((t) => t.fonts.includes(font)).flatMap((t) => codePointsOf(t.text)),
  ]);
}

export interface SubsetPlan {
  subset: Subset;
  /** Sorted code points the source font has. */
  codePoints: number[];
  /** Wanted code points the source font has no glyph for. */
  absent: number[];
}

/** What each subset will hold. */
export function planSubsets(dom: readonly DomText[], threeD: readonly ThreeDText[]): SubsetPlan[] {
  return SUBSETS.map((subset) => {
    const source = openFont(subset.source);
    const wanted = [...wantedCodePoints(subset, dom, threeD)].sort((a, b) => a - b);
    return {
      subset,
      codePoints: wanted.filter((cp) => source.hasGlyphForCodePoint(cp)),
      absent: wanted.filter(
        (cp) => cp !== REPLACEMENT_CHARACTER && !source.hasGlyphForCodePoint(cp),
      ),
    };
  });
}

export const codePointName = (cp: number): string =>
  `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;

type SubsetFont = (
  font: Buffer,
  text: string,
  options: { targetFormat: 'woff2' | 'woff'; preserveNameIds: number[] },
) => Promise<Buffer>;

/** Name IDs kept next to harfbuzz's default 1 to 6: copyright, license, license URL. */
export const PRESERVE_NAME_IDS = [0, 13, 14];

/** Writes every subset; returns one line per file. Fails when a 3D code point has no glyph. */
export async function writeSubsets(outDir = FONTS_DIR): Promise<string[]> {
  const plans = planSubsets(domTexts(), await threeDTexts());
  const fatal = plans.filter((p) => p.subset.use === '3d' && p.absent.length > 0);
  if (fatal.length > 0) {
    const lines = fatal.map(
      (p) =>
        `  ${p.subset.file}: ${p.absent.map((cp) => `${codePointName(cp)} ${JSON.stringify(String.fromCodePoint(cp))}`).join(', ')}`,
    );
    throw new Error(
      `3D text uses characters its font has no glyph for (troika would fetch a fallback):\n${lines.join('\n')}`,
    );
  }
  const subsetFont = loadCjs('subset-font') as SubsetFont;
  await mkdir(outDir, { recursive: true });
  const report: string[] = [];
  for (const { subset, codePoints, absent } of plans) {
    const text = String.fromCodePoint(...codePoints);
    const out = await subsetFont(readFileSync(subset.source), text, {
      targetFormat: subset.format,
      preserveNameIds: PRESERVE_NAME_IDS,
    });
    await writeFile(join(outDir, subset.file), out);
    const before = statSync(subset.source).size;
    report.push(
      `${subset.file.padEnd(34)} ${String(codePoints.length).padStart(4)} code points  ${(before / 1024).toFixed(1).padStart(5)} KB -> ${(out.length / 1024).toFixed(1).padStart(5)} KB`,
    );
    if (absent.length > 0) {
      report.push(
        `  not in the source font (the browser falls back for these): ${absent.map(codePointName).join(' ')}`,
      );
    }
  }
  return report;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  for (const line of await writeSubsets()) console.log(line);
}
