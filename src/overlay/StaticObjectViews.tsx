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

/** Native disclosures keep each view available in the prerendered, script-free story. */
export function StaticObjectViews({
  id,
  group,
}: {
  id: 'finance-tracker' | 'sdsj';
  group: string;
}) {
  const finance = id === 'finance-tracker';
  const views = finance
    ? ([
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
      ] as const)
    : tableViews;
  return (
    <div className={styles.objectViews} id={group}>
      {views.map(([view, label, description], index) => (
        <details key={view} name={group} open={index === 0}>
          <summary>{label}</summary>
          <figure>
            <img
              src={`/exhibits/${id}/${id}-${view}.webp`}
              width={finance ? 480 : 640}
              height={finance ? 400 : 560}
              loading="lazy"
              alt={description}
            />
          </figure>
        </details>
      ))}
    </div>
  );
}
