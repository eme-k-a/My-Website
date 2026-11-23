import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import type { Group } from 'three';
import { MergeStatic, useExhibitClock, useMaterial, useMaterialInstance } from '../_kit';

const chart = [0.035, 0.055, 0.043, 0.075, 0.064, 0.087, 0.053, 0.07];

export default function Editions() {
  const shell = useMaterial('ceramic');
  const ink = useMaterial('ceramicGraphite');
  const blue = useMaterialInstance('ceramic');
  const tile = useRef<Group>(null);
  const clock = useExhibitClock();
  useLayoutEffect(() => {
    blue.color.set('#284bdf');
  }, [blue]);
  useFrame(() => {
    if (tile.current) tile.current.rotation.y = -0.42 + clock.current * 0.19;
  });
  return (
    <group>
      <mesh material={ink} position-y={0.045}>
        <cylinderGeometry args={[0.13, 0.15, 0.04, 32]} />
      </mesh>
      <group ref={tile} position-y={0.282} rotation-y={-0.42}>
        <MergeStatic>
          <RoundedBox
            material={ink}
            args={[0.49, 0.43, 0.106]}
            radius={0.024}
            smoothness={2}
            bevelSegments={1}
          />
          {[-1, 1].map((side) => (
            <RoundedBox
              key={side}
              material={shell}
              position-z={side * 0.045}
              args={[0.494, 0.434, 0.032]}
              radius={0.015}
              smoothness={2}
              bevelSegments={1}
            />
          ))}
          {[0.24, 0.33, 0.28].map((width, i) => (
            <mesh key={i} material={ink} position={[-0.178 + width / 2, 0.126 - i * 0.036, 0.062]}>
              <boxGeometry args={[width, i === 0 ? 0.018 : 0.006, 0.003]} />
            </mesh>
          ))}
          {chart.map((height, i) => (
            <mesh key={i} material={ink} position={[-0.16 + i * 0.038, -0.134 + height / 2, 0.063]}>
              <boxGeometry args={[0.023, height, 0.004]} />
            </mesh>
          ))}
          <RoundedBox
            material={ink}
            position-z={-0.064}
            args={[0.37, 0.246, 0.019]}
            radius={0.009}
            smoothness={2}
            bevelSegments={1}
          />
          {[0, 1, 2].map((i) => (
            <RoundedBox
              key={i}
              material={i === 2 ? blue : shell}
              position={[(1 - i) * 0.115, 0, i === 2 ? -0.111 : -0.087]}
              args={[0.093, 0.193, i === 2 ? 0.085 : 0.047]}
              radius={0.01}
              smoothness={2}
              bevelSegments={1}
            />
          ))}
        </MergeStatic>
      </group>
    </group>
  );
}
