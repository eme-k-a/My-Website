// The floors (ARCHITECTURE §8.2, EXPERIENCE §7.5, §7.6): one mesh per floor zone (room), each with
// its own baked pool lightMap from lightPools.ts. The material is fixed at boot by the tier:
// - high: drei's MeshReflectorMaterial (floorReflectorParams). Every floor mesh lies in its local
//   XY plane under one shared rotation (shell.ts FLOOR_ROTATION_X), so they all have the same
//   world matrix: the first zone hosts the drei component, which renders the one reflection pass,
//   and the other zones use clones of its material that share its reflection uniforms. One pass
//   serves every zone. Floors face up, so the mirrored camera below sees only their back faces.
// - medium and low: the library `floor` (env-mapped, roughness 0.22), one clone per zone for its
//   lightMap; the clones share one program, and there is no second pass.
import { MeshReflectorMaterial } from '@react-three/drei';
import { useEffect, useMemo, useState } from 'react';
import type { BufferGeometry, MeshStandardMaterial, Texture } from 'three';
import { useMuseum } from '../../app/store';
import { floorReflectorParams, useMaterialLibrary } from '../materials';
import type { Layout, Room } from '../rail/layout';
import { lightPlan } from './lightPlan';
import { reflectorFollower } from './floorReflector';
import { createFloorLightmaps, FLOOR_LIGHTMAP_INTENSITY } from './lightPools';
import { FLOOR_ROTATION_X, floorGeometry } from './shell';

interface Zone {
  id: Room['id'];
  geometry: BufferGeometry;
  lightMap: Texture;
}

function ReflectorFloor({ zones }: { zones: Zone[] }) {
  const [leader, setLeader] = useState<MeshStandardMaterial | null>(null);
  const [first, ...rest] = zones;
  const followers = useMemo(
    () => (leader ? zones.slice(1).map((zone) => reflectorFollower(leader, zone.lightMap)) : []),
    [leader, zones],
  );
  useEffect(() => () => followers.forEach((m) => m.dispose()), [followers]);
  if (!first) return null;
  return (
    <>
      <mesh name={`floor-${first.id}`} geometry={first.geometry}>
        <MeshReflectorMaterial
          ref={setLeader}
          {...floorReflectorParams}
          lightMap={first.lightMap}
          lightMapIntensity={FLOOR_LIGHTMAP_INTENSITY.reflector}
        />
      </mesh>
      {followers.map((material, i) => (
        <mesh
          key={rest[i]!.id}
          name={`floor-${rest[i]!.id}`}
          geometry={rest[i]!.geometry}
          material={material}
        />
      ))}
    </>
  );
}

function StandardFloor({ zones }: { zones: Zone[] }) {
  const library = useMaterialLibrary();
  const materials = useMemo(
    () =>
      zones.map((zone) => {
        const m = library.floor.clone();
        m.name = `floor-${zone.id}`;
        m.lightMap = zone.lightMap;
        m.lightMapIntensity = FLOOR_LIGHTMAP_INTENSITY.standard;
        return m;
      }),
    [library, zones],
  );
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
  return (
    <>
      {zones.map((zone, i) => (
        <mesh
          key={zone.id}
          name={`floor-${zone.id}`}
          geometry={zone.geometry}
          material={materials[i]}
        />
      ))}
    </>
  );
}

export function Floor({ layout }: { layout: Layout }) {
  const tier = useMuseum((s) => s.tier);
  const plan = useMemo(() => lightPlan(tier), [tier]);
  const lightmaps = useMemo(() => createFloorLightmaps(layout), [layout]);
  useEffect(() => () => lightmaps.forEach((t) => t.dispose()), [lightmaps]);
  const zones = useMemo<Zone[]>(
    () =>
      layout.rooms.map((room) => ({
        id: room.id,
        geometry: floorGeometry(room),
        lightMap: lightmaps.get(room.id)!,
      })),
    [layout, lightmaps],
  );
  useEffect(() => () => zones.forEach((z) => z.geometry.dispose()), [zones]);
  return (
    <group name="floors" rotation-x={FLOOR_ROTATION_X}>
      {plan.floor === 'reflector' ? (
        <ReflectorFloor zones={zones} />
      ) : (
        <StandardFloor zones={zones} />
      )}
    </group>
  );
}
