import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup } from '../../shared/lineups.js';
import { templates } from '../../shared/templates.js';
import { assignTeamRoles, getTeamRoleOptions, validateTeamRolePreferences } from '../../shared/team-roles.js';

const tactic = id => templates.find(template => template.id === id);

test('role options stay scoped to team size and the offense catalog rejects unconfigured additions', () => {
  assert.deepEqual(getTeamRoleOptions('3v3').map(role => role.id), ['start', 'support', 'spacing', 'space', '']);
  assert.equal(getTeamRoleOptions('3v3').find(role => role.id === 'space').label, '得分终结');
  assert.deepEqual(getTeamRoleOptions('4v4').map(role => role.id), ['start', 'screen', 'relay', 'spacing', 'finisher', 'space', '']);
  assert.equal(getTeamRoleOptions('4v4').find(role => role.id === 'space').label, '空间终结');
  assert.equal(getTeamRoleOptions('4v4').find(role => role.id === 'finisher').label, '得分终结');
  validateTeamRolePreferences(templates);
  assert.throws(() => validateTeamRolePreferences([...templates, { ...tactic('high-low'), id: 'new-offense' }]), /新|缺少/);
});

test('two 4v4 relay preferences match distinct slots even when role metadata is reordered', () => {
  const team = createLineup('4v4');
  team.players.forEach((player, index) => { player.mainRole = ['relay', 'space', 'relay', 'start'][index]; });
  const template = tactic('high-low');
  const rows = assignTeamRoles({ ...template, roles: [...template.roles].reverse() }, team);
  assert.deepEqual(rows.map(row => row.number), [4, 1, 2, 3]);
  assert.deepEqual(rows.map(row => row.playerId), ['attack-1', 'attack-2', 'attack-3', 'attack-4']);
  assert.equal(rows[3].title, '高位策应者');
  assert.equal(new Set(rows.map(row => row.memberId)).size, 4);
});

test('partial choices match the preferred slot and fill remaining spots by stable roster order', () => {
  const team = createLineup();
  assert.equal(assignTeamRoles(tactic('pick-roll'), team), null);
  team.players[0].mainRole = 'space';
  assert.deepEqual(assignTeamRoles(tactic('pick-roll'), team).map(row => row.number), [2, 1, 3]);
  assert.equal(assignTeamRoles(tactic('high-low'), team), null);
  assert.equal(assignTeamRoles(templates.find(t => t.kind === 'defense' && t.mode === '3v3'), team), null);
});

test('3v3 give-and-go sends the scorer to the authored finishing position', () => {
  const team = createLineup('3v3');
  team.players[0].number = 23; team.players[0].mainRole = 'support';
  team.players[1].number = 31; team.players[1].mainRole = 'space';
  team.players[2].number = 7; team.players[2].mainRole = 'start';
  const rows = assignTeamRoles(tactic('give-go'), team);

  assert.deepEqual(rows.map(row => row.number), [31, 23, 7]);
  assert.deepEqual(rows.map(row => row.title), ['传切终结者', '翼侧回传者', '弱侧接应者']);
});

test('3v3 prioritizes primary matches, then secondary matches, then roster-order fill', () => {
  const team = createLineup('3v3');
  team.players[0].mainRole = 'start'; team.players[0].secondaryRole = 'space';
  team.players[1].mainRole = 'support'; team.players[1].secondaryRole = 'spacing';
  team.players[2].mainRole = 'spacing';
  const rows = assignTeamRoles(tactic('give-go'), team);
  assert.deepEqual(rows.map(row => row.number), [1, 2, 3]);

  team.players.forEach(player => { delete player.mainRole; delete player.secondaryRole; });
  assert.deepEqual(assignTeamRoles(tactic('pick-roll'), team), null);
  team.players[0].mainRole = 'support';
  assert.deepEqual(assignTeamRoles(tactic('pick-roll'), team).map(row => row.number), [2, 1, 3]);
});

test('4v4 separates spacing and finishing while keeping legacy space at its original slots', () => {
  const team = createLineup('4v4');
  team.players[0].number = 31; team.players[0].mainRole = 'space';
  team.players[1].number = 12; team.players[1].mainRole = 'screen';
  team.players[2].number = 7; team.players[2].mainRole = 'start';
  team.players[3].number = 23; team.players[3].mainRole = 'relay';
  const old = assignTeamRoles(tactic('four-out-cut'), team);
  assert.deepEqual(old.map(row => row.number), [7, 23, 12, 31]);

  team.players[0].mainRole = 'finisher';
  team.players[1].mainRole = 'spacing';
  team.players[2].mainRole = 'start';
  team.players[3].mainRole = 'relay';
  const current = assignTeamRoles(tactic('four-out-cut'), team);
  assert.deepEqual(current.map(row => row.number), [31, 23, 12, 7]);
  assert.equal(new Set(current.map(row => row.memberId)).size, 4);

  team.players.forEach(player => { player.mainRole = undefined; });
  team.players[0].mainRole = 'space';
  assert.equal(assignTeamRoles(tactic('four-spread-pick-roll'), team).find(row => row.memberId === team.players[0].id).playerId, 'attack-2');
});

test('all nine 4v4 offense tactics put explicit finishers and spacers on authored positions', () => {
  const cases = {
    'four-out-cut': ['finisher', 'relay', 'spacing', 'spacing'],
    'four-spread-pick-roll': ['start', 'spacing', 'spacing', 'finisher'],
    'staggered-screens': ['start', 'finisher', 'screen', 'finisher'],
    'high-low': ['start', 'relay', 'finisher', 'relay'],
    'drive-corner-kick': ['relay', 'spacing', 'start', 'finisher'],
    'spain-pick-roll': ['start', 'finisher', 'spacing', 'finisher'],
    hammer: ['start', 'finisher', 'screen', 'spacing'],
    'zoom-handoff': ['screen', 'start', 'screen', 'finisher'],
    'screen-the-screener': ['start', 'finisher', 'finisher', 'screen'],
  };
  for (const [id, roles] of Object.entries(cases)) {
    const team = createLineup('4v4');
    team.players.forEach((player, index) => { player.mainRole = roles[index]; });
    const rows = assignTeamRoles(tactic(id), team);
    assert.deepEqual(rows.map(row => row.number), [1, 2, 3, 4], id);
  }
});
