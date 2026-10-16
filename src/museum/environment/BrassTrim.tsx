// Brass trim (EXPERIENCE §2.3, §6.9): the 4 cm reveals of the arch and the wing doors, the thin
// portrait frame and the year-strip inlays, one instanced mesh of the shared `brass` material.
import { useEffect, useMemo } from 'react';
import { useMaterialLibrary } from '../materials';
import type { Layout } from '../rail/layout';
import { Instanced } from './Fixtures';
import { unitBox } from './fixtureMatrices';
import { brassTrimBoxes, trimMatrix, yearStripBoxes } from './trim';

export function BrassTrim({ layout }: { layout: Layout }) {
  const library = useMaterialLibrary();
  const box = useMemo(() => unitBox(), []);
  useEffect(() => () => box.dispose(), [box]);
  const matrices = useMemo(
    () => [...brassTrimBoxes(layout), ...yearStripBoxes(layout)].map((b) => trimMatrix(b)),
    [layout],
  );
  return (
    <Instanced name="brass-trim" geometry={box} material={library.brass} matrices={matrices} />
  );
}
