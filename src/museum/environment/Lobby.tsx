// The lobby portrait (EXPERIENCE §2.3, §11.1 item 5): 0.8 x 1.0 m in a thin brass frame (BrassTrim.tsx)
// right of the arch, warm duotone at rest. On desktop it cross-fades to the color texture over
// 600 ms while hovered: fine pointers only, never under reduced motion or ?test=1. Both textures
// are the 512 px headshot crops in public/images (WP-03); the duotone fills the kit's `portrait`
// material, the color layer is a transparent clone in front of it, drawn only while visible.
// Decorative, no caption: the DOM hero carries the name. "COMMIT HISTORY" is in Labels.tsx.
import { useTexture } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  SRGBColorSpace,
  type Material,
  type Mesh,
  type MeshBasicMaterial,
  type Texture,
} from 'three';
import { useMuseum } from '../../app/store';
import { testParams } from '../../app/testHooks';
import { tokens } from '../../design/tokens';
import { overDomControl } from '../exhibits/_kit/ExhibitFrame';
import { useMaterialLibrary } from '../materials';
import { approach, PORTRAIT_CENTER, PORTRAIT_SIZE } from './lightPlan';

export const PORTRAIT_DUOTONE_URL = '/images/headshot-texture-512-duotone.webp';
export const PORTRAIT_COLOR_URL = '/images/headshot-texture-512.webp';
/** The color layer floats this far in front of the duotone one. */
const LAYER_GAP = 0.001;

/** May the portrait warm on hover here? Fine pointer, no reduced motion, not under ?test=1. */
export function portraitHoverAllowed(opts: {
  finePointer: boolean;
  reducedMotion: boolean;
  test: boolean;
}): boolean {
  return opts.finePointer && !opts.reducedMotion && !opts.test;
}

const asSrgb = (textures: Texture[]) => {
  for (const t of textures) {
    t.colorSpace = SRGBColorSpace;
    t.needsUpdate = true;
  }
};

/** Fills the kit's `portrait` texture slot (materials/library.ts) with the duotone. */
function fillPortrait(material: MeshBasicMaterial, map: Texture): void {
  material.map = map;
  material.needsUpdate = true;
}

/** Steps the color layer's opacity toward `goal` (600 ms for the whole way); true while moving. */
function stepWarmth(material: Material, mesh: Mesh | null, goal: number, delta: number): boolean {
  if (material.opacity === goal) return false;
  material.opacity = approach(material.opacity, goal, delta, tokens.motion.durSlow / 1000, 1);
  if (mesh) mesh.visible = material.opacity > 0;
  return true;
}

export function Portrait() {
  const library = useMaterialLibrary();
  const [duotone, color] = useTexture([PORTRAIT_DUOTONE_URL, PORTRAIT_COLOR_URL], asSrgb) as [
    Texture,
    Texture,
  ];
  useLayoutEffect(() => fillPortrait(library.portrait, duotone), [library, duotone]);
  const warm = useMemo(() => {
    const m = library.portrait.clone();
    m.name = 'portraitColor';
    m.map = color;
    m.transparent = true;
    m.depthWrite = false;
    m.opacity = 0;
    return m;
  }, [library, color]);
  useEffect(() => () => warm.dispose(), [warm]);

  const reducedMotion = useMuseum((s) => s.reducedMotion);
  const [test] = useState(() => testParams(window.location.search).test);
  const [finePointer] = useState(() => window.matchMedia?.('(pointer: fine)').matches ?? false);
  const allowed = portraitHoverAllowed({ finePointer, reducedMotion, test });
  const hovered = useRef(false);
  const layer = useRef<Mesh>(null);
  const invalidate = useThree((s) => s.invalidate);

  const leave = useCallback(() => {
    if (!hovered.current) return;
    hovered.current = false;
    invalidate();
  }, [invalidate]);
  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!allowed || overDomControl(event.nativeEvent)) {
        leave();
        return;
      }
      if (hovered.current) return;
      hovered.current = true;
      invalidate();
    },
    [allowed, leave, invalidate],
  );
  useEffect(() => leave, [leave]);
  useEffect(() => {
    if (!allowed) leave();
  }, [allowed, leave]);

  useFrame((_, delta) => {
    const goal = hovered.current && allowed ? 1 : 0;
    if (stepWarmth(warm, layer.current, goal, delta)) invalidate();
  });

  const [x, y, z] = PORTRAIT_CENTER;
  const [w, h] = PORTRAIT_SIZE;
  return (
    <group name="portrait" position={[x, y, z]}>
      <mesh
        name="portrait-duotone"
        material={library.portrait}
        onPointerMove={allowed ? onPointerMove : undefined}
        onPointerOut={allowed ? leave : undefined}
      >
        <planeGeometry args={[w, h]} />
      </mesh>
      <mesh
        ref={layer}
        name="portrait-color"
        material={warm}
        position-z={LAYER_GAP}
        visible={false}
        renderOrder={1}
      >
        <planeGeometry args={[w, h]} />
      </mesh>
    </group>
  );
}
