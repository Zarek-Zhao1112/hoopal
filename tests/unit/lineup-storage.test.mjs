import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup } from '../../shared/lineups.js';
import { templates } from '../../shared/templates.js';
import { createLineupRepository, LINEUPS_KEY, emptyLineupState } from '../../frontend/src/storage/lineups.js';
import { createRolePlan, setRoleResponse, getRolePlanState } from '../../shared/tactic-roles.js';

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

test('only matching active identity, current role version and a fully confirmed plan retain team playback source', async () => {
  const p=createLineup('3v3'),t=templates.find(t=>t.id==='pick-roll');
  const plan=t.roles.reduce((plan,role,i)=>setRoleResponse(plan,role.id,{status:'available',memberId:p.players[i].id},t,p),createRolePlan(t,p));
  const ctx={source:'role-confirmations',profileId:p.id,profileRevision:p.revision,templateId:t.id,roleVersion:t.roleVersion};
  for(const patch of [{},{source:'old-algorithm'},{roleVersion:2},{profileRevision:2},{templateId:'four-out-cut'},{templateId:'defense-3v3-zone'},{profileId:'other'}]) {
    const adapter=memory({[LINEUPS_KEY]:JSON.stringify({...stateWith(p),rolePlans:{[p.id]:{[t.id]:plan}},playbackContext:{...ctx,...patch}})});
    const loaded=(await repo(adapter).load()).state;
    assert.equal(Boolean(loaded.playbackContext),Object.keys(patch).length===0);
  }
});

const legacyOf = profile => ({...profile,players:profile.players.map(player=>({...player,height:'medium',build:'medium',mobility:'average',strengths:['passing'],weaknesses:[]}))});

test('schema1 reads preserve team/member identities but never convert old traits or automatic mappings into confirmations',async()=>{
  const p=legacyOf(createLineup('4v4',{name:'老球队',nbaTeamId:'GSW'}));p.players[0].name='旧名字';p.players[0].number=88;
  const raw=JSON.stringify({schemaVersion:1,profiles:[p],activeProfileId:p.id,playbackContext:{profileId:p.id,profileRevision:1,templateId:'high-low'}},null,2);
  const adapter=memory({[LINEUPS_KEY]:raw}),store=repo(adapter),loaded=await store.load();
  assert.equal(loaded.writeLocked,false);assert.equal(loaded.state.schemaVersion,2);assert.equal(loaded.state.profiles.length,1);
  assert.equal(loaded.state.profiles[0].nbaTeamId,'GSW');assert.deepEqual(loaded.state.profiles[0].players,p.players.map(({id,name,number})=>({id,name,number})));
  assert.deepEqual(loaded.state.rolePlans,{});assert.equal(loaded.state.playbackContext,null);
  assert.deepEqual(adapter.writes,[]);assert.equal(adapter.values.get(LINEUPS_KEY),raw);
  await store.save(loaded.state);
  assert.equal(adapter.writes[0][0],LINEUPS_KEY+'.migration-v1-test');assert.equal(adapter.writes[0][1],raw);
  assert.equal(adapter.writes[1][0],LINEUPS_KEY);assert.equal(JSON.parse(adapter.writes[1][1]).schemaVersion,2);
});

test('migration backup failure prevents main overwrite, then main-write failure retains exact backup and can retry once',async()=>{
  const p=legacyOf(createLineup()),raw=JSON.stringify({schemaVersion:1,profiles:[p],activeProfileId:p.id,playbackContext:null});
  const adapter=memory({[LINEUPS_KEY]:raw}),store=repo(adapter);const loaded=await store.load();
  const set=adapter.setItem;let backupFails=true,mainFails=true;
  adapter.setItem=async(key,value)=>{if(key.includes('migration-v1')&&backupFails)throw new Error('migration backup failed');if(key===LINEUPS_KEY&&mainFails)throw new Error('new schema failed');return set(key,value)};
  await assert.rejects(store.save(loaded.state),/migration backup failed/);assert.equal(adapter.values.get(LINEUPS_KEY),raw);assert.equal(adapter.writes.length,0);
  backupFails=false;await assert.rejects(store.save(loaded.state),/new schema failed/);assert.equal(adapter.values.get(LINEUPS_KEY),raw);
  assert.equal(adapter.values.get(LINEUPS_KEY+'.migration-v1-test'),raw);
  mainFails=false;await store.save(loaded.state);await store.flush();
  assert.equal(adapter.writes.filter(([key])=>key.includes('migration-v1')).length,1);
  assert.equal(JSON.parse(adapter.values.get(LINEUPS_KEY)).schemaVersion,2);
});

test('stale role definitions preserve historical plan bytes in state but clear team source and need explicit reconfirmation',async()=>{
  const p=createLineup(),t=templates.find(t=>t.id==='pick-roll'),plan=createRolePlan(t,p);plan.roleVersion=2;
  plan.assignments[0]={...plan.assignments[0],status:'available',memberId:p.players[0].id};
  const value={...stateWith(p),rolePlans:{[p.id]:{[t.id]:plan}},playbackContext:{source:'role-confirmations',profileId:p.id,profileRevision:1,templateId:t.id,roleVersion:2}};
  const adapter=memory({[LINEUPS_KEY]:JSON.stringify(value)}),store=repo(adapter),loaded=await store.load();
  assert.deepEqual(loaded.state.rolePlans[p.id][t.id],plan);assert.equal(loaded.state.playbackContext,null);
  const state=getRolePlanState(loaded.state.rolePlans[p.id][t.id],t,p);assert.equal(state.needsReview,true);assert.equal(state.confirmedCount,0);
  await store.save(loaded.state);assert.deepEqual(JSON.parse(adapter.values.get(LINEUPS_KEY)).rolePlans[p.id][t.id],plan);
});

test('invalid plan is isolated and raw collection backed up while other team plans and identities survive',async()=>{
  const a=createLineup(),b=createLineup('4v4'),ta=templates.find(t=>t.id==='pick-roll'),tb=templates.find(t=>t.id==='high-low');
  const bad=createRolePlan(ta,a);bad.assignments[0].status='available';bad.assignments[0].memberId='missing';
  const good=createRolePlan(tb,b),value={...emptyLineupState(),profiles:[a,b],activeProfileId:a.id,rolePlans:{[a.id]:{[ta.id]:bad},[b.id]:{[tb.id]:good}}};
  const raw=JSON.stringify(value),adapter=memory({[LINEUPS_KEY]:raw}),store=repo(adapter),loaded=await store.load();
  assert.equal(loaded.warnings.length,1);assert.equal(loaded.state.profiles.length,2);assert.deepEqual(loaded.state.rolePlans[b.id][tb.id],good);assert.equal(loaded.state.rolePlans[a.id][ta.id],undefined);
  assert.equal(adapter.writes.length,0);await store.save(loaded.state);assert.equal(adapter.values.get(LINEUPS_KEY+'.corrupt-test'),raw);
});

test('defensive current plans and recent tactic references survive restart using defense roles',async()=>{
  for(const mode of ['3v3','4v4']) {
    const p=createLineup(mode),t=templates.find(t=>t.mode===mode&&t.kind==='defense');p.recentTemplateId=t.id;
    const plan=t.roles.reduce((plan,role,i)=>setRoleResponse(plan,role.id,{status:'available',memberId:p.players[i].id},t,p),createRolePlan(t,p));
    const value={...stateWith(p),rolePlans:{[p.id]:{[t.id]:plan}},playbackContext:{source:'role-confirmations',profileId:p.id,profileRevision:1,templateId:t.id,roleVersion:t.roleVersion}};
    const adapter=memory({[LINEUPS_KEY]:JSON.stringify(value)}),loaded=await repo(adapter).load();
    assert.deepEqual(loaded.state,value);assert.ok(t.roles.every(role=>role.playerId.startsWith('defense-')));
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

test('forged ready source without saved confirmations is removed and schema2 malformed shape locks writes',async()=>{
  const p=createLineup(),ctx={source:'role-confirmations',profileId:p.id,profileRevision:1,templateId:'pick-roll',roleVersion:1};
  const adapter=memory({[LINEUPS_KEY]:JSON.stringify({...stateWith(p),playbackContext:ctx})});
  assert.equal((await repo(adapter).load()).state.playbackContext,null);
  for(const shape of [{schemaVersion:2,profiles:[]},{schemaVersion:2,profiles:[],rolePlans:[]},null]){
    const raw=JSON.stringify(shape),memoryAdapter=memory({[LINEUPS_KEY]:raw}),store=repo(memoryAdapter);
    assert.equal((await store.load()).writeLocked,true);await assert.rejects(store.save(emptyLineupState()));assert.equal(memoryAdapter.values.get(LINEUPS_KEY),raw);assert.equal(memoryAdapter.writes.length,0);
  }
});
