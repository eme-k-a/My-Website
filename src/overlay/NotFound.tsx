// The 404 page (ARCHITECTURE §5.9, EXPERIENCE §8.4, CONTENT_DRAFT §6.5): gallery colors, zero JS,
// rendered once by the prerender into dist/404.html. It links the gallery stylesheet, so its
// classes are the global `.nf-*` rules in src/app/global.css (a CSS module here would never reach
// the client bundle).
import { TEST_IDS } from '../app/testIds';
import { content } from '../content/index';

export const NOT_FOUND_TITLE = `Page not found | ${content.gallery.title}`;

export function NotFound() {
  return (
    <main className="nf" data-testid={TEST_IDS.notFound}>
      <div>
        <p className="nf-eyebrow">{content.gallery.title}</p>
        <h1 className="nf-title">This room is closed.</h1>
        <p className="nf-body">The page you asked for isn't part of the collection.</p>
        <ul className="nf-links">
          <li>
            <a className="nf-link" href="/" data-primary="">
              Back to the gallery
            </a>
          </li>
          <li>
            <a className="nf-link" href="/resume/">
              Classic resume
            </a>
          </li>
        </ul>
      </div>
    </main>
  );
}
