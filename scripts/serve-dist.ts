// Stub (WP-01). WP-06 replaces this file: serves dist/ with _headers on 4173 (ARCHITECTURE §12.2).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function serveDist(): Promise<void> {
  console.log('not implemented yet (WP-06)');
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await serveDist();
}
