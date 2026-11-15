// Lighthouse CI, mobile (default emulation). ARCHITECTURE §13.8, R10. `npm run lh` runs this
// file, then lighthouserc.desktop.cjs.
//
// Chrome gets the SwiftShader flags and the museum URLs carry `?test=1&mode=museum`: without
// them Chromium has no WebGL in headless mode, the boot script picks classic and Lighthouse
// scores the wrong page. SwiftShader performance numbers are noise, so on the gallery and the
// exhibit page performance is a warning; /resume/ (zero WebGL) gates performance too.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- lhci requires CommonJS configs
const { chromium } = require('@playwright/test');

const PORT = 4180;
const ORIGIN = `http://localhost:${PORT}`;

/** The gallery and exhibit pages. lighthouserc.desktop.cjs lowers the LCP limit to 2000 ms. */
const museumAssertions = {
  'categories:accessibility': ['error', { minScore: 0.95 }],
  'categories:seo': ['error', { minScore: 0.95 }],
  'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.05 }],
  'categories:performance': ['warn', { minScore: 0.8 }],
  'categories:best-practices': ['warn', { minScore: 0.9 }],
  'total-blocking-time': ['warn', { maxNumericValue: 300 }],
};

const resumeAssertions = {
  'categories:performance': ['error', { minScore: 0.95 }],
  'categories:accessibility': ['error', { minScore: 0.95 }],
  'categories:seo': ['error', { minScore: 0.95 }],
  'categories:best-practices': ['error', { minScore: 0.9 }],
};

module.exports = {
  ci: {
    collect: {
      startServerCommand: `npx tsx scripts/serve-dist.ts --port ${PORT}`,
      startServerReadyPattern: 'serve-dist listening',
      url: [
        `${ORIGIN}/?test=1&mode=museum`,
        `${ORIGIN}/exhibit/verafin/?test=1&mode=museum`,
        `${ORIGIN}/resume/`,
      ],
      numberOfRuns: 3,
      chromePath: process.env.CHROME_PATH || chromium.executablePath(),
      settings: {
        chromeFlags:
          '--headless=new --no-sandbox --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist',
      },
    },
    assert: {
      assertMatrix: [
        { matchingUrlPattern: `^${ORIGIN}/(\\?|exhibit/)`, assertions: museumAssertions },
        { matchingUrlPattern: `^${ORIGIN}/resume/`, assertions: resumeAssertions },
      ],
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci' },
  },
};
