// Exhibit manifest (ARCHITECTURE §7.2, §7.3): eager and tiny; the object is its own lazy chunk.
import { defineExhibit } from '../_kit';

export default defineExhibit({
  id: 'klarup',
  title: 'Someone Showed Up',
  load: () => import('./SessionDisc'),
  budget: { triangles: 4000, drawCalls: 20, textureMB: 0 },
  motion: 'slow',
});
