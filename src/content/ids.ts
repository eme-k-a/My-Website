// Frozen at contracts-v1 (ARCHITECTURE §3.2). These ids are public URLs (/exhibit/<id>/) and never
// change. A new job appends a new id (ARCHITECTURE §15.3).

// prettier-ignore
export const EXHIBIT_IDS = [
  'verafin', 'mysa', 'wailo', 'cfia',            // main aisle, newest first
  'klarup', 'finance-tracker',                   // projects wing
  'sdsj',                                        // volunteer wing
  'mun', 'certifications',                       // end of the main track
] as const;
export type ExhibitId = (typeof EXHIBIT_IDS)[number];

export const STOP_ONLY_IDS = ['lobby', 'projects-door', 'volunteer-door', 'desk'] as const;
export type StopId = ExhibitId | (typeof STOP_ONLY_IDS)[number];

export const WING_IDS = ['projects', 'volunteer'] as const;
export type WingId = (typeof WING_IDS)[number];
export type TrackId = 'main' | WingId;
export const doorId = (w: WingId) => `${w}-door` as const;
