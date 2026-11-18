// Day-one scaffold (`npm run new:exhibit -- __ID__`, WP-35): the stop keeps showing the kit's
// placeholder crate (EXPERIENCE §5.7) until an R5 builder replaces this component with the
// exhibit object described in README.md.
import type { ExhibitProps } from '../_kit';
import { Placeholder } from '../_kit/Placeholder';

export default function __COMPONENT__({ slot }: ExhibitProps) {
  return <Placeholder slot={slot} />;
}
