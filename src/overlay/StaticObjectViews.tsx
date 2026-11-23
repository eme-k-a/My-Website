import { detailViews, type DetailViewId } from './inspection';
import styles from './ExhibitDialog.module.css';

const tableViews = [
  ['top', 'Above', 'Six open laptops form a ring around a single brass cube.'],
  ['front', 'Front', 'Two laptop lids face the viewer, with the shared cube visible between them.'],
  [
    'right',
    'Right',
    'A laptop sits directly above the pedestal, with two screens visible behind it.',
  ],
  ['back', 'Back', 'The opposite pair of laptop lids frames the cube across the walnut tabletop.'],
  [
    'left',
    'Left',
    'The near laptop hides the lower edge of the cube, while the far screen faces the viewer.',
  ],
  ['underside', 'Below', 'The round brass foot is centered against the wider walnut underside.'],
] as const;

const financeViews = [
  [
    'top',
    'Above',
    'Round brass, square graphite and hexagonal glass profiles identify income, expenses and budget.',
  ],
  [
    'front',
    'Front',
    'Three stacks share the ledger tray. Income is tallest, followed by budget and expenses.',
  ],
  [
    'right',
    'Right',
    'The frosted budget stack is closest, with the taller income stack visible beyond it.',
  ],
  [
    'back',
    'Back',
    'From the back, budget is on the left, expenses in the middle and income on the right.',
  ],
  ['left', 'Left', 'The tall income stack obscures the shorter stacks along the tray.'],
  [
    'underside',
    'Below',
    'The rectangular stand and the projecting lip of the tray are visible from below.',
  ],
] as const;
const directions = [
  ['top', 'Above'],
  ['front', 'Front'],
  ['right', 'Right'],
  ['back', 'Back'],
  ['left', 'Left'],
  ['underside', 'Below'],
] as const;
const angleDescriptions = {
  mun: [
    'Brass rails trace a square around the silicon die.',
    'The chip faces the open front of its scaffold.',
    'Diagonal braces cross the side of the frame.',
    'The support post rises behind the chip.',
    'The tilted chip is visible through the side braces.',
    'The base plate sits inside the lower square frame.',
  ],
  'nsbe-mun': [
    'The hinged rear panel projects behind the clipped page.',
    'Two brass clips hold the chapter page on its board.',
    'The clipped sheets and service panel sit on opposite faces.',
    'The raised latch and hinges frame an open service hatch.',
    'The panel stands away from the rear face.',
    'The wide foot supports the freestanding noticeboard.',
  ],
  mysa: [
    'From above, the key sits forward of the upright ceramic slab.',
    'Four dial segments face forward, with the key to their right.',
    'The brass ring and the thin edge of the wall unit are visible.',
    'A plain ceramic back rises from the wooden tray.',
    'The slab stands behind the brass key.',
    'The rectangular underside of the wooden tray.',
  ],
  wailo: [
    'The envelope and leaning phone occupy opposite ends of the tray.',
    'The link arches from the envelope to the reset card.',
    'The phone tilts back in its stand.',
    'The back of the phone faces the viewer beneath the link.',
    'The envelope sits in front of the phone stand.',
    'The underside of the tray supporting the phone and envelope.',
  ],
  cfia: [
    'A brass spindle pierces the tickets beside a dark corner stamp.',
    'Ticket edges rest above a raised wooden base.',
    'The paper stack projects beyond the spindle base.',
    'The spindle rises above the far edges of the tickets.',
    'Layered ticket edges are visible in profile.',
    'The wooden support is visible under the tickets.',
  ],
} as const;

/** Native disclosures keep each angle accessible without JavaScript. */
export function StaticObjectViews({
  id,
  group,
}: {
  id: 'finance-tracker' | 'sdsj' | DetailViewId;
  group: string;
}) {
  const views =
    id === 'sdsj'
      ? tableViews
      : id === 'finance-tracker'
        ? financeViews
        : [
            ['detail', detailViews[id].label, detailViews[id].detail],
            ...directions.map(([file, label], i) => [file, label, angleDescriptions[id][i]]),
          ];
  return (
    <div className={styles.objectViews} id={group}>
      {views.map(([view, label, description], index) => (
        <details key={view} name={group} open={index === 0}>
          <summary>{label}</summary>
          <figure>
            <img
              src={`/exhibits/${id}/${id}-${view}.webp`}
              width={id === 'sdsj' ? 640 : 480}
              height={id === 'sdsj' ? 560 : 400}
              loading="lazy"
              alt={description}
            />
          </figure>
        </details>
      ))}
    </div>
  );
}
