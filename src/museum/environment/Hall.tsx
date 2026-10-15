// The greybox hall (WP-08): one floor per room with the medium and low floor material (the
// high-tier reflector and the baked pools are WP-11), and the whole shell (walls with their
// openings, lintels, the Foundations header beam and the ceilings) as one merged mesh.
import { useEffect, useMemo } from 'react';
import { useMaterialLibrary } from '../materials';
import type { Layout } from '../rail/layout';
import { floorGeometry, shellGeometry } from './shell';

export function Hall({ layout }: { layout: Layout }) {
  const library = useMaterialLibrary();
  const shell = useMemo(() => shellGeometry(layout), [layout]);
  const floors = useMemo(
    () => layout.rooms.map((room) => ({ id: room.id, geometry: floorGeometry(room) })),
    [layout],
  );
  useEffect(() => () => shell.dispose(), [shell]);
  useEffect(() => () => floors.forEach((f) => f.geometry.dispose()), [floors]);
  return (
    <group name="hall">
      <mesh name="shell" geometry={shell} material={library.wall} />
      {floors.map((floor) => (
        <mesh
          key={floor.id}
          name={`floor-${floor.id}`}
          geometry={floor.geometry}
          material={library.floor}
        />
      ))}
    </group>
  );
}
