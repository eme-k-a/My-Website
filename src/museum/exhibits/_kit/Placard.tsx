// Wall titles (EXPERIENCE §5.4), the only 3D text: the exhibit number in Instrument Serif and the
// organization label in IBM Plex Sans 500, brass, on the wall behind the slot. Both duplicate the
// DOM card. troika text appears asynchronously, so every label counts in the store's
// `textPending` from mount until its first sync, and `ready` waits for it (ARCHITECTURE §13.4).
import { Text } from '@react-three/drei';
import { Suspense, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import type { Material, MeshStandardMaterial } from 'three';
import { configureTextBuilder } from 'troika-three-text';
import { useMuseum } from '../../../app/store';
import { useMaterialLibrary } from '../../materials';
import type { Layout, Slot } from '../../rail/layout';
import { KIT_FONTS, TEXT_BUILDER_CONFIG } from './fonts';
import { slotPlacard, type PlacardLabel } from './placard';

// Once, at module load, before any font is processed (see TEXT_BUILDER_CONFIG).
configureTextBuilder(TEXT_BUILDER_CONFIG);

const noRaycast = () => {};

/**
 * The wall titles' brass (F-033): the library's brass with less metalness and a little more
 * roughness. Fully metallic letters on a flat wall facing the camera reflect the dark room behind
 * it and read near black; with some diffuse response they catch the wash and the spotlight and
 * glint like brass lettering. Same shader program as brass; one clone per library.
 */
export const TITLE_BRASS = { metalness: 0.7, roughness: 0.4, glow: 0.3 } as const;
const titleBrassByLibrary = new WeakMap<object, MeshStandardMaterial>();

export function titleBrass(library: { brass: MeshStandardMaterial }): MeshStandardMaterial {
  let material = titleBrassByLibrary.get(library);
  if (!material) {
    material = library.brass.clone();
    material.name = 'titleBrass';
    material.metalness = TITLE_BRASS.metalness;
    material.roughness = TITLE_BRASS.roughness;
    material.emissive.copy(library.brass.color);
    material.emissiveIntensity = TITLE_BRASS.glow;
    titleBrassByLibrary.set(library, material);
  }
  return material;
}

function addPending(n: number) {
  useMuseum.setState((s) => ({ textPending: s.textPending + n }));
}

/** One troika label in a kit font. Counts in `textPending` until its first sync. */
export function WallText({ label, material }: { label: PlacardLabel; material: Material }) {
  const synced = useRef(false);
  useLayoutEffect(() => {
    addPending(1);
    return () => {
      if (!synced.current) addPending(-1);
    };
  }, []);
  const onSync = useCallback(() => {
    if (synced.current) return;
    synced.current = true;
    addPending(-1);
  }, []);
  return (
    // drei's Text suspends while its font loads; this boundary keeps that local.
    <Suspense fallback={null}>
      <Text
        font={KIT_FONTS[label.font]}
        fontSize={label.fontSize}
        letterSpacing={label.letterSpacing}
        maxWidth={label.maxWidth}
        lineHeight={label.lineHeight}
        anchorX="center"
        anchorY="top-baseline"
        textAlign="center"
        position={[0, label.baselineY, 0]}
        material={material}
        onSync={onSync}
        raycast={noRaycast}
      >
        {label.text}
      </Text>
    </Suspense>
  );
}

export function Placard({ layout, slot }: { layout: Layout; slot: Slot }) {
  const library = useMaterialLibrary();
  const spec = useMemo(() => slotPlacard(layout, slot), [layout, slot]);
  return (
    <group name={`placard-${slot.id}`} position={spec.position} rotation-y={spec.rotationY}>
      <WallText label={spec.number} material={titleBrass(library)} />
      <WallText label={spec.organization} material={titleBrass(library)} />
    </group>
  );
}
