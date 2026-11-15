// The front desk (EXPERIENCE §2.3, §11.1 item 4): the walnut and brass desk at the desk stop's
// look target, and the four gift-shop objects on it. Parts are instanced per material (walnut,
// brass, paper). Each object has an invisible hit box: a click does what its DOM button on the
// desk card does, with the same URL (`cardOf('desk')`, PDF_PATH), as a same-tab navigation like
// the card's plain links. Clicks that land on DOM controls above the canvas never reach it.
import { useThree, type ThreeEvent } from '@react-three/fiber';
import { useCallback, useEffect, useMemo } from 'react';
import type { Material, Matrix4 } from 'three';
import { overDomControl } from '../exhibits/_kit/ExhibitFrame';
import { useMaterialLibrary } from '../materials';
import type { Layout } from '../rail/layout';
import {
  DESK_HIT_MARGIN,
  deskBodyBoxes,
  deskBoxMatrix,
  deskHref,
  deskLinks,
  deskObjects,
  deskOrigin,
  type DeskMaterial,
  type DeskObject,
} from './deskParts';
import { Instanced } from './Fixtures';
import { unitBox } from './fixtureMatrices';

function setCursor(element: HTMLElement | null | undefined, cursor: string): void {
  if (element?.style) element.style.cursor = cursor;
}

function DeskObjectHit({ object, href }: { object: DeskObject; href: string }) {
  const body = object.parts[0]!;
  const source = useThree((s) => s.events.connected as HTMLElement | null | undefined);
  const leave = useCallback(() => setCursor(source, ''), [source]);
  useEffect(() => leave, [leave]);
  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (overDomControl(event.nativeEvent)) {
        leave();
        return;
      }
      event.stopPropagation();
      setCursor(source, 'pointer');
    },
    [leave, source],
  );
  const onClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (overDomControl(event.nativeEvent)) return;
      event.stopPropagation();
      window.location.assign(href);
    },
    [href],
  );
  const m = 2 * DESK_HIT_MARGIN;
  return (
    <mesh
      name={`desk-${object.action}`}
      position={body.center}
      rotation-y={body.rotationY ?? 0}
      visible={false}
      onPointerMove={onPointerMove}
      onPointerOut={leave}
      onClick={onClick}
    >
      <boxGeometry args={[body.size[0] + m, body.size[1] + m, body.size[2] + m]} />
    </mesh>
  );
}

export function Desk({ layout }: { layout: Layout }) {
  const library = useMaterialLibrary();
  const origin = useMemo(() => deskOrigin(layout), [layout]);
  const links = useMemo(() => deskLinks(), []);
  const objects = useMemo(() => deskObjects(links.github !== undefined), [links]);
  const box = useMemo(() => unitBox(), []);
  useEffect(() => () => box.dispose(), [box]);
  const byMaterial = useMemo(() => {
    const out: Record<DeskMaterial, Matrix4[]> = { walnut: [], brass: [], paper: [] };
    for (const b of [...deskBodyBoxes(), ...objects.flatMap((o) => o.parts)]) {
      out[b.material].push(deskBoxMatrix(b));
    }
    return out;
  }, [objects]);
  if (!origin) return null;
  const materials: Record<DeskMaterial, Material> = {
    walnut: library.walnut,
    brass: library.brass,
    paper: library.paper,
  };
  return (
    <group name="desk" position={origin}>
      {(Object.keys(byMaterial) as DeskMaterial[]).map((name) => (
        <Instanced
          key={name}
          name={`desk-${name}`}
          geometry={box}
          material={materials[name]}
          matrices={byMaterial[name]}
        />
      ))}
      {objects.map((object) => {
        const href = deskHref(object.action, links);
        return href ? <DeskObjectHit key={object.action} object={object} href={href} /> : null;
      })}
    </group>
  );
}
