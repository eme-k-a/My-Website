// Beam cones (EXPERIENCE §5.5, ARCHITECTURE §8.2): one faint additive cone from every light target's
// mount to its aim point, high and medium tiers only, all in one instanced mesh. Each cone takes
// its target's temperature through instanceColor; the material is a clone of the kit `beam`
// material with its color set to white, because three multiplies instanceColor by the material
// color (R0 ruling, docs/RULINGS.md "Rendering and budgets").
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Color, ConeGeometry, Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three';
import { useMaterialLibrary } from '../materials';
import type { Layout } from '../rail/layout';
import { beamSpecs, type BeamSpec } from './lightPlan';

export const BEAM_SEGMENTS = 24;

/** A unit open cone with its apex at the origin and its base (radius 1) at y = -1. */
export function unitBeamGeometry(): ConeGeometry {
  const cone = new ConeGeometry(1, 1, BEAM_SEGMENTS, 1, true);
  cone.translate(0, -0.5, 0);
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

export function Beams({ layout }: { layout: Layout }) {
  const library = useMaterialLibrary();
  const beams = useMemo(() => beamSpecs(layout), [layout]);
  const geometry = useMemo(() => unitBeamGeometry(), []);
  const material = useMemo(() => {
    const m = library.beam.clone();
    m.name = 'beamInstanced';
    m.color.set('#ffffff');
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
      mesh.setColorAt(i, color.set(beam.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
  }, [beams]);
  if (beams.length === 0) return null;
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
