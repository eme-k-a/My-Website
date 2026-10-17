// Beam cones (EXPERIENCE §5.5, ARCHITECTURE §8.2): one faint additive cone from every light target's
// mount to its aim point, high and medium tiers only, all in one instanced mesh. Each cone takes
// its target's temperature through instanceColor; the material is a clone of the kit `beam`
// material with its color set to white, because three multiplies instanceColor by the material
// color (R0 ruling, docs/RULINGS.md "Rendering and budgets"). A vertex color ramp fades each cone
// from nothing at its mount to full at its target (F-025), so it reads as a faint suggestion of
// light around the case instead of a grey shaft from the ceiling, and it never outshines its
// pool.
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
import { useMaterialLibrary } from '../materials';
import type { Layout } from '../rail/layout';
import { beamSpecs, type BeamSpec } from './lightPlan';

export const BEAM_SEGMENTS = 24;

/** Exponent of the cone's brightness ramp from the mount (0) to the target (1). */
export const BEAM_FADE_POWER = 2;

/** A cone vertex's brightness at depth `t` (0 at the apex, 1 at the base). */
export function beamFade(t: number): number {
  return Math.min(1, Math.max(0, t)) ** BEAM_FADE_POWER;
}

/**
 * A unit open cone with its apex at the origin and its base (radius 1) at y = -1, with a vertex
 * color ramp (beamFade) from black at the apex to white at the base.
 */
export function unitBeamGeometry(): ConeGeometry {
  const cone = new ConeGeometry(1, 1, BEAM_SEGMENTS, 4, true);
  cone.translate(0, -0.5, 0);
  const position = cone.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) {
    const level = beamFade(-position.getY(i));
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

export function Beams({ layout }: { layout: Layout }) {
  const library = useMaterialLibrary();
  const beams = useMemo(() => beamSpecs(layout), [layout]);
  const geometry = useMemo(() => unitBeamGeometry(), []);
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
