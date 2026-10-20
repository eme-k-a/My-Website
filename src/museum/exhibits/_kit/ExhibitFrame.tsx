// ExhibitFrame (ARCHITECTURE §7.4, EXPERIENCE §5.1, §5.6, §5.7): one per layout slot. It owns
// the slot frame (local +Z toward the stop camera), the invisible hit box, the wall titles, and
// the exhibit's life cycle on the stop graph:
// - distance <= 2: mount hidden; 3: preload the chunk; beyond 4: unmount and dispose;
// - Suspense and an error boundary, both showing the placeholder crate (also for a missing
//   folder), which keeps the id in the store's `placeholders` for the DOM card;
// - after the lazy component resolves: `await gl.compileAsync(scene, camera)`, then reveal.
//   `compilePending` is held from mount until the final content shows, so `ready` and
//   `settled` wait for every exhibit within distance 2 (ARCHITECTURE §13.4);
// - after reveal: exhibit meshes stop raycasting, dev and ?test=1 report measured stats, and
//   one contact-shadow pass renders on the plinth top. That pass sees only the slot's own content
//   (SHADOW_LAYER), not the whole hall, so a stop where several exhibits reveal at once stays
//   within the draw-call budget (F-M3a).
import { ContactShadows } from '@react-three/drei';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import {
  Component,
  memo,
  Suspense,
  use,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
} from 'react';
import type { Group, Object3D } from 'three';
import { useMuseum } from '../../../app/store';
import { testParams } from '../../../app/testHooks';
import type { ExhibitId, StopId } from '../../../content/ids';
import { content } from '../../../content/index';
import { entryById } from '../../../content/selectors';
import { tokens } from '../../../design/tokens';
import { openStory } from '../../../overlay/story';
import { useMaterialLibrary } from '../../materials';
import { markExhibitMounted, reportExhibit } from '../../quality/StatsProbe';
import type { Layout, Slot } from '../../rail/layout';
import { travelTo } from '../../rail/navigation';
import { hitBox, slotOrigin, slotVariant } from './anatomy';
import { MAX_EXHIBIT_TRIANGLES } from './defineExhibit';
import { fitsBounds, measureObject } from './measure';
import { Placard } from './Placard';
import { Placeholder } from './Placeholder';
import { registry } from './registry';
import {
  collectResources,
  disposeResources,
  sharedResources,
  type ExhibitResources,
} from './resources';
import { ExhibitRuntimeContext } from './runtime';
import { mountDecision, stopDistance } from './stopDistance';
import type { ExhibitManifest, ExhibitProps, ExhibitSlot } from './types';
import { useExhibitRuntime } from './useExhibitRuntime';

/** DOM controls over the canvas: a click or hover on them never reaches a case behind. */
export const DOM_CONTROLS = '[data-card], a, button, dialog';

export function overDomControl(event: Event): boolean {
  const target = event.target;
  return target instanceof Element && target.closest(DOM_CONTROLS) !== null;
}

/** Contact shadow: lift above the plinth top, plane size inside the plinth, softness. */
const SHADOW_LIFT = 0.002;
const SHADOW_MARGIN = 0.15;
const SHADOW_RESOLUTION = 256;
const SHADOW_BLUR = 1.5;
const SHADOW_OPACITY = 0.6;

const noRaycast: Object3D['raycast'] = () => {};

/**
 * The layer the contact-shadow camera renders (F-M3a). drei's ContactShadows renders the whole
 * scene from a small orthographic camera over the plinth top, and every hall-sized mesh (shell,
 * cases, beams, trim) passes its frustum test, which cost about ten extra draw calls per baking
 * slot. Only the slot's own content joins this layer, so the bake draws the exhibit (or the crate)
 * and nothing else; the main and reflector cameras keep seeing layer 0 as before.
 */
export const SHADOW_LAYER = 7;

/** Adds every drawable under `root` to SHADOW_LAYER (layer 0 stays enabled). */
export function joinShadowLayer(root: Object3D): void {
  root.traverse((object) => {
    const drawable = object as Object3D & { isMesh?: boolean; isLine?: boolean };
    if (drawable.isMesh || drawable.isLine) object.layers.enable(SHADOW_LAYER);
  });
}

/**
 * The one contact-shadow pass on the plinth top. drei's ContactShadows renders again after every
 * re-render (its frame counter lives in the component body), so it sits behind `memo` with
 * primitive props: it renders once per mount, not whenever the frame's runtime changes.
 */
const PlinthShadow = memo(function PlinthShadow({ scale, far }: { scale: number; far: number }) {
  const root = useRef<Group>(null);
  // Before the first frame, so the one bake already sees only SHADOW_LAYER.
  useLayoutEffect(() => {
    root.current?.traverse((object) => {
      if ((object as Object3D & { isCamera?: boolean }).isCamera) object.layers.set(SHADOW_LAYER);
    });
  }, []);
  return (
    <ContactShadows
      ref={root}
      position={[0, SHADOW_LIFT, 0]}
      scale={scale}
      far={far}
      resolution={SHADOW_RESOLUTION}
      blur={SHADOW_BLUR}
      opacity={SHADOW_OPACITY}
      color={tokens.color.ink}
      frames={1}
    />
  );
});

type ExhibitModule = { default: ComponentType<ExhibitProps> };
const loads = new Map<ExhibitId, Promise<ExhibitModule>>();

/** The exhibit chunk, requested once per page (the distance-3 preload and the mount share it). */
export function loadExhibit(manifest: ExhibitManifest): Promise<ExhibitModule> {
  let pending = loads.get(manifest.id);
  if (!pending) {
    pending = manifest.load();
    loads.set(manifest.id, pending);
  }
  return pending;
}

/** Suspends until the chunk is in, then renders the exhibit; a failed chunk throws to the boundary. */
function LoadedExhibit({ manifest, ...props }: ExhibitProps & { manifest: ExhibitManifest }) {
  const { default: Exhibit } = use(loadExhibit(manifest));
  return <Exhibit {...props} />;
}

function setCursor(element: HTMLElement | null | undefined, cursor: string): void {
  if (element?.style) element.style.cursor = cursor;
}

/** Click on a case: the settled stop opens its story, any other exhibit is travelled to. */
function activate(id: ExhibitId): void {
  const { settled, stop } = useMuseum.getState();
  if (settled && stop === id) {
    openStory(id, { source: 'case' });
    return;
  }
  useMuseum.setState({ inputSource: 'pointer' });
  // Travel errors (for example a wing stop before WP-09) leave the visitor where they are.
  travelTo(id).catch((error: unknown) => console.warn('travelTo failed', error));
}

function HitBox({ slot }: { slot: Slot }) {
  const id = slot.id;
  const box = useMemo(() => hitBox(slotVariant(slot)), [slot]);
  const source = useThree((s) => s.events.connected as HTMLElement | null | undefined);
  const leave = useCallback(() => {
    if (useMuseum.getState().hovered === id) useMuseum.setState({ hovered: null });
    setCursor(source, '');
  }, [id, source]);
  useEffect(() => leave, [leave]);
  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (overDomControl(event.nativeEvent)) {
        leave();
        return;
      }
      event.stopPropagation();
      if (useMuseum.getState().hovered !== id) useMuseum.setState({ hovered: id });
      setCursor(source, 'pointer');
    },
    [id, leave, source],
  );
  const onClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (overDomControl(event.nativeEvent)) return;
      event.stopPropagation();
      activate(id);
    },
    [id],
  );
  return (
    <mesh
      name={`hit-${id}`}
      position={box.center}
      visible={false}
      onPointerMove={onPointerMove}
      onPointerOut={leave}
      onClick={onClick}
    >
      <boxGeometry args={box.size} />
    </mesh>
  );
}

interface BoundaryProps {
  onError: (error: unknown) => void;
  children: ReactNode;
}

/** A failed chunk or a throwing exhibit renders nothing here; the frame shows the crate. */
class ExhibitBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    this.props.onError(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Calls `onCommit` once its Suspense boundary has committed, i.e. the lazy exhibit resolved. */
function OnCommit({ onCommit }: { onCommit: () => void }) {
  useEffect(() => onCommit(), [onCommit]);
  return null;
}

const shouldReport = (): boolean => import.meta.env.DEV || testParams(window.location.search).test;

function ExhibitMount({ slot, manifest }: { slot: Slot; manifest: ExhibitManifest | undefined }) {
  const id = slot.id;
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const library = useMaterialLibrary();
  const runtime = useExhibitRuntime(id);
  const variant = slotVariant(slot);
  const exhibitSlot = useMemo<ExhibitSlot>(
    () => ({ id, mount: slot.mount, bounds: slot.bounds }),
    [id, slot],
  );
  const entry = useMemo(() => entryById(content, id), [id]);

  const [failed, setFailed] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [crateReady, setCrateReady] = useState(false);
  const group = useRef<Group>(null);
  /** The slot's own content (the crate and the exhibit): what the contact shadow may see. */
  const ownContent = useRef<Group>(null);
  const showsExhibit = manifest !== undefined && !failed;
  const showsPlaceholder = !showsExhibit || !revealed;
  /** The slot shows its final content (the revealed exhibit, or the crate for good). */
  const final = showsExhibit ? revealed : crateReady;

  // stats().mounted: from mount, whatever the slot shows (PLAN Addendum, WP-02 rulings).
  useEffect(() => markExhibitMounted(id), [id]);

  // compilePending: +1 at mount, -1 once the final content shows (or at unmount).
  const release = useRef<() => void>(() => {});
  useLayoutEffect(() => {
    let held = true;
    useMuseum.setState((s) => ({ compilePending: s.compilePending + 1 }));
    release.current = () => {
      if (!held) return;
      held = false;
      useMuseum.setState((s) => ({ compilePending: s.compilePending - 1 }));
    };
    return () => release.current();
  }, []);

  // The store's placeholder list drives "Installation in progress" on the DOM card.
  useEffect(() => {
    if (!showsPlaceholder) return;
    useMuseum.setState((s) =>
      s.placeholders.includes(id) ? s : { placeholders: [...s.placeholders, id] },
    );
    return () =>
      useMuseum.setState((s) => ({ placeholders: s.placeholders.filter((p) => p !== id) }));
  }, [showsPlaceholder, id]);

  // Missing folder or failed exhibit: compile what shows (the crate) and settle on it.
  useEffect(() => {
    if (showsExhibit) return;
    let alive = true;
    const settle = () => {
      if (!alive) return;
      reportExhibit(id, null);
      release.current();
      setCrateReady(true);
      invalidate();
    };
    gl.compileAsync(scene, camera).then(settle, settle);
    return () => {
      alive = false;
    };
  }, [showsExhibit, gl, scene, camera, id, invalidate]);

  // The lazy exhibit resolved: compile its programs while hidden, then reveal it.
  const onResolved = useCallback(() => setResolved(true), []);
  useEffect(() => {
    if (!showsExhibit || !resolved || revealed) return;
    let alive = true;
    gl.compileAsync(scene, camera).then(
      () => {
        if (!alive) return;
        group.current?.traverse((object) => {
          const drawable = object as Object3D & { isMesh?: boolean; isLine?: boolean };
          if (drawable.isMesh || drawable.isLine) object.raycast = noRaycast;
        });
        setRevealed(true);
      },
      (error: unknown) => {
        if (!alive) return;
        console.error(`Exhibit '${id}' failed to compile`, error);
        setFailed(true);
      },
    );
    return () => {
      alive = false;
    };
  }, [showsExhibit, resolved, revealed, gl, scene, camera, id]);

  // After the reveal commit: settle, measure, and remember what to dispose.
  const resources = useRef<ExhibitResources | null>(null);
  const shared = useMemo(() => sharedResources(library), [library]);
  useEffect(() => {
    if (!revealed || failed) return;
    const root = group.current;
    release.current();
    invalidate();
    if (!root) return;
    resources.current = collectResources(root, shared);
    if (shouldReport() && manifest) {
      const { box, triangles, drawCalls } = measureObject(root);
      const budget = Math.min(manifest.budget.triangles, MAX_EXHIBIT_TRIANGLES);
      reportExhibit(id, {
        triangles,
        drawCalls,
        inBounds: fitsBounds(box, slot.bounds) && triangles <= budget,
      });
    }
  }, [revealed, failed, shared, id, manifest, slot.bounds, invalidate]);

  // Unmount (beyond distance 4): dispose geometries, own materials and their textures. A layout
  // effect, so the exhibit's objects are still attached when it runs.
  useLayoutEffect(
    () => () => {
      const found = resources.current ?? undefined;
      const root = group.current;
      const all = root ? collectResources(root, shared, found) : found;
      if (all) disposeResources(all);
    },
    [shared],
  );

  // The final content joins SHADOW_LAYER before PlinthShadow's one bake (next frame).
  useLayoutEffect(() => {
    if (final && ownContent.current) joinShadowLayer(ownContent.current);
  }, [final, revealed]);

  const onError = useCallback(
    (error: unknown) => {
      console.error(`Exhibit '${id}' failed; showing the placeholder`, error);
      setFailed(true);
      setRevealed(false);
    },
    [id],
  );

  const shadowBounds = slot.bounds;
  const shadowScale = Math.min(
    shadowBounds.max[0] - shadowBounds.min[0],
    shadowBounds.max[2] - shadowBounds.min[2],
  );

  return (
    <>
      <group ref={ownContent} name="slot-content">
        <Placeholder slot={exhibitSlot} visible={showsPlaceholder} />
        {showsExhibit && manifest && (
          <group ref={group} name={`exhibit-${id}`} visible={revealed}>
            <ExhibitBoundary onError={onError}>
              <Suspense fallback={null}>
                <ExhibitRuntimeContext.Provider value={runtime}>
                  <LoadedExhibit
                    manifest={manifest}
                    entry={entry}
                    slot={exhibitSlot}
                    runtime={runtime}
                    materials={library}
                  />
                </ExhibitRuntimeContext.Provider>
                <OnCommit onCommit={onResolved} />
              </Suspense>
            </ExhibitBoundary>
          </group>
        )}
      </group>
      {final && variant !== 'wall' && (
        <PlinthShadow
          key={revealed ? 'exhibit' : 'placeholder'}
          scale={shadowScale + SHADOW_MARGIN}
          far={shadowBounds.max[1]}
        />
      )}
    </>
  );
}

export interface ExhibitFrameProps {
  slot: Slot;
  layout: Layout;
  /** The visitor's stop (nearest stop to the rail progress). */
  here: StopId;
}

export function ExhibitFrame({ slot, layout, here }: ExhibitFrameProps) {
  const distance = stopDistance(layout, here, slot.id);
  const [mounted, setMounted] = useState(() => mountDecision(false, distance).mount);
  const decision = mountDecision(mounted, distance);
  if (decision.mount !== mounted) setMounted(decision.mount);
  const manifest = registry.get(slot.id);
  useEffect(() => {
    // The chunk lands in the module cache; a failure surfaces later through the boundary.
    if (decision.preload && manifest) loadExhibit(manifest).catch(() => undefined);
  }, [decision.preload, manifest]);
  const origin = useMemo(() => slotOrigin(slot), [slot]);
  return (
    <>
      <group name={`slot-${slot.id}`} position={origin} rotation-y={slot.rotationY}>
        <HitBox slot={slot} />
        {decision.mount && <ExhibitMount slot={slot} manifest={manifest} />}
      </group>
      <Placard layout={layout} slot={slot} />
    </>
  );
}
