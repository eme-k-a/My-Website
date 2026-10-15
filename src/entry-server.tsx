// SSR entry (R9; first version written by WP-10 under a grant, extended by WP-14 and WP-31).
// `vite build --ssr src/entry-server.tsx --outDir dist-ssr` compiles it with the client's CSS module
// names, and scripts/prerender.ts imports the result to write the static pages (ARCHITECTURE §5.1,
// §11.1). The gallery markup is hydratable (renderToString); the classic resume and the 404 page
// are never hydrated and ship zero JS (renderToStaticMarkup).
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { App } from './app/App';
import { parsePath } from './app/routes';
import { ClassicResume } from './classic/ClassicResume';
import { content } from './content/index';
import { resumePageMeta } from './content/selectors';
import { BUILD_DATE } from './overlay/model';
import { NOT_FOUND_TITLE, NotFound } from './overlay/NotFound';

export type PageRoute = 'gallery' | 'classic' | 'notFound';

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

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

interface Head {
  title: string;
  description: string;
  robots?: string;
}

const HEAD: Record<PageRoute, Head> = {
  gallery: { title: content.meta.title, description: content.meta.description },
  // CONTENT_DRAFT §6.6, derived from content so it follows content updates.
  classic: resumePageMeta(content, BUILD_DATE),
  notFound: {
    title: NOT_FOUND_TITLE,
    description: "The page you asked for isn't part of the collection.",
    robots: 'noindex',
  },
};

/** Minimal head tags (title and description; noindex on the 404). WP-14 and WP-31 add the rest. */
export function headTags(route: PageRoute): string {
  const head = HEAD[route];
  const tags = [
    `<title>${escapeHtml(head.title)}</title>`,
    `<meta name="description" content="${escapeHtml(head.description)}" />`,
  ];
  if (head.robots) tags.push(`<meta name="robots" content="${head.robots}" />`);
  return tags.join('\n    ');
}
