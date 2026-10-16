// The scene (ARCHITECTURE §7.1), built entirely from computeLayout(content, build date): the hall
// with its wall wash, the floors with their baked pools (reflector on high), the fixtures, the
// brass trim, the 3D labels, the lobby portrait, the front desk, the lighting (hemisphere, the
// tier's spotlights, the Lightformer environment, beam cones) and one ExhibitFrame per slot.
import { tokens } from '../design/tokens';
import { Desk } from './environment/Desk';
import { Fixtures } from './environment/Fixtures';
import { Floor } from './environment/Floor';
import { galleryLayout } from './environment/gallery';
import { Hall } from './environment/Hall';
import { Labels } from './environment/Labels';
import { Lighting } from './environment/Lighting';
import { Portrait } from './environment/Lobby';
import { BrassTrim } from './environment/BrassTrim';
import { useVisitorStop } from './environment/useVisitorStop';
import { ExhibitFrame } from './exhibits/_kit/ExhibitFrame';

export default function Scene() {
  const layout = galleryLayout();
  const here = useVisitorStop(layout);
  return (
    <>
      {/* Both attach to the scene itself, so they sit here at the top level. */}
      <color attach="background" args={[tokens.color.ink]} />
      <fogExp2 attach="fog" args={[tokens.color.ink, tokens.light.fogDensity]} />
      <Hall layout={layout} />
      <Floor layout={layout} />
      <Fixtures layout={layout} />
      <BrassTrim layout={layout} />
      <Labels layout={layout} />
      <Portrait />
      <Desk layout={layout} />
      <Lighting layout={layout} />
      {layout.slots.map((slot) => (
        <ExhibitFrame key={slot.id} slot={slot} layout={layout} here={here} />
      ))}
    </>
  );
}
