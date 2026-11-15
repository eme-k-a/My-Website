// The stage (ARCHITECTURE §7.1, §6.1, §10.3): a fixed, aria-hidden layer under the track holding
// the R3F <Canvas>. MuseumGate lazy-imports the default export, so all of three.js lives in this
// chunk. Pointer events come from #app (`eventSource`), because the sections above the canvas
// would otherwise swallow them; scrolling stays native. The stage is transparent until `ready`,
// then fades in over 600 ms (instantly under reduced motion and ?test=1).
import { Canvas } from '@react-three/fiber';
import { Suspense, useEffect, useRef, useState, type RefObject } from 'react';
import { ACESFilmicToneMapping, AgXToneMapping } from 'three';
import { useMuseum } from '../app/store';
import { testParams } from '../app/testHooks';
import { TEST_IDS } from '../app/testIds';
import { tokens } from '../design/tokens';
import { galleryLayout, poseRotation } from './environment/gallery';
import {
  shouldRemeasureStage,
  stageStyle,
  vignetteStyle,
  type ViewportSize,
} from './environment/stage';
import { MaterialsProvider } from './materials';
import { ContextLossHandler } from './quality/contextLoss';
import { FrameDriver } from './quality/FrameDriver';
import { QualityController } from './quality/QualityController';
import { StatsProbe } from './quality/StatsProbe';
import { CameraRig } from './rail/CameraRig';
import { ReadySignal } from './rail/ReadySignal';
import Scene from './Scene';

const toneMapping = tokens.render.toneMapping === 'agx' ? AgXToneMapping : ACESFilmicToneMapping;

/**
 * Pins the stage height (--stage-h) to its measured 100lvh and re-measures only as
 * environment/stage.ts allows, so the iOS address bar never resizes the drawing buffer.
 */
function useStageHeight(stage: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const coarse = window.matchMedia('(pointer: coarse)');
    const viewport = (): ViewportSize => ({ width: window.innerWidth, height: window.innerHeight });
    let last = viewport();
    const pin = () => {
      element.style.removeProperty('--stage-h');
      const height = element.getBoundingClientRect().height;
      if (height > 0) element.style.setProperty('--stage-h', `${Math.round(height)}px`);
    };
    pin();
    const onResize = () => {
      const next = viewport();
      if (!shouldRemeasureStage(last, next, coarse.matches)) return;
      last = next;
      pin();
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [stage]);
}

export default function MuseumCanvas() {
  const tier = useMuseum((s) => s.tier);
  const generation = useMuseum((s) => s.canvasGeneration);
  const ready = useMuseum((s) => s.ready);
  const reducedMotion = useMuseum((s) => s.reducedMotion);
  const [test] = useState(() => testParams(window.location.search).test);
  const [eventSource] = useState(() => document.getElementById('app') ?? undefined);
  const [camera] = useState(() => {
    // The lobby pose; CameraRig (WP-09) moves the camera from here.
    const lobby = galleryLayout().tracks.main.stops[0]!;
    return {
      fov: tokens.camera.fovDesktop,
      near: 0.1,
      far: 90,
      position: lobby.camera,
      rotation: poseRotation(lobby),
    };
  });
  const dpr = test ? 1 : Math.min(window.devicePixelRatio || 1, tokens.render.maxDpr[tier]);
  const stage = useRef<HTMLDivElement>(null);
  useStageHeight(stage);

  const style = stageStyle(ready, reducedMotion || test);

  return (
    <div ref={stage} style={style} data-testid={TEST_IDS.stage} aria-hidden="true">
      <Canvas
        key={generation}
        frameloop="demand"
        dpr={dpr}
        eventSource={eventSource}
        eventPrefix="client"
        gl={{
          antialias: tier !== 'low',
          powerPreference: 'high-performance',
          toneMapping,
          toneMappingExposure: tokens.render.exposure,
        }}
        camera={camera}
      >
        <FrameDriver />
        <StatsProbe />
        <ContextLossHandler />
        <MaterialsProvider>
          {/* Inside the provider (R0 ruling, 2026-10-15): the precompile warms the real library. */}
          <QualityController />
          <Suspense fallback={null}>
            <Scene />
            <CameraRig />
            <ReadySignal />
          </Suspense>
        </MaterialsProvider>
      </Canvas>
      <div style={vignetteStyle()} data-vignette="" />
    </div>
  );
}
