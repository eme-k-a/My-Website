import { create } from 'zustand';

export type Inspectable = 'sdsj' | 'certifications';
export const canInspect = (id: string | null): id is Inspectable =>
  id === 'sdsj' || id === 'certifications';

export interface InspectionPose {
  yaw: number;
  elevation: number;
  zoom: number;
}
export interface InspectionSession {
  /** Returns true when a motion frame needs a full-resolution redraw at rest. */
  draw(pose: InspectionPose, medal: number | null, moving?: boolean): boolean;
  dispose(): void;
}

/** The pilot mesh registers when revealed and releases its shared resources on unmount. */
export const useInspection = create<{
  objectView: boolean;
  starts: Partial<Record<Inspectable, (canvas: HTMLCanvasElement) => Promise<InspectionSession>>>;
}>(() => ({ starts: {}, objectView: false }));
