// Headshot crops and textures (`npm run media`, ARCHITECTURE §15.2). Reads the original
// `assets-src/headshot.jpg` (1008 x 1792, never shipped) and writes the DOM images and the lobby
// portrait textures into `public/images/`, where they are committed.
//
// Metadata: sharp drops EXIF (GPS included), ICC and XMP unless asked to keep them, and converts to
// sRGB. Never call withMetadata(), keepExif(), keepIccProfile() or keepMetadata() here.
// Determinism: fixed encoder settings and one libvips thread, so a re-run writes identical bytes.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp, { type Sharp } from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE = join(ROOT, 'assets-src', 'headshot.jpg');
export const OUT_DIR = join(ROOT, 'public', 'images');

/** 4:5 crop from the top of the 1008 x 1792 original, as the WP-03 brief pins it. */
const CROP = { left: 0, top: 0, width: 1008, height: 1260 };
/** EXPERIENCE §2.3: the duotone maps luminance from shadows #16161A to highlights #F2EDE4. */
const SHADOW = [0x16, 0x16, 0x1a] as const;
const HIGHLIGHT = [0xf2, 0xed, 0xe4] as const;

// Tuned so headshot-800.webp stays well under its 60 KB cap (about 23 KB today).
const AVIF = { quality: 56, effort: 4, chromaSubsampling: '4:2:0' } as const;
const WEBP = { quality: 82, effort: 6, smartSubsample: true } as const;
const JPEG = { quality: 82, mozjpeg: true, progressive: true } as const;
const TEXTURE_WEBP = WEBP;

export type MediaFormat = 'avif' | 'webp' | 'jpg';

export interface MediaOutput {
  file: string;
  width: number;
  height: number;
  format: MediaFormat;
}

/** The eight files `npm run media` writes, with their exact sizes. */
export const MEDIA_OUTPUTS: readonly MediaOutput[] = [
  ...[400, 800].flatMap((width) =>
    (['avif', 'webp', 'jpg'] as const).map((format) => ({
      file: `headshot-${width}.${format}`,
      width,
      height: (width * 5) / 4,
      format,
    })),
  ),
  { file: 'headshot-texture-512.webp', width: 512, height: 640, format: 'webp' },
  { file: 'headshot-texture-512-duotone.webp', width: 512, height: 640, format: 'webp' },
];

function crop(width: number, height: number): Sharp {
  return sharp(SOURCE)
    .extract(CROP)
    .resize(width, height, { fit: 'fill', kernel: sharp.kernel.lanczos3 });
}

function encode(image: Sharp, format: MediaFormat): Promise<Buffer> {
  if (format === 'avif') return image.avif(AVIF).toBuffer();
  if (format === 'webp') return image.webp(WEBP).toBuffer();
  return image.jpeg(JPEG).toBuffer();
}

/** Raw RGB pixels of the duotone: luminance mapped linearly between the two colors, per channel. */
export async function duotonePixels(
  width: number,
  height: number,
): Promise<{ data: Buffer; width: number; height: number }> {
  const { data, info } = await crop(width, height)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixels = info.width * info.height;
  const rgb = Buffer.alloc(pixels * 3);
  for (let i = 0; i < pixels; i++) {
    const luma = data[i * info.channels]! / 255;
    for (let c = 0; c < 3; c++) {
      rgb[i * 3 + c] = Math.round(SHADOW[c]! + (HIGHLIGHT[c]! - SHADOW[c]!) * luma);
    }
  }
  return { data: rgb, width: info.width, height: info.height };
}

async function duotone(width: number, height: number): Promise<Buffer> {
  const pixels = await duotonePixels(width, height);
  return sharp(pixels.data, { raw: { width: pixels.width, height: pixels.height, channels: 3 } })
    .webp(TEXTURE_WEBP)
    .toBuffer();
}

/** Writes every file of MEDIA_OUTPUTS into `outDir` and returns their paths. */
export async function buildMedia(outDir: string = OUT_DIR): Promise<string[]> {
  sharp.concurrency(1);
  sharp.cache(false);
  await mkdir(outDir, { recursive: true });
  const written: string[] = [];
  for (const output of MEDIA_OUTPUTS) {
    let bytes: Buffer;
    if (output.file.endsWith('-duotone.webp')) {
      bytes = await duotone(output.width, output.height);
    } else if (output.file.startsWith('headshot-texture-')) {
      bytes = await crop(output.width, output.height).webp(TEXTURE_WEBP).toBuffer();
    } else {
      bytes = await encode(crop(output.width, output.height), output.format);
    }
    const path = join(outDir, output.file);
    await writeFile(path, bytes);
    written.push(path);
  }
  return written;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(resolve(entry)).href) {
  const written = await buildMedia();
  for (const path of written) console.log(`wrote ${path.slice(ROOT.length + 1)}`);
}
