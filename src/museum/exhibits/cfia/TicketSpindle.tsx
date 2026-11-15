// Exhibit No. 04, "The Ticket Spindle" (EXPERIENCE §4.4): paper tickets settle one by one onto a
// brass desk spindle on a walnut box, each with a blank graphite stamp in its corner. Shared
// library materials only, no lights, no text. One slow motion: every 6 s a ticket descends the
// spindle and the stack sinks one pitch into the box, so 14 tickets always show. Under reduced
// motion and ?test=1 the stack rests with no falling ticket. Measurements live in ./spindle.
import { RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { DynamicDrawUsage, type InstancedMesh } from 'three';
import { useExhibitClock, useMaterial, type ExhibitProps } from '../_kit';
import {
  BOX,
  BOX_TOP,
  createSpindleDriver,
  DISC,
  ROD,
  STAMP,
  TICKET,
  TICKET_COUNT,
  TIP,
} from './spindle';

const ROD_HEIGHT = ROD.top - ROD.bottom;

export default function TicketSpindle({ runtime }: ExhibitProps) {
  const walnut = useMaterial('walnut');
  const brass = useMaterial('brass');
  const paper = useMaterial('paper');
  const graphite = useMaterial('ceramicGraphite');
  const clock = useExhibitClock();
  const tickets = useRef<InstancedMesh>(null);
  const stamps = useRef<InstancedMesh>(null);
  const driver = useMemo(() => createSpindleDriver(), []);
  const reducedMotion = runtime.reducedMotion;

  // The first pose is in place before the kit compiles and reveals the exhibit.
  useLayoutEffect(() => {
    const t = tickets.current;
    const s = stamps.current;
    if (!t || !s) return;
    t.instanceMatrix.setUsage(DynamicDrawUsage);
    s.instanceMatrix.setUsage(DynamicDrawUsage);
    driver.apply(t, s, clock.current, reducedMotion);
  }, [driver, clock, reducedMotion]);

  // Writes matrices only while a ticket falls or the stack sinks (and once per new rest).
  useFrame(() => {
    const t = tickets.current;
    const s = stamps.current;
    if (t && s) driver.apply(t, s, clock.current, reducedMotion);
  });

  return (
    <group name="ticket-spindle">
      <RoundedBox
        name="box"
        args={BOX.size}
        radius={BOX.radius}
        smoothness={BOX.smoothness}
        bevelSegments={BOX.bevelSegments}
        position={BOX.center}
        material={walnut}
      />
      <mesh name="disc" position-y={BOX_TOP + DISC.height / 2} material={brass}>
        <cylinderGeometry args={[DISC.radius, DISC.radius, DISC.height, DISC.segments]} />
      </mesh>
      <mesh name="rod" position-y={ROD.bottom + ROD_HEIGHT / 2} material={brass}>
        <cylinderGeometry args={[ROD.radius, ROD.radius, ROD_HEIGHT, ROD.segments]} />
      </mesh>
      <mesh name="tip" position-y={ROD.top + TIP.height / 2} material={brass}>
        <coneGeometry args={[TIP.radius, TIP.height, TIP.segments]} />
      </mesh>
      <instancedMesh
        ref={tickets}
        name="tickets"
        args={[undefined, undefined, TICKET_COUNT]}
        material={paper}
        frustumCulled={false}
      >
        <boxGeometry args={TICKET.size} />
      </instancedMesh>
      <instancedMesh
        ref={stamps}
        name="stamps"
        args={[undefined, undefined, TICKET_COUNT]}
        material={graphite}
        frustumCulled={false}
      >
        <boxGeometry args={STAMP.size} />
      </instancedMesh>
    </group>
  );
}
