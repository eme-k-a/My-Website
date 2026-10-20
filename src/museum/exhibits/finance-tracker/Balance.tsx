// Exhibit No. P2, "The Balance" (EXPERIENCE §4.6): three coin stacks on a walnut ledger tray,
// income in brass, expenses in graphite ceramic and the budget in frosted glass. Shared library
// materials only, no lights, no text, no symbols. One slow motion: every 6 s the stacks ease to a
// new seeded set of counts, always Expenses <= Budget <= Income, driven only by useExhibitClock().
// Under reduced motion and ?test=1 the stacks hold set 0 (20, 14, 17). Measurements live in
// ./counts.
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { DynamicDrawUsage, type InstancedMesh } from 'three';
import { useExhibitClock, useMaterial, type ExhibitProps } from '../_kit';
import { COIN, createBalanceDriver, MAX_COINS, TRAY } from './counts';

export default function Balance({ runtime }: ExhibitProps) {
  const walnut = useMaterial('walnut');
  const brass = useMaterial('brass');
  const graphite = useMaterial('ceramicGraphite');
  const frostedGlass = useMaterial('frostedGlass');
  const clock = useExhibitClock();
  const income = useRef<InstancedMesh>(null);
  const expenses = useRef<InstancedMesh>(null);
  const budget = useRef<InstancedMesh>(null);
  const driver = useMemo(() => createBalanceDriver(), []);
  const reducedMotion = runtime.reducedMotion;

  // The first pose is in place before the kit compiles and reveals the exhibit.
  useLayoutEffect(() => {
    const meshes = [income.current, expenses.current, budget.current];
    for (const mesh of meshes) mesh?.instanceMatrix.setUsage(DynamicDrawUsage);
    driver.prepare(meshes);
    driver.apply(meshes, clock.current, reducedMotion);
  }, [driver, clock, reducedMotion]);

  // Writes matrices only while coins move (and once when a held set changes).
  useFrame(() => {
    driver.apply([income.current, expenses.current, budget.current], clock.current, reducedMotion);
  });

  const coin = <cylinderGeometry args={[COIN.radius, COIN.radius, COIN.height, COIN.segments]} />;

  return (
    <group name="balance">
      <RoundedBox
        name="tray"
        args={TRAY.size}
        radius={TRAY.radius}
        smoothness={TRAY.smoothness}
        bevelSegments={TRAY.bevelSegments}
        position={TRAY.center}
        material={walnut}
      />
      <instancedMesh
        ref={income}
        name="income"
        args={[undefined, undefined, MAX_COINS]}
        material={brass}
      >
        {coin}
      </instancedMesh>
      <instancedMesh
        ref={expenses}
        name="expenses"
        args={[undefined, undefined, MAX_COINS]}
        material={graphite}
      >
        {coin}
      </instancedMesh>
      <instancedMesh
        ref={budget}
        name="budget"
        args={[undefined, undefined, MAX_COINS]}
        material={frostedGlass}
      >
        {coin}
      </instancedMesh>
    </group>
  );
}
