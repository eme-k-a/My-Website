// The placeholder crate (EXPERIENCE §5.7): shown while an exhibit chunk loads, when it fails, and
// for any content entry whose exhibit folder does not exist yet. Walnut crate, brass caps, under
// 300 triangles, never raycast (only the frame's hit box is).
import { useEffect, useMemo } from 'react';
import { useMaterialLibrary } from '../../materials';
import { createPlaceholderGeometries, placeholderFit } from './placeholderGeometry';
import type { ExhibitSlot } from './types';

const noRaycast = () => {};

export function Placeholder({
  slot,
  visible = true,
}: {
  slot: Pick<ExhibitSlot, 'mount' | 'bounds'>;
  visible?: boolean;
}) {
  const library = useMaterialLibrary();
  const fit = useMemo(() => placeholderFit(slot), [slot]);
  const geometries = useMemo(() => createPlaceholderGeometries(fit.size), [fit]);
  useEffect(
    () => () => {
      geometries.crate.dispose();
      geometries.caps.dispose();
    },
    [geometries],
  );
  return (
    <group name="placeholder" position={fit.center} visible={visible}>
      <mesh geometry={geometries.crate} material={library.walnut} raycast={noRaycast} />
      <mesh geometry={geometries.caps} material={library.brass} raycast={noRaycast} />
    </group>
  );
}
