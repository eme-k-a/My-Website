// A freestanding chapter noticeboard. The slip and brass clips are a metaphor for a public
// website kept current. The artifact is static; it uses only the gallery's shared materials.
import { MergeStatic, type ExhibitProps } from '../_kit';

export default function ChapterNoticeboard({ materials }: ExhibitProps) {
  return (
    <MergeStatic name="chapter-noticeboard">
      <mesh position={[0, 0.053, 0]} material={materials.walnut}>
        <boxGeometry args={[0.48, 0.054, 0.26]} />
      </mesh>
      {[-0.18, 0.18].map((x) => (
        <mesh key={x} position={[x, 0.15, -0.019]} material={materials.brass}>
          <boxGeometry args={[0.024, 0.14, 0.028]} />
        </mesh>
      ))}
      <mesh position={[0, 0.353, 0]} material={materials.walnut}>
        <boxGeometry args={[0.52, 0.35, 0.046]} />
      </mesh>
      <mesh position={[0, 0.353, 0.025]} material={materials.ceramicGraphite}>
        <boxGeometry args={[0.488, 0.318, 0.009]} />
      </mesh>
      {/* The offset spare slip makes the removable front page read as a physical insert. */}
      <mesh position={[-0.017, 0.354, 0.034]} rotation-z={-0.047} material={materials.ceramic}>
        <boxGeometry args={[0.32, 0.232, 0.008]} />
      </mesh>
      <mesh position={[0.008, 0.349, 0.043]} material={materials.paper}>
        <boxGeometry args={[0.326, 0.232, 0.008]} />
      </mesh>
      {[-0.12, 0.12].map((x) => (
        <mesh key={x} position={[x, 0.466, 0.047]} material={materials.brass}>
          <boxGeometry args={[0.05, 0.041, 0.014]} />
        </mesh>
      ))}
      <mesh
        name="rear-access-panel"
        position={[0, 0.354, -0.026]}
        material={materials.ceramicGraphite}
      >
        <boxGeometry args={[0.3, 0.168, 0.012]} />
      </mesh>
      <mesh position={[0.117, 0.354, -0.034]} material={materials.brass}>
        <boxGeometry args={[0.018, 0.048, 0.012]} />
      </mesh>
    </MergeStatic>
  );
}
