// The scene (ARCHITECTURE §7.1), built entirely from computeLayout(content, build date): the
// greybox hall, the fixtures, the interim lighting and one ExhibitFrame per slot. WP-11 adds the
// environment v1 (light pools, reflector floor, signs, year strips, portrait, desk).
import { tokens } from '../design/tokens';
import { Fixtures } from './environment/Fixtures';
import { galleryLayout } from './environment/gallery';
import { GreyboxLighting } from './environment/GreyboxLighting';
import { Hall } from './environment/Hall';
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
      <Fixtures layout={layout} />
      <GreyboxLighting layout={layout} here={here} />
      {layout.slots.map((slot) => (
        <ExhibitFrame key={slot.id} slot={slot} layout={layout} here={here} />
      ))}
    </>
  );
}
