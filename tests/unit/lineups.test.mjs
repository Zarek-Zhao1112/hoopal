import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup, validateLineup, isLineupReady, MAX_LINEUPS, SKILLS, TRAITS } from '../../shared/lineups.js';
import { NBA_TEAMS } from '../../data/nba-teams.js';
import { recommendLineup } from '../../shared/recommendations.js';

test('new lineups have independent fixed rosters and may be saved before configuration', () => {
  const a = createLineup('3v3'), b = createLineup('4v4');
  assert.equal(a.players.length, 3);
  assert.equal(b.players.length, 4);
  assert.notEqual(a.id, b.id);
  assert.equal(new Set([...a.players, ...b.players].map(player => player.id)).size, 7);
  assert.deepEqual(a.players.map(player => player.number), [1, 2, 3]);
  assert.equal(isLineupReady(a), false);
  assert.deepEqual(validateLineup(a), a);
  a.players[0].strengths.push('shooting');
  assert.deepEqual(b.players[0].strengths, []);
  assert.equal(MAX_LINEUPS, 20);
});

test('configuration needs explicit traits but may have all-general skills', () => {
  const profile = createLineup('3v3');
  for (const player of profile.players) Object.assign(player, { height: 'medium', build: 'slim', mobility: 'average' });
  assert.equal(isLineupReady(profile), true);
  profile.players[2].mobility = '';
  assert.equal(isLineupReady(profile), false);
  assert.equal(isLineupReady({}), false);
  assert.deepEqual(Object.keys(TRAITS), ['height', 'build', 'mobility']);
  assert.equal(SKILLS.length, 6);
});

test('validation returns detached whitelisted data, retains text rather than interpreting markup', () => {
  const input = createLineup('3v3', { name: '  测试队  ', id: 'test-team', crest: 'shield', color: 'green' });
  input.extra = { secret: true };
  input.players[0].name = '<img src=x onerror=alert(1)>';
  // A legal-length text value is retained as text; rendering owns escaping.
  input.players[0].name = '<b>同名</b>';
  input.players[0].extra = 'discard';
  input.players[0].strengths = ['passing'];
  const copy = validateLineup(input);
  assert.equal(copy.name, '测试队');
  assert.equal(copy.players[0].name, '<b>同名</b>');
  assert.equal('extra' in copy, false);
  assert.equal('extra' in copy.players[0], false);
  copy.players[0].strengths.push('handling');
  assert.deepEqual(input.players[0].strengths, ['passing']);
});

test('invalid rosters, duplicate identity and jersey numbers cannot silently remove or merge members', () => {
  for (const change of [
    p => p.players.pop(), p => p.players.push(p.players[0]),
    p => p.players[1].id = p.players[0].id,
    p => p.players[1].number = p.players[0].number,
    p => p.players[0].number = 100, p => p.players[0].number = -1, p => p.players[0].number = 1.5,
    p => p.revision = 0, p => p.revision = Infinity, p => p.mode = '5v5'
  ]) {
    const p = createLineup('3v3'); change(p); assert.throws(() => validateLineup(p));
  }
  const legal = createLineup('3v3'); legal.players[0].number = 0;
  assert.equal(validateLineup(legal).players[0].number, 0);
});

test('skill limits, conflicting choices and unknown values are rejected', () => {
  for (const change of [
    p => p.players[0].strengths = ['shooting', 'driving', 'passing', 'handling'],
    p => p.players[0].weaknesses = ['shooting', 'driving', 'passing'],
    p => p.players[0].strengths = ['passing', 'passing'],
    p => { p.players[0].strengths = ['passing']; p.players[0].weaknesses = ['passing']; },
    p => p.players[0].strengths = ['dunking'],
    p => p.players[0].mobility = 'fast', p => p.crest = 'custom', p => p.color = 'red',
    p => p.name = '队'.repeat(41), p => p.players[0].name = '名'.repeat(25)
  ]) {
    const p = createLineup('3v3'); change(p); assert.throws(() => validateLineup(p));
  }
});

test('legacy profiles without an NBA team stay unselected and retain all existing identity and player data', () => {
  for (const mode of ['3v3', '4v4']) {
    const profile = createLineup(mode, { crest: 'bolt', color: 'green' });
    profile.players[0].name = '老队员'; profile.players[0].strengths = ['passing'];
    profile.recentTemplateId = mode === '3v3' ? 'give-go' : 'high-low';
    delete profile.nbaTeamId;
    const before = structuredClone(profile), normalized = validateLineup(profile);
    assert.equal(normalized.nbaTeamId, null);
    assert.deepEqual(profile, before, 'reading must not mutate an old record');
    const { nbaTeamId, ...rest } = normalized;
    assert.deepEqual(rest, before);
    assert.equal(createLineup(mode).nbaTeamId, null);
    assert.equal(validateLineup({ ...profile, nbaTeamId: null }).nbaTeamId, null);
  }
});

test('all selected teams survive creation and JSON validation round trips for either roster size', () => {
  for (const mode of ['3v3', '4v4']) for (const team of NBA_TEAMS) {
    const profile = createLineup(mode, { nbaTeamId: team.id, crest: 'shield', color: 'blue' });
    profile.players[0].name = '同名'; profile.players[1].name = '同名';
    const copy = validateLineup(JSON.parse(JSON.stringify(profile)));
    assert.deepEqual(copy, profile);
    assert.equal(copy.nbaTeamId, team.id);
    assert.equal(copy.crest, 'shield'); assert.equal(copy.color, 'blue');
    assert.notEqual(copy.players, profile.players);
    assert.notEqual(copy.players[0], profile.players[0]);
  }
});

test('invalid NBA team values are rejected instead of dropped or implicitly normalized', () => {
  for (const id of ['', 'XXX', 'bos', ' BOS ', 1610612738, false, 0, {}, ['BOS'], '__proto__']) {
    const profile = createLineup('3v3'); profile.nbaTeamId = id;
    assert.throws(() => validateLineup(profile), /NBA/);
    assert.throws(() => createLineup('3v3', { nbaTeamId: id }), /NBA/);
    assert.equal(profile.nbaTeamId, id, 'failed validation must not change the input');
  }
});

test('switching NBA kits leaves readiness, recommendation ranks and member assignments unchanged', () => {
  const profile = createLineup('4v4');
  const strengths = [['handling', 'driving', 'passing'], ['screening', 'shooting'], ['shooting'], ['screening', 'finishing']];
  profile.players.forEach((player, i) => Object.assign(player, { height: 'medium', build: 'medium', mobility: 'average', strengths: strengths[i] }));
  const baseline = recommendLineup(profile), players = structuredClone(profile.players);
  assert.equal(isLineupReady(profile), true);
  for (const team of NBA_TEAMS) {
    profile.nbaTeamId = team.id;
    assert.deepEqual(recommendLineup(profile), baseline);
    assert.deepEqual(profile.players, players);
    assert.equal(isLineupReady(profile), true);
  }
});
