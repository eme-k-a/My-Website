// The high-tier floor shares one reflection pass between every zone (Floor.tsx): the follower
// materials must keep the leader's parameters and defines (one program) and its reflection uniform
// holders by reference, with their own lightMap. A stand-in leader with drei's `{ value }` holders
// checks that without a WebGL context.
import { MeshStandardMaterial, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import { floorReflectorParams } from '../materials';
import { reflectorFollower } from './floorReflector';

class FakeReflector extends MeshStandardMaterial {
  _tDiffuse = { value: new Texture() };
  _mixBlur = { value: 1 };
  _textureMatrix = { value: null };
}

describe('reflector floor followers', () => {
  it('share the reflection uniforms and defines, and take their own lightMap', () => {
    const leader = new FakeReflector({
      roughness: floorReflectorParams.roughness,
      metalness: floorReflectorParams.metalness,
    });
    leader.defines = { STANDARD: '', USE_BLUR: '' };
    leader.lightMap = new Texture();
    const own = new Texture();
    own.name = 'floorPools-lobby';
    const follower = reflectorFollower(leader, own) as FakeReflector;
    expect(follower).toBeInstanceOf(FakeReflector);
    expect(follower).not.toBe(leader);
    expect(follower._tDiffuse).toBe(leader._tDiffuse);
    expect(follower._mixBlur).toBe(leader._mixBlur);
    expect(follower._textureMatrix).toBe(leader._textureMatrix);
    expect(follower.defines).toEqual(leader.defines);
    expect(follower.defines).not.toBe(leader.defines);
    expect(follower.lightMap).toBe(own);
    expect(leader.lightMap).not.toBe(own);
    expect(follower.roughness).toBe(leader.roughness);
    expect(follower.metalness).toBe(leader.metalness);
  });
});
