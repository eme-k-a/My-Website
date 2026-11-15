// Production headers (ARCHITECTURE §12.1, R10). `writeHeaders()` runs from scripts/postbuild.ts
// after the pages are prerendered and writes dist/_headers, the only source of response headers:
// Netlify serves it, and scripts/serve-dist.ts applies it to every local test run.
//
// The inline boot script is the one script the CSP allows by hash. Every built HTML file is
// scanned: each page may hold at most one inline executable script, every such script must be
// byte-identical across pages (the boot script), and no inline event handler attribute (on*=) may
// exist. JSON-LD (`type="application/ld+json"`) is a data block and needs no hash.
//
// The Netlify `_headers` helpers (parse, serialize, path patterns, overlap) live here too, so
// serve-dist matches paths exactly as this file reasons about them.
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DIST = join(ROOT, 'dist');

export type Header = [name: string, value: string];
export interface HeaderRule {
  path: string;
  headers: Header[];
}

export const REVALIDATE = 'public, max-age=0, must-revalidate';
export const IMMUTABLE = 'public, max-age=31536000, immutable';
export const PDF_DISPOSITION = 'inline; filename="Chukwuemeka-Nduka-Nwagbo-Resume.pdf"';

/** The CSP of ARCHITECTURE §12.1; `'self'` alone in script-src until an inline script exists. */
export function contentSecurityPolicy(bootHash: string | null): string {
  const scriptSrc = bootHash === null ? "'self'" : `'self' 'sha256-${bootHash}'`;
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "worker-src 'self' blob:",
    "img-src 'self' data: blob:",
    "style-src 'self' 'unsafe-inline'",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

/** Every rule of dist/_headers, in file order. Only /assets/* is immutable. */
export function headerRules(bootHash: string | null): HeaderRule[] {
  const revalidate = (path: string): HeaderRule => ({
    path,
    headers: [['Cache-Control', REVALIDATE]],
  });
  return [
    {
      path: '/*',
      headers: [
        ['Content-Security-Policy', contentSecurityPolicy(bootHash)],
        ['Referrer-Policy', 'strict-origin-when-cross-origin'],
        [
          'Permissions-Policy',
          'camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()',
        ],
        ['X-Content-Type-Options', 'nosniff'],
        ['X-Frame-Options', 'DENY'],
        ['Cross-Origin-Opener-Policy', 'same-origin'],
      ],
    },
    { path: '/assets/*', headers: [['Cache-Control', IMMUTABLE]] },
    revalidate('/'),
    revalidate('/index.html'),
    revalidate('/exhibit/*'),
    revalidate('/resume/*'),
    {
      path: '/resume.pdf',
      headers: [
        ['Cache-Control', REVALIDATE],
        ['Content-Disposition', PDF_DISPOSITION],
      ],
    },
    revalidate('/404.html'),
  ];
}

export function serializeHeaders(rules: HeaderRule[]): string {
  return rules
    .map((r) => [r.path, ...r.headers.map(([name, value]) => `  ${name}: ${value}`)].join('\n'))
    .join('\n')
    .concat('\n');
}

/** Netlify `_headers` syntax: an unindented path line, then indented `Name: value` lines. */
export function parseHeaders(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const [i, raw] of text.split(/\r?\n/).entries()) {
    const line = raw.trimEnd();
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ path: line.trim(), headers: [] });
      continue;
    }
    const rule = rules.at(-1);
    const colon = line.indexOf(':');
    if (!rule || colon < 0) throw new Error(`_headers line ${i + 1}: expected "Name: value"`);
    rule.headers.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
  }
  return rules;
}

/** Netlify path pattern to a RegExp: `*` matches anything, a `:name` segment one segment. */
export function patternToRegExp(pattern: string): RegExp {
  const source = pattern
    .split(/(\*|:[A-Za-z_][A-Za-z0-9_]*)/)
    .map((part) => {
      if (part === '*') return '.*';
      if (part.startsWith(':') && part.length > 1) return '[^/]+';
      return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('');
  return new RegExp(`^${source}$`);
}

const wildcardAt = (pattern: string) => {
  const star = pattern.indexOf('*');
  const param = pattern.search(/\/:[A-Za-z_]/);
  const cuts = [star, param < 0 ? -1 : param + 1].filter((n) => n >= 0);
  return cuts.length === 0 ? -1 : Math.min(...cuts);
};

/**
 * Whether some request path matches both patterns. Exact against wildcard is decided exactly;
 * two wildcard patterns overlap when one literal prefix starts with the other (conservative: it
 * may report an overlap that no real path hits, never the reverse).
 */
export function pathsOverlap(a: string, b: string): boolean {
  const wa = wildcardAt(a);
  const wb = wildcardAt(b);
  if (wa < 0 && wb < 0) return a === b;
  if (wa < 0) return patternToRegExp(b).test(a);
  if (wb < 0) return patternToRegExp(a).test(b);
  const pa = a.slice(0, wa);
  const pb = b.slice(0, wb);
  return pa.startsWith(pb) || pb.startsWith(pa);
}

/** Header names set by two rules whose paths overlap (Netlify would merge both values). */
export function findHeaderConflicts(rules: HeaderRule[]): string[] {
  const conflicts: string[] = [];
  for (const [i, a] of rules.entries()) {
    for (const b of rules.slice(i + 1)) {
      if (!pathsOverlap(a.path, b.path)) continue;
      const names = new Set(a.headers.map(([n]) => n.toLowerCase()));
      for (const [name] of b.headers) {
        if (names.has(name.toLowerCase())) {
          conflicts.push(`${name} is set by both ${a.path} and ${b.path}, which overlap`);
        }
      }
    }
  }
  return conflicts;
}

export interface HtmlScan {
  /** Text of every inline script that executes (no src, not JSON-LD). */
  inlineScripts: string[];
  /** Inline event handler attributes, as `<tag on...=>`. */
  handlers: string[];
}

const ATTRIBUTES = /([^\s"'<>/=]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
const ATTR_BODY = `((?:[^>"']|"[^"]*"|'[^']*')*)`;
const TOKENS = new RegExp(
  [
    '<!--[\\s\\S]*?-->',
    `<script\\b${ATTR_BODY}>([\\s\\S]*?)</script\\s*>`,
    `<([A-Za-z][A-Za-z0-9-]*)${ATTR_BODY}>`,
  ].join('|'),
  'gi',
);

function attributes(source: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of source.matchAll(ATTRIBUTES)) {
    const raw = m[0];
    const eq = raw.indexOf('=');
    const value =
      eq < 0
        ? ''
        : raw
            .slice(eq + 1)
            .trim()
            .replace(/^["']|["']$/g, '');
    map.set(m[1]!.toLowerCase(), value);
  }
  return map;
}

/** Finds inline executable scripts and on*= attributes in one HTML document. */
export function scanHtml(html: string): HtmlScan {
  const scan: HtmlScan = { inlineScripts: [], handlers: [] };
  for (const m of html.matchAll(TOKENS)) {
    if (m[0].startsWith('<!--')) continue;
    const isScript = m[2] !== undefined;
    const tag = isScript ? 'script' : m[3]!.toLowerCase();
    const attrs = attributes((isScript ? m[1] : m[4]) ?? '');
    for (const name of attrs.keys()) {
      if (name.startsWith('on')) scan.handlers.push(`<${tag} ${name}=>`);
    }
    if (!isScript || attrs.has('src')) continue;
    if (attrs.get('type')?.trim().toLowerCase() === 'application/ld+json') continue;
    scan.inlineScripts.push(m[2]!);
  }
  return scan;
}

/** Base64 SHA-256 of the exact script text, the form CSP `'sha256-...'` sources use. */
export function scriptHash(script: string): string {
  return createHash('sha256').update(script, 'utf8').digest('base64');
}

export interface BootScript {
  /** null when no page has an inline script yet. */
  hash: string | null;
  pages: string[];
}

/**
 * Checks the inline-script rules over every page and returns the boot script's hash.
 * Throws one error listing every problem.
 */
export function bootScriptHash(pages: Array<{ file: string; html: string }>): BootScript {
  const problems: string[] = [];
  let boot: { text: string; file: string } | undefined;
  const withBoot: string[] = [];
  for (const { file, html } of pages) {
    const { inlineScripts, handlers } = scanHtml(html);
    for (const h of handlers) problems.push(`${file}: inline event handler ${h} is not allowed`);
    if (inlineScripts.length > 1) {
      problems.push(
        `${file}: ${inlineScripts.length} inline scripts; only the boot script may be inline`,
      );
    }
    for (const text of inlineScripts) {
      if (!boot) boot = { text, file };
      else if (text !== boot.text) {
        problems.push(`${file}: inline script differs from the boot script in ${boot.file}`);
      }
    }
    if (inlineScripts.length > 0) withBoot.push(file);
  }
  if (problems.length > 0) {
    throw new Error(`CSP inline script check failed:\n${problems.join('\n')}`);
  }
  return { hash: boot ? scriptHash(boot.text) : null, pages: withBoot };
}

async function htmlFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) out.push(path);
  }
  return out.sort();
}

/** Writes `<dist>/_headers` (ARCHITECTURE §12.1). Run after prerendering. */
export async function writeHeaders(distDir: string = DIST): Promise<string> {
  const dist = resolve(distDir);
  const files = await htmlFiles(dist);
  const pages = await Promise.all(
    files.map(async (path) => ({
      file: relative(dirname(dist), path),
      html: await readFile(path, 'utf8'),
    })),
  );
  const boot = bootScriptHash(pages);
  const rules = headerRules(boot.hash);
  const conflicts = findHeaderConflicts(rules);
  if (conflicts.length > 0) throw new Error(`_headers: ${conflicts.join('; ')}`);
  const out = join(dist, '_headers');
  await writeFile(out, serializeHeaders(rules));
  const csp =
    boot.hash === null
      ? "no inline script yet, script-src 'self'"
      : `boot script on ${boot.pages.length} of ${pages.length} pages, 'sha256-${boot.hash}'`;
  console.log(`_headers written (${relative(dirname(dist), out)}; ${csp})`);
  return out;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await writeHeaders();
}
