import { describe, expect, it } from 'vitest';
import { sectionIndexAt, stepTarget, type StepInput } from './keys';

// Ten 900 px stops in a 900 px viewport (desktop).
const stopY = Array.from({ length: 10 }, (_, i) => i * 900);
const at = (y: number, pending: number | null = null): StepInput => ({
  y,
  stopY,
  holdY: stopY,
  pending,
});

describe('sectionIndexAt', () => {
  it('is the section holding the top of the viewport, with a 2 px tolerance', () => {
    expect(sectionIndexAt(0, stopY)).toBe(0);
    expect(sectionIndexAt(899, stopY)).toBe(1);
    expect(sectionIndexAt(897, stopY)).toBe(0);
    expect(sectionIndexAt(1350, stopY)).toBe(1);
    expect(sectionIndexAt(99_999, stopY)).toBe(9);
  });
});

describe('stepTarget', () => {
  it('steps one stop down and up from a stop', () => {
    expect(stepTarget('down', at(0))).toBe(1);
    expect(stepTarget('down', at(900))).toBe(2);
    expect(stepTarget('up', at(1800))).toBe(1);
    expect(stepTarget('up', at(900))).toBe(0);
  });

  it('ArrowDown twice from the lobby is projects-door (2), three times mysa (3)', () => {
    let y = 0;
    for (const expected of [1, 2, 3]) {
      const index = stepTarget('down', at(y))!;
      y = stopY[index]!;
      expect(index).toBe(expected);
    }
  });

  it('counts a press made before the previous scroll ended from its target', () => {
    expect(stepTarget('down', at(10, 1))).toBe(2);
    expect(stepTarget('up', at(1790, 2))).toBe(1);
  });

  it('stays inside the track at both ends', () => {
    expect(stepTarget('down', at(8100))).toBe(9);
    expect(stepTarget('up', at(0))).toBe(0);
    expect(stepTarget('down', at(0, 9))).toBe(9);
    expect(stepTarget('up', at(0, 0))).toBe(0);
  });

  it('goes to the first and last stop for Home and End', () => {
    expect(stepTarget('first', at(4500))).toBe(0);
    expect(stepTarget('last', at(4500))).toBe(9);
  });

  it('between two stops (proximity rest), down goes on and up returns to the stop above', () => {
    expect(stepTarget('down', at(1300))).toBe(2);
    expect(stepTarget('up', at(1300))).toBe(1);
  });

  it('leaves keys native inside a section taller than the viewport until its end shows', () => {
    // Pixel 7 after F-008: the lobby is 1069 px in an 839 px viewport.
    const tall: StepInput = {
      y: 0,
      stopY: [0, 1069, 1908],
      holdY: [230, 1069, 1908],
      pending: null,
    };
    expect(stepTarget('down', { ...tall, y: 0 })).toBeNull();
    expect(stepTarget('down', { ...tall, y: 120 })).toBeNull();
    expect(stepTarget('down', { ...tall, y: 230 })).toBe(1);
    expect(stepTarget('up', { ...tall, y: 120 })).toBeNull();
    expect(stepTarget('up', { ...tall, y: 0 })).toBe(0);
    expect(stepTarget('up', { ...tall, y: 1069 })).toBe(0);
  });

  it('does nothing without stops', () => {
    expect(stepTarget('down', { y: 0, stopY: [], holdY: [], pending: null })).toBeNull();
    expect(stepTarget('last', { y: 0, stopY: [], holdY: [], pending: null })).toBeNull();
  });
});
