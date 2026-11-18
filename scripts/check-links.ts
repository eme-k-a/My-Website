// check-links (WP-36, ARCHITECTURE §14.4, R10): the external link check of the weekly scheduled
// workflow. `npx tsx scripts/check-links.ts --base "$SITE_URL"`.
//
// - Collects every `href` in the HTML files under dist/ (or --dist) and keeps the web links that
//   leave the site: http(s) URLs whose origin is not --base (default SITE_URL). Relative links,
//   the site's own absolute URLs (canonical, og:url) and mailto:, tel: or other schemes are skipped.
// - Requests each distinct URL once with GET, following redirects, with a timeout per attempt
//   (--timeout, default 10000 ms). A timeout, a network error, a 429 or a 5xx is retried once.
// - Verdicts: 2xx and 3xx pass; 999 is a warning (LinkedIn answers bots with it, so it says
//   nothing about the link); any other 4xx or 5xx, a timeout or a network error fails.
// Prints one line per URL with the pages that carry it, writes GitHub annotations and a job
// summary table inside Actions, and exits 1 on any failure.
import type { Dirent } from 'node:fs';
import { appendFile, readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SITE_URL } from '../src/content/site';

export const DEFAULT_TIMEOUT_MS = 10_000;
/** LinkedIn's status for requests it takes for bots. */
export const BOT_STATUS = 999;
const USER_AGENT = 'Mozilla/5.0 (compatible; site-link-check/1.0)';

export type Verdict = 'ok' | 'warn' | 'fail';

export interface LinkResult {
  url: string;
  /** The final HTTP status, or null when no response arrived (timeout or network error). */
  status: number | null;
  verdict: Verdict;
  detail: string;
  /** dist-relative paths of the pages that link to the URL, sorted. */
  pages: string[];
  attempts: number;
}

export interface CheckOptions {
  dist: string;
  base: string;
  timeoutMs?: number;
  /** Pause before the one retry (tests set 0). */
  retryDelayMs?: number;
  concurrency?: number;
  fetchImpl?: typeof fetch;
}

const ENTITIES: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code =
        e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Every href attribute value in an HTML document, entity-decoded, in document order. */
export function extractHrefs(html: string): string[] {
  const out: string[] = [];
  const re = /\shref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
  for (const m of html.matchAll(re)) {
    out.push(decodeEntities((m[1] ?? m[2] ?? m[3] ?? '').trim()));
  }
  return out;
}

/**
 * The URL to check for one href, or null when it stays on the site or is not a web link.
 * The fragment is dropped, since a server never sees it.
 */
export function externalUrl(href: string, base: string): string | null {
  if (href === '' || href.startsWith('#')) return null;
  let url: URL;
  try {
    url = new URL(href, base);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.origin === new URL(base).origin) return null;
  url.hash = '';
  return url.href;
}

async function htmlFiles(dir: string): Promise<string[]> {
  const entries: Dirent[] = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p)));
    else if (e.isFile() && e.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** External URL to the sorted dist-relative pages that link to it, in URL order. */
export async function collectLinks(dist: string, base: string): Promise<Map<string, string[]>> {
  const files = (await htmlFiles(dist)).sort();
  if (files.length === 0) throw new Error(`no HTML files under ${dist} (run npm run build first)`);
  const found = new Map<string, Set<string>>();
  for (const file of files) {
    const page = relative(dist, file).split('\\').join('/');
    for (const href of extractHrefs(await readFile(file, 'utf8'))) {
      const url = externalUrl(href, base);
      if (url === null) continue;
      const pages = found.get(url) ?? new Set<string>();
      pages.add(page);
      found.set(url, pages);
    }
  }
  return new Map(
    [...found.keys()].sort().map((url) => [url, [...(found.get(url) ?? [])].sort()] as const),
  );
}

interface Attempt {
  status: number | null;
  error?: string;
}

async function request(url: string, timeoutMs: number, fetchImpl: typeof fetch): Promise<Attempt> {
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*;q=0.8' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    // Only the status matters; do not download the page.
    await res.body?.cancel().catch(() => undefined);
    return { status: res.status };
  } catch (err) {
    const e = err as Error & { cause?: { code?: string; message?: string } };
    if (e.name === 'TimeoutError' || e.name === 'AbortError') {
      return { status: null, error: `no response within ${timeoutMs} ms` };
    }
    return { status: null, error: e.cause?.code ?? e.cause?.message ?? e.message };
  }
}

function retryable(a: Attempt): boolean {
  return a.status === null || a.status === 429 || a.status >= 500;
}

export function verdictFor(a: Attempt): { verdict: Verdict; detail: string } {
  if (a.status === null) return { verdict: 'fail', detail: a.error ?? 'no response' };
  if (a.status === BOT_STATUS) {
    return {
      verdict: 'warn',
      detail: `${a.status} (bot status, as LinkedIn sends; not a broken link)`,
    };
  }
  if (a.status >= 400) return { verdict: 'fail', detail: `HTTP ${a.status}` };
  return { verdict: 'ok', detail: `HTTP ${a.status}` };
}

export async function checkUrl(
  url: string,
  opts: Pick<CheckOptions, 'timeoutMs' | 'retryDelayMs' | 'fetchImpl'> = {},
): Promise<Omit<LinkResult, 'pages'>> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = opts.fetchImpl ?? fetch;
  let attempt = await request(url, timeoutMs, fetchImpl);
  let attempts = 1;
  if (retryable(attempt)) {
    await new Promise((r) => setTimeout(r, opts.retryDelayMs ?? 2000));
    attempt = await request(url, timeoutMs, fetchImpl);
    attempts = 2;
  }
  return { url, status: attempt.status, attempts, ...verdictFor(attempt) };
}

export async function checkLinks(opts: CheckOptions): Promise<LinkResult[]> {
  const links = await collectLinks(opts.dist, opts.base);
  const urls = [...links.keys()];
  const results: LinkResult[] = new Array<LinkResult>(urls.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < urls.length) {
      const i = next++;
      const url = urls[i] as string;
      results[i] = { ...(await checkUrl(url, opts)), pages: links.get(url) ?? [] };
    }
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 4, urls.length) }, worker));
  return results;
}

export function formatResult(r: LinkResult): string {
  const tag = { ok: 'ok  ', warn: 'WARN', fail: 'FAIL' }[r.verdict];
  const retried = r.attempts > 1 ? ', after a retry' : '';
  return `${tag} ${r.url}: ${r.detail}${retried} (linked from ${r.pages.join(', ')})`;
}

/** GitHub workflow command values must not carry raw newlines, % or the separators. */
function escapeData(s: string): string {
  return s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function readArg(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith('--')) throw new Error(`${name} needs a value`);
  return v;
}

export async function main(argv: string[]): Promise<number> {
  const base = readArg(argv, '--base') ?? SITE_URL;
  const dist = resolve(readArg(argv, '--dist') ?? 'dist');
  const timeoutArg = readArg(argv, '--timeout');
  const timeoutMs = timeoutArg === undefined ? DEFAULT_TIMEOUT_MS : Number(timeoutArg);
  if (!/^https?:\/\//.test(base)) throw new Error(`--base must be an http(s) URL, got ${base}`);
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('--timeout must be > 0 ms');

  const results = await checkLinks({ dist, base, timeoutMs });
  const inActions = process.env.GITHUB_ACTIONS === 'true';
  for (const r of results) {
    console.log(formatResult(r));
    if (inActions && r.verdict !== 'ok') {
      const level = r.verdict === 'fail' ? 'error' : 'warning';
      console.log(`::${level} title=External link ${r.verdict}::${escapeData(formatResult(r))}`);
    }
  }
  const count = (v: Verdict): number => results.filter((r) => r.verdict === v).length;
  const summary = `check-links: ${results.length} external URL(s) from ${dist}: ${count('ok')} ok, ${count('warn')} warning(s), ${count('fail')} failed`;
  console.log(summary);

  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (inActions && summaryFile) {
    const rows = results.map(
      (r) => `| ${r.verdict} | ${r.url} | ${r.detail.replace(/\|/g, '/')} | ${r.pages.length} |`,
    );
    await appendFile(
      summaryFile,
      [
        '### External links',
        '',
        '| Verdict | URL | Result | Pages |',
        '|---|---|---|---|',
        ...rows,
        '',
        '',
      ].join('\n'),
    );
  }
  return count('fail') > 0 ? 1 : 0;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (err) {
    console.error(`check-links: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}
