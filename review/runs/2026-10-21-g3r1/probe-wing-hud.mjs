// G3 round 1 probe (R11): at each wing exhibit on phone viewports, does the wing HUD (chip and
// "Return to the aisle") sit on the 3D wall title? Counts brass title pixels inside the exit
// button and chip rects (inset 3 px so their own brass border is excluded), and saves the shot.
//   node review/runs/2026-10-21-g3r1/probe-wing-hud.mjs http://localhost:4174 <outDir>
import { writeFile } from 'node:fs/promises';
import { chromium, devices } from '@playwright/test';
import sharp from 'sharp';

const [, , base, outDir] = process.argv;
const DEV = {
  pixel7: { ...devices['Pixel 7'] },
  small: { ...devices['Pixel 7'], viewport: { width: 360, height: 640 } },
};
const STOPS = ['klarup', 'finance-tracker', 'sdsj'];
const b = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const out = [];
for (const [dev, opts] of Object.entries(DEV)) {
  const p = await b.newPage(opts);
  await p.goto(`${base}/?test=1&mode=museum`);
  await p.waitForFunction(() => window.__MUSEUM__?.ready === true, null, { timeout: 120000 });
  for (const stop of STOPS) {
    await p.evaluate((id) => window.__MUSEUM__.goTo(id, { instant: true }), stop);
    await p.waitForFunction(() => window.__MUSEUM__.settled, null, { timeout: 120000 });
    let last = -1;
    for (let i = 0; i < 40; i++) {
      const f = await p.evaluate(() => window.__MUSEUM__.stats().frames);
      if (f === last) break;
      last = f;
      await p.waitForTimeout(1200);
    }
    const rects = await p.evaluate(() => {
      const r = (el) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
      };
      const exit = document.querySelector('[data-testid="exit-wing"]');
      const chip = exit?.parentElement?.querySelector('p, span') ?? null;
      return { exit: r(exit), chip: r(chip), dpr: window.devicePixelRatio };
    });
    const file = `${outDir}/probe-${stop}-${dev}.png`;
    const buf = await p.screenshot({ path: file });
    const img = sharp(buf);
    const { width, height } = await img.metadata();
    const raw = await img.raw().toBuffer();
    const ch = raw.length / (width * height);
    const scale = width / opts.viewport.width;
    const brassIn = (rect) => {
      if (!rect) return null;
      let n = 0;
      const x0 = Math.round((rect.left + 3) * scale), x1 = Math.round((rect.right - 3) * scale);
      const y0 = Math.round((rect.top + 3) * scale), y1 = Math.round((rect.bottom - 3) * scale);
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = (y * width + x) * ch;
          const [R, G, B] = [raw[i], raw[i + 1], raw[i + 2]];
          if (R > 90 && R - B > 45 && R >= G) n++;
        }
      return n;
    };
    out.push({ dev, stop, viewport: opts.viewport, ...rects, brassPxInExit: brassIn(rects.exit), file });
  }
  await p.close();
}
await b.close();
await writeFile(`${outDir}/probe-wing-hud.json`, `${JSON.stringify(out, null, 2)}\n`);
console.log(out.map((o) => `${o.dev} ${o.stop} exit=${JSON.stringify(o.exit)} brassPxInExit=${o.brassPxInExit}`).join('\n'));
