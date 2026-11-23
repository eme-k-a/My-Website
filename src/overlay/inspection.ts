import { create } from 'zustand';

export const workViews = {
  mysa: {
    title: 'Warm Start',
    label: 'Dial and key',
    yaw: -25,
    elevation: 20,
    zoom: 1.2,
    detail:
      'The dial follows a release through four stages. Beside it, a key passes through a brass ring to represent single sign-on.',
  },
  wailo: {
    title: 'The Deep Link',
    label: 'Envelope to screen',
    yaw: -42,
    elevation: 22,
    zoom: 1.2,
    detail:
      'Follow the arc from the envelope to the reset card on the phone. It traces the path of a password recovery link.',
  },
  cfia: {
    title: 'The Ticket Spindle',
    label: 'Stamped corner',
    yaw: 23,
    elevation: 48,
    zoom: 1.3,
    detail:
      'Look for the dark stamp in the corner of the uppermost ticket. Each sheet represents a support request.',
  },
} as const;

export type WorkViewId = keyof typeof workViews;
export const isWorkView = (id: string | null): id is WorkViewId =>
  id !== null && Object.hasOwn(workViews, id);
export type Inspectable = 'sdsj' | 'certifications' | 'finance-tracker' | WorkViewId;
export const canInspect = (id: string | null): id is Inspectable =>
  isWorkView(id) || id === 'sdsj' || id === 'certifications' || id === 'finance-tracker';

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
