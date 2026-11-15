// G4 round 1 probe (R11): phone stops that were tight before (lobby, the wing stops, sdsj, mun) on
// Pixel 7 (412 x 839) and 360 x 640 (Pixel 7 UA), tier medium, ?test=1&mode=museum.
// For each shot: DOM rects of the HUD controls and the stop card, brass title pixels inside the
// HUD controls (inset 3 px; the brass-filled PDF button is skipped), and the brass components
// above the case (the wall title): their union box, the gap from the HUD bottom to the title top,
// and per-glyph heights (CSS px), used for the MUN cap check.
//   node review/runs/2026-10-24-g4r1/probe-g4.mjs http://localhost:4174 <outDir>
// PROBE_STOPS (comma list) and PROBE_OUT (json name) override the defaults.
import { writeFile } from 'node:fs/promises';
import { chromium, devices } from '@playwright/test';
import sharp from 'sharp';

const [, , base, outDir] = process.argv;
const DEV = {
  pixel7: { ...devices['Pixel 7'] },
  small: { ...devices['Pixel 7'], viewport: { width: 360, height: 640 } },
};
const STOPS = (process.env.PROBE_STOPS ?? 'lobby,klarup,finance-tracker,sdsj,mun,certifications').split(',');
const OUT = process.env.PROBE_OUT ?? 'probe-g4.json';
const b = await chromium.launch({
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

function components(mask, w, h) {
  const seen = new Uint8Array(w * h);
  const out = [];
  const stack = [];
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || seen[i]) continue;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0;
    stack.push(i);
    seen[i] = 1;
    while (stack.length) {
      const j = stack.pop();
      const x = j % w, y = (j - x) / w;
      n++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      for (const k of [j - 1, j + 1, j - w, j + w]) {
        if (k < 0 || k >= w * h || seen[k] || !mask[k]) continue;
        if (Math.abs((k % w) - x) > 1) continue;
        seen[k] = 1;
        stack.push(k);
      }
    }
    out.push({ x0, y0, x1, y1, n });
  }
  return out;
}

const out = [];
for (const [dev, opts] of Object.entries(DEV)) {
  const p = await b.newPage(opts);
  await p.goto(`${base}/?test=1&mode=museum`);
  await p.waitForFunction(() => window.__MUSEUM__?.ready === true, null, { timeout: 120000 });
  for (const stop of STOPS) {
    if (stop !== 'lobby') {
      await p.evaluate((id) => window.__MUSEUM__.goTo(id, { instant: true }), stop);
    }
    await p.waitForFunction(() => window.__MUSEUM__.settled, null, { timeout: 120000 });
    let last = -1;
    for (let i = 0; i < 40; i++) {
      const f = await p.evaluate(() => window.__MUSEUM__.stats().frames);
      if (f === last) break;
      last = f;
      await p.waitForTimeout(1200);
    }
    const dom = await p.evaluate((id) => {
      const r = (el) => {
        const b = el.getBoundingClientRect();
        return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
      };
      const visible = (el) => {
        const b = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return b.width > 0 && b.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0';
      };
      const hud = document.querySelector('[data-testid="hud"]');
      const controls = [];
      for (const el of hud ? hud.querySelectorAll('a, button, p') : []) {
        if (!visible(el) || el.getBoundingClientRect().top > 200) continue;
        controls.push({
          what: el.getAttribute('data-testid') || el.textContent.trim().slice(0, 32),
          ...r(el),
          filled: el.getAttribute('data-testid') === 'hud-pdf',
        });
      }
      const card = document.querySelector(`[data-testid="card-${id}"]`);
      const at = window.__MUSEUM__.screenPos(id);
      return { controls, card: card && visible(card) ? r(card) : null, screenPos: at };
    }, stop);
    const file = `${outDir}/probe-${stop}-${dev}.png`;
    const buf = await p.screenshot({ path: file });
    const img = sharp(buf);
    const { width, height } = await img.metadata();
    const raw = await img.raw().toBuffer();
    const ch = raw.length / (width * height);
    const scale = width / opts.viewport.width;
    const brass = new Uint8Array(width * height);
    for (let i = 0; i < width * height; i++) {
      const [R, G, B] = [raw[i * ch], raw[i * ch + 1], raw[i * ch + 2]];
      if (R > 90 && R - B > 45 && R >= G) brass[i] = 1;
    }
    const hudPx = (c) => {
      let n = 0;
      for (let y = Math.round((c.top + 3) * scale); y < Math.round((c.bottom - 3) * scale); y++)
        for (let x = Math.round((c.left + 3) * scale); x < Math.round((c.right - 3) * scale); x++)
          if (brass[y * width + x]) n++;
      return n;
    };
    const controls = dom.controls.map((c) => ({ ...c, brassPx: c.filled ? null : hudPx(c) }));
    const hudBottom = Math.max(0, ...controls.map((c) => c.bottom));
    // Wall title: brass glyphs between the HUD bottom and the case region (screenPos minus a margin),
    // outside every HUD control and the card.
    const inside = (cx, cy, r) => cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom;
    const limitY = (dom.screenPos ? dom.screenPos.y : height / scale) * 1.0;
    const glyphs = components(brass, width, height)
      .map((g) => ({
        left: g.x0 / scale,
        top: g.y0 / scale,
        right: (g.x1 + 1) / scale,
        bottom: (g.y1 + 1) / scale,
        px: g.n,
      }))
      .filter((g) => g.px >= 6 * scale * scale && g.bottom - g.top >= 4)
      .filter((g) => !controls.some((c) => inside((g.left + g.right) / 2, (g.top + g.bottom) / 2, c)))
      .filter((g) => !dom.card || !inside((g.left + g.right) / 2, (g.top + g.bottom) / 2, dom.card))
      .filter((g) => g.bottom - g.top < 80 && g.right - g.left < 80);
    const titleGlyphs = glyphs.filter((g) => g.bottom < limitY - 40);
    const box = titleGlyphs.length
      ? {
          left: Math.min(...titleGlyphs.map((g) => g.left)),
          top: Math.min(...titleGlyphs.map((g) => g.top)),
          right: Math.max(...titleGlyphs.map((g) => g.right)),
          bottom: Math.max(...titleGlyphs.map((g) => g.bottom)),
        }
      : null;
    out.push({
      dev,
      stop,
      viewport: opts.viewport,
      hudBottom,
      controls,
      card: dom.card,
      screenPos: dom.screenPos,
      titleBox: box,
      titleGapBelowHud: box ? +(box.top - hudBottom).toFixed(2) : null,
      titleGlyphs: titleGlyphs
        .sort((a, b) => a.top - b.top || a.left - b.left)
        .map((g) => ({
          left: +g.left.toFixed(1),
          top: +g.top.toFixed(1),
          w: +(g.right - g.left).toFixed(1),
          h: +(g.bottom - g.top).toFixed(1),
        })),
      file,
    });
  }
  await p.close();
}
await b.close();
await writeFile(`${outDir}/${OUT}`, `${JSON.stringify(out, null, 2)}\n`);
for (const o of out)
  console.log(
    `${o.dev} ${o.stop} hudBottom=${o.hudBottom.toFixed(1)} title=${JSON.stringify(o.titleBox)} gap=${o.titleGapBelowHud} hudBrass=${o.controls.map((c) => `${c.what}:${c.brassPx}`).join(',')} cardTop=${o.card?.top?.toFixed(1)} pos=${JSON.stringify(o.screenPos)}`,
  );
