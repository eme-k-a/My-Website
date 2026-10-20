// Exhibit manifest (ARCHITECTURE §7.2, §7.3): eager and tiny; the object is its own lazy chunk.
import { defineExhibit } from '../_kit';

export default defineExhibit({
  id: 'finance-tracker',
  title: 'The Balance',
  load: () => import('./Balance'),
  budget: { triangles: 8000, drawCalls: 6, textureMB: 0 },
  motion: 'slow',
});
