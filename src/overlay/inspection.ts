import { create } from 'zustand';

export interface InspectionPose {
  yaw: number;
  elevation: number;
  zoom: number;
}
export interface InspectionSession {
  draw(pose: InspectionPose): void;
  dispose(): void;
}

/** The pilot mesh registers when revealed and releases its shared resources on unmount. */
export const useInspection = create<{
  objectView: boolean;
  start: ((canvas: HTMLCanvasElement) => Promise<InspectionSession>) | null;
}>(() => ({ start: null, objectView: false }));
