// F-M5p capture: node cap.mjs <base> <outDir> <devs comma> <stops comma>
// Saves <stop>-<dev>.png and a json with the active rail label rect, HUD rects, card rect and
// samples. Run from the repo root so @playwright/test and sharp resolve.
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(process.cwd() + '/package.json');
const { chromium, devices } = require('@playwright/test');
const sharp = require('sharp');

const [, , base, outDir, devArg, stopArg] = process.argv;
await mkdir(outDir, { recursive: true });
const ALL = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, tier: 'high' },
  pixel7: { ...devices['Pixel 7'], tier: 'medium' },
  small: { ...devices['Pixel 7'], viewport: { width: 360, height: 640 }, tier: 'medium' },
};
const b = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const out = [];
for (const dev of devArg.split(',')) {
  const { tier, ...opts } = ALL[dev];
  const p = await b.newPage(opts);
  await p.goto(`${base}/?test=1&mode=museum&tier=${tier}`);
  await p.waitForFunction(() => window.__MUSEUM__?.ready === true, null, { timeout: 180000 });
  for (const stop of stopArg.split(',')) {
    if (stop !== 'lobby') await p.evaluate((id) => window.__MUSEUM__.goTo(id, { instant: true }), stop);
    await p.waitForFunction(() => window.__MUSEUM__.settled, null, { timeout: 180000 });
    let last = -1;
    for (let i = 0; i < 40; i++) {
      const f = await p.evaluate(() => window.__MUSEUM__.stats().frames);
      if (f === last) break;
      last = f;
      await p.waitForTimeout(1200);
    }
    const dom = await p.evaluate(() => {
      const r = (el) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
      };
      const cur = document.querySelector('[aria-current="step"] span');
      const hud = document.querySelector('[data-testid="hud"]');
      let hudRow = 0;
      for (const el of hud ? hud.querySelectorAll('a, button') : []) {
        const b = el.getBoundingClientRect();
        if (b.width > 0 && b.top < 120) hudRow = Math.max(hudRow, b.bottom);
      }
      const card = [...document.querySelectorAll('[data-testid^="card-"]')].find(
        (e) => e.getBoundingClientRect().width > 0,
      );
      return { activeLabel: r(cur), hudRow, card: r(card) };
    });
    const file = `${outDir}/${stop}-${dev}.png`;
    const buf = await p.screenshot({ path: file });
    const img = sharp(buf);
    const { width, height } = await img.metadata();
    const raw = await img.raw().toBuffer();
    const ch = raw.length / (width * height);
    const px = (x, y) => [0, 1, 2].map((c) => raw[(y * width + x) * ch + c]);
    // Mean of the far field: the left 45% x the middle band, and a few named samples.
    const mean = (x0, y0, x1, y1) => {
      const s = [0, 0, 0];
      let n = 0;
      for (let y = y0; y < y1; y += 2)
        for (let x = x0; x < x1; x += 2) {
          const v = px(x, y);
          s[0] += v[0]; s[1] += v[1]; s[2] += v[2]; n++;
        }
      return s.map((v) => +(v / n).toFixed(1));
    };
    const W = opts.viewport.width;
    const H = opts.viewport.height;
    const rec = {
      dev, stop, viewport: opts.viewport, ...dom,
      sample300: dev === 'desktop' ? px(300, 300) : null,
      meanUpperThird: mean(0, 0, width, Math.floor(height / 3)),
      meanLeftHalfMid: mean(0, Math.floor(height * 0.2), Math.floor(width / 2), Math.floor(height * 0.6)),
      file,
    };
    // Brass pixels inside the active label rect plus 16 px (desktop doors).
    if (dom.activeLabel && dev === 'desktop') {
      const a = dom.activeLabel;
      let n = 0;
      let minX = Infinity;
      for (let y = Math.max(0, Math.round(a.top - 16)); y < Math.min(H, Math.round(a.bottom + 16)); y++)
        for (let x = Math.max(0, Math.round(a.left - 16)); x < Math.min(W, Math.round(a.right)); x++) {
          const [R, G, B] = px(x, y);
          if (R > 90 && R - B > 45 && R >= G) { n++; minX = Math.min(minX, x); }
        }
      rec.brassNearLabel = n;
      // Rightmost brass column left of the label band (scan rows y top-16..bottom+16 across x<left).
      let maxBrassX = -1;
      for (let y = 100; y < H - 60; y++)
        for (let x = 446; x < Math.round(a.left); x++) {
          const [R, G, B] = px(x, y);
          if (R > 90 && R - B > 45 && R >= G && x > maxBrassX) maxBrassX = x;
        }
      rec.rightmostBrassX = maxBrassX;
    }
    out.push(rec);
    console.log(JSON.stringify({ ...rec, file: undefined }));
  }
  await p.close();
}
await b.close();
await writeFile(`${outDir}/capture-${devArg.replace(/,/g, '_')}.json`, `${JSON.stringify(out, null, 2)}\n`);
