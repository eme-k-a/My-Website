import { defineConfig } from 'vitest/config';

// Same rule as vite.config.ts and src/content/temporal.ts: BUILD_DATE wins, else today in UTC.
const buildDate = process.env.BUILD_DATE ?? new Date().toISOString().slice(0, 10);

// ARCHITECTURE §13.1: `npm test` runs 'unit', `npm run test:pdf` runs 'pdf' (needs a built dist/).
export default defineConfig({
  define: {
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
  test: {
    // A root-only option in Vitest 5; it applies to both projects.
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'pdf',
          include: ['tests/pdf/**/*.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
