import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup, validateLineup } from '../../shared/lineups.js';
import { templates } from '../../shared/templates.js';
import { createRolePlan, setRoleResponse } from '../../shared/tactic-roles.js';
import { createLineupRepository, emptyLineupState, LINEUPS_KEY } from '../../frontend/src/storage/lineups.js';
import { createLineupSession } from '../../frontend/src/storage/lineup-session.js';

const clone = value => structuredClone(value);
function complete(profile, id = 'pick-roll') {
  const template = templates.find(t => t.id === id);
  return template.roles.reduce((plan, role, index) => setRoleResponse(plan, role.id, { status: 'available', memberId: profile.players[index].id }, template, profile), createRolePlan(template, profile));
}
function stateWith(profiles, active = profiles[0]?.id || null) { return { ...emptyLineupState(), profiles, activeProfileId: active }; }
async function fixture(initial = stateWith([createLineup()]), initialFaults = {}) {
  const values = new Map([[LINEUPS_KEY, typeof initial === 'string' ? initial : JSON.stringify(initial)]]), writes = [], attempts = [];
  const faults = { read: false, main: false, backup: false, ...initialFaults };
  const adapter = {
    async getItem(key) { if (faults.read) throw new Error('read unavailable'); return values.get(key) ?? null; },
    async setItem(key, value) {
      attempts.push([key, value]);
      if (key === LINEUPS_KEY && faults.main) throw new Error('main unavailable');
      if (key !== LINEUPS_KEY && faults.backup) throw new Error('backup unavailable');
      writes.push([key, value]); values.set(key, value);
    },
  };
  const repository = createLineupRepository({ adapter, templates, makeBackupId: () => 'body-test' });
  const loaded = await repository.load();
  const session = createLineupSession({ repository, builtinRepository: { async saveSelection() {} }, templates, initialState: loaded.state, writeLocked: loaded.writeLocked });
  return { values, writes, attempts, faults, repository, session, loaded, get disk() { return JSON.parse(values.get(LINEUPS_KEY)); } };
}
const payload = (f, bodyType, patch = {}) => ({ bodyType, profileId: f.session.state.activeProfileId, expectedRevision: f.session.state.profiles.find(p => p.id === f.session.state.activeProfileId)?.revision, ...patch });

test('schema2 without the new preference reads as null without a migration write or lost identity', async () => {
  const p = createLineup('4v4', { nbaTeamId: 'BOS' }); delete p.bodyType;
  const raw = JSON.stringify(stateWith([p])), f = await fixture(raw);
  assert.equal(f.loaded.state.profiles[0].bodyType, null);
  assert.deepEqual(f.loaded.state.profiles[0].players, p.players);
  assert.equal(f.values.get(LINEUPS_KEY), raw); assert.deepEqual(f.writes, []); assert.deepEqual(f.loaded.warnings, []);
  await f.session.setBodyType(payload(f, 'three-big'));
  assert.equal(f.disk.profiles[0].bodyType, 'three-big'); assert.equal(f.writes.length, 1);
});

test('invalid body preference is isolated by field while both the team and historical plans survive', async () => {
  const p = createLineup('3v3'); p.players[0].name = '原有队员';
  const plan = complete(p), state = stateWith([p]); state.rolePlans = { [p.id]: { 'pick-roll': plan } }; state.profiles[0].bodyType = 'three-big';
  const raw = JSON.stringify(state), f = await fixture(raw);
  assert.equal(f.loaded.state.profiles.length, 1); assert.equal(f.loaded.state.profiles[0].bodyType, null);
  assert.equal(f.loaded.state.profiles[0].players[0].name, '原有队员'); assert.deepEqual(f.loaded.state.rolePlans[p.id]['pick-roll'], plan);
  assert.ok(f.loaded.warnings.some(message => /体型分类/.test(message))); assert.equal(f.values.get(LINEUPS_KEY), raw); assert.equal(f.writes.length, 0);
  f.faults.backup = true;
  await assert.rejects(f.session.setBodyType(payload(f, 'one-big')), /backup unavailable/);
  assert.equal(f.values.get(LINEUPS_KEY), raw); assert.equal(f.session.state.profiles[0].bodyType, null);
  f.faults.backup = false; f.faults.main = true;
  await assert.rejects(f.session.setBodyType(payload(f, 'one-big')), /main unavailable/);
  assert.equal(f.values.get(`${LINEUPS_KEY}.corrupt-body-test`), raw); assert.equal(f.values.get(LINEUPS_KEY), raw);
  f.faults.main = false; await f.session.setBodyType(payload(f, 'one-big'));
  assert.equal(f.disk.profiles[0].bodyType, 'one-big'); assert.deepEqual(f.disk.rolePlans[p.id]['pick-roll'], plan);
  assert.equal(f.writes.filter(([key]) => key.includes('.corrupt-')).length, 1, 'successful raw backup is reused after a main-write failure');
});

test('schema1 migration preserves exact original bytes before writing the new preference', async () => {
  const p = createLineup('3v3', { nbaTeamId: 'LAL' }); delete p.bodyType;
  p.players.forEach(member => Object.assign(member, { height: '', build: '', mobility: '', strengths: [], weaknesses: [] }));
  const raw = JSON.stringify({ schemaVersion: 1, profiles: [p], activeProfileId: p.id, playbackContext: null });
  const f = await fixture(raw); assert.equal(f.session.state.profiles[0].bodyType, null); assert.equal(f.writes.length, 0);
  f.faults.backup = true; await assert.rejects(f.session.setBodyType(payload(f, 'two-big')), /backup unavailable/);
  assert.equal(f.values.get(LINEUPS_KEY), raw); f.faults.backup = false;
  await f.session.setBodyType(payload(f, 'two-big'));
  assert.equal(f.values.get(`${LINEUPS_KEY}.migration-v1-body-test`), raw);
  assert.equal(f.disk.schemaVersion, 2); assert.equal(f.disk.profiles[0].bodyType, 'two-big');
  assert.deepEqual(f.disk.profiles[0].players.map(({ id, name, number }) => ({ id, name, number })), p.players.map(({ id, name, number }) => ({ id, name, number })));
});

test('unknown schemas and failed initial reads cannot be overwritten by a body preference operation', async () => {
  const raw = '{"schemaVersion":77,"profiles":[]}'; const future = await fixture(raw);
  await assert.rejects(future.session.setBodyType({ profileId: 'unknown', expectedRevision: 1, bodyType: 'one-big' }), /读取/);
  assert.equal(future.values.get(LINEUPS_KEY), raw); assert.equal(future.attempts.length, 0);
  const p = createLineup(), original = JSON.stringify(stateWith([p])), f = await fixture(original, { read: true });
  await assert.rejects(f.session.setBodyType({ profileId: p.id, expectedRevision: 1, bodyType: 'one-big' }), /读取/);
  assert.equal(f.values.get(LINEUPS_KEY), original); assert.equal(f.attempts.length, 0);
  f.faults.read = false; await f.session.reload(); await f.session.setBodyType(payload(f, 'one-big'));
  assert.equal(f.disk.profiles[0].bodyType, 'one-big');
});

test('setting a type retains member IDs and every saved plan while reliably clearing the old source', async () => {
  const p = createLineup(), plan = complete(p), state = stateWith([p]);
  state.rolePlans = { [p.id]: { 'pick-roll': plan, 'give-go': complete(p, 'give-go') } };
  state.playbackContext = { source: 'role-confirmations', profileId: p.id, profileRevision: 1, templateId: 'pick-roll', roleVersion: 1 };
  const f = await fixture(state); assert.ok(f.session.state.playbackContext);
  const result = await f.session.setBodyType(payload(f, 'one-big'));
  assert.equal(result.revision, 2); assert.equal(result.bodyType, 'one-big');
  assert.deepEqual(f.disk.profiles[0].players, p.players); assert.deepEqual(f.disk.rolePlans, state.rolePlans);
  assert.equal(f.disk.playbackContext, null); result.players[0].name = 'mutation';
  assert.equal(f.session.state.profiles[0].players[0].name, '');
});

test('an explicit current profile and matching safe revision are required before any type write', async () => {
  const f = await fixture(), base = payload(f, 'one-big');
  for (const patch of [{ profileId: undefined }, { profileId: 'other' }, { expectedRevision: undefined }, { expectedRevision: 0 }, { expectedRevision: 1.5 }, { expectedRevision: 2 }, { bodyType: 'three-big' }, { bodyType: null }, { bodyType: '__proto__' }]) {
    await assert.rejects(f.session.setBodyType({ ...base, ...patch }));
  }
  assert.equal(f.writes.length, 0); assert.equal(f.disk.profiles[0].bodyType, null);
});

test('setBodyType snapshots the complete call-time request and does not follow a later payload mutation', async () => {
  const f = await fixture(), request = payload(f, 'two-big');
  const saved = f.session.setBodyType(request); request.bodyType = 'three-big'; request.profileId = 'later-profile'; request.expectedRevision = 99;
  await saved; assert.equal(f.disk.profiles[0].bodyType, 'two-big'); assert.equal(f.disk.profiles[0].revision, 2);
});

test('a queued switch to another team rejects the previous team preference rather than redirecting it', async () => {
  const a = createLineup('3v3', { id: 'team-a' }), b = createLineup('4v4', { id: 'team-b' });
  const f = await fixture(stateWith([a, b], a.id)); const request = payload(f, 'one-big');
  const selecting = f.session.select(b.id), saving = f.session.setBodyType(request);
  await selecting; await assert.rejects(saving, /已更新/);
  assert.equal(f.disk.activeProfileId, b.id); assert.ok(f.disk.profiles.every(p => p.bodyType === null));
  assert.equal(f.writes.length, 1, 'only the explicitly selected team operation wrote');
});

test('stale queued preferences cannot overwrite an earlier successful change and can be retried explicitly', async () => {
  const f = await fixture(); const first = f.session.setBodyType(payload(f, 'one-big')), second = f.session.setBodyType(payload(f, 'two-big'));
  await first; await assert.rejects(second, /已更新/); assert.equal(f.disk.profiles[0].bodyType, 'one-big'); assert.equal(f.writes.length, 1);
  await f.session.setBodyType(payload(f, 'two-big')); assert.equal(f.disk.profiles[0].bodyType, 'two-big'); assert.equal(f.disk.profiles[0].revision, 3);
});

test('failed writes preserve the prior type, revision, source and plans, and the same selection can retry', async () => {
  const p = createLineup('4v4', { bodyType: 'one-big' }), state = stateWith([p]); state.rolePlans = { [p.id]: { 'high-low': complete(p, 'high-low') } };
  const f = await fixture(state), before = clone(f.disk); f.faults.main = true;
  await assert.rejects(f.session.setBodyType(payload(f, 'three-big')), /main unavailable/);
  assert.deepEqual(f.disk, before); assert.deepEqual(f.session.state, before); await assert.rejects(f.session.flush(), /main unavailable/);
  f.faults.main = false; await f.session.setBodyType(payload(f, 'three-big')); await f.session.flush();
  assert.equal(f.disk.profiles[0].bodyType, 'three-big'); assert.equal(f.disk.profiles[0].revision, 2); assert.deepEqual(f.disk.rolePlans, before.rolePlans);
});

test('reselecting the same valid type avoids an unnecessary write and revision bump', async () => {
  const p = createLineup('3v3', { bodyType: 'similar' }), f = await fixture(stateWith([p]));
  const raw = f.values.get(LINEUPS_KEY); await f.session.setBodyType(payload(f, 'similar'));
  assert.equal(f.values.get(LINEUPS_KEY), raw); assert.equal(f.writes.length, 0); assert.equal(f.session.state.profiles[0].revision, 1);
});

test('ordinary member edits preserve the saved preference even if an older wizard draft omits or changes it', async () => {
  for (const wrong of [undefined, null, 'one-big']) {
    const p = createLineup('4v4', { bodyType: 'three-big' }), f = await fixture(stateWith([p]));
    const draft = clone(f.session.state.profiles[0]); draft.name = '改名后的队伍'; draft.players[0].name = '改名队员'; draft.players[0].number = 88;
    if (wrong === undefined) delete draft.bodyType; else draft.bodyType = wrong;
    await f.session.update(draft);
    assert.equal(f.disk.profiles[0].bodyType, 'three-big'); assert.equal(f.disk.profiles[0].name, '改名后的队伍'); assert.equal(f.disk.profiles[0].players[0].number, 88);
    assert.deepEqual(f.disk.profiles[0].players.map(p => p.id), p.players.map(p => p.id));
  }
});

test('basic validator accepts missing/null preference but rejects invalid values without modifying input', () => {
  const p = createLineup('3v3'); delete p.bodyType; assert.equal(validateLineup(p).bodyType, null); assert.ok(!Object.hasOwn(p, 'bodyType'));
  for (const bodyType of ['three-big', '', false, [], {}, '__proto__']) assert.throws(() => validateLineup({ ...p, bodyType }), /体型/);
});
