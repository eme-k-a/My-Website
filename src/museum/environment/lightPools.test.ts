import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import { tokens } from '../../design/tokens';
import { PLINTH_SIZE } from '../exhibits/_kit/anatomy';
import { slotPlacard } from '../exhibits/_kit/placard';
import { ARCH_Z, computeLayout, type Room } from '../rail/layout';
import { lightTargets, rampColor, WASH_BAY_WIDTH, WASH_TITLE_PAD } from './lightPlan';
import {
  ARCH_POOL,
  floorPaint,
  MAX_LIGHTMAP_SIZE,
  paintFloorZones,
  paintZone,
  WALL_WASH_BASE,
  WALL_WASH_PLAIN_V,
  WALL_WASH_SIZE,
  wallWashPixels,
  WASH_PEAK,
  washLayout,
  washMatrix,
  zoneSize,
  type ZoneRaster,
} from './lightPools';

const layout = computeLayout(content, new Date('2026-10-15T00:00:00Z'));
const light = tokens.light;
const room = (id: Room['id']) => layout.rooms.find((r) => r.id === id)!;

/** The sRGB-encoded red byte of the zone pixel holding world [x, z]. */
function byteAt(zone: ZoneRaster, r: Room, x: number, z: number): number {
  const col = Math.min(zone.width - 1, Math.floor((x - r.min[0]) / zone.scale[0]));
  const row = Math.min(zone.height - 1, Math.floor((z - r.min[1]) / zone.scale[1]));
  return zone.data[(row * zone.width + col) * 4]!;
}

describe('floor paint (EXPERIENCE §7.5, ART_DIRECTION §4)', () => {
  const paint = floorPaint(layout);

  it('paints one pool per light target in its temperature, radius 1.6 m, alpha 0.85', () => {
    const pools = paint.pools.filter((p) => p.kind === 'pool');
    expect(pools.map((p) => p.for)).toEqual(lightTargets(layout).map((t) => t.id));
    for (const pool of pools) {
      expect(pool.radius).toBe(light.poolRadius);
      expect(pool.alpha).toBe(light.poolAlpha);
    }
    expect(pools.find((p) => p.for === 'cfia')!.color).toBe(light.ramp[3]);
  });

  it('paints a light-0 threshold pool on the aisle side of every door', () => {
    const doors = paint.pools.filter((p) => p.kind === 'door');
    expect(doors).toHaveLength(layout.doors.length);
    for (const pool of doors) {
      expect(pool).toMatchObject({ radius: 1.2, alpha: 0.35, color: rampColor(0) });
      expect(Math.abs(pool.center[0])).toBeLessThan(3.5);
    }
  });

  it('puts a soft contact patch under every plinth and the desk', () => {
    const plinths = layout.slots.filter((s) => s.plinth !== 'none').map((s) => s.id);
    expect(paint.contacts.map((c) => c.for)).toEqual([...plinths, 'desk']);
    for (const c of paint.contacts) {
      expect(c.soft).toBe(0.25);
      expect(c.darkness).toBe(0.55);
    }
  });
});

describe('floor lightmaps', () => {
  const zones = paintFloorZones(layout);
  const aisle = room('aisle');
  const aisleZone = zones.find((z) => z.room === 'aisle')!;

  it('paints one lightmap per floor zone, no larger than the cap', () => {
    expect(zones.map((z) => z.room)).toEqual(layout.rooms.map((r) => r.id));
    for (const zone of zones) {
      expect(Math.max(zone.width, zone.height)).toBeLessThanOrEqual(MAX_LIGHTMAP_SIZE);
      expect(zone.data).toHaveLength(zone.width * zone.height * 4);
    }
    expect(zoneSize(aisle)).toEqual({ width: aisleZone.width, height: aisleZone.height });
  });

  it('is deterministic (seeded dither, painted from the layout only)', () => {
    const again = paintZone(aisle, floorPaint(layout), 2);
    expect(Buffer.from(again.data).equals(Buffer.from(aisleZone.data))).toBe(true);
  });

  it('lights the pool, darkens under the plinth and leaves the dark floor between', () => {
    const slot = layout.slots.find((s) => s.id === 'verafin')!;
    const [w] = PLINTH_SIZE.standard;
    // Toward the aisle center, just past the contact patch's soft edge: inside the pool.
    const litX =
      slot.position[0] - Math.sign(slot.position[0]) * (w / 2 + light.contactSoftEdge + 0.02);
    const lit = byteAt(aisleZone, aisle, litX, slot.position[2]);
    const under = byteAt(aisleZone, aisle, slot.position[0], slot.position[2]);
    const between = byteAt(aisleZone, aisle, 0, -16 - 3);
    expect(lit).toBeGreaterThan(200);
    expect(under).toBeLessThan(lit * 0.8);
    expect(between).toBeLessThan(100);
  });
});

describe('arch threshold pool (F-032)', () => {
  it('lights the lobby floor in front of the arch, light-0, painted into the lobby zone', () => {
    const arch = floorPaint(layout).pools.filter((p) => p.kind === 'arch');
    expect(arch).toHaveLength(1);
    expect(arch[0]).toMatchObject({
      center: [0, ARCH_Z + ARCH_POOL.dz],
      radius: ARCH_POOL.radius,
      alpha: ARCH_POOL.alpha,
      color: rampColor(0),
    });
    const lobby = room('lobby');
    const zone = paintZone(lobby, floorPaint(layout));
    const center = byteAt(zone, lobby, 0, ARCH_Z + ARCH_POOL.dz);
    const outside = byteAt(zone, lobby, -5.5, 5.5);
    expect(center).toBeGreaterThan(outside + 100);
  });
});

describe('wall wash (EXPERIENCE §7.5)', () => {
  const pixels = wallWashPixels();
  const at = (col: number, row: number) => pixels[(row * WALL_WASH_SIZE + col) * 4]!;
  const mid = WALL_WASH_SIZE / 2;

  it('is one deterministic 256 px tile', () => {
    expect(pixels).toHaveLength(WALL_WASH_SIZE * WALL_WASH_SIZE * 4);
    expect(Buffer.from(wallWashPixels()).equals(Buffer.from(pixels))).toBe(true);
  });

  it('draws the scallop high in the middle, fading toward the floor, and plain bottom rows', () => {
    const scallop = at(mid, Math.round(WALL_WASH_SIZE * 0.2));
    const low = at(mid, Math.round(WALL_WASH_SIZE * 0.8));
    const plain = at(mid, WALL_WASH_SIZE - 2);
    expect(scallop).toBeGreaterThan(low);
    expect(low).toBeGreaterThan(plain);
    expect(Math.abs(plain - at(mid - 40, WALL_WASH_SIZE - 2))).toBeLessThanOrEqual(2);
  });

  it('keeps the scallop peak at WASH_PEAK over the base level (F-025)', () => {
    const toLinear = (byte: number) => {
      const c = byte / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const bay = wallWashPixels(WALL_WASH_SIZE, 7, { seams: false });
    let peak = 0;
    for (let i = 0; i < bay.length; i += 4) peak = Math.max(peak, toLinear(bay[i]!));
    const expected = WALL_WASH_BASE + (1 - WALL_WASH_BASE) * WASH_PEAK;
    expect(peak).toBeLessThanOrEqual(expected * 1.03);
    expect(peak).toBeGreaterThan(expected * 0.85);
    expect(WASH_PEAK).toBeLessThan(0.5);
  });

  it('leaves the plain rows the shell samples undithered: no per-column noise (F-026)', () => {
    const row = Math.round(WALL_WASH_SIZE * (1 - WALL_WASH_PLAIN_V));
    const values = new Set<number>();
    // Away from the seams every column of a plain row has the same byte.
    for (let col = 8; col < WALL_WASH_SIZE - 8; col++) values.add(at(col, row));
    expect(values.size).toBe(1);
    // The bay tile's plain rows match it.
    const bay = wallWashPixels(WALL_WASH_SIZE, 7, { seams: false });
    expect(bay[(row * WALL_WASH_SIZE + mid) * 4]).toBe(at(mid, row));
  });

  it('bakes a darker panel seam at both tile edges (every 2 m on the wall)', () => {
    const row = WALL_WASH_SIZE - 2;
    expect(at(0, row)).toBeLessThan(at(mid, row));
    expect(at(WALL_WASH_SIZE - 1, row)).toBeLessThan(at(mid, row));
  });

  it('hangs one bay per target on its wall, the first bay of a wall setting its seam grid', () => {
    const { bays, seams } = washLayout(layout);
    expect(bays.map((b) => b.for)).toEqual(lightTargets(layout).map((t) => t.id));
    for (const line of seams) {
      const first = bays.find(
        (b) => b.bay.axis === line.axis && Math.abs(b.bay.at - line.at) < 1e-6,
      )!;
      const edge = (((first.bay.center - 1 - line.phase) % 2) + 2) % 2;
      expect(Math.min(edge, 2 - edge), `${line.axis} ${line.at}`).toBeLessThan(1e-9);
    }
  });

  it('centers each plinth bay on its wall title and sizes it to cover the title (F-027)', () => {
    const { bays } = washLayout(layout);
    for (const slot of layout.slots.filter((s) => s.mount === 'plinth')) {
      const { bay } = bays.find((b) => b.for === slot.id)!;
      const title = slotPlacard(layout, slot);
      expect(bay.center, slot.id).toBeCloseTo(title.position[2], 9);
      expect(bay.width, slot.id).toBeGreaterThanOrEqual(WASH_BAY_WIDTH);
      const room = layout.rooms.find(
        (r) =>
          slot.position[0] >= r.min[0] &&
          slot.position[0] <= r.max[0] &&
          slot.position[2] >= r.min[1] &&
          slot.position[2] <= r.max[1],
      )!;
      // Inside its wall; as wide as the title plus the pad unless the wall ends trim it.
      expect(bay.center - bay.width / 2, slot.id).toBeGreaterThanOrEqual(room.min[1] - 1e-9);
      expect(bay.center + bay.width / 2, slot.id).toBeLessThanOrEqual(room.max[1] + 1e-9);
      const fits = Math.min(bay.center - room.min[1], room.max[1] - bay.center) * 2;
      const wanted = Math.max(WASH_BAY_WIDTH, title.width + WASH_TITLE_PAD);
      expect(bay.width, slot.id).toBeCloseTo(Math.min(wanted, fits), 9);
    }
    expect(bays.find((b) => b.for === 'verafin')!.bay.center).toBeCloseTo(-11.6956, 3);
    // The portrait and the desk keep one 2 m panel.
    expect(bays.find((b) => b.for === 'portrait')!.bay.width).toBe(WASH_BAY_WIDTH);
    expect(bays.find((b) => b.for === 'desk')!.bay.width).toBe(WASH_BAY_WIDTH);
  });

  it('gives the bays a seamless tile with the same base level as the shell', () => {
    const bay = wallWashPixels(WALL_WASH_SIZE, 7, { seams: false });
    const row = WALL_WASH_SIZE - 2;
    const px = (col: number) => bay[(row * WALL_WASH_SIZE + col) * 4]!;
    expect(Math.abs(px(0) - px(mid))).toBeLessThanOrEqual(1);
    expect(Math.abs(px(WALL_WASH_SIZE - 1) - px(mid))).toBeLessThanOrEqual(1);
    expect(Math.abs(px(mid) - at(mid, row))).toBeLessThanOrEqual(1);
  });

  it('turns each bay plane to face into its room, just off the wall', () => {
    const { bays } = washLayout(layout);
    const verafin = bays.find((b) => b.for === 'verafin')!;
    const m = washMatrix(verafin.bay);
    const normal = new Vector3(0, 0, 1).transformDirection(m);
    expect(normal.x).toBeCloseTo(-1, 6);
    const center = new Vector3().applyMatrix4(m);
    expect(center.x).toBeLessThan(3.5);
    expect(center.x).toBeGreaterThan(3.49);
    expect(center.y).toBeCloseTo(verafin.bay.height / 2, 6);
  });
});
