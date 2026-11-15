// The 3D label fonts (ARCHITECTURE §8.3, EXPERIENCE §7.7): .woff subsets troika reads (it cannot
// read woff2), written by `npm run fonts` (scripts/subset-fonts.ts, WP-28) to public/fonts/ and
// served same-origin. Every kit and environment <Text> passes one of these as `font`; troika's
// default would fetch from a CDN. scripts/check-glyphs.ts checks the same files.
import type { ThreeDFont } from '../../../content/selectors';

/** Font URL per 3D font: 'serif' is Instrument Serif 400, 'sans' is IBM Plex Sans 500. */
export const KIT_FONTS: Readonly<Record<ThreeDFont, string>> = {
  serif: '/fonts/instrument-serif-400.woff',
  sans: '/fonts/ibm-plex-sans-500.woff',
};

/**
 * The repo files behind KIT_FONTS (for the glyph and metric tests), relative to this folder so a
 * kit test's `require.resolve` finds them.
 */
export const KIT_FONT_FILES: Readonly<Record<ThreeDFont, string>> = {
  serif: '../../../../public/fonts/instrument-serif-400.woff',
  sans: '../../../../public/fonts/ibm-plex-sans-500.woff',
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

/** Cap heights and troika sizes live in titleMetrics.ts, which Node can load (no ?url imports). */
export { CAP_HEIGHT_RATIO, fontSizeForCap } from './titleMetrics';
