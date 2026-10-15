// Stub (WP-01). WP-06 replaces this file: writes dist/_headers with the CSP (ARCHITECTURE §12.1).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function writeHeaders(): Promise<void> {
  console.log('not implemented yet (WP-06)');
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await writeHeaders();
}
