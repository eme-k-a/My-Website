// Proof that every global guard in fixtures.ts trips (WP-07 A2). Each case runs twice:
// - "trips": the same provocation under test.fail(). The global fixture must fail it, so it
//   reports as an expected failure. Other guards the provocation also trips are acknowledged
//   first, so only the guard under test is left to fail it.
// - "records": the provocation without test.fail(). It asserts the guard recorded exactly that
//   event and nothing else, then acknowledges it, so the test passes. This shows the body itself
//   does not fail, so the "trips" twin can only fail through the guard.
// Every provocation happens in the page (page.evaluate creating elements or calling fetch), never
// through Playwright's own addScriptTag, which bypasses the CSP.
import type { Page } from '@playwright/test';
import { expect, GUARD_KINDS, test, type GuardKind, type Guards } from './fixtures';
import { museumUrl } from './helpers';

interface GuardCase {
  title: string;
  guard: GuardKind;
  /** What the guard records for this provocation. */
  record: RegExp;
  /** Other guards the same provocation trips; awaited (bounded) and acknowledged. */
  alsoTrips?: [GuardKind, RegExp][];
  /** Lets the request leave the page: the production CSP blocks it before it is a request. */
  bypassCSP?: boolean;
  provoke(page: Page): Promise<void>;
}

const CASES: GuardCase[] = [
  {
    title: 'a console.error',
    guard: 'console',
    record: /guard probe: console\.error/,
    provoke: (page) => page.evaluate(() => console.error('guard probe: console.error')),
  },
  {
    title: 'an uncaught page error',
    guard: 'pageerror',
    record: /guard probe: page error/,
    provoke: (page) =>
      page.evaluate(() => {
        setTimeout(() => {
          throw new Error('guard probe: page error');
        }, 0);
      }),
  },
  {
    title: 'an inline script injected by the page',
    guard: 'csp',
    record: /script-src-elem blocked inline/,
    alsoTrips: [['console', /Refused to execute inline script/]],
    provoke: (page) =>
      page.evaluate(() => {
        const script = document.createElement('script');
        script.textContent = 'window.__guardProbe = 1;';
        document.head.append(script);
      }),
  },
  {
    title: 'a fetch to another origin under the production CSP',
    guard: 'csp',
    record: /connect-src blocked https:\/\/example\.com\//,
    alsoTrips: [['console', /Refused to connect|Fetch API cannot load/]],
    provoke: (page) =>
      page.evaluate(async () => {
        await fetch('https://example.com/').catch(() => undefined);
      }),
  },
  {
    // The CSP stops this fetch inside the renderer, before it becomes a request (case above). With
    // the CSP bypassed the request is issued, and the cross-origin guard is the net that catches it
    // (for example a navigation, which connect-src does not cover). A route answers it locally.
    title: 'a fetch to another origin with the CSP bypassed',
    guard: 'crossOrigin',
    record: /^GET https:\/\/example\.com\/ \(fetch\)$/,
    bypassCSP: true,
    provoke: (page) =>
      page.evaluate(async () => {
        await fetch('https://example.com/').catch(() => undefined);
      }),
  },
  {
    title: 'a troika fallback-font request',
    guard: 'fallbackFont',
    record: /\/fonts\/unicode-fallback\/x\.woff$/,
    alsoTrips: [['console', /unicode-fallback\/x\.woff/]],
    provoke: (page) =>
      page.evaluate(async () => {
        await fetch('/fonts/unicode-fallback/x.woff').catch(() => undefined);
      }),
  },
];

/** Loads the gallery, provokes the event and acknowledges the side effects. */
async function provoke(page: Page, guards: Guards, c: GuardCase): Promise<boolean> {
  // No probe ever reaches the network: example.com is answered locally (with CORS allowed).
  await page.route(
    (url) => url.hostname === 'example.com',
    (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/plain',
        headers: { 'access-control-allow-origin': '*' },
        body: 'guard probe',
      }),
  );
  await page.goto(museumUrl('/'));
  await c.provoke(page);
  const tripped = await guards.waitFor(c.guard);
  for (const [kind, pattern] of c.alsoTrips ?? []) {
    await guards.waitFor(kind);
    guards.acknowledge(kind, pattern);
  }
  return tripped;
}

test.describe('global guards', { tag: '@smoke' }, () => {
  for (const c of CASES) {
    test.describe(c.title, () => {
      if (c.bypassCSP) test.use({ bypassCSP: true });

      test(`trips the ${c.guard} guard`, async ({ page, guards }) => {
        test.fail();
        await provoke(page, guards, c);
      });

      test(`is recorded by the ${c.guard} guard`, async ({ page, guards }) => {
        expect(await provoke(page, guards, c), `${c.guard} guard recorded nothing`).toBe(true);
        const records = await guards.records();
        expect(records[c.guard]).toEqual([expect.stringMatching(c.record)]);
        for (const kind of GUARD_KINDS) {
          if (kind !== c.guard) expect(records[kind], `${kind} records`).toEqual([]);
        }
        expect(guards.acknowledge(c.guard, c.record)).toHaveLength(1);
      });
    });
  }
});
