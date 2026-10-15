import { describe, expect, it } from 'vitest';
import { EXHIBIT_IDS } from './ids';
import { content } from './index';
import { entryById, exhibitNumber, mainTrack, readingOrder, trackOf, wingTrack } from './selectors';

describe('track selectors (ARCHITECTURE §3.7, EXPERIENCE §3.1)', () => {
  it('mainTrack has the 10 main stops in order', () => {
    expect(mainTrack(content)).toEqual([
      'lobby',
      'verafin',
      'projects-door',
      'mysa',
      'volunteer-door',
      'wailo',
      'cfia',
      'mun',
      'certifications',
      'desk',
    ]);
  });

  it('wing tracks start with their door', () => {
    expect(wingTrack(content, 'projects')).toEqual(['projects-door', 'klarup', 'finance-tracker']);
    expect(wingTrack(content, 'volunteer')).toEqual(['volunteer-door', 'safe-sip', 'sdsj']);
  });

  it('trackOf puts wing items in their wing and everything else on main', () => {
    expect(trackOf(content, 'klarup')).toBe('projects');
    expect(trackOf(content, 'sdsj')).toBe('volunteer');
    expect(trackOf(content, 'verafin')).toBe('main');
    expect(trackOf(content, 'projects-door')).toBe('main');
    expect(trackOf(content, 'certifications')).toBe('main');
  });

  it('readingOrder is the catalogue order', () => {
    expect(readingOrder(content)).toEqual([
      'verafin',
      'klarup',
      'finance-tracker',
      'mysa',
      'safe-sip',
      'sdsj',
      'wailo',
      'cfia',
      'mun',
      'certifications',
    ]);
  });

  it('exhibitNumber numbers main exhibits 01 to 06 and wing items by letter', () => {
    const numbers = Object.fromEntries(EXHIBIT_IDS.map((id) => [id, exhibitNumber(content, id)]));
    expect(numbers).toEqual({
      verafin: '01',
      mysa: '02',
      wailo: '03',
      cfia: '04',
      mun: '05',
      certifications: '06',
      klarup: 'P1',
      'finance-tracker': 'P2',
      'safe-sip': 'V1',
      sdsj: 'V2',
    });
  });

  it('entryById finds every exhibit entry', () => {
    for (const id of EXHIBIT_IDS) expect(entryById(content, id).id).toBe(id);
    expect(entryById(content, 'mun').kind).toBe('education');
  });
});
