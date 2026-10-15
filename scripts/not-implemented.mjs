// WP-01 stub convention: npm scripts whose real command lands in a later WP call
// `node scripts/not-implemented.mjs <WP>` until that WP sets the ARCHITECTURE §15.2 command.
const wp = process.argv[2] ?? 'unknown WP';
const script = process.env.npm_lifecycle_event;
console.log(`not implemented yet (${wp})${script ? `: npm run ${script}` : ''}`);
