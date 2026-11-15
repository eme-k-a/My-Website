// The app store (ARCHITECTURE §5.5). Its state shape is frozen at contracts-v1; changes go through
// R0. There are no custom actions: consumers call `useMuseum.setState`. Per-frame values live in
// src/museum/rail/progress.ts, not here.
import { create } from 'zustand';
import type { ExhibitId, StopId, TrackId } from '../content/ids';
import type { QualityTier } from '../museum/exhibits/_kit/types';

export type InputSource = 'scroll' | 'keyboard' | 'hud' | 'pointer';

export interface MuseumState {
  mode: 'museum' | 'classic';
  tier: QualityTier; // set once at boot by quality/tiers.ts
  reducedMotion: boolean; // live matchMedia
  track: TrackId; // 'main' | 'projects' | 'volunteer'
  stop: StopId; // last settled stop (written only on change)
  settled: boolean;
  openId: ExhibitId | null; // story dialog
  mainScrollY: number; // saved on wing entry
  ready: boolean;
  hovered: ExhibitId | null;
  lastInputAt: number; // ms, drives the 15 s idle-motion stop
  inputSource: InputSource; // aria-live announces only keyboard and hud
  textPending: number; // troika texts not yet synced
  compilePending: number; // exhibits mounted but not yet compiled
  contextLost: boolean; // R7 context-loss handler; R6 shows the veil
  canvasGeneration: number; // React key of <Canvas>; +1 remounts after a context restore
  placeholders: ExhibitId[]; // exhibits currently showing the placeholder crate (R3 writes, R6's card shows "Installation in progress")
}

/** A fresh copy of the initial state (tests reset with `useMuseum.setState(initialMuseumState())`). */
export function initialMuseumState(): MuseumState {
  return {
    mode: 'museum',
    tier: 'medium',
    reducedMotion: false,
    track: 'main',
    stop: 'lobby',
    settled: false,
    openId: null,
    mainScrollY: 0,
    ready: false,
    hovered: null,
    lastInputAt: 0,
    inputSource: 'scroll',
    textPending: 0,
    compilePending: 0,
    contextLost: false,
    canvasGeneration: 0,
    placeholders: [],
  };
}

export const useMuseum = create<MuseumState>()(() => initialMuseumState());
