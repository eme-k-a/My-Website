// check-budgets on small fixture manifests built at runtime (ARCHITECTURE §9, §13.1).
import { execFile } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { gzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkBudgets,
  formatTable,
  measureBundles,
  readBundleBudgets,
  staticClosure,
  THREE_FINGERPRINTS,
  type BundleBudgets,
  type Manifest,
} from './check-budgets';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);

const BUDGETS: BundleBudgets = {
  entryJsGzipKB: 110,
  museumChunkGzipKB: 350,
  exhibitChunkGzipKB: 40,
};

/** Incompressible text of about `bytes` characters, so gzip sizes are predictable. */
const noise = (bytes: number) => randomBytes(Math.ceil((bytes * 3) / 4)).toString('base64');
const gz = (text: string) => gzipSync(Buffer.from(text), { level: 9 }).length;

let dist: string;
let files: Record<string, string>;

async function writeDist(manifest: Manifest, contents: Record<string, string>) {
  files = contents;
  await mkdir(join(dist, '.vite'), { recursive: true });
  await mkdir(join(dist, 'assets'), { recursive: true });
  await writeFile(join(dist, '.vite', 'manifest.json'), JSON.stringify(manifest));
  for (const [file, text] of Object.entries(contents)) await writeFile(join(dist, file), text);
}

const sum = (...names: string[]) => names.reduce((n, f) => n + gz(files[f]!), 0);
const kb = (bytes: number) => Math.round(bytes / 10) / 100;

beforeEach(async () => {
  dist = await mkdtemp(join(tmpdir(), 'check-budgets-'));
});
afterEach(async () => {
  await rm(dist, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const FULL: Manifest = {
  'index.html': {
    file: 'assets/main.js',
    src: 'index.html',
    isEntry: true,
    imports: ['_react.js'],
    dynamicImports: ['src/museum/MuseumCanvas.tsx'],
  },
  '_react.js': { file: 'assets/react.js', name: 'react', imports: ['_shared.js'] },
  '_shared.js': { file: 'assets/shared.js', name: 'shared' },
  'src/museum/MuseumCanvas.tsx': {
    file: 'assets/MuseumCanvas.js',
    src: 'src/museum/MuseumCanvas.tsx',
    isDynamicEntry: true,
    imports: ['_react.js', '_three.js'],
    dynamicImports: [
      'src/museum/exhibits/verafin/Verafin.tsx',
      'src/museum/exhibits/mysa/Mysa.tsx',
      'src/museum/debug/Debug.tsx',
    ],
  },
  '_three.js': { file: 'assets/three.js', name: 'three' },
  'src/museum/exhibits/verafin/Verafin.tsx': {
    file: 'assets/Verafin.js',
    src: 'src/museum/exhibits/verafin/Verafin.tsx',
    isDynamicEntry: true,
    imports: ['_three.js', '_verafin-helper.js', '_exhibit-shared.js'],
  },
  '_verafin-helper.js': { file: 'assets/verafin-helper.js', name: 'verafin-helper' },
  '_exhibit-shared.js': { file: 'assets/exhibit-shared.js', name: 'exhibit-shared' },
  'src/museum/exhibits/mysa/Mysa.tsx': {
    file: 'assets/Mysa.js',
    src: 'src/museum/exhibits/mysa/Mysa.tsx',
    isDynamicEntry: true,
    imports: ['_exhibit-shared.js'],
  },
  'src/museum/debug/Debug.tsx': {
    file: 'assets/Debug.js',
    src: 'src/museum/debug/Debug.tsx',
    isDynamicEntry: true,
    imports: ['_leva.js'],
  },
  '_leva.js': { file: 'assets/leva.js', name: 'leva' },
};

const fullContents = () => ({
  'assets/main.js': noise(3000),
  'assets/react.js': noise(5000),
  'assets/shared.js': noise(700),
  'assets/MuseumCanvas.js': noise(4000),
  'assets/three.js': noise(9000),
  'assets/Verafin.js': noise(2000),
  'assets/verafin-helper.js': noise(500),
  'assets/exhibit-shared.js': noise(800),
  'assets/Mysa.js': noise(1500),
  'assets/Debug.js': noise(600),
  'assets/leva.js': `var r=document.getElementById("leva__root");${noise(900)}`,
});

describe('staticClosure', () => {
  it('follows static imports recursively, not dynamic ones', () => {
    expect([...staticClosure(FULL, 'index.html')].sort()).toEqual([
      '_react.js',
      '_shared.js',
      'index.html',
    ]);
  });

  it('throws on an import without a record', () => {
    expect(() =>
      staticClosure({ 'index.html': { file: 'a.js', imports: ['_gone.js'] } }, 'index.html'),
    ).toThrow(/_gone\.js/);
  });
});

describe('measureBundles', () => {
  it('sums level-9 gzip sizes per budget row', async () => {
    await writeDist(FULL, fullContents());
    const report = await measureBundles(dist, FULL, BUDGETS);
    const byName = Object.fromEntries(report.rows.map((r) => [r.name, r]));

    expect(byName.entry?.kb).toBe(kb(sum('assets/main.js', 'assets/react.js', 'assets/shared.js')));
    // The museum chunk excludes what the entry already loads (react, shared).
    expect(byName.museum?.kb).toBe(kb(sum('assets/MuseumCanvas.js', 'assets/three.js')));
    // Exhibits count only their exclusive imports: three is in the museum set, and exhibit-shared
    // is used by two exhibits.
    expect(byName['exhibits/verafin']?.kb).toBe(
      kb(sum('assets/Verafin.js', 'assets/verafin-helper.js')),
    );
    expect(byName['exhibits/mysa']?.kb).toBe(kb(sum('assets/Mysa.js')));
    // The debug chunk is reported but never budgeted, and leva there is allowed.
    expect(byName.debug).toMatchObject({ limit: null, ok: true });
    expect(report.forbidden).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('skips the museum and exhibit rows with a note before those chunks exist', async () => {
    const manifest: Manifest = { 'index.html': { file: 'assets/main.js', isEntry: true } };
    await writeDist(manifest, { 'assets/main.js': noise(2000) });
    const report = await measureBundles(dist, manifest, BUDGETS);
    expect(report.ok).toBe(true);
    expect(report.rows.find((r) => r.name === 'museum')).toMatchObject({
      kb: null,
      ok: true,
      note: expect.stringMatching(/skipped/),
    });
    expect(report.rows.find((r) => r.name === 'exhibits/*')?.note).toMatch(/skipped/);
  });

  it('fails a row over its limit', async () => {
    await writeDist(FULL, fullContents());
    const tight = { ...BUDGETS, exhibitChunkGzipKB: 1 };
    const report = await measureBundles(dist, FULL, tight);
    expect(report.rows.find((r) => r.name === 'exhibits/verafin')?.ok).toBe(false);
    expect(report.rows.find((r) => r.name === 'exhibits/mysa')?.ok).toBe(false);
    expect(report.ok).toBe(false);
  });

  it('fails when leva, r3f-perf or a second zustand reaches the entry or museum chunk', async () => {
    const contents = fullContents();
    contents['assets/react.js'] += 'x.defines.muiPerf=1;';
    contents['assets/three.js'] += 'const s=/ServerSideRendering|^Deno\\//.test(ua);';
    await writeDist(FULL, contents);
    const report = await measureBundles(dist, FULL, BUDGETS);
    expect(report.ok).toBe(false);
    expect(report.forbidden).toEqual([
      expect.stringMatching(/^entry: assets\/react\.js contains r3f-perf code/),
      expect.stringMatching(/^museum: assets\/three\.js contains a second zustand copy/),
    ]);
  });

  it('fails when three.js, R3F or troika code reaches the entry chunk (R-M1-2)', async () => {
    const contents = fullContents();
    contents['assets/main.js'] += 'const r=new WebGLRenderer({antialias:!0});';
    contents['assets/shared.js'] += 'e.__r3f.root=n;var t="troika-text";';
    await writeDist(FULL, contents);
    const report = await measureBundles(dist, FULL, BUDGETS);
    expect(report.ok).toBe(false);
    expect(report.forbidden).toEqual([
      'entry: assets/main.js contains three.js code ("WebGLRenderer")',
      'entry: assets/shared.js contains React Three Fiber code ("__r3f")',
      'entry: assets/shared.js contains troika code ("troika")',
    ]);
  });

  it('allows three.js, R3F and troika code in the museum chunk', async () => {
    const contents = fullContents();
    contents['assets/three.js'] += THREE_FINGERPRINTS.map(({ needle }) => needle).join(';');
    contents['assets/MuseumCanvas.js'] += 'e.__r3f.root=n;';
    await writeDist(FULL, contents);
    const report = await measureBundles(dist, FULL, BUDGETS);
    expect(report.forbidden).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('flags every three.js fingerprint on its own', async () => {
    for (const { what, needle } of THREE_FINGERPRINTS) {
      const contents = fullContents();
      contents['assets/react.js'] += needle;
      await writeDist(FULL, contents);
      const { forbidden } = await measureBundles(dist, FULL, BUDGETS);
      expect(forbidden).toEqual([`entry: assets/react.js contains ${what} code ("${needle}")`]);
    }
  });

  it('fails when a debug-only package chunk is statically imported by the entry', async () => {
    const manifest: Manifest = {
      'index.html': { file: 'assets/main.js', isEntry: true, imports: ['_leva.esm-abc.js'] },
      '_leva.esm-abc.js': { file: 'assets/leva.esm-abc.js', name: 'leva.esm' },
    };
    await writeDist(manifest, { 'assets/main.js': 'a', 'assets/leva.esm-abc.js': 'b' });
    const report = await measureBundles(dist, manifest, BUDGETS);
    expect(report.forbidden).toEqual([expect.stringMatching(/debug-only package/)]);
  });
});

describe('readBundleBudgets', () => {
  it('reads perf/budgets.json and rejects a missing limit', () => {
    expect(readBundleBudgets({ bundles: BUDGETS })).toEqual(BUDGETS);
    expect(() => readBundleBudgets({ bundles: { entryJsGzipKB: 110 } })).toThrow(
      /museumChunkGzipKB/,
    );
  });
});

describe('formatTable', () => {
  it('prints name, KB gzip, limit and ok columns', () => {
    const table = formatTable([
      { name: 'entry', kb: 68.8, limit: 110, ok: true },
      { name: 'museum', kb: null, limit: 350, ok: true, note: 'skipped' },
    ]);
    expect(table.split('\n')[0]).toMatch(/^name\s+KB gzip\s+limit\s+ok$/);
    expect(table).toMatch(/entry\s+68\.80\s+110\s+yes/);
    expect(table).toMatch(/museum\s+-\s+350\s+yes \(skipped\)/);
  });
});

describe('checkBudgets', () => {
  it('returns 0 within budget and 1 on a breach', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await writeDist(FULL, fullContents());
    const budgets = join(dist, 'budgets.json');
    await writeFile(budgets, JSON.stringify({ bundles: BUDGETS }));
    expect(await checkBudgets({ dist, budgets })).toBe(0);
    await writeFile(budgets, JSON.stringify({ bundles: { ...BUDGETS, entryJsGzipKB: 1 } }));
    expect(await checkBudgets({ dist, budgets })).toBe(1);
  });

  it('returns 1 when the entry chunk holds three.js code', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const contents = fullContents();
    contents['assets/main.js'] += '"#include <common>"';
    await writeDist(FULL, contents);
    const budgets = join(dist, 'budgets.json');
    await writeFile(budgets, JSON.stringify({ bundles: BUDGETS }));
    expect(await checkBudgets({ dist, budgets })).toBe(1);
    expect(error).toHaveBeenCalledWith(
      'check-budgets: entry: assets/main.js contains three.js shader code ("#include <common>")',
    );
  });

  it('returns 1 when dist/ has no manifest', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await checkBudgets({ dist })).toBe(1);
    expect(error).toHaveBeenCalledWith(expect.stringMatching(/run npm run build first/));
  });

  it('exits the process with code 1 on a breach', async () => {
    await writeDist(FULL, fullContents());
    const budgets = join(dist, 'budgets.json');
    await writeFile(budgets, JSON.stringify({ bundles: { ...BUDGETS, entryJsGzipKB: 1 } }));
    const script = join(ROOT, 'scripts', 'check-budgets.ts');
    const args = ['--import', 'tsx', script, '--dist', dist, '--budgets', budgets];
    const result = await run(process.execPath, args, { cwd: ROOT }).then(
      () => ({ code: 0, stdout: '' }),
      (error: { code: number; stdout: string }) => error,
    );
    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/entry\s+\d+\.\d+\s+1\s+NO/);
  });
});
