import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { buildMedia, duotonePixels, MEDIA_OUTPUTS, OUT_DIR, SOURCE } from './build-media';

const SHARP_FORMAT = { avif: 'heif', webp: 'webp', jpg: 'jpeg' } as const;
const WEBP_800_MAX_BYTES = 61_440;

const temps: string[] = [];
afterAll(async () => {
  await Promise.all(temps.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('committed headshot images (public/images)', () => {
  it('holds exactly the 8 outputs', async () => {
    const files = (await readdir(OUT_DIR)).sort();
    expect(files).toEqual(MEDIA_OUTPUTS.map((o) => o.file).sort());
  });

  it.each(MEDIA_OUTPUTS.map((o) => [o.file, o] as const))(
    '%s has the right format and size',
    async (_file, output) => {
      const meta = await sharp(join(OUT_DIR, output.file)).metadata();
      expect(meta.format).toBe(SHARP_FORMAT[output.format]);
      expect([meta.width, meta.height]).toEqual([output.width, output.height]);
    },
  );

  it.each(MEDIA_OUTPUTS.map((o) => o.file))('%s carries no EXIF, ICC or XMP', async (file) => {
    const meta = await sharp(join(OUT_DIR, file)).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.icc).toBeUndefined();
    expect(meta.xmp).toBeUndefined();
  });

  it('strips metadata the original does carry', async () => {
    expect((await sharp(SOURCE).metadata()).exif).toBeDefined();
  });

  it('keeps headshot-800.webp at most 60 KB', async () => {
    const { size } = await stat(join(OUT_DIR, 'headshot-800.webp'));
    expect(size).toBeLessThanOrEqual(WEBP_800_MAX_BYTES);
  });

  it('maps the duotone between #16161A and #F2EDE4', async () => {
    const expected = await duotonePixels(512, 640);
    const { data, info } = await sharp(join(OUT_DIR, 'headshot-texture-512-duotone.webp'))
      .raw()
      .toBuffer({ resolveWithObject: true });
    expect(info.channels).toBe(3);
    let error = 0;
    for (let i = 0; i < data.length; i++) error += Math.abs(data[i]! - expected.data[i]!);
    // Lossy WebP moves a few levels; the encoded texture stays on the ramp.
    expect(error / data.length).toBeLessThan(3);
    // The unencoded ramp never leaves the two endpoints, channel by channel.
    const shadow = [0x16, 0x16, 0x1a];
    const highlight = [0xf2, 0xed, 0xe4];
    for (let i = 0; i < expected.data.length; i++) {
      const value = expected.data[i]!;
      if (value < shadow[i % 3]! || value > highlight[i % 3]!) {
        throw new Error(`Pixel ${Math.floor(i / 3)} channel ${i % 3} is off the ramp: ${value}`);
      }
    }
  });
});

describe('buildMedia', () => {
  it('writes identical bytes on every run', { timeout: 60_000 }, async () => {
    const runs: string[] = [];
    for (let i = 0; i < 2; i++) {
      const dir = await mkdtemp(join(tmpdir(), 'build-media-'));
      temps.push(dir);
      await buildMedia(dir);
      runs.push(dir);
    }
    for (const { file } of MEDIA_OUTPUTS) {
      const [a, b] = await Promise.all(runs.map((dir) => readFile(join(dir, file))));
      expect(a!.equals(b!), file).toBe(true);
    }
  });
});
