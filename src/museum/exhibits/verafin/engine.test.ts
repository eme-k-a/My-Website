import { BoxGeometry, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  AXIS,
  BAR_COUNT,
  barCell,
  barHeights,
  CARTRIDGE,
  cartridgePlacement,
  COLLAR,
  COLUMN,
  COLUMN_CENTER_Y,
  columnProgress,
  CONDUIT,
  conduitPlacement,
  CORE,
  createRefreshDriver,
  easeInOutCubic,
  GRID,
  gridFootprint,
  heightsAt,
  REFRESH,
  refreshPhase,
  SWEEP_S,
  TRAY,
  TRAY_TOP,
} from './engine';

/** EXPERIENCE §4: the standard slot, local meters. */
const SLOT = { min: [-0.325, 0.025, -0.325], max: [0.325, 0.675, 0.325] };

/** Corners of a box of `size` centered at `center`, yawed by `rotationY`. */
function corners(size: number[], center: number[], rotationY = 0): Vector3[] {
  const m = new Matrix4().makeRotationY(rotationY).setPosition(center[0]!, center[1]!, center[2]!);
  const out: Vector3[] = [];
  for (const sx of [-0.5, 0.5])
    for (const sy of [-0.5, 0.5])
      for (const sz of [-0.5, 0.5])
        out.push(new Vector3(sx * size[0]!, sy * size[1]!, sz * size[2]!).applyMatrix4(m));
  return out;
}

function inSlot(p: Vector3): boolean {
  const v = p.toArray();
  return [0, 1, 2].every((i) => v[i]! >= SLOT.min[i]! - 1e-9 && v[i]! <= SLOT.max[i]! + 1e-9);
}

describe('verafin geometry (EXPERIENCE §4.1)', () => {
  it('stands the column, conduit and bars on the tray top at y 0.055', () => {
    expect(TRAY_TOP).toBeCloseTo(0.055, 9);
    expect(COLUMN_CENTER_Y - COLUMN.height / 2).toBeCloseTo(0.055, 9);
    expect(COLUMN_CENTER_Y + COLUMN.height / 2).toBeCloseTo(0.515, 9);
    expect(CORE.height).toBeLessThan(COLUMN.height);
    expect(CORE.glow).toBe(0.35);
  });

  it('keeps every part inside the standard slot', () => {
    const points: Vector3[] = [
      ...corners(TRAY.size, TRAY.center),
      ...[0, 1, 2, 3].map(
        (q) =>
          new Vector3(
            AXIS.x + COLUMN.radius * Math.cos((q * Math.PI) / 2),
            COLUMN_CENTER_Y + (q % 2 ? 0.5 : -0.5) * COLUMN.height,
            AXIS.z + COLUMN.radius * Math.sin((q * Math.PI) / 2),
          ),
      ),
      ...CARTRIDGE.azimuthsDeg.flatMap((deg) => {
        const { position, rotationY } = cartridgePlacement(deg);
        return corners(CARTRIDGE.size, position, rotationY);
      }),
      ...(() => {
        const c = conduitPlacement();
        return corners(CONDUIT.size, c.position, c.rotationY);
      })(),
    ];
    const grid = gridFootprint();
    for (const x of [grid.minX, grid.maxX])
      for (const z of [grid.minZ, grid.maxZ])
        points.push(new Vector3(x, TRAY_TOP + GRID.maxHeight, z));
    for (const p of points) expect(inSlot(p), p.toArray().join(', ')).toBe(true);
  });

  it('docks exactly three cartridges at 90, 210 and 330 degrees, from the glass through the collar', () => {
    expect(CARTRIDGE.azimuthsDeg).toEqual([90, 210, 330]);
    for (const deg of CARTRIDGE.azimuthsDeg) {
      const { position, rotationY } = cartridgePlacement(deg);
      const radial = Math.hypot(position[0] - AXIS.x, position[2] - AXIS.z);
      expect(radial - CARTRIDGE.size[0] / 2).toBeCloseTo(COLUMN.radius, 9);
      expect(radial + CARTRIDGE.size[0] / 2).toBeCloseTo(0.14, 9);
      // Its local +X (the radial edge) points away from the axis.
      const dir = new Vector3(1, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), rotationY);
      expect(dir.x).toBeCloseTo(Math.cos((deg * Math.PI) / 180), 9);
      expect(dir.z).toBeCloseTo(Math.sin((deg * Math.PI) / 180), 9);
      // The collar tube (radially 0.070 to 0.086, y 0.292 to 0.308) runs through the cartridge.
      expect(COLLAR.radius - COLLAR.tube).toBeCloseTo(COLUMN.radius, 9);
      expect(position[1] - CARTRIDGE.size[1] / 2).toBeLessThan(COLLAR.y - COLLAR.tube);
      expect(position[1] + CARTRIDGE.size[1] / 2).toBeGreaterThan(COLLAR.y + COLLAR.tube);
    }
    // 90 degrees is local +Z: the cartridge facing the camera.
    expect(cartridgePlacement(90).position[2]).toBeGreaterThan(AXIS.z);
  });

  it('runs the conduit from inside the column base to the first bar column', () => {
    const c = conduitPlacement();
    expect(Math.hypot(c.end[0] - c.start[0], c.end[1] - c.start[1])).toBeCloseTo(
      CONDUIT.size[0],
      9,
    );
    expect(c.position[1] - CONDUIT.size[1] / 2).toBeCloseTo(TRAY_TOP, 9);
    // The start (with its full width) is inside the column footprint.
    const startCorners = corners(CONDUIT.size, c.position, c.rotationY).filter(
      (p) => Math.hypot(p.x - AXIS.x, p.z - AXIS.z) < 0.1,
    );
    expect(startCorners.length).toBe(4);
    for (const p of startCorners)
      expect(Math.hypot(p.x - AXIS.x, p.z - AXIS.z)).toBeLessThan(COLUMN.radius);
    // The far corner touches the grid's left edge, alongside a bar of the first column.
    const xs = corners(CONDUIT.size, c.position, c.rotationY).map((p) => p.x);
    expect(Math.max(...xs)).toBeCloseTo(gridFootprint().minX, 9);
  });

  it('lays the 6 x 6 grid on a 0.048 pitch around (0.12, 0.06), 0.278 m square', () => {
    expect(BAR_COUNT).toBe(36);
    const grid = gridFootprint();
    expect(grid.maxX - grid.minX).toBeCloseTo(0.278, 9);
    expect(grid.maxZ - grid.minZ).toBeCloseTo(0.278, 9);
    expect(barCell(0)).toMatchObject({ col: 0, row: 0 });
    expect(barCell(35)).toMatchObject({ col: 5, row: 5 });
    expect(barCell(1).x - barCell(0).x).toBeCloseTo(GRID.pitch, 9);
    // Columns run left to right (+X), rows from the back toward the camera (+Z).
    expect(barCell(GRID.n).z - barCell(0).z).toBeCloseTo(GRID.pitch, 9);
  });
});

describe('verafin report refresh (the one motion)', () => {
  it('draws every set from the seeded rng: deterministic, in range, different per set', () => {
    for (const set of [0, 1, 2, 7, 1000]) {
      const a = barHeights(set);
      expect(Array.from(a)).toEqual(Array.from(barHeights(set)));
      for (const h of a) {
        expect(h).toBeGreaterThanOrEqual(GRID.minHeight);
        expect(h).toBeLessThanOrEqual(GRID.maxHeight);
      }
    }
    expect(Array.from(barHeights(0))).not.toEqual(Array.from(barHeights(1)));
  });

  it('holds set 0 for the first period, then sweeps every 8 s over 1.6 s plus the stagger', () => {
    expect(refreshPhase(0)).toEqual({ set: 0, elapsed: 0, easing: false });
    expect(refreshPhase(-3).set).toBe(0);
    expect(refreshPhase(7.99).easing).toBe(false);
    expect(refreshPhase(8)).toMatchObject({ set: 1, easing: true });
    expect(SWEEP_S).toBeCloseTo(REFRESH.easeS + 5 * REFRESH.staggerS, 9);
    expect(refreshPhase(8 + SWEEP_S - 0.001).easing).toBe(true);
    expect(refreshPhase(8 + SWEEP_S).easing).toBe(false);
    expect(refreshPhase(16.5)).toMatchObject({ set: 2, easing: true });
    expect(REFRESH.periodS).toBe(8);
  });

  it('eases with easeInOutCubic, each column 40 ms after the one to its left', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 9);
    expect(easeInOutCubic(1)).toBe(1);
    expect(columnProgress(0.04, 1)).toBe(0);
    expect(columnProgress(0.04 + 0.8, 1)).toBeCloseTo(0.5, 9);
    expect(columnProgress(0.2 + 1.6, 5)).toBe(1);
    const mid = 0.9;
    for (let col = 1; col < GRID.n; col++)
      expect(columnProgress(mid, col)).toBeLessThan(columnProgress(mid, col - 1));
  });

  it('shows set 0 at t = 0 (the reduced-motion and ?test=1 pose) and lands on each set', () => {
    expect(Array.from(heightsAt(0))).toEqual(Array.from(barHeights(0)));
    expect(Array.from(heightsAt(8))).toEqual(Array.from(barHeights(0)));
    expect(Array.from(heightsAt(8 + SWEEP_S))).toEqual(Array.from(barHeights(1)));
    expect(Array.from(heightsAt(23.9))).toEqual(Array.from(barHeights(2)));
  });
});

describe('createRefreshDriver', () => {
  const mesh = () =>
    new InstancedMesh(new BoxGeometry(GRID.bar, 1, GRID.bar), undefined, BAR_COUNT);
  const heightOf = (m: InstancedMesh, i: number) => {
    const matrix = new Matrix4();
    m.getMatrixAt(i, matrix);
    const position = new Vector3();
    const scale = new Vector3();
    matrix.decompose(position, new Quaternion(), scale);
    return { h: scale.y, bottom: position.y - scale.y / 2, x: position.x, z: position.z };
  };

  it('writes set 0 once and then nothing while the clock holds still', () => {
    const m = mesh();
    const driver = createRefreshDriver();
    driver.prepare(m);
    expect(driver.apply(m, 0, false)).toBe(true);
    expect(driver.apply(m, 0, false)).toBe(false);
    expect(driver.apply(m, 5, false)).toBe(false);
    const set0 = barHeights(0);
    for (const i of [0, 7, 35]) {
      const bar = heightOf(m, i);
      expect(bar.h).toBeCloseTo(set0[i]!, 6);
      expect(bar.bottom).toBeCloseTo(TRAY_TOP, 6);
      expect(bar.x).toBeCloseTo(barCell(i).x, 6);
      expect(bar.z).toBeCloseTo(barCell(i).z, 6);
    }
  });

  it('writes every frame of a sweep, then holds the new set', () => {
    const m = mesh();
    const driver = createRefreshDriver();
    driver.apply(m, 0, false);
    expect(driver.apply(m, 8.5, false)).toBe(true);
    expect(driver.apply(m, 8.5, false)).toBe(false);
    expect(driver.apply(m, 8.6, false)).toBe(true);
    expect(driver.apply(m, 10, false)).toBe(true);
    expect(driver.apply(m, 11, false)).toBe(false);
    expect(heightOf(m, 0).h).toBeCloseTo(barHeights(1)[0]!, 6);
  });

  it('pins set 0 under reduced motion whatever the clock says', () => {
    const m = mesh();
    const driver = createRefreshDriver();
    driver.apply(m, 13, false);
    expect(heightOf(m, 3).h).toBeCloseTo(barHeights(1)[3]!, 6);
    expect(driver.apply(m, 13, true)).toBe(true);
    expect(driver.apply(m, 21, true)).toBe(false);
    expect(heightOf(m, 3).h).toBeCloseTo(barHeights(0)[3]!, 6);
  });

  it('sizes the bounding sphere for the tallest bars', () => {
    const m = mesh();
    const driver = createRefreshDriver();
    driver.prepare(m);
    const sphere = m.boundingSphere!;
    const grid = gridFootprint();
    for (const x of [grid.minX, grid.maxX])
      for (const z of [grid.minZ, grid.maxZ])
        expect(sphere.containsPoint(new Vector3(x, TRAY_TOP + GRID.maxHeight, z))).toBe(true);
  });
});
