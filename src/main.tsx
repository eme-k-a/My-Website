// Placeholder hero (WP-01). WP-10 replaces this file with the real client entry.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

function PlaceholderHero() {
  return (
    <main>
      <h1>Chukwuemeka (Emeka) Nduka-Nwagbo</h1>
      <p>Software Development Co-op, Nasdaq Verafin</p>
      <p>B.Eng Computer Engineering, MUN, expected May 2027</p>
      <ul>
        <li>
          <a href="/resume.pdf">Resume (PDF)</a>
        </li>
        <li>
          <a href="mailto:cndukanwagbo@mun.ca">Email</a>
        </li>
        <li>
          <a href="/resume/">Classic view</a>
        </li>
      </ul>
    </main>
  );
}

createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <PlaceholderHero />
  </StrictMode>,
);
