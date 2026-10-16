// ARCHITECTURE §10.1: the context-loss rules (the handler itself is covered by quality.spec.ts).
import { describe, expect, it } from 'vitest';
import {
  afterLoss,
  CONTEXT_LOSS_FALLBACK_URL,
  fallbackFor,
  MAX_CONTEXT_LOSSES,
  RESTORE_TIMEOUT_MS,
} from './lossRules';

describe('context loss rules', () => {
  it('the first loss waits for a restore; the second in the session falls back', () => {
    expect(MAX_CONTEXT_LOSSES).toBe(2);
    expect(afterLoss(0)).toEqual({ losses: 1, fallback: false });
    expect(afterLoss(1)).toEqual({ losses: 2, fallback: true });
    expect(afterLoss(5)).toEqual({ losses: 6, fallback: true });
  });

  it('waits 5 s for a restore', () => {
    expect(RESTORE_TIMEOUT_MS).toBe(5000);
  });

  it('falls back to /resume/#why-context-loss on / and to the static story elsewhere', () => {
    expect(CONTEXT_LOSS_FALLBACK_URL).toBe('/resume/#why-context-loss');
    expect(fallbackFor('/')).toEqual({ kind: 'replace', url: '/resume/#why-context-loss' });
    expect(fallbackFor('/index.html')).toEqual({ kind: 'replace', url: CONTEXT_LOSS_FALLBACK_URL });
    expect(fallbackFor('/exhibit/verafin/')).toEqual({ kind: 'classic' });
  });
});
