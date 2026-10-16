// The environment's 3D labels (EXPERIENCE §5.4, §6.9): "COMMIT HISTORY", the room names above the
// doors, "FOUNDATIONS", the end wall line and the flat year numerals, all brass troika text in the
// self-hosted .woff fonts. Each duplicates DOM text; placements come from labels3d.ts. Every label
// counts in the store's `textPending` until its first sync (the kit's WallText), so `ready` waits.
import { useMemo } from 'react';
import { fontSizeForCap } from '../exhibits/_kit/fonts';
import type { PlacardLabel } from '../exhibits/_kit/placard';
import { WallText } from '../exhibits/_kit/Placard';
import { useMaterialLibrary } from '../materials';
import type { Layout } from '../rail/layout';
import { labelPlacements, type EnvironmentLabel } from './labels3d';

/** An environment label in the kit's wall-text shape. */
export function asWallLabel(label: EnvironmentLabel): PlacardLabel {
  return {
    text: label.text,
    font: label.font,
    capHeight: label.capHeight,
    fontSize: fontSizeForCap(label.font, label.capHeight),
    baselineY: label.baselineY,
    letterSpacing: label.tracking,
  };
}

export function Labels({ layout }: { layout: Layout }) {
  const library = useMaterialLibrary();
  const placements = useMemo(() => labelPlacements(layout), [layout]);
  return (
    <group name="labels">
      {placements.map((p) => (
        <group
          key={`${p.label.kind}-${p.label.for}-${p.label.text}`}
          name={`label-${p.label.for}`}
          position={p.position}
          rotation={p.rotation}
        >
          <WallText label={asWallLabel(p.label)} material={library.brass} />
        </group>
      ))}
    </group>
  );
}
