// Stub (WP-01). WP-36 replaces this file: link check for the scheduled maintenance job.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function checkLinks(): Promise<void> {
  console.log('not implemented yet (WP-36)');
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await checkLinks();
}
