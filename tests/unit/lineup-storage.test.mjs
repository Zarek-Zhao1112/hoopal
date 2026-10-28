import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup } from '../../shared/lineups.js';
import { templates } from '../../shared/templates.js';
import { createLineupRepository, LINEUPS_KEY, emptyLineupState } from '../../frontend/src/storage/lineups.js';

function memory(initial = {}) {
  const values = new Map(Object.entries(initial)), writes = [];
  return { values, writes, async getItem(key) { return values.get(key) ?? null; }, async setItem(key, value) { writes.push([key,value]); values.set(key,value); } };
}
const repo = adapter => createLineupRepository({ adapter, templates, makeBackupId: () => 'test' });
const stateWith = profile => ({ ...emptyLineupState(), profiles: [profile], activeProfileId: profile.id });

test('lineups persist separately from retired personal Plays with safe independent snapshots', async () => {
  const adapter = memory({'halfcourt-library-v1':'[]', unrelated:'keep'}), store = repo(adapter);
  assert.deepEqual(await store.load(), {state:emptyLineupState(),warnings:[],writeLocked:false});
  const state = stateWith(createLineup('4v4', {name:'四人队'}));
  const saving = store.save({...state,forbiddenPlay:{frames:[]}});
  state.profiles[0].name = 'later change';
  await saving;
  const loaded = await store.load();
  assert.equal(loaded.state.profiles[0].name,'四人队');
  assert.ok(!Object.hasOwn(loaded.state,'forbiddenPlay'));
  assert.equal(adapter.values.get('halfcourt-library-v1'),'[]');
  assert.equal(adapter.values.get('unrelated'),'keep');
  loaded.state.profiles[0].players[0].name='mutated';
  assert.equal((await store.load()).state.profiles[0].players[0].name,'');
});

test('read failures lock writes until successful retry and never erase unknown old archives', async () => {
  const original=JSON.stringify(stateWith(createLineup()));
  const adapter=memory({[LINEUPS_KEY]:original});let failing=true;
  const get=adapter.getItem;adapter.getItem=async key=>{if(failing)throw new Error('IO');return get(key)};
  const store=repo(adapter);
  assert.equal((await store.load()).writeLocked,true);
  await assert.rejects(store.save(emptyLineupState()),/读取/);
  assert.equal(adapter.values.get(LINEUPS_KEY),original);
  failing=false;assert.equal((await store.load()).state.profiles.length,1);
  await store.save(emptyLineupState());
});

test('unknown future schemas are protected rather than treated as empty writable archives', async () => {
  const original='{"schemaVersion":99,"profiles":[]}';
  const adapter=memory({[LINEUPS_KEY]:original}),store=repo(adapter);
  assert.equal((await store.load()).writeLocked,true);
  await assert.rejects(store.save(emptyLineupState()));
  assert.equal(adapter.values.get(LINEUPS_KEY),original);
  assert.equal(adapter.writes.length,0);
});

test('damaged text is backed up before replacement; failed backup and failed replacement remain retryable', async () => {
  const adapter=memory({[LINEUPS_KEY]:'{broken'}),store=repo(adapter);
  const result=await store.load();assert.ok(result.warnings.length);
  assert.equal(adapter.writes.length,0);
  const set=adapter.setItem;let failBackup=true,failMain=true;
  adapter.setItem=async(key,value)=>{if(key.includes('corrupt')&&failBackup)throw new Error('backup');if(key===LINEUPS_KEY&&failMain)throw new Error('main');return set(key,value)};
  await assert.rejects(store.save(emptyLineupState()),/backup/);
  assert.equal(adapter.values.get(LINEUPS_KEY),'{broken');
  failBackup=false;
  await assert.rejects(store.save(emptyLineupState()),/main/);
  assert.equal(adapter.values.get(LINEUPS_KEY+'.corrupt-test'),'{broken');
  failMain=false;await store.save(emptyLineupState());
  assert.equal(adapter.writes.filter(([key])=>key.includes('corrupt')).length,1);
  assert.deepEqual(JSON.parse(adapter.values.get(LINEUPS_KEY)),emptyLineupState());
});

test('invalid and duplicate individual profiles are isolated without losing the original collection', async () => {
  const good=createLineup();
  const original=JSON.stringify({...stateWith(good),profiles:[{},good,good],playbackContext:{profileId:'missing'}});
  const adapter=memory({[LINEUPS_KEY]:original}),store=repo(adapter);
  const result=await store.load();assert.equal(result.state.profiles.length,1);assert.equal(result.warnings.length,2);
  assert.equal(adapter.values.get(LINEUPS_KEY),original);
  await store.save(result.state);
  assert.equal(adapter.values.get(LINEUPS_KEY+'.corrupt-test'),original);
});

test('only matching active profile revision and same-mode offense can retain playback context', async () => {
  const p=createLineup('3v3'),ctx={profileId:p.id,profileRevision:p.revision,templateId:'pick-roll'};
  for(const patch of [{},{profileRevision:2},{templateId:'four-out-cut'},{templateId:'defense-3v3-zone'},{profileId:'other'}]) {
    const adapter=memory({[LINEUPS_KEY]:JSON.stringify({...stateWith(p),playbackContext:{...ctx,...patch}})});
    const loaded=(await repo(adapter).load()).state;
    assert.equal(Boolean(loaded.playbackContext),Object.keys(patch).length===0);
  }
});

test('save requires initial load and serializes ordered snapshots through an earlier write failure', async () => {
  const adapter=memory(),store=repo(adapter),a=stateWith(createLineup('3v3',{name:'first'}));
  await assert.rejects(store.save(a),/读取/);await store.load();
  const set=adapter.setItem;let once=true;
  adapter.setItem=async(key,value)=>{if(once){once=false;throw new Error('once')}return set(key,value)};
  const first=store.save(a);a.profiles[0].name='second';const second=store.save(a);a.profiles[0].name='mutated';
  await assert.rejects(first,/once/);await second;await store.flush();
  assert.equal(JSON.parse(adapter.values.get(LINEUPS_KEY)).profiles[0].name,'second');
});
