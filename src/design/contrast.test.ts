import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  composite,
  contrastPairs,
  contrastRatio,
  formatRatio,
  parseColor,
  relativeLuminance,
  withAlpha,
} from './contrast';
import { tokens } from './tokens';

describe('contrast math (WCAG 2.2)', () => {
  it('parses hex and rgb() colors', () => {
    expect(parseColor('#0B0B0D')).toEqual({ r: 11, g: 11, b: 13, a: 1 });
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('rgba(14, 14, 17, 0.86)')).toEqual({ r: 14, g: 14, b: 17, a: 0.86 });
    expect(parseColor('rgb(1 2 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
    expect(() => parseColor('teal')).toThrow('Unsupported color');
  });

  it('matches the reference luminances and ratios', () => {
    expect(relativeLuminance('#FFFFFF')).toBe(1);
    expect(relativeLuminance('#000000')).toBe(0);
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 10);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBe(1);
    // The two greys either side of the 4.5:1 line on white.
    expect(contrastRatio('#767676', '#FFFFFF')).toBeCloseTo(4.54, 2);
    expect(contrastRatio('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    // Order does not matter.
    expect(contrastRatio('#FFFFFF', '#767676')).toBeCloseTo(contrastRatio('#767676', '#FFFFFF'));
  });

  it('composites translucent colors over an opaque backdrop in sRGB space', () => {
    expect(composite('rgba(255, 255, 255, 0.5)', '#000000')).toEqual({
      r: 127.5,
      g: 127.5,
      b: 127.5,
      a: 1,
    });
    const panel = composite(tokens.color.panel, tokens.color.ink);
    expect(panel.a).toBe(1);
    expect(panel.r).toBeCloseTo(0.86 * 14 + 0.14 * 11, 10);
    expect(withAlpha('#C9A36A', 0.6)).toEqual({ r: 201, g: 163, b: 106, a: 0.6 });
    expect(() => contrastRatio('#FFFFFF', tokens.color.panel)).toThrow('opaque background');
  });

  it('formats ratios for the docs', () => {
    expect(formatRatio(16.864)).toBe('16.9:1');
    expect(formatRatio(5.4567)).toBe('5.46:1');
    expect(formatRatio(3.66)).toBe('3.66:1');
  });
});

describe('color pairs (EXPERIENCE §7.2, §7.3, §7.8, §10.4)', () => {
  const pairs = contrastPairs();
  const cases = (use: string) =>
    pairs.filter((p) => p.use === use).map((p) => ({ name: `${p.fg} on ${p.bg}`, p }));

  it('covers every text pair the specs name', () => {
    const names = new Set(cases('text').map((c) => c.name));
    for (const fg of ['--text', '--text-2']) {
      for (const bg of ['--ink', '--wall', '--panel over --ink', '--panel solid']) {
        expect(names).toContain(`${fg} on ${bg}`);
      }
    }
    for (const fg of ['--paper-ink', '--paper-ink-2']) {
      for (const bg of ['--paper', '--paper-old']) expect(names).toContain(`${fg} on ${bg}`);
    }
    for (const name of ['--ink on --brass', '--brass on --ink', '--brass-hi on --ink']) {
      expect(names).toContain(name);
    }
    for (const theme of ['light', 'dark']) {
      for (const fg of ['classic text', 'classic text-2', 'classic link']) {
        expect(names).toContain(`${fg} on classic ${theme} bg`);
      }
    }
  });

  it.each(cases('text'))('text: $name is at least 4.5:1', ({ p }) => {
    expect(contrastRatio(p.foreground, p.background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(cases('focus'))('focus ring: $name is at least 3:1', ({ p }) => {
    expect(contrastRatio(p.foreground, p.background)).toBeGreaterThanOrEqual(3);
  });

  it.each(cases('boundary'))('boundary: $name is at least 3:1', ({ p }) => {
    expect(contrastRatio(p.foreground, p.background)).toBeGreaterThanOrEqual(3);
  });

  it('has focus rings for dark surfaces, paper and both classic themes', () => {
    const names = cases('focus').map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        '--brass-hi ring on --ink',
        '--brass-hi ring on --panel over --ink',
        '--paper-ink ring on --paper',
        '--paper-ink ring on --paper-old',
        'classic light ring on classic light bg',
        'classic dark ring on classic dark bg',
      ]),
    );
  });

  it('uses --text-3 for no text pair, and it would fail as text (3.7:1)', () => {
    const text3 = parseColor(tokens.color.text3);
    const textLike = pairs.filter((p) => p.use === 'text' || p.use === 'boundary');
    expect(textLike.filter((p) => p.fg === '--text-3')).toEqual([]);
    expect(
      textLike.filter((p) => p.foreground.r === text3.r && p.foreground.g === text3.g),
    ).toEqual([]);
    expect(contrastRatio(tokens.color.text3, tokens.color.ink)).toBeLessThan(4.5);
  });

  it.each(
    pairs.filter((p) => p.spec !== undefined).map((p) => ({ name: `${p.fg} on ${p.bg}`, p })),
  )('EXPERIENCE figure for $name matches the measured ratio', ({ p }) => {
    expect(Math.abs(contrastRatio(p.foreground, p.background) - p.spec!)).toBeLessThanOrEqual(0.05);
  });

  it('no stylesheet or inline style sets a text color from --text-3', () => {
    const src = fileURLToPath(new URL('..', import.meta.url));
    const files = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter(
      (f) => /\.(css|tsx?)$/.test(f) && !f.endsWith('.test.ts'),
    );
    // `color: var(--text-3)` in CSS, or `color: 'var(--text-3)'` in a style object. Strokes,
    // borders and fills may use it (`border-color`, `stroke`, `background`).
    const textColor = /(^|[\s;{,])color\s*:\s*['"]?var\(\s*--text-3\s*\)/m;
    const offenders = files.filter((f) => textColor.test(readFileSync(join(src, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
