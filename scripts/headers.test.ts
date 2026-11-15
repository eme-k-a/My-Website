// dist/_headers generation (ARCHITECTURE §12.1, §13.1): the boot-script hash, the inline-script
// rules, the cache rules and the overlap rule (Netlify merges headers of overlapping paths).
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bootScriptHash,
  contentSecurityPolicy,
  findHeaderConflicts,
  headerRules,
  IMMUTABLE,
  parseHeaders,
  pathsOverlap,
  patternToRegExp,
  PDF_DISPOSITION,
  REVALIDATE,
  scanHtml,
  scriptHash,
  serializeHeaders,
  writeHeaders,
} from './headers';

// Known values, computed independently with `printf %s '<script>' | openssl dgst -sha256 -binary | base64`.
const BOOT = "document.documentElement.dataset.mode='museum';";
const BOOT_HASH = 'F2awcDLgfvuZi19vaJdj4HTiXeDMr0WiHxSQY/9tJCY=';
const EMPTY_HASH = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';

const page = (head: string, body = '') =>
  `<!doctype html><html lang="en-CA"><head><meta charset="utf-8" />${head}</head><body>${body}</body></html>`;
const JSON_LD = '<script type="application/ld+json">{"@type":"Person"}</script>';
const MODULE = '<script type="module" crossorigin src="/assets/main-abc.js"></script>';

const valueOf = (rules: ReturnType<typeof headerRules>, path: string, name: string) =>
  rules.find((r) => r.path === path)?.headers.find(([n]) => n === name)?.[1];

describe('scriptHash', () => {
  it('is the base64 SHA-256 of the exact script text', () => {
    expect(scriptHash(BOOT)).toBe(BOOT_HASH);
    expect(scriptHash('')).toBe(EMPTY_HASH);
    expect(scriptHash(`${BOOT}\n`)).not.toBe(BOOT_HASH);
  });
});

describe('scanHtml', () => {
  it('returns inline executable scripts and skips external scripts, JSON-LD and comments', () => {
    const html = page(
      `<!--ssr:head-->${JSON_LD}<script>${BOOT}</script>${MODULE}<!-- <script>x</script> -->`,
    );
    expect(scanHtml(html)).toEqual({ inlineScripts: [BOOT], handlers: [] });
  });

  it('finds inline event handler attributes on any tag', () => {
    const html = page(
      '',
      `<img src="a.png" alt="x > y" onerror="go()"><button ONCLICK='x'>b</button>`,
    );
    expect(scanHtml(html).handlers).toEqual(['<img onerror=>', '<button onclick=>']);
  });

  it('does not read handler-like text inside quoted attribute values or text', () => {
    const html = page('<meta name="description" content="Click onclick=x">', '<p>onload=1</p>');
    expect(scanHtml(html)).toEqual({ inlineScripts: [], handlers: [] });
  });
});

describe('bootScriptHash', () => {
  it('hashes the boot script shared by every page that has one', () => {
    const result = bootScriptHash([
      { file: 'dist/index.html', html: page(`<script>${BOOT}</script>${MODULE}`) },
      { file: 'dist/exhibit/verafin/index.html', html: page(`${JSON_LD}<script>${BOOT}</script>`) },
      { file: 'dist/resume/index.html', html: page('') },
    ]);
    expect(result).toEqual({
      hash: BOOT_HASH,
      pages: ['dist/index.html', 'dist/exhibit/verafin/index.html'],
    });
  });

  it('returns null when no page has an inline script yet', () => {
    expect(bootScriptHash([{ file: 'dist/index.html', html: page(MODULE) }]).hash).toBeNull();
  });

  it('throws on a page with a second inline script', () => {
    const html = page(`<script>${BOOT}</script>`, `<script>${BOOT}</script>`);
    expect(() => bootScriptHash([{ file: 'dist/index.html', html }])).toThrow(
      /dist\/index\.html: 2 inline scripts/,
    );
  });

  it('throws when pages carry different inline scripts', () => {
    expect(() =>
      bootScriptHash([
        { file: 'dist/index.html', html: page(`<script>${BOOT}</script>`) },
        { file: 'dist/404.html', html: page('<script>console.log(1)</script>') },
      ]),
    ).toThrow(/dist\/404\.html: inline script differs from the boot script in dist\/index\.html/);
  });

  it('throws on an inline event handler', () => {
    expect(() =>
      bootScriptHash([{ file: 'dist/index.html', html: page('', '<body onload="x()">') }]),
    ).toThrow(/inline event handler <body onload=>/);
  });
});

describe('headerRules', () => {
  it('puts the boot hash in script-src, and only self without one', () => {
    expect(contentSecurityPolicy(BOOT_HASH)).toContain(`script-src 'self' 'sha256-${BOOT_HASH}';`);
    expect(contentSecurityPolicy(null)).toContain("script-src 'self';");
    for (const csp of [contentSecurityPolicy(BOOT_HASH), contentSecurityPolicy(null)]) {
      expect(csp).not.toMatch(/script-src[^;]*unsafe|wasm-unsafe-eval|https?:/);
      expect(csp).toContain("frame-ancestors 'none'");
    }
  });

  it('sets the security headers on /* and the cache rules of ARCHITECTURE §12.1', () => {
    const rules = headerRules(BOOT_HASH);
    expect(rules.map((r) => r.path)).toEqual([
      '/*',
      '/assets/*',
      '/',
      '/index.html',
      '/exhibit/*',
      '/resume/*',
      '/resume.pdf',
      '/404.html',
    ]);
    expect(rules[0]!.headers.map(([n]) => n)).toEqual([
      'Content-Security-Policy',
      'Referrer-Policy',
      'Permissions-Policy',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Cross-Origin-Opener-Policy',
    ]);
    expect(valueOf(rules, '/resume.pdf', 'Content-Disposition')).toBe(PDF_DISPOSITION);
    for (const path of [
      '/',
      '/index.html',
      '/exhibit/*',
      '/resume/*',
      '/resume.pdf',
      '/404.html',
    ]) {
      expect(valueOf(rules, path, 'Cache-Control')).toBe(REVALIDATE);
    }
  });

  it('makes only /assets/* immutable', () => {
    const immutable = headerRules(BOOT_HASH)
      .filter((r) => r.headers.some(([, v]) => v.includes('immutable')))
      .map((r) => r.path);
    expect(immutable).toEqual(['/assets/*']);
    expect(valueOf(headerRules(null), '/assets/*', 'Cache-Control')).toBe(IMMUTABLE);
  });

  it('never sets one header name in two rules whose paths overlap', () => {
    expect(findHeaderConflicts(headerRules(BOOT_HASH))).toEqual([]);
    expect(findHeaderConflicts(headerRules(null))).toEqual([]);
  });
});

describe('path patterns', () => {
  it('match like Netlify splats and placeholders', () => {
    expect(patternToRegExp('/*').test('/resume.pdf')).toBe(true);
    expect(patternToRegExp('/assets/*').test('/assets/main-abc.js')).toBe(true);
    expect(patternToRegExp('/assets/*').test('/assetsx/a.js')).toBe(false);
    expect(patternToRegExp('/exhibit/:id/').test('/exhibit/verafin/')).toBe(true);
    expect(patternToRegExp('/exhibit/:id/').test('/exhibit/a/b/')).toBe(false);
    expect(patternToRegExp('/resume.pdf').test('/resumexpdf')).toBe(false);
  });

  it('detect overlapping paths', () => {
    expect(pathsOverlap('/*', '/')).toBe(true);
    expect(pathsOverlap('/*', '/assets/*')).toBe(true);
    expect(pathsOverlap('/resume/*', '/resume/x/*')).toBe(true);
    expect(pathsOverlap('/exhibit/*', '/exhibit/verafin/')).toBe(true);
    expect(pathsOverlap('/', '/index.html')).toBe(false);
    expect(pathsOverlap('/resume/*', '/resume.pdf')).toBe(false);
    expect(pathsOverlap('/assets/*', '/exhibit/*')).toBe(false);
  });

  it('report a header set by two overlapping rules', () => {
    const conflicts = findHeaderConflicts([
      { path: '/*', headers: [['Cache-Control', REVALIDATE]] },
      { path: '/assets/*', headers: [['cache-control', IMMUTABLE]] },
      { path: '/resume.pdf', headers: [['Content-Disposition', PDF_DISPOSITION]] },
    ]);
    expect(conflicts).toEqual(['cache-control is set by both /* and /assets/*, which overlap']);
  });
});

describe('serializeHeaders and parseHeaders', () => {
  it('round-trip the Netlify format', () => {
    const rules = headerRules(BOOT_HASH);
    const text = serializeHeaders(rules);
    expect(text).toMatch(/^\/\*\n {2}Content-Security-Policy: default-src 'self'; /);
    expect(text.endsWith('\n')).toBe(true);
    expect(parseHeaders(`# comment\n\n${text}`)).toEqual(rules);
  });

  it('rejects a header line without a path', () => {
    expect(() => parseHeaders('  X-Frame-Options: DENY')).toThrow(/line 1/);
  });
});

describe('writeHeaders', () => {
  let dist: string;
  beforeEach(async () => {
    dist = join(await mkdtemp(join(tmpdir(), 'headers-')), 'dist');
    await mkdir(join(dist, 'resume'), { recursive: true });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(async () => {
    await rm(join(dist, '..'), { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('writes dist/_headers with the hash of the built boot script', async () => {
    await writeFile(join(dist, 'index.html'), page(`<script>${BOOT}</script>${MODULE}`));
    await writeFile(join(dist, 'resume', 'index.html'), page(''));
    const out = await writeHeaders(dist);
    const text = await readFile(out, 'utf8');
    expect(out).toBe(join(dist, '_headers'));
    expect(text).toContain(`script-src 'self' 'sha256-${BOOT_HASH}'`);
    expect(text.match(/immutable/g)).toHaveLength(1);
    expect(parseHeaders(text)).toEqual(headerRules(BOOT_HASH));
  });

  it('fails the build when a page breaks the inline-script rules', async () => {
    await writeFile(join(dist, 'index.html'), page(`<script>${BOOT}</script><script>x()</script>`));
    await expect(writeHeaders(dist)).rejects.toThrow(/2 inline scripts/);
  });
});
