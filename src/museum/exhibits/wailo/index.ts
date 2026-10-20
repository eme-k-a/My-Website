// Exhibit manifest (ARCHITECTURE §7.2, §7.3): eager and tiny; the object is its own lazy chunk.
import { defineExhibit } from '../_kit';

export default defineExhibit({
  id: 'wailo',
  title: 'The Deep Link',
  load: () => import('./DeepLink'),
  budget: { triangles: 5000, drawCalls: 16, textureMB: 0 },
  motion: 'slow',
});
