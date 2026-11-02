import test from 'node:test';
import assert from 'node:assert/strict';
import { templates } from '../../shared/templates.js';
import { ROLE_ACTIONS, validateTacticRoles, validateTacticCatalog, createRolePlan, validateRolePlan, getRolePlanState, setRoleResponse, swapRoleMembers, suggestRoleAlternatives } from '../../shared/tactic-roles.js';

const clone = value => structuredClone(value);
const template = id => templates.find(item => item.id === id);
const team = mode => ({ id: `team-${mode}`, mode, players: Array.from({ length: mode === '4v4' ? 4 : 3 }, (_, i) => ({ id: `member-${i}`, name: `队友${i}`, number: 20 + i })) });
function complete(t, profile) {
  return t.roles.reduce((plan, role, i) => setRoleResponse(plan, role.id, { status: 'available', memberId: profile.players[i].id }, t, profile), createRolePlan(t, profile));
}
function changed(t, changes) { return { ...t, roles: clone(t.roles), ...changes }; }

test('registered catalog has complete duties on all 26 plays and every friendly actor of all 155 frames', () => {
  assert.equal(validateTacticCatalog(templates), templates);
  assert.equal(templates.length, 26);
  assert.equal(templates.reduce((sum, t) => sum + t.roles.length, 0), 91);
  assert.equal(templates.reduce((sum, t) => sum + t.build().frames.length, 0), 155);
  for (const t of templates) {
    assert.equal(validateTacticRoles(t).length, t.mode === '3v3' ? 3 : 4);
    for (const role of t.roles) {
      assert.match(role.playerId, t.kind === 'defense' ? /^defense-/ : /^attack-/);
      assert.ok(role.actionIds.every(id => typeof ROLE_ACTIONS[id] === 'string'));
    }
  }
});

test('future registered tactics without metadata are rejected, not filtered or given numbered fallback roles', () => {
  const t = template('pick-roll');
  assert.throws(() => validateTacticCatalog([...templates, { ...t, id: 'future', roles: undefined }]), /全部/);
  assert.throws(() => validateTacticCatalog([...templates, t]), /重复/);
  assert.throws(() => validateTacticCatalog([]), /为空/);
  assert.throws(() => validateTacticRoles({ ...t, roleVersion: 0 }), /版本/);
});

test('missing/duplicate identities, wrong side/number, empty duties and unknown actions block publication', () => {
  const t = template('pick-roll');
  const broken = [
    roles => roles.pop(),
    roles => { roles[1].id = roles[0].id; },
    roles => { roles[1].playerId = roles[0].playerId; },
    roles => { roles[1].playerId = 'defense-2'; },
    roles => { roles[1].number = 3; },
    roles => { roles[1].task = '  '; },
    roles => { roles[1].title = ''; },
    roles => { roles[1].actionIds = []; },
    roles => { roles[1].actionIds = ['not-a-rating']; },
    roles => { roles[1].actionIds = ['stationary-screen', 'stationary-screen']; }
  ];
  for (const mutate of broken) {
    const value = changed(t); mutate(value.roles);
    assert.throws(() => validateTacticRoles(value));
  }
});

test('later frame actor disappearance, side changes and invalid stage references block publication', () => {
  const t = template('pick-roll');
  for (const mutate of [
    play => { play.frames.at(-1).players = play.frames.at(-1).players.filter(p => p.id !== 'attack-2'); },
    play => { play.frames[2].players.find(p => p.id === 'attack-2').team = 'defense'; },
    play => { play.frames[2].players.find(p => p.id === 'attack-2').number = 1; },
    play => { play.mode = '4v4'; }
  ]) {
    const play = t.build(); mutate(play);
    assert.throws(() => validateTacticRoles(changed(t, { build: () => play })));
  }
  const invalid = changed(t);
  invalid.roles[0].stepHints = [{ stepIndex: t.build().frames.length, note: '晚于最后一步' }];
  assert.throws(() => validateTacticRoles(invalid), /阶段/);
});

test('unknown is the initial state; missing and unknown never count as team readiness', () => {
  const t = template('pick-roll'), p = team('3v3');
  const plan = createRolePlan(t, p);
  assert.ok(plan.assignments.every(a => a.status === 'unknown' && a.memberId === null));
  const one = setRoleResponse(plan, t.roles[0].id, { status: 'available', memberId: p.players[0].id }, t, p);
  const missing = setRoleResponse(one, t.roles[1].id, { status: 'missing', memberId: p.players[1].id }, t, p);
  const state = getRolePlanState(missing, t, p);
  assert.equal(state.ready, false); assert.equal(state.confirmedCount, 1);
  assert.equal(state.roles[1].status, 'missing'); assert.equal(state.roles[1].memberId, null);
  assert.equal(plan.assignments[0].status, 'unknown');
});

test('available needs a unique existing member and rejects silent replacement of another role', () => {
  const t = template('pick-roll'), p = team('3v3');
  const first = setRoleResponse(null, t.roles[0].id, { status: 'available', memberId: p.players[0].id }, t, p);
  assert.throws(() => setRoleResponse(first, t.roles[1].id, { status: 'available', memberId: p.players[0].id }, t, p), /不同/);
  assert.throws(() => setRoleResponse(first, t.roles[1].id, { status: 'available', memberId: 'removed' }, t, p), /现有/);
  assert.throws(() => setRoleResponse(first, t.roles[1].id, { status: 'available' }, t, p));
  assert.throws(() => setRoleResponse(first, 'not-role', { status: 'unknown' }, t, p));
  assert.throws(() => setRoleResponse(first, t.roles[1].id, { status: 'interested' }, t, p));
});

test('all 3v3/4v4 attack and defense plays can be fully confirmed with correct animation bindings', () => {
  for (const t of templates) {
    const p = team(t.mode), plan = complete(t, p), state = getRolePlanState(plan, t, p);
    assert.equal(state.ready, true, t.id); assert.equal(state.confirmedCount, p.players.length);
    assert.equal(state.needsReview, false);
    assert.deepEqual(state.roles.map(role => role.memberId), p.players.map(player => player.id));
    assert.deepEqual(state.roles.map(role => role.playerId), t.roles.map(role => role.playerId));
  }
});

test('permutation and member rename/jersey edits keep stable role and member identities', () => {
  const t = template('high-low'), p = team('4v4'), plan = complete(t, p);
  const reordered = { ...plan, assignments: [...plan.assignments].reverse() };
  const renamed = clone(p); renamed.players.reverse(); renamed.players[0].name = '新名字'; renamed.players[0].number = 99;
  assert.deepEqual(validateRolePlan(reordered, t, renamed), plan);
  assert.equal(getRolePlanState(reordered, t, renamed).ready, true);
});

test('stale role versions and removed members never display saved names as confirmed', () => {
  const t = template('pick-roll'), p = team('3v3'), plan = complete(t, p);
  const newer = { ...t, roleVersion: 2 };
  const stale = getRolePlanState(plan, newer, p);
  assert.equal(stale.ready, false); assert.equal(stale.needsReview, true);
  assert.ok(stale.roles.every(role => role.status === 'unknown' && role.memberId === null));
  assert.throws(() => validateRolePlan(plan, newer, p), /更新/);
  const replaced = clone(p); replaced.players[0].id = 'new-member';
  assert.equal(getRolePlanState(plan, t, replaced).ready, false);
  assert.equal(getRolePlanState(plan, t, replaced).needsReview, true);
});

test('missing team, wrong mode, invalid roster and other-tactic plan stay unconfirmed', () => {
  const t = template('pick-roll'), p = team('3v3'), plan = complete(t, p);
  for (const profile of [null, team('4v4'), { ...p, players: [p.players[0], p.players[0], p.players[2]] }]) {
    const state = getRolePlanState(plan, t, profile);
    assert.equal(state.ready, false); assert.equal(state.confirmedCount, 0);
  }
  const state = getRolePlanState(plan, template('give-go'), p);
  assert.equal(state.ready, false); assert.ok(state.roles.every(role => role.memberId === null));
  assert.throws(() => createRolePlan(t, team('4v4')));
  assert.equal(createRolePlan(t).assignments.length, 3);
});

test('swap is explicit, immutable and limited to two fully confirmed duties', () => {
  const t = template('pick-roll'), p = team('3v3'), plan = complete(t, p);
  const next = swapRoleMembers(plan, t.roles[0].id, t.roles[1].id, t, p);
  assert.equal(next.assignments[0].memberId, plan.assignments[1].memberId);
  assert.equal(next.assignments[1].memberId, plan.assignments[0].memberId);
  assert.equal(plan.assignments[0].memberId, p.players[0].id);
  assert.equal(getRolePlanState(next, t, p).ready, true);
  assert.throws(() => swapRoleMembers(createRolePlan(t, p), t.roles[0].id, t.roles[1].id, t, p));
  assert.throws(() => swapRoleMembers(plan, t.roles[0].id, t.roles[0].id, t, p));
});

test('malformed plans reject duplicated/missing roles, invalid status and bindings on unconfirmed states', () => {
  const t = template('pick-roll'), p = team('3v3'), original = createRolePlan(t, p);
  for (const mutate of [
    plan => plan.assignments.pop(),
    plan => { plan.assignments[1].roleId = plan.assignments[0].roleId; },
    plan => { plan.assignments[0].roleId = 'absent'; },
    plan => { plan.assignments[0].status = 'general'; },
    plan => { plan.assignments[0].memberId = p.players[0].id; },
    plan => { plan.assignments[0].status = 'missing'; plan.assignments[0].memberId = p.players[0].id; }
  ]) {
    const value = clone(original); mutate(value);
    assert.throws(() => validateRolePlan(value, t, p));
    assert.equal(getRolePlanState(value, t, p).needsReview, true);
  }
});

test('alternative suggestions avoid missing actions, preserve same team size/type and never preconfirm a new play', () => {
  const t = template('pick-roll'), p = team('3v3');
  const alternatives = suggestRoleAlternatives(t, 'attack-2', templates);
  assert.ok(alternatives.some(other => other.id === 'give-go'));
  for (const other of alternatives) {
    assert.equal(other.mode, t.mode); assert.equal(other.kind, t.kind); assert.notEqual(other.id, t.id);
    assert.ok(!other.roles.some(role => role.actionIds.includes('stationary-screen') || role.actionIds.includes('roll-finish')));
    assert.equal(getRolePlanState(null, other, p).confirmedCount, 0);
  }
  assert.throws(() => suggestRoleAlternatives(t, 'unknown-role', templates));
});

test('multi-stage duties preserve changes of responsibility rather than first-frame positions', () => {
  const second = template('screen-the-screener').roles.find(role => role.playerId === 'attack-2');
  assert.ok(second.actionIds.includes('stationary-screen') && second.actionIds.includes('use-offball-screen'));
  assert.match(second.task, /先.*再/);
  const originalDefender = template('defense-4v4-help-rotation').roles.find(role => role.playerId === 'defense-1');
  assert.match(originalDefender.task, /弧顶.*底角/);
});
