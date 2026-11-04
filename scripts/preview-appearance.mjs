import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const previewPath = '/previews/appearance';
const server = await createServer({
  configFile: fileURLToPath(new URL('../vite.config.js', import.meta.url)),
  server: { host: '127.0.0.1', port: 4196, strictPort: true, open: false },
  plugins: [{
    name: 'hoopal-appearance-preview',
    transformIndexHtml: {
      order: 'pre',
      handler(html, { path }) {
        if (path !== '/' && path !== '/index.html') return html;
        return html
          .replace('./src/main.js', `${previewPath}/preview.js`)
          .replace('<title>球搭 · HOOPAL</title>', '<title>球搭 · 双外观网页预览</title>');
      },
    },
  }],
});

await server.listen();
console.log('球搭双外观预览：http://127.0.0.1:4196/');
