// Open Graph card data (ARCHITECTURE §11.2; R9, WP-31). A pure function of the content and the
// build date: one card per exhibit plus `home` and `resume`, carrying only strings the site
// already shows (stopCards, heroLines, displayName). scripts/gen-og.ts renders each card with
// src/seo/OgCard.tsx into public/og/<id>.png and records a hash of its strings in
// public/og/manifest.json (scripts/gen-og.ts `ogCardHash`); scripts/gen-og.test.ts fails with
// "run npm run og" when they drift.
// Durations and the "ON VIEW NOW" pill change with the calendar, so cards leave them out.
import { EXHIBIT_IDS, type ExhibitId } from '../content/ids';
import {
  displayName,
  heroLines,
  printSiteHost,
  stopCards,
  type ExhibitCard,
} from '../content/selectors';
import type { Content } from '../content/types';

export type OgCardId = ExhibitId | 'home' | 'resume';

/** Bump when OgCard.tsx or the renderer changes how a card looks, so every card is redrawn. */
export const OG_TEMPLATE_VERSION = 1;

export interface OgCardData {
  id: OgCardId;
  /** Small uppercase line above the title: "No. 01", "A gallery of work by", "Resume". */
  label: string;
  /** Instrument Serif title. */
  title: string;
  /** Role and organization (exhibits) or the two hero lines (home and resume). */
  lines: string[];
  /** An exhibit's dates, drawn in brass; omitted while unknown. */
  dates?: string;
  /** Bottom left: the name on exhibit cards, the gallery title on home and resume. */
  footer: string;
  /** Bottom right: the site host. */
  host: string;
}

function hostOf(c: Content): string {
  return printSiteHost(c.meta.siteUrl) ?? c.meta.siteUrl.replace(/^https?:\/\//, '');
}

/** Every card, in the order home, the exhibits in EXHIBIT_IDS order, resume. */
export function ogCards(c: Content, now: Date): OgCardData[] {
  const host = hostOf(c);
  const name = displayName(c);
  const [roleLine, educationLine] = heroLines(c, now);
  const exhibits = new Map(
    stopCards(c, now)
      .filter((card): card is ExhibitCard => card.kind === 'exhibit')
      .map((card) => [card.id, card]),
  );
  const cards: OgCardData[] = [
    {
      id: 'home',
      label: c.gallery.lobby.eyebrow,
      title: name,
      lines: [roleLine, educationLine],
      footer: c.gallery.title,
      host,
    },
  ];
  for (const id of EXHIBIT_IDS) {
    const card = exhibits.get(id);
    if (!card) throw new Error(`stopCards has no card for '${id}'`);
    cards.push({
      id,
      label: card.numberLabel,
      title: card.title,
      lines: [card.role, card.organization].filter((line): line is string => line !== undefined),
      ...(card.dates !== undefined && { dates: card.dates }),
      footer: name,
      host,
    });
  }
  cards.push({
    id: 'resume',
    label: 'Resume',
    title: name,
    lines: [roleLine, educationLine],
    footer: c.gallery.title,
    host,
  });
  return cards;
}
