// Stub (WP-01). WP-04 replaces this file: public PDF to dist/resume.pdf, private PDF with --private, previews with --preview (ARCHITECTURE §4).
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function buildResumePdf(
  _options: { private?: boolean; preview?: boolean } = {},
): Promise<void> {
  console.log('not implemented yet (WP-04)');
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  await buildResumePdf({
    private: process.argv.includes('--private'),
    preview: process.argv.includes('--preview'),
  });
}
