import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EXHIBIT_IDS, type ExhibitId } from '../content/ids';
import { content } from '../content/index';
import { entryById } from '../content/selectors';
import { exhibitLabel, StoryArticle, StoryBody } from './StoryBody';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const article = (id: ExhibitId) => renderToStaticMarkup(createElement(StoryArticle, { id }));
const body = (id: ExhibitId) =>
  renderToStaticMarkup(createElement(StoryBody, { id, headingId: 'story-title' }));
const text = (html: string) => html.replace(/<[^>]+>/g, '');

describe('StoryArticle (#story-static)', () => {
  it('lists every Mysa bullet verbatim under an h1 title', () => {
    const html = article('mysa');
    const entry = entryById(content, 'mysa');
    expect(html).toContain('id="story-static"');
    expect(html).toContain('data-testid="story-static"');
    expect(html).toMatch(/<h1[^>]*>Warm Start<\/h1>/);
    if (entry.kind !== 'work') throw new Error('mysa is a work entry');
    for (const bullet of entry.bullets) expect(html).toContain(escape(bullet.text));
  });

  it('keeps the EXPERIENCE §5.9 order of sections', () => {
    const plain = text(article('mysa'));
    const order = ['Medium', 'The work', "Curator's note", 'The object', 'Newer', 'Older'];
    const positions = order.map((label) => plain.indexOf(label.replace("'", '&#x27;')));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('links Newer and Older to the sibling exhibit pages with a trailing slash', () => {
    const html = article('klarup');
    expect(html).toContain('href="/exhibit/verafin/"');
    expect(html).toContain('href="/exhibit/finance-tracker/"');
    expect(article('verafin')).not.toContain('>Newer<');
  });

  it('renders every exhibit with its object description and all its tags', () => {
    for (const id of EXHIBIT_IDS) {
      const { exhibit } = entryById(content, id);
      const html = article(id);
      expect(html).toContain(escape(exhibit.object.text));
      for (const tag of exhibit.tags) expect(html).toContain(escape(tag));
      expect(html.includes('\u2014')).toBe(false);
    }
  });
});

describe('StoryBody (dialog)', () => {
  it('uses an h2 title, h3 sections and the dialog-duration test id', () => {
    const html = body('mysa');
    expect(html).toMatch(/<h2[^>]*id="story-title"[^>]*>Warm Start<\/h2>/);
    expect(html).toMatch(/<h3[^>]*>The work<\/h3>/);
    expect(html).toContain('data-testid="dialog-duration"');
  });

  it('names neighbours by artwork title and organization', () => {
    expect(exhibitLabel('mysa')).toBe('Warm Start, Mysa');
  });
});
