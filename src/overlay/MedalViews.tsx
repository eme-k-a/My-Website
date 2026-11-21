import { content } from '../content';
import dialog from './ExhibitDialog.module.css';
import styles from './MedalViews.module.css';

const medals = [
  {
    shape: 'cloud',
    front: 'Three overlapping lobes rise above a straight base.',
    reverse: 'One raised bar',
  },
  {
    shape: 'compass',
    front: 'Four faceted points form a compass rose.',
    reverse: 'Two raised bars',
  },
  {
    shape: 'turbine',
    front: 'Three blades radiate from a central hub.',
    reverse: 'Three raised bars',
  },
] as const;

function MedalImage({ file, description }: { file: string; description: string }) {
  return (
    <img
      src={`/exhibits/certifications/${file}.webp`}
      width={560}
      height={440}
      loading="lazy"
      alt={description}
    />
  );
}

export function MedalViews({ group }: { group: string }) {
  return (
    <div id={group} className={dialog.objectViews}>
      <details name={group} open>
        <summary>Whole cabinet</summary>
        <MedalImage
          file="cabinet"
          description="Three brass medallions hang from one rail, with a cloud on the left, a compass in the middle and a turbine on the right."
        />
      </details>
      {medals.map(({ shape, front, reverse }, index) => (
        <details key={shape} name={group}>
          <summary>{content.certifications.items[index]?.name}</summary>
          <div className={styles.medal}>
            <details className={styles.flip}>
              <summary>
                <span>View reverse</span>
                <span>View front</span>
              </summary>
              <MedalImage
                file={shape + '-reverse'}
                description={
                  reverse +
                  ' at the center of the reverse, surrounded by twelve short radial marks.'
                }
              />
            </details>
            <MedalImage file={shape + '-front'} description={front} />
          </div>
        </details>
      ))}
    </div>
  );
}
