// The gallery layout as a pure function of the content (ARCHITECTURE §6.6, EXPERIENCE §2). Nothing in
// the scene has a hand-typed coordinate: a new job slides everything down the aisle. Never reads
// `window` or the DOM (it runs in Node tests and the SSR build). The output type is frozen at
// contracts-v1; coordinates are pinned by `layout.test.ts` and its snapshot.
import { ym } from '../../content/format';
import { doorId, type ExhibitId, type StopId, type TrackId, type WingId } from '../../content/ids';
import { mainTrack } from '../../content/selectors';
import type { Content } from '../../content/types';

// EXPERIENCE §2.1 frozen constants.
export const EYE_Y = 1.6;
export const SPACING = 12;
export const FIRST_Z = -10;
export const EXHIBIT_X = 2.4;
export const AISLE_HALF = 3.5;
export const AISLE_CEILING = 5;
export const ARCH_Z = -4;
export const CAM_DRIFT_X = 0.6;
export const CAM_BACK_Z = 2.8;
export const SLOT_Y = 1.35;
export const DOOR_CAM_BACK_Z = 1.8;
export const DOOR_LOOK_Y = 1.5;
export const DOOR_W = 2.4;
export const DOOR_H = 2.8;
export const WING_DEPTH = 8;
export const WING_LENGTH = 8;
export const WING_CEILING = 4;
export const WING_PLINTH_OUT = 5.5;
export const WING_PLINTH_DZ = 2.2;
export const WING_CAM_OUT = 2.1;
export const WING_CAM_DZ = 1.4;

// EXPERIENCE §2.2 rules 3 and 4 (lobby, Foundations room, desk).
export const LOBBY_HALF = 6;
export const LOBBY_FRONT_Z = 6;
export const LOBBY_CEILING = 6;
export const LOBBY_CAM_Z = 4;
/** The aisle ends this far past the last work exhibit (zEnd = zLast - 6). */
export const AISLE_END_DZ = 6;
export const FOUNDATIONS_HALF = 6;
export const FOUNDATIONS_LENGTH = 10;
export const FOUNDATIONS_CEILING = 5;
/** mun plinth and the certifications vitrine sit this far past zEnd (z = zEnd - 5). */
export const FOUNDATIONS_ITEM_DZ = 5;
export const EDU_X = -2.5;
export const EDU_CAM_X = -0.3;
export const EDU_CAM_DZ = 2.4;
/** The wide plinth is 0.6 m tall; its slot center is 0.65 m above the top (EXPERIENCE §5.3). */
export const EDU_SLOT_Y = 1.25;
export const CERT_WALL_X = 6;
export const CERT_Y = 1.6;
export const CERT_SLOT_X = 5.85;
export const CERT_CAM_X = 2.2;
export const DESK_HALF = 5;
export const DESK_ROOM_LENGTH = 8;
export const DESK_CEILING = 4;
/** Desk center and camera, measured from the Foundations/desk boundary at zEnd - 10. */
export const DESK_DZ = 5.5;
export const DESK_CAM_DZ = 2;
export const DESK_LOOK_Y = 1.1;
/** A year boundary newer than the first exhibit's midpoint sits this far toward the lobby (EXPERIENCE §6.9). */
export const YEAR_BEFORE_FIRST_DZ = 3;

export type Vec3 = [number, number, number];
export interface StopPose {
  id: StopId;
  camera: Vec3;
  look: Vec3;
}
export interface Slot {
  id: ExhibitId;
  track: TrackId;
  position: Vec3; // plinth base center on the floor (mount 'plinth'), or the back-panel center on the wall (mount 'wall')
  rotationY: number; // local +Z faces the stop camera horizontally (wall: out of the wall)
  side: 'left' | 'right' | 'center';
  mount: 'plinth' | 'wall';
  plinth: 'standard' | 'wide' | 'none'; // wide = 1.4 x 1.4 x 0.6 m (mun only); none = wall vitrine
  bounds: { min: Vec3; max: Vec3 }; // exhibit object limit in local meters, origin = plinth top center (or back-panel center), EXPERIENCE §5.3
}
export interface Door {
  wing: WingId;
  side: 'left' | 'right';
  z: number;
  width: 2.4;
}
export interface Room {
  id: 'lobby' | 'aisle' | 'foundations' | 'desk' | WingId;
  min: [number, number]; // [x, z]
  max: [number, number]; // [x, z]
  ceiling: number;
}
export interface Track {
  id: TrackId;
  stops: StopPose[];
  via: { after: number; point: Vec3 }[];
}
export interface Layout {
  tracks: Record<TrackId, Track>;
  slots: Slot[];
  doors: Door[];
  rooms: Room[];
  yearMarks: { year: number; z: number }[];
  ageT: Record<StopId, number>; // EXPERIENCE §6.9 age parameter (0 newest, 1 oldest) for light warmth and paper aging
}

/** Slot variants of EXPERIENCE §5.3, local meters. */
export const SLOT_BOUNDS = {
  standard: { min: [-0.325, 0.025, -0.325], max: [0.325, 0.675, 0.325] },
  wide: { min: [-0.55, 0.1, -0.55], max: [0.55, 1.2, 0.55] },
  wall: { min: [-0.325, -0.325, 0.05], max: [0.325, 0.325, 0.25] },
} as const satisfies Record<string, { min: Readonly<Vec3>; max: Readonly<Vec3> }>;

const copyBounds = (b: { min: Readonly<Vec3>; max: Readonly<Vec3> }) => ({
  min: [...b.min] as Vec3,
  max: [...b.max] as Vec3,
});

/** Rotation about +Y that turns local +Z from `from` toward `to` in the horizontal plane. */
const facing = (from: Vec3, to: Vec3) => Math.atan2(to[0] - from[0], to[2] - from[2]);

const asExhibit = (id: string) => id as ExhibitId;

/** EXPERIENCE §2.2 rule 2 validation. Every message names the wing. */
function validateWings(content: Content): void {
  const workIds = content.experiences.map((w) => w.id);
  const seenIds = new Set<string>();
  const afters = new Map<string, string>();
  for (const wing of content.wings) {
    if (seenIds.has(wing.id)) throw new Error(`Wing '${wing.id}' appears twice`);
    seenIds.add(wing.id);
    const k = workIds.indexOf(wing.after);
    if (k < 0) {
      throw new Error(`Wing '${wing.id}': after '${wing.after}' is not a work exhibit`);
    }
    if (k === workIds.length - 1) {
      throw new Error(
        `Wing '${wing.id}': after '${wing.after}' is the last work exhibit; a door needs a main exhibit on both sides`,
      );
    }
    const other = afters.get(wing.after);
    if (other !== undefined) {
      throw new Error(`Wings '${other}' and '${wing.id}' share after '${wing.after}'`);
    }
    afters.set(wing.after, wing.id);
    if (wing.items.length < 1 || wing.items.length > 2) {
      throw new Error(`Wing '${wing.id}' holds ${wing.items.length} items; a v1 wing holds 1 or 2`);
    }
    const pool: { id: string }[] = wing.id === 'projects' ? content.projects : content.volunteer;
    for (const item of wing.items) {
      if (!pool.some((e) => e.id === item)) {
        throw new Error(`Wing '${wing.id}': item '${item}' is not a ${wing.id} entry`);
      }
    }
  }
}

/** EXPERIENCE §6.9: brass year strips from the time anchors along the main aisle. */
function computeYearMarks(
  content: Content,
  workZ: number[],
  zEnd: number,
  now: Date,
): { year: number; z: number }[] {
  const works = content.experiences;
  const nowYm = now.getUTCFullYear() * 12 + now.getUTCMonth();
  const endYm = (end: string) => (end === 'present' ? nowYm : ym(end));
  // Anchors (z, month) in walking order; times must decrease, each at least one month below the last.
  const anchors = works.map((w, i) => ({
    z: workZ[i]!,
    t: (ym(w.dates.start) + endYm(w.dates.end) + 1) / 2,
  }));
  anchors.push({ z: zEnd, t: ym(works[works.length - 1]!.dates.start) });
  for (let i = 1; i < anchors.length; i++) {
    anchors[i]!.t = Math.min(anchors[i]!.t, anchors[i - 1]!.t - 1);
  }
  const zAt = (t: number): number => {
    const first = anchors[0]!;
    if (t > first.t) return first.z + YEAR_BEFORE_FIRST_DZ;
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1]!;
      const b = anchors[i]!;
      if (t >= b.t) return a.z + ((b.z - a.z) * (a.t - t)) / (a.t - b.t);
    }
    return anchors[anchors.length - 1]!.z;
  };
  const buildYear = now.getUTCFullYear();
  const oldestYear = Math.min(...works.map((w) => Math.floor(ym(w.dates.start) / 12)));
  const marks = [{ year: buildYear, z: ARCH_Z }];
  // The strip labeled Y sits where the anchors reach January of Y + 1.
  for (let year = buildYear - 1; year >= oldestYear; year--) {
    marks.push({ year, z: zAt((year + 1) * 12) });
  }
  return marks;
}

/**
 * The full layout for `content` at the build date `now` (needed for the current-year strip and for
 * ongoing date ranges). Throws on an invalid wing (EXPERIENCE §2.2 rule 2).
 */
export function computeLayout(content: Content, now: Date): Layout {
  const works = content.experiences;
  const n = works.length;
  if (n < 1) throw new Error('The layout needs at least one work exhibit');
  if (content.education.length !== 1) {
    throw new Error(
      `The Foundations room holds exactly one education entry (found ${content.education.length})`,
    );
  }
  validateWings(content);

  const poses = new Map<StopId, StopPose>();
  const slots: Slot[] = [];
  const doors: Door[] = [];
  const rooms: Room[] = [];
  const ageT = {} as Record<StopId, number>;
  const setPose = (id: StopId, camera: Vec3, look: Vec3) => {
    const pose = { id, camera, look };
    poses.set(id, pose);
    return pose;
  };

  // Lobby (EXPERIENCE §2.2 rule 4).
  setPose('lobby', [0, EYE_Y, LOBBY_CAM_Z], [0, EYE_Y, FIRST_Z]);
  ageT.lobby = 0;
  rooms.push({
    id: 'lobby',
    min: [-LOBBY_HALF, ARCH_Z],
    max: [LOBBY_HALF, LOBBY_FRONT_Z],
    ceiling: LOBBY_CEILING,
  });

  // Main work exhibits (rule 1): newest on the right, then alternating.
  const workZ = works.map((_, i) => FIRST_Z - SPACING * i);
  const zLast = workZ[n - 1]!;
  const zEnd = zLast - AISLE_END_DZ;
  rooms.push({
    id: 'aisle',
    min: [-AISLE_HALF, zEnd],
    max: [AISLE_HALF, ARCH_Z],
    ceiling: AISLE_CEILING,
  });
  works.forEach((work, i) => {
    const id = asExhibit(work.id);
    const s = i % 2 === 0 ? 1 : -1;
    const z = workZ[i]!;
    const position: Vec3 = [s * EXHIBIT_X, 0, z];
    const camera: Vec3 = [s * CAM_DRIFT_X, EYE_Y, z + CAM_BACK_Z];
    setPose(id, camera, [s * EXHIBIT_X, SLOT_Y, z]);
    slots.push({
      id,
      track: 'main',
      position,
      rotationY: facing(position, camera),
      side: s > 0 ? 'right' : 'left',
      mount: 'plinth',
      plinth: 'standard',
      bounds: copyBounds(SLOT_BOUNDS.standard),
    });
    ageT[id] = n === 1 ? 0 : i / (n - 1);
  });

  // Doors and wing rooms (rule 2): each door at the midpoint after its `after` exhibit.
  const wingTracks = new Map<WingId, Track>();
  for (const wing of content.wings) {
    const k = works.findIndex((w) => w.id === wing.after);
    const s = wing.side === 'left' ? -1 : 1;
    const zDoor = (workZ[k]! + workZ[k + 1]!) / 2;
    const door = doorId(wing.id);
    const t = (k + 0.5) / (n - 1);
    const doorPose = setPose(
      door,
      [0, EYE_Y, zDoor + DOOR_CAM_BACK_Z],
      [s * AISLE_HALF, DOOR_LOOK_Y, zDoor],
    );
    ageT[door] = t;
    doors.push({ wing: wing.id, side: wing.side, z: zDoor, width: DOOR_W });
    const xWall = s * AISLE_HALF;
    const xFar = s * (AISLE_HALF + WING_DEPTH);
    rooms.push({
      id: wing.id,
      min: [Math.min(xWall, xFar), zDoor - WING_LENGTH / 2],
      max: [Math.max(xWall, xFar), zDoor + WING_LENGTH / 2],
      ceiling: WING_CEILING,
    });
    const stops = [doorPose];
    // A wing of two items puts them at +-WING_PLINTH_DZ; a lone item (the v1 volunteer wing after
    // F-035) sits on the door axis with its camera straight in front of it.
    const pair = wing.items.length > 1;
    wing.items.forEach((itemId, j) => {
      const id = asExhibit(itemId);
      const plinthZ = pair ? zDoor + WING_PLINTH_DZ - 2 * WING_PLINTH_DZ * j : zDoor;
      const position: Vec3 = [s * (AISLE_HALF + WING_PLINTH_OUT), 0, plinthZ];
      const camera: Vec3 = [
        s * (AISLE_HALF + WING_CAM_OUT),
        EYE_Y,
        pair ? zDoor + WING_CAM_DZ - 2 * WING_CAM_DZ * j : zDoor,
      ];
      stops.push(setPose(id, camera, [position[0], SLOT_Y, plinthZ]));
      slots.push({
        id,
        track: wing.id,
        position,
        rotationY: facing(position, camera),
        side: wing.side,
        mount: 'plinth',
        plinth: 'standard',
        bounds: copyBounds(SLOT_BOUNDS.standard),
      });
      ageT[id] = t;
    });
    wingTracks.set(wing.id, {
      id: wing.id,
      stops,
      // The threshold waypoint T (not a stop) so the curve passes through the door opening.
      via: [{ after: 0, point: [xWall, EYE_Y, zDoor] }],
    });
  }

  // Foundations room (rule 3): education on the wide plinth, certifications in the wall vitrine.
  rooms.push({
    id: 'foundations',
    min: [-FOUNDATIONS_HALF, zEnd - FOUNDATIONS_LENGTH],
    max: [FOUNDATIONS_HALF, zEnd],
    ceiling: FOUNDATIONS_CEILING,
  });
  const itemZ = zEnd - FOUNDATIONS_ITEM_DZ;
  const eduId = asExhibit(content.education[0]!.id);
  const eduPosition: Vec3 = [EDU_X, 0, itemZ];
  const eduCamera: Vec3 = [EDU_CAM_X, EYE_Y, zEnd - EDU_CAM_DZ];
  setPose(eduId, eduCamera, [EDU_X, EDU_SLOT_Y, itemZ]);
  slots.push({
    id: eduId,
    track: 'main',
    position: eduPosition,
    rotationY: facing(eduPosition, eduCamera),
    side: 'left',
    mount: 'plinth',
    plinth: 'wide',
    bounds: copyBounds(SLOT_BOUNDS.wide),
  });
  ageT[eduId] = 1;

  const certId = asExhibit(content.certifications.id);
  setPose(certId, [CERT_CAM_X, EYE_Y, itemZ], [CERT_SLOT_X, CERT_Y, itemZ]);
  slots.push({
    id: certId,
    track: 'main',
    position: [CERT_WALL_X, CERT_Y, itemZ],
    rotationY: -Math.PI / 2, // out of the right wall, toward -X
    side: 'right',
    mount: 'wall',
    plinth: 'none',
    bounds: copyBounds(SLOT_BOUNDS.wall),
  });
  ageT[certId] = 1;

  // Desk zone (rule 3).
  const deskStart = zEnd - FOUNDATIONS_LENGTH;
  rooms.push({
    id: 'desk',
    min: [-DESK_HALF, deskStart - DESK_ROOM_LENGTH],
    max: [DESK_HALF, deskStart],
    ceiling: DESK_CEILING,
  });
  setPose('desk', [0, EYE_Y, deskStart - DESK_CAM_DZ], [0, DESK_LOOK_Y, deskStart - DESK_DZ]);
  ageT.desk = 1 / 3;

  const poseOf = (id: StopId): StopPose => {
    const pose = poses.get(id);
    if (!pose) throw new Error(`No pose for stop '${id}'`);
    return pose;
  };
  const main: Track = { id: 'main', stops: mainTrack(content).map(poseOf), via: [] };
  const emptyTrack = (id: WingId): Track => ({ id, stops: [], via: [] });

  // Slots in catalogue order: each wing's items right after the exhibit its door follows.
  const order = main.stops.flatMap((stop) => {
    const wing = content.wings.find((w) => doorId(w.id) === stop.id);
    return wing ? wing.items : [stop.id];
  });
  slots.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));

  return {
    tracks: {
      main,
      projects: wingTracks.get('projects') ?? emptyTrack('projects'),
      volunteer: wingTracks.get('volunteer') ?? emptyTrack('volunteer'),
    },
    slots,
    doors,
    rooms,
    yearMarks: computeYearMarks(content, workZ, zEnd, now),
    ageT,
  };
}
