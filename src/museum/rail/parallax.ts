// Pointer parallax (EXPERIENCE §6.3, ARCHITECTURE §6.4): a whisper of yaw and pitch toward the
// pointer, at most `tokens.camera.parallaxYawDeg` (1.5) and `parallaxPitchDeg` (1), which CameraRig
// damps over 0.4 s and applies on top of the gaze. Fine pointers only, from one passive
// `pointermove` listener on window. Off under reduced motion, `?test=1`, coarse pointers and while
// the story dialog is open. It is not an input model: it never moves the camera along the rail.
import { tokens } from '../../design/tokens';

const DEG = Math.PI / 180;

/** Damping smooth time of the parallax angles, in seconds. */
export const PARALLAX_SMOOTH_S = 0.4;

export interface ParallaxGate {
  /** `(pointer: fine)` matches. */
  fine: boolean;
  reducedMotion: boolean;
  /** `?test=1`. */
  test: boolean;
  dialogOpen: boolean;
}

export function parallaxEnabled(gate: ParallaxGate): boolean {
  return gate.fine && !gate.reducedMotion && !gate.test && !gate.dialogOpen;
}

const clamp1 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(-1, v)) : 0);

/**
 * Yaw and pitch in radians for a pointer at (nx, ny), each in [-1, 1] from the viewport center
 * (y down). The camera turns slightly toward the pointer: right is a negative yaw about +Y, up is
 * a positive pitch about +X.
 */
export function parallaxAngles(nx: number, ny: number): { yaw: number; pitch: number } {
  return {
    yaw: -clamp1(nx) * tokens.camera.parallaxYawDeg * DEG,
    pitch: -clamp1(ny) * tokens.camera.parallaxPitchDeg * DEG,
  };
}

/** The pointer as the listener last saw it, and whether the primary pointer is fine. */
export const pointer = { nx: 0, ny: 0, fine: false };

/**
 * Installs the passive `pointermove` listener and the live `(pointer: fine)` query; `onChange` asks
 * for a frame. Touch pointers never move the camera. Returns the uninstall function.
 */
export function installParallax(onChange: () => void): () => void {
  const fine = window.matchMedia('(pointer: fine)');
  pointer.fine = fine.matches;
  const onQuery = () => {
    pointer.fine = fine.matches;
    onChange();
  };
  const onMove = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    pointer.nx = (event.clientX / width) * 2 - 1;
    pointer.ny = (event.clientY / height) * 2 - 1;
    onChange();
  };
  fine.addEventListener('change', onQuery);
  window.addEventListener('pointermove', onMove, { passive: true });
  return () => {
    fine.removeEventListener('change', onQuery);
    window.removeEventListener('pointermove', onMove);
    pointer.nx = 0;
    pointer.ny = 0;
  };
}
