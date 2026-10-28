import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup } from '../../shared/lineups.js';
import { recommendLineup } from '../../shared/recommendations.js';
import { templates } from '../../shared/templates.js';
import { createLineupRepository, LINEUPS_KEY, emptyLineupState } from '../../frontend/src/storage/lineups.js';
import { createLineupSession } from '../../frontend/src/storage/lineup-session.js';

async function fixture(mode='3v3') {
  const profile=createLineup(mode,{name:'本队'});
  for(const p of profile.players)Object.assign(p,{height:'medium',build:'medium',mobility:'average'});
  let value=JSON.stringify({...emptyLineupState(),profiles:[profile],activeProfileId:profile.id}),selected={templateId:'pick-roll',frameIndex:0};
  const switches={failClear:false,failFinal:false,failBuiltin:false};
  const adapter={async getItem(){return value},async setItem(key,next){const parsed=JSON.parse(next);if(switches.failClear&&!parsed.playbackContext)throw new Error('clear failed');if(switches.failFinal&&parsed.playbackContext)throw new Error('final failed');value=next}};
  const repository=createLineupRepository({adapter,templates});
  const builtinRepository={async saveSelection(next){if(switches.failBuiltin)throw new Error('builtin failed');selected=structuredClone(next)}};
  const initial=await repository.load();
  const session=createLineupSession({repository,builtinRepository,templates,initialState:initial.state});
  return {profile,session,repository,switches,get disk(){return JSON.parse(value)},get selected(){return selected}};
}

test('recommended playback saves a complete identity reference and a real builtin source, not a Play', async()=>{
  const f=await fixture();const t=recommendLineup(f.profile).recommendations[0].templateId;
  await f.session.play(t);
  assert.deepEqual(f.selected,{templateId:t,frameIndex:0});
  assert.deepEqual(f.disk.playbackContext,{profileId:f.profile.id,profileRevision:1,templateId:t});
  assert.equal(f.disk.profiles[0].recentTemplateId,t);
  assert.ok(!Object.hasOwn(f.disk,'frames'));
});

test('same-template manual switch cannot complete when clearing the identity reference fails',async()=>{
  const f=await fixture();const t=recommendLineup(f.profile).recommendations[0].templateId;
  await f.session.play(t);f.switches.failClear=true;
  await assert.rejects(f.session.clearContext(),/clear failed/);
  assert.equal(f.session.state.playbackContext.templateId,t);
  assert.equal((await f.repository.load()).state.playbackContext.templateId,t,'failed transition remains the previous recommended session');
  f.switches.failClear=false;await f.session.clearContext();
  assert.equal(f.disk.playbackContext,null);
  assert.equal((await f.repository.load()).state.playbackContext,null,'completed manual transition cannot resurrect names after restart');
});

test('failures at either later stage of a recommended switch leave no earlier team identity on disk',async()=>{
  for(const failure of ['failBuiltin','failFinal']) {
    const f=await fixture();const candidates=recommendLineup(f.profile).recommendations;
    await f.session.play(candidates[0].templateId);f.switches[failure]=true;
    await assert.rejects(f.session.play(candidates[1].templateId));
    assert.equal(f.disk.playbackContext,null);
    assert.equal(f.session.state.playbackContext,null);
    assert.equal((await f.repository.load()).state.playbackContext,null);
  }
});

test('profile updates use revisions, invalidate roles and protect against stale form overwrite',async()=>{
  const f=await fixture();await f.session.play(recommendLineup(f.profile).recommendations[0].templateId);
  const old=f.session.state.profiles[0],next=structuredClone(old);next.players[0].strengths=['passing'];
  await f.session.update(next);
  assert.equal(f.disk.profiles[0].revision,2);assert.equal(f.disk.playbackContext,null);
  await assert.rejects(f.session.update(old),/已更新/);
  assert.deepEqual(f.disk.profiles[0].players[0].strengths,['passing']);
});

test('creation, switching and deletion preserve independent archives and clear role context',async()=>{
  const f=await fixture();await f.session.play(recommendLineup(f.profile).recommendations[0].templateId);
  const options={mode:'4v4',name:'新队',crest:'shield',color:'blue'};
  const created=f.session.create(options);options.name='mutated';const other=await created;
  assert.equal(other.name,'新队');assert.equal(f.disk.profiles.length,2);assert.equal(f.disk.playbackContext,null);
  await f.session.select(f.profile.id);await f.session.remove(other.id);
  assert.equal(f.disk.activeProfileId,f.profile.id);assert.equal(f.disk.profiles.length,1);
  await f.session.remove(f.profile.id);assert.deepEqual(f.disk,emptyLineupState());
});

test('incomplete squads and defensive or wrong-mode candidates cannot be launched as recommendations',async()=>{
  const f=await fixture();await assert.rejects(f.session.play('defense-3v3-zone'));await assert.rejects(f.session.play('four-out-cut'));
  const p=f.session.state.profiles[0];p.players[0].height='';await f.session.update(p);
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
  profile.players.forEach((player, i) => Object.assign(player, { id: `${id}-player-${i}`, name: `队友${i}`, number: 11 + i, height: 'medium', build: 'medium', mobility: 'average', strengths: i === 0 ? ['passing'] : [] }));
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
  draft.players[0].name = 'changed'; draft.players[0].strengths.push('handling'); draft.players.reverse();
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
    p => { p.players[0].strengths = ['passing']; p.players[0].weaknesses = ['passing']; },
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

test('legacy creation remains compatible and the session accepts explicitly saved incomplete neutral members', async () => {
  const f = await creationFixture();
  const legacy = await f.session.create({ mode: '3v3', name: '旧调用' });
  assert.equal(legacy.players.length, 3); assert.equal(legacy.players[0].height, ''); assert.equal(legacy.nbaTeamId, null);
  const draft = fullDraft('4v4'); draft.nbaTeamId = null; draft.players[0].height = ''; draft.players[1].build = '';
  const incomplete = await f.session.create(draft);
  assert.equal(incomplete.players[0].height, ''); assert.equal(incomplete.players[1].build, ''); assert.equal(incomplete.nbaTeamId, null);
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
