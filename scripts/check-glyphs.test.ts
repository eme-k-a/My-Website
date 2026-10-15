// Glyph coverage for 3D text (ARCHITECTURE §8.3): passes on current content, fails for a code
// point the fonts lack (U+E000, private use), and reads labels3d.ts exports in their fonts.
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { content } from '../src/content/index';
import { threeDStrings } from '../src/content/selectors';
import {
  checkGlyphs,
  contentLabels,
  environmentLabels,
  formatReport,
  labelsFromModule,
  main,
  type GlyphLabel,
} from './check-glyphs';

const OCT_2026 = new Date('2026-10-15T00:00:00Z');
// Written as an escape: a private-use code point no font of the kit maps.
const PRIVATE_USE = '';
const probe = (text: string, fonts: GlyphLabel['fonts'] = ['serif']): GlyphLabel => ({
  text,
  fonts,
  label: 'probe for test',
});

const dirs: string[] = [];
afterAll(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('checkGlyphs', () => {
  it('finds every glyph of the current 3D strings in their fonts', async () => {
    const report = await checkGlyphs({ now: OCT_2026 });
    expect(report.missing).toEqual([]);
    expect(report.labels).toBeGreaterThanOrEqual(threeDStrings(content, OCT_2026).length);
  });

  it('checks each content string in the font threeDStrings names', () => {
    const labels = contentLabels(OCT_2026);
    const strings = threeDStrings(content, OCT_2026);
    expect(labels.map((l) => [l.text, l.fonts])).toEqual(strings.map((s) => [s.text, [s.font]]));
  });

  it('reports a string containing U+E000 with its label', async () => {
    const report = await checkGlyphs({ labels: [probe(`A${PRIVATE_USE}B`, ['serif', 'sans'])] });
    expect(report.missing).toEqual([
      expect.objectContaining({ codePoint: 'U+E000', font: 'serif', label: 'probe for test' }),
      expect.objectContaining({ codePoint: 'U+E000', font: 'sans', label: 'probe for test' }),
    ]);
    const text = formatReport(report);
    expect(text).toContain('U+E000');
    expect(text).toContain('probe for test');
  });

  it('exits 1 and prints the missing character when a glyph is missing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(await main({ labels: [probe(PRIVATE_USE)] })).toBe(1);
      expect(error.mock.calls.flat().join('\n')).toMatch(/U\+E000 .* in probe for test/);
    } finally {
      error.mockRestore();
    }
  });

  it('exits 0 when every glyph exists', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      expect(await main({ labels: [probe("ST. JOHN'S & CO. 2026")] })).toBe(0);
      expect(log.mock.calls.flat().join('\n')).toMatch(/^glyphs ok/);
    } finally {
      log.mockRestore();
    }
  });
});

describe('labels3d.ts exports', () => {
  it('keeps the font of ThreeDString-shaped objects and checks bare strings in both fonts', () => {
    const labels = labelsFromModule({
      END_WALL: { kind: 'sign', text: "You've reached the beginning.", font: 'serif', for: 'end' },
      ROOMS: ['PROJECTS', { text: 'FOUNDATIONS', font: 'sans' }],
      NESTED: { door: { title: 'VOLUNTEER & LEADERSHIP' } },
      helper: () => 'not a label',
      count: 3,
    });
    expect(labels).toEqual([
      {
        text: "You've reached the beginning.",
        fonts: ['serif'],
        label: 'labels3d.ts END_WALL (end)',
      },
      { text: 'PROJECTS', fonts: ['serif', 'sans'], label: 'labels3d.ts ROOMS[0]' },
      { text: 'FOUNDATIONS', fonts: ['sans'], label: 'labels3d.ts ROOMS[1]' },
      {
        text: 'VOLUNTEER & LEADERSHIP',
        fonts: ['serif', 'sans'],
        label: 'labels3d.ts NESTED.door.title',
      },
    ]);
  });

  it('reads nothing while the file does not exist', async () => {
    expect(await environmentLabels(join(tmpdir(), 'no-such-dir', 'labels3d.ts'))).toEqual([]);
  });

  it('imports the module when the file exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'check-glyphs-'));
    dirs.push(dir);
    const file = join(dir, 'labels3d.ts');
    await writeFile(
      file,
      `export const LABELS: { text: string; font: 'serif' | 'sans' }[] = [{ text: 'A${PRIVATE_USE}', font: 'sans' }];\n`,
    );
    const labels = await environmentLabels(file);
    expect(labels).toEqual([
      { text: `A${PRIVATE_USE}`, fonts: ['sans'], label: 'labels3d.ts LABELS[0]' },
    ]);
    const report = await checkGlyphs({ labels });
    expect(report.missing.map((m) => m.codePoint)).toEqual(['U+E000']);
  });
});
