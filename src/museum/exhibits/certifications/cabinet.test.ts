import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Matrix4,
  TorusGeometry,
  Vector3,
} from 'three';
import { describe, expect, it } from 'vitest';
import {
  cabinetInstances,
  EMBLEMS,
  MEDALLION,
  PRIMITIVES,
  medallionMatrix,
  medallionYaw,
  placedMatrix,
  RAIL,
  RIM,
  STRAP,
  SWING,
  writeCabinet,
  yawsAt,
  type Primitive,
} from './cabinet';

/** EXPERIENCE §5.3: the wall vitrine slot, local meters. */
const SLOT = { min: [-0.325, -0.325, 0.05], max: [0.325, 0.325, 0.25] };

const GEOMETRY = Object.fromEntries(
  (Object.keys(PRIMITIVES) as Primitive[]).map((kind) => {
    const spec = PRIMITIVES[kind];
    const geometry =
      spec.type === 'cylinder'
        ? new CylinderGeometry(...spec.args)
        : spec.type === 'torus'
          ? new TorusGeometry(...spec.args)
          : new BoxGeometry();
    return [kind, geometry];
  }),
) as unknown as Record<Primitive, BufferGeometry>;

/** Every vertex of the cabinet with the medallions at `yaws`. */
function vertices(
  yaws: readonly number[],
): { kind: Primitive; medallion: number | null; p: Vector3 }[] {
  const instances = cabinetInstances();
  const out: { kind: Primitive; medallion: number | null; p: Vector3 }[] = [];
  for (const kind of Object.keys(instances) as Primitive[]) {
    const position = GEOMETRY[kind].getAttribute('position');
    for (const { medallion, part } of instances[kind]) {
      const frame = medallion === null ? null : medallionMatrix(medallion, yaws[medallion]!);
      const m = placedMatrix(frame, part);
      for (let i = 0; i < position.count; i++) {
        out.push({
          kind,
          medallion,
          p: new Vector3().fromBufferAttribute(position, i).applyMatrix4(m),
        });
      }
    }
  }
  return out;
}

function inSlot(p: Vector3): boolean {
  const v = p.toArray();
  return [0, 1, 2].every((i) => v[i]! >= SLOT.min[i]! - 1e-9 && v[i]! <= SLOT.max[i]! + 1e-9);
}

const DEG = Math.PI / 180;

describe('certifications geometry (EXPERIENCE §4.10)', () => {
  it('hangs three medallions at x -0.21, 0, 0.21 from a 0.60 rail at y 0.24, z 0.08', () => {
    expect(MEDALLION.xs).toEqual([-0.21, 0, 0.21]);
    const rail = vertices([0, 0, 0]).filter((v) => v.medallion === null && v.kind === 'round');
    const xs = rail.map((v) => v.p.x);
    expect(Math.max(...xs)).toBeCloseTo(RAIL.length / 2, 9);
    expect(Math.min(...rail.map((v) => v.p.z))).toBeCloseTo(0.05, 9);
  });

  it('runs each strap from the rail axis down to the medallion top edge', () => {
    const top = MEDALLION.y + MEDALLION.radius;
    expect(top + STRAP.size[1]).toBeCloseTo(RAIL.y, 9);
  });

  it('puts the face toward the visitor with the rim and the emblem in relief on it', () => {
    const front = vertices([0, 0, 0]).filter((v) => v.medallion === 1);
    const zs = (kind: Primitive) => front.filter((v) => v.kind === kind).map((v) => v.p.z);
    const face = MEDALLION.z + MEDALLION.thickness / 2;
    expect(Math.max(...zs('disc'))).toBeCloseTo(face, 9);
    expect(Math.max(...zs('rim'))).toBeCloseTo(face + RIM.tube, 9);
    expect(Math.max(...zs('facet'))).toBeCloseTo(face + 0.004, 4);
    expect(Math.min(...zs('facet'))).toBeCloseTo(face, 9);
  });

  it('keeps each emblem inside its rim', () => {
    for (let i = 0; i < 3; i++) {
      for (const part of EMBLEMS[i]!()) {
        const m = placedMatrix(null, part);
        const position = GEOMETRY[part.kind].getAttribute('position');
        for (let k = 0; k < position.count; k++) {
          const p = new Vector3().fromBufferAttribute(position, k).applyMatrix4(m);
          expect(Math.hypot(p.x, p.y)).toBeLessThan(RIM.radius - RIM.tube);
        }
      }
    }
  });

  it('gives three distinct emblems: 3 lobes and a bar, 4 diamonds, 3 blades and a hub', () => {
    const kinds = EMBLEMS.map((e) =>
      e()
        .map((p) => p.kind)
        .sort()
        .join(','),
    );
    expect(kinds).toEqual([
      'boss,boss,boss,slab',
      'facet,facet,facet,facet',
      'boss,boss,boss,boss',
    ]);
    expect(new Set(kinds).size).toBe(3);
  });

  it('stays inside the wall vitrine slot at rest and at full swing', () => {
    const a = SWING.amplitudeDeg * DEG;
    for (const yaws of [
      [0, 0, 0],
      [a, a, a],
      [-a, -a, -a],
      [a, -a, a],
    ]) {
      expect(vertices(yaws).every((v) => inSlot(v.p))).toBe(true);
    }
  });

  it('stays under 20k triangles (about 3,900)', () => {
    const instances = cabinetInstances();
    let triangles = 0;
    for (const kind of Object.keys(instances) as Primitive[]) {
      const g = GEOMETRY[kind];
      triangles += (g.index!.count / 3) * instances[kind].length;
    }
    expect(triangles).toBeLessThan(5000);
    expect(triangles).toBeGreaterThan(3000);
  });
});

describe('certifications motion (one: the staggered 12 s turn)', () => {
  it('faces front under reduced motion and at t = 0', () => {
    expect(yawsAt(0, false)).toEqual([0, 0, 0]);
    expect(yawsAt(7.3, true)).toEqual([0, 0, 0]);
  });

  it('turns each medallion within +-12 degrees', () => {
    for (let t = 0; t < 60; t += 0.1) {
      for (const yaw of yawsAt(t, false))
        expect(Math.abs(yaw)).toBeLessThanOrEqual(12 * DEG + 1e-12);
    }
  });

  it('offsets each medallion by a third of the 12 s period', () => {
    const t = 40;
    expect(medallionYaw(1, t + 4, false)).toBeCloseTo(medallionYaw(0, t, false), 9);
    expect(medallionYaw(2, t + 8, false)).toBeCloseTo(medallionYaw(0, t, false), 9);
    expect(medallionYaw(0, t + 12, false)).toBeCloseTo(medallionYaw(0, t, false), 9);
    expect(Math.abs(medallionYaw(0, 27, false))).toBeCloseTo(12 * DEG, 9);
  });

  it('starts from rest without a jump', () => {
    expect(medallionYaw(0, 0.01, false)).toBeCloseTo(0, 5);
    expect(medallionYaw(1, 4.01, false)).toBeCloseTo(0, 5);
    expect(medallionYaw(2, 3.9, false)).toBe(0);
  });

  it('writes every instance matrix', () => {
    const instances = cabinetInstances();
    const written: Record<string, number> = {};
    const meshes = Object.fromEntries(
      (Object.keys(instances) as Primitive[]).map((kind) => [
        kind,
        {
          setMatrixAt: (i: number, m: Matrix4) => {
            expect(m.determinant()).not.toBe(0);
            written[kind] = Math.max(written[kind] ?? 0, i + 1);
          },
          instanceMatrix: { needsUpdate: false },
        },
      ]),
    );
    writeCabinet(instances, meshes, [0.1, 0, -0.1]);
    for (const kind of Object.keys(instances)) {
      expect(written[kind]).toBe(instances[kind as Primitive].length);
    }
  });
});
