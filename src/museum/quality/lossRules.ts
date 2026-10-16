// The context-loss rules (ARCHITECTURE §10.1), pure so Node unit tests never load R3F.
// contextLoss.ts applies them.

/** The loss that falls back to classic (the second in the session). */
export const MAX_CONTEXT_LOSSES = 2;
/** A loss not restored within this much visible time falls back to classic. */
export const RESTORE_TIMEOUT_MS = 5000;
/** Where `/` goes on fallback; /resume/ shows the matching banner through CSS :target. */
export const CONTEXT_LOSS_FALLBACK_URL = '/resume/#why-context-loss';

export type Fallback = { kind: 'replace'; url: string } | { kind: 'classic' };

/** `/` leaves for the classic resume; an exhibit page shows its prerendered story. */
export function fallbackFor(pathname: string): Fallback {
  return pathname === '/' || pathname === '/index.html'
    ? { kind: 'replace', url: CONTEXT_LOSS_FALLBACK_URL }
    : { kind: 'classic' };
}

/** What a loss means after `previous` losses this session. */
export function afterLoss(previous: number): { losses: number; fallback: boolean } {
  const losses = previous + 1;
  return { losses, fallback: losses >= MAX_CONTEXT_LOSSES };
}
