// WP-35 A1: `npm run new:exhibit -- <id>` scaffolds a placeholder exhibit that passes lint,
// prettier, and the registry checks on day one. The scaffold runs into a temporary copy of the
// exhibits folder (its `_kit` is a symlink to the real kit), never into src/.
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, symlink, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ESLint } from 'eslint';
import * as prettier from 'prettier';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { EXHIBIT_IDS } from '../src/content/ids';
import { Group, Mesh, MeshBasicMaterial } from 'three';
import { content } from '../src/content/index';
import { MAX_EXHIBIT_TRIANGLES } from '../src/museum/exhibits/_kit/defineExhibit';
import { fitsBounds, measureObject } from '../src/museum/exhibits/_kit/measure';
import {
  createPlaceholderGeometries,
  placeholderFit,
} from '../src/museum/exhibits/_kit/placeholderGeometry';
import { computeLayout } from '../src/museum/rail/layout';
import type { ExhibitManifest } from '../src/museum/exhibits/_kit/types';
import {
  EXHIBITS_DIR,
  componentName,
  newExhibit,
  nextSteps,
  render,
  validateId,
  type NewExhibitResult,
} from './new-exhibit';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KIT = join(ROOT, EXHIBITS_DIR, '_kit');
// Any real id works: the temporary root has no folder for it, and defineExhibit accepts it.
const ID = 'verafin';
const TITLE = "The Reporter's Engine";

let root: string;
let result: NewExhibitResult;
const read = (file: string) => readFile(join(result.dir, file), 'utf8');

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'new-exhibit-'));
  await mkdir(join(root, EXHIBITS_DIR), { recursive: true });
  await symlink(KIT, join(root, EXHIBITS_DIR, '_kit'), 'dir');
  result = await newExhibit(ID, { root, title: TITLE });
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('new:exhibit scaffold (WP-35)', () => {
  it('writes the manifest, the component and the README into src/museum/exhibits/<id>/', () => {
    expect(result.dir).toBe(join(root, EXHIBITS_DIR, ID));
    expect(result.component).toBe('Verafin');
    expect(result.files.map((f) => f.slice(result.dir.length + 1))).toEqual([
      'index.ts',
      'Verafin.tsx',
      'README.md',
    ]);
    for (const file of result.files) expect(existsSync(file), file).toBe(true);
  });

  it('the manifest uses defineExhibit with the placeholder budget and a lazy loader', async () => {
    const index = await read('index.ts');
    expect(index).toContain("import { defineExhibit } from '../_kit';");
    expect(index).toContain(`id: '${ID}'`);
    expect(index).toContain(`title: "The Reporter's Engine"`);
    expect(index).toContain("load: () => import('./Verafin')");
    expect(index).toContain('budget: { triangles: 300, drawCalls: 2, textureMB: 0 }');
    expect(index).toContain("motion: 'none'");
  });

  it('the component renders the kit Placeholder', async () => {
    const component = await read('Verafin.tsx');
    expect(component).toContain("import { Placeholder } from '../_kit/Placeholder';");
    expect(component).toContain('export default function Verafin({ slot }: ExhibitProps)');
    expect(component).toContain('<Placeholder slot={slot} />');
    expect(component).toContain("const lift = slot.mount === 'plinth' ? slot.bounds.min[1] : 0;");
  });

  it('lifts the crate so it fits every plinth and wall slot of the layout (inBounds)', () => {
    const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));
    const material = new MeshBasicMaterial();
    for (const slot of layout.slots) {
      const fit = placeholderFit(slot);
      const { crate, caps } = createPlaceholderGeometries(fit.size);
      const lift = new Group();
      lift.position.set(0, slot.mount === 'plinth' ? slot.bounds.min[1] : 0, 0);
      const body = new Group();
      body.position.set(...fit.center);
      body.add(new Mesh(crate, material), new Mesh(caps, material));
      lift.add(body);
      const root = new Group().add(lift);
      const { box, triangles } = measureObject(root);
      expect(fitsBounds(box, slot.bounds), slot.id).toBe(true);
      expect(triangles, slot.id).toBeLessThanOrEqual(300);
    }
  });

  it('the README states the slot bounds, the budget, MergeStatic and the concept link', async () => {
    const readme = await read('README.md');
    expect(readme).toContain(`# ${ID}: "${TITLE}"`);
    expect(readme).toContain('x and z in [-0.325, 0.325], y in [0.025, 0.675]');
    expect(readme).toContain('300 triangles, 2 draw calls');
    expect(readme).toContain('at most 20,000 triangles');
    expect(readme).toContain('`<MergeStatic>` (ARCHITECTURE §7.5)');
    expect(readme).toContain(`(../../../../review/concepts/${ID}.md)`);
    expect(readme).toContain('Verafin.tsx');
  });

  it('leaves no template token and no em dash', async () => {
    for (const file of result.files) {
      const text = await readFile(file, 'utf8');
      expect(text, file).not.toMatch(/__[A-Z_]+__/);
      expect(text, file).not.toContain('\u2014');
    }
  });

  it('passes the repo lint rules (the exhibit block of eslint.config.js) and prettier', async () => {
    const eslint = new ESLint({ cwd: ROOT });
    for (const file of result.files) {
      const name = file.slice(result.dir.length + 1);
      // Linted as if it sat in the real folder, so the exhibit rules of ARCHITECTURE §7.5 apply.
      const filePath = join(ROOT, EXHIBITS_DIR, ID, name);
      const text = await readFile(file, 'utf8');
      if (!name.endsWith('.md')) {
        const [report] = await eslint.lintText(text, { filePath });
        expect(report?.messages ?? [], name).toEqual([]);
      }
      const config = (await prettier.resolveConfig(filePath)) ?? {};
      expect(await prettier.check(text, { ...config, filepath: filePath }), name).toBe(true);
    }
  });

  it('passes the registry checks: id, folder, budget, motion and a loadable component', async () => {
    const mod = (await import(pathToFileURL(join(result.dir, 'index.ts')).href)) as {
      default: ExhibitManifest;
    };
    const manifest = mod.default;
    expect(manifest.id).toBe(ID);
    expect(EXHIBIT_IDS).toContain(manifest.id);
    expect(manifest.budget.triangles).toBeLessThanOrEqual(MAX_EXHIBIT_TRIANGLES);
    expect(['none', 'slow']).toContain(manifest.motion);
    const loaded = await manifest.load();
    expect(typeof loaded.default).toBe('function');
  });
});

describe('new:exhibit refuses', () => {
  it('a missing id', async () => {
    await expect(newExhibit(undefined, { root })).rejects.toThrow(/Usage/);
  });

  it.each(['NewJob', 'new_job', 'new--job', '-new', 'new-', '1co', '_kit'])(
    'the non-kebab id %s',
    async (bad) => {
      await expect(newExhibit(bad, { root, ids: [bad], title: 'x' })).rejects.toThrow(/kebab-case/);
    },
  );

  it('an id that is not in EXHIBIT_IDS', async () => {
    await expect(newExhibit('not-an-exhibit-id', { root, title: 'x' })).rejects.toThrow(
      /not in EXHIBIT_IDS/,
    );
  });

  it('an existing folder, which it never overwrites', async () => {
    const before = await read('index.ts');
    await expect(newExhibit(ID, { root, title: 'Other' })).rejects.toThrow(/already exists/);
    expect(await read('index.ts')).toBe(before);
  });

  it('every real exhibit folder (validation only: this test never writes into src/)', () => {
    const existing = EXHIBIT_IDS.filter((id) => existsSync(join(ROOT, EXHIBITS_DIR, id)));
    expect(existing.length).toBeGreaterThan(0);
    for (const id of existing) {
      expect(() => validateId(id, EXHIBIT_IDS, ROOT)).toThrow(/already exists/);
    }
  });
});

describe('helpers', () => {
  it('componentName makes a PascalCase identifier', () => {
    expect(componentName('new-job')).toBe('NewJob');
    expect(componentName('finance-tracker')).toBe('FinanceTracker');
    expect(componentName('b2b-app')).toBe('B2bApp');
  });

  it('render escapes the title only inside the TS string', () => {
    expect(render("'__TITLE_TS__' __TITLE__", 'x', "it's a\\b")).toBe("'it\\'s a\\\\b' it's a\\b");
  });

  it('nextSteps names the registry test, verify, the brief and the runbook', () => {
    const steps = nextSteps('new-job').join('\n');
    expect(steps).toContain('registry.test.ts');
    expect(steps).toContain('npm run verify');
    expect(steps).toContain('review/concepts/new-job.md');
    expect(steps).toContain('docs/CONTENT_UPDATE.md');
  });
});
