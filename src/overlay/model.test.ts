import { describe, expect, it } from 'vitest';
import { doorId, WING_IDS } from '../content/ids';
import { content } from '../content/index';
import { chipLabel, DESK_CHIP, MAIN_STOPS, yearAt } from './model';

describe('chipLabel (F-034)', () => {
  it('is the year at the camera on the main track', () => {
    for (let i = 0; i < MAIN_STOPS.length; i++) {
      if (MAIN_STOPS[i] === 'desk') continue;
      expect(chipLabel(i, 'main')).toBe(String(yearAt(i)));
    }
  });

  it('reads "Front desk" at the desk, never a year', () => {
    const desk = MAIN_STOPS.indexOf('desk');
    expect(desk).toBe(MAIN_STOPS.length - 1);
    expect(chipLabel(desk, 'main')).toBe(DESK_CHIP);
    expect(chipLabel(desk - 0.4, 'main')).toBe(DESK_CHIP);
    expect(chipLabel(desk - 0.6, 'main')).toBe(String(yearAt(desk - 0.6)));
  });

  it('holds the door year everywhere inside a wing', () => {
    for (const wing of WING_IDS) {
      if (!content.wings.some((w) => w.id === wing)) continue;
      const door = MAIN_STOPS.indexOf(doorId(wing));
      expect(door).toBeGreaterThan(0);
      const year = String(yearAt(door));
      expect(chipLabel(door, 'main')).toBe(year);
      for (const p of [0, 0.5, 1, 2, 3]) expect(chipLabel(p, wing), `${wing} at ${p}`).toBe(year);
    }
  });
});
