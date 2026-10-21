// Playwright configuration (ARCHITECTURE §13.2, R8). Every spec runs against the built site served
// by scripts/serve-dist.ts with the production `_headers` (never `vite preview` or the dev server),
// on Chromium 1194 from PLAYWRIGHT_BROWSERS_PATH with SwiftShader WebGL. Parallel worktrees set
// PORT=4173+N; BASE_URL points the suite at an already running server (for example a deploy
// preview) and then no local server is started.
//
// CI shards (WP-17, R0 grant): E2E_SHARD picks one slice of the suite for one job of the e2e
// matrix in .github/workflows/ci.yml. Every (project, spec file) pair belongs to exactly one
// shard, and a spec file no rule names falls into the `rest` shard of its project, so a new spec
// can never drop out of CI. Playwright's own --shard splits by test count, skipped tests included,
// which put most of the desktop walks into one job; these slices are sized from the per-test
// durations of CI run 35 (desktop rail-input alone is 827 s of test time). Unset (local runs),
// every project runs everything.
import { defineConfig, devices, type PlaywrightTestProject } from '@playwright/test';

const PORT = process.env.PORT ?? '4173';
const baseURL = process.env.BASE_URL ?? `http://localhost:${PORT}`;

/** Headless WebGL in this container and in CI (ARCHITECTURE §1.4). */
const SWIFTSHADER = [
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--ignore-gpu-blocklist',
];

/** A spec file in tests/e2e, by its base name (`rail-input` matches rail-input.spec.ts). */
const spec = (...names: string[]) => new RegExp(`(^|/)(${names.join('|')})\\.spec\\.ts$`);

/**
 * The CI shards: each names, per project, the spec files it runs; `rest` takes every file of
 * that project the project's other shards do not name. A project missing from a shard does not
 * run in it.
 */
export const SHARDS: Record<string, Record<string, RegExp | 'rest'>> = {
  'desktop-input': { desktop: spec('rail-input') },
  'desktop-walks': { desktop: spec('camera', 'wings', 'environment', 'keyboard') },
  'desktop-dialog': {
    desktop: spec('dialog', 'exhibits', 'exhibit-contract', 'greybox', 'no-placeholders'),
  },
  // no-webgl moved here from phones-rest in WP-25: phones-rest took the nine-exhibit idle and
  // reduced-motion checks (about 3.5 min of test time) and every Pixel 7 visual case.
  'desktop-rest': { desktop: 'rest', 'no-webgl': 'rest' },
  pixel7: { pixel7: 'rest' },
  'phones-rest': {
    pixel7: spec('visual', 'exhibits', 'no-placeholders'),
    'pixel7-landscape': 'rest',
  },
};

const SHARD = process.env.E2E_SHARD;
if (SHARD !== undefined && !(SHARD in SHARDS)) {
  throw new Error(`E2E_SHARD=${SHARD} is not one of ${Object.keys(SHARDS).join(', ')}`);
}

/** The project as E2E_SHARD sees it: its files in this shard, or null when it does not run. */
function sharded(project: PlaywrightTestProject): PlaywrightTestProject | null {
  if (SHARD === undefined) return project;
  const name = project.name ?? '';
  const rule = SHARDS[SHARD]![name];
  if (rule === undefined) return null;
  if (rule !== 'rest') return { ...project, testMatch: rule };
  const named = Object.values(SHARDS)
    .map((shard) => shard[name])
    .filter((r): r is RegExp => r instanceof RegExp);
  return { ...project, testIgnore: named };
}

const PROJECTS: PlaywrightTestProject[] = [
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
];

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: 0,
  // Tests never share state, so the two CI workers split a spec file's tests between them
  // (without this, one worker ran all seven desktop rail-input tests back to back).
  fullyParallel: true,
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
  projects: PROJECTS.map(sharded).filter((p): p is PlaywrightTestProject => p !== null),
});
