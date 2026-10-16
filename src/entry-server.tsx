// SSR entry (R9; first version written by WP-10 under a grant, extended by WP-14 and WP-31).
// `vite build --ssr src/entry-server.tsx --outDir dist-ssr` compiles it with the client's CSS module
// names, and scripts/prerender.ts imports the result to write the static pages (ARCHITECTURE §5.1,
// §11.1). The gallery markup is hydratable (renderToString); the static story of an exhibit page,
// the classic resume and the 404 page are never hydrated (renderToStaticMarkup).
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { App } from './app/App';
import { parsePath } from './app/routes';
import { ClassicResume } from './classic/ClassicResume';
import { EXHIBIT_IDS, type ExhibitId } from './content/ids';
import { content } from './content/index';
import { BUILD_DATE } from './overlay/model';
import { NotFound } from './overlay/NotFound';
import { StoryArticle } from './overlay/StoryBody';
import { headTags as metaHeadTags, type MetaRoute } from './seo/meta';

export type { MetaRoute };

/** The gallery app, minus the canvas (MuseumGate renders nothing on the server), for `/`. */
export function renderApp(path: string): string {
  if (parsePath(path) === null) throw new Error(`renderApp: '${path}' is not an app route`);
  return renderToString(<App />);
}

/** The classic resume for /resume/: static markup, never hydrated. */
export function renderClassic(): string {
  return renderToStaticMarkup(<ClassicResume now={BUILD_DATE} />);
}

/** The 404 page body: static markup, never hydrated. */
export function renderNotFound(): string {
  return renderToStaticMarkup(<NotFound />);
}

/** The static story for /exhibit/<id>/ (`#story-static`): static markup, never hydrated. */
export function renderStory(id: ExhibitId): string {
  return renderToStaticMarkup(<StoryArticle id={id} />);
}

/** Head tags (src/seo/meta.ts) for `/`, `/exhibit/<id>/`, `/resume/` and the 404 page. */
export function headTags(route: MetaRoute): string {
  return metaHeadTags(content, route, BUILD_DATE);
}

export { EXHIBIT_IDS };
