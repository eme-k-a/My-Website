import {
  Color,
  DirectionalLight,
  HemisphereLight,
  InstancedMesh,
  Matrix4,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Sphere,
  SRGBColorSpace,
  Vector3,
  WebGLRenderTarget,
  type Group,
  type Object3D,
  type WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { measureObject } from './exhibits/_kit/measure';
import type { InspectionSession } from '../overlay/inspection';

// RoomEnvironment.dispose releases geometry and materials. Instanced meshes own a
// separate transform buffer and dispatch their own disposal event to the renderer.
function disposeInstances(object: Object3D) {
  if (object instanceof InstancedMesh) object.dispose();
}

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
  studio.traverse(disposeInstances);
  studio.dispose();
  generator.dispose();
  const model = sculpture.clone(true);
  scene.add(model);
  // Keep the original pose for restoring the whole cabinet after a close-up.
  const batches: { mesh: InstancedMesh; owners: (number | null)[]; matrices: Matrix4[] }[] = [];
  model.traverse((mesh) => {
    if (!(mesh instanceof InstancedMesh) || !mesh.userData.medalOwners) return;
    const matrices = Array.from({ length: mesh.count }, (_, i) => {
      const matrix = new Matrix4();
      mesh.getMatrixAt(i, matrix);
      return matrix;
    });
    batches.push({ mesh, owners: mesh.userData.medalOwners, matrices });
  });
  let selected: number | null = null;
  const sphere = measureObject(model).box.getBoundingSphere(new Sphere());
  const camera = new PerspectiveCamera(
    32,
    width / height,
    sphere.radius * 0.01,
    sphere.radius * 12,
  );
  const fit = 1.05 / Math.sin((camera.fov * Math.PI) / 360);
  const key = new DirectionalLight(0xfff4e7, 2.4);
  key.position.set(2, 3, 3);
  scene.add(key, new HemisphereLight(0xfffaf1, 0xb7a58d, 1.4));
  function makeSurface(w: number, h: number, samples: number) {
    return {
      target: new WebGLRenderTarget(w, h, { colorSpace: SRGBColorSpace, samples }),
      pixels: new Uint8Array(w * h * 4),
      image: context!.createImageData(w, h),
    };
  }
  const full = makeSurface(width, height, Math.min(4, renderer.capabilities.maxSamples));
  // Keep engravings sharp at rest. During a gesture, read back one quarter as many pixels.
  let fullDrawMs = 0;
  let movingSurface: ReturnType<typeof makeSurface> | undefined;
  const direction = new Vector3();

  return {
    draw({ yaw, elevation, zoom }, medal, moving = false) {
      const started = performance.now();
      const { target, pixels, image } =
        moving && fullDrawMs > 1000 / 60
          ? (movingSurface ??= makeSurface(Math.ceil(width / 2), Math.ceil(height / 2), 0))
          : full;
      if (medal !== selected) {
        selected = medal;
        for (const { mesh, owners, matrices } of batches) {
          let count = 0;
          matrices.forEach((matrix, i) => {
            if (medal === null || owners[i] === medal) mesh.setMatrixAt(count++, matrix);
          });
          mesh.count = count;
          mesh.visible = count > 0;
          mesh.instanceMatrix.needsUpdate = true;
        }
        measureObject(model).box.getBoundingSphere(sphere);
      }
      const a = (yaw * Math.PI) / 180;
      const b = (elevation * Math.PI) / 180;
      direction.set(Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b));
      camera.position.copy(sphere.center).addScaledVector(direction, (sphere.radius * fit) / zoom);
      camera.up.set(-Math.sin(a) * Math.sin(b), Math.cos(b), -Math.cos(a) * Math.sin(b));
      camera.lookAt(sphere.center);
      const previous = renderer.getRenderTarget();
      try {
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        renderer.readRenderTargetPixels(target, 0, 0, target.width, target.height, pixels);
      } finally {
        renderer.setRenderTarget(previous);
      }
      if (canvas.width !== target.width || canvas.height !== target.height) {
        canvas.width = target.width;
        canvas.height = target.height;
      }
      const stride = target.width * 4;
      for (let y = 0; y < target.height; y++) {
        const offset = (target.height - 1 - y) * stride;
        image.data.set(pixels.subarray(offset, offset + stride), y * stride);
      }
      context.putImageData(image, 0, 0);
      if (target === full.target) fullDrawMs = performance.now() - started;
      return target !== full.target;
    },
    dispose() {
      movingSurface?.target.dispose();
      full.target.dispose();
      canvas.width = width;
      canvas.height = height;
      reflections.dispose();
      // Clones share the gallery's geometry and material, but own their instance buffers.
      model.traverse(disposeInstances);
    },
  };
}
