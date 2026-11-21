import styles from './ExhibitDialog.module.css';

const views = [
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
export function RoundTableViews({ group }: { group: string }) {
  return (
    <div className={styles.objectViews} id={group}>
      {views.map(([view, label, description], index) => (
        <details key={view} name={group} open={index === 0}>
          <summary>{label}</summary>
          <figure>
            <img
              src={`/images/inspection/sdsj-${view}.webp`}
              width={640}
              height={560}
              loading="lazy"
              alt={description}
            />
          </figure>
        </details>
      ))}
    </div>
  );
}
