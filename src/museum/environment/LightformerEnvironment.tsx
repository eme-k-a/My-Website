// The Lightformer environment (EXPERIENCE §7.5, ARCHITECTURE §8.1): what drei's
// `<Environment frames={1} resolution={256}>` does with children, without the rest of drei's
// Environment module. That module also bundles the RGBE, EXR and gain-map loaders and the preset
// CDN URLs, none of which this site may use (no HDR files, no CDN). The children (drei
// Lightformers) live in a portal scene; a cube camera at the origin renders them once into a
// 256 px half-float cube target, which becomes `scene.environment` for every env-mapped material.
// A context loss remounts the canvas (WP-16), so the one render simply happens again.
import { createPortal, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react';
import {
  CubeCamera,
  HalfFloatType,
  Scene,
  WebGLCubeRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';

export const ENVIRONMENT_RESOLUTION = 256;
const NEAR = 0.1;
const FAR = 1000;

/** Renders `virtual` into `camera`'s cube target once and returns a cleanup for scene.environment. */
function renderOnce(
  gl: WebGLRenderer,
  camera: CubeCamera,
  virtual: Scene,
  scene: { environment: Texture | null },
  texture: Texture,
): () => void {
  const autoClear = gl.autoClear;
  gl.autoClear = true;
  camera.update(gl, virtual);
  gl.autoClear = autoClear;
  const previous = scene.environment;
  scene.environment = texture;
  return () => {
    if (scene.environment === texture) scene.environment = previous;
  };
}

export function LightformerEnvironment({
  resolution = ENVIRONMENT_RESOLUTION,
  children,
}: {
  resolution?: number;
  children: ReactNode;
}) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const [virtual] = useState(() => new Scene());
  const target = useMemo(() => {
    const fbo = new WebGLCubeRenderTarget(resolution);
    fbo.texture.type = HalfFloatType;
    fbo.texture.name = 'lightformerEnvironment';
    return fbo;
  }, [resolution]);
  const camera = useMemo(() => new CubeCamera(NEAR, FAR, target), [target]);
  useEffect(() => () => target.dispose(), [target]);
  // The portal's children commit (and their layout effects run) before this one.
  useLayoutEffect(
    () => renderOnce(gl, camera, virtual, scene, target.texture),
    [gl, camera, virtual, scene, target],
  );
  return <>{createPortal(children, virtual)}</>;
}
