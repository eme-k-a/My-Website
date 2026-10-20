// Exhibit manifest (ARCHITECTURE §7.2, §7.3): eager and tiny; the object is its own lazy chunk.
import { defineExhibit } from '../_kit';

export default defineExhibit({
  id: 'sdsj',
  title: 'The Round Table',
  load: () => import('./RoundTable'),
  budget: { triangles: 1500, drawCalls: 12, textureMB: 0 },
  motion: 'slow',
});
