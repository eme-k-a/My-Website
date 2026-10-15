// Interim (WP-02): invalidates every animation frame while mounted, so frameloop="demand" still
// renders. WP-16 (R7) makes it render only while something moves (ARCHITECTURE §8.5).
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

export function FrameDriver() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      invalidate();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [invalidate]);
  return null;
}
