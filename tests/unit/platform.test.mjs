import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatformAdapters, bytesToBase64, storagePath, safeFilename, isMissingFile } from '../../frontend/src/platform/core.js';

function native(overrides = {}) {
  const files = new Map(), prefs = new Map(), legacy = new Map(), calls = [], listeners = new Map(), errors = [];
  const missing = () => Object.assign(new Error('missing'), { code: 'OS-PLUG-FILE-0008' });
  const filesystem = {
    async stat(options) { calls.push(['stat', options]); if (!files.has(options.path)) throw missing(); return { type: 'file' }; },
    async readFile(options) { calls.push(['read', options]); if (!files.has(options.path)) throw missing(); return { data: files.get(options.path) }; },
    async writeFile(options) { calls.push(['write', options]); files.set(options.path, options.data); return { uri: `file:///cache/${options.path}` }; },
    async rename(options) { calls.push(['rename', options]); if (!files.has(options.from)) throw missing(); files.set(options.to, files.get(options.from)); files.delete(options.from); },
    async deleteFile(options) { calls.push(['delete', options]); files.delete(options.path); },
    ...overrides.filesystem,
  };
  const preferences = {
    async get({ key }) { return { value: prefs.get(key) ?? null }; },
    async set({ key, value }) { prefs.set(key, value); },
  };
  const app = {
    async addListener(event, callback) { listeners.set(event, callback); return { async remove() { listeners.delete(event); } }; },
    async minimizeApp() { calls.push(['minimize']); },
    ...overrides.app,
  };
  const adapters = createPlatformAdapters({
    isNative: () => true, filesystem, preferences, app,
    getLocalStorage: () => ({ getItem: key => legacy.get(key) ?? null }),
    share: { async share(options) { calls.push(['share', options]); } },
    onError: (error, context) => errors.push({ error, context }),
    ...overrides.dependencies,
  });
  return { ...adapters, files, prefs, legacy, calls, listeners, errors, filesystem };
}

test('web storage is read lazily, asynchronous and preserves storage failures', async () => {
  let reads = 0;
  const map = new Map();
  const platform = createPlatformAdapters({ getLocalStorage: () => {
    reads++;
    return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  } });
  const storage = platform.createStorageAdapter();
  assert.equal(reads, 0);
  await storage.setItem('draft', '中文');
  assert.equal(await storage.getItem('draft'), '中文');
  assert.equal(await storage.getItem('absent'), null);
  const denied = createPlatformAdapters({ getLocalStorage: () => { throw new Error('denied'); } }).createStorageAdapter();
  await assert.rejects(denied.getItem('draft'), /denied/);
});

test('native writes UTF8 to private temporary file then renames over the destination', async () => {
  const platform = native(), storage = platform.createStorageAdapter(), path = storagePath('draft');
  platform.files.set(path, 'old');
  await storage.setItem('draft', '新战术');
  const write = platform.calls.find(([type]) => type === 'write')[1];
  assert.equal(write.directory, 'DATA');
  assert.equal(write.encoding, 'utf8');
  assert.equal(write.recursive, true);
  assert.match(write.path, /\.tmp$/);
  assert.equal(platform.files.get(path), '新战术');
  assert.deepEqual([...platform.files.keys()], [path]);
  assert.equal(platform.calls.some(([type]) => type === 'delete'), false);
  assert.equal(await storage.getItem('draft'), '新战术');
});

test('failed rename leaves durable value intact and failure reaches caller', async () => {
  const failure = new Error('disk failure');
  const platform = native({ filesystem: { async rename() { throw failure; } } });
  const path = storagePath('draft');
  platform.files.set(path, 'old');
  const storage = platform.createStorageAdapter();
  await assert.rejects(storage.setItem('draft', 'new'), error => error === failure);
  await assert.rejects(storage.flush(), error => error === failure);
  assert.equal(platform.files.get(path), 'old');
  assert.deepEqual([...platform.files.keys()], [path]);
});

test('concurrent writes to the same key are serialized and reads await the last write', async () => {
  const platform = native(), storage = platform.createStorageAdapter();
  const first = storage.setItem('draft', 'first');
  const second = storage.setItem('draft', 'second');
  const value = storage.getItem('draft');
  await Promise.all([first, second]);
  assert.equal(await value, 'second');
  assert.deepEqual(platform.calls.filter(([type]) => type === 'write' || type === 'rename').map(([type]) => type), ['write', 'rename', 'write', 'rename']);
});

test('native migrates a missing file once without deleting the WebView original', async () => {
  const platform = native(), storage = platform.createStorageAdapter();
  platform.legacy.set('draft', '{"title":"旧战术"}');
  assert.equal(await storage.getItem('draft'), '{"title":"旧战术"}');
  assert.equal(platform.legacy.get('draft'), '{"title":"旧战术"}');
  assert.equal(platform.prefs.get('halfcourt-migrated:draft'), '1');
  platform.files.delete(storagePath('draft'));
  assert.equal(await storage.getItem('draft'), null);
  assert.equal(platform.calls.filter(([type]) => type === 'write').length, 1);
});

test('permission and generic errors do not trigger migration or return null', async () => {
  for (const code of ['OS-PLUG-FILE-0007', 'OS-PLUG-FILE-0013', undefined]) {
    const failure = Object.assign(new Error('file does not exist (misleading message)'), { code });
    const platform = native({ filesystem: { async stat() { throw failure; } } });
    platform.legacy.set('draft', 'old');
    await assert.rejects(platform.createStorageAdapter().getItem('draft'), error => error === failure);
    assert.equal(platform.files.size, 0);
    assert.equal(platform.prefs.size, 0);
  }
  assert.equal(isMissingFile({ code: 'OS-PLUG-FILE-0008' }), true);
});

test('read failures after successful stat are not treated as a missing draft', async () => {
  const failure = new Error('corrupt read');
  const platform = native({ filesystem: { async readFile() { throw failure; } } });
  platform.files.set(storagePath('draft'), 'old');
  await assert.rejects(platform.createStorageAdapter().getItem('draft'), error => error === failure);
});

test('absent native data without a legacy value records migration and returns null', async () => {
  const platform = native();
  assert.equal(await platform.createStorageAdapter().getItem('absent'), null);
  assert.equal(platform.prefs.get('halfcourt-migrated:absent'), '1');
  assert.equal(platform.files.size, 0);
});

test('base64 encoder retains all bytes and padding', () => {
  for (let length of [0, 1, 2, 3, 4, 8193, 30000]) {
    const bytes = Uint8Array.from({ length }, (_, i) => i % 256);
    assert.equal(bytesToBase64(bytes), Buffer.from(bytes).toString('base64'));
  }
});

test('native JSON export shares a UTF8 cache file and PNG shares original binary bytes', async () => {
  const platform = native();
  assert.deepEqual(await platform.exportFile(new Blob(['{"title":"配合"}'], { type: 'application/json' }), '战术.json'), { method: 'share' });
  const image = Uint8Array.from([137, 80, 78, 71, 255, 0, 13, 10]);
  await platform.exportFile(new Blob([image], { type: 'image/png' }), '篮球.png');
  const writes = platform.calls.filter(([type]) => type === 'write').map(([, options]) => options);
  assert.equal(writes[0].directory, 'CACHE');
  assert.equal(writes[0].encoding, 'utf8');
  assert.equal(writes[0].data, '{"title":"配合"}');
  assert.equal(writes[1].encoding, undefined);
  assert.deepEqual(Buffer.from(writes[1].data, 'base64'), Buffer.from(image));
  const shares = platform.calls.filter(([type]) => type === 'share').map(([, options]) => options);
  assert.equal(shares[0].files[0], `file:///cache/${writes[0].path}`);
  assert.notEqual(writes[0].path, writes[1].path);
});

test('native share failures propagate, including user cancellation', async () => {
  const platform = native({ dependencies: { share: { async share() { throw new Error('cancelled'); } } } });
  await assert.rejects(platform.exportFile(new Blob(['{}'], { type: 'application/json' }), 'p.json'), /cancelled/);
  const cancelled = native({ dependencies: { share: { async share() { throw new Error('Share canceled'); } } } });
  await assert.rejects(cancelled.exportFile(new Blob(['{}'], { type: 'application/json' }), 'p.json'), error => error.code === 'USER_CANCELLED');
});

test('web export uses a download link and revokes the URL after it can be consumed', async () => {
  const events = [], link = { style: {}, click() { events.push('click'); }, remove() { events.push('remove'); } };
  let scheduled;
  const platform = createPlatformAdapters({
    getDocument: () => ({ createElement: () => link, body: { append() { events.push('append'); } } }),
    url: () => ({ createObjectURL() { return 'blob:file'; }, revokeObjectURL(value) { events.push(value); } }),
    schedule(callback, delay) { scheduled = callback; assert.equal(delay, 60000); },
  });
  assert.deepEqual(await platform.exportFile(new Blob(['{}']), '战术.json'), { method: 'download' });
  assert.equal(link.download, '战术.json');
  assert.equal(link.href, 'blob:file');
  assert.deepEqual(events, ['append', 'click', 'remove']);
  scheduled();
  assert.equal(events.at(-1), 'blob:file');
});

test('storage paths and filenames cannot escape their designated directory', () => {
  assert.equal(storagePath('../a/b'), 'halfcourt/storage/..%2Fa%2Fb.txt');
  assert.equal(safeFilename('../a\\b.json'), '_a_b.json');
  assert.throws(() => storagePath(''), TypeError);
  assert.throws(() => safeFilename('...'), TypeError);
});

test('long Chinese and emoji export titles fit native filename byte limits and keep extensions', () => {
  const chinese = '战'.repeat(120);
  const emoji = '🏀'.repeat(120);
  for (const title of [chinese, emoji, '挡拆🏀顺下'.repeat(30)]) {
    for (const extension of ['.json', '.png']) {
      const result = safeFilename(`${title}${extension}`);
      assert.ok(new TextEncoder().encode(result).length <= 200);
      assert.ok(result.endsWith(extension));
      assert.ok(title.startsWith(result.slice(0, -extension.length)));
      // UTF-8 round-trip would replace an isolated UTF-16 surrogate with U+FFFD.
      assert.equal(new TextDecoder().decode(new TextEncoder().encode(result)), result);
    }
  }
  assert.equal(safeFilename('短标题🏀.json'), '短标题🏀.json');
  assert.equal(safeFilename('a'.repeat(300) + '.PNG'), 'a'.repeat(196) + '.PNG');
});

test('native lifecycle awaits save before minimizing; handled back stays in app', async () => {
  const platform = native();
  const calls = [];
  let handled = true;
  const cleanup = await platform.setupLifecycle({
    async onBackground() { calls.push('save'); },
    async onBack() { calls.push('back'); return handled; },
  });
  await platform.listeners.get('backButton')({});
  assert.deepEqual(calls, ['back']);
  handled = false;
  await platform.listeners.get('backButton')({});
  assert.deepEqual(calls, ['back', 'back', 'save']);
  assert.equal(platform.calls.at(-1)[0], 'minimize');
  await platform.listeners.get('appStateChange')({ isActive: true });
  assert.equal(calls.length, 3);
  await platform.listeners.get('appStateChange')({ isActive: false });
  assert.equal(calls.at(-1), 'save');
  await cleanup();
  assert.equal(platform.listeners.size, 0);
});

test('lifecycle catches async callback failures and does not minimize after failed save', async () => {
  const failure = new Error('save failed');
  const platform = native();
  await platform.setupLifecycle({ async onBackground() { throw failure; } });
  await platform.listeners.get('backButton')({});
  await platform.listeners.get('appStateChange')({ isActive: false });
  assert.equal(platform.errors.length, 2);
  assert.equal(platform.errors[0].error, failure);
  assert.equal(platform.calls.some(([type]) => type === 'minimize'), false);
});

test('partial native listener registration is cleaned up when next registration fails', async () => {
  let removed = false;
  const platform = native({ app: { async addListener(name) {
    if (name === 'backButton') throw new Error('unavailable');
    return { async remove() { removed = true; } };
  } } });
  await assert.rejects(platform.setupLifecycle(), /unavailable/);
  assert.equal(removed, true);
});

test('settings use Preferences and web lifecycle is a safe no-op', async () => {
  const platform = native(), settings = platform.createSettingsAdapter();
  await settings.setItem('speed', 1.5);
  assert.equal(await settings.getItem('speed'), '1.5');
  const cleanup = await createPlatformAdapters().setupLifecycle();
  await cleanup();
});
