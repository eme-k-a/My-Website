// Exhibit manifest (ARCHITECTURE §7.2, §7.3): eager and tiny; the object is its own lazy chunk.
import { defineExhibit } from '../_kit';

export default defineExhibit({
  id: 'cfia',
  title: 'The Ticket Spindle',
  load: () => import('./TicketSpindle'),
  budget: { triangles: 2000, drawCalls: 8, textureMB: 0 },
  motion: 'slow',
});
