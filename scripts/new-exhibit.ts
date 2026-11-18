// `npm run new:exhibit -- <id>` (WP-35, ARCHITECTURE §15.3 step 5): scaffolds
// src/museum/exhibits/<id>/ from scripts/templates/exhibit/ on day one of a new entry.
//
// The id must be kebab-case, already appended to EXHIBIT_IDS (src/content/ids.ts), and have no
// folder yet. The scaffold is a manifest with the placeholder crate's budget (300 triangles), a
// component that renders the kit's Placeholder (so the stop keeps showing the crate), and a
// README with the slot bounds, the budget, the <MergeStatic> draw-call rule and the concept link.
// It passes lint, prettier, the typecheck and the registry test as written; an R5 builder then fills it.
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as prettier from 'prettier';
import { EXHIBIT_IDS } from '../src/content/ids';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TEMPLATE_DIR = join(ROOT, 'scripts', 'templates', 'exhibit');
export const EXHIBITS_DIR = join('src', 'museum', 'exhibits');

/** Lowercase words of letters and digits joined by single hyphens, starting with a letter. */
export const KEBAB_ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export interface NewExhibitOptions {
  /** Repository root the folder is written under (default: this repo). */
  root?: string;
  /** Allowed ids (default: EXHIBIT_IDS). */
  ids?: readonly string[];
  /** The concept title for the manifest and README (default: the content entry's exhibit title). */
  title?: string;
}

export interface NewExhibitResult {
  dir: string;
  component: string;
  files: string[];
}

/** `new-job` -> `NewJob`. */
export function componentName(id: string): string {
  return id
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** Throws a readable error for an id the scaffold must refuse. */
export function validateId(
  id: string | undefined,
  ids: readonly string[],
  root: string,
): asserts id is string {
  if (!id) throw new Error('Usage: npm run new:exhibit -- <id>');
  if (!KEBAB_ID.test(id)) {
    throw new Error(`'${id}' is not a kebab-case id (lowercase letters, digits, single hyphens).`);
  }
  if (!ids.includes(id)) {
    throw new Error(
      `'${id}' is not in EXHIBIT_IDS. Append it to src/content/ids.ts first (never rename an id).`,
    );
  }
  const dir = join(root, EXHIBITS_DIR, id);
  if (existsSync(dir)) {
    throw new Error(
      `${relative(root, dir)} already exists; the scaffold never overwrites a folder.`,
    );
  }
}

/** The entry's exhibit title from the content, or undefined before the entry exists. */
async function contentTitle(id: string): Promise<string | undefined> {
  const { content } = await import('../src/content/index');
  const entries = [
    ...content.experiences,
    ...content.projects,
    ...content.volunteer,
    ...content.education,
    content.certifications,
  ];
  return entries.find((entry) => entry.id === id)?.exhibit.title;
}

/** Fills the template tokens. */
export function render(template: string, id: string, title: string): string {
  const titleTs = title.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  return template
    .replaceAll('__ID__', id)
    .replaceAll('__TITLE_TS__', titleTs)
    .replaceAll('__TITLE__', title)
    .replaceAll('__COMPONENT__', componentName(id));
}

export async function newExhibit(
  id: string | undefined,
  options: NewExhibitOptions = {},
): Promise<NewExhibitResult> {
  const root = options.root ?? ROOT;
  validateId(id, options.ids ?? EXHIBIT_IDS, root);
  const title = options.title ?? (await contentTitle(id)) ?? id;
  const component = componentName(id);
  const dir = join(root, EXHIBITS_DIR, id);
  const targets: [template: string, file: string][] = [
    ['index.ts.tpl', 'index.ts'],
    ['Exhibit.tsx.tpl', `${component}.tsx`],
    ['README.md.tpl', 'README.md'],
  ];
  await mkdir(dir, { recursive: true });
  const files: string[] = [];
  for (const [template, file] of targets) {
    const text = await readFile(join(TEMPLATE_DIR, template), 'utf8');
    const target = join(dir, file);
    // Formatted with the repo's prettier config, so `prettier --check .` passes whatever the title.
    const config = (await prettier.resolveConfig(join(ROOT, EXHIBITS_DIR, id, file))) ?? {};
    await writeFile(
      target,
      await prettier.format(render(text, id, title), { ...config, filepath: target }),
    );
    files.push(target);
  }
  return { dir, component, files };
}

export function nextSteps(id: string): string[] {
  return [
    `npx vitest run --project unit src/museum/exhibits/_kit/registry.test.ts  (the manifest registers)`,
    `npm run verify  (lint, typecheck, unit tests)`,
    `Commit the folder: feat(exhibits): scaffold ${id} with the placeholder crate`,
    `Ask R0 for a builder brief (docs/wp/), with R2's concept checklist in review/concepts/${id}.md`,
    `Continue docs/CONTENT_UPDATE.md at step 6 (npm run build and the PDF gate)`,
  ];
}

async function main(): Promise<void> {
  const id = process.argv[2];
  try {
    const result = await newExhibit(id);
    console.log(`Scaffolded ${relative(ROOT, result.dir)}/ (placeholder crate, 300 triangles):`);
    for (const file of result.files) console.log(`  ${relative(ROOT, file)}`);
    console.log('Next steps:');
    nextSteps(id as string).forEach((step, i) => {
      console.log(`  ${i + 1}. ${step}`);
    });
  } catch (error) {
    console.error(`new:exhibit: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await main();
}
