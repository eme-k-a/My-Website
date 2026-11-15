// The scroll track (ARCHITECTURE §6.1, EXPERIENCE §3.3): one snapping section per stop. The
// prerender lists every section (the no-JS page lists everything): the main stops in order, each
// wing's exhibits right after its door. In museum mode only the active track's sections take part
// in layout; CSS keyed on html[data-mode] and #track[data-track] hides the rest, so nothing shifts
// at hydration. Walking is the browser's own scroll: this component installs the measurement and
// the passive scroll listener, the popstate handler and the Enter/Esc and stepping keys, and
// applies track swaps in a layout effect before paint. The `renderCard` prop is the contract.
// Its first child is the fade-cut layer (EXPERIENCE §6.6, ARCHITECTURE §6.5): a fixed ink layer
// over the canvas, under the cards, driven by the rail's fade.ts (reduced-motion cuts and HUD
// jumps of more than 3 stops).
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useMuseum } from '../app/store';
import { TEST_IDS } from '../app/testIds';
import { doorId, type StopId, type WingId } from '../content/ids';
import { content } from '../content/index';
import { mainTrack } from '../content/selectors';
import { onFade } from '../museum/rail/fade';
import { installKeys } from '../museum/rail/keys';
import { applyTrackSwap, installNavigation } from '../museum/rail/navigation';
import { installScrollMap } from '../museum/rail/scrollRuntime';
import styles from './ScrollTrack.module.css';

export interface ScrollTrackProps {
  renderCard: (id: StopId) => ReactNode;
}

interface SectionSpec {
  id: StopId;
  /** The wing whose door this is. */
  door?: WingId;
  /** The wing this exhibit belongs to; `last` marks its final item. */
  wing?: WingId;
  last?: boolean;
}

/** Every section in prerendered order: the main stops, each wing's items right after its door. */
const SECTIONS: readonly SectionSpec[] = mainTrack(content).flatMap((id): SectionSpec[] => {
  const wing = content.wings.find((w) => doorId(w.id) === id);
  if (!wing) return [{ id }];
  return [
    { id, door: wing.id },
    ...wing.items.map((item, i): SectionSpec => ({
      id: item as StopId,
      wing: wing.id,
      last: i === wing.items.length - 1,
    })),
  ];
});

export function ScrollTrack({ renderCard }: ScrollTrackProps) {
  const track = useMuseum((s) => s.track);
  const fade = useRef<HTMLDivElement>(null);

  // Before paint after every track change: measure the new sections and place the scroll.
  useLayoutEffect(() => {
    applyTrackSwap();
  }, [track]);

  useEffect(() => {
    const uninstall = [
      installScrollMap(),
      installNavigation(),
      installKeys(),
      onFade((phase) => {
        if (fade.current) fade.current.dataset.fade = phase;
      }),
    ];
    return () => uninstall.forEach((off) => off());
  }, []);

  return (
    <main id="track" data-track={track}>
      <div ref={fade} className={styles.fade} aria-hidden="true" />
      {SECTIONS.map(({ id, door, wing, last }) => (
        <section
          key={id}
          className={styles.section}
          data-stop={id}
          data-door={door}
          data-wing={wing}
          data-wing-last={last ? '' : undefined}
          id={`stop-${id}`}
          data-testid={TEST_IDS.stop(id)}
        >
          {renderCard(id)}
        </section>
      ))}
    </main>
  );
}
