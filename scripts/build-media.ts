// Stub (WP-01). WP-03 replaces this file: headshot crops and textures into public/images/.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function buildMedia(): Promise<void> {
  console.log('not implemented yet (WP-03)');
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await buildMedia();
}
