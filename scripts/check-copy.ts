// Stub (WP-01). WP-06 replaces this file: em dash and phone pattern scan; --dist also scans dist/, RELEASE=1 blocks drafts (ARCHITECTURE §12.5).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function checkCopy(_options: { dist?: boolean } = {}): Promise<void> {
  console.log('not implemented yet (WP-06)');
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await checkCopy({ dist: process.argv.includes('--dist') });
}
