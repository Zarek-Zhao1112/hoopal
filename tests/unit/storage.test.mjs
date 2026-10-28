import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository, STORAGE_KEYS } from '../../frontend/src/storage/repository.js';
import { createPlay, validatePlay } from '../../shared/engine.js';

function memoryAdapter(initial = {}) {
  const values = new Map(Object.entries(initial));
  const calls = [];
  return {
    values, calls,
    async getItem(key) { calls.push(['get', key]); return values.has(key) ? values.get(key) : null; },
    async setItem(key, value) { calls.push(['set', key, value]); values.set(key, value); }
  };
}
const repository = (adapter, options = {}) => createRepository({ adapter, validatePlay, ...options });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('empty storage loads safely and saves valid draft and library independently', async () => {
  const adapter = memoryAdapter();
  const repo = repository(adapter);
  assert.deepEqual(await repo.load(), {draft:null,library:[],warnings:[]});
  const play = createPlay('4v4');
  await repo.saveDraft(play);
  await repo.saveLibrary([play]);
  const result = await repo.load();
  assert.deepEqual(result.draft, play);
  assert.deepEqual(result.library, [play]);
  result.draft.title = 'changed';
  assert.notEqual((await repo.load()).draft.title, 'changed');
});

test('corrupt draft and individual library entries are isolated without overwriting raw data', async () => {
  const valid = createPlay();
  const original = JSON.stringify([{}, valid, {mode:'invalid'}]);
  const adapter = memoryAdapter({[STORAGE_KEYS.draft]:'{broken', [STORAGE_KEYS.library]:original});
  const repo = repository(adapter);
  const result = await repo.load();
  assert.equal(result.draft, null);
  assert.deepEqual(result.library, [valid]);
  assert.ok(result.warnings.some(w => w.includes('草稿损坏')));
  assert.ok(result.warnings.some(w => w.includes('第 1 项损坏')));
  assert.ok(result.warnings.some(w => w.includes('第 3 项损坏')));
  assert.equal(adapter.values.get(STORAGE_KEYS.draft), '{broken');
  assert.equal(adapter.values.get(STORAGE_KEYS.library), original);
  assert.equal(adapter.calls.filter(c => c[0] === 'set').length, 0);
  await repo.saveLibrary(result.library);
  const backup = [...adapter.values.entries()].find(([key]) => key.startsWith(`${STORAGE_KEYS.library}.corrupt-`));
  assert.equal(backup[1], original);
  assert.deepEqual(JSON.parse(adapter.values.get(STORAGE_KEYS.library)), [valid]);
});

test('save without load backs up damaged originals before replacing them', async () => {
  const adapter = memoryAdapter({[STORAGE_KEYS.draft]:'invalid JSON'});
  const repo = repository(adapter);
  await repo.saveDraft(createPlay());
  const writes = adapter.calls.filter(c => c[0] === 'set');
  assert.equal(writes.length, 2);
  assert.ok(writes[0][1].startsWith(`${STORAGE_KEYS.draft}.corrupt-`));
  assert.equal(writes[0][2], 'invalid JSON');
  assert.equal(writes[1][1], STORAGE_KEYS.draft);
});

test('failed backup preserves original and later save can retry', async () => {
  const adapter = memoryAdapter({[STORAGE_KEYS.draft]:'bad data'});
  const set = adapter.setItem.bind(adapter);
  let fail = true;
  adapter.setItem = async (key, value) => {
    if (key.includes('.corrupt-') && fail) { fail = false; throw new Error('disk full'); }
    await set(key, value);
  };
  const repo = repository(adapter);
  await assert.rejects(repo.saveDraft(createPlay()), /备份失败/);
  await assert.rejects(repo.flush(), /备份失败/);
  assert.equal(adapter.values.get(STORAGE_KEYS.draft), 'bad data');
  assert.equal(adapter.calls.filter(c => c[0] === 'set').length, 0);
  await repo.saveDraft(createPlay());
  await repo.flush();
  assert.ok([...adapter.values.keys()].some(key => key.includes('.corrupt-')));
});

test('concurrent writes remain ordered and snapshot draft/library arguments at call time', async () => {
  const adapter = memoryAdapter();
  const gate = deferred();
  const entered = deferred();
  const set = adapter.setItem.bind(adapter);
  let writes = 0;
  adapter.setItem = async (key, value) => {
    if (++writes === 1) { entered.resolve(); await gate.promise; }
    await set(key, value);
  };
  const repo = repository(adapter);
  const first = createPlay(); first.title = 'first';
  const second = createPlay(); second.title = 'second';
  const library = [second];
  const pending = [repo.saveDraft(first), repo.saveDraft(second), repo.saveLibrary(library)];
  first.title = 'mutated first'; second.title = 'mutated second'; library.length = 0;
  await entered.promise;
  assert.equal(writes, 1);
  let flushed = false;
  const flush = repo.flush().then(() => {flushed = true;});
  await Promise.resolve();
  assert.equal(flushed, false);
  gate.resolve();
  await Promise.all(pending);
  await flush;
  const savedDrafts = adapter.calls.filter(c => c[0] === 'set' && c[1] === STORAGE_KEYS.draft).map(c => JSON.parse(c[2]).title);
  assert.deepEqual(savedDrafts, ['first','second']);
  assert.equal(JSON.parse(adapter.values.get(STORAGE_KEYS.draft)).title, 'second');
  assert.equal(JSON.parse(adapter.values.get(STORAGE_KEYS.library))[0].title, 'second');
});

test('write failure does not poison already queued or future writes', async () => {
  const adapter = memoryAdapter();
  const set = adapter.setItem.bind(adapter);
  let fail = true;
  adapter.setItem = async (key, value) => { if (fail) { fail = false; throw new Error('temporary'); } await set(key, value); };
  const repo = repository(adapter);
  const first = repo.saveDraft(createPlay());
  const play = createPlay(); play.title = 'latest';
  const second = repo.saveDraft(play);
  await assert.rejects(first, /temporary/);
  await second;
  await repo.flush();
  assert.equal((await repo.load()).draft.title, 'latest');
});

test('flush still waits for queued writes when the latest save fails validation immediately', async () => {
  const adapter = memoryAdapter();
  const gate = deferred();
  const entered = deferred();
  const set = adapter.setItem.bind(adapter);
  adapter.setItem = async (key, value) => { entered.resolve(); await gate.promise; await set(key, value); };
  const repo = repository(adapter);
  const pending = repo.saveDraft(createPlay());
  await entered.promise;
  await assert.rejects(repo.saveDraft({}), /战术文件无效/);
  let settled = false;
  const flushed = repo.flush().finally(() => {settled = true;});
  await Promise.resolve();
  assert.equal(settled, false);
  gate.resolve();
  await pending;
  await assert.rejects(flushed, /战术文件无效/);
  assert.ok(adapter.values.has(STORAGE_KEYS.draft));
});

test('read failure is isolated during load and prevents unsafe overwrite during save', async () => {
  const valid = createPlay();
  const adapter = memoryAdapter({[STORAGE_KEYS.library]:JSON.stringify([valid])});
  const get = adapter.getItem.bind(adapter);
  let fail = true;
  adapter.getItem = async key => { if (key === STORAGE_KEYS.draft && fail) throw new Error('unavailable'); return get(key); };
  const repo = repository(adapter);
  const result = await repo.load();
  assert.deepEqual(result.library, [valid]);
  assert.ok(result.warnings.some(w => w.includes('草稿读取失败')));
  await assert.rejects(repo.saveDraft(valid), /unavailable/);
  assert.equal(adapter.calls.filter(c => c[0] === 'set').length, 0);
  fail = false;
  await assert.rejects(repo.saveDraft(valid), /请先重试读取/);
  await repo.load();
  await repo.saveDraft(valid);
  assert.deepEqual((await repo.load()).draft, valid);
});

for (const field of ['draft', 'library']) {
  test(`failed ${field} load locks autosave after reads recover until explicit load restores original data`, async () => {
    const original = createPlay();
    original.title = '原始用户战术';
    const rawDraft = JSON.stringify(original);
    const rawLibrary = JSON.stringify([original]);
    const adapter = memoryAdapter({[STORAGE_KEYS.draft]:rawDraft, [STORAGE_KEYS.library]:rawLibrary});
    const get = adapter.getItem.bind(adapter);
    let fail = true;
    adapter.getItem = async key => {
      if (key === STORAGE_KEYS[field] && fail) throw new Error('startup temporarily unavailable');
      return get(key);
    };
    const repo = repository(adapter);
    const loaded = await repo.load();
    assert.deepEqual(loaded[field], field === 'draft' ? null : []);
    assert.ok(loaded.warnings.some(w => w.includes('请重试读取')));

    fail = false;
    const fallback = createPlay();
    fallback.title = '自动保存的模板';
    const save = value => field === 'draft' ? repo.saveDraft(value) : repo.saveLibrary([value]);
    await assert.rejects(save(fallback), /已暂停保存.*请先重试读取/);
    await assert.rejects(save(fallback), /请先重试读取/);
    const originalRaw = field === 'draft' ? rawDraft : rawLibrary;
    assert.equal(adapter.values.get(STORAGE_KEYS[field]), originalRaw);
    assert.equal(adapter.calls.filter(c => c[0] === 'set').length, 0);

    // The healthy key remains writable and does not clear the failed key's lock.
    if (field === 'draft') await repo.saveLibrary([original]);
    else await repo.saveDraft(original);
    await assert.rejects(save(fallback), /请先重试读取/);
    assert.equal(adapter.values.get(STORAGE_KEYS[field]), originalRaw);

    const recovered = await repo.load();
    assert.deepEqual(recovered[field], field === 'draft' ? original : [original]);
    assert.deepEqual(recovered.warnings, []);
    const edited = structuredClone(original);
    edited.title = '读取恢复后的编辑';
    await save(edited);
    await repo.flush();
    const stored = JSON.parse(adapter.values.get(STORAGE_KEYS[field]));
    assert.equal((field === 'draft' ? stored : stored[0]).title, '读取恢复后的编辑');
  });
}

test('capacity and validation reject invalid saves, while valid oversized old libraries are recoverable', async () => {
  const valid = createPlay();
  const raw = JSON.stringify([valid, createPlay('4v4')]);
  const adapter = memoryAdapter({[STORAGE_KEYS.library]:raw});
  const repo = repository(adapter, {maxLibrary:1});
  const result = await repo.load();
  assert.deepEqual(result.library, [valid]);
  assert.ok(result.warnings.some(w => w.includes('超过 1 项')));
  await assert.rejects(repo.saveLibrary([valid, valid]), /最多保存 1 项/);
  await assert.rejects(repo.saveDraft({}), /战术文件无效/);
  await repo.saveLibrary([valid]);
  const backup = [...adapter.values.entries()].find(([key]) => key.includes('.corrupt-'));
  assert.equal(backup[1], raw);
});

test('failed main write reuses successful raw backup on retry', async () => {
  const adapter = memoryAdapter({[STORAGE_KEYS.draft]:'broken'});
  const set = adapter.setItem.bind(adapter);
  let fail = true;
  adapter.setItem = async (key, value) => {
    if (key === STORAGE_KEYS.draft && fail) { fail = false; throw new Error('main failed'); }
    await set(key, value);
  };
  const repo = repository(adapter);
  await assert.rejects(repo.saveDraft(createPlay()), /main failed/);
  assert.equal(adapter.values.get(STORAGE_KEYS.draft), 'broken');
  await repo.saveDraft(createPlay());
  assert.equal([...adapter.values.keys()].filter(key => key.includes('.corrupt-')).length, 1);
});
