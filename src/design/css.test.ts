import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CHROME_ALPHA, parseColor, withAlpha } from './contrast';
import { tokens } from './tokens';

const here = dirname(fileURLToPath(import.meta.url));
const read = (file: string) => readFileSync(resolve(here, file), 'utf8');
const require = createRequire(import.meta.url);

interface Rule {
  prelude: string;
  /** Enclosing at-rule preludes, outermost first. */
  context: string[];
  decls: Map<string, string>;
}

const normalize = (s: string) => s.replace(/\s+/g, ' ').replace(/"/g, "'").trim();

function declarations(body: string): Map<string, string> {
  const decls = new Map<string, string>();
  for (const part of body.split(';')) {
    const colon = part.indexOf(':');
    if (colon > 0) decls.set(part.slice(0, colon).trim(), normalize(part.slice(colon + 1)));
  }
  return decls;
}

/** A small CSS rule scanner: enough for these two files (no strings containing braces). */
function parseRules(css: string): Rule[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: Rule[] = [];
  const stack: { prelude: string; body: string }[] = [];
  let buffer = '';
  for (const ch of source) {
    if (ch === '{') {
      const cut = buffer.lastIndexOf(';') + 1;
      const parent = stack.at(-1);
      if (parent) parent.body += buffer.slice(0, cut);
      stack.push({ prelude: normalize(buffer.slice(cut)), body: '' });
      buffer = '';
    } else if (ch === '}') {
      const rule = stack.pop()!;
      rule.body += buffer;
      buffer = '';
      rules.push({
        prelude: rule.prelude,
        context: stack.map((s) => s.prelude),
        decls: declarations(rule.body),
      });
    } else {
      buffer += ch;
    }
  }
  return rules;
}

function rule(rules: Rule[], prelude: string, context: string[] = []): Rule {
  const found = rules.filter(
    (r) => r.prelude === prelude && r.context.join('|') === context.join('|'),
  );
  expect(found, `${context.join(' ')} ${prelude}`).toHaveLength(1);
  return found[0]!;
}

const sameColor = (a: string | undefined, b: string) => {
  expect(a, `expected ${b}`).toBeDefined();
  expect(parseColor(a!)).toEqual(parseColor(b));
};

describe('tokens.css mirrors tokens.ts (EXPERIENCE §7.2 to §7.4)', () => {
  const rules = parseRules(read('tokens.css'));
  const root = rule(rules, ':root').decls;
  const c = tokens.color;

  it('defines every name the brief lists', () => {
    const names = [
      '--ink',
      '--wall',
      '--floor',
      '--plinth',
      '--panel',
      '--text',
      '--text-2',
      '--text-3',
      '--brass',
      '--brass-hi',
      '--paper',
      '--paper-old',
      '--paper-ink',
      '--paper-ink-2',
      '--signal',
      '--dur-fast',
      '--dur-base',
      '--dur-slow',
      '--ease-out',
      '--ease-in-out',
      '--rail-smooth',
      '--fade-cut',
      '--vignette',
    ];
    expect(names.filter((n) => !root.has(n))).toEqual([]);
  });

  it('color values equal the tokens', () => {
    const colors: Record<string, string> = {
      '--ink': c.ink,
      '--wall': c.wall,
      '--floor': c.floor,
      '--plinth': c.plinth,
      '--panel': c.panel,
      '--panel-solid': c.panelSolid,
      '--text': c.text,
      '--text-2': c.text2,
      '--text-3': c.text3,
      '--brass': c.brass,
      '--brass-hi': c.brassHi,
      '--brass-metal': c.brassMetal,
      '--signal': c.signal,
      '--paper': c.paper,
      '--paper-old': c.paperOld,
      '--paper-ink': c.paperInk,
      '--paper-ink-2': c.paperInk2,
      '--ceramic': c.ceramic,
      '--graphite': c.graphite,
      '--walnut': c.walnut,
      '--frost': c.frost,
      '--ceiling-slot': c.ceilingSlot,
      '--duo-shadow': c.duoShadow,
      '--duo-light': c.duoLight,
      '--light-0': tokens.light.ramp[0],
      '--light-1': tokens.light.ramp[1],
      '--light-2': tokens.light.ramp[2],
      '--light-3': tokens.light.ramp[3],
    };
    for (const [name, value] of Object.entries(colors)) sameColor(root.get(name), value);
  });

  it('motion and vignette values equal the tokens', () => {
    const m = tokens.motion;
    expect(root.get('--dur-fast')).toBe(`${m.durFast}ms`);
    expect(root.get('--dur-base')).toBe(`${m.durBase}ms`);
    expect(root.get('--dur-slow')).toBe(`${m.durSlow}ms`);
    expect(root.get('--ease-out')).toBe(m.easeOut);
    expect(root.get('--ease-in-out')).toBe(m.easeInOut);
    expect(root.get('--rail-smooth')).toBe(`${m.railSmoothTime}s`);
    expect(root.get('--fade-cut')).toBe(`${m.fadeCutMs}ms`);
    expect(root.get('--vignette')).toBe(normalize(tokens.render.vignette));
    expect(root.get('--vignette')).toBe(
      'radial-gradient(ellipse at center, transparent 55%, rgba(11, 11, 13, 0.55) 100%)',
    );
  });

  it('type scale follows EXPERIENCE §7.7 and falls back to the metric-matched faces', () => {
    expect(root.get('--type-display')).toBe('clamp(36px, 6vw, 88px)');
    expect(root.get('--type-h2')).toBe('clamp(32px, 3vw, 44px)');
    expect(root.get('--type-title')).toBe('28px');
    expect(root.get('--type-body')).toBe('16px');
    expect(root.get('--type-small')).toBe('14px');
    expect(root.get('--type-label')).toBe('12px');
    expect(root.get('--font-serif')).toMatch(/^'Instrument Serif', 'Instrument Serif Fallback'/);
    expect(root.get('--font-sans')).toMatch(/^'IBM Plex Sans', 'IBM Plex Sans Fallback'/);
  });

  it('chrome hairline and secondary border are brass at the documented opacities', () => {
    sameColor(root.get('--hairline'), rgba(withAlpha(c.brass, CHROME_ALPHA.hairline)));
    sameColor(
      root.get('--border-secondary'),
      rgba(withAlpha(c.brass, CHROME_ALPHA.secondaryBorder)),
    );
  });

  it('classic page: light by default, dark with the system, black on white in print', () => {
    const sel = "[data-page='classic']";
    const light = rule(rules, sel).decls;
    const dark = rule(rules, sel, ['@media (prefers-color-scheme: dark)']).decls;
    const print = rule(rules, sel, ['@media print']).decls;
    const { light: l, dark: d } = tokens.classic;
    sameColor(light.get('--cv-bg'), l.bg);
    sameColor(light.get('--cv-text'), l.text);
    sameColor(light.get('--cv-text-2'), l.text2);
    sameColor(light.get('--cv-link'), l.link);
    sameColor(dark.get('--cv-bg'), d.bg);
    sameColor(dark.get('--cv-text'), d.text);
    sameColor(dark.get('--cv-text-2'), d.text2);
    sameColor(dark.get('--cv-link'), d.link);
    sameColor(dark.get('--cv-focus'), tokens.color.brassHi);
    sameColor(print.get('--cv-bg'), '#FFFFFF');
    for (const name of ['--cv-text', '--cv-text-2', '--cv-link']) {
      sameColor(print.get(name), '#000000');
    }
  });
});

function rgba(c: { r: number; g: number; b: number; a: number }) {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
}

describe('fonts.css (EXPERIENCE §7.7, ARCHITECTURE §8.3)', () => {
  const css = read('fonts.css');
  const imports = [...css.matchAll(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g)].map(
    (m) => m[1]!,
  );

  it('imports the four latin faces from @fontsource, in order', () => {
    expect(imports).toEqual([
      '@fontsource/instrument-serif/latin-400.css',
      '@fontsource/instrument-serif/latin-400-italic.css',
      '@fontsource/ibm-plex-sans/latin-400.css',
      '@fontsource/ibm-plex-sans/latin-500.css',
    ]);
  });

  it.each(imports)('%s resolves in node_modules to local woff2 and woff files', (spec) => {
    const file = require.resolve(spec);
    expect(file).toMatch(/node_modules[\\/]@fontsource[\\/]/);
    const face = readFileSync(file, 'utf8');
    const urls = [...face.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)].map((m) => m[1]!);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      expect(url).not.toMatch(/^(https?:)?\/\//);
      expect(existsSync(resolve(dirname(file), url)), url).toBe(true);
    }
    expect(urls.some((u) => u.endsWith('.woff2'))).toBe(true);
    expect(urls.some((u) => u.endsWith('.woff'))).toBe(true);
    expect(face).toMatch(/font-display:\s*swap/);
  });

  it('declares metric-matched local fallbacks for Georgia and Arial', () => {
    const faces = parseRules(css).filter((r) => r.prelude === '@font-face');
    const describeFace = (r: Rule) =>
      `${r.decls.get('font-family')} ${r.decls.get('font-style')} ${r.decls.get('font-weight')}`;
    expect(faces.map(describeFace)).toEqual([
      "'Instrument Serif Fallback' normal 400",
      "'Instrument Serif Fallback' italic 400",
      "'IBM Plex Sans Fallback' normal 400",
      "'IBM Plex Sans Fallback' normal 500",
    ]);
    for (const face of faces) {
      const src = face.decls.get('src')!;
      expect(src).toMatch(/^local\(/);
      expect(src).not.toMatch(/url\(/);
      const family = face.decls.get('font-family')!;
      expect(src).toContain(family.includes('Serif') ? "local('Georgia" : "local('Arial'");
      for (const prop of ['size-adjust', 'ascent-override', 'descent-override']) {
        const value = face.decls.get(prop);
        expect(value, `${describeFace(face)} ${prop}`).toMatch(/^\d+(\.\d+)?%$/);
        expect(parseFloat(value!)).toBeGreaterThan(prop === 'descent-override' ? 10 : 50);
        expect(parseFloat(value!)).toBeLessThan(150);
      }
    }
  });

  it('neither stylesheet names another origin', () => {
    for (const file of ['fonts.css', 'tokens.css']) {
      expect(read(file)).not.toMatch(/(https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i);
    }
  });
});
