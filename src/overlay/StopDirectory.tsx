import { useEffect, useRef } from 'react';
import { useMuseum } from '../app/store';
import { doorId, type StopId } from '../content/ids';
import { exitWing, jumpTo, travelTo } from '../museum/rail/navigation';
import { cardOf, MAIN_STOPS, railLabel } from './model';
import styles from './StopDirectory.module.css';

export function StopDirectory({ dismiss }: { dismiss: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const current = useMuseum((s) => s.stop);
  useEffect(() => {
    const el = dialog.current!;
    el.showModal();
    el.querySelector<HTMLElement>('[aria-current="step"]')?.focus();
    const mobile = matchMedia('(max-width: 1023px), (max-height: 559px)');
    const resize = () => {
      if (!mobile.matches) el.close();
    };
    mobile.addEventListener('change', resize);
    return () => {
      mobile.removeEventListener('change', resize);
    };
  }, []);

  async function visit(id: StopId) {
    dialog.current?.close();
    const card = cardOf(id);
    const track = useMuseum.getState().track;
    if (card.kind === 'exhibit' && card.track !== 'main' && card.track !== track) {
      // Enter from its doorway so Return to the aisle and Back lead to the correct wing.
      await travelTo(doorId(card.track), { instant: true });
    } else if (card.kind === 'door' && card.wing === track) {
      await exitWing({ instant: true });
    }
    await jumpTo(id);
    document
      .querySelector<HTMLElement>(`#stop-${id} a[href], #stop-${id} button`)
      ?.focus({ preventScroll: true });
  }

  const stopButton = (id: StopId) => {
    const card = cardOf(id);
    return (
      <button
        type="button"
        aria-current={id === current ? 'step' : undefined}
        onClick={() => void visit(id).catch(() => {})}
      >
        {card.kind === 'exhibit' ? (
          <>
            <span className={styles.number}>{card.number}</span>
            <span>
              {card.title}
              <small>{card.organization}</small>
            </span>
          </>
        ) : (
          railLabel(id)
        )}
        {id === current && (
          <span className={styles.here} aria-hidden="true">
            Here
          </span>
        )}
      </button>
    );
  };
  return (
    <dialog
      ref={dialog}
      aria-labelledby="stop-directory-title"
      className={styles.directory}
      onClose={dismiss}
    >
      <div className={styles.heading}>
        <h2 id="stop-directory-title">Museum stops</h2>
        <button type="button" onClick={() => dialog.current?.close()}>
          Close
        </button>
      </div>
      <ol>
        {MAIN_STOPS.map((id) => {
          const card = cardOf(id);
          return (
            <li key={id}>
              {stopButton(id)}
              {card.kind === 'door' && (
                <ol aria-label={card.title}>
                  {card.links.map((link) => (
                    <li key={link.id}>{stopButton(link.id)}</li>
                  ))}
                </ol>
              )}
            </li>
          );
        })}
      </ol>
    </dialog>
  );
}
