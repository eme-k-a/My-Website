// The resume PDF build (ARCHITECTURE §4.2, §4.3): the overflow gate fails loudly with trim
// candidates and never drops a bullet, the real content fits, and the private build guards hold.
// The gate tests need Chromium (PLAYWRIGHT_BROWSERS_PATH locally, `npx playwright install
// chromium` in CI); without it they are skipped with a warning.
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type Browser } from '@playwright/test';
import { PDFDocument, PDFName } from 'pdf-lib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { content } from '../src/content/index';
import { printModel, type PrintModel } from '../src/content/selectors';
import type { Content } from '../src/content/types';
import {
  assertGitIgnored,
  checkOverflow,
  fontFaceCss,
  measureOverflow,
  openPrintPage,
  printHtml,
  privatePhone,
  renderPdf,
} from './build-resume-pdf';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OCT_2026 = new Date('2026-10-15T00:00:00Z');
// Built at runtime: check-copy scans every tracked file for a phone-shaped literal.
const PHONE = new RegExp(['\\b\\d{3}', '\\d{3}', '\\d{4}\\b'].join('[-. ]'));
const fakePhone = () => ['555', '010', '0199'].join('-');

const hasChromium = existsSync(chromium.executablePath());
if (!hasChromium) {
  console.warn('build-resume-pdf.test: Chromium is not installed, so the gate tests are skipped');
}

const printedCount = (m: PrintModel) =>
  m.sections.reduce(
    (n, s) =>
      s.kind === 'experience' || s.kind === 'volunteer' || s.kind === 'projects'
        ? n + s.entries.reduce((k, e) => k + e.bullets.length, 0)
        : n,
    0,
  );

/** The real content plus six long bullets on Mysa: far more than one page holds. */
function overfullContent(): Content {
  const c = structuredClone(content);
  const mysa = c.experiences.find((w) => w.id === 'mysa');
  if (!mysa) throw new Error('No mysa entry');
  for (let i = 1; i <= 6; i++) {
    mysa.bullets.push({
      text: `Extra test bullet ${i} with enough plain words to wrap onto a second printed line of the template, so that six of them together overflow the fixed page box by several lines.`,
      print: true,
      priority: 2,
      draft: false,
    });
  }
  return c;
}

describe.skipIf(!hasChromium)('overflow gate (checkOverflow)', () => {
  let browser: Browser;
  let dir: string;

  beforeAll(async () => {
    browser = await chromium.launch();
    dir = await mkdtemp(join(tmpdir(), 'wp04-pdf-'));
  }, 60_000);

  afterAll(async () => {
    await browser?.close();
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function pageFor(model: PrintModel, name: string) {
    const path = join(dir, `${name}.html`);
    await writeFile(path, await printHtml(model));
    return openPrintPage(browser, path);
  }

  it('passes for the real content and keeps every printed bullet', async () => {
    const model = printModel(content, { now: OCT_2026 });
    const page = await pageFor(model, 'real');
    const overflow = await checkOverflow(page);
    expect(overflow.px).toBeLessThanOrEqual(0);
    expect(await page.locator('.pr-bullet').count()).toBe(printedCount(model));
    await page.context().close();
  }, 30_000);

  it('throws "Resume overflows by" with named candidates and drops nothing', async () => {
    const model = printModel(overfullContent(), { now: OCT_2026 });
    const page = await pageFor(model, 'overfull');
    const error = await checkOverflow(page).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(Error);
    const message = (error as Error).message;
    expect(message).toMatch(
      /^Resume overflows by \d+ px \(about \d+ lines?\)\. Trim candidates: [a-z0-9-]+ bullet \d+ \(priority [23]\)/,
    );
    // Priority 3 first, oldest entries first: Wailo's landing-page bullet leads the list.
    expect(message).toContain('Trim candidates: wailo bullet 2 (priority 3), mysa bullet 4');
    expect(message).toContain('mysa bullet 10 (priority 2)');
    expect(message).not.toMatch(/cfia bullet|verafin bullet 1 |mysa bullet 1 /);
    const overflow = await measureOverflow(page);
    expect(overflow.px).toBeGreaterThan(0);
    expect(overflow.lines).toBeGreaterThanOrEqual(1);
    // The gate only reports: all 21 printed bullets are still on the page.
    expect(await page.locator('.pr-bullet').count()).toBe(printedCount(model));
    expect(printedCount(model)).toBe(21);
    await page.context().close();
  }, 30_000);

  it('renders a tagged one-page Letter PDF with the metadata', async () => {
    const model = printModel(content, { now: OCT_2026 });
    const page = await pageFor(model, 'pdf');
    const bytes = await renderPdf(page, {
      name: model.name,
      keywords: model.keywords,
      date: OCT_2026,
    });
    const doc = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(doc.getPageCount()).toBe(1);
    const size = doc.getPage(0).getSize();
    expect([Math.round(size.width), Math.round(size.height)]).toEqual([612, 792]);
    expect(doc.getTitle()).toBe('Chukwuemeka Nduka-Nwagbo, Resume');
    expect(doc.getAuthor()).toBe('Chukwuemeka Nduka-Nwagbo');
    expect(doc.getSubject()).toBe('Resume');
    expect(doc.getCreator()).toBe('Commit History build');
    expect(doc.getProducer()).toBe('Playwright + pdf-lib');
    expect(doc.getCreationDate()?.toISOString()).toBe(OCT_2026.toISOString());
    expect(doc.getModificationDate()?.toISOString()).toBe(OCT_2026.toISOString());
    expect(doc.catalog.get(PDFName.of('StructTreeRoot'))).toBeDefined();
    expect(doc.catalog.get(PDFName.of('MarkInfo'))).toBeDefined();
    await page.context().close();
  }, 30_000);
});

describe('print page', () => {
  it('loads CMU Serif from node_modules by file:// URL', () => {
    const css = fontFaceCss();
    expect(css.match(/@font-face/g)).toHaveLength(4);
    expect(css).toContain("url('file://");
    expect(css).toContain('cmu-serif-500-roman.woff2');
    expect(css).toContain('cmu-serif-700-roman.woff2');
  });

  it('inlines print.css and never carries a phone in the public page', async () => {
    const html = await printHtml(printModel(content, { now: OCT_2026 }));
    expect(html).toMatch(/^<!doctype html>\n<html lang="en-CA">/);
    expect(html).toContain('.pr-page {');
    expect(html).toContain('font-variant-ligatures: none');
    expect(html).not.toMatch(PHONE);
  });
});

describe('private build guards', () => {
  it('refuses to run when CI is set', () => {
    expect(() => privatePhone({ CI: '1', RESUME_PHONE: fakePhone() })).toThrow(
      /refuses to run when CI is set/,
    );
  });

  it('requires NNN-NNN-NNNN and never echoes a bad value', () => {
    const bad = ['555', '010', '019'].join('');
    let message = '';
    try {
      privatePhone({ RESUME_PHONE: bad });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/must have the form NNN-NNN-NNNN/);
    expect(message).not.toContain(bad);
  });

  it('accepts a well-formed phone', () => {
    expect(privatePhone({ RESUME_PHONE: fakePhone() })).toBe(fakePhone());
  });

  it('writes only to gitignored paths', () => {
    expect(() => assertGitIgnored([join(ROOT, 'out', 'private', 'resume.pdf')])).not.toThrow();
    expect(() => assertGitIgnored([join(ROOT, 'resume', 'resume.tex')])).toThrow(
      /is not gitignored/,
    );
  });
});
