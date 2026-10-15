// Stub (WP-01). WP-31 replaces this file: regenerates public/og/*.png (ARCHITECTURE §11.2).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function genOg(): Promise<void> {
  console.log('not implemented yet (WP-31)');
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await genOg();
}
