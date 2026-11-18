import { defineExhibit } from '../_kit';

export default defineExhibit({
  id: 'nsbe-mun',
  title: 'The Chapter Noticeboard',
  load: () => import('./ChapterNoticeboard'),
  budget: { triangles: 192, drawCalls: 5, textureMB: 0 },
  motion: 'none',
});
