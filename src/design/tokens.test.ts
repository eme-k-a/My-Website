import { describe, expect, it } from 'vitest';
import { tokens } from './tokens';

/** Every leaf key path, sorted. Arrays are leaves (the light ramp is one token). */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value)
    .flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key))
    .sort();
}

describe('design tokens', () => {
  it('token names are frozen at contracts-v1 (values may change)', () => {
    expect(keyPaths(tokens)).toMatchInlineSnapshot(`
      [
        "camera.dialogDollyM",
        "camera.fovDesktop",
        "camera.fovPortrait",
        "camera.framingDesktopX",
        "camera.framingPortraitY",
        "camera.gazeEnterF",
        "camera.gazeForwardM",
        "camera.gazeHoldF",
        "camera.parallaxPitchDeg",
        "camera.parallaxYawDeg",
        "camera.portraitAspect",
        "classic.dark.bg",
        "classic.dark.link",
        "classic.dark.text",
        "classic.dark.text2",
        "classic.light.bg",
        "classic.light.link",
        "classic.light.text",
        "classic.light.text2",
        "color.brass",
        "color.brassHi",
        "color.brassMetal",
        "color.ceilingSlot",
        "color.ceramic",
        "color.duoLight",
        "color.duoShadow",
        "color.floor",
        "color.frost",
        "color.graphite",
        "color.ink",
        "color.panel",
        "color.panelSolid",
        "color.paper",
        "color.paperInk",
        "color.paperInk2",
        "color.paperOld",
        "color.plinth",
        "color.signal",
        "color.text",
        "color.text2",
        "color.text3",
        "color.wall",
        "color.walnut",
        "light.contactDarkness",
        "light.contactSoftEdge",
        "light.doorPoolAlpha",
        "light.doorPoolRadius",
        "light.fogDensity",
        "light.hemiGround",
        "light.hemiIntensity",
        "light.hemiSky",
        "light.poolAlpha",
        "light.poolRadius",
        "light.ramp",
        "light.spotAngle",
        "light.spotDecay",
        "light.spotIntensity",
        "light.spotPenumbra",
        "motion.canvasRevealMs",
        "motion.dialogCloseS",
        "motion.dialogOpenS",
        "motion.durBase",
        "motion.durFast",
        "motion.durSlow",
        "motion.easeInOut",
        "motion.easeOut",
        "motion.fadeCutMs",
        "motion.framingSmoothS",
        "motion.gazeSmoothTime",
        "motion.hoverLift",
        "motion.hoverLiftMs",
        "motion.idleStopMs",
        "motion.lightReassignS",
        "motion.railSmoothTime",
        "motion.wingEnterS",
        "motion.wingExitS",
        "render.exposure",
        "render.maxDpr.high",
        "render.maxDpr.low",
        "render.maxDpr.medium",
        "render.toneMapping",
        "render.vignette",
      ]
    `);
  });

  it('starts from the EXPERIENCE values the rail depends on', () => {
    expect(tokens.motion.railSmoothTime).toBe(0.25);
    expect(tokens.render.toneMapping).toBe('aces');
    expect(tokens.light.ramp).toHaveLength(4);
  });
});
