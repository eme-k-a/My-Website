// Exhibit No. V1, "Tamper Evident" (EXPERIENCE §4.7): a frosted cup with a cut-away, layer-stepped
// lid showing a Pico W board and an orientation sensor, rocking gently in a brass gimbal on a
// walnut base; the tamper ring on the lid lights only while the roll is past the threshold. Shared
// library materials only, no lights, no text. One slow motion (the 9 s rocking), driven only by
// useExhibitClock(); the ring's glow is a function of the same clock. Under reduced motion, the low
// tier and ?test=1 it holds the still pose (rolled 10 degrees, ring at 1.2). Measurements, geometry
// and the motion live in ./tamper.
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  Matrix4,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshStandardMaterial,
} from 'three';
import { useExhibitClock, useMaterial, useMaterialInstance, type ExhibitProps } from '../_kit';
import {
  BASE,
  BOARD,
  CHIP,
  COVER_PHI,
  cupGeometry,
  CUP,
  GIMBAL,
  GIZMO,
  GIZMO_AXES,
  gizmoArcMatrix,
  gizmoConeMatrix,
  LID,
  LID_Y,
  lidGeometry,
  OBJECT_YAW,
  PADS,
  padCenters,
  pinPlacements,
  PIVOT,
  POST,
  poseAt,
  stepBlend,
  TAMPER_RING,
  tamperRingTurn,
  type Pose,
} from './tamper';

const ONE = new Vector3(1, 1, 1);
const Y_UP = new Vector3(0, 1, 0);
const AXIS = { x: new Vector3(1, 0, 0), z: new Vector3(0, 0, 1) } as const;

function setMatrices(mesh: InstancedMesh | null, matrices: Matrix4[]): void {
  if (!mesh) return;
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
}

const POST_MATRICES = [-1, 1].map((side) =>
  new Matrix4().makeTranslation(side * POST.x, (POST.bottom + POST.top) / 2, 0),
);

const PIN_MATRICES = pinPlacements().map(({ center, axis, length, radius }) =>
  new Matrix4().compose(
    new Vector3(...center),
    new Quaternion().setFromUnitVectors(Y_UP, AXIS[axis]),
    new Vector3(radius, length, radius),
  ),
);

const PAD_MATRICES = padCenters().map((c) =>
  new Matrix4().compose(new Vector3(...c), new Quaternion(), ONE),
);

/** The one motion's output: the gimbal pitches, the cup and lid roll, the ring's own clone glows. */
function applyPose(
  gimbal: Group | null,
  rocker: Group | null,
  ring: Mesh<BufferGeometry, MeshStandardMaterial> | null,
  pose: Pose,
): void {
  if (gimbal) gimbal.rotation.x = pose.pitch;
  if (rocker) rocker.rotation.z = pose.roll;
  if (ring) ring.material.emissiveIntensity = pose.glow;
}

const ARC_MATRICES = GIZMO_AXES.map(gizmoArcMatrix);
const CONE_MATRICES = GIZMO_AXES.map(gizmoConeMatrix);

export default function TamperEvident({ runtime }: ExhibitProps) {
  const walnut = useMaterial('walnut');
  const brass = useMaterial('brass');
  const frostedGlass = useMaterial('frostedGlass');
  const ceramic = useMaterial('ceramic');
  const graphite = useMaterial('ceramicGraphite');
  // The ring's own clone, so its animated glow never touches the shared accentGlow.
  const glow = useMaterialInstance('accentGlow');
  const clock = useExhibitClock();
  const invalidate = useThree((s) => s.invalidate);

  const cup = useMemo(() => cupGeometry(), []);
  const lid = useMemo(() => lidGeometry(), []);
  useEffect(
    () => () => {
      cup.dispose();
      lid.dispose();
    },
    [cup, lid],
  );

  const gimbal = useRef<Group>(null);
  const rocker = useRef<Group>(null);
  const posts = useRef<InstancedMesh>(null);
  const pins = useRef<InstancedMesh>(null);
  const pads = useRef<InstancedMesh>(null);
  const arcs = useRef<InstancedMesh>(null);
  const cones = useRef<InstancedMesh>(null);
  const ring = useRef<Mesh<BufferGeometry, MeshStandardMaterial>>(null);

  // 0 = the still pose, 1 = the live rocking; eased in between when motion starts or stops.
  const blend = useRef(runtime.motion ? 1 : 0);
  const motion = useRef(runtime.motion);
  useEffect(() => {
    motion.current = runtime.motion;
    invalidate();
  }, [runtime.motion, invalidate]);

  // Static instances and the first pose are in place before the kit compiles and reveals.
  useLayoutEffect(() => {
    setMatrices(posts.current, POST_MATRICES);
    setMatrices(pins.current, PIN_MATRICES);
    setMatrices(pads.current, PAD_MATRICES);
    setMatrices(arcs.current, ARC_MATRICES);
    setMatrices(cones.current, CONE_MATRICES);
    applyPose(gimbal.current, rocker.current, ring.current, poseAt(clock.current, blend.current));
  }, [clock]);

  useFrame((_, delta) => {
    const next = stepBlend(blend.current, delta, motion.current);
    const easing = next !== blend.current;
    blend.current = next;
    applyPose(gimbal.current, rocker.current, ring.current, poseAt(clock.current, next));
    // Finish an ease even if the frame driver has stopped asking for frames.
    if (easing) invalidate();
  });

  return (
    <group name="tamper-evident" rotation-y={OBJECT_YAW}>
      <mesh name="base" position={BASE.center} material={walnut}>
        <cylinderGeometry args={[BASE.radius, BASE.radius, BASE.height, BASE.segments]} />
      </mesh>
      <instancedMesh ref={posts} name="posts" args={[undefined, undefined, 2]} material={brass}>
        <cylinderGeometry
          args={[POST.radius, POST.radius, POST.top - POST.bottom, POST.segments]}
        />
      </instancedMesh>

      <group ref={gimbal} name="gimbal" position={PIVOT}>
        <mesh name="gimbal-ring" rotation-x={Math.PI / 2} material={brass}>
          <torusGeometry
            args={[GIMBAL.radius, GIMBAL.tube, GIMBAL.radialSegments, GIMBAL.tubularSegments]}
          />
        </mesh>
        <instancedMesh
          ref={pins}
          name="pivot-pins"
          args={[undefined, undefined, 4]}
          material={brass}
        >
          <cylinderGeometry args={[1, 1, 1, 12]} />
        </instancedMesh>

        <group ref={rocker} name="cup-and-lid">
          <mesh
            name="cup"
            position-y={CUP.bottomY - PIVOT[1]}
            geometry={cup}
            material={frostedGlass}
          />
          <group name="lid" position-y={LID_Y - PIVOT[1]}>
            <mesh name="lid-body" geometry={lid} material={ceramic} />
            <group name="wedge" rotation-y={LID.cutCenter}>
              <mesh name="board" position={BOARD.center} material={graphite}>
                <boxGeometry args={BOARD.size} />
              </mesh>
              <instancedMesh
                ref={pads}
                name="board-pads"
                args={[undefined, undefined, PADS.count]}
                material={brass}
              >
                <boxGeometry args={PADS.size} />
              </instancedMesh>
              <mesh name="sensor" position={CHIP.center} material={graphite}>
                <boxGeometry args={CHIP.size} />
              </mesh>
            </group>
            {/* Cut like the cover: a 270 degree arc, laid flat and turned onto the cover's range. */}
            <mesh
              ref={ring}
              name="tamper-ring"
              position-y={TAMPER_RING.y}
              rotation={[Math.PI / 2, tamperRingTurn(), 0, 'YXZ']}
              material={glow}
            >
              <torusGeometry
                args={[
                  TAMPER_RING.radius,
                  TAMPER_RING.tube,
                  TAMPER_RING.radialSegments,
                  TAMPER_RING.tubularSegments,
                  COVER_PHI.length,
                ]}
              />
            </mesh>
          </group>
        </group>
      </group>

      <instancedMesh
        ref={arcs}
        name="euler-arcs"
        args={[undefined, undefined, GIZMO_AXES.length]}
        material={brass}
      >
        <torusGeometry
          args={[GIZMO.radius, GIZMO.tube, GIZMO.radialSegments, GIZMO.tubularSegments, GIZMO.arc]}
        />
      </instancedMesh>
      <instancedMesh
        ref={cones}
        name="euler-arrowheads"
        args={[undefined, undefined, GIZMO_AXES.length]}
        material={brass}
      >
        <coneGeometry args={[GIZMO.cone.radius, GIZMO.cone.height, GIZMO.cone.segments]} />
      </instancedMesh>
    </group>
  );
}
