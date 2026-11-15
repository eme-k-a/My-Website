import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { EXHIBIT_IDS } from '../src/content/ids';
import { content } from '../src/content/index';
import { buildDateFromEnv } from '../src/content/temporal';
import { ogCards } from '../src/seo/ogCards';
import {
  faviconSvg,
  MANIFEST,
  monogramLetters,
  OG_DIR,
  ogDocument,
  ogManifest,
  PUBLIC,
  type OgManifest,
} from './gen-og';

const STALE = 'public/og is stale: run npm run og and commit public/og and the icons';
const cards = ogCards(content, buildDateFromEnv());

describe('public/og (npm run og)', () => {
  it('has one card per exhibit plus home and resume', () => {
    expect(cards.map((card) => card.id).sort()).toEqual([...EXHIBIT_IDS, 'home', 'resume'].sort());
    const files = readdirSync(OG_DIR).sort();
    expect(files, STALE).toEqual(
      [...cards.map((card) => `${card.id}.png`), 'manifest.json'].sort(),
    );
  });

  it('matches the current content (manifest hashes)', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as OgManifest;
    expect(manifest, STALE).toEqual(ogManifest(cards));
  });

  it('holds 1200 x 630 PNGs', async () => {
    for (const card of cards) {
      const meta = await sharp(join(OG_DIR, `${card.id}.png`)).metadata();
      expect({ id: card.id, format: meta.format, width: meta.width, height: meta.height }).toEqual({
        id: card.id,
        format: 'png',
        width: 1200,
        height: 630,
      });
    }
  });

  it('renders documents that load nothing from the network and hold no phone or em dash', () => {
    for (const card of cards) {
      const html = ogDocument(card, '');
      expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
      expect(html).not.toMatch(/\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/);
      expect(html.includes('\u2014')).toBe(false);
      expect(html).toContain(card.title.replace(/&/g, '&amp;'));
    }
  });
});

describe('icons', () => {
  it('keeps favicon.svg in step with the generator: outlines on ink, no text, no font', () => {
    const svg = readFileSync(join(PUBLIC, 'favicon.svg'), 'utf8');
    expect(svg, STALE).toBe(faviconSvg(monogramLetters(content)));
    expect(svg).not.toMatch(/<text|font-family|@font-face|href=/);
    expect(svg).toContain('fill="#0B0B0D"');
    expect(svg).toContain('fill="#C9A36A"');
  });

  it('rasterizes favicon-32.png at 32 px and apple-touch-icon.png at 180 px, opaque', async () => {
    const small = await sharp(join(PUBLIC, 'favicon-32.png')).metadata();
    expect([small.format, small.width, small.height]).toEqual(['png', 32, 32]);
    const touch = await sharp(join(PUBLIC, 'apple-touch-icon.png')).metadata();
    expect([touch.format, touch.width, touch.height, touch.hasAlpha]).toEqual([
      'png',
      180,
      180,
      false,
    ]);
  });

  it('ships no web manifest', () => {
    for (const name of ['manifest.webmanifest', 'site.webmanifest', 'manifest.json']) {
      expect(existsSync(join(PUBLIC, name))).toBe(false);
    }
  });
});
