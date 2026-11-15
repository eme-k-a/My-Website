// WCAG 2.2 contrast math (relative luminance, contrast ratio, source-over compositing) and the
// list of every text, focus and boundary color pair the design uses (EXPERIENCE §7.2, §7.3,
// §7.8, §10.4). contrast.test.ts asserts the thresholds; docs/ART_DIRECTION.md §2 records the
// measured ratios. Pure functions, no DOM: safe in Node, tests and the client.
import { tokens } from './tokens';

/** sRGB channels 0 to 255, alpha 0 to 1. */
export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export type ColorInput = string | Rgba;

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
const RGB_FN = /^rgba?\(\s*([^)]*)\)$/i;

/** Parses `#rgb`, `#rrggbb`, `rgb(r, g, b)` and `rgba(r, g, b, a)` (commas or spaces). */
export function parseColor(input: ColorInput): Rgba {
  if (typeof input !== 'string') return input;
  const value = input.trim();
  const hex = HEX.exec(value);
  if (hex) {
    const digits = hex[1]!;
    const full = digits.length === 3 ? [...digits].map((d) => d + d).join('') : digits;
    return {
      r: parseInt(full.slice(0, 2), 16),
      g: parseInt(full.slice(2, 4), 16),
      b: parseInt(full.slice(4, 6), 16),
      a: 1,
    };
  }
  const fn = RGB_FN.exec(value);
  if (fn) {
    const parts = fn[1]!
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map((p) => (p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p)));
    if ((parts.length === 3 || parts.length === 4) && parts.every((p) => Number.isFinite(p))) {
      const [r, g, b, a = 1] = parts as [number, number, number, number?];
      return { r, g, b, a };
    }
  }
  throw new Error(`Unsupported color: ${input}`);
}

/** The same color at the given opacity. */
export function withAlpha(color: ColorInput, alpha: number): Rgba {
  return { ...parseColor(color), a: alpha };
}

/** Source-over compositing in sRGB space, as browsers blend: `top` painted over `bottom`. */
export function composite(top: ColorInput, bottom: ColorInput): Rgba {
  const t = parseColor(top);
  const b = parseColor(bottom);
  const a = t.a + b.a * (1 - t.a);
  if (a === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (ct: number, cb: number) => (ct * t.a + cb * b.a * (1 - t.a)) / a;
  return { r: mix(t.r, b.r), g: mix(t.g, b.g), b: mix(t.b, b.b), a };
}

function linear(c255: number): number {
  const c = c255 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of an opaque color (0 for black, 1 for white). */
export function relativeLuminance(color: ColorInput): number {
  const c = parseColor(color);
  if (c.a < 1) throw new Error('relativeLuminance needs an opaque color; composite it first');
  return 0.2126 * linear(c.r) + 0.7152 * linear(c.g) + 0.0722 * linear(c.b);
}

/**
 * WCAG contrast ratio, 1 to 21. A translucent foreground is composited over the background
 * first; the background must be opaque (composite a translucent panel over its backdrop).
 */
export function contrastRatio(foreground: ColorInput, background: ColorInput): number {
  const bg = parseColor(background);
  if (bg.a < 1) throw new Error('contrastRatio needs an opaque background; composite it first');
  const l1 = relativeLuminance(composite(foreground, bg));
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

/** `16.86` -> `16.9:1`; two decimals below 10, so 5.45 stays visible. */
export function formatRatio(ratio: number): string {
  return `${ratio >= 10 ? ratio.toFixed(1) : ratio.toFixed(2)}:1`;
}

/**
 * Brass opacities used by the UI chrome (EXPERIENCE §7.8), mirrored in tokens.css as
 * `--hairline` and `--border-secondary`. The secondary-button border is 0.6, not §7.8's 0.5:
 * at 0.5 it measures 2.85:1 on --ink, below the 3:1 that EXPERIENCE §10.4 asks of UI
 * boundaries (docs/ART_DIRECTION.md §6).
 */
export const CHROME_ALPHA = { hairline: 0.28, secondaryBorder: 0.6 } as const;

/**
 * What a pair is for. `text`: text, at least 4.5:1 (WCAG 1.4.3). `focus`: focus rings, at
 * least 3:1 (WCAG 1.4.11). `boundary`: control boundaries, at least 3:1 (EXPERIENCE §10.4).
 * `decorative`: never text or a boundary, recorded so the doc can show why.
 */
export type PairUse = 'text' | 'focus' | 'boundary' | 'decorative';

export interface ContrastPair {
  /** Foreground name as the CSS uses it, for example `--text-2` or `classic link`. */
  fg: string;
  /** Background name, for example `--panel over --ink`. */
  bg: string;
  use: PairUse;
  foreground: Rgba;
  /** Always opaque (translucent panels are composited over their backdrop). */
  background: Rgba;
  /** The minimum the test enforces (0 for decorative pairs). */
  min: number;
  /** The figure printed in EXPERIENCE §7.2 or §7.3, when it gives one. */
  spec?: number;
}

const MIN: Record<PairUse, number> = { text: 4.5, focus: 3, boundary: 3, decorative: 0 };

function pair(
  fg: string,
  bg: string,
  use: PairUse,
  foreground: ColorInput,
  background: ColorInput,
  spec?: number,
): ContrastPair {
  return {
    fg,
    bg,
    use,
    foreground: parseColor(foreground),
    background: parseColor(background),
    min: MIN[use],
    ...(spec === undefined ? {} : { spec }),
  };
}

/** Every color pair the design puts text, a focus ring or a control boundary on. */
export function contrastPairs(): ContrastPair[] {
  const c = tokens.color;
  const light = tokens.classic.light;
  const dark = tokens.classic.dark;
  // Panels are translucent: check them over the dark room (the usual case) and over the
  // brightest thing the canvas can show behind them (a light-0 pool).
  const panelOverInk = composite(c.panel, c.ink);
  const panelOverPool = composite(c.panel, tokens.light.ramp[0]);
  const PANEL = '--panel over --ink';
  const PANEL_POOL = '--panel over light-0';
  const SOLID = '--panel solid';
  const darkSurfaces = [
    ['--ink', c.ink],
    ['--wall', c.wall],
    [SOLID, c.panelSolid],
  ] as const;
  return [
    // Gallery text on dark surfaces.
    pair('--text', '--ink', 'text', c.text, c.ink, 16.9),
    pair('--text', '--wall', 'text', c.text, c.wall),
    pair('--text', PANEL, 'text', c.text, panelOverInk),
    pair('--text', SOLID, 'text', c.text, c.panelSolid, 16.4),
    pair('--text', PANEL_POOL, 'text', c.text, panelOverPool),
    pair('--text-2', '--ink', 'text', c.text2, c.ink, 7.8),
    pair('--text-2', '--wall', 'text', c.text2, c.wall, 7.3),
    pair('--text-2', PANEL, 'text', c.text2, panelOverInk),
    pair('--text-2', SOLID, 'text', c.text2, c.panelSolid),
    pair('--text-2', PANEL_POOL, 'text', c.text2, panelOverPool),
    // Accent text, the primary button and its hover.
    pair('--brass', '--ink', 'text', c.brass, c.ink, 8.4),
    pair('--brass', PANEL, 'text', c.brass, panelOverInk),
    pair('--brass-hi', '--ink', 'text', c.brassHi, c.ink, 11.8),
    pair('--brass-hi', PANEL, 'text', c.brassHi, panelOverInk),
    pair('--ink', '--brass', 'text', c.ink, c.brass, 8.4),
    pair('--ink', '--brass-hi', 'text', c.ink, c.brassHi),
    pair('--signal', '--ink', 'text', c.signal, c.ink, 11.1),
    pair('--signal', PANEL, 'text', c.signal, panelOverInk),
    // Placard paper, newest to oldest.
    pair('--paper-ink', '--paper', 'text', c.paperInk, c.paper, 14.6),
    pair('--paper-ink', '--paper-old', 'text', c.paperInk, c.paperOld, 12.8),
    pair('--paper-ink-2', '--paper', 'text', c.paperInk2, c.paper, 6.2),
    pair('--paper-ink-2', '--paper-old', 'text', c.paperInk2, c.paperOld, 5.45),
    // Classic page, light theme.
    pair('classic text', 'classic light bg', 'text', light.text, light.bg, 16.6),
    pair('classic text-2', 'classic light bg', 'text', light.text2, light.bg, 7.5),
    pair('classic link', 'classic light bg', 'text', light.link, light.bg, 5.9),
    // Classic page, dark theme (the gallery tokens, links in --brass-hi).
    pair('classic text', 'classic dark bg', 'text', dark.text, dark.bg),
    pair('classic text-2', 'classic dark bg', 'text', dark.text2, dark.bg),
    pair('classic link', 'classic dark bg', 'text', dark.link, dark.bg),
    // Print: black on white.
    pair('print text', 'print bg', 'text', '#000000', '#FFFFFF'),
    // Focus rings: 2 px --brass-hi on dark surfaces, 2 px --paper-ink on paper (EXPERIENCE §7.8).
    ...darkSurfaces.map(([name, bg]) => pair('--brass-hi ring', name, 'focus', c.brassHi, bg)),
    pair('--brass-hi ring', PANEL, 'focus', c.brassHi, panelOverInk),
    pair('--paper-ink ring', '--paper', 'focus', c.paperInk, c.paper),
    pair('--paper-ink ring', '--paper-old', 'focus', c.paperInk, c.paperOld),
    pair('classic light ring', 'classic light bg', 'focus', light.text, light.bg),
    pair('classic dark ring', 'classic dark bg', 'focus', dark.link, dark.bg),
    // Secondary button boundary: 1 px --border-secondary.
    ...darkSurfaces.map(([name, bg]) =>
      pair(
        '--border-secondary',
        name,
        'boundary',
        composite(withAlpha(c.brass, CHROME_ALPHA.secondaryBorder), bg),
        bg,
      ),
    ),
    // Decorative only: never text and never a boundary.
    pair('--text-3', '--ink', 'decorative', c.text3, c.ink, 3.7),
    pair('--text-3', '--wall', 'decorative', c.text3, c.wall),
    pair(
      '--hairline',
      '--ink',
      'decorative',
      composite(withAlpha(c.brass, CHROME_ALPHA.hairline), c.ink),
      c.ink,
    ),
  ];
}
