// Unit tests for scripts/context-pack.ts: the reference parser, the section extractor, merging,
// the pack builder and id expansion. All fixtures are small strings built here.
import { describe, expect, it } from 'vitest';
import {
  buildPack,
  expandIds,
  extractSections,
  fenceMask,
  mergeSections,
  parseDoc,
  parseReferences,
  resolveRefs,
  type DocKey,
  type ParsedDoc,
} from './context-pack';

const refsOf = (text: string) =>
  parseReferences(text).refs.map(({ doc, id, toId, quote }) => ({
    doc,
    id,
    ...(toId === undefined ? {} : { toId }),
    ...(quote === undefined ? {} : { quote }),
  }));

describe('parseReferences', () => {
  it('reads one cited section per document', () => {
    expect(refsOf('Read ARCHITECTURE §6.3 first.')).toEqual([{ doc: 'ARCHITECTURE', id: '6.3' }]);
    expect(refsOf('EXPERIENCE §4.1 and EXPERIENCE §4')).toEqual([
      { doc: 'EXPERIENCE', id: '4.1' },
      { doc: 'EXPERIENCE', id: '4' },
    ]);
    expect(refsOf('ART_DIRECTION §5')).toEqual([{ doc: 'ART_DIRECTION', id: '5' }]);
    expect(refsOf('CONTENT_DRAFT §3.2')).toEqual([{ doc: 'CONTENT_DRAFT', id: '3.2' }]);
    expect(refsOf('PLAN §5')).toEqual([{ doc: 'PLAN', id: '5' }]);
  });

  it('reads ranges written with or without a second section sign', () => {
    expect(refsOf('ARCHITECTURE §6.3 to §6.5')).toEqual([
      { doc: 'ARCHITECTURE', id: '6.3', toId: '6.5' },
    ]);
    expect(refsOf('ARCHITECTURE §8.1 to 8.3')).toEqual([
      { doc: 'ARCHITECTURE', id: '8.1', toId: '8.3' },
    ]);
  });

  it('lets bare section signs keep the last document name', () => {
    const text = 'ARCHITECTURE §8.1 to §8.3 (lighting), §8.5 (mounting), §9 (budgets).';
    expect(refsOf(text)).toEqual([
      { doc: 'ARCHITECTURE', id: '8.1', toId: '8.3' },
      { doc: 'ARCHITECTURE', id: '8.5' },
      { doc: 'ARCHITECTURE', id: '9' },
    ]);
  });

  it('switches document at the next document name, including path spellings', () => {
    const text = 'EXPERIENCE §2.3, `docs/ART_DIRECTION.md` §4, `docs/spec/EXPERIENCE.md` §7.6';
    expect(refsOf(text)).toEqual([
      { doc: 'EXPERIENCE', id: '2.3' },
      { doc: 'ART_DIRECTION', id: '4' },
      { doc: 'EXPERIENCE', id: '7.6' },
    ]);
  });

  it('reads the "section" and "sections" word forms', () => {
    expect(refsOf('PLAN section 3')).toEqual([{ doc: 'PLAN', id: '3' }]);
    expect(refsOf('ARCHITECTURE sections 5, 9, 12 to 14; EXPERIENCE section 8.')).toEqual([
      { doc: 'ARCHITECTURE', id: '5' },
      { doc: 'ARCHITECTURE', id: '9' },
      { doc: 'ARCHITECTURE', id: '12', toId: '14' },
      { doc: 'EXPERIENCE', id: '8' },
    ]);
  });

  it('attaches a quoted title to the section it follows', () => {
    const text = 'EXPERIENCE §4 "Rules for every exhibit" and **§4.1 verafin** (object).';
    expect(refsOf(text)).toEqual([
      { doc: 'EXPERIENCE', id: '4', quote: 'Rules for every exhibit' },
      { doc: 'EXPERIENCE', id: '4.1' },
    ]);
  });

  it('does not read item numbers after a section as sections', () => {
    expect(refsOf('EXPERIENCE §11.1 items 1, 4, 5 (end wall)')).toEqual([
      { doc: 'EXPERIENCE', id: '11.1' },
    ]);
  });

  it('keeps the document through a trailing label such as "testable rules:"', () => {
    expect(refsOf('EXPERIENCE testable rules: §2.8, §3.6, §5.11')).toEqual([
      { doc: 'EXPERIENCE', id: '2.8' },
      { doc: 'EXPERIENCE', id: '3.6' },
      { doc: 'EXPERIENCE', id: '5.11' },
    ]);
  });

  it('reads Appendix and milestone ids', () => {
    expect(refsOf('CONTENT_DRAFT Appendix A and PLAN §M0')).toEqual([
      { doc: 'CONTENT_DRAFT', id: 'Appendix A' },
      { doc: 'PLAN', id: 'M0' },
    ]);
  });

  it('forgets the document at a new bullet, a blank line and the end of a sentence', () => {
    const afterBullet = parseReferences('- ARCHITECTURE §7.2\n- §7.3');
    expect(afterBullet.refs.map((r) => r.id)).toEqual(['7.2']);
    expect(afterBullet.warnings).toHaveLength(1);
    expect(afterBullet.warnings[0]).toContain('line 2');

    expect(parseReferences('PLAN §5\n\nSee §7').warnings).toHaveLength(1);

    const afterSentence = parseReferences('PLAN §5. Then §7 applies.');
    expect(afterSentence.refs.map((r) => r.id)).toEqual(['5']);
    expect(afterSentence.warnings).toHaveLength(1);
  });

  it('lets continuation lines and nested bullets keep the document', () => {
    const text = '- ARCHITECTURE §7.2 (types),\n  §7.3 (registry)\n  - §7.5 (rules)\n- PLAN §6';
    expect(refsOf(text)).toEqual([
      { doc: 'ARCHITECTURE', id: '7.2' },
      { doc: 'ARCHITECTURE', id: '7.3' },
      { doc: 'ARCHITECTURE', id: '7.5' },
      { doc: 'PLAN', id: '6' },
    ]);
  });

  it('warns about a section sign with no document name', () => {
    const result = parseReferences('Check §4.2 before merging.');
    expect(result.refs).toEqual([]);
    expect(result.warnings).toEqual(['line 1: "§4.2" has no document name before it']);
  });

  it('warns about documents it does not pack, and still lists them as mentioned', () => {
    const result = parseReferences('See `docs/CONTENT_UPDATE.md` §2 and PLAN §3.');
    expect(result.refs.map((r) => `${r.doc}${r.id}`)).toEqual(['PLAN3']);
    expect(result.warnings).toEqual([
      'line 1: CONTENT_UPDATE §2 is cited, but CONTENT_UPDATE is not packed',
    ]);
    expect(result.mentioned).toEqual(['CONTENT_UPDATE', 'PLAN']);
  });

  it('records the 1-based brief line of each reference', () => {
    const refs = parseReferences('intro\n\nPLAN §6').refs;
    expect(refs[0]?.line).toBe(3);
  });
});

const DOC = [
  '# Title',
  '',
  '## 1. Alpha',
  'alpha intro mentions the Rules for every exhibit.',
  '',
  '### 1.1 First',
  'first body',
  '',
  '```sh',
  '# not a heading',
  '## 9. nor this',
  '```',
  '',
  '### 1.2 Second',
  'second body',
  '#### 1.2.1 Deep',
  'deep body',
  '',
  '## 2. Beta',
  'beta body',
  '',
  '### 2.1 Beta one',
  'beta one body',
  '',
  '---',
  '',
  '## Appendix A. Extras',
  'appendix body',
  '',
  '---',
  '',
].join('\n');

const doc = (): ParsedDoc => parseDoc(DOC);
const textOf = (id: string, extra: { toId?: string; quote?: string } = {}) =>
  extractSections(doc(), { id, ...extra }).sections.map((s) => s.text);

describe('parseDoc', () => {
  it('finds numbered headings and ignores headings inside code fences', () => {
    const headings = doc().headings.map((h) => `${h.level}:${h.id}`);
    expect(headings).toEqual([
      '1:null',
      '2:1',
      '3:1.1',
      '3:1.2',
      '4:1.2.1',
      '2:2',
      '3:2.1',
      '2:Appendix A',
    ]);
  });

  it('numbers headings written with or without a trailing dot, and milestone headings', () => {
    const d = parseDoc('## 10. Ten\n### 10.2 Ten two\n### M0: Spec\n## Locked decisions\n');
    expect(d.headings.map((h) => h.id)).toEqual(['10', '10.2', 'M0', null]);
  });

  it('handles longer fences and a tilde fence', () => {
    const mask = fenceMask(['````md', '```', '# x', '```', '````', '# y', '~~~', '# z', '~~~']);
    expect(mask).toEqual([true, true, true, true, true, false, true, true, true]);
  });
});

describe('extractSections', () => {
  it('runs a section to the next heading of the same or a higher level', () => {
    const [text] = textOf('1.1');
    expect(text).toContain('first body');
    expect(text).toContain('# not a heading');
    expect(text).not.toContain('second body');
  });

  it('includes nested subsections', () => {
    const [text] = textOf('1.2');
    expect(text).toContain('second body');
    expect(text).toContain('deep body');
    expect(text).not.toContain('beta body');

    const [whole] = textOf('1');
    expect(whole).toContain('first body');
    expect(whole).toContain('deep body');
    expect(whole).not.toContain('beta body');
  });

  it('runs the last section to the end and drops trailing blank lines and rules', () => {
    const [last] = textOf('Appendix A');
    expect(last?.endsWith('appendix body')).toBe(true);
    const [beta] = textOf('2');
    expect(beta?.endsWith('beta one body')).toBe(true);
  });

  it('demotes headings so the cited heading is level 3, and leaves code alone', () => {
    const [whole] = textOf('1');
    const lines = (whole ?? '').split('\n');
    expect(lines[0]).toBe('### 1. Alpha');
    expect(lines).toContain('#### 1.1 First');
    expect(lines).toContain('##### 1.2.1 Deep');
    expect(lines).toContain('# not a heading');
    expect(lines).toContain('## 9. nor this');

    const [sub] = textOf('1.2');
    expect((sub ?? '').split('\n')[0]).toBe('### 1.2 Second');
    expect((sub ?? '').split('\n')).toContain('#### 1.2.1 Deep');
  });

  it('expands a range into the headings of the starting level', () => {
    const result = extractSections(doc(), { id: '1.1', toId: '1.2' });
    expect(result.warnings).toEqual([]);
    expect(result.sections.map((s) => s.id)).toEqual(['1.1', '1.2']);
  });

  it('lets a range cross parents and skips deeper headings in between', () => {
    const result = extractSections(doc(), { id: '1.2', toId: '2.1' });
    expect(result.sections.map((s) => s.id)).toEqual(['1.2', '2.1']);
    expect(result.warnings).toEqual([]);

    const top = extractSections(doc(), { id: '1', toId: '2' });
    expect(top.sections.map((s) => s.id)).toEqual(['1', '2']);
  });

  it('warns when a range mixes levels, runs backwards or ends nowhere', () => {
    const mixed = extractSections(doc(), { id: '1', toId: '2.1' });
    expect(mixed.sections.map((s) => s.id)).toEqual(['1', '2.1']);
    expect(mixed.warnings[0]).toContain('different heading levels');

    const backwards = extractSections(doc(), { id: '2', toId: '1' });
    expect(backwards.sections).toEqual([]);
    expect(backwards.warnings[0]).toContain('runs backwards');

    const open = extractSections(doc(), { id: '1.1', toId: '1.9' });
    expect(open.sections.map((s) => s.id)).toEqual(['1.1']);
    expect(open.warnings[0]).toContain('§1.9: no such section');
  });

  it('warns about an unknown section and returns nothing', () => {
    expect(extractSections(doc(), { id: '7.7' })).toEqual({
      sections: [],
      warnings: ['§7.7: no such section'],
    });
  });

  it('warns when two headings share a number', () => {
    const dup = parseDoc('## 1. A\none\n## 1. B\ntwo\n');
    const result = extractSections(dup, { id: '1' });
    expect(result.sections[0]?.title).toBe('1. A');
    expect(result.warnings[0]).toContain('matches 2 headings');
  });

  it('takes only the preamble when the quoted words are in it', () => {
    const [text] = textOf('1', { quote: 'Rules for every exhibit' });
    expect(text).toContain('alpha intro');
    expect(text).not.toContain('first body');
    expect(
      extractSections(doc(), { id: '1', quote: 'rules for every exhibit' }).sections[0]?.narrowed,
    ).toBe(true);
  });

  it('takes the whole section when the quoted words are not in the preamble, or it has no children', () => {
    const [text] = textOf('1', { quote: 'Something else' });
    expect(text).toContain('first body');
    const second = extractSections(doc(), { id: '1.1', quote: 'first' }).sections[0];
    expect(second?.narrowed).toBe(false);
    expect(second?.text).toContain('first body');
  });
});

describe('mergeSections', () => {
  const span = (id: string, start: number, end: number) => ({
    id,
    title: id,
    level: 3,
    start,
    end,
    narrowed: false,
    text: id,
  });

  it('sorts by position and drops sections inside another', () => {
    const merged = mergeSections([span('1.1', 5, 9), span('2', 20, 30), span('1', 2, 19)]);
    expect(merged.map((s) => s.id)).toEqual(['1', '2']);
  });

  it('keeps adjacent sections that do not overlap', () => {
    const merged = mergeSections([span('1.2', 9, 14), span('1.1', 5, 9)]);
    expect(merged.map((s) => s.id)).toEqual(['1.1', '1.2']);
  });

  it('keeps a preamble and a later subsection of the same parent', () => {
    const merged = mergeSections([span('1.1', 5, 9), { ...span('1', 2, 5), narrowed: true }]);
    expect(merged.map((s) => s.id)).toEqual(['1', '1.1']);
  });
});

const docsFor = (text: string): Record<DocKey, ParsedDoc> => ({
  PLAN: parseDoc(text),
  ARCHITECTURE: parseDoc(text),
  EXPERIENCE: parseDoc(text),
  ART_DIRECTION: parseDoc(text),
  CONTENT_DRAFT: parseDoc(text),
});

describe('resolveRefs', () => {
  it('orders sections by document authority then position, and dedupes nested and repeated refs', () => {
    const docs = docsFor(DOC);
    const refs = parseReferences(
      'EXPERIENCE §2, §1.1, §1; PLAN §1.2; PLAN §1.2; ART_DIRECTION §2.1',
    ).refs;
    const { sections, warnings } = resolveRefs(refs, docs);
    expect(warnings).toEqual([]);
    expect(sections.map((s) => `${s.doc} ${s.id}`)).toEqual([
      'PLAN 1.2',
      'EXPERIENCE 1',
      'EXPERIENCE 2',
      'ART_DIRECTION 2.1',
    ]);
  });

  it('reports unknown sections with the brief line', () => {
    const refs = parseReferences('x\nPLAN §8').refs;
    const { sections, warnings } = resolveRefs(refs, docsFor(DOC));
    expect(sections).toEqual([]);
    expect(warnings).toEqual(['PLAN §8: no such section (brief line 2)']);
  });
});

describe('buildPack', () => {
  const brief =
    '# WP-99: Demo\n\n## Inputs\n- PLAN §1.1 and EXPERIENCE §2 and §2.1.\n- ART_DIRECTION §2.1\n';
  const rulings = '# R0 rulings\n\n- a rule\n';

  it('writes a 3-line header, the brief, the rulings, then each section', () => {
    const pack = buildPack({ id: 'WP-99', brief, rulings, docs: docsFor(DOC) });
    const lines = pack.text.split('\n');
    expect(lines.slice(0, 3).every((l) => l.startsWith('> '))).toBe(true);
    expect(lines[3]).toBe('');
    expect(lines[0]).toContain('WP-99');
    expect(lines[1]).toContain('npx tsx scripts/context-pack.ts WP-99');

    const at = (needle: string) => pack.text.indexOf(needle);
    expect(at('# WP-99: Demo')).toBeLessThan(at('# R0 rulings'));
    expect(at('# R0 rulings')).toBeLessThan(at('## From PLAN §1.1'));
    expect(at('## From PLAN §1.1')).toBeLessThan(at('## From EXPERIENCE §2'));
    expect(at('## From EXPERIENCE §2')).toBeLessThan(at('## From ART_DIRECTION §2.1'));
    expect(pack.text).toContain('first body');
    expect(pack.text.endsWith('\n')).toBe(true);
  });

  it('states its own exact byte count in the header', () => {
    const pack = buildPack({ id: 'WP-99', brief, rulings, docs: docsFor(DOC) });
    expect(pack.bytes).toBe(Buffer.byteLength(pack.text, 'utf8'));
    expect(pack.text.split('\n')[2]).toContain(`Size: ${pack.bytes} bytes`);
  });

  it('counts the brief, PLAN, ARCHITECTURE, EXPERIENCE and other cited docs as the full read', () => {
    const docs = docsFor(DOC);
    const pack = buildPack({ id: 'WP-99', brief, rulings, docs });
    const expected = Buffer.byteLength(brief, 'utf8') + 4 * docs.PLAN.bytes;
    expect(pack.fullBytes).toBe(expected);

    const withoutArt = buildPack({ id: 'WP-99', brief: 'PLAN §1.1', rulings, docs });
    expect(withoutArt.fullBytes).toBe(Buffer.byteLength('PLAN §1.1', 'utf8') + 3 * docs.PLAN.bytes);
  });

  it('is deterministic', () => {
    const a = buildPack({ id: 'WP-99', brief, rulings, docs: docsFor(DOC) });
    const b = buildPack({ id: 'WP-99', brief, rulings, docs: docsFor(DOC) });
    expect(a.text).toBe(b.text);
  });

  it('lists unresolved references in a final section and in the result', () => {
    const pack = buildPack({
      id: 'WP-99',
      brief: 'PLAN §1.1 and EXPERIENCE §9.9. Also `docs/CONTENT_UPDATE.md` §2. Then §4 alone.',
      rulings,
      docs: docsFor(DOC),
    });
    expect(pack.warnings).toHaveLength(3);
    expect(pack.text).toContain('## Unresolved references');
    expect(pack.text).toContain('EXPERIENCE §9.9: no such section (brief line 1)');
    expect(pack.unpackedDocs).toEqual(['CONTENT_UPDATE']);
    expect(pack.text.indexOf('## Unresolved references')).toBeGreaterThan(
      pack.text.indexOf('## From PLAN §1.1'),
    );
  });

  it('adds no unresolved section when everything resolves', () => {
    const pack = buildPack({ id: 'WP-99', brief, rulings, docs: docsFor(DOC) });
    expect(pack.warnings).toEqual([]);
    expect(pack.text).not.toContain('## Unresolved references');
  });

  it('marks a preamble-only section in its heading', () => {
    const pack = buildPack({
      id: 'WP-99',
      brief: 'EXPERIENCE §1 "Rules for every exhibit" and §1.2',
      rulings,
      docs: docsFor(DOC),
    });
    expect(pack.text).toContain('## From EXPERIENCE §1 (preamble only, as cited)');
    expect(pack.text).toContain('## From EXPERIENCE §1.2');
    expect(pack.text).not.toContain('first body');
    expect(pack.sections.map((s) => `${s.id}${s.narrowed ? '*' : ''}`)).toEqual(['1*', '1.2']);
  });
});

describe('expandIds', () => {
  const available = ['F-M1', 'WP-01', 'WP-02', 'WP-11', 'WP-12', 'WP-13'];

  it('accepts single ids in any case and sorts them numerically', () => {
    expect(expandIds(['wp-12', 'WP-02'], available)).toEqual({
      ids: ['WP-02', 'WP-12'],
      errors: [],
    });
  });

  it('expands ranges with or without the second prefix', () => {
    expect(expandIds(['WP-11..WP-13'], available).ids).toEqual(['WP-11', 'WP-12', 'WP-13']);
    expect(expandIds(['WP-11..13'], available).ids).toEqual(['WP-11', 'WP-12', 'WP-13']);
  });

  it('expands --all to every brief', () => {
    expect(expandIds(['--all'], available).ids).toEqual([
      'F-M1',
      'WP-01',
      'WP-02',
      'WP-11',
      'WP-12',
      'WP-13',
    ]);
  });

  it('reports missing briefs and backwards ranges', () => {
    expect(expandIds(['WP-40'], available).errors).toEqual(['WP-40: no brief docs/wp/WP-40.md']);
    expect(expandIds(['WP-12..WP-15'], available).errors).toEqual([
      'WP-14: no brief docs/wp/WP-14.md',
      'WP-15: no brief docs/wp/WP-15.md',
    ]);
    expect(expandIds(['WP-13..WP-11'], available).errors).toEqual([
      'WP-13..WP-11: the range runs backwards',
    ]);
  });
});
