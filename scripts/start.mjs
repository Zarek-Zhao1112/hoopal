import { build } from 'vite';
import { fileURLToPath } from 'node:url';

await build({ configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)) });
await import('../backend/server.mjs');
