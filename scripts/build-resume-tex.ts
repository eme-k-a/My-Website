// resume/resume.tex for Overleaf (ARCHITECTURE §4.4): `\documentclass`, then Jake's Resume preamble
// verbatim from resume/template/preamble.tex (Jake Gutierrez, MIT, resume/template/LICENSE), then a
// body built from printModel(content), the same selection as the PDF. Every string is escaped in
// the documented order. The output is deterministic (no timestamps), so CI can regenerate it and
// run `git diff --exit-code resume/resume.tex`.
//
// The public file never has a phone number. The private build (build-resume-pdf.ts --private)
// calls renderResumeTex with a model that carries the phone and writes out/private/resume.tex.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { content } from '../src/content/index';
import {
  printModel,
  type PrintBullet,
  type PrintEntry,
  type PrintModel,
  type PrintSection,
} from '../src/content/selectors';
import { buildDateFromEnv } from '../src/content/temporal';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TEX_OUT = join(ROOT, 'resume', 'resume.tex');
export const PREAMBLE = join(ROOT, 'resume', 'template', 'preamble.tex');
/**
 * Jake's line 8 at 10pt, the size Emeka's own Overleaf resume uses (its PDF embeds CMR10 with
 * 9pt bullets). At Jake's default 11pt the content runs onto a second page.
 * The preamble file holds everything else above `\begin{document}`.
 */
export const DOCUMENT_CLASS = '\\documentclass[letterpaper,10pt]{article}';

// A private-use character cannot occur in content, so it safely holds escaped backslashes while
// the other replacements run (their braces must not be escaped again).
const BACKSLASH_TOKEN = '\uE000';
const EN_DASH = '\u2013';

/**
 * Escapes text for LaTeX, in the ARCHITECTURE §4.4 order: `\` first (through a placeholder token),
 * then `& % $ # _ { } ~ ^`. Any U+2013 becomes `--`; curly quotes become straight quotes.
 */
export function texEscape(text: string): string {
  return text
    .replaceAll('\\', BACKSLASH_TOKEN)
    .replaceAll('&', '\\&')
    .replaceAll('%', '\\%')
    .replaceAll('$', '\\$')
    .replaceAll('#', '\\#')
    .replaceAll('_', '\\_')
    .replaceAll('{', '\\{')
    .replaceAll('}', '\\}')
    .replaceAll('~', '\\textasciitilde{}')
    .replaceAll('^', '\\textasciicircum{}')
    .replaceAll(BACKSLASH_TOKEN, '\\textbackslash{}')
    .replaceAll(EN_DASH, '--')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

/** A URL for `\href`: hyperref takes `#` and `~` as is, `%` must be escaped; braces never fit. */
export function texUrl(url: string): string {
  if (/[\s{}\\]/.test(url)) throw new Error(`URL cannot go into \\href: ${url}`);
  return url.replaceAll('%', '\\%').replaceAll('#', '\\#');
}

const item = (b: PrintBullet) => `        \\resumeItem{${texEscape(b.text)}}`;

function items(bullets: PrintBullet[]): string[] {
  if (bullets.length === 0) return [];
  return ['      \\resumeItemListStart', ...bullets.map(item), '      \\resumeItemListEnd'];
}

function subheading(e: PrintEntry): string[] {
  return [
    '    \\resumeSubheading',
    `      {${texEscape(e.role)}}{${texEscape(e.dates.tex)}}`,
    `      {${texEscape(e.org)}}{${texEscape(e.location)}}`,
    ...items(e.bullets),
    '',
  ];
}

const rule = (title: string) => `%-----------${title.toUpperCase()}-----------`;

function section(s: PrintSection): string[] {
  const head = [rule(s.title), `\\section{${texEscape(s.title)}}`];
  switch (s.kind) {
    case 'education':
      return [
        ...head,
        '  \\resumeSubHeadingListStart',
        ...s.entries.flatMap((e) => [
          '    \\resumeSubheading',
          `      {${texEscape(e.institution)}}{${texEscape(e.location)}}`,
          `      {${texEscape(e.degree)}}{${texEscape(e.dates.tex)}}`,
        ]),
        '  \\resumeSubHeadingListEnd',
      ];
    case 'experience':
    case 'volunteer':
      return [
        ...head,
        '  \\resumeSubHeadingListStart',
        '',
        ...s.entries.flatMap(subheading),
        '  \\resumeSubHeadingListEnd',
      ];
    case 'projects':
      return [
        ...head,
        '  \\resumeSubHeadingListStart',
        ...s.entries.flatMap((p) => [
          '    \\resumeProjectHeading',
          `      {\\textbf{${texEscape(p.name)}} $|$ \\emph{${texEscape(p.stack)}}}{${texEscape(p.dates?.tex ?? '')}}`,
          ...items(p.bullets),
        ]),
        '  \\resumeSubHeadingListEnd',
      ];
    case 'skills':
      return [
        ...head,
        ' \\begin{itemize}[leftmargin=0.15in, label={}]',
        '    \\small{\\item{',
        ...s.lines.map(
          (line, i) =>
            `     \\textbf{${texEscape(line.label)}}{: ${texEscape(line.items)}}${i < s.lines.length - 1 ? ' \\\\' : ''}`,
        ),
        '    }}',
        ' \\end{itemize}',
      ];
    case 'certifications':
      return [
        ...head,
        ' \\begin{itemize}[leftmargin=0.15in, label={}]',
        `    \\small{\\item{${s.items.map(texEscape).join(' $|$ ')}}}`,
        ' \\end{itemize}',
      ];
  }
}

function heading(model: PrintModel): string[] {
  const contact = model.contact.map((c) =>
    c.href === undefined
      ? texEscape(c.text)
      : `\\href{${texUrl(c.href)}}{\\underline{${texEscape(c.text)}}}`,
  );
  return [
    '%----------HEADING----------',
    '\\begin{center}',
    `    \\textbf{\\Huge \\scshape ${texEscape(model.name)}} \\\\ \\vspace{1pt}`,
    `    \\small ${contact.join(' $|$\n    ')}`,
    '\\end{center}',
  ];
}

/** The document body, from `\begin{document}` to `\end{document}`. */
export function renderTexBody(model: PrintModel): string {
  const lines = [
    '\\begin{document}',
    '',
    ...heading(model),
    '',
    ...model.sections.flatMap((s) => [...section(s), '', '']),
    '%-------------------------------------------',
    '\\end{document}',
  ];
  return `${lines.join('\n')}\n`;
}

const NOTICE = [
  '%-------------------------',
  '% Generated by scripts/build-resume-tex.ts from src/content/resume.ts (npm run resume).',
  '% Do not edit by hand: change the content and regenerate. The template is Jake Gutierrez',
  '% Resume (MIT, resume/template/LICENSE); its preamble is copied verbatim below.',
  '%-------------------------',
].join('\n');

/** The full .tex file: notice, `\documentclass`, Jake's preamble verbatim, then the body. */
export function renderResumeTex(model: PrintModel, preamble: string): string {
  const pre = preamble.endsWith('\n') ? preamble : `${preamble}\n`;
  return `${NOTICE}\n${DOCUMENT_CLASS}\n${pre}${renderTexBody(model)}`;
}

export const readPreamble = () => readFile(PREAMBLE, 'utf8');

/** Writes resume/resume.tex (or `out`) from the public print model at the build date. */
export async function buildResumeTex(options: { out?: string } = {}): Promise<string> {
  const out = options.out ?? TEX_OUT;
  const model = printModel(content, { now: buildDateFromEnv() });
  const tex = renderResumeTex(model, await readPreamble());
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, tex);
  return out;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const out = await buildResumeTex();
  console.log(`resume.tex written (${out.slice(ROOT.length + 1)})`);
}
