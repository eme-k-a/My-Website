// Real since WP-02: the shape of stats() is part of the test contract (ARCHITECTURE §9, §13.3).
// gl.info.autoReset is off and the probe resets it at the start of every frame and reads it after
// the render, so `calls` includes every pass of the frame (the reflector too). Registered with the
// test hook through registerStatsProvider.
import { addAfterEffect, addEffect, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import {
  LinearFilter,
  NearestFilter,
  Vector3,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { useMuseum } from '../../app/store';
import { registerStatsProvider, type ExhibitStats, type MuseumStats } from '../../app/testHooks';
import { EXHIBIT_IDS, type ExhibitId } from '../../content/ids';
import { progress } from '../rail/progress';

type Vec3 = [number, number, number];

const exhibitStats = new Map<ExhibitId, ExhibitStats>();
const mountedIds = new Set<ExhibitId>();
let cameraTarget: Vec3 | null = null;
let frames = 0;

/**
 * ExhibitFrame marks itself mounted in its mount effect and returns the disposer as the cleanup:
 * `useEffect(() => markExhibitMounted(id), [id])`. The exhibit counts as mounted from then on,
 * whether it shows the placeholder, is still compiling or is revealed. The disposer also drops the
 * exhibit's reported stats, so an unmount never leaves a stale entry.
 */
export function markExhibitMounted(id: ExhibitId): () => void {
  mountedIds.add(id);
  return () => {
    mountedIds.delete(id);
    exhibitStats.delete(id);
  };
}

/**
 * ExhibitFrame reports the measured stats of what a slot shows (dev and ?test=1, after reveal);
 * null clears them. A reported exhibit also counts as mounted.
 */
export function reportExhibit(id: ExhibitId, data: ExhibitStats | null): void {
  if (data) exhibitStats.set(id, { ...data });
  else exhibitStats.delete(id);
}

/** `stats().mounted`: marked or reported exhibits, in EXHIBIT_IDS order. */
function mountedExhibits(): ExhibitId[] {
  return EXHIBIT_IDS.filter((id) => mountedIds.has(id) || exhibitStats.has(id));
}

/** CameraRig reports the point it looks at; without a report, the target is 1 m ahead of the camera. */
export function reportCameraTarget(target: readonly [number, number, number]): void {
  cameraTarget = [target[0], target[1], target[2]];
}

function isTexture(value: unknown): value is Texture {
  return typeof value === 'object' && value !== null && (value as Texture).isTexture === true;
}

/** w * h * 4 bytes per image, times 4/3 with mipmaps (cube textures count all six faces). */
function textureBytes(texture: Texture): number {
  const image: unknown = texture.image;
  const images: unknown[] = Array.isArray(image) ? image : [image];
  let bytes = 0;
  for (const img of images) {
    const size = img as { width?: number; height?: number } | null | undefined;
    bytes += (size?.width ?? 0) * (size?.height ?? 0) * 4;
  }
  const mipmapped =
    texture.generateMipmaps &&
    texture.minFilter !== NearestFilter &&
    texture.minFilter !== LinearFilter;
  return mipmapped ? (bytes * 4) / 3 : bytes;
}

/** Unique textures and render-target textures reachable from the scene's materials and uniforms. */
function sceneTextureMB(scene: Object3D & { environment?: unknown; background?: unknown }): number {
  const found = new Set<Texture>();
  const visit = (value: unknown) => {
    if (isTexture(value)) found.add(value);
  };
  const visitMaterial = (material: Material) => {
    for (const value of Object.values(material)) visit(value);
    const uniforms = (material as { uniforms?: Record<string, { value?: unknown } | undefined> })
      .uniforms;
    if (uniforms) for (const uniform of Object.values(uniforms)) visit(uniform?.value);
  };
  scene.traverse((object) => {
    const material = (object as { material?: Material | Material[] }).material;
    if (Array.isArray(material)) material.forEach(visitMaterial);
    else if (material) visitMaterial(material);
  });
  visit(scene.environment);
  visit(scene.background);
  let bytes = 0;
  for (const texture of found) bytes += textureBytes(texture);
  return bytes / (1024 * 1024);
}

export function StatsProbe() {
  const get = useThree((s) => s.get);

  useEffect(() => {
    const { gl } = get();
    const info = gl.info;
    const previousAutoReset = info.autoReset;
    info.autoReset = false;
    let frameAtStart = info.render.frame;
    let last = { calls: 0, triangles: 0 };

    const offBefore = addEffect(() => {
      frameAtStart = info.render.frame;
      info.reset();
    });
    const offAfter = addAfterEffect(() => {
      if (info.render.frame === frameAtStart) return; // nothing rendered in this tick
      frames += 1;
      last = { calls: info.render.calls, triangles: info.render.triangles };
    });

    const unregister = registerStatsProvider((): MuseumStats => {
      const { camera, scene } = get();
      const { tier, track } = useMuseum.getState();
      const position: Vec3 = [camera.position.x, camera.position.y, camera.position.z];
      const ahead = camera.getWorldDirection(new Vector3()).add(camera.position);
      return {
        calls: last.calls,
        triangles: last.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        programs: info.programs?.length ?? 0,
        textureMB: sceneTextureMB(scene),
        frames,
        dpr: gl.getPixelRatio(),
        tier,
        track,
        mounted: mountedExhibits(),
        exhibits: Object.fromEntries(exhibitStats),
        camera: { position, target: cameraTarget ?? [ahead.x, ahead.y, ahead.z] },
        progress: { target: progress.target, current: progress.current },
      };
    });

    return () => {
      offBefore();
      offAfter();
      unregister();
      info.autoReset = previousAutoReset;
    };
  }, [get]);

  return null;
}
