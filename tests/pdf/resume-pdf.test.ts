// Checks on the built dist/resume.pdf (ARCHITECTURE §4.6, §13.10). Run after `npm run build` (or
// `npm run resume`) with `npm run test:pdf`. Written by WP-04; owned by R8 after the merge.
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDict, PDFDocument, PDFName } from 'pdf-lib';
import { extractText, getDocumentProxy } from 'unpdf';
import { beforeAll, describe, expect, it } from 'vitest';
import { content } from '../../src/content/index';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = join(ROOT, 'dist');
const PDF = join(DIST, 'resume.pdf');

// Spelled as an escape and built at runtime: check-copy scans every tracked file for both.
const EM_DASH = '\u2014';
const PHONE = new RegExp(['\\b\\d{3}', '\\d{3}', '\\d{4}\\b'].join('[-. ]'));
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
]);

/** Whitespace normalized to single spaces on both sides of every comparison. */
const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

async function textFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await textFiles(path)));
    else if (!BINARY.has(extname(entry.name).toLowerCase())) out.push(path);
  }
  return out;
}

let bytes: Uint8Array;
let doc: PDFDocument;
let text: string;

beforeAll(async () => {
  if (!existsSync(PDF)) throw new Error('dist/resume.pdf is missing: run npm run build first');
  bytes = new Uint8Array(await readFile(PDF));
  doc = await PDFDocument.load(bytes, { updateMetadata: false });
  const proxy = await getDocumentProxy(bytes.slice());
  const extracted = await extractText(proxy, { mergePages: true });
  text = normalize(extracted.text);
});

describe('dist/resume.pdf', () => {
  it('has exactly one page', () => {
    expect(doc.getPageCount()).toBe(1);
  });

  it('contains every print: true bullet verbatim, in content order', () => {
    const entries = [...content.experiences, ...content.projects, ...content.volunteer];
    const bullets = entries.flatMap((e) => e.bullets.filter((b) => b.print).map((b) => b.text));
    expect(bullets.length).toBeGreaterThan(0);
    let from = 0;
    for (const bullet of bullets) {
      const at = text.indexOf(normalize(bullet), from);
      expect(at, `missing or out of order: ${bullet}`).toBeGreaterThanOrEqual(from);
      from = at + normalize(bullet).length;
    }
  });

  it('leaves out every print: false bullet', () => {
    const entries = [...content.experiences, ...content.projects, ...content.volunteer];
    for (const b of entries.flatMap((e) => e.bullets.filter((x) => !x.print))) {
      expect(text).not.toContain(normalize(b.text));
    }
  });

  it('lists the work newest first: Nasdaq Verafin, Mysa, Wailo, CFIA', () => {
    const order = ['Nasdaq Verafin', 'Mysa', 'Wailo', 'Canadian Food Inspection Agency'].map(
      (org) => text.indexOf(org),
    );
    for (const at of order) expect(at).toBeGreaterThanOrEqual(0);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('prints at least one bullet for every work entry', () => {
    for (const work of content.experiences) {
      const printed = work.bullets.filter((b) => b.print);
      expect(printed.length, work.id).toBeGreaterThanOrEqual(1);
      expect(text).toContain(normalize(printed[0]!.text));
    }
  });

  it('has no phone number in the PDF text or in any text file under dist/', async () => {
    expect(text).not.toMatch(PHONE);
    const files = await textFiles(DIST);
    expect(files.length).toBeGreaterThan(0);
    const hits: string[] = [];
    for (const file of files) {
      if (PHONE.test(await readFile(file, 'utf8'))) hits.push(relative(ROOT, file));
    }
    expect(hits).toEqual([]);
  });

  it('has no em dash', () => {
    expect(text).not.toContain(EM_DASH);
  });

  it.runIf(process.env.RELEASE === '1')('has no placeholder in a release build', () => {
    expect(text).not.toContain('[placeholder');
  });

  it('has its Title and Author set', () => {
    expect(doc.getTitle()).toBe(`${content.contact.name}, Resume`);
    expect(doc.getAuthor()).toBe(content.contact.name);
  });

  it('is tagged: /StructTreeRoot and /MarkInfo << /Marked true >>', () => {
    expect(doc.catalog.get(PDFName.of('StructTreeRoot'))).toBeDefined();
    const markInfo = doc.catalog.lookupMaybe(PDFName.of('MarkInfo'), PDFDict);
    expect(markInfo?.get(PDFName.of('Marked'))?.toString()).toBe('true');
  });
});
