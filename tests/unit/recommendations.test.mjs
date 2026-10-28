import test from 'node:test';
import assert from 'node:assert/strict';
import { createLineup } from '../../shared/lineups.js';
import { recommendLineup } from '../../shared/recommendations.js';
import { templates } from '../../shared/templates.js';
import { offenseRules } from '../../data/recommendations/offense.js';

function lineup(strengths, options = {}) {
  const p = createLineup(strengths.length === 3 ? '3v3' : '4v4', { id: 'example' });
  p.players.forEach((player, i) => Object.assign(player, { id: `member-${i}`, name: '', height: 'medium', build: 'medium', mobility: 'average', strengths: strengths[i], ...options }));
  return p;
}
const ids = result => result.recommendations.map(item => item.templateId);
const roles = recommendation => Object.fromEntries(recommendation.assignments.map(item => [item.role, item.playerId]));
const textOf = result => JSON.stringify(result);
const get = (result, id) => { const item = result.recommendations.find(item => item.templateId === id); assert.ok(item, `${id} must be a candidate`); return item; };

test('incomplete profile has no formal recommendations; all-general remains an explained conditional practice choice', () => {
  assert.equal(recommendLineup(createLineup('3v3')).ready, false);
  assert.deepEqual(recommendLineup(createLineup('4v4')).recommendations, []);
  for (const count of [3, 4]) {
    const result = recommendLineup(lineup(Array.from({ length: count }, () => [])));
    assert.equal(result.ready, true);
    assert.equal(result.recommendations.length, 3);
    assert.ok(result.recommendations.every(item => item.fit === 'conditional'));
    assert.ok(result.summary.some(line => line.includes('一般')));
    assert.ok(result.summary.some(line => line.includes('同型')));
    assert.ok(['give-go', 'four-out-cut'].includes(result.recommendations[0].templateId));
  }
});

test('candidates are distinct same-mode builtins, role assignments are bijective, input and animations remain unchanged', () => {
  const beforeTemplates = JSON.stringify(templates.map(item => item.build()));
  for (const count of [3, 4]) {
    const p = lineup(Array.from({ length: count }, () => ['passing', 'screening', 'finishing']));
    const snapshot = structuredClone(p), result = recommendLineup(p);
    assert.equal(new Set(ids(result)).size, result.recommendations.length);
    for (const item of result.recommendations) {
      const template = templates.find(t => t.id === item.templateId);
      assert.equal(template.kind, 'offense'); assert.equal(template.mode, p.mode);
      assert.deepEqual(item.assignments.map(a => a.role), Array.from({ length: count }, (_, i) => i + 1));
      assert.deepEqual(item.assignments.map(a => a.playerId).sort(), p.players.map(v => v.id).sort());
      assert.ok(item.assignments.every(a => a.task.length > 6));
    }
    assert.deepEqual(p, snapshot);
  }
  // Plays have generated IDs, so compare only stable animation data, not createPlay identity.
  const after = templates.map(item => item.build()).map(({ frames, mode, title }) => ({ frames, mode, title }));
  const before = JSON.parse(beforeTemplates).map(({ frames, mode, title }) => ({ frames, mode, title }));
  assert.deepEqual(after, before);
});

test('handoff has its driver at role 2 and giver/screener/pop shooter at role 1', () => {
  const result = recommendLineup(lineup([['passing', 'screening', 'shooting'], ['handling', 'driving', 'passing'], ['shooting']]));
  const dho = get(result, 'dribble-handoff');
  assert.deepEqual(roles(dho), { 1: 'member-0', 2: 'member-1', 3: 'member-2' });
  assert.match(dho.assignments[0].task, /交球.*掩护.*外弹/);
  assert.match(dho.assignments[1].task, /突破.*回传/);
  assert.equal(dho.fit, 'recommended');
});

test('high-low puts strongest high-post passing at 4 and low-post finishing at 3, independent of height', () => {
  const p = lineup([['passing'], ['shooting'], ['finishing'], ['passing', 'handling']]);
  p.players[2].height = 'tall'; p.players[3].height = 'short';
  const high = get(recommendLineup(p), 'high-low');
  assert.equal(roles(high)[4], 'member-3'); assert.equal(roles(high)[3], 'member-2');
  assert.match(high.assignments[3].task, /策应.*内传/);
  assert.match(high.assignments[2].task, /终结/);
});

test('drive and corner kick uses the actual role 3 driver and role 4 receiving shooter', () => {
  const result = recommendLineup(lineup([['passing'], ['shooting'], ['handling', 'driving', 'passing'], ['shooting']]));
  const kick = get(result, 'drive-corner-kick');
  assert.equal(result.recommendations[0].templateId, 'drive-corner-kick');
  assert.equal(roles(kick)[3], 'member-2');
  assert.equal(roles(kick)[4], 'member-3');
  assert.match(kick.assignments[2].task, /突破.*分/);
  assert.match(kick.assignments[3].task, /底角.*投射/);
});

test('Spain and stagger retain both screens and actual secondary passing or shooting duties', () => {
  const spain = get(recommendLineup(lineup([['handling', 'driving', 'passing'], ['screening', 'shooting'], ['shooting'], ['screening', 'finishing']])), 'spain-pick-roll');
  assert.equal(roles(spain)[2], 'member-1'); assert.equal(roles(spain)[4], 'member-3');
  assert.match(spain.assignments[1].task, /背掩护.*外弹/);
  assert.match(spain.assignments[3].task, /主掩护.*顺下/);
  const stagger = get(recommendLineup(lineup([['passing'], ['shooting', 'passing'], ['screening', 'shooting'], ['screening', 'finishing']])), 'staggered-screens');
  assert.equal(roles(stagger)[2], 'member-1');
  assert.match(stagger.assignments[1].task, /接投.*传/);
});

test('no declared shooting strength is distinct from an explicit shooting weakness and lowers shooting-dependent choices', () => {
  const p = lineup([['handling', 'driving', 'passing'], ['screening', 'finishing'], ['passing']]);
  const neutral = recommendLineup(p);
  assert.ok(!ids(neutral).includes('pick-pop'));
  assert.match(neutral.summary.find(line => line.startsWith('投射')), /没有标注.*一般/);
  assert.doesNotMatch(textOf(neutral), /不会投射|不具备投射/);
  p.players.forEach(player => player.weaknesses = ['shooting']);
  const weak = recommendLineup(p);
  assert.match(weak.summary.find(line => line.startsWith('投射')), /明确标为弱项/);
  for (const item of weak.recommendations) {
    const usesShooting = offenseRules.find(rule => rule.templateId === item.templateId).roles.some(role => role.weights.shooting);
    if (usesShooting) assert.ok(item.cautions.some(line => /投射.*弱项/.test(line)), `${item.templateId}: shooting weakness must remain explicit`);
    else assert.ok(!item.cautions.some(line => /投射.*弱项/.test(line)), `${item.templateId}: do not invent a shooting duty`);
  }
  assert.ok(weak.recommendations.every(item => item.fit === 'conditional'));
});

test('a new weakness actually changes responsibilities or ranking instead of only changing explanatory text', () => {
  const p = lineup([['passing'], ['finishing'], ['shooting']]);
  const before = recommendLineup(p);
  assert.equal(roles(get(before, 'give-go'))[2], 'member-0');
  p.players[0].strengths = []; p.players[0].weaknesses = ['passing'];
  const after = recommendLineup(p);
  assert.notDeepEqual(after.recommendations.map(item => [item.templateId, roles(item)]), before.recommendations.map(item => [item.templateId, roles(item)]));
  const afterGiveGo = get(after, 'give-go');
  assert.notEqual(roles(afterGiveGo)[2], 'member-0');
  assert.equal(afterGiveGo.fit, 'conditional');
});

test('slow teams receive visible mobility burdens and fewer continuous movement demands', () => {
  const p = lineup([[], [], [], []]);
  const average = recommendLineup(p);
  p.players.forEach(player => player.mobility = 'slow');
  const slow = recommendLineup(p);
  assert.notDeepEqual(ids(slow), ids(average));
  assert.equal(slow.recommendations[0].templateId, 'high-low');
  assert.ok(slow.recommendations.every(item => item.fit === 'conditional' && item.cautions.some(line => line.includes('偏慢'))));
  assert.doesNotMatch(textOf(slow), /速度优势/);
});

test('one all-round member cannot hide remaining secondary-organizer deficits', () => {
  const p = lineup([['handling', 'driving', 'passing'], [], [], []]);
  p.players.slice(1).forEach(player => player.weaknesses = ['handling', 'passing']);
  const result = recommendLineup(p);
  assert.ok(result.summary.some(line => line.includes('第二组织点')));
  for (const item of result.recommendations) {
    assert.equal(item.fit, 'conditional');
    assert.equal(item.assignments.filter(a => a.playerId === 'member-0').length, 1);
    assert.ok(item.cautions.some(line => /弱项|未标优势/.test(line)));
  }
});

test('tall strong tags never substitute for weak screening or finishing', () => {
  const p = lineup([['handling', 'driving', 'passing'], ['screening', 'finishing'], ['shooting']]);
  p.players[0].height = 'tall'; p.players[0].build = 'strong'; p.players[0].weaknesses = ['screening', 'finishing'];
  p.players[1].height = 'short'; p.players[1].build = 'slim';
  const result = recommendLineup(p), pick = get(result, 'pick-roll');
  assert.equal(roles(pick)[2], 'member-1');
  assert.ok(pick.reasons.every(line => !line.includes('队员 A') || !/掩护、篮下终结擅长/.test(line)));
  assert.ok(result.summary.some(line => line.includes('不代表已具备')));
});

test('stable IDs keep rankings and assignments unchanged across rename, jersey/theme edits and member order changes', () => {
  const p = lineup([['handling', 'driving', 'passing'], ['screening', 'shooting'], ['shooting'], ['screening', 'finishing']]);
  const signature = result => result.recommendations.map(item => [item.templateId, item.fit, roles(item)]);
  const baseline = signature(recommendLineup(p));
  p.name = '别的队名'; p.color = 'blue'; p.crest = 'shield'; p.revision++;
  p.players.forEach((player, i) => { player.name = '相同昵称'; player.number = 99 - i; });
  assert.deepEqual(signature(recommendLineup(p)), baseline);
  p.players.reverse();
  assert.deepEqual(signature(recommendLineup(p)), baseline);
  const same = lineup([[], [], []], { mobility: 'agile' });
  assert.ok(recommendLineup(same).recommendations.every(item => item.fit === 'conditional'));
  const before = signature(recommendLineup(same)); same.players.reverse();
  assert.deepEqual(signature(recommendLineup(same)), before);
});
