// The lighting (EXPERIENCE §5.5, §6.8, §7.5; ARCHITECTURE §8.1; ART_DIRECTION §4), fixed per tier at
// boot so no shader ever recompiles:
// - a dim hemisphere light;
// - the tier's real spotlights (3 high, 1 medium and low), no shadow maps. On every settled
//   arrival assignLights picks their targets and matchLights keeps a light that already holds one
//   of them; a light that moves jumps there at intensity 0, takes the target's temperature and
//   fades up over 1 s. Hover lifts the visitor's own light to 1.35x over 250 ms; an open story
//   dims the other spots to 30% over 0.4 s. Instant under reduced motion and ?test=1;
// - the Lightformer environment, rendered once into a 256 px cube (no HDR files);
// - the beam cones (Beams.tsx), off on low.
import { Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Object3D, type SpotLight } from 'three';
import { useMuseum, type MuseumState } from '../../app/store';
import { testParams } from '../../app/testHooks';
import { tokens } from '../../design/tokens';
import type { Layout } from '../rail/layout';
import { Beams } from './Beams';
import { ENVIRONMENT_RESOLUTION, LightformerEnvironment } from './LightformerEnvironment';
import { stopRecipe } from './lightRecipe';
import {
  approach,
  assignLights,
  DIALOG_DIM,
  DIALOG_DIM_S,
  lightPlan,
  lightTargets,
  matchLights,
  spotIntensity,
  spotScaleGoal,
  targetOfStop,
  type SpotState,
  type TargetId,
} from './lightPlan';

const light = tokens.light;
const motion = tokens.motion;

/** Environment Lightformers (ART_DIRECTION §4), relative to the cube camera at the origin. */
export const LIGHTFORMERS = {
  /** The ceiling strip: light-0, intensity 2, 0.3 x 60 m along the centerline at y 4.9. */
  ceiling: { color: light.ramp[0], intensity: 2, scale: [0.3, 60], position: [0, 4.9, 0] },
  /** Two side panels along the aisle walls at the horizon: light-1, intensity 1.2 (WP-26). */
  sides: { color: light.ramp[1], intensity: 1.2, scale: [40, 3.2], x: 10, y: 1.4 },
  /** One lobby panel behind the visitor (the lobby front), light-0. */
  lobby: { color: light.ramp[0], intensity: 1.2, scale: [14, 3.2], position: [0, 1.4, 8] },
} as const;

function GalleryEnvironment() {
  const { ceiling, sides, lobby } = LIGHTFORMERS;
  return (
    <LightformerEnvironment resolution={ENVIRONMENT_RESOLUTION}>
      <Lightformer
        form="rect"
        color={ceiling.color}
        intensity={ceiling.intensity}
        scale={[...ceiling.scale]}
        position={[...ceiling.position]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      {[-1, 1].map((s) => (
        <Lightformer
          key={s}
          form="rect"
          color={sides.color}
          intensity={sides.intensity}
          scale={[...sides.scale]}
          position={[s * sides.x, sides.y, 0]}
          rotation={[0, -s * (Math.PI / 2), 0]}
        />
      ))}
      <Lightformer
        form="rect"
        color={lobby.color}
        intensity={lobby.intensity}
        scale={[...lobby.scale]}
        position={[...lobby.position]}
        rotation={[0, Math.PI, 0]}
      />
    </LightformerEnvironment>
  );
}

/** The stops of the visitor's track and their index on it (main when the stop is not on it). */
function trackPosition(layout: Layout, state: Pick<MuseumState, 'track' | 'stop'>) {
  let ids = layout.tracks[state.track].stops.map((s) => s.id);
  let index = ids.indexOf(state.stop);
  if (index < 0) {
    ids = layout.tracks.main.stops.map((s) => s.id);
    index = Math.max(0, ids.indexOf(state.stop));
  }
  return { ids, index };
}

function Spotlights({ layout }: { layout: Layout }) {
  // The tier is fixed at boot (quality/tiers.ts), so the light count never changes.
  const [plan] = useState(() => lightPlan(useMuseum.getState().tier));
  const targets = useMemo(() => new Map(lightTargets(layout).map((t) => [t.id, t])), [layout]);
  const [aims] = useState(() => plan.spots.map(() => new Object3D()));
  const spots = useRef<(SpotLight | null)[]>([]);
  const states = useRef<SpotState[]>(plan.spots.map(() => ({ target: null, level: 0, scale: 1 })));
  const [test] = useState(() => testParams(window.location.search).test);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const place = (i: number, target: TargetId | null) => {
      const spot = spots.current[i];
      const spec = target ? targets.get(target) : undefined;
      if (!spot || !spec) return;
      spot.position.set(...spec.mount);
      spot.color.set(spec.color);
      aims[i]!.position.set(...spec.aim);
      aims[i]!.updateMatrixWorld();
    };
    const assign = (state: MuseumState, boot: boolean) => {
      const { ids, index } = trackPosition(layout, state);
      const wanted = assignLights(ids, index, plan.tier);
      const next = matchLights(
        states.current.map((s) => s.target),
        wanted,
      );
      next.forEach((target, i) => {
        const s = states.current[i]!;
        if (s.target === target) return;
        s.target = target;
        s.level = boot || test || state.reducedMotion ? 1 : 0;
        place(i, target);
      });
      invalidate();
    };
    assign(useMuseum.getState(), true);
    return useMuseum.subscribe((state, previous) => {
      if (!state.settled) return;
      if (previous.settled && previous.stop === state.stop && previous.track === state.track) {
        return;
      }
      assign(state, false);
    });
  }, [layout, plan, targets, aims, test, invalidate]);

  useFrame((_, delta) => {
    const { settled, stop, hovered, openId, reducedMotion } = useMuseum.getState();
    const instant = test || reducedMotion;
    const view = {
      current: settled ? targetOfStop(stop) : null,
      hovered: hovered === null ? null : (hovered as TargetId),
      openId: openId === null ? null : (openId as TargetId),
    };
    let moving = false;
    states.current.forEach((s, i) => {
      const spot = spots.current[i];
      if (!spot) return;
      s.level = approach(s.level, 1, delta, instant ? 0 : motion.lightReassignS, 1);
      const goal = spotScaleGoal(s.target, view);
      const dimming = goal < 1 || s.scale < 1;
      const duration = instant ? 0 : dimming ? DIALOG_DIM_S : motion.hoverLiftMs / 1000;
      const span = dimming ? 1 - DIALOG_DIM : motion.hoverLift - 1;
      s.scale = approach(s.scale, goal, delta, duration, span);
      const target = s.target ? targets.get(s.target) : undefined;
      const share = target ? stopRecipe(target.stop, plan.tier).spot : 0;
      const intensity = spotIntensity(plan.spots[i]!, s) * share;
      if (spot.intensity !== intensity) {
        spot.intensity = intensity;
        moving = true;
      }
    });
    if (moving) invalidate();
  });

  return (
    <>
      {aims.map((aim, i) => (
        <primitive key={`aim-${i}`} object={aim} />
      ))}
      {plan.spots.map((spec, i) => (
        <spotLight
          key={`spot-${i}`}
          ref={(el: SpotLight | null) => {
            spots.current[i] = el;
          }}
          name={`spot-${i}`}
          target={aims[i]}
          intensity={0}
          angle={spec.angle}
          penumbra={spec.penumbra}
          decay={spec.decay}
        />
      ))}
    </>
  );
}

export function Lighting({ layout }: { layout: Layout }) {
  const tier = useMuseum((s) => s.tier);
  const plan = useMemo(() => lightPlan(tier), [tier]);
  const { hemisphere } = plan;
  return (
    <group name="lighting">
      <hemisphereLight args={[hemisphere.sky, hemisphere.ground, hemisphere.intensity]} />
      <Spotlights layout={layout} />
      <GalleryEnvironment />
      {plan.beams && <Beams layout={layout} />}
    </group>
  );
}
