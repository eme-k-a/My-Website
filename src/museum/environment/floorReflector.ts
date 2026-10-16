// The high-tier floor shares one reflection pass between every floor zone (Floor.tsx): the first
// zone hosts drei's MeshReflectorMaterial, the other zones use followers of its material. Pure, so
// it is unit-tested without a WebGL context.
import type { MeshStandardMaterial, Texture } from 'three';

/** drei keeps the reflection uniforms in `{ value }` holders on the material instance. */
function isUniform(value: unknown): value is { value: unknown } {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.keys(value).length === 1 &&
    'value' in value
  );
}

/**
 * A clone of the reflector material for another floor zone: same parameters and defines (so the
 * same program), the leader's reflection uniforms by reference, its own lightMap.
 */
export function reflectorFollower(
  leader: MeshStandardMaterial,
  lightMap: Texture,
): MeshStandardMaterial {
  const follower = leader.clone();
  follower.defines = { ...leader.defines };
  for (const [key, value] of Object.entries(leader)) {
    if (key.startsWith('_') && !key.startsWith('__') && isUniform(value)) {
      (follower as unknown as Record<string, unknown>)[key] = value;
    }
  }
  follower.lightMap = lightMap;
  follower.name = `floorReflector-${lightMap.name}`;
  return follower;
}
