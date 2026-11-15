// Boot script (ARCHITECTURE §5.3, R6). vite.config.ts transpiles this file and inlines it at the
// <!--boot--> marker of index.html as a classic script, before first paint. It must stay
// self-contained (no imports; the export lines below are types only and vanish in the output),
// byte-identical on every page that has it (one CSP hash), and at most 2 KB transpiled
// (boot.test.ts measures it). It picks `data-mode`: the first matching row of the table wins.
//   1 JS disabled               no data-mode, prerendered HTML only
//   2 ?mode=classic             classic 'param' (stored unless ?test=1)
//   3 no WebGL2                 classic 'no-webgl2', even when museum was asked for
//   4 ?mode=museum              museum 'param' (stored unless ?test=1)
//   5 stored choice             that choice, 'stored'
//   6 Save-Data                 classic 'save-data'
//   7 software renderer         classic 'software' (not under ?test=1)
//   8 otherwise                 museum 'auto'
// Classic on `/` replaces the page with /resume/#why-<reason>; /resume/ shows the matching banner
// through CSS :target. Every storage call sits in try/catch (private modes throw).

export type BootMode = 'museum' | 'classic';
export type BootReason = 'param' | 'no-webgl2' | 'stored' | 'save-data' | 'software' | 'auto';

/** `window.__BOOT__`: what the boot script saw and chose. main.tsx reads it for chooseTier. */
export interface BootInfo {
  mode: BootMode;
  reason: BootReason;
  renderer: string;
  coarse: boolean;
  cores: number;
  saveData: boolean;
  test: boolean;
}

declare global {
  interface Window {
    __BOOT__?: BootInfo;
  }
}

{
  const key = 'commit-history:mode';
  const q = new URLSearchParams(location.search);
  const test = q.get('test') === '1';
  const asked = q.get('mode');
  const net = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  const saveData = !!net && net.saveData === true;
  const gl = document.createElement('canvas').getContext('webgl2');
  let renderer = '';
  if (gl) {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    renderer = String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    const lose = gl.getExtension('WEBGL_lose_context');
    if (lose) lose.loseContext();
  }
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(key);
  } catch (_e) {
    // Storage is off (private mode or blocked): no stored choice.
  }
  // The decision table, in order; the first row whose condition holds wins.
  const rows: [boolean, BootMode, BootReason][] = [
    [asked === 'classic', 'classic', 'param'],
    [!gl, 'classic', 'no-webgl2'],
    [asked === 'museum', 'museum', 'param'],
    [stored === 'museum' || stored === 'classic', stored as BootMode, 'stored'],
    [saveData, 'classic', 'save-data'],
    [
      !test &&
        /swiftshader|llvmpipe|softpipe|software|basic render driver|mesa offscreen/i.test(renderer),
      'classic',
      'software',
    ],
    [true, 'museum', 'auto'],
  ];
  const [, mode, reason] = rows.find((row) => row[0])!;
  if (reason === 'param' && !test) {
    try {
      localStorage.setItem(key, mode);
    } catch (_e) {
      // Storage is off: the choice lasts for this page only.
    }
  }
  const root = document.documentElement;
  root.dataset.mode = mode;
  if (test) root.dataset.test = '1';
  window.__BOOT__ = {
    mode,
    reason,
    renderer,
    coarse: matchMedia('(pointer: coarse)').matches,
    cores: navigator.hardwareConcurrency || 0,
    saveData,
    test,
  };
  const path = location.pathname;
  if (mode === 'classic' && (path === '/' || path === '/index.html')) {
    location.replace('/resume/#why-' + reason);
  }
}
