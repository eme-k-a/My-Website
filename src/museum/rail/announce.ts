// Arrival announcements (EXPERIENCE §8.4, §10.3): one polite live region, one message per stop
// arrival, but only when the move was started by the keyboard (a key pressed within 1 s before the
// scroll began) or by a HUD control, plus wing entry and exit. Wheel, trackpad and touch
// scrolling never announce: they would spam screen readers.
// A move starts at the first scroll event after the previous arrival and is classified then (a
// later key press or HUD control during the same move upgrades it). A stepping key's scroll counts
// as a keyboard move even when the browser starts it more than 1 s after the press (slow frames);
// the move ends at the next arrival
// (the store's `settled` turning true, or its `stop` changing while settled). HUD controls mark
// themselves with `inputSource: 'hud'` (R6's components, or `jumpTo`); the announcer consumes the
// mark at the arrival, so the next HUD control is a fresh change. LiveRegion renders the message.
// Entry chunk: no three.js.
import { useEffect, useState } from 'react';
import { useMuseum, type InputSource, type MuseumState } from '../../app/store';
import { doorId, type StopId, type WingId } from '../../content/ids';
import { cardOf } from '../../overlay/model';
import { lastKeyAt, lastStepAt } from './keys';

/** A key pressed this long before the scroll began makes it a keyboard move (EXPERIENCE §10.3). */
export const KEY_WINDOW_MS = 1000;
/**
 * A HUD mark this recent starts a HUD move. Longer than the key window: a HUD move that first
 * leaves a wing scrolls only after the 1.2 s exit glide.
 */
export const HUD_WINDOW_MS = 3000;

export type MoveSource = 'keyboard' | 'hud' | 'scroll';

// ---------------------------------------------------------------------------------------------
// Wording (EXPERIENCE §8.4 aria-live rows, CONTENT_DRAFT §6.4)

/** The arrival message of a stop. */
export function arrivalMessage(id: StopId): string {
  const card = cardOf(id);
  switch (card.kind) {
    case 'lobby':
      return 'Lobby.';
    case 'desk':
      return 'Front desk.';
    case 'door':
      return `${card.title} door. Press Enter to step inside, or keep scrolling.`;
    case 'exhibit': {
      const details = [card.role, card.organization, card.dates].filter(
        (part): part is string => !!part,
      );
      const head = `${card.numberLabel}, ${card.title}.`;
      return details.length > 0 ? `${head} ${details.join(', ')}.` : head;
    }
  }
}

/** "Projects wing": the door card's title. */
function wingTitle(wing: WingId): string {
  const card = cardOf(doorId(wing));
  return card.kind === 'door' ? card.title : `${wing} wing`;
}

/** "Entered the Projects wing. No. P1, The Climb." */
export function wingEntryMessage(wing: WingId, at: StopId): string {
  const card = cardOf(at);
  const where = card.kind === 'exhibit' ? ` ${card.numberLabel}, ${card.title}.` : '';
  return `Entered the ${wingTitle(wing)}.${where}`;
}

/** "Back in the main aisle at the Projects wing door." */
export function wingExitMessage(wing: WingId): string {
  return `Back in the main aisle at the ${wingTitle(wing)} door.`;
}

// ---------------------------------------------------------------------------------------------
// Classification

export interface MoveInput {
  now: number;
  /** performance.now() of the last key press. */
  keyAt: number;
  /** performance.now() of the last stepping key that started a scroll (keys.ts). */
  stepAt: number;
  /** performance.now() of the previous arrival. */
  since: number;
  /** performance.now() of the last HUD mark (inputSource turning 'hud'). */
  hudAt: number;
  inputSource: InputSource;
}

/** What started a move that begins at `now`. */
export function classifyMove(input: MoveInput): MoveSource {
  const { now, keyAt, stepAt, since, hudAt, inputSource } = input;
  if (now - keyAt <= KEY_WINDOW_MS || stepAt > since) return 'keyboard';
  if (inputSource === 'hud' && now - hudAt <= HUD_WINDOW_MS) return 'hud';
  return 'scroll';
}

// ---------------------------------------------------------------------------------------------
// The announcer

type StoreView = Pick<MuseumState, 'ready' | 'settled' | 'stop' | 'track' | 'inputSource'>;

export interface AnnouncerDeps {
  write: (message: string) => void;
  now: () => number;
  keyAt: () => number;
  stepAt: () => number;
  /** Clears a consumed HUD mark (the store's `inputSource` back to 'scroll'). */
  consumeHud: () => void;
}

export interface Announcer {
  /** Every scroll event (passive). */
  onScroll(): void;
  /** Every store change. */
  onStore(next: StoreView, previous: StoreView): void;
}

const announces = (source: MoveSource | null) => source === 'keyboard' || source === 'hud';

export function createAnnouncer(deps: AnnouncerDeps): Announcer {
  let move: MoveSource | null = null;
  let hudAt = Number.NEGATIVE_INFINITY;
  let since = Number.NEGATIVE_INFINITY;
  let source: InputSource = 'scroll';
  let wing: { kind: 'enter' | 'exit'; wing: WingId } | null = null;
  /** The stop of the last arrival; null until the first settle (the page load is not a move). */
  let last: StopId | null = null;

  const classify = () =>
    classifyMove({
      now: deps.now(),
      keyAt: deps.keyAt(),
      stepAt: deps.stepAt(),
      since,
      hudAt,
      inputSource: source,
    });

  return {
    onScroll() {
      if (move === null) move = classify();
      else if (move === 'scroll') move = classify();
    },
    onStore(next, previous) {
      source = next.inputSource;
      if (next.inputSource === 'hud' && previous.inputSource !== 'hud') hudAt = deps.now();
      if (next.track !== previous.track && next.ready) {
        wing =
          next.track === 'main'
            ? { kind: 'exit', wing: previous.track as WingId }
            : { kind: 'enter', wing: next.track as WingId };
      }
      const arrived = next.settled && (!previous.settled || next.stop !== previous.stop);
      if (!arrived) return;
      const by = move;
      const crossed = wing;
      move = null;
      wing = null;
      const before = last;
      last = next.stop;
      since = deps.now();
      if (next.inputSource === 'hud') deps.consumeHud();
      if (before === null) return;
      let message: string | null = null;
      if (crossed?.kind === 'enter' && next.track === crossed.wing) {
        message = wingEntryMessage(crossed.wing, next.stop);
      } else if (crossed?.kind === 'exit' && next.stop === doorId(crossed.wing)) {
        message = wingExitMessage(crossed.wing);
      } else if (next.stop !== before && announces(by)) {
        message = arrivalMessage(next.stop);
      }
      if (message) deps.write(message);
    },
  };
}

/**
 * The live region's text (LiveRegion calls it). Installs the announcer on mount: a store
 * subscription and one passive scroll listener.
 */
export function useAnnouncer(): string {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const announcer = createAnnouncer({
      write: setMessage,
      now: () => performance.now(),
      keyAt: lastKeyAt,
      stepAt: lastStepAt,
      consumeHud: () => useMuseum.setState({ inputSource: 'scroll' }),
    });
    const onScroll = () => announcer.onScroll();
    const unsubscribe = useMuseum.subscribe((next, previous) => announcer.onStore(next, previous));
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      unsubscribe();
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  return message;
}
