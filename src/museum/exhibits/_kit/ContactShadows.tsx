// drei 10.7.9 ContactShadows (core/ContactShadows.js), ported for the kit with one change: the
// render targets, the plane geometry and the three materials it creates are disposed when it
// unmounts or rebuilds. drei's own version never disposes them, so every exhibit remount leaked
// two 256 px render-target textures and one geometry (WP-32 loops.spec: +16 textures and +8
// geometries per gallery loop). Props are the subset ExhibitFrame's PlinthShadow uses.
import { useFrame, useThree } from '@react-three/fiber';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import {
  Color,
  Mesh,
  MeshDepthMaterial,
  PlaneGeometry,
  ShaderMaterial,
  WebGLRenderTarget,
  type Group,
  type OrthographicCamera,
} from 'three';
import { HorizontalBlurShader, VerticalBlurShader } from 'three-stdlib';

export interface ContactShadowsProps {
  position?: [number, number, number];
  scale?: number;
  far?: number;
  resolution?: number;
  blur?: number;
  opacity?: number;
  color?: string;
  /** Bake count; Infinity re-renders every frame. */
  frames?: number;
}

export const ContactShadows = forwardRef<Group, ContactShadowsProps>(function ContactShadows(
  {
    position,
    scale = 10,
    far = 10,
    resolution = 512,
    blur = 1,
    opacity = 1,
    color = '#000000',
    frames = Infinity,
  },
  forwarded,
) {
  const ref = useRef<Group>(null);
  const shadowCamera = useRef<OrthographicCamera>(null);
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const size = scale;

  const parts = useMemo(() => {
    const target = new WebGLRenderTarget(resolution, resolution);
    const targetBlur = new WebGLRenderTarget(resolution, resolution);
    target.texture.generateMipmaps = targetBlur.texture.generateMipmaps = false;
    const plane = new PlaneGeometry(size, size).rotateX(Math.PI / 2);
    const blurPlane = new Mesh(plane);
    const depth = new MeshDepthMaterial();
    depth.depthTest = depth.depthWrite = false;
    depth.onBeforeCompile = (shader) => {
      shader.uniforms = { ...shader.uniforms, ucolor: { value: new Color(color) } };
      shader.fragmentShader = shader.fragmentShader.replace(
        'void main() {',
        'uniform vec3 ucolor;\n           void main() {\n          ',
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        'vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        'vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );',
      );
    };
    const horizontal = new ShaderMaterial(HorizontalBlurShader);
    const vertical = new ShaderMaterial(VerticalBlurShader);
    horizontal.depthTest = vertical.depthTest = false;
    return { target, targetBlur, plane, blurPlane, depth, horizontal, vertical };
  }, [resolution, size, color]);

  // The fix: drei never disposes these.
  useEffect(
    () => () => {
      parts.target.dispose();
      parts.targetBlur.dispose();
      parts.plane.dispose();
      parts.depth.dispose();
      parts.horizontal.dispose();
      parts.vertical.dispose();
    },
    [parts],
  );

  const blurShadows = (amount: number) => {
    const { blurPlane, horizontal, vertical, target, targetBlur } = parts;
    const camera = shadowCamera.current!;
    blurPlane.visible = true;
    blurPlane.material = horizontal;
    horizontal.uniforms.tDiffuse!.value = target.texture;
    horizontal.uniforms.h!.value = amount / 256;
    gl.setRenderTarget(targetBlur);
    gl.render(blurPlane, camera);
    blurPlane.material = vertical;
    vertical.uniforms.tDiffuse!.value = targetBlur.texture;
    vertical.uniforms.v!.value = amount / 256;
    gl.setRenderTarget(target);
    gl.render(blurPlane, camera);
    blurPlane.visible = false;
  };

  const count = useRef(0);
  useFrame(() => {
    const group = ref.current;
    const camera = shadowCamera.current;
    if (!group || !camera || !(frames === Infinity || count.current < frames)) return;
    count.current++;
    const background = scene.background;
    const override = scene.overrideMaterial;
    group.visible = false;
    scene.background = null;
    scene.overrideMaterial = parts.depth;
    gl.setRenderTarget(parts.target);
    gl.render(scene, camera);
    blurShadows(blur);
    blurShadows(blur * 0.4);
    gl.setRenderTarget(null);
    group.visible = true;
    scene.overrideMaterial = override;
    scene.background = background;
  });

  useImperativeHandle(forwarded, () => ref.current!, []);
  return (
    <group rotation-x={Math.PI / 2} position={position} ref={ref}>
      <mesh geometry={parts.plane} scale={[1, -1, 1]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          transparent
          map={parts.target.texture}
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>
      <orthographicCamera
        ref={shadowCamera}
        args={[-size / 2, size / 2, size / 2, -size / 2, 0, far]}
      />
    </group>
  );
});
