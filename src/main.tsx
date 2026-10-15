// Client entry (ARCHITECTURE §5.4). The inline boot script has already chosen the mode before first
// paint; this hydrates the prerendered #app only in museum mode (the dev server has no prerendered
// markup, so there it renders #app instead). Classic mode on an exhibit page keeps the static
// story and ships no hydration; on `/` the boot script has already left for /resume/. The tier is
// chosen once here (ARCHITECTURE §8.4) and never changes at runtime. `src/museum/**` stays out of
// this chunk except the pure rail and tier helpers; MuseumGate loads the canvas with a dynamic
// import.
import './app/global.css';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './app/App';
import { useMuseum } from './app/store';
import { installTestHook, testParams } from './app/testHooks';
import { chooseTier } from './museum/quality/tiers';

function start(): void {
  const root = document.documentElement;
  if (root.dataset.mode !== 'museum') return;
  const container = document.getElementById('app');
  if (!container) return;

  const boot = window.__BOOT__;
  const params = testParams(window.location.search);
  const tier = chooseTier({
    coarse: boot?.coarse ?? window.matchMedia('(pointer: coarse)').matches,
    cores: boot?.cores ?? navigator.hardwareConcurrency ?? 0,
    saveData: boot?.saveData ?? false,
    renderer: boot?.renderer ?? '',
    params: { test: params.test, tier: new URLSearchParams(window.location.search).get('tier') },
  });
  root.dataset.tier = tier;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  useMuseum.setState({ mode: 'museum', tier, reducedMotion: motion.matches });
  motion.addEventListener('change', (event) =>
    useMuseum.setState({ reducedMotion: event.matches }),
  );

  installTestHook();
  // The build prerenders #app; the dev server serves index.html with only the <!--ssr:app-->
  // marker there, so it renders from scratch instead of hydrating markup that does not exist.
  if (container.firstElementChild) hydrateRoot(container, <App />);
  else createRoot(container).render(<App />);
}

start();
