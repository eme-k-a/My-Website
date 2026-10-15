// Screen and stamp textures for exhibits (ARCHITECTURE §7.5): drawn once on a 2D canvas, never
// loaded from a URL. Draw with the seeded rng from ./noise so the result is deterministic. The
// ExhibitFrame disposes the texture when the exhibit unmounts.
import { CanvasTexture, SRGBColorSpace } from 'three';

export type CanvasDraw = (ctx: CanvasRenderingContext2D, width: number, height: number) => void;

/** A `width` x `height` sRGB CanvasTexture painted by `draw`. Browser only (needs a DOM canvas). */
export function canvasTexture(draw: CanvasDraw, width: number, height: number): CanvasTexture {
  if (typeof document === 'undefined') {
    throw new Error('canvasTexture needs a DOM canvas (call it from a component, not at import)');
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvasTexture: no 2D context');
  draw(ctx, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
