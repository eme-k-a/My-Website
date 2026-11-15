// The test hook (ARCHITECTURE §13.3, §13.4). Its types are frozen at contracts-v1. Enabled only by
// ?test=1: `installTestHook()` defines `window.__MUSEUM__`. `ready`, `settled` and `stop` read the
// store; `goTo` and `screenPos` delegate to the nav provider (WP-09), `stats` to the stats provider
// (StatsProbe). An unregistered provider throws `not available yet: <name>`.
import type { ExhibitId, StopId, TrackId } from '../content/ids';
import type { QualityTier } from '../museum/exhibits/_kit/types';
import { useMuseum } from './store';

export interface ExhibitStats {
  triangles: number;
  drawCalls: number;
  inBounds: boolean;
}

export interface MuseumStats {
  calls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  textureMB: number;
  frames: number;
  dpr: number;
  tier: QualityTier;
  track: TrackId;
  mounted: ExhibitId[];
  exhibits: Partial<Record<ExhibitId, ExhibitStats>>;
  camera: { position: [number, number, number]; target: [number, number, number] };
  progress: { target: number; current: number };
}

export interface GoToOptions {
  instant?: boolean;
}

export interface MuseumTestHook {
  ready: boolean;
  settled: boolean;
  stop: StopId;
  /** Resolves when settled at `id`; switches tracks via the real enter and exit path, including the wing history entry (ARCHITECTURE §6.7). */
  goTo(id: StopId, opts?: GoToOptions): Promise<void>;
  /** Client CSS px of the hit-box center; null if not mounted or off-screen. */
  screenPos(id: ExhibitId): { x: number; y: number } | null;
  stats(): MuseumStats;
}

declare global {
  interface Window {
    __MUSEUM__?: MuseumTestHook;
  }
}

export interface TestParams {
  /** `?test=1`: frozen clock, seeded noise, no idle motion, DPR 1, tier medium unless `&tier=`. */
  test: boolean;
  /** `&tier=low|medium|high`, or null. */
  tier: QualityTier | null;
  /** `&idle=1` re-enables idle motion under ?test=1 (WP-16's idle-stop test only). */
  idle: boolean;
}

const TIERS: readonly QualityTier[] = ['low', 'medium', 'high'];

export function testParams(search: string): TestParams {
  const params = new URLSearchParams(search);
  const tier = params.get('tier');
  return {
    test: params.get('test') === '1',
    tier: TIERS.find((t) => t === tier) ?? null,
    idle: params.get('idle') === '1',
  };
}

export interface NavProvider {
  goTo(id: StopId, opts?: GoToOptions): Promise<void>;
  screenPos(id: ExhibitId): { x: number; y: number } | null;
}
export type StatsProvider = () => MuseumStats;

let navProvider: NavProvider | null = null;
let statsProvider: StatsProvider | null = null;

/** Registers the nav provider; returns an unregister function (a no-op once replaced). */
export function registerNavProvider(provider: NavProvider): () => void {
  navProvider = provider;
  return () => {
    if (navProvider === provider) navProvider = null;
  };
}

/** Registers the stats provider; returns an unregister function (a no-op once replaced). */
export function registerStatsProvider(provider: StatsProvider): () => void {
  statsProvider = provider;
  return () => {
    if (statsProvider === provider) statsProvider = null;
  };
}

const notAvailable = (name: string) => new Error(`not available yet: ${name}`);

/** Where the hook is installed: `window`, or a stand-in in unit tests. */
export interface TestHookHost {
  location: { search: string };
  __MUSEUM__?: MuseumTestHook;
}

/** Defines `__MUSEUM__` on the host when its URL has ?test=1; returns the hook, or null. */
export function installTestHook(host: TestHookHost = window): MuseumTestHook | null {
  if (!testParams(host.location.search).test) return null;
  const hook: MuseumTestHook = {
    get ready() {
      return useMuseum.getState().ready;
    },
    get settled() {
      return useMuseum.getState().settled;
    },
    get stop() {
      return useMuseum.getState().stop;
    },
    goTo(id, opts) {
      if (!navProvider) return Promise.reject(notAvailable('goTo'));
      return navProvider.goTo(id, opts);
    },
    screenPos(id) {
      if (!navProvider) throw notAvailable('screenPos');
      return navProvider.screenPos(id);
    },
    stats() {
      if (!statsProvider) throw notAvailable('stats');
      return statsProvider();
    },
  };
  host.__MUSEUM__ = hook;
  return hook;
}
