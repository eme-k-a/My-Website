// serve-dist against a temp dist/ on a random port (ARCHITECTURE §12.2): _headers applied with
// Netlify path rules, gzip, the index mapping and the 404 page.
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { headerRules, IMMUTABLE, PDF_DISPOSITION, REVALIDATE, serializeHeaders } from './headers';
import { acceptsGzip, headersFor, parsePort, resolvePath, serveDist } from './serve-dist';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HASH = '47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=';
const SCRIPT = `console.log(${JSON.stringify('x'.repeat(4000))});\n`;

let tmp: string;
let dist: string;
let server: Server;
let port: number;

interface Reply {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

function get(path: string, init: { method?: string; gzip?: boolean } = {}): Promise<Reply> {
  return new Promise((done, fail) => {
    // Options instead of a URL string, so the path reaches the server unnormalized.
    const req = request(
      {
        hostname: 'localhost',
        port,
        path,
        method: init.method ?? 'GET',
        headers: init.gzip === false ? {} : { 'Accept-Encoding': 'gzip, deflate, br' },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          const body = res.headers['content-encoding'] === 'gzip' ? gunzipSync(raw) : raw;
          done({ status: res.statusCode ?? 0, headers: res.headers, body });
        });
      },
    );
    req.on('error', fail);
    req.end();
  });
}

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'serve-dist-'));
  dist = join(tmp, 'dist');
  for (const d of ['assets', 'resume', 'exhibit/verafin']) {
    await mkdir(join(dist, d), { recursive: true });
  }
  await writeFile(join(dist, 'index.html'), '<!doctype html><title>home</title>');
  await writeFile(join(dist, 'resume', 'index.html'), '<!doctype html><title>classic</title>');
  await writeFile(
    join(dist, 'exhibit/verafin/index.html'),
    '<!doctype html><title>verafin</title>',
  );
  await writeFile(join(dist, '404.html'), '<!doctype html><title>not found</title>');
  await writeFile(join(dist, 'assets', 'main-abc.js'), SCRIPT);
  await writeFile(join(dist, 'resume.pdf'), Buffer.from('%PDF-1.7\n'));
  await writeFile(join(dist, '_headers'), serializeHeaders(headerRules(HASH)));
  await writeFile(join(tmp, 'secret.txt'), 'outside dist');
  server = await serveDist({ dir: dist, port: 0, quiet: true });
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise((done) => server.close(done));
  await rm(tmp, { recursive: true, force: true });
});

describe('serve-dist', () => {
  it('applies the /* security headers and the cache rule of /', async () => {
    const res = await get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('text/html; charset=utf-8');
    expect(res.headers['content-security-policy']).toContain(`'sha256-${HASH}'`);
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['cache-control']).toBe(REVALIDATE);
    expect(res.body.toString()).toContain('<title>home</title>');
  });

  it('makes hashed assets immutable and gzips text when allowed', async () => {
    const res = await get('/assets/main-abc.js');
    expect(res.headers['cache-control']).toBe(IMMUTABLE);
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['content-encoding']).toBe('gzip');
    expect(res.headers.vary).toBe('Accept-Encoding');
    expect(Number(res.headers['content-length'])).toBeLessThan(SCRIPT.length / 10);
    expect(res.body.toString()).toBe(SCRIPT);
  });

  it('sends identity bodies when gzip is not accepted', async () => {
    const res = await get('/assets/main-abc.js', { gzip: false });
    expect(res.headers['content-encoding']).toBeUndefined();
    expect(Number(res.headers['content-length'])).toBe(SCRIPT.length);
  });

  it('serves the PDF uncompressed with revalidation and its Content-Disposition', async () => {
    const res = await get('/resume.pdf', { method: 'HEAD' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['cache-control']).toBe(REVALIDATE);
    expect(res.headers['content-disposition']).toBe(PDF_DISPOSITION);
    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.body.length).toBe(0);
  });

  it('maps /x/ and /x to x/index.html', async () => {
    for (const path of ['/resume/', '/resume', '/exhibit/verafin/', '/exhibit/verafin']) {
      const res = await get(path);
      expect(res.status, path).toBe(200);
      expect(res.body.toString(), path).toMatch(/<title>(classic|verafin)<\/title>/);
    }
    expect((await get('/resume/')).headers['cache-control']).toBe(REVALIDATE);
    expect((await get('/exhibit/verafin/')).headers['cache-control']).toBe(REVALIDATE);
  });

  it('answers unknown paths with 404.html and status 404, still with the CSP', async () => {
    const res = await get('/nope');
    expect(res.status).toBe(404);
    expect(res.body.toString()).toContain('<title>not found</title>');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('never serves _headers or files outside dist/', async () => {
    expect((await get('/_headers')).status).toBe(404);
    expect((await get('/../secret.txt')).status).toBe(404);
    expect((await get('/%2e%2e/secret.txt')).status).toBe(404);
    expect((await get('/..%2fsecret.txt')).status).toBe(404);
  });

  it('refuses methods other than GET and HEAD', async () => {
    const res = await get('/', { method: 'POST' });
    expect(res.status).toBe(405);
    expect(res.headers.allow).toBe('GET, HEAD');
  });
});

describe('helpers', () => {
  it('acceptsGzip reads q-values and *', () => {
    expect(acceptsGzip('gzip, deflate, br')).toBe(true);
    expect(acceptsGzip('br;q=1.0, gzip;q=0.5')).toBe(true);
    expect(acceptsGzip('gzip;q=0')).toBe(false);
    expect(acceptsGzip('*')).toBe(true);
    expect(acceptsGzip('identity')).toBe(false);
    expect(acceptsGzip(undefined)).toBe(false);
  });

  it('headersFor applies every matching rule and merges a repeated name like Netlify', () => {
    const rules = [
      { path: '/*', headers: [['X-A', '1']] as [string, string][] },
      {
        path: '/assets/*',
        headers: [
          ['x-a', '2'],
          ['X-B', '3'],
        ] as [string, string][],
      },
    ];
    expect(headersFor(rules, '/assets/a.js')).toEqual([
      ['X-A', '1, 2'],
      ['X-B', '3'],
    ]);
    expect(headersFor(rules, '/')).toEqual([['X-A', '1']]);
  });

  it('resolvePath stays inside dist', async () => {
    expect(await resolvePath(dist, '/')).toBe(join(dist, 'index.html'));
    expect(await resolvePath(dist, '/../secret.txt')).toBeNull();
    expect(await resolvePath(dist, '/%E0%A4%A')).toBeNull();
  });

  it('parsePort reads --port, then PORT, then 4173', () => {
    expect(parsePort(['--port', '4180'], {})).toBe(4180);
    expect(parsePort(['--port=4181'], { PORT: '1' })).toBe(4181);
    expect(parsePort([], { PORT: '4174' })).toBe(4174);
    expect(parsePort([], {})).toBe(4173);
    expect(() => parsePort(['--port', 'x'], {})).toThrow(/invalid port/);
  });
});

describe('command line', () => {
  it('prints the ready line with the port it listens on', async () => {
    const child = spawn(
      process.execPath,
      ['--import', 'tsx', join(ROOT, 'scripts', 'serve-dist.ts'), '--dir', dist],
      { cwd: ROOT, env: { ...process.env, PORT: '0' } },
    );
    try {
      const line = await new Promise<string>((done, fail) => {
        let out = '';
        child.stdout.on('data', (c: Buffer) => {
          out += c.toString();
          if (out.includes('\n')) done(out.trim());
        });
        child.on('exit', (code) => fail(new Error(`exited with ${code}`)));
      });
      expect(line).toMatch(/^serve-dist listening on http:\/\/localhost:\d+$/);
      const port = line.split(':').at(-1);
      const res = await new Promise<number>((done, fail) =>
        request(`http://localhost:${port}/nope`, (r) => {
          r.resume();
          done(r.statusCode ?? 0);
        })
          .on('error', fail)
          .end(),
      );
      expect(res).toBe(404);
    } finally {
      child.kill('SIGTERM');
    }
  });
});
