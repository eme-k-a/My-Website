// The 3D label fonts (ARCHITECTURE §8.3, EXPERIENCE §7.7): the self-hosted .woff files troika
// reads (it cannot read woff2), imported as URLs so Vite hashes them into /assets/. Every kit and
// environment <Text> passes one of these as `font`; troika's default would fetch from a CDN.
// WP-28 swaps both URLs for subset files. scripts/check-glyphs.ts checks the same files.
import serifWoff from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff?url';
import sansWoff from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff?url';
import type { ThreeDFont } from '../../../content/selectors';

/** Font URL per 3D font: 'serif' is Instrument Serif 400, 'sans' is IBM Plex Sans 500. */
export const KIT_FONTS: Readonly<Record<ThreeDFont, string>> = { serif: serifWoff, sans: sansWoff };

/** The package files behind KIT_FONTS (for the glyph and metric tests). */
export const KIT_FONT_FILES: Readonly<Record<ThreeDFont, string>> = {
  serif: '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff',
  sans: '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff',
};

/**
 * Cap height over units per em, measured from the files above (fontkit; pinned by fonts.test.ts).
 * troika sizes text by em, so a label with cap height h uses fontSize h / ratio.
 */
export const CAP_HEIGHT_RATIO: Readonly<Record<ThreeDFont, number>> = {
  serif: 0.72,
  sans: 0.698,
};

/** troika's unicode fallback points here: a self-hosted, intentionally empty path. */
export const UNICODE_FALLBACK_URL = '/fonts/unicode-fallback';

/**
 * The troika text builder configuration, applied once by Placard.tsx:
 * - `unicodeFontsURL`: a glyph missing from our .woff must never reach a CDN; any request to the
 *   self-hosted empty path is a test failure (tests/e2e/fixtures.ts).
 * - `useWorker: false`: troika's typesetting worker loads its code with importScripts(blob:),
 *   which the CSP's `script-src 'self'` blocks (a blob worker inherits the page policy; only
 *   worker creation is covered by `worker-src blob:`). Typesetting the wall titles on the main
 *   thread costs a few milliseconds at boot, while the stage is still hidden. Glyph SDFs are
 *   drawn with WebGL on the main thread either way.
 */
export const TEXT_BUILDER_CONFIG = {
  unicodeFontsURL: UNICODE_FALLBACK_URL,
  useWorker: false,
} as const;

/** The troika fontSize that gives `capHeight` meters of cap height in `font`. */
export function fontSizeForCap(font: ThreeDFont, capHeight: number): number {
  return capHeight / CAP_HEIGHT_RATIO[font];
}
