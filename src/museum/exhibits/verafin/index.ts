// Exhibit manifest (ARCHITECTURE §7.2, §7.3): eager and tiny; the object is its own lazy chunk.
import { defineExhibit } from '../_kit';

export default defineExhibit({
  id: 'verafin',
  title: 'The Reporting Engine',
  load: () => import('./ReportingEngine'),
  budget: { triangles: 4000, drawCalls: 12, textureMB: 0 },
  motion: 'slow',
});
