// Exhibit manifest (ARCHITECTURE §7.2, §7.3), scaffolded by `npm run new:exhibit -- __ID__`.
// Eager and tiny; the object is its own lazy chunk. The budget is the placeholder crate's
// (EXPERIENCE §5.7): the builder raises it to the measured object, at most 20,000 triangles.
import { defineExhibit } from '../_kit';

export default defineExhibit({
  id: '__ID__',
  title: '__TITLE_TS__',
  load: () => import('./__COMPONENT__'),
  budget: { triangles: 300, drawCalls: 2, textureMB: 0 },
  motion: 'none',
});
