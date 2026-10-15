// check-copy (ARCHITECTURE §12.5, R10). `npm run check:copy`, and `--dist` at the end of
// `npm run build`.
//
// Always:
// - no U+2014 (spelled '\u2014' here) in any git-tracked or new, non-ignored text file, and with
//   `--dist` in any text file under dist/ or in the text of dist/resume.pdf;
// - no phone-shaped number in those files (package-lock.json is exempt from this one check).
//   A match is printed as <phone-pattern>, never echoed.
// With RELEASE=1 (PLAN Addendum, WP-06 brief rulings):
// - no `draft: true` anywhere in the parsed content (bullets, story blocks, copy, whole exhibits);
// - no `[placeholder` in the parsed content, and with `--dist` none in dist/ or the PDF text.
// Prints each hit as `<path>:<line>: <reason>` (content hits as `content.<path>: <reason>`) and
// exits 1 on any.
import { execFileSync } from 'node:child_process';
import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const EM_DASH = '\u2014';
export const PHONE_PATTERN = /\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/;
export const PLACEHOLDER = '[placeholder';
const PHONE_EXEMPT = new Set(['package-lock.json']);
const BINARY = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.ico',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.mp4',
  '.webm',
  '.ktx2',
  '.glb',
  '.bin',
  '.wasm',
  '.zip',
  '.gz',
]);

export interface CopyHit {
  /** `path:line` for files, `content.<path>` for the parsed content. */
  where: string;
  reason: string;
}

export interface CopyReport {
  hits: CopyHit[];
  /** Text files scanned (tracked files plus dist/ files). */
  files: number;
}

export interface CheckCopyOptions {
  /** Repository root; default this repo. */
  root?: string;
  /** Also scan dist/ (text files and the PDF text). */
  dist?: boolean;
  /** Release mode; default `RELEASE=1` in the environment. */
  release?: boolean;
  /** Repo-relative files to scan instead of `git ls-files`. */
  files?: string[];
  /** Parsed content for the release checks; default src/content/index.ts. */
  content?: unknown;
}

interface ScanRules {
  phone: boolean;
  placeholder: boolean;
}

/** Hits in one text, line by line. */
export function scanText(text: string, label: string, rules: ScanRules): CopyHit[] {
  const hits: CopyHit[] = [];
  for (const [i, line] of text.split(/\r\n|\r|\n/).entries()) {
    const where = `${label}:${i + 1}`;
    if (line.includes(EM_DASH)) hits.push({ where, reason: 'em dash (U+2014)' });
    if (rules.phone && PHONE_PATTERN.test(line)) {
      hits.push({ where, reason: 'phone-shaped number <phone-pattern>' });
    }
    if (rules.placeholder && line.includes(PLACEHOLDER)) {
      hits.push({ where, reason: '[placeholder text in a release build' });
    }
  }
  return hits;
}

/** Release checks on the parsed content: every `draft: true` and every `[placeholder` string. */
export function scanContent(value: unknown, path = 'content'): CopyHit[] {
  if (typeof value === 'string') {
    return value.includes(PLACEHOLDER)
      ? [{ where: path, reason: '[placeholder in content (RELEASE=1)' }]
      : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item: unknown, i) => {
      const id = (item as { id?: unknown } | null)?.id;
      return scanContent(item, `${path}[${typeof id === 'string' ? id : i}]`);
    });
  }
  if (value === null || typeof value !== 'object') return [];
  const hits: CopyHit[] =
    (value as { draft?: unknown }).draft === true
      ? [{ where: path, reason: 'draft: true (RELEASE=1 needs approved copy)' }]
      : [];
  for (const [key, child] of Object.entries(value)) {
    hits.push(...scanContent(child, `${path}.${key}`));
  }
  return hits;
}

const isBinary = (path: string, bytes: Buffer) =>
  BINARY.has(extname(path).toLowerCase()) || bytes.subarray(0, 8000).includes(0);

/** Tracked files plus new files git does not ignore, relative to `root`. */
export function gitFiles(root: string): string[] {
  const out = execFileSync(
    'git',
    ['ls-files', '-z', '--cached', '--others', '--exclude-standard'],
    {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  return [...new Set(out.split('\0').filter(Boolean))].sort();
}

async function readIfPresent(path: string): Promise<Buffer | null> {
  try {
    return await readFile(path);
  } catch {
    return null; // deleted in the working tree, or a directory (submodule)
  }
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else if (entry.isFile()) out.push(path);
  }
  return out.sort();
}

async function pdfText(bytes: Buffer): Promise<string> {
  const { extractText, getDocumentProxy } = await import('unpdf');
  const proxy = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(proxy, { mergePages: true });
  return text;
}

export async function checkCopy(options: CheckCopyOptions = {}): Promise<CopyReport> {
  const root = resolve(options.root ?? ROOT);
  const release = options.release ?? process.env.RELEASE === '1';
  const hits: CopyHit[] = [];
  let files = 0;

  for (const file of options.files ?? gitFiles(root)) {
    const bytes = await readIfPresent(join(root, file));
    if (bytes === null || isBinary(file, bytes)) continue;
    files += 1;
    hits.push(
      ...scanText(bytes.toString('utf8'), file, {
        phone: !PHONE_EXEMPT.has(file),
        placeholder: false,
      }),
    );
  }

  if (options.dist) {
    const dist = join(root, 'dist');
    const distFiles = await walk(dist);
    if (distFiles.length === 0) {
      hits.push({ where: 'dist', reason: 'missing or empty: build first' });
    }
    for (const path of distFiles) {
      const label = relative(root, path).split('\\').join('/');
      const bytes = await readFile(path);
      const rules = { phone: true, placeholder: release };
      if (extname(path).toLowerCase() === '.pdf') {
        files += 1;
        hits.push(...scanText(await pdfText(bytes), `${label} (text)`, rules));
      } else if (!isBinary(path, bytes)) {
        files += 1;
        hits.push(...scanText(bytes.toString('utf8'), label, rules));
      }
    }
  }

  if (release) {
    const content = options.content ?? (await import('../src/content/index')).content;
    hits.push(...scanContent(content));
  }
  return { hits, files };
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const dist = process.argv.includes('--dist');
  const release = process.env.RELEASE === '1';
  const { hits, files } = await checkCopy({ dist, release });
  const mode = [dist ? 'with dist/' : '', release ? 'RELEASE=1' : ''].filter(Boolean).join(', ');
  for (const hit of hits) console.error(`${hit.where}: ${hit.reason}`);
  if (hits.length > 0) {
    console.error(
      `check-copy: ${hits.length} problem(s) in ${files} files${mode ? ` (${mode})` : ''}`,
    );
    process.exitCode = 1;
  } else {
    console.log(`check-copy ok (${files} files${mode ? `, ${mode}` : ''})`);
  }
}
