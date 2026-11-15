// F-015 probe: per stop, the settled frame (S1) vs a forced fresh frame (S2), plus a glide arrival.
import { chromium, devices } from '@playwright/test';
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
const [, , base, outDir, label] = process.argv;
const STOPS = ['lobby', 'verafin', 'mysa', 'wailo', 'cfia', 'finance-tracker', 'sdsj', 'mun', 'certifications', 'desk'];
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const result = {};
async function raw(page) {
  const png = await page.locator('canvas').first().screenshot();
  return { png, px: await sharp(png).raw().toBuffer() };
}
function diff(a, b) {
  if (a.length !== b.length) return { maxd: 255, changed: 1 };
  let n = 0, maxd = 0;
  for (let i = 0; i < a.length; i++) { const d = Math.abs(a[i] - b[i]); if (d > maxd) maxd = d; if (d > 8) n++; }
  return { maxd, changed: +(n / a.length).toFixed(5) };
}
async function quiet(page) {
  // settled, then rendered frames unchanged for 1.5 s
  await page.waitForFunction(() => window.__MUSEUM__.settled, null, { timeout: 120000 });
  let last = -1;
  for (let i = 0; i < 60; i++) {
    const f = await page.evaluate(() => window.__MUSEUM__.stats().frames);
    if (f === last) return f;
    last = f;
    await page.waitForTimeout(1500);
  }
  return last;
}
for (const [dev, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['pixel7', { ...devices['Pixel 7'] }]]) {
  const page = await b.newPage(opts);
  const t0 = Date.now();
  await page.goto(`${base}/?test=1&mode=museum`);
  await page.waitForFunction(() => window.__MUSEUM__?.ready === true, null, { timeout: 120000 });
  const readyMs = Date.now() - t0;
  const readyFrames = await page.evaluate(() => window.__MUSEUM__.stats().frames);
  result[dev] = { readyMs, readyFrames, stops: {} };
  const vp = page.viewportSize();
  for (const stop of STOPS) {
    await page.evaluate((id) => window.__MUSEUM__.goTo(id, { instant: true }), stop);
    const frames = await quiet(page);
    const s1 = await raw(page);
    await page.setViewportSize({ width: vp.width, height: vp.height + 2 });
    await page.setViewportSize(vp);
    await quiet(page);
    const s2 = await raw(page);
    writeFileSync(`${outDir}/${label}-${dev}-${stop}.png`, s1.png);
    result[dev].stops[stop] = { frames, staleVsFresh: diff(s1.px, s2.px) };
  }
  // A glided arrival (not instant) from the lobby to mysa: exhibits mount mid-glide.
  await page.evaluate(() => window.__MUSEUM__.goTo('lobby', { instant: true }));
  await quiet(page);
  await page.evaluate(() => window.__MUSEUM__.goTo('mysa'));
  await quiet(page);
  const g1 = await raw(page);
  await page.setViewportSize({ width: vp.width, height: vp.height + 2 });
  await page.setViewportSize(vp);
  await quiet(page);
  const g2 = await raw(page);
  writeFileSync(`${outDir}/${label}-${dev}-glide-mysa.png`, g1.png);
  result[dev].glideMysa = diff(g1.px, g2.px);
  await page.close();
}
console.log(JSON.stringify(result));
await b.close();
