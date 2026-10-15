// Playwright configuration (ARCHITECTURE §13.2, R8). Every spec runs against the built site served
// by scripts/serve-dist.ts with the production `_headers` (never `vite preview` or the dev server),
// on Chromium 1194 from PLAYWRIGHT_BROWSERS_PATH with SwiftShader WebGL. Parallel worktrees set
// PORT=4173+N; BASE_URL points the suite at an already running server (for example a deploy
// preview) and then no local server is started.
import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ?? '4173';
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

/** Headless WebGL in this container and in CI (ARCHITECTURE §1.4). */
const SWIFTSHADER = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  // Baselines are generated and compared in CI only (ARCHITECTURE §13.6).
  snapshotPathTemplate: 'tests/e2e/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  ...(process.env.BASE_URL
    ? {}
    : {
        webServer: {
          command: `npx tsx scripts/serve-dist.ts --port ${PORT}`,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
        },
      }),
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        channel: 'chromium',
        launchOptions: { args: SWIFTSHADER },
      },
    },
    {
      name: 'pixel7',
      use: {
        ...devices['Pixel 7'],
        channel: 'chromium',
        launchOptions: { args: SWIFTSHADER },
      },
    },
    {
      name: 'pixel7-landscape',
      use: {
        ...devices['Pixel 7 landscape'],
        channel: 'chromium',
        launchOptions: { args: SWIFTSHADER },
      },
    },
    {
      // Expects the classic path: the boot script finds no WebGL2 (ARCHITECTURE §5.3 row 3).
      name: 'no-webgl',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { args: ['--disable-3d-apis'] },
      },
    },
  ],
});
