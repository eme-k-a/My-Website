// Stub (WP-01). WP-35 replaces this file: scaffolds src/museum/exhibits/<id>/ from scripts/templates/exhibit/.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function newExhibit(_id?: string): Promise<void> {
  console.log('not implemented yet (WP-35)');
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await newExhibit(process.argv[2]);
}
