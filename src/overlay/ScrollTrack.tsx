// Seam (WP-02): WP-09 (R4) adds the active track, wing sections and the snapping CSS
// (ARCHITECTURE §6.1). The `renderCard` prop and the section markup are the contract.
import type { ReactNode } from 'react';
import { TEST_IDS } from '../app/testIds';
import type { StopId } from '../content/ids';
import { content } from '../content/index';
import { mainTrack } from '../content/selectors';

export interface ScrollTrackProps {
  renderCard: (id: StopId) => ReactNode;
}

export function ScrollTrack({ renderCard }: ScrollTrackProps) {
  return (
    <main id="track" data-track="main">
      {mainTrack(content).map((id) => (
        <section key={id} data-stop={id} id={`stop-${id}`} data-testid={TEST_IDS.stop(id)}>
          {renderCard(id)}
        </section>
      ))}
    </main>
  );
}
