import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup } from '../../shared/lineups.js';
import { templates } from '../../shared/templates.js';
import { assignTeamRoles, getTeamRoleOptions, validateTeamRolePreferences } from '../../shared/team-roles.js';

const tactic = id => templates.find(template => template.id === id);

test('role options stay scoped to team size and the offense catalog rejects unconfigured additions', () => {
  assert.deepEqual(getTeamRoleOptions('3v3').map(role => role.id), ['start', 'support', 'space', '']);
  assert.deepEqual(getTeamRoleOptions('4v4').map(role => role.id), ['start', 'screen', 'relay', 'space', '']);
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
  assert.deepEqual(assignTeamRoles(tactic('pick-roll'), team).map(row => row.number), [2, 3, 1]);
  assert.equal(assignTeamRoles(tactic('high-low'), team), null);
  assert.equal(assignTeamRoles(templates.find(t => t.kind === 'defense' && t.mode === '3v3'), team), null);
});

test('3v3 give-and-go aligns initiator, relay and weak-side space with the authored duties', () => {
  const team = createLineup('3v3');
  team.players[0].number = 23; team.players[0].mainRole = 'support';
  team.players[1].number = 31; team.players[1].mainRole = 'space';
  team.players[2].number = 7; team.players[2].mainRole = 'start';
  const rows = assignTeamRoles(tactic('give-go'), team);

  assert.deepEqual(rows.map(row => row.number), [7, 23, 31]);
  assert.deepEqual(rows.map(row => row.title), ['传切终结者', '翼侧回传者', '弱侧接应者']);
});
