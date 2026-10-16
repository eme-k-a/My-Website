// Exhibit manifest (ARCHITECTURE §7.2, §7.3): eager and tiny; the object is its own lazy chunk.
import { defineExhibit } from '../_kit';

export default defineExhibit({
  id: 'safe-sip',
  title: 'Tamper Evident',
  load: () => import('./TamperEvident'),
  budget: { triangles: 9000, drawCalls: 14, textureMB: 0 },
  motion: 'slow',
});
