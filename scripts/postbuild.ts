// Postbuild orchestrator (R9). Steps are added by their WPs; prerender first so the
// boot-script hash is taken from final HTML.
import { writeHeaders } from './headers.ts';
import { prerenderPages } from './prerender.ts';

await prerenderPages();
await writeHeaders();
