// Stub (WP-01). WP-04 replaces this file: writes resume/resume.tex (ARCHITECTURE §4.4).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function buildResumeTex(): Promise<void> {
  console.log('not implemented yet (WP-04)');
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await buildResumeTex();
}
