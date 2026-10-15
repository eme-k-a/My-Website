// check-copy on temp fixtures built at runtime (ARCHITECTURE §12.5). Every em dash and
// phone-shaped string here is assembled from parts, because check-copy scans this file too.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { content } from '../src/content/index';
import { checkCopy, gitFiles, scanContent, scanText } from './check-copy';

const EM = String.fromCharCode(0x2014);
const fakePhone = (sep = '-') => ['555', '010', '0199'].join(sep);

let root: string;

async function put(file: string, text: string | Uint8Array) {
  await mkdir(join(root, file, '..'), { recursive: true });
  await writeFile(join(root, file), text);
}

async function pdfWith(line: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage().drawText(line, { x: 50, y: 700, size: 12, font });
  return doc.save();
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'check-copy-'));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('scanText', () => {
  it('reports an em dash with its line number', () => {
    expect(
      scanText(`ok\nfirst ${EM} second\n`, 'a.md', { phone: true, placeholder: false }),
    ).toEqual([{ where: 'a.md:2', reason: 'em dash (U+2014)' }]);
  });

  it('reports a phone-shaped number without echoing it', () => {
    for (const sep of ['-', '.', ' ']) {
      const hits = scanText(`call ${fakePhone(sep)}`, 'b.txt', { phone: true, placeholder: false });
      expect(hits).toEqual([{ where: 'b.txt:1', reason: 'phone-shaped number <phone-pattern>' }]);
      expect(JSON.stringify(hits)).not.toContain('0199');
    }
    expect(scanText(`v${fakePhone('')}`, 'c', { phone: true, placeholder: false })).toEqual([]);
    expect(scanText(fakePhone(), 'd', { phone: false, placeholder: false })).toEqual([]);
  });

  it('reports [placeholder only when asked', () => {
    const text = 'Open to [placeholder: target roles]';
    expect(scanText(text, 'e', { phone: true, placeholder: false })).toEqual([]);
    expect(scanText(text, 'e', { phone: true, placeholder: true })).toHaveLength(1);
  });
});

describe('scanContent', () => {
  it('finds every draft flag and placeholder, labelled by id where there is one', () => {
    const hits = scanContent({
      experiences: [
        {
          id: 'verafin',
          bullets: [
            { text: 'a', draft: false },
            { text: 'b', draft: true },
          ],
          exhibit: { draft: true, story: [{ type: 'p', text: 'x', draft: false }] },
        },
      ],
      meta: { siteUrl: 'https://[placeholder: host].netlify.app' },
    });
    expect(hits.map((h) => h.where)).toEqual([
      'content.experiences[verafin].bullets[1]',
      'content.experiences[verafin].exhibit',
      'content.meta.siteUrl',
    ]);
  });

  it('flags the real content today (Verafin and other exhibits are still draft)', () => {
    const hits = scanContent(content);
    expect(hits.some((h) => h.where === 'content.experiences[verafin].exhibit')).toBe(true);
    expect(hits.some((h) => h.reason.startsWith('[placeholder'))).toBe(true);
  });
});

describe('checkCopy', () => {
  it('passes clean files and skips binaries and the lockfile phone check', async () => {
    await put('README.md', 'Clean copy, with a hyphen - and an en dash – in 2026.\n');
    await put('img.png', new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, EM.charCodeAt(0) & 0xff]));
    await put('package-lock.json', `{"integrity": "sha512 ${fakePhone(' ')}"}\n`);
    const report = await checkCopy({
      root,
      release: false,
      files: ['README.md', 'img.png', 'package-lock.json', 'deleted.txt'],
    });
    expect(report).toEqual({ hits: [], files: 2 });
  });

  it('catches a runtime-built em dash and phone number in tracked files', async () => {
    await put('docs/a.md', `line one\nline ${EM} two\n`);
    await put('src/b.ts', `const n = '${fakePhone('.')}';\n`);
    await put('package-lock.json', `"${EM}"\n`);
    const { hits } = await checkCopy({
      root,
      release: false,
      files: ['docs/a.md', 'src/b.ts', 'package-lock.json'],
    });
    expect(hits).toEqual([
      { where: 'docs/a.md:2', reason: 'em dash (U+2014)' },
      { where: 'src/b.ts:1', reason: 'phone-shaped number <phone-pattern>' },
      { where: 'package-lock.json:1', reason: 'em dash (U+2014)' },
    ]);
  });

  it('lists tracked and new files through git, without ignored ones', async () => {
    execFileSync('git', ['init', '-q'], { cwd: root });
    await put('.gitignore', 'dist/\n');
    await put('tracked.md', `${EM}\n`);
    await put('dist/ignored.html', `${EM}\n`);
    execFileSync('git', ['add', 'tracked.md', '.gitignore'], { cwd: root });
    await put('new.md', 'fresh\n');
    expect(gitFiles(root)).toEqual(['.gitignore', 'new.md', 'tracked.md']);
    const { hits } = await checkCopy({ root, release: false });
    expect(hits.map((h) => h.where)).toEqual(['tracked.md:1']);
  });

  it('with --dist scans dist/ text files and the PDF text', async () => {
    await put('dist/index.html', `<p>${fakePhone()}</p>\n`);
    await put('dist/assets/a.js', `x="${EM}"\n`);
    await put('dist/images/h.webp', new Uint8Array([0, 1, 2]));
    await put('dist/resume.pdf', await pdfWith(`Call ${fakePhone()}`));
    const { hits } = await checkCopy({ root, dist: true, release: false, files: [] });
    expect(hits).toEqual([
      { where: 'dist/assets/a.js:1', reason: 'em dash (U+2014)' },
      { where: 'dist/index.html:1', reason: 'phone-shaped number <phone-pattern>' },
      { where: 'dist/resume.pdf (text):1', reason: 'phone-shaped number <phone-pattern>' },
    ]);
  });

  it('with --dist fails when dist/ is missing', async () => {
    const { hits } = await checkCopy({ root, dist: true, release: false, files: [] });
    expect(hits).toEqual([{ where: 'dist', reason: 'missing or empty: build first' }]);
  });

  it('with RELEASE=1 blocks drafts and placeholders in content and dist/', async () => {
    await put('dist/index.html', '<p>[placeholder: host]</p>\n');
    const draftContent = {
      experiences: [{ id: 'mysa', exhibit: { draft: true }, bullets: [{ draft: false }] }],
    };
    const off = await checkCopy({
      root,
      dist: true,
      release: false,
      files: [],
      content: draftContent,
    });
    expect(off.hits).toEqual([]);
    const on = await checkCopy({
      root,
      dist: true,
      release: true,
      files: [],
      content: draftContent,
    });
    expect(on.hits).toEqual([
      { where: 'dist/index.html:1', reason: '[placeholder text in a release build' },
      { where: 'content.experiences[mysa].exhibit', reason: expect.stringMatching(/^draft: true/) },
    ]);
  });

  it('with RELEASE=1 loads the real content when none is given', async () => {
    const { hits } = await checkCopy({ root, release: true, files: [] });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.where.startsWith('content.'))).toBe(true);
  });
});
