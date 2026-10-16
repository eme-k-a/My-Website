// Exhibit No. 01, "The Reporting Engine" (EXPERIENCE §4.1): a frosted glass column feeds a
// six-by-six grid of ceramic bars that refreshes like a report; three brass cartridges docked in
// the column's collar are the plugins that extend it. Shared library materials only, no lights,
// no text. One slow motion: the 8 s report refresh, driven only by useExhibitClock(). Under
// reduced motion and ?test=1 the bars hold seeded set 0. Measurements live in ./engine.
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { DynamicDrawUsage, type InstancedMesh } from 'three';
import { useExhibitClock, useMaterial, useMaterialInstance, type ExhibitProps } from '../_kit';
import {
  AXIS,
  BAR_COUNT,
  CARTRIDGE,
  cartridgePlacement,
  COLLAR,
  COLUMN,
  COLUMN_CENTER_Y,
  conduitPlacement,
  CONDUIT,
  CORE,
  createRefreshDriver,
  GRID,
  TRAY,
} from './engine';

const CARTRIDGES = CARTRIDGE.azimuthsDeg.map((deg) => ({ deg, ...cartridgePlacement(deg) }));
const CONDUIT_PLACEMENT = conduitPlacement();

export default function ReportingEngine({ runtime }: ExhibitProps) {
  const walnut = useMaterial('walnut');
  const frostedGlass = useMaterial('frostedGlass');
  const brass = useMaterial('brass');
  const ceramic = useMaterial('ceramic');
  // The core's own clone, so its static glow level never touches the shared accentGlow.
  const core = useMaterialInstance('accentGlow');
  const clock = useExhibitClock();
  const bars = useRef<InstancedMesh>(null);
  const driver = useMemo(() => createRefreshDriver(), []);
  const reducedMotion = runtime.reducedMotion;

  // The first pose is in place before the kit compiles and reveals the exhibit.
  useLayoutEffect(() => {
    const mesh = bars.current;
    if (!mesh) return;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    driver.prepare(mesh);
    driver.apply(mesh, clock.current, reducedMotion);
  }, [driver, clock, reducedMotion]);

  // Writes matrices only while a sweep runs (and once when a held set changes).
  useFrame(() => {
    const mesh = bars.current;
    if (mesh) driver.apply(mesh, clock.current, reducedMotion);
  });

  return (
    <group name="reporting-engine">
      <RoundedBox
        name="tray"
        args={TRAY.size}
        radius={TRAY.radius}
        smoothness={TRAY.smoothness}
        bevelSegments={TRAY.bevelSegments}
        position={TRAY.center}
        material={walnut}
      />
      <mesh
        name="conduit"
        position={CONDUIT_PLACEMENT.position}
        rotation-y={CONDUIT_PLACEMENT.rotationY}
        material={brass}
      >
        <boxGeometry args={CONDUIT.size} />
      </mesh>
      <group name="column" position={[AXIS.x, 0, AXIS.z]}>
        <mesh
          name="core"
          position-y={COLUMN_CENTER_Y}
          material={core}
          material-emissiveIntensity={CORE.glow}
        >
          <cylinderGeometry args={[CORE.radius, CORE.radius, CORE.height, CORE.segments]} />
        </mesh>
        <mesh name="glass" position-y={COLUMN_CENTER_Y} material={frostedGlass}>
          <cylinderGeometry args={[COLUMN.radius, COLUMN.radius, COLUMN.height, COLUMN.segments]} />
        </mesh>
        <mesh name="collar" position-y={COLLAR.y} rotation-x={Math.PI / 2} material={brass}>
          <torusGeometry
            args={[COLLAR.radius, COLLAR.tube, COLLAR.tubeSegments, COLLAR.ringSegments]}
          />
        </mesh>
      </group>
      {CARTRIDGES.map(({ deg, position, rotationY }) => (
        <RoundedBox
          key={deg}
          name={`cartridge-${deg}`}
          args={CARTRIDGE.size}
          radius={CARTRIDGE.radius}
          smoothness={CARTRIDGE.smoothness}
          bevelSegments={CARTRIDGE.bevelSegments}
          position={position}
          rotation-y={rotationY}
          material={brass}
        />
      ))}
      <instancedMesh
        ref={bars}
        name="report-grid"
        args={[undefined, undefined, BAR_COUNT]}
        material={ceramic}
      >
        <boxGeometry args={[GRID.bar, 1, GRID.bar]} />
      </instancedMesh>
    </group>
  );
}
