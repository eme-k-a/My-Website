// Stub (WP-01). WP-34 replaces this file: review capture run into review/runs/<date>/.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function capture(): Promise<void> {
  console.log('not implemented yet (WP-34)');
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await capture();
}
