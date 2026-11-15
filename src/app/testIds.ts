// Test ids (ARCHITECTURE §5.8), frozen at contracts-v1. Components set `data-testid` from these;
// Playwright specs locate elements with the same names. Parameterized ids are functions.
import type { ExhibitId, StopId, WingId } from '../content/ids';

export const TEST_IDS = {
  hero: 'hero',
  heroPdf: 'hero-pdf',
  heroEmail: 'hero-email',
  heroClassic: 'hero-classic',
  beginWalk: 'begin-walk',
  stage: 'stage',
  stop: (id: StopId) => `stop-${id}` as const, // the section
  card: (id: StopId) => `card-${id}` as const,
  open: (id: ExhibitId) => `open-${id}` as const,
  enterWing: (id: WingId) => `enter-wing-${id}` as const,
  exitWing: 'exit-wing',
  dialog: 'dialog',
  dialogClose: 'dialog-close',
  dialogNewer: 'dialog-newer',
  dialogOlder: 'dialog-older',
  dialogDuration: 'dialog-duration',
  hud: 'hud',
  hudProgress: 'hud-progress',
  hudStop: (id: StopId) => `hud-stop-${id}` as const,
  hudClassic: 'hud-classic',
  hudPdf: 'hud-pdf',
  onboardingHint: 'onboarding-hint',
  liveRegion: 'live-region',
  contextVeil: 'context-veil',
  fallbackNotice: 'fallback-notice',
  storyStatic: 'story-static',
  classicView: 'classic-view', // root of /resume/
  notFound: 'not-found',
} as const;
