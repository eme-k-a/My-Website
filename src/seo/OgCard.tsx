// The Open Graph card (ARCHITECTURE §11.2, EXPERIENCE §7; R9, WP-31): 1200 x 630, gallery
// colors, an Instrument Serif title under a warm light pool, the role, organization and dates in
// IBM Plex Sans, and a brass hairline frame. Rendered to static markup by scripts/gen-og.ts and
// screenshotted in Chromium; it never ships to the client. No logos, no network fonts: gen-og
// embeds the @fontsource files as data URIs.
import type { OgCardData } from './ogCards';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Gallery colors (EXPERIENCE §7.2, src/design/tokens.css). */
const INK = '#0B0B0D';
const TEXT = '#F2EDE4';
const TEXT_2 = '#A8A29A';
const BRASS = '#C9A36A';
const LIGHT_0 = '255, 244, 232';

/** The card's stylesheet; gen-og prepends the @font-face rules. */
export const OG_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${OG_WIDTH}px; height: ${OG_HEIGHT}px; background: ${INK}; overflow: hidden; }
.card {
  position: relative; width: ${OG_WIDTH}px; height: ${OG_HEIGHT}px; overflow: hidden;
  padding: 76px 96px 68px; display: flex; flex-direction: column;
  background:
    radial-gradient(ellipse 620px 420px at 30% -8%, rgba(${LIGHT_0}, 0.16), rgba(${LIGHT_0}, 0) 70%),
    radial-gradient(ellipse 900px 300px at 50% 118%, rgba(${LIGHT_0}, 0.05), rgba(${LIGHT_0}, 0) 70%),
    ${INK};
  color: ${TEXT}; font-family: 'Plex', sans-serif; -webkit-font-smoothing: antialiased;
}
.frame { position: absolute; inset: 28px; border: 1px solid rgba(201, 163, 106, 0.45); pointer-events: none; }
.label {
  font: 500 22px/1 'Plex', sans-serif; letter-spacing: 0.18em; text-transform: uppercase;
  color: ${BRASS};
}
.rule { width: 72px; height: 2px; background: ${BRASS}; margin: 26px 0 30px; }
.title {
  font: 400 92px/1.02 'Serif', serif; letter-spacing: -0.01em; color: ${TEXT};
  max-width: 1000px; max-height: 190px; overflow: hidden;
}
.lines { margin-top: 30px; display: flex; flex-direction: column; gap: 10px; max-width: 1000px; }
.line { font: 400 30px/1.25 'Plex', sans-serif; color: ${TEXT_2}; }
.line:first-child { color: ${TEXT}; }
.line.dates { color: ${BRASS}; }
.foot {
  margin-top: auto; display: flex; justify-content: space-between; align-items: baseline;
  font: 400 22px/1 'Plex', sans-serif; color: ${TEXT_2}; letter-spacing: 0.02em;
}
.foot .name { color: ${TEXT}; }
`;

/** One card. */
export function OgCard({ card }: { card: OgCardData }) {
  return (
    <div className="card" data-og={card.id}>
      <div className="frame" />
      <p className="label">{card.label}</p>
      <div className="rule" />
      <h1 className="title">{card.title}</h1>
      <div className="lines">
        {card.lines.map((line, i) => (
          <p key={i} className="line">
            {line}
          </p>
        ))}
        {card.dates !== undefined && <p className="line dates">{card.dates}</p>}
      </div>
      <div className="foot">
        <span className="name">{card.footer}</span>
        <span>{card.host}</span>
      </div>
    </div>
  );
}
