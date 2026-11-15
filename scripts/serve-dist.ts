// serve-dist (ARCHITECTURE §12.2, R10): a dependency-free node:http server for dist/, used by
// `npm run preview`, Playwright and Lighthouse CI, so every test sees the production headers
// (never `vite preview`, which ignores _headers).
//
// - Applies every dist/_headers rule whose path matches (Netlify `*` splat and `:name` rules;
//   re-read on each request, so a rebuild needs no restart).
// - Gzips text responses when Accept-Encoding allows it.
// - `/x/` and `/x` serve `x/index.html`; unknown paths get 404.html with status 404.
// - Port from `--port` or PORT (default 4173); `--dir` serves another folder (tests).
// - Prints `serve-dist listening on http://localhost:<port>` once listening.
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { parseHeaders, patternToRegExp, type Header, type HeaderRule } from './headers';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_DIR = join(ROOT, 'dist');
export const DEFAULT_PORT = 4173;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.wasm': 'application/wasm',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};
const COMPRESSIBLE = /^(text\/|application\/(json|xml|manifest\+json)|image\/svg\+xml)/;
/** Netlify never serves its own config files. */
const HIDDEN = new Set(['/_headers', '/_redirects']);

export function contentType(file: string): string {
  return TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

/** Whether an Accept-Encoding value allows gzip (q=0 refuses it, `*` allows it). */
export function acceptsGzip(header: string | undefined): boolean {
  let star = false;
  for (const part of (header ?? '').split(',')) {
    const [coding = '', ...params] = part.trim().toLowerCase().split(';');
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const allowed = q === undefined || Number(q.slice(2)) > 0;
    if (coding.trim() === 'gzip') return allowed;
    if (coding.trim() === '*') star = allowed;
  }
  return star;
}

/**
 * The headers for one request path: every matching rule applies, in file order. A name set by
 * two matching rules is joined with ", " as Netlify merges it (headers.test.ts forbids that).
 */
export function headersFor(rules: HeaderRule[], pathname: string): Header[] {
  const merged = new Map<string, Header>();
  for (const rule of rules) {
    if (!patternToRegExp(rule.path).test(pathname)) continue;
    for (const [name, value] of rule.headers) {
      const key = name.toLowerCase();
      const prev = merged.get(key);
      merged.set(key, prev ? [prev[0], `${prev[1]}, ${value}`] : [name, value]);
    }
  }
  return [...merged.values()];
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

/** Maps a URL path to a file inside `dir`, or null (unknown, hidden or outside `dir`). */
export async function resolvePath(dir: string, pathname: string): Promise<string | null> {
  let path: string;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  if (!path.startsWith('/') || path.includes('\0') || HIDDEN.has(path)) return null;
  const root = resolve(dir);
  const target = resolve(root, `.${path}`);
  if (target !== root && !target.startsWith(root + sep)) return null;
  const index = join(target, 'index.html');
  if (path.endsWith('/')) return (await isFile(index)) ? index : null;
  if (await isFile(target)) return target;
  return (await isFile(index)) ? index : null;
}

async function loadRules(dir: string): Promise<HeaderRule[]> {
  let text: string;
  try {
    text = await readFile(join(dir, '_headers'), 'utf8');
  } catch {
    return [];
  }
  return parseHeaders(text);
}

async function respond(dir: string, req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method not allowed\n');
    return;
  }
  const { pathname } = new URL(req.url ?? '/', 'http://localhost');
  let status = 200;
  let file = await resolvePath(dir, pathname);
  if (file === null) {
    status = 404;
    const notFound = join(resolve(dir), '404.html');
    file = (await isFile(notFound)) ? notFound : null;
  }
  let body: Buffer = file ? await readFile(file) : Buffer.from('Not found\n');
  const type = file ? contentType(file) : 'text/plain; charset=utf-8';

  for (const [name, value] of headersFor(await loadRules(dir), pathname)) {
    res.setHeader(name, value);
  }
  res.setHeader('Content-Type', type);
  if (COMPRESSIBLE.test(type)) {
    res.setHeader('Vary', 'Accept-Encoding');
    if (acceptsGzip(req.headers['accept-encoding'])) {
      body = gzipSync(body);
      res.setHeader('Content-Encoding', 'gzip');
    }
  }
  res.setHeader('Content-Length', body.length);
  res.writeHead(status);
  res.end(method === 'HEAD' ? undefined : body);
}

/** An http.Server for `dir` (not listening yet). */
export function createDistServer(dir: string = DEFAULT_DIR): Server {
  return createServer((req, res) => {
    respond(dir, req, res).catch((error: unknown) => {
      console.error(`serve-dist: ${req.url}: ${error instanceof Error ? error.message : error}`);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Internal error\n');
    });
  });
}

/** Starts the server and prints the ready line Playwright and lhci wait for. */
export async function serveDist(
  options: { dir?: string; port?: number; quiet?: boolean } = {},
): Promise<Server> {
  const server = createDistServer(options.dir ?? DEFAULT_DIR);
  await new Promise<void>((done, fail) => {
    server.once('error', fail);
    server.listen(options.port ?? DEFAULT_PORT, () => done());
  });
  const { port } = server.address() as AddressInfo;
  if (!options.quiet) console.log(`serve-dist listening on http://localhost:${port}`);
  return server;
}

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  if (i >= 0) return argv[i + 1];
  return argv.find((a) => a.startsWith(`${flag}=`))?.slice(flag.length + 1);
}

/** `--port`, else PORT, else 4173. */
export function parsePort(argv: string[], env: NodeJS.ProcessEnv = process.env): number {
  const raw = argValue(argv, '--port') ?? env.PORT;
  if (raw === undefined || raw === '') return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`serve-dist: invalid port "${raw}"`);
  }
  return port;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const argv = process.argv.slice(2);
  const dir = resolve(argValue(argv, '--dir') ?? DEFAULT_DIR);
  if (!existsSync(join(dir, 'index.html'))) {
    console.warn(`serve-dist: ${dir} has no index.html yet (run npm run build first)`);
  }
  const server = await serveDist({ dir, port: parsePort(argv) });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      server.close(() => process.exit(0));
      server.closeAllConnections();
    });
  }
}
