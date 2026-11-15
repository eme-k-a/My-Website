// Full-page captures of stops: node cap.mjs <base> <outDir> <label> <dev:stop,...>
import { chromium, devices } from '@playwright/test';
const [, , base, outDir, label, list] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const DEV = { desktop: { viewport: { width: 1440, height: 900 } }, pixel7: { ...devices['Pixel 7'] }, small: { ...devices['Pixel 7'], viewport: { width: 360, height: 640 } } };
const pages = {};
for (const item of list.split(',')) {
  const [dev, stop] = item.split(':');
  if (!pages[dev]) {
    pages[dev] = await b.newPage(DEV[dev]);
    await pages[dev].goto(`${base}/?test=1&mode=museum`);
    await pages[dev].waitForFunction(() => window.__MUSEUM__?.ready === true, null, { timeout: 120000 });
  }
  const p = pages[dev];
  await p.evaluate((id) => window.__MUSEUM__.goTo(id, { instant: true }), stop);
  await p.waitForFunction(() => window.__MUSEUM__.settled, null, { timeout: 120000 });
  let last = -1;
  for (let i = 0; i < 40; i++) { const f = await p.evaluate(() => window.__MUSEUM__.stats().frames); if (f === last) break; last = f; await p.waitForTimeout(1200); }
  await p.screenshot({ path: `${outDir}/${label}-${stop}-${dev}.png` });
}
await b.close();
