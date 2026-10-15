// Per-frame rail values live outside React (ARCHITECTURE §5.5): a mutable singleton read inside
// useFrame. The scroll listener writes `target`; CameraRig damps `current` toward it.
import type { TrackId } from '../../content/ids';

export const progress = { target: 0, current: 0, track: 'main' as TrackId };
