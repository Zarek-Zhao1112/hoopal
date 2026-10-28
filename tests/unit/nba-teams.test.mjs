import test from 'node:test';
import assert from 'node:assert/strict';
import { NBA_TEAMS, getNbaTeam } from '../../data/nba-teams.js';

test('catalog contains each NBA team once with a unique official numeric logo identifier', () => {
  const expected = 'ATL BOS BKN CHA CHI CLE DAL DEN DET GSW HOU IND LAC LAL MEM MIA MIL MIN NOP NYK OKC ORL PHI PHX POR SAC SAS TOR UTA WAS'.split(' ');
  assert.equal(NBA_TEAMS.length, 30);
  assert.deepEqual(NBA_TEAMS.map(team => team.id).sort(), [...expected].sort());
  assert.equal(new Set(NBA_TEAMS.map(team => team.nbaId)).size, 30);
  assert.deepEqual(NBA_TEAMS.map(team => team.nbaId).sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => 1610612737 + i));
  for (const team of NBA_TEAMS) {
    assert.equal(getNbaTeam(team.id), team);
    assert.ok(team.name && team.fullName.includes(team.name));
    assert.match(team.jersey.wordmark, /^[A-Z0-9 ]+$/);
    for (const key of ['base', 'trim', 'secondary', 'text']) assert.match(team.jersey[key], /^#[0-9A-F]{6}$/);
  }
  assert.equal(getNbaTeam('BOS').nbaId, 1610612738);
  assert.equal(getNbaTeam('LAL').nbaId, 1610612747);
  assert.equal(getNbaTeam('CHA').nbaId, 1610612766);
  assert.equal(getNbaTeam('NOP').nbaId, 1610612740);
});

test('team and kit objects are deeply frozen, so one profile cannot recolor another profile', () => {
  assert.ok(Object.isFrozen(NBA_TEAMS));
  for (const team of NBA_TEAMS) {
    assert.ok(Object.isFrozen(team)); assert.ok(Object.isFrozen(team.jersey));
  }
  const boston = getNbaTeam('BOS'), before = JSON.stringify(boston);
  assert.throws(() => NBA_TEAMS.pop(), TypeError);
  assert.throws(() => { boston.name = 'changed'; }, TypeError);
  assert.throws(() => { boston.jersey.base = '#000000'; }, TypeError);
  assert.equal(JSON.stringify(getNbaTeam('BOS')), before);
});

test('strict lookup does not silently select a default team or coerce invalid identities', () => {
  for (const id of [null, undefined, '', 'bos', ' BOS ', 'XXX', '__proto__', 'toString', 1610612738, {}, ['BOS']]) assert.equal(getNbaTeam(id), null);
});

test('recognizable kits use checked representative identities rather than obsolete Jazz yellow or Clippers royal blue', () => {
  assert.equal(getNbaTeam('BOS').jersey.wordmark, 'BOSTON');
  assert.equal(getNbaTeam('LAL').jersey.wordmark, 'LAKERS');
  assert.equal(getNbaTeam('LAL').jersey.text, '#552583');
  assert.equal(getNbaTeam('CLE').jersey.wordmark, 'CLEVELAND');
  // The exact hexes are local render choices; these checks guard the chosen identity families.
  const rgb = hex => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  const [jr, jg, jb] = rgb(getNbaTeam('UTA').jersey.base);
  assert.ok(jb > jg && jr > jg, 'Jazz representative kit is purple');
  const [cr, cg, cb] = rgb(getNbaTeam('LAC').jersey.base);
  assert.ok(cb > cr && cb < 100 && cg < 80, 'Clippers representative kit is navy');
  const [wr, wg, wb] = rgb(getNbaTeam('WAS').jersey.base);
  assert.ok(wr > wg && wr > wb, 'Wizards Icon-inspired kit is red');
});
