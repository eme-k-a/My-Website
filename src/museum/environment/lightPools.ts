// Baked light (EXPERIENCE §7.5, ART_DIRECTION §4, ARCHITECTURE §8.1): no shadow maps and only one
// to three real lights, so the gallery's warmth is painted once at boot.
// - Floor pools: one lightmap per floor zone (room). Per light target a warm radial pool (radius
//   1.6 m, 0.3 m from the plinth toward the aisle center, peak alpha 0.85, smoothstep falloff,
//   color by age); per door a threshold pool on the aisle floor (1.2 m, alpha 0.35, light-0); under
//   every plinth and the desk a soft contact patch (footprint plus a 0.25 m edge, darkness 0.55).
// - Wall wash: two 256 px tiles. The shell's tile carries the base level and a panel seam at each
//   side (seams every 2 m); the shell samples only its plain bottom rows. The bay tile is the
//   "scallop" (a wall-washer arc fading toward the floor) over the same base, without seams, so a
//   bay can sit anywhere: each one is centered on its target's wall title and sized to it (F-027),
//   and tinted by the target's temperature (instance color). Its edges fade to the base level, so
//   it meets the shell without a visible edge.
// Everything is a pure function of the layout plus a fixed seed (the dither), so the textures are
// identical on every run and can be rebuilt after a context restore. Values are linear light,
// stored sRGB-encoded in 8 bits (colorSpace SRGB) so the dark end keeps its precision.
import { CanvasTexture, ClampToEdgeWrapping, Matrix4, RepeatWrapping, SRGBColorSpace } from 'three';
import { tokens } from '../../design/tokens';
import { PLINTH_SIZE } from '../exhibits/_kit/anatomy';
import { rng } from '../exhibits/_kit/noise';
import { AISLE_HALF, type Layout, type Room } from '../rail/layout';
import { lightTargets, rampColor, WASH_BAY_WIDTH, type TargetId, type WashBay } from './lightPlan';
import type { SeamLine } from './shell';

const light = tokens.light;

/** Floor lightmap resolution, capped so a long aisle stays within MAX_LIGHTMAP_SIZE. */
export const POOL_PX_PER_M = 32;
export const MAX_LIGHTMAP_SIZE = 2048;
/** Floor lightmap level outside the pools (linear, light-0 tinted). */
export const FLOOR_BASE = 0.05;
/** The door pool's center sits this far into the aisle from the door line. */
export const DOOR_POOL_INSET = 0.6;
/** Desk footprint for its contact patch (Desk.tsx). */
export const DESK_FOOTPRINT = [1.8, 0.7] as const;
/**
 * lightMapIntensity of the floor per floor type. The floor is near black (`#0E0E11`), so its
 * pools need a strong lightmap; the reflector floor (metalness 0.5) has half the diffuse albedo
 * and gets twice the intensity to read the same.
 */
export const FLOOR_LIGHTMAP_INTENSITY = { standard: 32, reflector: 64 } as const;

/** Wall wash tile: side in px, base level, and the lightMapIntensity of the `wall` material. */
export const WALL_WASH_SIZE = 256;
export const WALL_WASH_BASE = 0.04;
export const WALL_WASH_INTENSITY = 40;
/** Shell faces sample the wash at this v: base level and seams only, no scallop. */
export const WALL_WASH_PLAIN_V = 0.03;

export interface PoolSpec {
  kind: 'pool' | 'door';
  /** The target or door it belongs to. */
  for: string;
  center: [number, number];
  radius: number;
  alpha: number;
  color: string;
}

export interface ContactSpec {
  for: string;
  center: [number, number];
  /** Footprint [x, z] before rotation. */
  size: [number, number];
  rotationY: number;
  soft: number;
  darkness: number;
}

export interface FloorPaint {
  pools: PoolSpec[];
  contacts: ContactSpec[];
}

/** Everything painted into the floor lightmaps, in world [x, z]. */
export function floorPaint(layout: Layout): FloorPaint {
  const pools: PoolSpec[] = lightTargets(layout).map((t) => ({
    kind: 'pool',
    for: t.id,
    center: [...t.pool],
    radius: light.poolRadius,
    alpha: light.poolAlpha,
    color: t.color,
  }));
  for (const door of layout.doors) {
    const s = door.side === 'left' ? -1 : 1;
    pools.push({
      kind: 'door',
      for: `${door.wing}-door`,
      center: [s * (AISLE_HALF - DOOR_POOL_INSET), door.z],
      radius: light.doorPoolRadius,
      alpha: light.doorPoolAlpha,
      color: rampColor(0),
    });
  }
  const contacts: ContactSpec[] = [];
  for (const slot of layout.slots) {
    if (slot.plinth === 'none') continue;
    const [w, , d] = PLINTH_SIZE[slot.plinth];
    contacts.push({
      for: slot.id,
      center: [slot.position[0], slot.position[2]],
      size: [w, d],
      rotationY: slot.rotationY,
      soft: light.contactSoftEdge,
      darkness: light.contactDarkness,
    });
  }
  const desk = layout.tracks.main.stops.find((s) => s.id === 'desk');
  if (desk) {
    contacts.push({
      for: 'desk',
      center: [desk.look[0], desk.look[2]],
      size: [...DESK_FOOTPRINT],
      rotationY: 0,
      soft: light.contactSoftEdge,
      darkness: light.contactDarkness,
    });
  }
  return { pools, contacts };
}

// ---------------------------------------------------------------------------------------------
// Color and encoding helpers

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (c: number) =>
  c <= 0.0031308 ? c * 12.92 : 1.055 * Math.max(0, c) ** (1 / 2.4) - 0.055;

/** `#RRGGBB` to linear RGB in [0, 1]. */
export function hexToLinear(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => srgbToLinear(v / 255)) as [
    number,
    number,
    number,
  ];
}

/** Linear [0, 1] to an sRGB byte, with a seeded dither of up to half a step against banding. */
function encode(value: number, dither: number): number {
  const v = linearToSrgb(Math.min(1, Math.max(0, value))) * 255 + dither;
  return Math.min(255, Math.max(0, Math.round(v)));
}

// ---------------------------------------------------------------------------------------------
// Floor zones

export interface ZoneRaster {
  room: Room['id'];
  width: number;
  height: number;
  /** Meters per pixel along x and z. */
  scale: [number, number];
  /** RGBA, row 0 at the room's min z (the far end), column 0 at its min x. */
  data: Uint8ClampedArray<ArrayBuffer>;
}

/** Pixel size of a zone's lightmap. */
export function zoneSize(room: Room, pxPerM = POOL_PX_PER_M): { width: number; height: number } {
  const w = room.max[0] - room.min[0];
  const d = room.max[1] - room.min[1];
  const density = Math.min(pxPerM, MAX_LIGHTMAP_SIZE / Math.max(w, d));
  return {
    width: Math.max(1, Math.round(w * density)),
    height: Math.max(1, Math.round(d * density)),
  };
}

/** World [x, z] of a pixel center (see ZoneRaster for the orientation). */
export function zonePixelToWorld(
  room: Room,
  size: { width: number; height: number },
  col: number,
  row: number,
): [number, number] {
  const w = room.max[0] - room.min[0];
  const d = room.max[1] - room.min[1];
  return [
    room.min[0] + ((col + 0.5) * w) / size.width,
    room.min[1] + ((row + 0.5) * d) / size.height,
  ];
}

/** Signed distance outside a rotated rectangle (0 inside). */
function outsideRect(spec: ContactSpec, x: number, z: number): number {
  const dx = x - spec.center[0];
  const dz = z - spec.center[1];
  // Into the footprint's local frame (rotation about +Y by rotationY).
  const c = Math.cos(spec.rotationY);
  const s = Math.sin(spec.rotationY);
  const lx = c * dx - s * dz;
  const lz = s * dx + c * dz;
  const ox = Math.max(0, Math.abs(lx) - spec.size[0] / 2);
  const oz = Math.max(0, Math.abs(lz) - spec.size[1] / 2);
  return Math.hypot(ox, oz);
}

/** Paints one floor zone. Pure and deterministic (the dither is seeded by `seed`). */
export function paintZone(
  room: Room,
  paint: FloorPaint,
  seed = 1,
  pxPerM = POOL_PX_PER_M,
): ZoneRaster {
  const size = zoneSize(room, pxPerM);
  const { width, height } = size;
  const sx = (room.max[0] - room.min[0]) / width;
  const sz = (room.max[1] - room.min[1]) / height;
  const rgb = new Float32Array(width * height * 3);
  const base = hexToLinear(rampColor(0)).map((v) => v * FLOOR_BASE);
  for (let i = 0; i < width * height; i++) rgb.set(base, i * 3);

  const colOf = (x: number) => (x - room.min[0]) / sx - 0.5;
  const rowOf = (z: number) => (z - room.min[1]) / sz - 0.5;
  const span = (cx: number, cz: number, r: number) => ({
    c0: Math.max(0, Math.floor(colOf(cx - r))),
    c1: Math.min(width - 1, Math.ceil(colOf(cx + r))),
    r0: Math.max(0, Math.floor(rowOf(cz - r))),
    r1: Math.min(height - 1, Math.ceil(rowOf(cz + r))),
  });

  for (const pool of paint.pools) {
    const color = hexToLinear(pool.color);
    const { c0, c1, r0, r1 } = span(pool.center[0], pool.center[1], pool.radius);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const [x, z] = zonePixelToWorld(room, size, col, row);
        const r = Math.hypot(x - pool.center[0], z - pool.center[1]);
        if (r >= pool.radius) continue;
        const a = pool.alpha * (1 - smoothstep(0, pool.radius, r));
        const i = (row * width + col) * 3;
        for (let k = 0; k < 3; k++) rgb[i + k] = rgb[i + k]! * (1 - a) + color[k]! * a;
      }
    }
  }

  for (const contact of paint.contacts) {
    const reach = Math.hypot(contact.size[0], contact.size[1]) / 2 + contact.soft;
    const { c0, c1, r0, r1 } = span(contact.center[0], contact.center[1], reach);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const [x, z] = zonePixelToWorld(room, size, col, row);
        const d = outsideRect(contact, x, z);
        if (d >= contact.soft) continue;
        const k = 1 - contact.darkness * (1 - smoothstep(0, contact.soft, d));
        const i = (row * width + col) * 3;
        rgb[i] = rgb[i]! * k;
        rgb[i + 1] = rgb[i + 1]! * k;
        rgb[i + 2] = rgb[i + 2]! * k;
      }
    }
  }

  const random = rng(seed);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const dither = random() - 0.5;
    data[i * 4] = encode(rgb[i * 3]!, dither);
    data[i * 4 + 1] = encode(rgb[i * 3 + 1]!, dither);
    data[i * 4 + 2] = encode(rgb[i * 3 + 2]!, dither);
    data[i * 4 + 3] = 255;
  }
  return { room: room.id, width, height, scale: [sx, sz], data };
}

/** Every floor zone of the layout, painted (seed = 1 + the room's index). */
export function paintFloorZones(layout: Layout, pxPerM = POOL_PX_PER_M): ZoneRaster[] {
  const paint = floorPaint(layout);
  return layout.rooms.map((room, i) => paintZone(room, paint, 1 + i, pxPerM));
}

// ---------------------------------------------------------------------------------------------
// Wall wash

/** Tile geometry: the tile spans one 2 m panel and, nominally, a 5 m wall. */
const TILE_W = 2;
const TILE_H = 5;
const SCALLOP_TOP = 0.8; // m below the ceiling at the tile center (0.45 until F-025)
const SCALLOP_CURVE = 0.7; // edge drop per m^2 off center (flatter since F-027: a wider arch)
const SCALLOP_SIDE = 0.72; // the lit core spans this share of the bay (F-027: covers the title)
const SCALLOP_FALLOFF = 2.4; // m, exponential falloff toward the floor
/**
 * Peak of the scallop over the base level (F-025). At 1 the wash behind the desk and the lobby
 * portrait read as opaque grey shafts brighter than the floor pools they belong to; at 0.42 the
 * brightest wash stays under its floor pool and the brass titles in front of it.
 */
export const WASH_PEAK = 0.3;
const SEAM_HALF_PX = 1.25;
const SEAM_DARKEN = 0.55;

/** Wash level at tile coordinates (u across, v up), linear, before seams and base. */
export function scallop(u: number, v: number): number {
  const x = (u - 0.5) * TILE_W;
  const down = (1 - v) * TILE_H;
  const edge = SCALLOP_TOP + SCALLOP_CURVE * x * x;
  const lit = smoothstep(0, 0.35, down - edge);
  const fall = Math.exp(-Math.max(0, down - SCALLOP_TOP) / SCALLOP_FALLOFF);
  const sides = 1 - smoothstep(SCALLOP_SIDE, 0.99, Math.abs(x));
  // Nothing reaches the bottom rows: the shell samples them for base and seams only.
  const floor = smoothstep(0.08, 0.22, v);
  return lit * fall * sides * floor;
}

/**
 * RGBA pixels of a wall-wash tile (greyscale, sRGB-encoded, row 0 at the top): the shell's tile
 * (`seams`, the default) or the bays' seamless scallop tile.
 */
export function wallWashPixels(
  size = WALL_WASH_SIZE,
  seed = 7,
  { seams = true }: { seams?: boolean } = {},
): Uint8ClampedArray<ArrayBuffer> {
  const data = new Uint8ClampedArray(size * size * 4);
  const random = rng(seed);
  for (let row = 0; row < size; row++) {
    const v = 1 - (row + 0.5) / size;
    for (let col = 0; col < size; col++) {
      const u = (col + 0.5) / size;
      const edgePx = Math.min(col + 0.5, size - col - 0.5);
      const seam = seams ? 1 - SEAM_DARKEN * (1 - smoothstep(0, SEAM_HALF_PX, edgePx)) : 1;
      const lit = scallop(u, v);
      const value = (WALL_WASH_BASE + (1 - WALL_WASH_BASE) * WASH_PEAK * lit) * seam;
      // Dither only the scallop's gradient. The shell samples one plain row at a fixed v, so a
      // dithered plain row became per-column noise stretched floor to ceiling: fine vertical
      // streaks at grazing angles once the 8-bit output rounds it (F-026).
      const dither = random() - 0.5;
      const byte = encode(value, lit > 0 ? dither : 0);
      const i = (row * size + col) * 4;
      data[i] = byte;
      data[i + 1] = byte;
      data[i + 2] = byte;
      data[i + 3] = 255;
    }
  }
  return data;
}

/** A wash bay stands this far in front of its wall face (wall titles are at 0.01 m). */
export const WASH_BAY_GAP = 0.005;

export interface WashPlacement {
  for: TargetId;
  bay: WashBay;
  color: string;
}

export interface WashLayout {
  bays: WashPlacement[];
  /** One per wall line that carries a bay: the shell's seams on it follow the bays' grid. */
  seams: SeamLine[];
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * Every target's wall-wash bay, where its target puts it (centered on the wall title). The bays
 * are seamless, so they need no grid; the first bay on a wall line still sets that line's seam
 * phase, so the seams of a wall keep their 2 m rhythm around its first bay.
 */
export function washLayout(layout: Layout): WashLayout {
  const seams: SeamLine[] = [];
  const bays: WashPlacement[] = [];
  for (const target of lightTargets(layout)) {
    const bay = { ...target.wash, normal: [...target.wash.normal] as [number, number] };
    if (!seams.some((s) => s.axis === bay.axis && Math.abs(s.at - bay.at) < 1e-6)) {
      const phase = mod(bay.center - WASH_BAY_WIDTH / 2, WASH_BAY_WIDTH);
      seams.push({ axis: bay.axis, at: bay.at, phase });
    }
    bays.push({ for: target.id, bay, color: target.color });
  }
  return { bays, seams };
}

/** The unit-plane matrix of a bay: `bay.width` wide, floor to ceiling, facing into the room. */
export function washMatrix(bay: WashBay): Matrix4 {
  const across = bay.at;
  const [nx, nz] = bay.normal;
  const x = bay.axis === 'z' ? across + nx * WASH_BAY_GAP : bay.center;
  const z = bay.axis === 'x' ? across + nz * WASH_BAY_GAP : bay.center;
  return new Matrix4()
    .makeTranslation(x, bay.height / 2, z)
    .multiply(new Matrix4().makeRotationY(Math.atan2(nx, nz)))
    .multiply(new Matrix4().makeScale(bay.width, bay.height, 1));
}

// ---------------------------------------------------------------------------------------------
// Browser: CanvasTextures

function canvasFrom(width: number, height: number, data: Uint8ClampedArray<ArrayBuffer>) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2D context for a lightmap');
  ctx.putImageData(new ImageData(data, width, height), 0, 0);
  return canvas;
}

function asLightmap(texture: CanvasTexture, name: string): CanvasTexture {
  texture.name = name;
  texture.colorSpace = SRGBColorSpace;
  texture.channel = 0;
  texture.needsUpdate = true;
  return texture;
}

/** One floor lightmap CanvasTexture per room (lightMap.channel 0, the plane's own UVs). */
export function createFloorLightmaps(layout: Layout): Map<Room['id'], CanvasTexture> {
  const out = new Map<Room['id'], CanvasTexture>();
  for (const zone of paintFloorZones(layout)) {
    const texture = new CanvasTexture(canvasFrom(zone.width, zone.height, zone.data));
    out.set(zone.room, asLightmap(texture, `floorPools-${zone.room}`));
  }
  return out;
}

/** The shell's wall-wash tile (base and seams, repeat-wrapped along the wall). */
export function createWallWash(): CanvasTexture {
  const size = WALL_WASH_SIZE;
  const texture = new CanvasTexture(canvasFrom(size, size, wallWashPixels(size)));
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  return asLightmap(texture, 'wallWash');
}

/** The bays' seamless scallop tile (one per bay, clamped). */
export function createBayWash(): CanvasTexture {
  const size = WALL_WASH_SIZE;
  const pixels = wallWashPixels(size, 7, { seams: false });
  const texture = new CanvasTexture(canvasFrom(size, size, pixels));
  texture.wrapS = ClampToEdgeWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  return asLightmap(texture, 'wallWashBay');
}
