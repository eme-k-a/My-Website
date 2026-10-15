// Design tokens (EXPERIENCE §6.2 to §6.5, §7.2 to §7.5). Token NAMES are frozen at contracts-v1;
// R2 tunes VALUES in WP-05 and WP-11. WP-05 adds src/design/tokens.css to mirror the CSS-facing
// ones.
// Units: names ending in Ms are milliseconds, S seconds, M meters, Deg degrees; `dur*` are ms;
// `light.spotAngle` is radians; framing values are fractions of the viewport.

export type ToneMapping = 'aces' | 'agx';

export const tokens = {
  color: {
    ink: '#0B0B0D',
    wall: '#141418',
    floor: '#0E0E11',
    plinth: '#1F1F24',
    panel: 'rgba(14, 14, 17, 0.86)',
    panelSolid: '#0F0F12',
    text: '#F2EDE4',
    text2: '#A8A29A',
    text3: '#6E6A64', // decorative strokes only, never text
    brass: '#C9A36A',
    brassHi: '#E4C48F',
    brassMetal: '#B08D57',
    paper: '#EFEBE4',
    paperOld: '#E9DCC4',
    paperInk: '#1A1A1E',
    paperInk2: '#5A554D',
    signal: '#7FD1C7',
    ceramic: '#E6E1D8',
    graphite: '#34343B',
    walnut: '#4E3322',
    frost: '#DDE3E4',
    ceilingSlot: '#2A2622',
    duoShadow: '#16161A',
    duoLight: '#F2EDE4',
  },
  classic: {
    light: { bg: '#FBFAF7', text: '#1A1A1E', text2: '#55524C', link: '#7A5C2B' },
    dark: { bg: '#0B0B0D', text: '#F2EDE4', text2: '#A8A29A', link: '#E4C48F' },
  },
  light: {
    ramp: ['#FFF4E8', '#FFE9D2', '#FFDDB8', '#FFCF9C'], // light-0 (newest) to light-3 (oldest)
    hemiSky: '#1A1C22',
    hemiGround: '#0B0B0D',
    hemiIntensity: 0.15,
    spotAngle: 0.38,
    spotPenumbra: 0.6,
    spotDecay: 2,
    spotIntensity: 40, // candela, tuned in WP-11
    fogDensity: 0.045,
    poolRadius: 1.6,
    poolAlpha: 0.85,
    doorPoolRadius: 1.2,
    doorPoolAlpha: 0.35,
    contactSoftEdge: 0.25,
    contactDarkness: 0.55,
  },
  motion: {
    durFast: 150,
    durBase: 250,
    durSlow: 600,
    easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
    easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
    railSmoothTime: 0.25,
    gazeSmoothTime: 0.3,
    fadeCutMs: 200,
    wingEnterS: 1.4,
    wingExitS: 1.2,
    dialogOpenS: 0.9,
    dialogCloseS: 0.8,
    framingSmoothS: 0.4,
    canvasRevealMs: 600,
    lightReassignS: 1,
    hoverLiftMs: 250,
    hoverLift: 1.35,
    idleStopMs: 15000,
  },
  camera: {
    fovDesktop: 50,
    fovPortrait: 68,
    portraitAspect: 0.6,
    framingDesktopX: 0.62,
    framingPortraitY: 0.36,
    gazeEnterF: 0.35,
    gazeHoldF: 0.5,
    gazeForwardM: 6,
    parallaxYawDeg: 1.5,
    parallaxPitchDeg: 1,
    dialogDollyM: 0.6,
  },
  render: {
    toneMapping: 'aces' as ToneMapping, // frozen by R2 in WP-11
    exposure: 1,
    maxDpr: { high: 2, medium: 1.5, low: 1 },
    vignette: 'radial-gradient(ellipse at center, transparent 55%, rgba(11, 11, 13, 0.55) 100%)',
  },
} as const;

export type Tokens = typeof tokens;
