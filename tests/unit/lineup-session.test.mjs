import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup } from '../../shared/lineups.js';
import { createRolePlan, getRolePlanState } from '../../shared/tactic-roles.js';
import { templates } from '../../shared/templates.js';
import { createLineupRepository, LINEUPS_KEY, emptyLineupState } from '../../frontend/src/storage/lineups.js';
import { createLineupSession } from '../../frontend/src/storage/lineup-session.js';

async function fixture(mode='3v3',seed) {
  const profile=createLineup(mode,{name:'本队'});
  const initialState={...emptyLineupState(),profiles:[profile],activeProfileId:profile.id};if(seed)seed(initialState,profile);
  let value=JSON.stringify(initialState),selected={templateId:'pick-roll',frameIndex:0};
  const switches={failClear:false,failFinal:false,failBuiltin:false};
  const adapter={async getItem(){return value},async setItem(key,next){const parsed=JSON.parse(next);if(switches.failClear&&!parsed.playbackContext)throw new Error('clear failed');if(switches.failFinal&&parsed.playbackContext)throw new Error('final failed');value=next}};
  const repository=createLineupRepository({adapter,templates});
  const builtinRepository={async saveSelection(next){if(switches.failBuiltin)throw new Error('builtin failed');selected=structuredClone(next)}};
  const initial=await repository.load();
  const session=createLineupSession({repository,builtinRepository,templates,initialState:initial.state});
  return {profile,session,repository,switches,get disk(){return JSON.parse(value)},get selected(){return selected}};
}

async function confirmAll(f,id='pick-roll') {
  const t=templates.find(t=>t.id===id);
  for(let i=0;i<t.roles.length;i++) {
    const p=f.session.state.profiles.find(p=>p.id===f.session.state.activeProfileId);
    await f.session.confirmRole({templateId:id,roleId:t.roles[i].id,status:'available',memberId:p.players[i].id,expectedRevision:p.revision});
  }
  return t;
}

test('confirmed playback saves a current full identity reference and builtin selection, not a personal Play', async()=>{
  const f=await fixture();const t=(await confirmAll(f)).id;
  await f.session.play(t);
  assert.deepEqual(f.selected,{templateId:t,frameIndex:0});
  assert.deepEqual(f.disk.playbackContext,{source:'role-confirmations',profileId:f.profile.id,profileRevision:4,templateId:t,roleVersion:1});
  assert.equal(f.disk.profiles[0].recentTemplateId,t);
  assert.ok(!Object.hasOwn(f.disk,'frames'));
});

test('same-template manual switch cannot complete when clearing the identity reference fails',async()=>{
  const f=await fixture();const t=(await confirmAll(f)).id;
  await f.session.play(t);f.switches.failClear=true;
  await assert.rejects(f.session.clearContext(),/clear failed/);
  assert.equal(f.session.state.playbackContext.templateId,t);
  assert.equal((await f.repository.load()).state.playbackContext.templateId,t,'failed transition remains the previous confirmed session');
  f.switches.failClear=false;await f.session.clearContext();
  assert.equal(f.disk.playbackContext,null);
  assert.equal((await f.repository.load()).state.playbackContext,null,'completed manual transition cannot resurrect names after restart');
});

test('failures at either later stage of a confirmed switch leave no earlier team identity on disk',async()=>{
  for(const failure of ['failBuiltin','failFinal']) {
    const f=await fixture();await confirmAll(f,'pick-roll');await confirmAll(f,'give-go');
    await f.session.play('pick-roll');f.switches[failure]=true;
    await assert.rejects(f.session.play('give-go'));
    assert.equal(f.disk.playbackContext,null);
    assert.equal(f.session.state.playbackContext,null);
    assert.equal((await f.repository.load()).state.playbackContext,null);
  }
});

test('name and jersey updates retain stable role mappings and update source revision while stale edits are rejected',async()=>{
  const f=await fixture();await confirmAll(f);await f.session.play('pick-roll');
  const old=f.session.state.profiles[0],next=structuredClone(old),beforePlan=f.session.state.rolePlans[f.profile.id]['pick-roll'];next.players[0].name='新昵称';next.players[0].number=88;
  await f.session.update(next);
  assert.equal(f.disk.profiles[0].revision,5);assert.equal(f.disk.playbackContext.profileRevision,5);
  assert.deepEqual(f.disk.rolePlans[f.profile.id]['pick-roll'],beforePlan);
  await assert.rejects(f.session.update(old),/已更新/);
  assert.equal(f.disk.profiles[0].players[0].name,'新昵称');assert.equal(f.disk.profiles[0].players[0].number,88);
});

test('creation, switching and deletion preserve independent archives and clear role context',async()=>{
  const f=await fixture();await confirmAll(f);await f.session.play('pick-roll');
  const options={mode:'4v4',name:'新队',crest:'shield',color:'blue'};
  const created=f.session.create(options);options.name='mutated';const other=await created;
  assert.equal(other.name,'新队');assert.equal(f.disk.profiles.length,2);assert.equal(f.disk.playbackContext,null);
  await f.session.select(f.profile.id);await f.session.remove(other.id);
  assert.equal(f.disk.activeProfileId,f.profile.id);assert.equal(f.disk.profiles.length,1);
  await f.session.remove(f.profile.id);assert.deepEqual(f.disk,emptyLineupState());
});

test('unconfirmed, missing, wrong-mode and absent tactics cannot launch under team identities',async()=>{
  const f=await fixture();await assert.rejects(f.session.play('defense-3v3-zone'));await assert.rejects(f.session.play('four-out-cut'));await assert.rejects(f.session.play('missing'));
  await assert.rejects(f.session.play('pick-roll'));
  await f.session.confirmRole({templateId:'pick-roll',roleId:'attack-1',status:'missing',expectedRevision:1});
  await assert.rejects(f.session.play('pick-roll'));
  assert.equal(f.disk.playbackContext,null);
});

async function creationFixture(profiles = []) {
  let raw = JSON.stringify({ ...emptyLineupState(), profiles, activeProfileId: profiles[0]?.id || null });
  const writes = [], faults = { failWrite: false, failRead: false };
  const adapter = {
    async getItem() { if (faults.failRead) throw new Error('read unavailable'); return raw; },
    async setItem(key, value) {
      assert.equal(key, LINEUPS_KEY);
      writes.push(JSON.parse(value));
      if (faults.failWrite) throw new Error('disk unavailable');
      raw = value;
    },
  };
  const repository = createLineupRepository({ adapter, templates });
  const loaded = await repository.load();
  const session = createLineupSession({ repository, templates, builtinRepository: { async saveSelection() {} }, initialState: loaded.state });
  return { session, writes, faults, get disk() { return JSON.parse(raw); } };
}
function fullDraft(mode = '3v3', id = 'draft-team') {
  const profile = createLineup(mode, { id, name: '完整新队', nbaTeamId: 'BOS', crest: 'shield', color: 'green' });
  profile.players.forEach((player, i) => Object.assign(player, { id: `${id}-player-${i}`, name: `队友${i}`, number: 11 + i }));
  return profile;
}

test('full creation commits the complete member snapshot once with stable IDs and valid fresh metadata', async () => {
  for (const mode of ['3v3', '4v4']) {
    const f = await creationFixture(), draft = fullDraft(mode);
    draft.revision = 99; draft.recentTemplateId = 'give-go';
    const created = await f.session.create(draft);
    assert.equal(f.writes.length, 1, 'there is no preliminary empty-roster commit');
    assert.deepEqual(f.writes[0].profiles[0].players, draft.players);
    assert.deepEqual(created.players.map(p => p.id), draft.players.map(p => p.id));
    assert.equal(created.id, draft.id); assert.equal(created.nbaTeamId, 'BOS');
    assert.equal(created.crest, 'shield'); assert.equal(created.color, 'green');
    assert.equal(created.revision, 1); assert.equal(created.recentTemplateId, null);
    assert.equal(f.disk.activeProfileId, created.id); assert.equal(f.disk.playbackContext, null);
    created.players[0].name = 'return value mutation';
    assert.equal(f.session.state.profiles[0].players[0].name, '队友0');
  }
});

test('creation captures nested call-time data before the serial queue runs', async () => {
  const f = await creationFixture(), draft = fullDraft(), expected = structuredClone(draft.players);
  const saving = f.session.create(draft);
  draft.name = 'changed after call'; draft.nbaTeamId = 'LAL';
  draft.players[0].name = 'changed'; draft.players[0].number = 99; draft.players.reverse();
  const created = await saving;
  assert.equal(created.name, '完整新队'); assert.equal(created.nbaTeamId, 'BOS');
  assert.deepEqual(created.players, expected); assert.deepEqual(f.disk.profiles[0].players, expected);
  assert.equal(f.writes.length, 1);
});

test('failed creation leaves no empty archive or state change and the same stable draft can retry', async () => {
  const previous = fullDraft('3v3', 'existing'), f = await creationFixture([previous]), draft = fullDraft('4v4');
  const before = f.session.state, diskBefore = f.disk;
  f.faults.failWrite = true;
  await assert.rejects(f.session.create(draft), /disk unavailable/);
  assert.deepEqual(f.session.state, before); assert.deepEqual(f.disk, diskBefore);
  assert.deepEqual(f.writes[0].profiles[1].players, draft.players, 'even the failed attempt contains the final members');
  f.faults.failWrite = false;
  await f.session.create(draft);
  assert.equal(f.disk.profiles.length, 2);
  assert.deepEqual(f.disk.profiles[1].players, draft.players);
  assert.equal(f.disk.profiles.filter(profile => profile.id === draft.id).length, 1);
});

test('queued submissions with the same profile identity cannot create duplicates or overwrite existing members', async () => {
  const f = await creationFixture(), draft = fullDraft();
  const a = f.session.create(draft), b = f.session.create(draft);
  const results = await Promise.allSettled([a, b]);
  assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].status, 'rejected');
  assert.match(results[1].reason.message, /标识已存在/);
  assert.equal(f.writes.length, 1); assert.equal(f.disk.profiles.length, 1);
  const changed = structuredClone(draft); changed.players[0].name = 'must not replace';
  await assert.rejects(f.session.create(changed), /标识已存在/);
  assert.equal(f.disk.profiles[0].players[0].name, '队友0');
});

test('invalid complete snapshots are rejected before any write, including roster identity conflicts', async () => {
  for (const corrupt of [
    p => p.players.pop(), p => p.players[1].id = p.players[0].id,
    p => p.players[1].number = p.players[0].number, p => p.players = null,
    p => p.players[0].number = 100,
  ]) {
    const f = await creationFixture(), draft = fullDraft(); corrupt(draft);
    await assert.rejects(f.session.create(draft));
    assert.equal(f.writes.length, 0); assert.deepEqual(f.disk, emptyLineupState());
  }
});

test('capacity is checked after each queued creation so existing twenty archives stay intact', async () => {
  const existing = Array.from({ length: 19 }, (_, i) => fullDraft('3v3', `existing-${i}`));
  const f = await creationFixture(existing);
  const results = await Promise.allSettled([f.session.create(fullDraft('3v3', 'twentieth')), f.session.create(fullDraft('4v4', 'overflow'))]);
  assert.equal(results[0].status, 'fulfilled'); assert.equal(results[1].status, 'rejected');
  assert.match(results[1].reason.message, /最多保存 20/);
  assert.equal(f.writes.length, 1); assert.equal(f.disk.profiles.length, 20);
  assert.deepEqual(f.disk.profiles.slice(0, 19), existing);
});

test('basic creation accepts neutral NBA selection and blank member nicknames without ability inputs', async () => {
  const f = await creationFixture();
  const legacy = await f.session.create({ mode: '3v3', name: '旧调用' });
  assert.equal(legacy.players.length, 3); assert.deepEqual(Object.keys(legacy.players[0]), ['id','name','number']); assert.equal(legacy.nbaTeamId, null);
  const draft = fullDraft('4v4'); draft.nbaTeamId = null; draft.players[0].name = '';
  const incomplete = await f.session.create(draft);
  assert.equal(incomplete.players[0].name, ''); assert.equal(incomplete.nbaTeamId, null);assert.equal(Object.hasOwn(incomplete.players[0],'strengths'),false);
  assert.equal(f.writes.length, 2);
});

test('complete creation cannot bypass a read lock and succeeds only after an explicit successful reload', async () => {
  const original = fullDraft('3v3', 'original'), f = await creationFixture([original]), draft = fullDraft('4v4');
  const before = f.disk;
  f.faults.failRead = true;
  const failedRead = await f.session.reload();
  assert.equal(failedRead.writeLocked, true);
  f.faults.failRead = false;
  await assert.rejects(f.session.create(draft), /读取未成功/);
  assert.equal(f.writes.length, 0); assert.deepEqual(f.disk, before);
  await f.session.reload();
  assert.equal(f.session.writeLocked, false);
  await f.session.create(draft);
  assert.equal(f.writes.length, 1); assert.equal(f.disk.profiles.length, 2);
  assert.deepEqual(f.disk.profiles[0], original); assert.deepEqual(f.disk.profiles[1].players, draft.players);
});

test('defensive plans launch for both roster sizes only after all defense duties are uniquely confirmed',async()=>{
  for(const mode of ['3v3','4v4']){
    const f=await fixture(mode),t=templates.find(t=>t.mode===mode&&t.kind==='defense');
    await assert.rejects(f.session.play(t.id),/确认全部/);await confirmAll(f,t.id);await f.session.play(t.id);
    const p=f.session.state.profiles[0],plan=f.disk.rolePlans[p.id][t.id];assert.equal(getRolePlanState(plan,t,p).ready,true);
    assert.equal(f.disk.playbackContext.source,'role-confirmations');assert.equal(f.disk.playbackContext.templateId,t.id);
    assert.ok(t.roles.every(role=>role.playerId.startsWith('defense-')));
    assert.deepEqual((await f.repository.load()).state.playbackContext,f.disk.playbackContext);
  }
});

test('member replacement invalidates only that member bindings across tactics and clears stale playback names',async()=>{
  const f=await fixture();await confirmAll(f,'pick-roll');await confirmAll(f,'give-go');await f.session.play('pick-roll');
  const next=f.session.state.profiles[0];next.players[0].id='replacement-member';next.players[0].name='新队员';await f.session.update(next);
  assert.equal(f.disk.playbackContext,null);
  for(const id of ['pick-roll','give-go']){
    const plan=f.disk.rolePlans[f.profile.id][id];assert.deepEqual(plan.assignments[0],{roleId:'attack-1',status:'unknown',memberId:null});
    assert.equal(plan.assignments[1].status,'available');assert.equal(plan.assignments[2].status,'available');
    await assert.rejects(f.session.play(id),/确认全部/);
  }
});

test('duplicate-member and stale-revision confirmations leave all disk/state data unchanged',async()=>{
  const f=await fixture(),p=f.profile;
  await f.session.confirmRole({templateId:'pick-roll',roleId:'attack-1',status:'available',memberId:p.players[0].id,expectedRevision:1});
  const before=f.session.state;
  await assert.rejects(f.session.confirmRole({templateId:'pick-roll',roleId:'attack-2',status:'available',memberId:p.players[0].id,expectedRevision:2}),/不同/);
  await assert.rejects(f.session.confirmRole({templateId:'pick-roll',roleId:'attack-2',status:'available',memberId:p.players[1].id,expectedRevision:1}),/已更新/);
  assert.deepEqual(f.session.state,before);assert.deepEqual(f.disk,before);
});

test('queued confirmations use captured revision and call-time payload, so two stale submissions cannot both commit',async()=>{
  const f=await fixture(),payload={templateId:'pick-roll',roleId:'attack-1',status:'available',memberId:f.profile.players[0].id,expectedRevision:1};
  const first=f.session.confirmRole(payload),second=f.session.confirmRole({...payload,roleId:'attack-2',memberId:f.profile.players[1].id});
  payload.status='missing';payload.memberId=null;
  const results=await Promise.allSettled([first,second]);assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');
  assert.match(results[1].reason.message,/已更新/);assert.equal(f.disk.profiles[0].revision,2);
  assert.equal(f.disk.rolePlans[f.profile.id]['pick-roll'].assignments[0].memberId,f.profile.players[0].id);
  assert.equal(f.disk.rolePlans[f.profile.id]['pick-roll'].assignments[1].status,'unknown');
});

test('queued team switch invalidates a previously captured confirmation and playback intention',async()=>{
  const f=await fixture();await confirmAll(f);const other=await f.session.create({mode:'3v3',name:'另一队'});await f.session.select(f.profile.id);
  const p=f.session.state.profiles.find(p=>p.id===f.profile.id);
  const selecting=f.session.select(other.id),confirming=f.session.confirmRole({templateId:'pick-roll',roleId:'attack-1',status:'available',memberId:p.players[0].id,expectedRevision:p.revision}),playing=f.session.play('pick-roll');
  const results=await Promise.allSettled([selecting,confirming,playing]);assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');assert.equal(results[2].status,'rejected');
  assert.equal(f.disk.activeProfileId,other.id);assert.equal(f.disk.playbackContext,null);assert.equal(f.disk.rolePlans[other.id],undefined);
});

test('failed role write leaves prior plan and revision intact and the same captured payload can retry',async()=>{
  const f=await fixture(),before=f.session.state,payload={templateId:'pick-roll',roleId:'attack-1',status:'available',memberId:f.profile.players[0].id,expectedRevision:1};
  f.switches.failClear=true;await assert.rejects(f.session.confirmRole(payload),/clear failed/);
  assert.deepEqual(f.session.state,before);assert.deepEqual(f.disk,before);
  f.switches.failClear=false;await f.session.confirmRole(payload);assert.equal(f.disk.profiles[0].revision,2);assert.equal(f.disk.rolePlans[f.profile.id]['pick-roll'].assignments[0].status,'available');
});

test('explicit swap keeps unique members and reset clears only selected tactic with a new revision',async()=>{
  const f=await fixture();await confirmAll(f,'pick-roll');await confirmAll(f,'give-go');await f.session.play('pick-roll');
  let p=f.session.state.profiles[0];await f.session.swapRoles({templateId:'pick-roll',roleA:'attack-1',roleB:'attack-2',expectedRevision:p.revision});
  let plan=f.disk.rolePlans[p.id]['pick-roll'];assert.equal(plan.assignments[0].memberId,p.players[1].id);assert.equal(plan.assignments[1].memberId,p.players[0].id);assert.equal(f.disk.playbackContext,null);
  const other=structuredClone(f.disk.rolePlans[p.id]['give-go']);p=f.session.state.profiles[0];
  await f.session.resetRolePlan({templateId:'pick-roll',expectedRevision:p.revision});plan=f.disk.rolePlans[p.id]['pick-roll'];
  assert.ok(plan.assignments.every(row=>row.status==='unknown'&&row.memberId===null));assert.deepEqual(f.disk.rolePlans[p.id]['give-go'],other);
  await assert.rejects(f.session.play('pick-roll'),/确认全部/);await f.session.play('give-go');
});

test('failure clearing old source aborts confirmed switch before builtin selection changes',async()=>{
  const f=await fixture();await confirmAll(f,'pick-roll');await confirmAll(f,'give-go');await f.session.play('pick-roll');
  const before=f.disk,selected=f.selected;f.switches.failClear=true;await assert.rejects(f.session.play('give-go'),/clear failed/);
  assert.deepEqual(f.disk,before);assert.deepEqual(f.session.state,before);assert.deepEqual(f.selected,selected);
});

test('historical role version cannot be edited or played until explicit reset replaces just that plan',async()=>{
  const t=templates.find(t=>t.id==='pick-roll');
  const f=await fixture('3v3',(state,p)=>{const plan=createRolePlan(t,p);plan.roleVersion=2;plan.assignments[0]={roleId:'attack-1',status:'available',memberId:p.players[0].id};state.rolePlans={[p.id]:{[t.id]:plan}};});
  const old=f.session.state.rolePlans[f.profile.id][t.id];assert.equal(getRolePlanState(old,t,f.profile).needsReview,true);
  await assert.rejects(f.session.confirmRole({templateId:t.id,roleId:'attack-2',status:'available',memberId:f.profile.players[1].id,expectedRevision:1}),/更新/);
  await assert.rejects(f.session.play(t.id),/确认全部/);assert.deepEqual(f.disk.rolePlans[f.profile.id][t.id],old);
  await f.session.resetRolePlan({templateId:t.id,expectedRevision:1});assert.equal(f.disk.profiles[0].revision,2);
  assert.equal(f.disk.rolePlans[f.profile.id][t.id].roleVersion,1);assert.ok(f.disk.rolePlans[f.profile.id][t.id].assignments.every(row=>row.status==='unknown'&&row.memberId===null));
});

test('flush reports a last failed persistence and returns to usable state after an awaited retry',async()=>{
  const f=await fixture();f.switches.failClear=true;
  const payload={templateId:'pick-roll',roleId:'attack-1',status:'unknown',expectedRevision:1};
  await assert.rejects(f.session.confirmRole(payload),/clear failed/);await assert.rejects(f.session.flush(),/clear failed/);
  f.switches.failClear=false;await f.session.confirmRole(payload);await f.session.flush();assert.equal(f.disk.profiles[0].revision,2);
});

test('main-role saves keep duplicate roles, persist a call-time snapshot and reject stale or incomplete submissions', async () => {
  const f = await fixture('4v4'), p = f.profile;
  const roles = p.players.map((player, index) => ({ memberId: player.id, role: ['relay', 'relay', 'screen', ''][index] }));
  const payload = { profileId: p.id, expectedRevision: p.revision, roles };
  await assert.rejects(f.session.saveMainRoles({ ...payload, roles: roles.slice(1) }), /不完整/);
  await assert.rejects(f.session.saveMainRoles({ ...payload, roles: roles.map(row => ({ ...row, memberId: p.players[0].id })) }), /无效/);
  await assert.rejects(f.session.saveMainRoles({ ...payload, roles: roles.map(row => ({ ...row, role: 'support' })) }), /无效/);
  const first = f.session.saveMainRoles(payload), stale = f.session.saveMainRoles(payload);
  roles[0].role = 'start';
  assert.equal((await first).revision, 2);
  await assert.rejects(stale, /已更新/);
  assert.deepEqual(f.disk.profiles[0].players.map(player => player.mainRole), ['relay', 'relay', 'screen', undefined]);
  const renamed = f.session.state.profiles[0];
  renamed.players[0].name = '改名';
  delete renamed.players[0].mainRole;
  await f.session.update(renamed);
  assert.equal(f.disk.profiles[0].players[0].mainRole, 'relay');
});

test('3v3 secondary roles save independently and older role payloads preserve them', async () => {
  const f = await fixture('3v3', (_state, profile) => {
    profile.players[0].mainRole = 'start'; profile.players[0].secondaryRole = 'space';
  });
  const p = f.profile;
  const roles = p.players.map((player, index) => ({ memberId: player.id, role: ['support', '', 'spacing'][index] }));
  await f.session.saveMainRoles({ profileId: p.id, expectedRevision: p.revision, roles });
  assert.equal(f.disk.profiles[0].players[0].secondaryRole, 'space');

  const current = f.session.state.profiles[0];
  const withSecondary = current.players.map(player => ({ memberId: player.id, role: player.mainRole ?? '', secondaryRole: player.id === current.players[0].id ? 'spacing' : '' }));
  await f.session.saveMainRoles({ profileId: p.id, expectedRevision: current.revision, roles: withSecondary });
  assert.equal(f.disk.profiles[0].players[0].secondaryRole, 'spacing');
});

test('4v4 secondary roles accept new categories and ordinary profile edits preserve them', async () => {
  const f = await fixture('4v4'), p = f.profile;
  const roles = p.players.map((player, index) => ({
    memberId: player.id,
    role: ['space', 'screen', 'relay', 'spacing'][index],
    secondaryRole: index === 0 ? 'finisher' : '',
  }));
  const saved = await f.session.saveMainRoles({ profileId: p.id, expectedRevision: p.revision, roles });
  assert.equal(saved.players[0].mainRole, 'space');
  assert.equal(saved.players[0].secondaryRole, 'finisher');
  const reloaded = await f.repository.load();
  assert.equal(reloaded.state.profiles[0].players[0].mainRole, 'space');
  assert.equal(reloaded.state.profiles[0].players[0].secondaryRole, 'finisher');
  const draft = structuredClone(saved); draft.players[0].name = '保留副角色';
  await f.session.update(draft);
  assert.equal(f.disk.profiles[0].players[0].secondaryRole, 'finisher');
});

test('failed main-role writes preserve prior state and can retry without affecting an independent team', async () => {
  const f = await fixture('4v4'), p = f.profile;
  const other = await f.session.create({ mode: '3v3', name: '另一队' });
  const before = f.session.state;
  const payload = { profileId: p.id, expectedRevision: p.revision, roles: p.players.map(player => ({ memberId: player.id, role: 'screen' })) };
  f.switches.failClear = true;
  await assert.rejects(f.session.saveMainRoles(payload), /clear failed/);
  assert.deepEqual(f.session.state, before);
  assert.deepEqual(f.disk, before);
  f.switches.failClear = false;
  await f.session.saveMainRoles(payload);
  assert.equal(f.disk.activeProfileId, other.id);
  assert.deepEqual(f.disk.profiles[1], other);
  assert.ok(f.disk.profiles[0].players.every(player => player.mainRole === 'screen'));
});

test('combined player configuration saves identity and roles together and preserves the draft after a failed write', async () => {
  const f = await fixture('4v4', (_state, profile) => { profile.players[2].mainRole = 'space'; });
  await confirmAll(f, 'four-out-cut');
  const before = f.session.state;
  const draft = f.session.state.profiles[0];
  Object.assign(draft.players[0], { name: '阿杰', number: 88, mainRole: 'relay' });
  draft.players[1].mainRole = 'relay';
  draft.players[2].mainRole = '';
  draft.players[3].mainRole = 'support';
  const save = () => f.session.update(draft, { includeMainRoles: true });
  await assert.rejects(save(), /角色与阵容人数不符/);
  draft.players[3].mainRole = 'screen';

  f.switches.failClear = true;
  await assert.rejects(save(), /clear failed/);
  assert.deepEqual(f.session.state, before);
  assert.deepEqual(f.disk, before);
  f.switches.failClear = false;
  const pending = save();
  draft.players[0].name = '等待时修改';
  draft.players[0].mainRole = 'space';
  const saved = await pending;
  assert.deepEqual(f.disk.profiles[0], saved);
  assert.equal(saved.revision, before.profiles[0].revision + 1);
  assert.equal(saved.players[0].name, '阿杰');
  assert.equal(saved.players[0].number, 88);
  assert.deepEqual(saved.players.map(player => player.mainRole), ['relay', 'relay', undefined, 'screen']);
  assert.equal(Object.hasOwn(saved.players[2], 'mainRole'), false);
  assert.deepEqual(f.disk.rolePlans, before.rolePlans);
  await assert.rejects(save(), /档案已更新/);
});

test('a new three-person lineup can save duplicate roles with its player identities', async () => {
  const f = await fixture();
  const draft = createLineup('3v3', { name: '周末三人队' });
  draft.players[0].mainRole = 'support';
  draft.players[1].mainRole = 'support';
  draft.players[2].mainRole = 'relay';
  await assert.rejects(f.session.create(draft), /角色与阵容人数不符/);
  draft.players[2].mainRole = '';
  const saved = await f.session.create(draft);
  assert.deepEqual(f.disk.profiles[1], saved);
  assert.deepEqual(saved.players.map(player => player.mainRole), ['support', 'support', undefined]);
  assert.equal(f.disk.activeProfileId, saved.id);
});
