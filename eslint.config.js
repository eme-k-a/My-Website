import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Repo-wide client rules (ARCHITECTURE §7.5). In flat config a later block's
// no-restricted-imports or no-restricted-syntax replaces an earlier one for the
// same files, so every block that sets them spreads these shared entries in.
const CLIENT_IMPORT_MESSAGE = 'Client code may only import type from zod and the schema';
const clientImportPatterns = [
  { regex: '^zod(/|$)', allowTypeImports: true, message: CLIENT_IMPORT_MESSAGE },
  { regex: '(^|/)content/schema(\\.ts)?$', allowTypeImports: true, message: CLIENT_IMPORT_MESSAGE },
];
// Inside src/content/ the schema is reached as ./schema.
const contentFolderImportPatterns = [
  { regex: '^\\./schema(\\.ts)?$', allowTypeImports: true, message: CLIENT_IMPORT_MESSAGE },
];
const NATIVE_SCROLL_MESSAGE = 'Input is native scroll: no wheel or touch listeners';
const nativeScrollSelectors = [
  {
    selector:
      "CallExpression[callee.property.name='addEventListener'][arguments.0.value=/^(wheel|mousewheel|touchstart|touchmove|touchend)$/]",
    message: NATIVE_SCROLL_MESSAGE,
  },
  { selector: 'JSXAttribute[name.name=/^on(Wheel|Touch)/]', message: NATIVE_SCROLL_MESSAGE },
];

const clientFiles = ['src/**/*.{ts,tsx}'];
const testFiles = ['src/**/*.test.ts'];
// Build and test time only, never shipped (ARCHITECTURE §3.1): schema.ts imports zod at runtime
// (§3.3) and temporal.ts reads process.env (§3.5, §3.6). The guard stays on the importing side:
// client files may still only `import type` from the schema, and a client import of temporal.ts
// pulls it into tsconfig.app.json, where `process` does not type-check.
const buildTimeSrcFiles = ['src/content/schema.ts', 'src/content/temporal.ts'];
const clientIgnores = [...testFiles, ...buildTimeSrcFiles];

// Exhibit author rules, ARCHITECTURE §7.5 verbatim.
const exhibitFiles = ['src/museum/exhibits/*/**/*.{ts,tsx}'];
const exhibitIgnores = ['src/museum/exhibits/_kit/**'];
const exhibitTestFiles = ['src/museum/exhibits/*/**/*.test.ts'];
const exhibitImportPatterns = [
  {
    regex: '^\\.\\./(?!_kit(/|$))',
    message: 'Exhibits import only from ./ and ../_kit (no cross-exhibit or app imports).',
  },
  {
    regex: '^(zustand|wouter|leva|r3f-perf|postprocessing|@react-three/postprocessing)(/|$)',
    message: 'Not allowed in exhibits.',
  },
  { regex: '^three/(examples|addons)/', message: 'Ask R3 to add a kit helper instead.' },
];
const exhibitImportPaths = [
  {
    name: '@react-three/drei',
    importNames: [
      'Text',
      'Text3D',
      'Html',
      'Environment',
      'Lightformer',
      'ContactShadows',
      'MeshReflectorMaterial',
      'MeshTransmissionMaterial',
      'SpotLight',
      'ScrollControls',
      'useGLTF',
      'useTexture',
      'PerformanceMonitor',
    ],
    message: 'Owned by the environment, kit or quality code.',
  },
];
const exhibitSyntax = [
  { selector: 'JSXOpeningElement[name.name=/Light$/]', message: 'No lights in exhibits.' },
  {
    selector: 'JSXOpeningElement[name.name=/Material$/]',
    message: 'Use materials from the shared library (props.materials).',
  },
  {
    selector:
      'NewExpression[callee.name=/(Light|Material)$/], NewExpression[callee.property.name=/(Light|Material)$/]',
    message: 'No lights or ad-hoc materials.',
  },
  {
    selector: 'JSXAttribute[name.name=/^(castShadow|receiveShadow)$/]',
    message: 'No shadow maps.',
  },
  {
    selector: "MemberExpression[object.name='Math'][property.name='random']",
    message: 'Use the seeded rng from ../_kit/noise.',
  },
  {
    selector:
      "CallExpression[callee.object.name=/^(Date|performance)$/][callee.property.name='now']",
    message: 'Use useExhibitClock() from ../_kit.',
  },
];

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-ssr',
    'out',
    'public',
    'playwright-report',
    'test-results',
    '.lighthouseci',
    'review',
    'docs',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    rules: {
      // Underscore marks a deliberately unused binding (stub parameters, ignored tuple slots).
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: [
      'scripts/**/*.{ts,mts,js,mjs}',
      'tests/**/*.{ts,mts,js,mjs}',
      '*.config.{ts,mts,js,mjs,cjs}',
      '*.{cjs,mjs}',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    // Colocated unit tests and Node-only src files run in Node (vitest environment 'node').
    files: [...testFiles, 'src/content/temporal.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: clientFiles,
    ignores: clientIgnores,
    rules: {
      'no-restricted-imports': ['error', { patterns: clientImportPatterns }],
      'no-restricted-syntax': ['error', ...nativeScrollSelectors],
    },
  },
  {
    files: ['src/content/*.{ts,tsx}'],
    ignores: clientIgnores,
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...clientImportPatterns, ...contentFolderImportPatterns] },
      ],
    },
  },
  // Exhibit source files: the §7.5 rules plus the repo-wide client entries above.
  {
    files: exhibitFiles,
    ignores: [...exhibitIgnores, ...testFiles],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [...exhibitImportPatterns, ...clientImportPatterns],
          paths: exhibitImportPaths,
        },
      ],
      'no-restricted-syntax': ['error', ...exhibitSyntax, ...nativeScrollSelectors],
    },
  },
  // Exhibit tests: the §7.5 rules only. The repo-wide client rules exempt *.test.ts (§7.5).
  {
    files: exhibitTestFiles,
    ignores: exhibitIgnores,
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: exhibitImportPatterns, paths: exhibitImportPaths },
      ],
      'no-restricted-syntax': ['error', ...exhibitSyntax],
    },
  },
]);
