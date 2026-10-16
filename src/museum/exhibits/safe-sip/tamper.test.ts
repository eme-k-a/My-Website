import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Matrix4,
  TorusGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { describe, expect, it } from 'vitest';
import manifest from './index';
import {
  BASE,
  BASE_TOP,
  BOARD,
  CHIP,
  COVER_PHI,
  CUP,
  cupGeometry,
  cupRadiusAt,
  GIMBAL,
  GIZMO,
  GIZMO_AXES,
  gizmoArcMatrix,
  gizmoArcPoints,
  gizmoConeMatrix,
  GLOW,
  GLOW_RAMP_S,
  glowAt,
  layerRadius,
  LID,
  LID_Y,
  lidCoverProfile,
  lidFloorProfile,
  lidGeometry,
  OBJECT_YAW,
  PADS,
  padCenters,
  PERIOD_S,
  pinPlacements,
  pitchAt,
  PIVOT,
  POSE,
  poseAt,
  POST,
  rollAt,
  stepBlend,
  TAMPER_RING,
  tamperRingTurn,
  THRESHOLD,
} from './tamper';

const DEG = Math.PI / 180;
const SLOT = { min: [-0.325, 0.025, -0.325], max: [0.325, 0.675, 0.325] } as const;

function triangles(geometry: BufferGeometry): number {
  const count = geometry.index ? geometry.index.count : geometry.getAttribute('position').count;
  return count / 3;
}

/** Lathe angle of a lid-frame point from the wedge's center line, in (-pi, pi]. */
function wedgeAngle(v: Vector3): number {
  const phi = Math.atan2(v.x, v.z) - LID.cutCenter;
  return Math.atan2(Math.sin(phi), Math.cos(phi));
}

function vertices(geometry: BufferGeometry, matrix = new Matrix4()): Vector3[] {
  const position = geometry.getAttribute('position');
  const out: Vector3[] = [];
  for (let i = 0; i < position.count; i++) {
    out.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(matrix));
  }
  return out;
}

/** Exhibit-frame matrix of the rocking (cup and lid) frame at a pose, plus a local offset. */
function rockerMatrix(roll: number, pitch: number, offsetY: number): Matrix4 {
  return new Matrix4()
    .makeTranslation(...PIVOT)
    .multiply(new Matrix4().makeRotationX(pitch))
    .multiply(new Matrix4().makeRotationZ(roll))
    .multiply(new Matrix4().makeTranslation(0, offsetY, 0));
}

/** Every vertex that rocks (cup, lid, tamper ring) at a pose. */
function rockingVertices(roll: number, pitch: number): Vector3[] {
  const ring = new TorusGeometry(TAMPER_RING.radius, TAMPER_RING.tube, 6, 36, COVER_PHI.length)
    .rotateX(Math.PI / 2)
    .rotateY(tamperRingTurn());
  return [
    ...vertices(cupGeometry(), rockerMatrix(roll, pitch, CUP.bottomY - PIVOT[1])),
    ...vertices(lidGeometry(), rockerMatrix(roll, pitch, LID_Y - PIVOT[1])),
    ...vertices(ring, rockerMatrix(roll, pitch, LID_Y - PIVOT[1] + TAMPER_RING.y)),
  ];
}

const POSES = [
  { roll: POSE.roll, pitch: POSE.pitch },
  ...Array.from({ length: 36 }, (_, i) => {
    const t = (i * PERIOD_S) / 36;
    return { roll: rollAt(t), pitch: pitchAt(t) };
  }),
  { roll: 9 * DEG, pitch: 6 * DEG },
  { roll: -9 * DEG, pitch: -6 * DEG },
  { roll: 10 * DEG, pitch: -6 * DEG },
];

describe('safe-sip manifest', () => {
  it('declares the brief budget and one slow motion', () => {
    expect(manifest.id).toBe('safe-sip');
    expect(manifest.title).toBe('Tamper Evident');
    expect(manifest.budget).toEqual({ triangles: 9000, drawCalls: 14, textureMB: 0 });
    expect(manifest.motion).toBe('slow');
  });
});

describe('safe-sip measurements (EXPERIENCE §4.7)', () => {
  it('base disc sits on the slot floor', () => {
    expect(BASE.radius).toBe(0.2);
    expect(BASE.center).toEqual([0, 0.04, 0]);
    expect(BASE_TOP).toBeCloseTo(0.055, 6);
    expect(BASE.center[1] - BASE.height / 2).toBeCloseTo(SLOT.min[1], 6);
  });

  it('cup hangs from y 0.10 to 0.36 with the spec radii and 48 segments', () => {
    expect(CUP.bottomY).toBe(0.1);
    expect(CUP.bottomY + CUP.height).toBeCloseTo(0.36, 6);
    expect(cupRadiusAt(0)).toBe(0.075);
    expect(cupRadiusAt(CUP.height)).toBeCloseTo(0.095, 6);
    expect(CUP.segments).toBe(48);
  });

  it('lid is ten 3 mm print layers stepping in, 0.03 tall, on the cup rim', () => {
    expect(LID.layers * LID.layer).toBeCloseTo(LID.height, 9);
    expect(LID.layer).toBe(0.003);
    expect(layerRadius(0)).toBe(0.1);
    for (let i = 1; i < LID.layers; i++) {
      expect(layerRadius(i)).toBeLessThan(layerRadius(i - 1));
    }
    expect(LID_Y).toBeCloseTo(0.36, 6);
    // Every horizontal step in the profile is a real 3 mm riser (geometry, not a shader).
    const risers = [...lidFloorProfile(), ...lidCoverProfile()]
      .map(([, y]) => y)
      .filter((y, i, all) => i > 0 && y !== all[i - 1]);
    expect(risers.length).toBeGreaterThanOrEqual(LID.layers);
  });

  it('the cover spans 270 degrees and leaves a 90 degree wedge facing the camera', () => {
    expect(COVER_PHI.length).toBeCloseTo((270 * Math.PI) / 180, 9);
    // After the object's turn, the wedge's center line is exhibit +Z.
    const center = new Vector3(Math.sin(LID.cutCenter), 0, Math.cos(LID.cutCenter));
    center.applyAxisAngle(new Vector3(0, 1, 0), OBJECT_YAW);
    expect(center.z).toBeCloseTo(1, 9);
    const floorTop = LID.floorLayers * LID.layer;
    const lid = lidGeometry();
    for (const v of vertices(lid)) {
      if (v.y <= floorTop + 1e-6) continue;
      const r = Math.hypot(v.x, v.z);
      if (r < 1e-6) continue;
      expect(Math.abs(wedgeAngle(v))).toBeGreaterThanOrEqual(Math.PI / 4 - 1e-6);
    }
  });

  it('the tamper ring lies on the lid top, inside its edge', () => {
    expect(TAMPER_RING.radius).toBe(0.085);
    expect(TAMPER_RING.tube).toBe(0.003);
    expect(TAMPER_RING.y - TAMPER_RING.tube).toBeCloseTo(LID.height, 9);
    expect(TAMPER_RING.radius + TAMPER_RING.tube).toBeLessThan(layerRadius(LID.layers - 1));
    expect(TAMPER_RING.radius - TAMPER_RING.tube).toBeGreaterThan(LID.pocketRadius);
    // Laid flat and turned onto the cover: no part of it crosses the open wedge.
    const ring = new TorusGeometry(TAMPER_RING.radius, TAMPER_RING.tube, 6, 36, COVER_PHI.length)
      .rotateX(Math.PI / 2)
      .rotateY(tamperRingTurn());
    const tubeAngle = TAMPER_RING.tube / TAMPER_RING.radius;
    let nearest = Infinity;
    for (const v of vertices(ring)) {
      expect(Math.abs(v.y)).toBeLessThanOrEqual(TAMPER_RING.tube + 1e-9);
      nearest = Math.min(nearest, Math.abs(wedgeAngle(v)));
    }
    expect(nearest).toBeGreaterThanOrEqual(Math.PI / 4 - tubeAngle - 1e-6);
    expect(nearest).toBeLessThan(Math.PI / 4 + 0.01);
  });

  it('board, pads and sensor sit on the lid floor inside the wedge and the pocket', () => {
    expect(BOARD.size).toEqual([0.06, 0.004, 0.024]);
    expect(CHIP.size).toEqual([0.008, 0.002, 0.008]);
    expect(PADS.count).toBe(20);
    const floorTop = LID.floorLayers * LID.layer;
    expect(BOARD.center[1] - BOARD.size[1] / 2).toBeCloseTo(floorTop, 9);
    expect(CHIP.center[1] - CHIP.size[1] / 2).toBeCloseTo(BOARD.center[1] + BOARD.size[1] / 2, 9);
    const corners: [number, number][] = [];
    const boxes: { c: readonly number[]; s: readonly number[] }[] = [
      { c: BOARD.center, s: BOARD.size },
      { c: CHIP.center, s: CHIP.size },
      ...padCenters().map((c) => ({ c, s: PADS.size })),
    ];
    for (const { c, s } of boxes) {
      expect(c[1]! - s[1]! / 2).toBeGreaterThanOrEqual(floorTop - 1e-9);
      expect(c[1]! + s[1]! / 2).toBeLessThan(LID.height - LID.topPlate);
      for (const dx of [-1, 1]) {
        for (const dz of [-1, 1])
          corners.push([c[0]! + (dx * s[0]!) / 2, c[2]! + (dz * s[2]!) / 2]);
      }
    }
    expect(padCenters()).toHaveLength(PADS.count);
    for (const [x, z] of corners) {
      expect(Math.hypot(x, z)).toBeLessThan(LID.pocketRadius);
      expect(Math.abs(Math.atan2(x, z))).toBeLessThan(Math.PI / 4);
    }
  });

  it('pins join posts to the ring and the ring to the cup wall', () => {
    const pins = pinPlacements();
    expect(pins).toHaveLength(4);
    for (const pin of pins) {
      const along = pin.axis === 'x' ? pin.center[0] : pin.center[2];
      const from = Math.abs(along) - pin.length / 2;
      const to = Math.abs(along) + pin.length / 2;
      if (pin.axis === 'x') {
        expect(from).toBeLessThanOrEqual(GIMBAL.radius);
        expect(to).toBeGreaterThanOrEqual(POST.x);
      } else {
        expect(from).toBeLessThanOrEqual(cupRadiusAt(PIVOT[1] - CUP.bottomY));
        expect(to).toBeGreaterThanOrEqual(GIMBAL.radius - GIMBAL.tube);
      }
    }
    expect(POST.bottom).toBeCloseTo(BASE_TOP, 9);
    expect(POST.top).toBeGreaterThan(PIVOT[1]);
  });
});

describe('safe-sip geometry', () => {
  it('every lathe triangle faces the way its normals point', () => {
    for (const geometry of [cupGeometry(), lidGeometry()]) {
      const p = geometry.getAttribute('position');
      const n = geometry.getAttribute('normal');
      const index = geometry.index!;
      const a = new Vector3();
      const b = new Vector3();
      const c = new Vector3();
      const face = new Vector3();
      const normal = new Vector3();
      for (let i = 0; i < index.count; i += 3) {
        const [ia, ib, ic] = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
        a.fromBufferAttribute(p, ia);
        b.fromBufferAttribute(p, ib);
        c.fromBufferAttribute(p, ic);
        face.subVectors(b, a).cross(c.clone().sub(a));
        normal
          .fromBufferAttribute(n, ia)
          .add(new Vector3().fromBufferAttribute(n, ib))
          .add(new Vector3().fromBufferAttribute(n, ic));
        expect(face.dot(normal)).toBeGreaterThan(0);
      }
    }
  });

  it('stays inside the 9,000 triangle budget (spec estimate about 6,500)', () => {
    const parts = {
      base: triangles(new CylinderGeometry(1, 1, 1, BASE.segments)),
      posts: 2 * triangles(new CylinderGeometry(1, 1, 1, POST.segments)),
      pins: 4 * triangles(new CylinderGeometry(1, 1, 1, 12)),
      gimbal: triangles(new TorusGeometry(1, 0.1, GIMBAL.radialSegments, GIMBAL.tubularSegments)),
      cup: triangles(cupGeometry()),
      lid: triangles(lidGeometry()),
      board: triangles(new BoxGeometry()),
      pads: PADS.count * triangles(new BoxGeometry()),
      chip: triangles(new BoxGeometry()),
      ring: triangles(
        new TorusGeometry(1, 0.1, TAMPER_RING.radialSegments, TAMPER_RING.tubularSegments),
      ),
      arcs: 3 * triangles(new TorusGeometry(1, 0.1, GIZMO.radialSegments, GIZMO.tubularSegments)),
      cones: 3 * triangles(new ConeGeometry(1, 1, GIZMO.cone.segments)),
    };
    const total = Object.values(parts).reduce((sum, n) => sum + n, 0);
    expect(total).toBeLessThanOrEqual(manifest.budget.triangles);
    expect(total).toBeGreaterThan(4000);
  });

  it('fits the standard slot in every pose of the cycle', () => {
    const fixed: Vector3[] = [
      new Vector3(BASE.radius, BASE.center[1] - BASE.height / 2, 0),
      new Vector3(-BASE.radius, BASE.center[1] + BASE.height / 2, BASE.radius),
      ...GIZMO_AXES.flatMap((axis) => gizmoArcPoints(axis)),
      ...GIZMO_AXES.flatMap((axis) =>
        vertices(new ConeGeometry(GIZMO.cone.radius, GIZMO.cone.height, 12), gizmoConeMatrix(axis)),
      ),
    ];
    const tol = 1e-6;
    const turn = new Matrix4().makeRotationY(OBJECT_YAW);
    for (const { roll, pitch } of POSES) {
      for (const point of [...fixed, ...rockingVertices(roll, pitch)]) {
        const v = point.clone().applyMatrix4(turn);
        expect(v.x).toBeGreaterThanOrEqual(SLOT.min[0] - tol);
        expect(v.x).toBeLessThanOrEqual(SLOT.max[0] + tol);
        expect(v.y).toBeGreaterThanOrEqual(SLOT.min[1] - tol);
        expect(v.y).toBeLessThanOrEqual(SLOT.max[1] + tol);
        expect(v.z).toBeGreaterThanOrEqual(SLOT.min[2] - tol);
        expect(v.z).toBeLessThanOrEqual(SLOT.max[2] + tol);
      }
    }
  });

  it('the rocking cup and lid never touch the gizmo, the gimbal ring or the base', () => {
    const arcPoints = GIZMO_AXES.flatMap((axis) => gizmoArcPoints(axis, 96));
    const conePoints = GIZMO_AXES.flatMap((axis) =>
      vertices(new ConeGeometry(GIZMO.cone.radius, GIZMO.cone.height, 12), gizmoConeMatrix(axis)),
    );
    let arcGap = Infinity;
    let ringGap = Infinity;
    let lowest = Infinity;
    for (const { roll, pitch } of POSES) {
      const pitchFrame = new Matrix4()
        .makeTranslation(...PIVOT)
        .multiply(new Matrix4().makeRotationX(pitch));
      const toPitch = pitchFrame.clone().invert();
      for (const v of rockingVertices(roll, pitch)) {
        for (const a of arcPoints) arcGap = Math.min(arcGap, v.distanceTo(a) - GIZMO.tube);
        for (const c of conePoints) arcGap = Math.min(arcGap, v.distanceTo(c));
        // Distance to the gimbal ring's tube, measured in the ring's own (pitched) frame.
        const local = v.clone().applyMatrix4(toPitch);
        const radial = Math.hypot(local.x, local.z) - GIMBAL.radius;
        ringGap = Math.min(ringGap, Math.hypot(radial, local.y) - GIMBAL.tube);
        lowest = Math.min(lowest, v.y);
      }
    }
    expect(arcGap).toBeGreaterThan(0.005);
    expect(ringGap).toBeGreaterThan(0.005);
    expect(lowest).toBeGreaterThan(BASE_TOP + 0.01);
  });

  it('the gizmo has three quarter arcs, one per axis, with arrowheads at their ends', () => {
    expect(GIZMO_AXES).toEqual(['roll', 'pitch', 'yaw']);
    expect(GIZMO.arc).toBeCloseTo(Math.PI / 2, 9);
    const center = new Vector3(...GIZMO.center);
    const normals = GIZMO_AXES.map((axis) => {
      const m = gizmoArcMatrix(axis);
      const points = gizmoArcPoints(axis, 8);
      for (const p of points) expect(p.distanceTo(center)).toBeCloseTo(GIZMO.radius, 9);
      // The arc's plane normal is the axis it turns about.
      return new Vector3(0, 0, 1).transformDirection(m);
    });
    expect(Math.abs(normals[0]!.z)).toBeCloseTo(1, 9);
    expect(Math.abs(normals[1]!.x)).toBeCloseTo(1, 9);
    expect(Math.abs(normals[2]!.y)).toBeCloseTo(1, 9);
    for (const axis of GIZMO_AXES) {
      const end = gizmoArcPoints(axis, 8).at(-1)!;
      const cone = new Vector3().setFromMatrixPosition(gizmoConeMatrix(axis));
      expect(cone.distanceTo(end)).toBeCloseTo(GIZMO.cone.height / 2, 9);
    }
  });
});

describe('safe-sip motion (one, 9 s)', () => {
  it('rocks with the spec amplitudes and a 9 s period', () => {
    for (let t = 0; t < 20; t += 0.37) {
      expect(rollAt(t + PERIOD_S)).toBeCloseTo(rollAt(t), 9);
      expect(pitchAt(t + PERIOD_S)).toBeCloseTo(pitchAt(t), 9);
      expect(Math.abs(rollAt(t))).toBeLessThanOrEqual(9 * DEG + 1e-12);
      expect(Math.abs(pitchAt(t))).toBeLessThanOrEqual(6 * DEG + 1e-12);
    }
    expect(rollAt(PERIOD_S / 4)).toBeCloseTo(9 * DEG, 9);
    expect(pitchAt(0)).toBeCloseTo(6 * DEG * Math.sin(Math.PI / 4), 9);
  });

  it('the ring lights only while |roll| is past 8 degrees, up to 1.6', () => {
    let peak = 0;
    for (let t = 0; t < PERIOD_S; t += 0.005) {
      const g = glowAt(t);
      if (Math.abs(rollAt(t)) <= THRESHOLD) expect(g).toBeCloseTo(GLOW.rest, 9);
      expect(g).toBeGreaterThanOrEqual(GLOW.rest - 1e-12);
      expect(g).toBeLessThanOrEqual(GLOW.peak + 1e-12);
      peak = Math.max(peak, g);
    }
    expect(peak).toBeCloseTo(GLOW.peak, 6);
    expect(glowAt(PERIOD_S / 4)).toBeCloseTo(GLOW.peak, 9);
  });

  it('glow ramps take at least 0.5 s (EXPERIENCE §10.4)', () => {
    expect(GLOW_RAMP_S).toBeGreaterThanOrEqual(0.5);
    const dt = 0.001;
    let rising: number | null = null;
    for (let t = 0; t < PERIOD_S / 2; t += dt) {
      const g = glowAt(t);
      if (rising === null && g > GLOW.rest + 1e-9) rising = t;
      if (rising !== null && g >= GLOW.peak - 1e-9) {
        expect(t - rising).toBeGreaterThanOrEqual(0.5);
        return;
      }
    }
    throw new Error('the ring never reached its peak');
  });

  it('the still pose is rolled 10 degrees with the ring at 1.2, whatever the clock', () => {
    for (const t of [0, 1.3, 4.5, 100]) {
      expect(poseAt(t, 0)).toEqual({ roll: POSE.roll, pitch: 0, glow: 1.2 });
    }
    expect(POSE.roll).toBeCloseTo(10 * DEG, 12);
    expect(poseAt(2, 1).roll).toBeCloseTo(rollAt(2), 12);
    expect(poseAt(2, 1).glow).toBeCloseTo(glowAt(2), 12);
  });

  it('eases between the pose and the rocking, never snapping', () => {
    expect(stepBlend(0, 0.016, false)).toBe(0);
    expect(stepBlend(1, 0.016, true)).toBe(1);
    let b = 0;
    let frames = 0;
    while (b < 1) {
      b = stepBlend(b, 1 / 60, true);
      frames++;
    }
    expect(frames).toBeGreaterThanOrEqual(55);
    expect(stepBlend(0.5, 5, false)).toBeCloseTo(0.4, 9);
  });
});
