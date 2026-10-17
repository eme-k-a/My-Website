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
import { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import type { BufferGeometry, MeshStandardMaterial, Texture } from 'three';
import { useMuseum } from '../../app/store';
import { floorReflectorParams, useMaterialLibrary } from '../materials';
import type { Layout, Room } from '../rail/layout';
import { lightPlan } from './lightPlan';
import { reflectorFollower } from './floorReflector';
import { useEnvironmentTexture } from './LightformerEnvironment';
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

/**
 * Medium and low floor response (F-023). The library `floor` reads `scene.environment`, and three
 * then applies `scene.environmentIntensity` (1) instead of the material's envMapIntensity, so the
 * glossy floor mirrored the two side Lightformer panels at full strength: every wing floor and
 * the aisle edges read as one flat bright plane (mean value about 65 against 6 on the high
 * reflector floor, same Pixel 7 framing). The clones take the env cube as their own envMap, which
 * makes their envMapIntensity count, and damp it to 0.07: dark polished stone with its warm pools,
 * within about 15% of high. An R3 instance override; the library spec stays EXPERIENCE §7.6.
 */
export const STANDARD_FLOOR_RESPONSE = { envMapIntensity: 0.07 } as const;

/** Gives each clone the env cube as its own envMap (null until the cube is rendered). */
function setEnvMap(materials: MeshStandardMaterial[], texture: Texture | null): void {
  for (const m of materials) m.envMap = texture;
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
        m.envMapIntensity = STANDARD_FLOOR_RESPONSE.envMapIntensity;
        return m;
      }),
    [library, zones],
  );
  // The env cube as the clones' own envMap, so their envMapIntensity applies (three uses
  // scene.environmentIntensity for a material without one). Same program either way.
  const environment = useEnvironmentTexture((s) => s.texture);
  useLayoutEffect(() => setEnvMap(materials, environment), [materials, environment]);
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
