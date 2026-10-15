// Lighthouse CI, desktop (ARCHITECTURE §13.8, R10): the mobile config of lighthouserc.cjs with
// `preset: 'desktop'` and the 2000 ms LCP limit on the gallery and exhibit pages. Its reports go
// to .lighthouseci/desktop/ so the mobile reports in .lighthouseci/ survive the second run.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- lhci requires CommonJS configs
const mobile = require('./lighthouserc.cjs');

const ci = structuredClone(mobile.ci);
ci.collect.settings.preset = 'desktop';
for (const { assertions } of ci.assert.assertMatrix) {
  if (assertions['largest-contentful-paint']) {
    assertions['largest-contentful-paint'] = ['error', { maxNumericValue: 2000 }];
  }
}
ci.upload.outputDir = '.lighthouseci/desktop';

module.exports = { ci };
