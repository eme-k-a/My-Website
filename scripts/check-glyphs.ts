// Stub (WP-01). WP-07 replaces this file: every 3D label glyph exists in the troika .woff (ARCHITECTURE §8.3).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function checkGlyphs(): Promise<void> {
  console.log('not implemented yet (WP-07)');
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await checkGlyphs();
}
