// Exhibit manifest (ARCHITECTURE §7.2, §7.3): eager and tiny; the object is its own lazy chunk.
import { defineExhibit } from '../_kit';

export default defineExhibit({
  id: 'certifications',
  title: 'The Medal Cabinet',
  load: () => import('./MedalCabinet'),
  budget: { triangles: 5000, drawCalls: 8, textureMB: 0 },
  motion: 'slow',
});
