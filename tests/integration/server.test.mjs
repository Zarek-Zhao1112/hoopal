import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createAppServer } from '../../backend/app.mjs';

let server, base;
before(async () => {
  server = createAppServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  if (server?.listening) await new Promise(resolve => server.close(resolve));
});

test('serves the self-contained APK web bundle and every entry asset', async () => {
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  const markup = await page.text();
  const assets = [...markup.matchAll(/(?:src|href)="(\.\/assets\/[^\"]+\.(?:js|css))"/g)].map(match => match[1].slice(1));
  assert.ok(assets.some(asset => asset.endsWith('.js')));
  assert.ok(assets.some(asset => asset.endsWith('.css')));
  for (const asset of assets) {
    const response = await fetch(base + asset);
    assert.equal(response.status, 200, `${asset} must be available`);
    assert.match(response.headers.get('content-type'), asset.endsWith('.css') ? /text\/css/ : /text\/javascript/);
    assert.ok((await response.text()).length > 0);
  }
  const icon = markup.match(/<img src="([^\"]+)"[^>]*class="lineup-brand-icon"/);
  assert.ok(icon, 'lineup brand uses a bundled icon');
  const image = await fetch(new URL(icon[1], base));
  assert.equal(image.status, 200);
  assert.match(image.headers.get('content-type'), /image\/png/);
  assert.equal(Buffer.from(await image.arrayBuffer()).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
});

test('keeps server, test, script and generated files outside the public routes', async () => {
  for (const asset of ['/backend/server.mjs', '/tests/unit/engine.test.mjs', '/scripts/start.ps1', '/artifacts/qa/desktop.png', '/package.json', '/src/app.js', '/shared/engine.js']) {
    assert.equal((await fetch(base + asset)).status, 404, asset);
  }
  // Backslashes are decoded after URL parsing, so containment must still be checked.
  assert.equal((await fetch(base + '/..%5cbackend%5cserver.mjs')).status, 403);
});

test('supports HEAD, rejects unsupported methods and handles missing files', async () => {
  const head = await fetch(base, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(await head.text(), '');
  const post = await fetch(base, { method: 'POST' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, HEAD');
  assert.equal((await fetch(base + '/missing.js')).status, 404);
});
