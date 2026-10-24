// Glyph coverage on the font subsets (ARCHITECTURE §8.3; WP-07, subsets since WP-28, R7).
// troika cannot read woff2 and, for a code point its font lacks, fetches a fallback font from
// `/fonts/unicode-fallback/` (a test failure, tests/e2e/fixtures.ts). This check catches that before
// any browser runs:
// - 3D: every code point of `threeDStrings(content, buildDate)`, plus the strings exported by
//   `src/museum/environment/labels3d.ts`, must have a glyph in the .woff subset troika uses for
//   that label (fontkit `hasGlyphForCodePoint`). Instrument Serif 400 draws numbers and big
//   titles, IBM Plex Sans 500 organizations, room names and years.
// - DOM: every code point of the content and the UI sources (scripts/subset-fonts.ts) that the
//   @fontsource face has must also be in each woff2 subset, so a content edit never drops to the
//   fallback face.
// A code point the source font has but a subset lacks means the subsets are stale: the report says
// to run `npm run fonts`. `npm run check:glyphs` prints every missing character and exits 1.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { type ThreeDFont } from '../src/content/selectors';
import { buildDateFromEnv } from '../src/content/temporal';
import {
  codePointName,
  codePointsOf,
  contentLabels,
  domTexts,
  environmentLabels,
  FONTS_DIR,
  LABELS3D_FILE,
  labelsFromModule,
  openFont,
  SUBSETS,
  THREE_D_FILES,
  type DomText,
  type ThreeDText,
} from './subset-fonts';

export { contentLabels, environmentLabels, LABELS3D_FILE, labelsFromModule };

/** The .woff subsets the kit passes to `<Text font>` (src/museum/exhibits/_kit/fonts.ts). */
export const FONT_FILES: Record<ThreeDFont, string> = THREE_D_FILES;

/** The @fontsource faces the 3D subsets are cut from. */
export const SOURCE_FILES: Record<ThreeDFont, string> = {
  serif: SUBSETS.find((s) => s.use === '3d' && s.font === 'serif')!.source,
  sans: SUBSETS.find((s) => s.use === '3d' && s.font === 'sans')!.source,
};

/** One string drawn in 3D and the font(s) it must render in. */
export type GlyphLabel = ThreeDText;

export interface MissingGlyph {
  char: string;
  /** "U+E000". */
  codePoint: string;
  font: ThreeDFont;
  label: string;
  text: string;
  /** True when the source font has the glyph: `npm run fonts` fixes it. */
  stale: boolean;
}

/** A DOM code point the source face has but its woff2 subset lacks. */
export interface MissingDomGlyph {
  char: string;
  codePoint: string;
  /** The subset file in public/fonts/. */
  file: string;
  /** The first text that uses it ("content", or a UI source file). */
  label: string;
}

export interface GlyphReport {
  labels: number;
  codePoints: number;
  missing: MissingGlyph[];
  /** Empty when the DOM check did not run (explicit `labels`). */
  domMissing: MissingDomGlyph[];
}

/** Checks every code point of every label (line breaks aside) in the label's font(s). */
export function findMissing(
  labels: readonly GlyphLabel[],
  fontFiles: Record<ThreeDFont, string> = FONT_FILES,
  sourceFiles: Record<ThreeDFont, string> = SOURCE_FILES,
): Omit<GlyphReport, 'domMissing'> {
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
        const stale = openFont(sourceFiles[font]).hasGlyphForCodePoint(cp);
        missing.push({ char, codePoint: codePointName(cp), font, label, text, stale });
      }
    }
  }
  return { labels: labels.length, codePoints: codePoints.size, missing };
}

/** DOM code points the source faces have but the woff2 subsets lack. */
export function findMissingDom(texts: readonly DomText[], fontsDir = FONTS_DIR): MissingDomGlyph[] {
  const firstUse = new Map<number, string>();
  for (const { text, label } of texts) {
    for (const cp of codePointsOf(text)) if (!firstUse.has(cp)) firstUse.set(cp, label);
  }
  const missing: MissingDomGlyph[] = [];
  for (const subset of SUBSETS.filter((s) => s.use === 'dom')) {
    const source = openFont(subset.source);
    const cut = openFont(resolve(fontsDir, subset.file));
    for (const [cp, label] of [...firstUse].sort(([a], [b]) => a - b)) {
      if (!source.hasGlyphForCodePoint(cp) || cut.hasGlyphForCodePoint(cp)) continue;
      missing.push({
        char: String.fromCodePoint(cp),
        codePoint: codePointName(cp),
        file: subset.file,
        label,
      });
    }
  }
  return missing;
}

export interface CheckGlyphsOptions {
  /** 3D labels to check instead of the content and labels3d.ts strings (tests); skips the DOM. */
  labels?: readonly GlyphLabel[];
  /** DOM texts to check instead of the content and UI sources (tests). */
  domTexts?: readonly DomText[];
  /** The build date for the year strips; scripts pass `buildDateFromEnv()`. */
  now?: Date;
  fontFiles?: Record<ThreeDFont, string>;
  fontsDir?: string;
}

export async function checkGlyphs(options: CheckGlyphsOptions = {}): Promise<GlyphReport> {
  const labels = options.labels ?? [
    ...contentLabels(options.now ?? buildDateFromEnv()),
    ...(await environmentLabels()),
  ];
  const dom = options.domTexts ?? (options.labels ? [] : domTexts());
  return {
    ...findMissing(labels, options.fontFiles),
    domMissing: findMissingDom(dom, options.fontsDir),
  };
}

const FONT_NAMES: Record<ThreeDFont, string> = {
  serif: 'Instrument Serif 400',
  sans: 'IBM Plex Sans 500',
};

export const RUN_FONTS_HINT =
  'The font subsets are stale: run `npm run fonts` and commit public/fonts/.';

/** The CLI's report lines. */
export function formatReport(report: GlyphReport): string {
  if (report.missing.length === 0 && report.domMissing.length === 0) {
    return `glyphs ok: ${report.labels} labels, ${report.codePoints} code points checked in their fonts, DOM subsets complete`;
  }
  const lines: string[] = [];
  if (report.missing.length > 0) {
    lines.push(`missing 3D glyphs (${report.missing.length}):`);
    for (const m of report.missing) {
      const fix = m.stale ? 'run npm run fonts' : 'the font has no such glyph: change the text';
      lines.push(
        `  ${m.codePoint} ${JSON.stringify(m.char)} missing from ${FONT_NAMES[m.font]} in ${m.label}: ${JSON.stringify(m.text)} (${fix})`,
      );
    }
  }
  if (report.domMissing.length > 0) {
    lines.push(`missing DOM glyphs (${report.domMissing.length}):`);
    for (const m of report.domMissing) {
      lines.push(`  ${m.codePoint} ${JSON.stringify(m.char)} missing from ${m.file} (${m.label})`);
    }
  }
  if (report.missing.some((m) => m.stale) || report.domMissing.length > 0) {
    lines.push(RUN_FONTS_HINT);
  }
  return lines.join('\n');
}

/** Runs the check, prints the report and returns the exit code (0 ok, 1 missing glyphs). */
export async function main(options: CheckGlyphsOptions = {}): Promise<number> {
  const report = await checkGlyphs(options);
  if (report.missing.length > 0 || report.domMissing.length > 0) {
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
