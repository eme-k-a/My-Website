// The front desk (EXPERIENCE §2.3, §11.1 item 4): a low walnut and brass desk at the desk stop's
// look target, with the gift shop on top. Each object is the 3D twin of a DOM button on the desk
// card and does exactly what that button does (StopCard.tsx DeskPlacard, same URLs from
// cardOf('desk')): the sealed envelope is the email link, the postcard LinkedIn, the printed
// catalogue the PDF, the ledger GitHub. No text, no logos. Pure boxes in desk-local meters
// (origin on the floor under the desk center, +Z toward the visitor); Desk.tsx instances them
// per material.
import { Matrix4 } from 'three';
import { cardOf, PDF_PATH } from '../../overlay/model';
import type { Layout, Vec3 } from '../rail/layout';

/** Overall desk: 1.8 m wide, 0.7 m deep, top surface at 0.765 m (lightPlan.ts DESK_TOP_Y). */
export const DESK_SIZE = [1.8, 0.765, 0.7] as const;
const [W, H, D] = DESK_SIZE;
const TOP_T = 0.04;
const PEDESTAL = [0.42, H - TOP_T, 0.6] as const;
const PEDESTAL_X = W / 2 - PEDESTAL[0] / 2 - 0.04;
const KICK_H = 0.05;
const BAND_H = 0.018;

export type DeskMaterial = 'walnut' | 'brass' | 'paper';

export interface DeskBox {
  name: string;
  material: DeskMaterial;
  center: Vec3;
  size: Vec3;
  /** Rotation about +Y (objects lie a little askew on the top). */
  rotationY?: number;
}

/** The desk body: walnut top and pedestals, brass kick plates and a brass band under the top. */
export function deskBodyBoxes(): DeskBox[] {
  const ped = (sx: number): DeskBox[] => [
    {
      name: `pedestal-${sx < 0 ? 'left' : 'right'}`,
      material: 'walnut',
      center: [sx * PEDESTAL_X, KICK_H + (PEDESTAL[1] - KICK_H) / 2, 0],
      size: [PEDESTAL[0], PEDESTAL[1] - KICK_H, PEDESTAL[2]],
    },
    {
      name: `kick-${sx < 0 ? 'left' : 'right'}`,
      material: 'brass',
      center: [sx * PEDESTAL_X, KICK_H / 2, 0],
      size: [PEDESTAL[0] + 0.01, KICK_H, PEDESTAL[2] + 0.01],
    },
  ];
  return [
    { name: 'top', material: 'walnut', center: [0, H - TOP_T / 2, 0], size: [W, TOP_T, D] },
    {
      name: 'modesty-panel',
      material: 'walnut',
      center: [0, (H - TOP_T) / 2 + 0.12, D / 2 - 0.06],
      size: [W - 2 * PEDESTAL[0] - 0.08, H - TOP_T - 0.24, 0.025],
    },
    {
      name: 'band',
      material: 'brass',
      center: [0, H - TOP_T - BAND_H / 2, D / 2 - 0.005],
      size: [W - 0.02, BAND_H, 0.01],
    },
    ...ped(-1),
    ...ped(1),
  ];
}

/** What a desk object does: the same action as the DOM button it duplicates. */
export type DeskAction = 'email' | 'linkedin' | 'pdf' | 'github';

export interface DeskObject {
  action: DeskAction;
  /** Short accessible-style name, used as the mesh name and in the tests. */
  name: string;
  /** Its parts; the first one is the body the hit box is built around. */
  parts: DeskBox[];
}

const ON_TOP = H;

/**
 * The four objects, left to right as the visitor sees them: envelope, postcard, catalogue,
 * ledger. GitHub is optional in the content, so the ledger is left out when it has no link.
 */
export function deskObjects(hasGithub: boolean): DeskObject[] {
  const objects: DeskObject[] = [
    {
      action: 'email',
      name: 'sealed envelope',
      parts: [
        {
          name: 'envelope',
          material: 'paper',
          center: [-0.6, ON_TOP + 0.003, 0.08],
          size: [0.24, 0.006, 0.12],
          rotationY: 0.12,
        },
        {
          name: 'seal',
          material: 'brass',
          center: [-0.6, ON_TOP + 0.008, 0.08],
          size: [0.03, 0.004, 0.03],
          rotationY: 0.12 + Math.PI / 4,
        },
      ],
    },
    {
      action: 'linkedin',
      name: 'postcard',
      parts: [
        {
          name: 'postcard',
          material: 'paper',
          center: [-0.26, ON_TOP + 0.002, 0.12],
          size: [0.15, 0.004, 0.105],
          rotationY: -0.18,
        },
      ],
    },
    {
      action: 'pdf',
      name: 'printed catalogue',
      parts: [
        {
          name: 'catalogue',
          material: 'paper',
          center: [0.14, ON_TOP + 0.012, 0.02],
          size: [0.21, 0.024, 0.297],
          rotationY: 0.06,
        },
        {
          name: 'catalogue-spine',
          material: 'brass',
          center: [0.14 - 0.105 * Math.cos(0.06), ON_TOP + 0.013, 0.02 + 0.105 * Math.sin(0.06)],
          size: [0.006, 0.026, 0.297],
          rotationY: 0.06,
        },
      ],
    },
  ];
  if (hasGithub) {
    objects.push({
      action: 'github',
      name: 'ledger',
      parts: [
        {
          name: 'ledger',
          material: 'walnut',
          center: [0.56, ON_TOP + 0.025, 0.0],
          size: [0.2, 0.05, 0.28],
          rotationY: -0.1,
        },
        {
          name: 'ledger-clasp',
          material: 'brass',
          center: [0.56 + 0.1 * Math.cos(0.1), ON_TOP + 0.025, 0.0 + 0.1 * Math.sin(0.1)],
          size: [0.012, 0.02, 0.05],
          rotationY: -0.1,
        },
      ],
    });
  }
  return objects;
}

/** Hit boxes are the object's body plus this margin on every side, so small objects are easy to click. */
export const DESK_HIT_MARGIN = 0.03;

/** The href each action opens: the same values the desk card's links use. */
export interface DeskLinks {
  email: string;
  linkedin: string;
  pdf: string;
  github?: string;
}

export function deskHref(action: DeskAction, links: DeskLinks): string | null {
  switch (action) {
    case 'email':
      return links.email;
    case 'linkedin':
      return links.linkedin;
    case 'pdf':
      return links.pdf;
    case 'github':
      return links.github ?? null;
  }
}

/** The desk card's links: the very values its DOM buttons use. */
export function deskLinks(): DeskLinks {
  const card = cardOf('desk');
  if (card.kind !== 'desk') throw new Error('The desk stop has no desk card');
  return {
    email: card.email,
    linkedin: card.linkedin,
    pdf: PDF_PATH,
    ...(card.github !== undefined && { github: card.github }),
  };
}

/** The desk's floor origin: under the desk stop's look target. Null without a desk stop. */
export function deskOrigin(layout: Layout): Vec3 | null {
  const desk = layout.tracks.main.stops.find((s) => s.id === 'desk');
  return desk ? [desk.look[0], 0, desk.look[2]] : null;
}

/** A unit-box instance matrix for a desk part (desk-local). */
export function deskBoxMatrix(box: DeskBox): Matrix4 {
  return new Matrix4()
    .makeTranslation(...box.center)
    .multiply(new Matrix4().makeRotationY(box.rotationY ?? 0))
    .multiply(new Matrix4().makeScale(...box.size));
}
