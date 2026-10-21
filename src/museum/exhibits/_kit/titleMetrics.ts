// Wall-title measurements (EXPERIENCE §5.4; placard.ts places the titles with them): the cap
// heights, troika sizes, tracking, line height and width estimates of the exhibit numbers and
// organization labels, per placard kind. No font file is imported here (fonts.ts imports the
// .woff files as Vite ?url assets, which Node cannot load), so Playwright specs share these
// numbers instead of repeating them (rail-input (g)).
import type { ThreeDFont } from '../../../content/selectors';

/**
 * Cap height over units per em, measured from the kit's .woff files (fontkit; pinned by
 * fonts.test.ts). troika sizes text by em, so a label with cap height h uses fontSize h / ratio.
 */
export const CAP_HEIGHT_RATIO: Readonly<Record<ThreeDFont, number>> = {
  serif: 0.72,
  sans: 0.698,
};

/** The troika fontSize that gives `capHeight` meters of cap height in `font`. */
export function fontSizeForCap(font: ThreeDFont, capHeight: number): number {
  return capHeight / CAP_HEIGHT_RATIO[font];
}

/** Organization labels: tracking 0.12em (troika letterSpacing is in em). */
export const ORGANIZATION_TRACKING = 0.12;
/** Organization line height in em (troika `lineHeight`), so stacked lines are placed exactly. */
export const ORGANIZATION_LINE_HEIGHT = 1.25;
/**
 * Mean advance of an IBM Plex Sans 500 capital, space or punctuation in em, without tracking
 * (measured over the organization strings with fontkit; pinned by placard.test.ts). Used to break
 * lines and to keep a title inside its wall; troika lays out the real glyphs.
 */
export const SANS_CAPS_ADVANCE = 0.62;
/** Upper bound of an Instrument Serif numeral or capital advance in em (the exhibit numbers). */
export const SERIF_NUMBER_ADVANCE = 0.45;
/** The widest title line keeps at least this much wall to either end of its wall. */
export const TITLE_END_MARGIN = 0.25;

/** main aisle, wing rooms, the wide MUN plinth, the certifications wall vitrine. */
export type PlacardKind = 'main' | 'wing' | 'wide' | 'wall';

export interface TitleSpec {
  numberCap: number;
  orgCap: number;
  /** Baseline of the organization's last line, meters above the floor. */
  orgBottom: number;
  /** From the organization's first-line cap top to the number's baseline. */
  gap: number;
  /** Break width of the organization, meters. */
  orgWidth: number;
}

/**
 * Per kind. Main aisle: the organization cap is 0.12 m (EXPERIENCE §5.4 allows raising it), so
 * it keeps 14 CSS px on a Pixel 7 from the stop now that the title hangs farther along the wall.
 * Wings: the block sits low (last baseline 2.08 m, just over the case edge seen from the stop),
 * so on phones it stays under the wing HUD. Mun and the vitrine keep their EXPERIENCE §5.4 heights.
 */
export const TITLE_METRICS: Readonly<Record<PlacardKind, TitleSpec>> = {
  main: { numberCap: 0.32, orgCap: 0.12, orgBottom: 2.32, gap: 0.2, orgWidth: 2.6 },
  wing: { numberCap: 0.3, orgCap: 0.14, orgBottom: 2.14, gap: 0.06, orgWidth: 2.9 },
  wide: { numberCap: 0.32, orgCap: 0.14, orgBottom: 2.14, gap: 0.22, orgWidth: 2.4 },
  wall: { numberCap: 0.32, orgCap: 0.1, orgBottom: 2.4, gap: 0.25, orgWidth: 3.6 },
};

/** Estimated width in meters of one line of organization text (sans caps, tracked). */
export function sansLineWidth(text: string, fontSize: number, tracking: number): number {
  return text.length * fontSize * (SANS_CAPS_ADVANCE + tracking);
}

/** Greedy word wrap at `maxWidth` meters using the estimated widths. */
export function breakLines(
  text: string,
  fontSize: number,
  tracking: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && sansLineWidth(next, fontSize, tracking) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
