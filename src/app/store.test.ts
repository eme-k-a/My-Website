import { describe, expect, it } from 'vitest';
import { initialMuseumState, useMuseum } from './store';

describe('museum store (ARCHITECTURE §5.5)', () => {
  it('state keys are frozen at contracts-v1', () => {
    expect(Object.keys(useMuseum.getState()).sort()).toMatchInlineSnapshot(`
      [
        "canvasGeneration",
        "compilePending",
        "contextLost",
        "hovered",
        "inputSource",
        "lastInputAt",
        "mainScrollY",
        "mode",
        "openId",
        "placeholders",
        "ready",
        "reducedMotion",
        "settled",
        "stop",
        "textPending",
        "tier",
        "track",
      ]
    `);
  });

  it('starts with the specified initial values', () => {
    expect(useMuseum.getState()).toMatchObject({
      mode: 'museum',
      tier: 'medium',
      track: 'main',
      stop: 'lobby',
      settled: false,
      openId: null,
      ready: false,
      contextLost: false,
      canvasGeneration: 0,
      placeholders: [],
      mainScrollY: 0,
      lastInputAt: 0,
      textPending: 0,
      compilePending: 0,
    });
  });

  it('exposes no custom actions: every value is plain state', () => {
    for (const [key, value] of Object.entries(useMuseum.getState())) {
      expect(typeof value, key).not.toBe('function');
    }
  });

  it('initialMuseumState returns a fresh copy each time', () => {
    const a = initialMuseumState();
    const b = initialMuseumState();
    expect(a).toEqual(b);
    expect(a.placeholders).not.toBe(b.placeholders);
  });
});
