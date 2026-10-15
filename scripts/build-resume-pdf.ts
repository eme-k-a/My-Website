// The one-page resume PDF (ARCHITECTURE §4.2, §4.3). `npm run resume` writes the public
// dist/resume.pdf (never a phone number); `--preview` also writes out/resume-preview.png;
// `npm run resume:private` (`--private`) writes out/private/resume.pdf and out/private/resume.tex
// with the phone from RESUME_PHONE and nothing else.
//
// Steps: printModel(content) -> ResumePrint rendered to static markup with print.css and CMU Serif
// (file:// URLs) inlined -> Chromium -> overflow gate -> page.pdf (tagged) -> pdf-lib metadata.
// The overflow gate fails loudly and names trim candidates. It never drops a bullet: trimming is a
// content edit (`print: false` in src/content/resume.ts).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, type Browser, type Page } from '@playwright/test';
import { PDFDict, PDFDocument, PDFHexString, PDFName } from 'pdf-lib';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { content } from '../src/content/index';
import { printModel, type PrintModel } from '../src/content/selectors';
import { buildDateFromEnv } from '../src/content/temporal';
import { ResumePrint } from '../src/print/ResumePrint';
import { readPreamble, renderResumeTex } from './build-resume-tex';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const FONT_DIR = join(ROOT, 'node_modules', 'computer-modern', 'fonts');
export const PRINT_CSS = join(ROOT, 'src', 'print', 'print.css');
export const PUBLIC_PDF = join(ROOT, 'dist', 'resume.pdf');
export const PRINT_HTML = join(ROOT, 'out', 'print', 'print.html');
export const PREVIEW_PNG = join(ROOT, 'out', 'resume-preview.png');
export const PRIVATE_DIR = join(ROOT, 'out', 'private');
const PRIVATE_PDF = join(PRIVATE_DIR, 'resume.pdf');
const PRIVATE_TEX = join(PRIVATE_DIR, 'resume.tex');
const PRIVATE_HTML = join(PRIVATE_DIR, 'print.html');

/** The phone format `--private` accepts. The value itself is never printed or logged. */
const PHONE_FORMAT = /^\d{3}-\d{3}-\d{4}$/;

/** CMU Serif faces (computer-modern; OFL-1.1, LICENSES/OFL-CMU-Serif.txt). "500" is the regular. */
const FACES = [
  { file: 'cmu-serif-500-roman.woff2', weight: 400, style: 'normal' },
  { file: 'cmu-serif-500-italic.woff2', weight: 400, style: 'italic' },
  { file: 'cmu-serif-700-roman.woff2', weight: 700, style: 'normal' },
  { file: 'cmu-serif-700-italic.woff2', weight: 700, style: 'italic' },
] as const;

/** @font-face rules with file:// URLs, so Chromium loads the fonts straight from node_modules. */
export function fontFaceCss(fontDir: string = FONT_DIR): string {
  return FACES.map((f) => {
    const url = pathToFileURL(join(fontDir, f.file)).href;
    return `@font-face { font-family: 'CMU Serif'; font-style: ${f.style}; font-weight: ${f.weight}; font-display: block; src: url('${url}') format('woff2'); }`;
  }).join('\n');
}

/** The complete print page: ResumePrint markup with the fonts and print.css inlined. */
export async function printHtml(model: PrintModel): Promise<string> {
  const css = await readFile(PRINT_CSS, 'utf8');
  const body = renderToStaticMarkup(createElement(ResumePrint, { model }));
  return [
    '<!doctype html>',
    '<html lang="en-CA">',
    '<head>',
    '<meta charset="utf-8">',
    `<title>${escapeHtml(`${model.name}, Resume`)}</title>`,
    `<style>\n${fontFaceCss()}\n${css}</style>`,
    '</head>',
    `<body>${body}</body>`,
    '</html>',
    '',
  ].join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/** Opens a page on a written print.html, in print media, with every font face it uses loaded. */
export async function openPrintPage(
  browser: Browser,
  htmlPath: string,
  options: { deviceScaleFactor?: number } = {},
): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 816, height: 1056 },
    deviceScaleFactor: options.deviceScaleFactor ?? 1,
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(htmlPath).href);
  await page.emulateMedia({ media: 'print' });
  const faces = await page.evaluate(async () => {
    await document.fonts.ready;
    return [...document.fonts].map((f) => ({ style: f.style, weight: f.weight, status: f.status }));
  });
  const used = faces.filter((f) => !(f.style === 'italic' && f.weight === '700'));
  const failed = used.filter((f) => f.status !== 'loaded');
  if (used.length < 3 || failed.length > 0) {
    throw new Error(
      `CMU Serif did not load from ${relative(ROOT, FONT_DIR)} (${JSON.stringify(faces)}). Run npm ci.`,
    );
  }
  return page;
}

export interface Overflow {
  px: number;
  lines: number;
  candidates: string[];
}

/** Measures .pr-page: overflow in CSS px, about how many bullet lines, and the trim candidates. */
export async function measureOverflow(page: Page): Promise<Overflow> {
  return page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('.pr-page');
    if (!el) throw new Error('No .pr-page element in the print page');
    const px = el.scrollHeight - el.clientHeight;
    const bullet = document.querySelector<HTMLElement>('.pr-bullet');
    const lineHeight = bullet ? parseFloat(getComputedStyle(bullet).lineHeight) : 16;
    const marked = [...document.querySelectorAll<HTMLElement>('.pr-bullet[data-trim]')];
    marked.sort((a, b) => Number(a.dataset.trim) - Number(b.dataset.trim));
    const candidates = marked.map(
      (li) => `${li.dataset.entry} bullet ${li.dataset.bullet} (priority ${li.dataset.priority})`,
    );
    return { px, lines: Math.ceil(px / (lineHeight || 16)), candidates };
  });
}

/**
 * The overflow gate. Throws `Resume overflows by N px (about K lines). Trim candidates: ...` when
 * the content is taller than the 10in page box. It only reports: no bullet is ever dropped here.
 */
export async function checkOverflow(page: Page): Promise<Overflow> {
  const overflow = await measureOverflow(page);
  if (overflow.px > 0) {
    const list =
      overflow.candidates.length > 0
        ? overflow.candidates.join(', ')
        : 'none (every printed bullet is priority 1 or the only bullet of its work entry)';
    throw new Error(
      `Resume overflows by ${overflow.px} px (about ${overflow.lines} ${overflow.lines === 1 ? 'line' : 'lines'}). ` +
        `Trim candidates: ${list}. Set print: false on the first candidates in src/content/resume.ts ` +
        '(list them in docs/RESUME_CHANGES.md), or shorten text, then rebuild.',
    );
  }
  return overflow;
}

/** Metadata for the finished PDF; every date comes from the build date. */
export interface PdfMeta {
  name: string;
  keywords: string[];
  date: Date;
}

const catalogHas = (doc: PDFDocument, key: string) =>
  doc.catalog.get(PDFName.of(key)) !== undefined;

/**
 * pdf-lib post-processing: Title, Author, Subject, Keywords, Creator, Producer and dates from the
 * build date, a document ID derived from the content (so the bytes depend only on the input), then
 * checks that the tags survived and that there is exactly one page.
 */
export async function finishPdf(bytes: Uint8Array, meta: PdfMeta): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  doc.setTitle(`${meta.name}, Resume`, { showInWindowTitleBar: true });
  doc.setAuthor(meta.name);
  doc.setSubject('Resume');
  doc.setKeywords([meta.keywords.join(', ')]);
  doc.setCreator('Commit History build');
  doc.setProducer('Playwright + pdf-lib');
  doc.setCreationDate(meta.date);
  doc.setModificationDate(meta.date);
  const id = createHash('sha256')
    .update(bytesWithoutId(bytes))
    .digest('hex')
    .slice(0, 32)
    .toUpperCase();
  doc.context.trailerInfo.ID = doc.context.obj([PDFHexString.of(id), PDFHexString.of(id)]);
  const out = await doc.save();

  const check = await PDFDocument.load(out, { updateMetadata: false });
  const markInfo = check.catalog.lookupMaybe(PDFName.of('MarkInfo'), PDFDict);
  const marked = markInfo?.get(PDFName.of('Marked'))?.toString() === 'true';
  if (!catalogHas(check, 'StructTreeRoot') || !marked) {
    throw new Error('The PDF lost its tags (/StructTreeRoot or /MarkInfo << /Marked true >>)');
  }
  if (check.getPageCount() !== 1) {
    throw new Error(`The PDF has ${check.getPageCount()} pages; the resume must be exactly one`);
  }
  return out;
}

// Chromium's /ID and /CreationDate change on every run; leave them out of the content digest.
function bytesWithoutId(bytes: Uint8Array): Uint8Array {
  const text = Buffer.from(bytes).toString('latin1');
  const stable = text
    .replace(/\/ID\s*\[[^\]]*\]/g, '')
    .replace(/\/(CreationDate|ModDate)\s*\([^)]*\)/g, '');
  return Buffer.from(stable, 'latin1');
}

/** Renders the page to a tagged one-page Letter PDF and finishes it with pdf-lib. */
export async function renderPdf(page: Page, meta: PdfMeta): Promise<Uint8Array> {
  const raw = await page.pdf({
    format: 'Letter',
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
    outline: false,
  });
  return finishPdf(raw, meta);
}

export interface BuildOptions {
  private?: boolean;
  preview?: boolean;
  env?: NodeJS.ProcessEnv;
}

/** Reads and checks RESUME_PHONE for the private build. Never echoes the value. */
export function privatePhone(env: NodeJS.ProcessEnv): string {
  if (env.CI) {
    throw new Error(
      'resume:private refuses to run when CI is set: the phone stays on your machine',
    );
  }
  try {
    process.loadEnvFile(join(ROOT, '.env.local'));
  } catch {
    // No .env.local: RESUME_PHONE may still come from the shell.
  }
  const phone = env.RESUME_PHONE ?? process.env.RESUME_PHONE;
  if (phone === undefined || phone === '') {
    throw new Error(
      'RESUME_PHONE is not set. Export it in your shell or put RESUME_PHONE=NNN-NNN-NNNN in the gitignored .env.local',
    );
  }
  if (!PHONE_FORMAT.test(phone)) {
    throw new Error('RESUME_PHONE must have the form NNN-NNN-NNNN (the value is not printed)');
  }
  return phone;
}

/** Aborts unless git ignores every path the private build writes. */
export function assertGitIgnored(paths: string[]): void {
  for (const path of paths) {
    const rel = relative(ROOT, path);
    try {
      execFileSync('git', ['check-ignore', '-q', rel], { cwd: ROOT, stdio: 'ignore' });
    } catch {
      throw new Error(`${rel} is not gitignored, so the private resume will not be written there`);
    }
  }
}

export async function buildResumePdf(options: BuildOptions = {}): Promise<string> {
  const env = options.env ?? process.env;
  const now = buildDateFromEnv(env);
  const isPrivate = options.private === true;
  const phone = isPrivate ? privatePhone(env) : undefined;
  if (isPrivate) assertGitIgnored([PRIVATE_PDF, PRIVATE_TEX, PRIVATE_HTML]);

  const model = printModel(content, { now, ...(phone !== undefined && { phone }) });
  const htmlPath = isPrivate ? PRIVATE_HTML : PRINT_HTML;
  await mkdir(dirname(htmlPath), { recursive: true });
  await writeFile(htmlPath, await printHtml(model));

  const browser = await chromium.launch();
  try {
    const page = await openPrintPage(browser, htmlPath, {
      deviceScaleFactor: options.preview ? 2 : 1,
    });
    await checkOverflow(page);
    const pdf = await renderPdf(page, { name: model.name, keywords: model.keywords, date: now });

    if (isPrivate) {
      await writeFile(PRIVATE_PDF, pdf);
      await writeFile(PRIVATE_TEX, renderResumeTex(model, await readPreamble()));
      return PRIVATE_PDF;
    }
    await mkdir(dirname(PUBLIC_PDF), { recursive: true });
    await writeFile(PUBLIC_PDF, pdf);
    if (options.preview) {
      await page.emulateMedia({ media: 'screen' });
      await mkdir(dirname(PREVIEW_PNG), { recursive: true });
      await page.screenshot({ path: PREVIEW_PNG, fullPage: true });
    }
    return PUBLIC_PDF;
  } finally {
    await browser.close();
    // The private page holds the phone; only the PDF and .tex stay in out/private/.
    if (isPrivate && existsSync(PRIVATE_HTML)) await rm(PRIVATE_HTML);
  }
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const isPrivate = process.argv.includes('--private');
  const preview = process.argv.includes('--preview');
  try {
    const out = await buildResumePdf({ private: isPrivate, preview });
    if (isPrivate) {
      console.log('private resume written (phone included)');
    } else {
      console.log(`resume.pdf written (${relative(ROOT, out)}, 1 page)`);
      if (preview) console.log(`preview written (${relative(ROOT, PREVIEW_PNG)})`);
    }
  } catch (error) {
    console.error(`build-resume-pdf: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
