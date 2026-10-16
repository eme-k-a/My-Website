import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { content } from '../../content/index';
import { tokens } from '../../design/tokens';
import { PLINTH_SIZE } from '../exhibits/_kit/anatomy';
import { computeLayout, type Room } from '../rail/layout';
import { lightTargets, rampColor } from './lightPlan';
import {
  floorPaint,
  MAX_LIGHTMAP_SIZE,
  paintFloorZones,
  paintZone,
  WALL_WASH_SIZE,
  wallWashPixels,
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

  it('bakes a darker panel seam at both tile edges (every 2 m on the wall)', () => {
    const row = WALL_WASH_SIZE - 2;
    expect(at(0, row)).toBeLessThan(at(mid, row));
    expect(at(WALL_WASH_SIZE - 1, row)).toBeLessThan(at(mid, row));
  });

  it('hangs one bay per target on its wall, edges on the wall line seam grid', () => {
    const { bays, seams } = washLayout(layout);
    expect(bays.map((b) => b.for)).toEqual(lightTargets(layout).map((t) => t.id));
    for (const { bay } of bays) {
      const line = seams.find((s) => s.axis === bay.axis && Math.abs(s.at - bay.at) < 1e-6)!;
      const edge = (((bay.center - 1 - line.phase) % 2) + 2) % 2;
      expect(Math.min(edge, 2 - edge), `${bay.axis} ${bay.at}`).toBeLessThan(1e-9);
    }
    expect(bays.find((b) => b.for === 'verafin')!.bay.center).toBeCloseTo(-10, 9);
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
