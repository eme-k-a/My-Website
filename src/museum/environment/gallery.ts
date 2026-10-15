// The one layout the scene is built from (ARCHITECTURE §6.6): computeLayout(content, build date),
// computed once per page. Every environment position starts here.
import { PerspectiveCamera } from 'three';
import { content } from '../../content/index';
import { computeLayout, type Layout, type StopPose } from '../rail/layout';

/** The build date baked in by Vite (`BUILD_DATE` or the build day, UTC). */
export function buildDate(): Date {
  return new Date(`${__BUILD_DATE__}T00:00:00Z`);
}

let cached: Layout | null = null;

/** `computeLayout(content, buildDate())`, memoized. */
export function galleryLayout(): Layout {
  cached ??= computeLayout(content, buildDate());
  return cached;
}

/** The Euler rotation (XYZ, radians) of a camera standing at `pose.camera` looking at `pose.look`. */
export function poseRotation(pose: Pick<StopPose, 'camera' | 'look'>): [number, number, number] {
  const camera = new PerspectiveCamera();
  camera.position.set(...pose.camera);
  camera.lookAt(...pose.look);
  return [camera.rotation.x, camera.rotation.y, camera.rotation.z];
}
