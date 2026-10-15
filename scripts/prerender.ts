// Stub (WP-01). WP-10 replaces this file: renders pages from dist-ssr/entry-server.js (ARCHITECTURE §5.1, §11).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function prerenderPages(): Promise<void> {
  console.log('not implemented yet (WP-10)');
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await prerenderPages();
}
