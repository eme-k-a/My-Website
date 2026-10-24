// The desktop progress rail (EXPERIENCE §6.10): a vertical brass hairline on the right edge, "Now"
// at the top and "Front desk" at the bottom, one dot button per main stop (aria-current="step" on
// the current one), a side stub at each door, year ticks at the floor strips' progress values, and
// a bead at the camera's damped progress. Activating a dot travels there. Inside a wing the rail
// shows that wing's exhibits and "Return to the aisle", except at the door itself (F-038). It is
// the last landmark in tab order (EXPERIENCE §10.2); phones get the bar and year chip in the HUD
// header instead.
import { useEffect, useRef, type CSSProperties } from 'react';
import { useMuseum } from '../app/store';
import { TEST_IDS } from '../app/testIds';
import { content } from '../content/index';
import type { StopId } from '../content/ids';
import { exitWing, travelTo } from '../museum/rail/navigation';
import { Icon } from './icons';
import { cardOf, railLabel, railStops, wingHeadShown, YEAR_TICKS } from './model';
import { watchRailProgress } from './railProgress';
import styles from './ProgressRail.module.css';
import ui from './ui.module.css';

const at = (index: number, count: number): CSSProperties =>
  ({ '--at': count > 1 ? index / (count - 1) : 0 }) as CSSProperties;

function doorSide(id: StopId): 'left' | 'right' | undefined {
  const card = cardOf(id);
  if (card.kind !== 'door') return undefined;
  return content.wings.find((w) => w.id === card.wing)?.side;
}

/**
 * A year tick's place on the line, plus how far it is from the nearest stop dot (F-046): a tick
 * that falls within reach of a dot is nudged off it in CSS (`.tick`), where the line's height in
 * px is known. The nudge goes away from the dot, toward the tick's own side.
 */
function tickAt(progress: number, last: number): CSSProperties {
  const d = (progress - Math.round(progress)) / last;
  return {
    ...at(progress, last + 1),
    '--gap': Math.abs(d),
    '--dir': d < 0 ? -1 : 1,
  } as CSSProperties;
}

/** Travel errors (a wing move before WP-09 lands, for example) must never surface as page errors. */
const ignore = () => {};

export function ProgressRail() {
  const track = useMuseum((s) => s.track);
  const stop = useMuseum((s) => s.stop);
  const stops = railStops(track);
  const bead = useRef<HTMLSpanElement>(null);
  const last = Math.max(1, stops.length - 1);

  useEffect(
    () =>
      watchRailProgress((current) => {
        // `progress.current` is a main-track index; inside a wing the bead follows the wing rail
        // (index 0 is the door, so the wing's first exhibit is 1).
        const index = track === 'main' ? current : current - 1;
        const p = Math.min(1, Math.max(0, index / last));
        bead.current?.style.setProperty('--p', String(p));
      }),
    [track, last],
  );

  const go = (id: StopId) => {
    useMuseum.setState({ inputSource: 'hud' });
    travelTo(id).catch(ignore);
  };

  const wing = track === 'main' ? undefined : content.wings.find((w) => w.id === track);
  // Scrolling back up from a wing's first exhibit lands on the door section, still on the wing
  // track (EXPERIENCE §3.4 step 2), with the camera at the door pose. There the wing head (chip
  // and "Return to the aisle") sat on the door's transom title (F-038), so it steps aside: the
  // visitor is at the door, Esc still returns to the aisle and the door card offers Step inside.
  // The control unmounts rather than hiding, so it can never hold focus.
  const atDoor = wing !== undefined && !wingHeadShown(track, stop);

  return (
    <nav
      className={styles.rail}
      aria-label="Exhibits"
      data-testid={TEST_IDS.hudProgress}
      data-track={track}
      data-at-door={atDoor || undefined}
    >
      {wing ? (
        !atDoor && (
          <div className={styles.wingHead}>
            <p className={styles.wingTitle}>
              {wing.title} wing, {Math.max(1, stops.indexOf(stop) + 1)} of {stops.length}
            </p>
            <button
              type="button"
              className={ui.secondary}
              data-testid={TEST_IDS.exitWing}
              onClick={() => {
                useMuseum.setState({ inputSource: 'hud' });
                exitWing().catch(ignore);
              }}
            >
              <Icon name="undo-2" />
              Return to the aisle
              <kbd className={ui.kbd} aria-hidden="true">
                Esc
              </kbd>
            </button>
          </div>
        )
      ) : (
        <span className={styles.end} aria-hidden="true">
          Now
        </span>
      )}
      <div className={styles.line}>
        <span className={styles.bead} ref={bead} aria-hidden="true" />
        {track === 'main' &&
          YEAR_TICKS.map(({ year, progress }) => (
            <span
              key={year}
              className={styles.tick}
              style={tickAt(progress, last)}
              aria-hidden="true"
            >
              {year}
            </span>
          ))}
        <ol className={styles.dots}>
          {stops.map((id, i) => {
            const side = doorSide(id);
            const label = railLabel(id);
            return (
              <li key={id} className={styles.stop} style={at(i, stops.length)}>
                <button
                  type="button"
                  className={styles.dot}
                  data-testid={TEST_IDS.hudStop(id)}
                  data-door={side}
                  aria-current={id === stop ? 'step' : undefined}
                  onClick={() => go(id)}
                >
                  <span className={styles.label}>{label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
      {!wing && (
        <span className={styles.end} aria-hidden="true">
          Front desk
        </span>
      )}
    </nav>
  );
}
