// check-links against a local fixture server and a fixture dist/ built at runtime (WP-36 A2): a 404
// fails, LinkedIn's bot status 999 warns, a 503 is retried once, a hang times out, and redirects,
// relative links, the site's own URLs and mailto: links are handled.
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  checkLinks,
  checkUrl,
  collectLinks,
  externalUrl,
  extractHrefs,
  formatResult,
  verdictFor,
} from './check-links';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);
const BASE = 'https://site.example';

let server: Server;
let origin: string;
let tmp: string;
const hits = new Map<string, number>();

function page(links: string[]): string {
  return `<!doctype html><html><head><link rel="canonical" href="${BASE}/"></head><body>${links
    .map((l) => `<a href="${l}">x</a>`)
    .join('')}</body></html>`;
}

async function fixtureDist(name: string, pages: Record<string, string[]>): Promise<string> {
  const dist = join(tmp, name);
  for (const [path, links] of Object.entries(pages)) {
    await mkdir(dirname(join(dist, path)), { recursive: true });
    await writeFile(join(dist, path), page(links));
  }
  return dist;
}

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'check-links-'));
  server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    hits.set(path, (hits.get(path) ?? 0) + 1);
    if (path === '/ok') return res.writeHead(200, { 'Content-Type': 'text/html' }).end('ok');
    if (path === '/bot') return res.writeHead(999).end();
    if (path === '/redirect') return res.writeHead(301, { Location: '/ok' }).end();
    if (path === '/flaky') return res.writeHead(hits.get(path) === 1 ? 503 : 200).end();
    if (path === '/down') return res.writeHead(503).end();
    if (path === '/hang') return; // never answers
    res.writeHead(404).end('not found');
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((done) => server.close(() => done()));
  await rm(tmp, { recursive: true, force: true });
});

beforeEach(() => hits.clear());

describe('extractHrefs and externalUrl', () => {
  it('reads double, single and unquoted hrefs and decodes entities', () => {
    const html = `<a href="https://a.example/x?p=1&amp;q=2">a</a><link href='https://b.example/'>
      <a class=x href=https://c.example/y>c</a><a data-href="https://not.example/">n</a>`;
    expect(extractHrefs(html)).toEqual([
      'https://a.example/x?p=1&q=2',
      'https://b.example/',
      'https://c.example/y',
    ]);
  });

  it('keeps only web links that leave the site, without the fragment', () => {
    expect(externalUrl('https://github.com/eme-k-a', BASE)).toBe('https://github.com/eme-k-a');
    expect(externalUrl('https://linkedin.com/in/x#top', BASE)).toBe('https://linkedin.com/in/x');
    expect(externalUrl('//cdn.example/a', BASE)).toBe('https://cdn.example/a');
    for (const href of [
      'mailto:someone@example.com',
      'tel:+10000000000',
      'javascript:void(0)',
      '/resume/',
      'exhibit/mysa/',
      '#main',
      '',
      `${BASE}/resume.pdf`,
    ]) {
      expect(externalUrl(href, BASE), href).toBeNull();
    }
  });
});

describe('collectLinks', () => {
  it('dedupes URLs across pages and records where each is linked', async () => {
    const dist = await fixtureDist('collect', {
      'index.html': [`${origin}/ok`, 'mailto:x@example.com', '/resume/', `${BASE}/exhibit/a/`],
      'resume/index.html': [`${origin}/ok`, `${origin}/bot#frag`],
      'notes.txt': [`${origin}/ignored`],
    });
    const links = await collectLinks(dist, BASE);
    expect([...links.entries()]).toEqual([
      [`${origin}/bot`, ['resume/index.html']],
      [`${origin}/ok`, ['index.html', 'resume/index.html']],
    ]);
  });

  it('fails when dist/ has no HTML', async () => {
    const empty = join(tmp, 'empty');
    await mkdir(empty, { recursive: true });
    await expect(collectLinks(empty, BASE)).rejects.toThrow(/no HTML files/);
  });
});

describe('checkUrl', () => {
  const opts = { timeoutMs: 2000, retryDelayMs: 0 };

  it('passes a 200 and a followed redirect', async () => {
    expect(await checkUrl(`${origin}/ok`, opts)).toMatchObject({ verdict: 'ok', status: 200 });
    expect(await checkUrl(`${origin}/redirect`, opts)).toMatchObject({
      verdict: 'ok',
      status: 200,
    });
  });

  it('fails a 404 without retrying it', async () => {
    const r = await checkUrl(`${origin}/missing`, opts);
    expect(r).toMatchObject({ verdict: 'fail', status: 404, attempts: 1, detail: 'HTTP 404' });
  });

  it('warns on the 999 bot status', async () => {
    const r = await checkUrl(`${origin}/bot`, opts);
    expect(r).toMatchObject({ verdict: 'warn', status: 999 });
    expect(r.detail).toMatch(/LinkedIn/);
  });

  it('retries a 5xx once: a recovered link passes, a dead one fails', async () => {
    expect(await checkUrl(`${origin}/flaky`, opts)).toMatchObject({ verdict: 'ok', attempts: 2 });
    expect(hits.get('/flaky')).toBe(2);
    expect(await checkUrl(`${origin}/down`, opts)).toMatchObject({ verdict: 'fail', status: 503 });
    expect(hits.get('/down')).toBe(2);
  });

  it('fails a server that never answers within the timeout', async () => {
    const r = await checkUrl(`${origin}/hang`, { timeoutMs: 200, retryDelayMs: 0 });
    expect(r).toMatchObject({ verdict: 'fail', status: null, attempts: 2 });
    expect(r.detail).toBe('no response within 200 ms');
  });

  it('fails a refused connection', async () => {
    const closed = createServer();
    await new Promise<void>((done) => closed.listen(0, '127.0.0.1', done));
    const port = (closed.address() as AddressInfo).port;
    await new Promise<void>((done) => closed.close(() => done()));
    const r = await checkUrl(`http://127.0.0.1:${port}/`, opts);
    expect(r).toMatchObject({ verdict: 'fail', status: null });
    expect(r.detail).toBe('ECONNREFUSED');
  });

  it('maps statuses to verdicts', () => {
    expect(verdictFor({ status: 204 }).verdict).toBe('ok');
    expect(verdictFor({ status: 410 }).verdict).toBe('fail');
    expect(verdictFor({ status: 500 }).verdict).toBe('fail');
    expect(verdictFor({ status: 999 }).verdict).toBe('warn');
    expect(verdictFor({ status: null, error: 'ENOTFOUND' })).toEqual({
      verdict: 'fail',
      detail: 'ENOTFOUND',
    });
  });
});

describe('checkLinks', () => {
  it('reports every URL with its pages', async () => {
    const dist = await fixtureDist('mixed', {
      'index.html': [`${origin}/ok`, `${origin}/missing`],
      'exhibit/a/index.html': [`${origin}/bot`, `${origin}/missing`],
    });
    const results = await checkLinks({ dist, base: BASE, timeoutMs: 2000, retryDelayMs: 0 });
    expect(results.map((r) => [r.url, r.verdict])).toEqual([
      [`${origin}/bot`, 'warn'],
      [`${origin}/missing`, 'fail'],
      [`${origin}/ok`, 'ok'],
    ]);
    const missing = results.find((r) => r.verdict === 'fail');
    expect(missing && formatResult(missing)).toBe(
      `FAIL ${origin}/missing: HTTP 404 (linked from exhibit/a/index.html, index.html)`,
    );
  });
});

describe('the CLI', () => {
  const cli = async (dist: string): Promise<{ code: number; out: string }> => {
    const env = { ...process.env, GITHUB_ACTIONS: '' };
    try {
      const { stdout } = await run(
        'npx',
        ['tsx', 'scripts/check-links.ts', '--base', BASE, '--dist', dist, '--timeout', '2000'],
        { cwd: ROOT, env },
      );
      return { code: 0, out: stdout };
    } catch (err) {
      const e = err as { code: number; stdout: string; stderr: string };
      return { code: e.code, out: e.stdout + e.stderr };
    }
  };

  it('exits 0 when every link passes or only warns', async () => {
    const dist = await fixtureDist('cli-pass', {
      'index.html': [`${origin}/ok`, `${origin}/bot`, 'mailto:x@example.com', `${BASE}/`],
    });
    const { code, out } = await cli(dist);
    expect(code).toBe(0);
    expect(out).toContain(`WARN ${origin}/bot`);
    expect(out).toContain('2 external URL(s)');
    expect(out).toContain('1 ok, 1 warning(s), 0 failed');
  }, 30_000);

  it('exits 1 on a 404 and names the URL and page', async () => {
    const dist = await fixtureDist('cli-fail', {
      'index.html': [`${origin}/ok`, `${origin}/gone`],
    });
    const { code, out } = await cli(dist);
    expect(code).toBe(1);
    expect(out).toContain(`FAIL ${origin}/gone: HTTP 404 (linked from index.html)`);
    expect(out).toContain('1 failed');
  }, 30_000);
});
