// The gallery app (ARCHITECTURE §7.1), prerendered into #app and hydrated in museum mode. DOM order
// is tab order (EXPERIENCE §10.2): the header (skip link, wordmark, Resume PDF, Classic view), the
// track (the hero in the lobby section, then every stop card), the progress rail, then the closed
// dialog, the live region, the context-loss veil and the lazy museum. The prerender renders the
// same tree; MuseumGate renders nothing until the client decides to load the museum.
import { ContextVeil } from '../overlay/ContextVeil';
import { ExhibitDialog } from '../overlay/ExhibitDialog';
import { Hud } from '../overlay/Hud';
import { LiveRegion } from '../overlay/LiveRegion';
import { MuseumGate } from '../overlay/MuseumGate';
import { ProgressRail } from '../overlay/ProgressRail';
import { ScrollTrack } from '../overlay/ScrollTrack';
import { renderStopCard } from '../overlay/StopCard';

export function App() {
  return (
    <>
      <Hud />
      <ScrollTrack renderCard={renderStopCard} />
      <ProgressRail />
      <ExhibitDialog />
      <LiveRegion />
      <ContextVeil />
      <MuseumGate />
    </>
  );
}
