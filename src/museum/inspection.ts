import {
  Color,
  DirectionalLight,
  HemisphereLight,
  InstancedMesh,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Sphere,
  SRGBColorSpace,
  Vector3,
  WebGLRenderTarget,
  type Group,
  type WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { measureObject } from './exhibits/_kit/measure';
import type { InspectionSession } from '../overlay/inspection';

export function startInspection(
  renderer: WebGLRenderer,
  sculpture: Group,
  canvas: HTMLCanvasElement,
): InspectionSession {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D presentation unavailable');
  const { width, height } = canvas;
  const scene = new Scene();
  scene.background = new Color('#1d2024');
  const studio = new RoomEnvironment();
  const generator = new PMREMGenerator(renderer);
  const reflections = generator.fromScene(studio, 0.04, 0.1, 100, { size: 64 });
  scene.environment = reflections.texture;
  studio.dispose();
  generator.dispose();
  const model = sculpture.clone(true);
  scene.add(model);
  const sphere = measureObject(model).box.getBoundingSphere(new Sphere());
  const camera = new PerspectiveCamera(
    32,
    width / height,
    sphere.radius * 0.01,
    sphere.radius * 12,
  );
  const distance = (1.05 * sphere.radius) / Math.sin((camera.fov * Math.PI) / 360);
  const key = new DirectionalLight(0xfff4e7, 2.4);
  key.position.set(2, 3, 3);
  scene.add(key, new HemisphereLight(0xfffaf1, 0xb7a58d, 1.4));
  const target = new WebGLRenderTarget(width, height, {
    colorSpace: SRGBColorSpace,
    samples: Math.min(4, renderer.capabilities.maxSamples),
  });
  const pixels = new Uint8Array(width * height * 4);
  const image = context.createImageData(width, height);
  const direction = new Vector3();

  return {
    draw({ yaw, elevation, zoom }) {
      const a = (yaw * Math.PI) / 180;
      const b = (elevation * Math.PI) / 180;
      direction.set(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b));
      camera.position.copy(sphere.center).addScaledVector(direction, distance / zoom);
      camera.up.set(-Math.sin(a) * Math.sin(b), Math.cos(b), -Math.cos(a) * Math.sin(b));
      camera.lookAt(sphere.center);
      const previous = renderer.getRenderTarget();
      try {
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
      } finally {
        renderer.setRenderTarget(previous);
      }
      const stride = width * 4;
      for (let y = 0; y < height; y++) {
        const offset = (height - 1 - y) * stride;
        image.data.set(pixels.subarray(offset, offset + stride), y * stride);
      }
      context.putImageData(image, 0, 0);
    },
    dispose() {
      target.dispose();
      reflections.dispose();
      // Clones share the gallery's geometry and material, but own their instance buffers.
      model.traverse((object) => {
        if (object instanceof InstancedMesh) object.dispose();
      });
    },
  };
}
