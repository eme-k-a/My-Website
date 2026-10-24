// Beam cones (EXPERIENCE §5.5, ARCHITECTURE §8.2): one faint additive cone from every light target's
// mount to its aim point, high and medium tiers only, all in one instanced mesh. Each cone takes
// its target's temperature through instanceColor; the material is a clone of the kit `beam`
// material with its color set to white, because three multiplies instanceColor by the material
// color (R0 ruling, docs/RULINGS.md "Rendering and budgets"). A vertex color ramp fades each cone
// from nothing at its mount to full at its target (F-025), so it reads as a faint suggestion of
// light around the case instead of a grey shaft from the ceiling, and it never outshines its
// pool. A wing cone stays dark down to its case top (BeamSpec.fadeStart, F-027), so it never
// crosses the wall title above the case; those cones are a second instanced mesh (one more call).
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BufferAttribute,
  Color,
  ConeGeometry,
  Matrix4,
  Quaternion,
  Vector3,
  type InstancedMesh,
} from 'three';
import { useMuseum } from '../../app/store';
import { useMaterialLibrary } from '../materials';
import type { Layout } from '../rail/layout';
import { beamSpecs, type BeamSpec } from './lightPlan';

export const BEAM_SEGMENTS = 24;

/** Exponent of the cone's brightness ramp from the mount (0) to the target (1). */
export const BEAM_FADE_POWER = 2;

/**
 * A cone vertex's brightness at depth `t` (0 at the apex, 1 at the base): dark down to `start`,
 * then the ramp over the rest of the cone.
 */
export function beamFade(t: number, start = 0): number {
  const ramp = start >= 1 ? 0 : (t - start) / (1 - start);
  return Math.min(1, Math.max(0, ramp)) ** BEAM_FADE_POWER;
}

/** Height segments of the unit cone; a later fade start gets more, so its ramp stays smooth. */
function heightSegments(start: number): number {
  return start > 0 ? 8 : 4;
}

/**
 * A unit open cone with its apex at the origin and its base (radius 1) at y = -1, with a vertex
 * color ramp (beamFade) from black at the apex (or down to `start`) to white at the base.
 */
export function unitBeamGeometry(start = 0): ConeGeometry {
  const cone = new ConeGeometry(1, 1, BEAM_SEGMENTS, heightSegments(start), true);
  cone.translate(0, -0.5, 0);
  const position = cone.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const level = beamFade(-position.getY(i), start);
    colors.set([level, level, level], i * 3);
  }
  cone.setAttribute('color', new BufferAttribute(colors, 3));
  return cone;
}

const DOWN = new Vector3(0, -1, 0);

/** The instance matrix that stretches the unit cone from `apex` to `base` with `radius`. */
export function beamMatrix(beam: Pick<BeamSpec, 'apex' | 'base' | 'radius'>): Matrix4 {
  const apex = new Vector3(...beam.apex);
  const axis = new Vector3(...beam.base).sub(apex);
  const length = axis.length();
  const rotation = new Quaternion().setFromUnitVectors(DOWN, axis.normalize());
  return new Matrix4().compose(apex, rotation, new Vector3(beam.radius, length, beam.radius));
}

/** One instanced mesh for the cones that share a fade start. */
function BeamGroup({ beams, start }: { beams: BeamSpec[]; start: number }) {
  const library = useMaterialLibrary();
  const geometry = useMemo(() => unitBeamGeometry(start), [start]);
  const material = useMemo(() => {
    const m = library.beam.clone();
    m.name = 'beamInstanced';
    m.color.set('#ffffff');
    m.vertexColors = true;
    return m;
  }, [library]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const color = new Color();
    beams.forEach((beam, i) => {
      mesh.setMatrixAt(i, beamMatrix(beam));
      mesh.setColorAt(i, color.set(beam.color).multiplyScalar(beam.strength));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [beams]);
  return (
    <instancedMesh
      key={beams.length}
      ref={ref}
      name="beams"
      args={[geometry, material, beams.length]}
      renderOrder={2}
    />
  );
}

/** Groups cones by fade start (rounded, so equal wing geometry shares one mesh). */
export function beamGroups(beams: BeamSpec[]): { start: number; beams: BeamSpec[] }[] {
  const groups = new Map<number, BeamSpec[]>();
  for (const beam of beams) {
    const start = Math.round(beam.fadeStart * 1000) / 1000;
    groups.set(start, [...(groups.get(start) ?? []), beam]);
  }
  return [...groups].map(([start, list]) => ({ start, beams: list }));
}

export function Beams({ layout }: { layout: Layout }) {
  const tier = useMuseum((s) => s.tier);
  const groups = useMemo(() => beamGroups(beamSpecs(layout, tier)), [layout, tier]);
  return (
    <>
      {groups.map((g) => (
        <BeamGroup key={g.start} beams={g.beams} start={g.start} />
      ))}
    </>
  );
}
