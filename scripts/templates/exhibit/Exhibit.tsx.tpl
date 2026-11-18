// Day-one scaffold (`npm run new:exhibit -- __ID__`, WP-35): the stop keeps showing the kit's
// placeholder crate (EXPERIENCE §5.7) until an R5 builder replaces this component with the
// exhibit object described in README.md.
import type { ExhibitProps } from '../_kit';
import { Placeholder } from '../_kit/Placeholder';

export default function __COMPONENT__({ slot }: ExhibitProps) {
  // The kit's crate stands on the plinth top, but an exhibit's bounds start 0.025 m above it
  // (EXPERIENCE §5.3), so the scaffold lifts it there and reports inBounds under ?test=1.
  const lift = slot.mount === 'plinth' ? slot.bounds.min[1] : 0;
  return (
    <group position={[0, lift, 0]}>
      <Placeholder slot={slot} />
    </group>
  );
}
