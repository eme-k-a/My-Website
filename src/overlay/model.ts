// View models shared by the overlay (R6). Everything here is a pure function of the content and the
// build date, so the prerender and the hydrated app compute the same values and nothing shifts at
// hydration. `layout.ts` is pure math (no three.js), so importing it keeps the entry chunk small.
import { CLASSIC_PATH, PDF_PATH } from '../app/routes';
import { doorId, type StopId, type TrackId } from '../content/ids';
import { content } from '../content/index';
import { mainTrack, stopCards, wingTrack, type StopCard } from '../content/selectors';
import { tokens } from '../design/tokens';
import { computeLayout } from '../museum/rail/layout';

/** The build date (vite.config.ts `define`), as UTC midnight. */
export const BUILD_DATE = new Date(`${__BUILD_DATE__}T00:00:00Z`);

export const LAYOUT = computeLayout(content, BUILD_DATE);

/** Every stop card in prerendered section order, by stop id. */
export const CARDS: ReadonlyMap<StopId, StopCard> = new Map(
  stopCards(content, BUILD_DATE).map((card) => [card.id, card]),
);

export function cardOf(id: StopId): StopCard {
  const card = CARDS.get(id);
  if (!card) throw new Error(`No card for stop '${id}'`);
  return card;
}

export const MAIN_STOPS: readonly StopId[] = mainTrack(content);

/** The first exhibit after the lobby: the target of "Begin the walk" (EXPERIENCE §3.3). */
export const FIRST_EXHIBIT: StopId = MAIN_STOPS[1] ?? 'desk';

export const EMAIL_HREF = `mailto:${content.contact.email}`;
export { CLASSIC_PATH, PDF_PATH };

const hexToRgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Linear sRGB mix of two hex colors, `t` in [0, 1]. */
export function mixHex(a: string, b: string, t: number): string {
  const k = Math.min(1, Math.max(0, t));
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  const mixed = ca.map((v, i) => Math.round(v + (cb[i]! - v) * k));
  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** Placard paper by the stop's age (EXPERIENCE §5.8, §6.9): `--paper` newest to `--paper-old`. */
export function paperOf(id: StopId): string {
  return mixHex(tokens.color.paper, tokens.color.paperOld, LAYOUT.ageT[id] ?? 0);
}

/** Rail label of a stop (EXPERIENCE §6.10): the artwork title for exhibits. */
export function railLabel(id: StopId): string {
  const card = cardOf(id);
  switch (card.kind) {
    case 'lobby':
      return 'Lobby';
    case 'desk':
      return 'Front desk';
    case 'door':
      return card.title;
    case 'exhibit':
      return `${card.numberLabel}, ${card.title}`;
  }
}

/** The stops a track's rail shows: the main stops, or a wing's own exhibits (its door excluded). */
export function railStops(track: 'main' | 'projects' | 'volunteer'): StopId[] {
  if (track === 'main') return [...MAIN_STOPS];
  return wingTrack(content, track).filter((id) => id !== doorId(track));
}

/**
 * Rail progress of each year strip (EXPERIENCE §6.9, §6.10): where the strip's z falls between the
 * main-track stop cameras, so the HUD ticks and the floor strips agree. Newest first.
 */
export const YEAR_TICKS: readonly { year: number; progress: number }[] = (() => {
  const zs = LAYOUT.tracks.main.stops.map((s) => s.camera[2]);
  const last = zs.length - 1;
  return LAYOUT.yearMarks.map(({ year, z }) => {
    let progress = z >= zs[0]! ? 0 : last;
    for (let i = 0; i < last; i++) {
      const a = zs[i]!;
      const b = zs[i + 1]!;
      if (z <= a && z >= b) {
        progress = a === b ? i : i + (a - z) / (a - b);
        break;
      }
    }
    return { year, progress };
  });
})();

/** The year shown at rail progress `p`: the last strip passed, or the newest year before it. */
export function yearAt(p: number): number {
  let year = YEAR_TICKS[0]?.year ?? BUILD_DATE.getUTCFullYear();
  for (const tick of YEAR_TICKS) if (tick.progress <= p) year = tick.year;
  return year;
}

/** The phone year chip at the front desk (F-034): the rail's own end label, never a year. */
export const DESK_CHIP = 'Front desk';

/**
 * The phone year chip (EXPERIENCE §6.10) at `current` on `track` (F-034). On the main track it is
 * `yearAt`, except at the front desk (the nearest stop), which is not a date. Inside a wing it
 * holds the main aisle's year at the wing's door, so the door and its exhibits agree.
 */
export function chipLabel(current: number, track: TrackId): string {
  if (track !== 'main') {
    const door = MAIN_STOPS.indexOf(doorId(track));
    return String(yearAt(door < 0 ? current : door));
  }
  if (MAIN_STOPS[Math.round(current)] === 'desk') return DESK_CHIP;
  return String(yearAt(current));
}
