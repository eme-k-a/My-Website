import { createRequire } from 'node:module';
import { basename } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FONT_FILES } from '../../../../scripts/check-glyphs';
import {
  CAP_HEIGHT_RATIO,
  KIT_FONTS,
  KIT_FONT_FILES,
  TEXT_BUILDER_CONFIG,
  UNICODE_FALLBACK_URL,
} from './fonts';

interface MetricsFont {
  unitsPerEm: number;
  capHeight: number;
}
const require = createRequire(import.meta.url);
const fontkit = require('fontkit') as { openSync(path: string): MetricsFont };

describe('kit fonts (ARCHITECTURE §8.3)', () => {
  it('are the same .woff files the glyph check reads', () => {
    for (const font of ['serif', 'sans'] as const) {
      expect(basename(FONT_FILES[font])).toBe(basename(KIT_FONT_FILES[font]));
      expect(KIT_FONTS[font]).toMatch(/\.woff$/);
      expect(basename(KIT_FONTS[font])).toBe(basename(KIT_FONT_FILES[font]));
    }
  });

  it('pin the cap-height ratios measured from the font files', () => {
    for (const font of ['serif', 'sans'] as const) {
      const metrics = fontkit.openSync(require.resolve(KIT_FONT_FILES[font]));
      expect(CAP_HEIGHT_RATIO[font], font).toBeCloseTo(metrics.capHeight / metrics.unitsPerEm, 6);
    }
  });

  it('point troika fallbacks at a same-origin path and keep typesetting off blob workers', () => {
    expect(UNICODE_FALLBACK_URL).toBe('/fonts/unicode-fallback');
    expect(TEXT_BUILDER_CONFIG).toEqual({
      unicodeFontsURL: UNICODE_FALLBACK_URL,
      useWorker: false,
    });
  });
});
