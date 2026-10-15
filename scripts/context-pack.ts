// context-pack (R0 tooling, not part of the site build). Builds docs/wp/packs/<id>.md: one file
// holding a work package's brief, docs/RULINGS.md and only the spec sections the brief cites, so a
// subagent does not have to read PLAN, ARCHITECTURE and EXPERIENCE in full.
//
//   npx tsx scripts/context-pack.ts WP-12            one pack
//   npx tsx scripts/context-pack.ts WP-11..WP-36     a numeric range (WP-11..36 also works)
//   npx tsx scripts/context-pack.ts --all            every brief (WP-xx and F-xxx)
//   npx tsx scripts/context-pack.ts --check WP-12    write nothing; exit 1 if a pack is stale
//
// What counts as a reference (case-sensitive document names, ARCHITECTURE §15.2 style cites):
// - a document name (`ARCHITECTURE`, `docs/spec/EXPERIENCE.md`, `ART_DIRECTION`, `CONTENT_DRAFT`,
//   `PLAN`) followed by `§n`, `§n.m`, `§n to §m` and further bare `§n` items, which keep the last
//   document name until the end of the sentence, bullet or paragraph (nested bullets inherit it);
// - `PLAN section 3`, `ARCHITECTURE sections 5, 9, 12 to 14`;
// - `Appendix A` after a document name;
// - `§4 "Rules for every exhibit"`: when the quoted words sit in the section's own text before its
//   first subsection, only that preamble is extracted (see extractSections).
// A section runs from its numbered heading to the next heading of the same or a higher level, so
// `§4` includes `§4.1` to `§4.10`. Anything that cannot be resolved is a warning, never dropped.
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export type DocKey = 'PLAN' | 'ARCHITECTURE' | 'EXPERIENCE' | 'ART_DIRECTION' | 'CONTENT_DRAFT';

/** Authority order; the pack lists sections in this order. */
export const DOC_ORDER: readonly DocKey[] = [
  'PLAN',
  'ARCHITECTURE',
  'EXPERIENCE',
  'ART_DIRECTION',
  'CONTENT_DRAFT',
];

export const DOC_PATHS: Record<DocKey, string> = {
  PLAN: 'docs/PLAN.md',
  ARCHITECTURE: 'docs/ARCHITECTURE.md',
  EXPERIENCE: 'docs/spec/EXPERIENCE.md',
  ART_DIRECTION: 'docs/ART_DIRECTION.md',
  CONTENT_DRAFT: 'docs/CONTENT_DRAFT.md',
};

/** Documents the pack always counts in the "read everything" baseline, cited or not. */
const ALWAYS_READ: readonly DocKey[] = ['PLAN', 'ARCHITECTURE', 'EXPERIENCE'];

const RULINGS_PATH = 'docs/RULINGS.md';
const BRIEF_DIR = 'docs/wp';
const PACK_DIR = 'docs/wp/packs';

const isDocKey = (name: string): name is DocKey => (DOC_ORDER as readonly string[]).includes(name);

// ---------------------------------------------------------------------------------------------
// Reference parser
// ---------------------------------------------------------------------------------------------

export interface SectionRef {
  doc: DocKey;
  /** First (or only) section id as written, for example `6.3`, `4`, `M0` or `Appendix A`. */
  id: string;
  /** End of a range (`§6.3 to §6.5`). */
  toId?: string;
  /** Words quoted right after the reference, for example `Rules for every exhibit`. */
  quote?: string;
  /** 1-based line of the brief. */
  line: number;
}

export interface ParsedRefs {
  refs: SectionRef[];
  /** Every document name the text mentions (cited or not with a section), sorted. */
  mentioned: string[];
  warnings: string[];
}

const NUM = String.raw`\d+(?:\.\d+)*`;
const ID = String.raw`${NUM}|M\d+`;
const ITEM = String.raw`${NUM}(?:\s+to\s+${NUM})?`;
const LIST = String.raw`${ITEM}(?:(?:,\s*and\s+|,\s*|\s+and\s+)${ITEM})*`;
const DOC_NAMES =
  'ARCHITECTURE|EXPERIENCE|ART_DIRECTION|CONTENT_DRAFT|CONTENT_UPDATE|RESUME_CHANGES|HANDOVER|MAINTENANCE|PLAN';

const TOKEN = new RegExp(
  [
    // A document name, optionally followed by "section(s) <list>".
    String.raw`(?:docs\/(?:spec\/)?)?\b(?<name>${DOC_NAMES})\b(?:\.md)?(?:,?\s+sections?\s+(?<nums>${LIST}))?`,
    // §n, §n to §m, optionally followed by a quoted title.
    String.raw`§\s*(?<sid>${ID})(?:\s+to\s+§?\s*(?<eid>${ID}))?(?:\s+["“](?<quote>[^"”\n]{1,80})["”])?`,
    String.raw`\bAppendix\s+(?<app>[A-Z])\b`,
    // Sentence end: the document context stops here.
    String.raw`(?<stop>\.(?=\s+[A-Z]))`,
  ].join('|'),
  'g',
);

/** "5, 9, 12 to 14" into [{ id: '5' }, { id: '9' }, { id: '12', toId: '14' }]. */
function parseNumberList(list: string): { id: string; toId?: string }[] {
  const out: { id: string; toId?: string }[] = [];
  for (const m of list.matchAll(new RegExp(String.raw`(${NUM})(?:\s+to\s+(${NUM}))?`, 'g'))) {
    const id = m[1];
    if (id === undefined) continue;
    const toId = m[2];
    out.push(toId === undefined ? { id } : { id, toId });
  }
  return out;
}

export function parseReferences(text: string): ParsedRefs {
  const refs: SectionRef[] = [];
  const warnings: string[] = [];
  const mentioned = new Set<string>();
  let doc: string | null = null;
  let chainIndent = 0;

  const lines = text.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const lineNo = index + 1;
    const indent = line.length - line.trimStart().length;
    const blank = line.trim() === '';
    const heading = /^#{1,6}\s/.test(line);
    const table = line.trimStart().startsWith('|');
    const bullet = /^\s*(?:[-*+]|\d+[.)])\s/.test(line);
    const startsNewBlock =
      blank || heading || table || (bullet && !(doc !== null && indent > chainIndent));
    if (startsNewBlock) {
      doc = null;
      chainIndent = indent;
    }

    for (const m of line.matchAll(TOKEN)) {
      const g = m.groups ?? {};
      if (g.stop !== undefined) {
        doc = null;
      } else if (g.name !== undefined) {
        doc = g.name;
        mentioned.add(g.name);
        if (g.nums !== undefined) {
          for (const item of parseNumberList(g.nums)) {
            addRef(g.name, item.id, item.toId, undefined, lineNo);
          }
        }
      } else if (g.sid !== undefined) {
        if (doc === null) {
          warnings.push(`line ${lineNo}: "${m[0]}" has no document name before it`);
        } else {
          addRef(doc, g.sid, g.eid, g.quote, lineNo);
        }
      } else if (g.app !== undefined && doc !== null) {
        addRef(doc, `Appendix ${g.app}`, undefined, undefined, lineNo);
      }
    }
  }

  function addRef(
    name: string,
    id: string,
    toId: string | undefined,
    quote: string | undefined,
    line: number,
  ): void {
    if (!isDocKey(name)) {
      warnings.push(`line ${line}: ${name} §${id} is cited, but ${name} is not packed`);
      return;
    }
    const ref: SectionRef = { doc: name, id, line };
    if (toId !== undefined) ref.toId = toId;
    if (quote !== undefined) ref.quote = quote;
    refs.push(ref);
  }

  return { refs, mentioned: [...mentioned].sort(), warnings };
}

// ---------------------------------------------------------------------------------------------
// Markdown sections
// ---------------------------------------------------------------------------------------------

export interface Heading {
  /** 0-based line index. */
  line: number;
  level: number;
  /** `6.3`, `6`, `M0`, `Appendix A`, or null for an unnumbered heading. */
  id: string | null;
  title: string;
}

export interface ParsedDoc {
  lines: string[];
  headings: Heading[];
  /** True for lines inside a fenced code block (fences included). */
  fenced: boolean[];
  /** Raw size in bytes, before line-ending normalisation. */
  bytes: number;
}

/** Marks lines inside ``` or ~~~ fences, so `# comment` lines in code are not headings. */
export function fenceMask(lines: readonly string[]): boolean[] {
  const mask: boolean[] = [];
  let open: { ch: string; len: number } | null = null;
  for (const line of lines) {
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    const fence = m?.[1] ?? '';
    const rest = m?.[2] ?? '';
    if (open === null) {
      const opens = fence !== '' && !(fence.startsWith('`') && rest.includes('`'));
      if (opens) open = { ch: fence.slice(0, 1), len: fence.length };
      mask.push(opens);
    } else {
      mask.push(true);
      if (fence.startsWith(open.ch) && fence.length >= open.len && rest.trim() === '') open = null;
    }
  }
  return mask;
}

function headingId(title: string): string | null {
  const numbered = /^(\d+(?:\.\d+)*)\.?(?=\s|$)/.exec(title);
  if (numbered?.[1] !== undefined) return numbered[1];
  const milestone = /^(M\d+)\b/.exec(title);
  if (milestone?.[1] !== undefined) return milestone[1];
  const appendix = /^Appendix\s+([A-Z])\b/.exec(title);
  if (appendix?.[1] !== undefined) return `Appendix ${appendix[1]}`;
  return null;
}

export function parseDoc(markdown: string): ParsedDoc {
  const lines = markdown.split(/\r?\n/);
  const fenced = fenceMask(lines);
  const headings: Heading[] = [];
  for (const [line, text] of lines.entries()) {
    if (fenced[line]) continue;
    const m = /^(#{1,6})[ \t]+(\S.*?)[ \t]*$/.exec(text);
    if (m?.[1] === undefined || m[2] === undefined) continue;
    headings.push({ line, level: m[1].length, id: headingId(m[2]), title: m[2] });
  }
  return { lines, headings, fenced, bytes: Buffer.byteLength(markdown, 'utf8') };
}

export interface Extracted {
  id: string;
  title: string;
  level: number;
  /** 0-based line range [start, end) in the source document. */
  start: number;
  end: number;
  /** True when only the text before the first subsection was taken (see extractSections). */
  narrowed: boolean;
  /** Source text with headings demoted so the section's own heading is level 3. */
  text: string;
}

/** Index one past the last content line: drops trailing blank lines and horizontal rules. */
function trimmedEnd(doc: ParsedDoc, start: number, end: number): number {
  let e = end;
  while (e > start + 1) {
    const t = (doc.lines[e - 1] ?? '').trim();
    if (t === '' || /^(-{3,}|\*{3,}|_{3,})$/.test(t)) e -= 1;
    else break;
  }
  return e;
}

/** End (exclusive) of the section whose heading is `headings[index]`. */
function sectionEnd(doc: ParsedDoc, index: number): number {
  const h = doc.headings[index];
  if (h === undefined) return doc.lines.length;
  for (let i = index + 1; i < doc.headings.length; i++) {
    const next = doc.headings[i];
    if (next !== undefined && next.level <= h.level) return next.line;
  }
  return doc.lines.length;
}

function renderSection(doc: ParsedDoc, h: Heading, start: number, end: number): string {
  const shift = 3 - h.level;
  const out: string[] = [];
  for (let i = start; i < end; i++) {
    const line = doc.lines[i] ?? '';
    const m = shift !== 0 && !doc.fenced[i] ? /^(#{1,6})([ \t]+.*)$/.exec(line) : null;
    if (m?.[1] !== undefined) {
      out.push('#'.repeat(Math.min(6, Math.max(1, m[1].length + shift))) + (m[2] ?? ''));
    } else {
      out.push(line);
    }
  }
  return out.join('\n');
}

function extractAt(doc: ParsedDoc, index: number, narrowTo?: string): Extracted | null {
  const h = doc.headings[index];
  if (h?.id == null) return null;
  const fullEnd = sectionEnd(doc, index);
  let end = fullEnd;
  let narrowed = false;
  const child = doc.headings[index + 1];
  if (
    narrowTo !== undefined &&
    child !== undefined &&
    child.line < fullEnd &&
    child.level > h.level
  ) {
    const preamble = doc.lines.slice(h.line, child.line).join('\n').toLowerCase();
    if (preamble.includes(narrowTo.toLowerCase())) {
      end = child.line;
      narrowed = true;
    }
  }
  end = trimmedEnd(doc, h.line, end);
  return {
    id: h.id,
    title: h.title,
    level: h.level,
    start: h.line,
    end,
    narrowed,
    text: renderSection(doc, h, h.line, end),
  };
}

/**
 * Extracts the section named by `ref` (or, with `toId`, every heading of the start's level from
 * `id` to `toId` in document order). A section runs to the next heading of the same or a higher
 * level, so it includes its subsections. With `quote`, when the section has subsections and the
 * quoted words occur in the text before the first one, only that preamble is taken: the brief
 * cited the section's own text, not all of its children.
 */
export function extractSections(
  doc: ParsedDoc,
  ref: { id: string; toId?: string; quote?: string },
): { sections: Extracted[]; warnings: string[] } {
  const warnings: string[] = [];
  const find = (id: string): number => {
    const hits = doc.headings.flatMap((h, i) => (h.id === id ? [i] : []));
    if (hits.length > 1) warnings.push(`§${id} matches ${hits.length} headings; using the first`);
    return hits[0] ?? -1;
  };

  const from = find(ref.id);
  if (from < 0) return { sections: [], warnings: [`§${ref.id}: no such section`, ...warnings] };

  if (ref.toId === undefined) {
    const one = extractAt(doc, from, ref.quote);
    return { sections: one ? [one] : [], warnings };
  }

  const to = find(ref.toId);
  if (to < 0) {
    const first = extractAt(doc, from);
    return {
      sections: first ? [first] : [],
      warnings: [`§${ref.toId}: no such section (end of the range from §${ref.id})`, ...warnings],
    };
  }
  const fromHeading = doc.headings[from];
  const toHeading = doc.headings[to];
  if (fromHeading === undefined || toHeading === undefined) return { sections: [], warnings };
  if (to < from) {
    return {
      sections: [],
      warnings: [`§${ref.id} to §${ref.toId}: the range runs backwards`, ...warnings],
    };
  }
  const sections: Extracted[] = [];
  if (fromHeading.level !== toHeading.level) {
    warnings.push(`§${ref.id} to §${ref.toId}: the ends are different heading levels; took both`);
    for (const index of [from, to]) {
      const one = extractAt(doc, index);
      if (one) sections.push(one);
    }
    return { sections, warnings };
  }
  for (let i = from; i <= to; i++) {
    if (doc.headings[i]?.level !== fromHeading.level) continue;
    const one = extractAt(doc, i);
    if (one) sections.push(one);
  }
  return { sections, warnings };
}

/** Sorts by position and drops any section that lies inside another one. */
export function mergeSections(sections: readonly Extracted[]): Extracted[] {
  const sorted = [...sections].sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: Extracted[] = [];
  for (const s of sorted) {
    const last = kept[kept.length - 1];
    if (last !== undefined && s.start >= last.start && s.end <= last.end) continue;
    kept.push(s);
  }
  return kept;
}

export interface PackSection extends Extracted {
  doc: DocKey;
}

export function resolveRefs(
  refs: readonly SectionRef[],
  docs: Record<DocKey, ParsedDoc>,
): { sections: PackSection[]; warnings: string[] } {
  const warnings: string[] = [];
  const sections: PackSection[] = [];
  const seen = new Set<string>();
  for (const doc of DOC_ORDER) {
    const found: Extracted[] = [];
    for (const ref of refs.filter((r) => r.doc === doc)) {
      const key = `${ref.id}|${ref.toId ?? ''}|${ref.quote ?? ''}`;
      if (seen.has(`${doc}|${key}`)) continue;
      seen.add(`${doc}|${key}`);
      const result = extractSections(docs[doc], ref);
      found.push(...result.sections);
      for (const w of result.warnings) warnings.push(`${doc} ${w} (brief line ${ref.line})`);
    }
    for (const s of mergeSections(found)) sections.push({ ...s, doc });
  }
  return { sections, warnings };
}

// ---------------------------------------------------------------------------------------------
// Pack
// ---------------------------------------------------------------------------------------------

export interface PackInput {
  /** `WP-12` or `F-M1`. */
  id: string;
  brief: string;
  rulings: string;
  docs: Record<DocKey, ParsedDoc>;
}

export interface PackResult {
  id: string;
  text: string;
  bytes: number;
  /** Brief plus PLAN, ARCHITECTURE and EXPERIENCE (and the other cited packed docs), in full. */
  fullBytes: number;
  sections: { doc: DocKey; id: string; title: string; narrowed: boolean; bytes: number }[];
  /** Documents the brief cites that the pack cannot extract from (for example CONTENT_UPDATE). */
  unpackedDocs: string[];
  warnings: string[];
}

const sizeOf = (s: string): number => Buffer.byteLength(s, 'utf8');
const trimBlock = (s: string): string => s.replace(/\s+$/, '');

export function buildPack(input: PackInput): PackResult {
  const parsed = parseReferences(input.brief);
  const resolved = resolveRefs(parsed.refs, input.docs);
  const warnings = [...parsed.warnings.map((w) => `brief ${w}`), ...resolved.warnings];

  const cited = DOC_ORDER.filter((d) => ALWAYS_READ.includes(d) || parsed.mentioned.includes(d));
  const fullBytes = sizeOf(input.brief) + cited.reduce((sum, d) => sum + input.docs[d].bytes, 0);
  const unpackedDocs = parsed.mentioned.filter((n) => !isDocKey(n));

  const body: string[] = [trimBlock(input.brief), '---', trimBlock(input.rulings)];
  for (const s of resolved.sections) {
    const note = s.narrowed ? ' (preamble only, as cited)' : '';
    body.push(`## From ${s.doc} §${s.id}${note}\n\n${s.text}`);
  }
  if (warnings.length > 0) {
    body.push(
      `## Unresolved references\n\nThe pack lacks these; open the full document.\n\n${warnings
        .map((w) => `- ${w}`)
        .join('\n')}`,
    );
  }
  const bodyText = body.join('\n\n');

  // The header states the pack's own size, so iterate until the number stops changing.
  const header = (n: number): string =>
    [
      `> Context pack for ${input.id}, generated by scripts/context-pack.ts: the full brief, docs/RULINGS.md and only the spec sections the brief cites. Read it first; open the full docs only for something the pack lacks.`,
      `> Regenerate after any change to the brief, a spec or docs/RULINGS.md: npx tsx scripts/context-pack.ts ${input.id} (never edit this file by hand).`,
      `> Size: ${n} bytes, versus ${fullBytes} bytes for the brief plus ${cited.join(', ')} read in full.`,
    ].join('\n');
  let bytes = 0;
  let text = '';
  for (let pass = 0; pass < 6; pass++) {
    text = `${header(bytes)}\n\n${bodyText}\n`;
    const actual = sizeOf(text);
    if (actual === bytes) break;
    bytes = actual;
  }

  return {
    id: input.id,
    text,
    bytes,
    fullBytes,
    sections: resolved.sections.map((s) => ({
      doc: s.doc,
      id: s.id,
      title: s.title,
      narrowed: s.narrowed,
      bytes: sizeOf(s.text),
    })),
    unpackedDocs,
    warnings,
  };
}

// ---------------------------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------------------------

/**
 * Turns CLI arguments into brief ids. Accepts `--all`, single ids and numeric ranges
 * (`WP-11..WP-36`, `WP-11..36`). `available` is every brief id that exists.
 */
export function expandIds(
  args: readonly string[],
  available: readonly string[],
): { ids: string[]; errors: string[] } {
  const errors: string[] = [];
  const picked = new Set<string>();
  for (const raw of args) {
    if (raw === '--all') {
      for (const id of available) picked.add(id);
      continue;
    }
    const range = /^(WP)-(\d+)\.\.(?:WP-)?(\d+)$/i.exec(raw);
    if (range?.[2] !== undefined && range[3] !== undefined) {
      const lo = Number(range[2]);
      const hi = Number(range[3]);
      if (lo > hi) errors.push(`${raw}: the range runs backwards`);
      for (let n = lo; n <= hi; n++) {
        const id = `WP-${String(n).padStart(2, '0')}`;
        if (available.includes(id)) picked.add(id);
        else errors.push(`${id}: no brief docs/wp/${id}.md`);
      }
      continue;
    }
    const id = raw.toUpperCase();
    if (available.includes(id)) picked.add(id);
    else errors.push(`${raw}: no brief docs/wp/${id}.md`);
  }
  return { ids: [...picked].sort((a, b) => a.localeCompare(b, 'en', { numeric: true })), errors };
}

async function loadDocs(): Promise<Record<DocKey, ParsedDoc>> {
  const entries = await Promise.all(
    DOC_ORDER.map(
      async (key) => [key, parseDoc(await readFile(join(ROOT, DOC_PATHS[key]), 'utf8'))] as const,
    ),
  );
  return Object.fromEntries(entries) as Record<DocKey, ParsedDoc>;
}

async function availableBriefs(): Promise<string[]> {
  const names = await readdir(join(ROOT, BRIEF_DIR));
  return names
    .map((n) => /^((?:WP-\d+|F-[A-Za-z0-9-]+))\.md$/.exec(n)?.[1])
    .filter((id): id is string => id !== undefined);
}

const fmt = (n: number): string => n.toLocaleString('en-US');

async function main(argv: readonly string[]): Promise<number> {
  const check = argv.includes('--check');
  const args = argv.filter((a) => a !== '--check');
  if (args.length === 0) {
    console.error(
      'usage: npx tsx scripts/context-pack.ts [--check] <WP-xx>... | WP-11..WP-36 | --all',
    );
    return 1;
  }
  const { ids, errors } = expandIds(args, await availableBriefs());
  for (const e of errors) console.error(`error: ${e}`);
  if (errors.length > 0) return 1;

  const docs = await loadDocs();
  const rulings = await readFile(join(ROOT, RULINGS_PATH), 'utf8');
  if (!check) await mkdir(join(ROOT, PACK_DIR), { recursive: true });

  const allWarnings: string[] = [];
  const stale: string[] = [];
  let packTotal = 0;
  let fullTotal = 0;
  for (const id of ids) {
    const brief = await readFile(join(ROOT, BRIEF_DIR, `${id}.md`), 'utf8');
    const pack = buildPack({ id, brief, rulings, docs });
    const path = join(ROOT, PACK_DIR, `${id}.md`);
    if (check) {
      const current = existsSync(path) ? await readFile(path, 'utf8') : null;
      if (current !== pack.text) stale.push(id);
    } else {
      await writeFile(path, pack.text);
    }
    packTotal += pack.bytes;
    fullTotal += pack.fullBytes;
    const pct = ((pack.bytes / pack.fullBytes) * 100).toFixed(1);
    console.log(
      `${id.padEnd(6)} pack ${fmt(pack.bytes).padStart(8)} B | full read ${fmt(pack.fullBytes).padStart(8)} B | ${pct.padStart(5)}% | ${String(pack.sections.length).padStart(2)} sections | ${pack.warnings.length} warnings`,
    );
    if (pack.unpackedDocs.length > 0) {
      console.log(`       also cited, not packed: ${pack.unpackedDocs.join(', ')}`);
    }
    for (const w of pack.warnings) allWarnings.push(`${id}: ${w}`);
  }
  const pct = fullTotal === 0 ? '0.0' : ((packTotal / fullTotal) * 100).toFixed(1);
  console.log(
    `total  pack ${fmt(packTotal).padStart(8)} B | full read ${fmt(fullTotal).padStart(8)} B | ${pct.padStart(5)}% | ${ids.length} packs`,
  );
  if (allWarnings.length > 0) {
    console.warn(`\n${allWarnings.length} warning(s):`);
    for (const w of allWarnings) console.warn(`  ${w}`);
  }
  if (stale.length > 0) {
    console.error(`\nstale or missing packs: ${stale.join(', ')}`);
    return 1;
  }
  return 0;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  process.exitCode = await main(process.argv.slice(2));
}
