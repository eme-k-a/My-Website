// Exhibit manifest (ARCHITECTURE §7.2, §7.3): eager and tiny; the object is its own lazy chunk.
import { defineExhibit } from '../_kit';

export default defineExhibit({
  id: 'mun',
  title: 'Work in Progress',
  load: () => import('./WorkInProgress'),
  budget: { triangles: 4000, drawCalls: 10, textureMB: 0 },
  motion: 'slow',
});
