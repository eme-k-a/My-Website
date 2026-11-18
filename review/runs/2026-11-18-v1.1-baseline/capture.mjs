// Run against the production preview. Supply a new output directory for each comparison.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, devices } from '@playwright/test';

const output = process.argv[2];
if (!output) throw Error('Usage: node capture.mjs <output-directory>');
const origin = process.env.BASE_URL || 'http://localhost:4173';
const exhibits = ['verafin', 'mysa', 'wailo', 'cfia', 'klarup', 'finance-tracker', 'sdsj', 'mun', 'certifications'];
const stops = ['lobby', 'verafin', 'projects-door', 'volunteer-door', 'mun', 'desk'];
const browser = await chromium.launch({
  channel: 'chromium',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  for (const [name, width, height] of [
    ['desktop', 1440, 900], ['portrait', 393, 851], ['short', 360, 640], ['landscape', 851, 393],
  ]) {
    const dir = join(output, name);
    await mkdir(dir, { recursive: true });
    const phone = name !== 'desktop';
    const page = await browser.newPage({
      ...(phone ? devices['Pixel 7'] : {}),
      viewport: { width, height }, screen: { width, height }, deviceScaleFactor: 1,
    });
    const shot = async label => {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(dir, label + '.jpg'), quality: 86 });
    };
    const go = async id => {
      await page.evaluate(id => window.__MUSEUM__.goTo(id, { instant: true }), id);
      await page.waitForFunction(id => window.__MUSEUM__.settled && window.__MUSEUM__.stop === id, id);
    };
    await page.goto(origin + '/?test=1&mode=museum&tier=medium');
    await page.waitForFunction(() => window.__MUSEUM__?.ready);
    for (const stop of stops) {
      await go(stop);
      await shot(stop);
      if (stop === 'verafin') {
        const opener = page.getByTestId('open-verafin');
        if (phone) await opener.tap(); else await opener.click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        await dialog.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
        if (!phone) {
          await page.waitForFunction(() => window.__MUSEUM__.screenPos('verafin')?.x < 600);
        }
        await shot('story');
        await page.getByTestId('dialog-close').click();
        await dialog.waitFor({ state: 'hidden' });
      }
    }
    const metrics = {};
    for (const id of exhibits) {
      await go(id);
      await page.waitForFunction(id => window.__MUSEUM__.stats().exhibits[id], id);
      const { calls, triangles, textureMB, tier, exhibits: measurements } =
        await page.evaluate(() => window.__MUSEUM__.stats());
      metrics[id] = { object: measurements[id], scene: { calls, triangles, textureMB, tier } };
      if (!metrics[id].object.inBounds) throw Error('Outside exhibit bounds or budget: ' + id);
    }
    await writeFile(join(dir, 'measurements.json'), JSON.stringify(metrics, null, 2) + '\n');
    await page.goto(origin + '/resume/');
    await page.getByRole('heading', { level: 1 }).waitFor();
    await shot('classic');
    console.log('Captured ' + name);
    await page.close();
  }
} finally {
  await browser.close();
}
