import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type { Mesh } from 'three';
import { MergeStatic, useExhibitClock, useMaterial, useMaterialInstance } from '../_kit';

const sessions = Array.from({ length: 13 }, (_, i) => i);

export default function SessionDisc() {
  const glass = useMaterialInstance('frostedGlass');
  const graphite = useMaterial('ceramicGraphite');
  const violet = useMaterialInstance('accentGlow');
  const mint = useMaterialInstance('accentGlow');
  const pulse = useRef<Mesh>(null);
  const clock = useExhibitClock();
  useLayoutEffect(() => {
    glass.setValues({ color: '#526d7c', opacity: 0.53 });
    violet.setValues({ color: '#bea5ff', emissive: '#9968ff', emissiveIntensity: 0.8 });
    mint.setValues({ color: '#75f5ce', emissive: '#45d4b2', emissiveIntensity: 0.8 });
  }, [glass, violet, mint]);
  useFrame(() => {
    if (!pulse.current) return;
    const phase = Math.min(1, (clock.current % 5) / 2);
    pulse.current.position.set(0.018, -0.049 + phase * 0.098, -0.026 + phase * 0.052);
  });
  return (
    <group rotation-y={-0.18}>
      <MergeStatic>
        <mesh material={graphite} position-y={0.048}>
          <boxGeometry args={[0.27, 0.046, 0.16]} />
        </mesh>
      </MergeStatic>
      <group position-y={0.309}>
        <MergeStatic>
          <mesh material={glass} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.25, 0.25, 0.052, 64]} />
          </mesh>
          <mesh material={graphite}>
            <torusGeometry args={[0.25, 0.005, 6, 64]} />
          </mesh>
          {[violet, mint].map((material, row) =>
            sessions
              .filter((i) => row === 1 || i < 6 || i > 8)
              .map((i) => (
                <mesh
                  key={row + '-' + i}
                  material={material}
                  rotation-z={-0.19}
                  position={[
                    (i - 6) * 0.03,
                    (row ? -0.049 : 0.049) + 0.008 * Math.sin(i * 0.7),
                    row ? -0.028 : 0.028,
                  ]}
                >
                  <boxGeometry args={[0.012, 0.027 + i * 0.001, 0.006]} />
                </mesh>
              )),
          )}
        </MergeStatic>
        <mesh ref={pulse} material={mint} position={[0.018, -0.049, -0.026]}>
          <sphereGeometry args={[0.012, 10, 8]} />
        </mesh>
      </group>
    </group>
  );
}
