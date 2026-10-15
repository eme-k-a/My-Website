// Interim greybox lighting (WP-08; WP-11 replaces it): a hemisphere fill (GREYBOX_HEMI_INTENSITY)
// and one spotlight on the visitor's stop, so the greybox reads. Moving the light changes
// only its position and target, never the light count, so no shader recompiles.
import { useMemo, useState } from 'react';
import { Object3D } from 'three';
import type { StopId } from '../../content/ids';
import { tokens } from '../../design/tokens';
import type { Layout } from '../rail/layout';
import { GREYBOX_HEMI_INTENSITY, spotPlan } from './lighting';

const light = tokens.light;

export function GreyboxLighting({ layout, here }: { layout: Layout; here: StopId }) {
  const plan = useMemo(() => spotPlan(layout, here), [layout, here]);
  const [target] = useState(() => new Object3D());
  return (
    <group name="greybox-lighting">
      <hemisphereLight args={[light.ramp[0], light.hemiGround, GREYBOX_HEMI_INTENSITY]} />
      <primitive object={target} position={plan.target} />
      <spotLight
        position={plan.position}
        target={target}
        color={light.ramp[0]}
        intensity={light.spotIntensity}
        angle={light.spotAngle}
        penumbra={light.spotPenumbra}
        decay={light.spotDecay}
      />
    </group>
  );
}
