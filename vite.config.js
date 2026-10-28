import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('./frontend/', import.meta.url)),
  base: './',
  build: {
    outDir: fileURLToPath(new URL('./dist/', import.meta.url)),
    emptyOutDir: true,
    target: 'es2022'
  },
  server: { host: '0.0.0.0', port: 4173, strictPort: true }
});
