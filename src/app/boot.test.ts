// The boot decision table (ARCHITECTURE §5.3): the script is transpiled exactly as vite.config.ts
// inlines it, then run with vm.runInNewContext against stubbed browser globals. One test per table
// row, plus the inline-script contract (size, no module syntax).
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { transpileBootScript } from '../../vite.config';
import type { BootInfo } from './boot';

const KEY = 'commit-history:mode';
const SCRIPT = transpileBootScript(readFileSync(new URL('./boot.ts', import.meta.url), 'utf8'));
const DEBUG_RENDERER = 0x9246; // UNMASKED_RENDERER_WEBGL
const GL_RENDERER = 0x1f01;
const HARDWARE = 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)';

interface Env {
  path?: string;
  search?: string;
  /** null: no WebGL2 context. */
  renderer?: string | null;
  /** false: WEBGL_debug_renderer_info is missing (Firefox), so gl.RENDERER is read. */
  debugInfo?: boolean;
  stored?: string | null;
  /** The storage accessors throw (private mode, blocked site data). */
  storageThrows?: boolean;
  saveData?: boolean;
  coarse?: boolean;
  cores?: number;
}

interface Run {
  boot: BootInfo;
  mode: string | undefined;
  test: string | undefined;
  stored: Map<string, string>;
  replaced: string[];
  lostContexts: number;
  canvases: string[];
}

function run(env: Env = {}): Run {
  const stored = new Map<string, string>();
  if (env.stored != null) stored.set(KEY, env.stored);
  const replaced: string[] = [];
  const canvases: string[] = [];
  let lostContexts = 0;
  const renderer = env.renderer === undefined ? HARDWARE : env.renderer;
  const gl =
    renderer === null
      ? null
      : {
          RENDERER: GL_RENDERER,
          getExtension(name: string) {
            if (name === 'WEBGL_debug_renderer_info') {
              return env.debugInfo === false ? null : { UNMASKED_RENDERER_WEBGL: DEBUG_RENDERER };
            }
            if (name === 'WEBGL_lose_context') return { loseContext: () => lostContexts++ };
            return null;
          },
          getParameter(p: number) {
            if (p === DEBUG_RENDERER && env.debugInfo !== false) return renderer;
            if (p === GL_RENDERER) return env.debugInfo === false ? renderer : 'WebKit WebGL';
            return null;
          },
        };
  const storageGuard = () => {
    if (env.storageThrows) throw new Error('SecurityError: storage is disabled');
  };
  const dataset: Record<string, string> = {};
  const context: Record<string, unknown> = {
    URLSearchParams,
    location: {
      pathname: env.path ?? '/',
      search: env.search ?? '',
      replace: (url: string) => replaced.push(url),
    },
    navigator: {
      hardwareConcurrency: env.cores ?? 8,
      ...(env.saveData !== undefined && { connection: { saveData: env.saveData } }),
    },
    localStorage: {
      getItem: (k: string) => (storageGuard(), stored.get(k) ?? null),
      setItem: (k: string, v: string) => (storageGuard(), stored.set(k, v)),
    },
    document: {
      documentElement: { dataset },
      createElement: (tag: string) => {
        canvases.push(tag);
        return { getContext: (kind: string) => (kind === 'webgl2' ? gl : null) };
      },
    },
    matchMedia: (query: string) => ({ matches: query === '(pointer: coarse)' && !!env.coarse }),
  };
  context.window = context;
  runInNewContext(SCRIPT, context);
  return {
    boot: context.__BOOT__ as BootInfo,
    mode: dataset.mode,
    test: dataset.test,
    stored,
    replaced,
    lostContexts,
    canvases,
  };
}

describe('boot script contract', () => {
  it('is at most 2 KB transpiled and has no module syntax', () => {
    expect(Buffer.byteLength(SCRIPT, 'utf8')).toBeLessThanOrEqual(2048);
    expect(SCRIPT).not.toMatch(/^\s*(import|export)\b/m);
    expect(SCRIPT).not.toMatch(/\brequire\(|\bexports\b/);
  });

  it('never contains an em dash or a script end tag', () => {
    expect(SCRIPT.includes('\u2014')).toBe(false);
    expect(SCRIPT.toLowerCase().includes('</script')).toBe(false);
  });
});

describe('boot decision table (ARCHITECTURE §5.3)', () => {
  it('row 1: with JS disabled nothing sets data-mode (index.html carries none)', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const htmlTag = /<html\b[^>]*>/i.exec(html)?.[0] ?? '';
    expect(htmlTag).not.toContain('data-mode');
    expect(html).toContain('<!--boot-->');
    // The boot script is the only writer of data-mode.
    expect(SCRIPT).toContain('dataset.mode');
  });

  it('row 2: ?mode=classic wins over WebGL2 and a stored museum choice, and is stored', () => {
    const r = run({ search: '?mode=classic', stored: 'museum' });
    expect(r.mode).toBe('classic');
    expect(r.boot.reason).toBe('param');
    expect(r.stored.get(KEY)).toBe('classic');
    expect(r.replaced).toEqual(['/resume/#why-param']);
    // Under ?test=1 the choice is not stored.
    const t = run({ search: '?test=1&mode=classic' });
    expect(t.mode).toBe('classic');
    expect(t.stored.has(KEY)).toBe(false);
  });

  it('row 3: no WebGL2 gives classic, even when the museum was asked for', () => {
    const r = run({ renderer: null, search: '?mode=museum', stored: 'museum' });
    expect(r.mode).toBe('classic');
    expect(r.boot.reason).toBe('no-webgl2');
    expect(r.boot.renderer).toBe('');
    expect(r.replaced).toEqual(['/resume/#why-no-webgl2']);
    expect(r.stored.get(KEY)).toBe('museum'); // untouched: nothing new was stored
    expect(run({ renderer: null, search: '?test=1&mode=museum' }).mode).toBe('classic');
  });

  it('row 4: ?mode=museum wins over a stored classic choice, Save-Data and software', () => {
    const r = run({
      search: '?mode=museum',
      stored: 'classic',
      saveData: true,
      renderer: 'Google SwiftShader',
    });
    expect(r.mode).toBe('museum');
    expect(r.boot.reason).toBe('param');
    expect(r.stored.get(KEY)).toBe('museum');
    expect(r.replaced).toEqual([]);
    const t = run({ search: '?test=1&mode=museum', stored: 'classic' });
    expect(t.mode).toBe('museum');
    expect(t.stored.get(KEY)).toBe('classic'); // not stored under ?test=1
  });

  it('row 5: a stored choice applies before Save-Data and the renderer check', () => {
    const museum = run({ stored: 'museum', saveData: true, renderer: 'llvmpipe (LLVM 15.0.7)' });
    expect([museum.mode, museum.boot.reason]).toEqual(['museum', 'stored']);
    const classic = run({ stored: 'classic' });
    expect([classic.mode, classic.boot.reason]).toEqual(['classic', 'stored']);
    expect(classic.replaced).toEqual(['/resume/#why-stored']);
    // Anything else in storage is ignored.
    expect(run({ stored: 'static' }).boot.reason).toBe('auto');
  });

  it('row 6: Save-Data gives classic', () => {
    const r = run({ saveData: true });
    expect([r.mode, r.boot.reason]).toEqual(['classic', 'save-data']);
    expect(r.boot.saveData).toBe(true);
    expect(r.replaced).toEqual(['/resume/#why-save-data']);
    expect(run({ saveData: false }).boot.reason).toBe('auto');
  });

  it('row 7: a software renderer gives classic, except under ?test=1', () => {
    for (const renderer of [
      'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
      'llvmpipe (LLVM 15.0.7, 256 bits)',
      'softpipe',
      'Software Rasterizer',
      'ANGLE (Microsoft, Microsoft Basic Render Driver Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'Mesa OffScreen',
    ]) {
      const r = run({ renderer });
      expect([r.mode, r.boot.reason], renderer).toEqual(['classic', 'software']);
      expect(r.boot.renderer).toBe(renderer);
    }
    expect(run({ renderer: 'Google SwiftShader' }).replaced).toEqual(['/resume/#why-software']);
    const t = run({ renderer: 'Google SwiftShader', search: '?test=1' });
    expect([t.mode, t.boot.reason]).toEqual(['museum', 'auto']);
    // Without WEBGL_debug_renderer_info (Firefox) the renderer comes from gl.RENDERER.
    const ff = run({ renderer: 'llvmpipe', debugInfo: false });
    expect([ff.boot.renderer, ff.boot.reason]).toEqual(['llvmpipe', 'software']);
  });

  it('row 8: otherwise museum, with __BOOT__ filled in and the probe context freed', () => {
    const r = run({ coarse: true, cores: 6 });
    expect(r.mode).toBe('museum');
    expect(r.test).toBeUndefined();
    expect(r.boot).toEqual({
      mode: 'museum',
      reason: 'auto',
      renderer: HARDWARE,
      coarse: true,
      cores: 6,
      saveData: false,
      test: false,
    });
    expect(r.replaced).toEqual([]);
    expect(r.stored.has(KEY)).toBe(false);
    expect(r.canvases).toEqual(['canvas']);
    expect(r.lostContexts).toBe(1);
    const t = run({ search: '?test=1' });
    expect([t.mode, t.test, t.boot.test]).toEqual(['museum', '1', true]);
  });
});

describe('boot script robustness', () => {
  it('survives storage that throws on every access', () => {
    const r = run({ storageThrows: true, search: '?mode=classic' });
    expect([r.mode, r.boot.reason]).toEqual(['classic', 'param']);
    expect(run({ storageThrows: true }).boot.reason).toBe('auto');
  });

  it('redirects only on the gallery root; exhibit pages stay in classic mode', () => {
    expect(run({ path: '/index.html', saveData: true }).replaced).toEqual([
      '/resume/#why-save-data',
    ]);
    const exhibit = run({ path: '/exhibit/verafin/', saveData: true });
    expect(exhibit.mode).toBe('classic');
    expect(exhibit.replaced).toEqual([]);
  });
});
