// Global guards (ARCHITECTURE §12.3, §13.5). Every spec imports `test` and `expect` from here. An
// automatic fixture watches every page of the test's browser context and, after the test, fails it
// with a readable list when any of these happened:
// - a console message of type `error`;
// - an uncaught page error (including unhandled promise rejections);
// - a `securitypolicyviolation` event (listener registered by an init script, kept in
//   `window.__CSP_VIOLATIONS__` and reported to Node through a binding so it survives navigation);
// - a request to an origin other than the base URL's (`data:` and `blob:` are allowed);
// - a request under `/fonts/unicode-fallback/` (troika asking for a missing 3D glyph, §8.3).
// Under the `@smoke` tag it also fails when a main-frame document from the site lacks the
// `content-security-policy` header.
import { test as base, expect, type ConsoleMessage, type Page } from '@playwright/test';

export { expect };

/** Where the kit points troika's unicode fallback (ARCHITECTURE §8.3): any request is a failure. */
export const FALLBACK_FONT_PATH = '/fonts/unicode-fallback/';

/** One `securitypolicyviolation` event, as the init script records it. */
export interface CspViolation {
  /** Random id of the document that saw it, plus a per-document counter: the dedupe key. */
  doc: string;
  seq: number;
  directive: string;
  blockedURI: string;
  sourceFile: string;
  line: number;
  sample: string;
}

declare global {
  interface Window {
    __CSP_VIOLATIONS__?: CspViolation[];
    __reportCspViolation__?: (violation: CspViolation) => Promise<void>;
  }
}

export const GUARD_KINDS = ['console', 'pageerror', 'csp', 'crossOrigin', 'fallbackFont'] as const;
export type GuardKind = (typeof GUARD_KINDS)[number];
export type GuardRecords = Record<GuardKind, string[]>;

const GUARD_LABELS: Record<GuardKind, string> = {
  console: 'console errors',
  pageerror: 'page errors',
  csp: 'CSP violations',
  crossOrigin: 'requests to other origins',
  fallbackFont: 'troika fallback-font requests (a 3D glyph is missing)',
};

/** What a test can do with the guards. Specs rarely need it; guards.spec.ts proves each guard. */
export interface Guards {
  /** A copy of everything recorded so far, after collecting in-page CSP violations. */
  records(): Promise<GuardRecords>;
  /** Polls until the guard has a record; resolves false after `timeoutMs` (never throws). */
  waitFor(kind: GuardKind, timeoutMs?: number): Promise<boolean>;
  /**
   * Removes and returns the records of one guard that match `pattern`. Only for a spec that
   * deliberately causes the event and asserts on it; it must never hide an unexplained failure.
   */
  acknowledge(kind: GuardKind, pattern: RegExp): string[];
}

const CSP_BINDING = '__reportCspViolation__';

/** Runs in every document before any page script (serialized by addInitScript). */
function cspListener(): void {
  const doc = Math.random().toString(36).slice(2);
  const violations: CspViolation[] = [];
  let seq = 0;
  window.__CSP_VIOLATIONS__ = violations;
  document.addEventListener('securitypolicyviolation', (event) => {
    const violation: CspViolation = {
      doc,
      seq: seq++,
      directive: event.effectiveDirective,
      blockedURI: event.blockedURI,
      sourceFile: event.sourceFile,
      line: event.lineNumber,
      sample: event.sample,
    };
    violations.push(violation);
    void window.__reportCspViolation__?.(violation);
  });
}

/**
 * Chromium's own favicon probe: without an icon declared in the page, the full Chromium build
 * requests `/favicon.ico` and logs its 404 as a console error that no page code caused. WP-31 adds
 * the favicon set and its `<link>` tags; this exemption goes away then (an open question in
 * review/reports/WP-07.json). It matches only that exact URL and message.
 */
export function isBrowserFaviconProbe(message: ConsoleMessage, origin: string): boolean {
  return (
    message.location().url === `${origin}/favicon.ico` &&
    message.text().startsWith('Failed to load resource')
  );
}

const describeConsole = (message: ConsoleMessage) => {
  const { url, lineNumber } = message.location();
  return url ? `${message.text()} (${url}:${lineNumber})` : message.text();
};

const describeError = (error: Error) => {
  const frame = error.stack
    ?.split('\n')
    .slice(1)
    .find((line) => line.trim().startsWith('at '));
  return `${error.name}: ${error.message}${frame ? ` (${frame.trim()})` : ''}`;
};

const describeCsp = (v: CspViolation) =>
  `${v.directive} blocked ${v.blockedURI || '(no URI)'}` +
  (v.sourceFile ? ` in ${v.sourceFile}:${v.line}` : '') +
  (v.sample ? ` sample: ${JSON.stringify(v.sample)}` : '');

const sleep = (ms: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));

const isSmoke = (tags: readonly string[], titlePath: readonly string[]) =>
  tags.includes('@smoke') || titlePath.some((title) => title.includes('@smoke'));

export const test = base.extend<{ guards: Guards }>({
  guards: [
    async ({ context, baseURL }, use, testInfo) => {
      if (!baseURL) throw new Error('playwright.config.ts must set use.baseURL');
      const origin = new URL(baseURL).origin;
      const records: GuardRecords = {
        console: [],
        pageerror: [],
        csp: [],
        crossOrigin: [],
        fallbackFont: [],
      };
      const seenCsp = new Set<string>();
      const documents: { url: string; csp: string | undefined }[] = [];

      const addCsp = (violation: CspViolation) => {
        const key = `${violation.doc}:${violation.seq}`;
        if (seenCsp.has(key)) return;
        seenCsp.add(key);
        records.csp.push(describeCsp(violation));
      };
      // A binding call can still be in flight when the test ends, so the in-page list is read too.
      const collectCsp = async () => {
        for (const page of context.pages()) {
          if (page.isClosed()) continue;
          const list = await page
            .evaluate(() => window.__CSP_VIOLATIONS__ ?? [])
            .catch((): CspViolation[] => []);
          list.forEach(addCsp);
        }
      };

      await context.exposeBinding(CSP_BINDING, (_source, violation: CspViolation) =>
        addCsp(violation),
      );
      await context.addInitScript(cspListener);

      const watch = (page: Page) => {
        page.on('console', (message) => {
          if (message.type() !== 'error' || isBrowserFaviconProbe(message, origin)) return;
          records.console.push(describeConsole(message));
        });
        page.on('pageerror', (error) => records.pageerror.push(describeError(error)));
      };
      context.pages().forEach(watch);
      context.on('page', watch);

      context.on('request', (request) => {
        const url = new URL(request.url());
        if (url.protocol === 'data:' || url.protocol === 'blob:') return;
        if (url.origin !== origin) {
          records.crossOrigin.push(
            `${request.method()} ${request.url()} (${request.resourceType()})`,
          );
        }
        if (url.pathname.startsWith(FALLBACK_FONT_PATH)) records.fallbackFont.push(request.url());
      });

      context.on('response', (response) => {
        const request = response.request();
        if (!request.isNavigationRequest() || request.resourceType() !== 'document') return;
        if (request.frame().parentFrame() !== null) return;
        if (new URL(response.url()).origin !== origin) return;
        documents.push({ url: response.url(), csp: response.headers()['content-security-policy'] });
      });

      const guards: Guards = {
        async records() {
          await collectCsp();
          return structuredClone(records);
        },
        async waitFor(kind, timeoutMs = 5_000) {
          const deadline = Date.now() + timeoutMs;
          for (;;) {
            await collectCsp();
            if (records[kind].length > 0) return true;
            if (Date.now() >= deadline) return false;
            await sleep(50);
          }
        },
        acknowledge(kind, pattern) {
          // Without the g and y flags, so test() keeps no lastIndex state between entries.
          const re = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ''));
          const matched = records[kind].filter((entry) => re.test(entry));
          records[kind] = records[kind].filter((entry) => !re.test(entry));
          return matched;
        },
      };

      await use(guards);

      await collectCsp();
      const problems: string[] = [];
      for (const kind of GUARD_KINDS) {
        const list = records[kind];
        if (list.length === 0) continue;
        problems.push(
          `${GUARD_LABELS[kind]} (${list.length}):\n${list.map((e) => `  - ${e}`).join('\n')}`,
        );
      }
      if (isSmoke(testInfo.tags, testInfo.titlePath)) {
        const missing = documents.filter((d) => !d.csp).map((d) => `  - ${d.url}`);
        if (missing.length > 0) {
          problems.push(
            `documents without a content-security-policy header:\n${missing.join('\n')}`,
          );
        }
      }
      if (problems.length > 0) {
        throw new Error(`Global guards tripped (ARCHITECTURE §13.5):\n${problems.join('\n')}`);
      }
    },
    { auto: true },
  ],
});
