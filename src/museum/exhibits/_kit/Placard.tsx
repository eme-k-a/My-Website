// Wall titles (EXPERIENCE §5.4), the only 3D text: the exhibit number in Instrument Serif and the
// organization label in IBM Plex Sans 500, brass, on the wall behind the slot. Both duplicate the
// DOM card. troika text appears asynchronously, so every label counts in the store's
// `textPending` from mount until its first sync, and `ready` waits for it (ARCHITECTURE §13.4).
import { Text } from '@react-three/drei';
import { Suspense, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import type { Material } from 'three';
import { configureTextBuilder } from 'troika-three-text';
import { useMuseum } from '../../../app/store';
import { content } from '../../../content/index';
import { entryById, exhibitNumber, wallLabelOf } from '../../../content/selectors';
import { useMaterialLibrary } from '../../materials';
import type { Layout, Slot } from '../../rail/layout';
import { KIT_FONTS, TEXT_BUILDER_CONFIG } from './fonts';
import { placardSpec, type PlacardLabel } from './placard';

// Once, at module load, before any font is processed (see TEXT_BUILDER_CONFIG).
configureTextBuilder(TEXT_BUILDER_CONFIG);

const noRaycast = () => {};

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
  const spec = useMemo(
    () =>
      placardSpec(layout, slot, {
        number: exhibitNumber(content, slot.id),
        organization: wallLabelOf(entryById(content, slot.id)).toUpperCase(),
      }),
    [layout, slot],
  );
  return (
    <group name={`placard-${slot.id}`} position={spec.position} rotation-y={spec.rotationY}>
      <WallText label={spec.number} material={library.brass} />
      <WallText label={spec.organization} material={library.brass} />
    </group>
  );
}
