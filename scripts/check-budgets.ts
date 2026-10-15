// Bundle budgets (ARCHITECTURE §9; written by WP-06, owned by R7). Runs at the end of
// `npm run build` and as `npm run check:budgets` on an existing dist/.
//
// Reads dist/.vite/manifest.json and perf/budgets.json, gzips every counted chunk at level 9 and
// sums the bytes per budget row (1 KB = 1000 bytes, the unit Vite prints):
// - entry: the index.html chunk plus its recursive static imports;
// - museum: the src/museum/MuseumCanvas.tsx dynamic entry plus static imports not in the entry
//   set (skipped with a note until the museum chunk exists);
// - exhibits/<id>: each src/museum/exhibits/<id>/ dynamic entry plus the static imports only it
//   uses;
// - debug: the ?debug chunk is reported, never budgeted.
// It also fails when leva, r3f-perf or leva's private zustand 3 copy reaches the entry or museum
// chunk (PLAN Addendum, R0 rulings after WP-01). Prints a table and exits 1 on any breach.
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const DEFAULT_DIST = join(ROOT, 'dist');
export const DEFAULT_BUDGETS = join(ROOT, 'perf', 'budgets.json');

export const ENTRY_KEY = 'index.html';
export const MUSEUM_KEY = 'src/museum/MuseumCanvas.tsx';
export const DEBUG_PREFIX = 'src/museum/debug/';
const EXHIBIT_SRC = /^src\/museum\/exhibits\/([^/]+)\//;

/** One manifest record (the fields Vite writes that this check reads). */
export interface ManifestChunk {
  file: string;
  name?: string;
  src?: string;
  isEntry?: boolean;
  isDynamicEntry?: boolean;
  imports?: string[];
  dynamicImports?: string[];
}
export type Manifest = Record<string, ManifestChunk>;

export interface BundleBudgets {
  entryJsGzipKB: number;
  museumChunkGzipKB: number;
  exhibitChunkGzipKB: number;
}

export interface BudgetRow {
  name: string;
  /** Gzip size in KB (1000 bytes); null when the chunk does not exist yet. */
  kb: number | null;
  /** Limit in KB; null for reported-only rows. */
  limit: number | null;
  ok: boolean;
  note?: string;
}

export interface BudgetReport {
  rows: BudgetRow[];
  /** Debug-only code found in the entry or museum chunk. */
  forbidden: string[];
  ok: boolean;
}

/**
 * Strings that survive minification and exist only in the debug-only packages (checked against
 * every other package in node_modules and against a minified bundle that imports both).
 */
export const DEBUG_FINGERPRINTS: ReadonlyArray<{ what: string; needle: string }> = [
  { what: 'leva', needle: 'leva__root' },
  { what: 'leva', needle: '__levaInput' },
  { what: 'r3f-perf', needle: 'muiPerf' },
  { what: 'r3f-perf', needle: '__perf_toggle' },
  { what: 'a second zustand copy (zustand 3 from leva)', needle: 'ServerSideRendering|^Deno' },
  {
    what: 'a second zustand copy (zustand 3 from leva)',
    needle: 'Please use `subscribeWithSelector` middleware',
  },
];
const DEBUG_PACKAGE = /(^|[/_])(leva|r3f-perf)([/._-]|$)/;

/** The chunk keys reachable from `start` through static imports, `start` included. */
export function staticClosure(manifest: Manifest, start: string): Set<string> {
  const seen = new Set<string>();
  const stack = [start];
  while (stack.length > 0) {
    const key = stack.pop()!;
    if (seen.has(key)) continue;
    const chunk = manifest[key];
    if (!chunk) throw new Error(`manifest: "${key}" is imported but has no record`);
    seen.add(key);
    stack.push(...(chunk.imports ?? []));
  }
  return seen;
}

const kb = (bytes: number) => Math.round(bytes / 10) / 100;

async function gzipBytes(dist: string, manifest: Manifest, keys: Iterable<string>) {
  let total = 0;
  for (const key of keys) {
    const buffer = await readFile(join(dist, manifest[key]!.file));
    total += gzipSync(buffer, { level: 9 }).length;
  }
  return total;
}

async function forbiddenCode(
  dist: string,
  manifest: Manifest,
  keys: Iterable<string>,
  label: string,
): Promise<string[]> {
  const found: string[] = [];
  for (const key of keys) {
    const chunk = manifest[key]!;
    for (const field of [key, chunk.name ?? '', chunk.src ?? '', chunk.file]) {
      if (DEBUG_PACKAGE.test(field)) {
        found.push(`${label}: chunk ${chunk.file} comes from a debug-only package (${field})`);
        break;
      }
    }
    const code = await readFile(join(dist, chunk.file), 'utf8');
    for (const { what, needle } of DEBUG_FINGERPRINTS) {
      if (code.includes(needle)) {
        found.push(`${label}: ${chunk.file} contains ${what} code ("${needle}")`);
      }
    }
  }
  return found;
}

export function readBundleBudgets(json: unknown): BundleBudgets {
  const bundles = (json as { bundles?: Record<string, unknown> } | null)?.bundles;
  const value = (name: keyof BundleBudgets) => {
    const v = bundles?.[name];
    if (typeof v !== 'number' || !(v > 0)) {
      throw new Error(`perf/budgets.json: bundles.${name} must be a positive number`);
    }
    return v;
  };
  return {
    entryJsGzipKB: value('entryJsGzipKB'),
    museumChunkGzipKB: value('museumChunkGzipKB'),
    exhibitChunkGzipKB: value('exhibitChunkGzipKB'),
  };
}

const row = (name: string, bytes: number, limit: number): BudgetRow => ({
  name,
  kb: kb(bytes),
  limit,
  ok: bytes <= limit * 1000,
});

/** Measures every bundle budget of an existing dist/ against `budgets`. */
export async function measureBundles(
  dist: string,
  manifest: Manifest,
  budgets: BundleBudgets,
): Promise<BudgetReport> {
  const rows: BudgetRow[] = [];
  const forbidden: string[] = [];

  if (!manifest[ENTRY_KEY]) throw new Error(`manifest: no "${ENTRY_KEY}" entry chunk`);
  const entry = staticClosure(manifest, ENTRY_KEY);
  rows.push(row('entry', await gzipBytes(dist, manifest, entry), budgets.entryJsGzipKB));
  forbidden.push(...(await forbiddenCode(dist, manifest, entry, 'entry')));

  const museum = new Set<string>();
  if (manifest[MUSEUM_KEY]) {
    for (const key of staticClosure(manifest, MUSEUM_KEY)) if (!entry.has(key)) museum.add(key);
    rows.push(row('museum', await gzipBytes(dist, manifest, museum), budgets.museumChunkGzipKB));
    forbidden.push(...(await forbiddenCode(dist, manifest, museum, 'museum')));
  } else {
    rows.push({
      name: 'museum',
      kb: null,
      limit: budgets.museumChunkGzipKB,
      ok: true,
      note: `skipped: ${MUSEUM_KEY} is not in the manifest yet`,
    });
  }

  // Exhibit dynamic entries, grouped by folder id; each counts the static imports no other
  // exhibit, the entry or the museum chunk also loads.
  const exhibitRoots = new Map<string, string[]>();
  for (const [key, chunk] of Object.entries(manifest)) {
    const id = EXHIBIT_SRC.exec(chunk.src ?? key)?.[1];
    if (!id || id === '_kit' || !chunk.isDynamicEntry) continue;
    exhibitRoots.set(id, [...(exhibitRoots.get(id) ?? []), key]);
  }
  const closures = new Map<string, Set<string>>();
  for (const [id, roots] of exhibitRoots) {
    const keys = new Set<string>();
    for (const r of roots) for (const k of staticClosure(manifest, r)) keys.add(k);
    for (const k of [...keys]) if (entry.has(k) || museum.has(k)) keys.delete(k);
    closures.set(id, keys);
  }
  for (const [id, keys] of [...closures].sort(([a], [b]) => a.localeCompare(b))) {
    const exclusive = [...keys].filter((k) =>
      [...closures].every(([other, set]) => other === id || !set.has(k)),
    );
    rows.push(
      row(`exhibits/${id}`, await gzipBytes(dist, manifest, exclusive), budgets.exhibitChunkGzipKB),
    );
  }
  if (exhibitRoots.size === 0) {
    rows.push({
      name: 'exhibits/*',
      kb: null,
      limit: budgets.exhibitChunkGzipKB,
      ok: true,
      note: 'skipped: no exhibit dynamic entries in the manifest yet',
    });
  }

  // The ?debug chunk: reported, never budgeted (ARCHITECTURE §9).
  const debugKeys = Object.entries(manifest)
    .filter(([key, c]) => (c.src ?? key).startsWith(DEBUG_PREFIX) && c.isDynamicEntry)
    .map(([key]) => key);
  if (debugKeys.length > 0) {
    const keys = new Set<string>();
    for (const r of debugKeys) for (const k of staticClosure(manifest, r)) keys.add(k);
    for (const k of [...keys]) if (entry.has(k) || museum.has(k)) keys.delete(k);
    rows.push({
      name: 'debug',
      kb: kb(await gzipBytes(dist, manifest, keys)),
      limit: null,
      ok: true,
      note: 'reported only',
    });
  }

  return { rows, forbidden, ok: rows.every((r) => r.ok) && forbidden.length === 0 };
}

export function formatTable(rows: BudgetRow[]): string {
  const cells = [
    ['name', 'KB gzip', 'limit', 'ok'],
    ...rows.map((r) => [
      r.name,
      r.kb === null ? '-' : r.kb.toFixed(2),
      r.limit === null ? '-' : String(r.limit),
      (r.ok ? 'yes' : 'NO') + (r.note ? ` (${r.note})` : ''),
    ]),
  ];
  const widths = [0, 1, 2].map((i) => Math.max(...cells.map((c) => c[i]!.length)));
  return cells
    .map(([name, size, limit, ok]) =>
      [name!.padEnd(widths[0]!), size!.padStart(widths[1]!), limit!.padStart(widths[2]!), ok].join(
        '  ',
      ),
    )
    .join('\n');
}

export interface CheckBudgetsOptions {
  dist?: string;
  budgets?: string;
}

/** Runs the check, prints the table and returns the exit code (0 ok, 1 breach or error). */
export async function checkBudgets(options: CheckBudgetsOptions = {}): Promise<number> {
  const dist = resolve(options.dist ?? DEFAULT_DIST);
  const budgetsFile = resolve(options.budgets ?? DEFAULT_BUDGETS);
  let report: BudgetReport;
  try {
    const budgets = readBundleBudgets(JSON.parse(await readFile(budgetsFile, 'utf8')));
    const manifestFile = join(dist, '.vite', 'manifest.json');
    let manifestText: string;
    try {
      manifestText = await readFile(manifestFile, 'utf8');
    } catch {
      throw new Error(`${manifestFile} is missing: run npm run build first`);
    }
    report = await measureBundles(dist, JSON.parse(manifestText) as Manifest, budgets);
  } catch (error) {
    console.error(`check-budgets: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
  console.log(formatTable(report.rows));
  for (const line of report.forbidden) console.error(`check-budgets: ${line}`);
  for (const r of report.rows) {
    if (!r.ok) console.error(`check-budgets: ${r.name} is ${r.kb} KB gzip, over ${r.limit} KB`);
  }
  console.log(report.ok ? 'budgets ok' : 'budgets FAILED');
  return report.ok ? 0 : 1;
}

function argValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  if (i >= 0) return argv[i + 1];
  return argv.find((a) => a.startsWith(`${flag}=`))?.slice(flag.length + 1);
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const argv = process.argv.slice(2);
  process.exitCode = await checkBudgets({
    dist: argValue(argv, '--dist'),
    budgets: argValue(argv, '--budgets'),
  });
}
