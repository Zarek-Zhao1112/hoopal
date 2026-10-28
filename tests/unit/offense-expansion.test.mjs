import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { templates } from '../../shared/templates.js';
import { offenseExpansion } from '../../data/tactics/offense-expansion.js';
import { interpolateBoards, ballPosition, validatePlay } from '../../shared/engine.js';

const ids = ['post-split', 'slip-screen', 'offball-flare', 'hammer', 'zoom-handoff', 'screen-the-screener'];
const originalIds = [
  'pick-roll', 'give-go', 'back-screen', 'four-out-cut', 'dribble-handoff', 'pick-pop',
  'baseline-backdoor', 'four-spread-pick-roll', 'staggered-screens', 'high-low', 'drive-corner-kick', 'spain-pick-roll',
  'defense-3v3-man-to-man', 'defense-3v3-zone', 'defense-3v3-trap', 'defense-3v3-help-rotation',
  'defense-4v4-man-to-man', 'defense-4v4-zone', 'defense-4v4-trap', 'defense-4v4-help-rotation',
];
const additions = templates.filter(template => ids.includes(template.id));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const player = (board, id) => board.players.find(entry => entry.id === id);
const route = (board, type, id) => board.paths.find(path => path.type === type && path.playerId === id);
const framesFor = id => templates.find(template => template.id === id).build().frames;
const transfer = (frames, from, to) => frames.findIndex((frame, index) => frames[index + 1] && frame.ball.holderId === from && frames[index + 1].ball.holderId === to);

test('the six approved sources append after the unchanged twenty IDs and form nine offense plus four defense per mode', () => {
  assert.equal(templates.length, 26);
  assert.deepEqual(templates.slice(0, 20).map(template => template.id), originalIds);
  assert.deepEqual(templates.slice(20).map(template => template.id), ids);
  assert.deepEqual(offenseExpansion.map(definition => definition.id), ids);
  for (const mode of ['3v3', '4v4']) {
    assert.equal(templates.filter(template => template.mode === mode && template.kind === 'offense').length, 9);
    assert.equal(templates.filter(template => template.mode === mode && template.kind === 'defense').length, 4);
  }
  assert.deepEqual(additions.map(template => template.build().frames.length), [7, 6, 7, 7, 8, 8]);
  for (const template of additions) {
    const play = template.build();
    assert.equal(template.kind, 'offense');
    assert.deepEqual(Object.keys(play).sort(), ['frameIndex', 'frames', 'id', 'mode', 'title']);
    assert.deepEqual(validatePlay(JSON.parse(JSON.stringify(play))), play);
    assert.equal(play.frames[0].players.length, template.mode === '3v3' ? 6 : 8);
    assert.ok(play.frames.every(frame => frame.note.length >= 30));
    assert.equal(play.frames.at(-1).paths.length, 0);
  }
});

test('the other five additions retain HC-026 snapshots while HC-042 separately verifies the authorized post-split correction', () => {
  // Digests captured from the independently reviewed HC-026 output. Generated
  // route IDs differ between compilers, so only those IDs are omitted.
  const approved = {
    'slip-screen': 'e1ec93b39f708d34db4109468472c8ed5e964af349aa19ab7c3bfc8272b01b03',
    'offball-flare': 'b691e1fb42523701014cc9b73881d16b78f846ba5da9fbc39e150f0f14267713',
    hammer: '26923a96d1841becd295a4c4ab547503bea1368b6fec19068e727ec7c317eaa8',
    'zoom-handoff': '34f06520bffa48ba709897b2d5abb4b019fee588274c64eff7b4e54a4049c321',
    'screen-the-screener': '2f390ba8c468e73b0dffdb9d94878ecec8de394776195b34d191f3ce6c4c8ecb',
  };
  for (const template of additions.filter(template => template.id !== 'post-split')) {
    const frames = template.build().frames.map(frame => ({ ...frame, paths: frame.paths.map(({ id, ...path }) => path) }));
    const digest = createHash('sha256').update(JSON.stringify(frames)).digest('hex');
    assert.equal(digest, approved[template.id], `${template.id}: approved positions, notes, routes and possession changed`);
  }
});

const segmentGap = (point, from, to) => {
  const dx = to.x - from.x, dy = to.y - from.y, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((point.x - from.x) * dx + (point.y - from.y) * dy) / length)) : 0;
  return distance(point, { x: from.x + dx * t, y: from.y + dy * t });
};
function assertPostDefense(frames) {
  const basket = { x: 500, y: 140 }, screenIndex = frames.findIndex(frame => route(frame, 'screen', 'attack-1'));
  for (let i = 0; i < frames.length - 1; i++) for (let k = 0; k <= 1000; k++) {
    const mid = interpolateBoards(frames[i], frames[i + 1], k / 1000), a1 = player(mid, 'attack-1'), d1 = player(mid, 'defense-1');
    assert.ok(distance(a1, d1) <= 115, 'D1 follows one at a nearby marking distance, including the exit');
    assert.ok((d1.x - a1.x) * (basket.x - a1.x) + (d1.y - a1.y) * (basket.y - a1.y) > 0, 'D1 stays on the basket side instead of retreating away');
  }
  const from = frames[screenIndex], to = frames[screenIndex + 1], screener = player(from, 'attack-1'), d2Start = player(from, 'defense-2');
  const chase = route(from, 'run', 'defense-2');
  assert.ok(chase && chase.points.length >= 3, 'D2 needs an explicit bend around the screen, not a reference straight line');
  assert.equal(from.paths.filter(path => path.playerId === 'defense-2' && path.type === 'run').length, 1, 'an automatic straight line must not compete with the explicit chase');
  assert.ok(distance(d2Start, player(from, 'attack-2')) <= 115, 'D2 starts with his own receiver');
  assert.ok(distance(d2Start, screener) > 120, 'D2 first has to approach the screener');
  let closest = Infinity, blockedPursuit = false;
  for (let k = 0; k <= 1000; k++) {
    const mid = interpolateBoards(from, to, k / 1000), d2 = player(mid, 'defense-2'), a2 = player(mid, 'attack-2'), gap = distance(d2, screener);
    closest = Math.min(closest, gap);
    if (gap <= 75 && distance(a2, screener) <= 115 && segmentGap(screener, d2, a2) < 45) blockedPursuit = true;
  }
  assert.ok(closest >= 55 && closest <= 70, 'D2 actually reaches the screening barrier without overlapping it');
  assert.ok(blockedPursuit, 'the set screener obstructs a direct D2-to-receiver pursuit, explaining the detour');
  assert.ok(distance(player(to, 'defense-2'), player(to, 'attack-2')) <= 90, 'D2 recovers beside/behind two after the screen instead of running away');
  assert.ok(player(to, 'defense-2').y < d2Start.y - 100, 'D2 follows the cut toward the basket');
  for (const frame of frames.slice(screenIndex + 1)) assert.ok(distance(player(frame, 'defense-2'), player(frame, 'attack-2')) <= 100, 'D2 retains his original matchup after the catch');
  for (const frame of frames) {
    const a3 = player(frame, 'attack-3'), d3 = player(frame, 'defense-3');
    assert.ok(distance(a3, d3) <= 115 && distance(d3, basket) < distance(a3, basket), 'D3 maintains basket-side post defense rather than withdrawing for a pass');
  }
  const before = player(from, 'defense-3'), help = player(to, 'defense-3'), recovered = player(frames[screenIndex + 2], 'defense-3');
  assert.ok(distance(before, help) >= 25 && distance(before, help) <= 60, 'D3 takes a limited help step toward the cutter');
  assert.ok(distance(help, player(to, 'attack-2')) < distance(before, player(to, 'attack-2')) - 15, 'the help step addresses the actual receiver');
  assert.ok(distance(before, recovered) <= 20, 'D3 recovers to the original low-post matchup after the pass');
}

test('post split shows fixed marking, an obstructed pursuit and recovery, not defenders vacating the play', () => {
  const frames = framesFor('post-split');
  assertPostDefense(frames);
  const index = frames.findIndex(frame => route(frame, 'screen', 'attack-1')), from = frames[index], to = frames[index + 1];
  const chase = route(from, 'run', 'defense-2'), lengths = chase.points.slice(1).map((point, i) => distance(point, chase.points[i])), total = lengths.reduce((sum, value) => sum + value, 0);
  let travelled = 0;
  for (let i = 1; i < chase.points.length; i++) {
    travelled += lengths[i - 1];
    assert.ok(distance(player(interpolateBoards(from, to, travelled / total), 'defense-2'), chase.points[i]) < .001, 'real engine traverses every explicit defensive bend');
  }
  const mid = player(interpolateBoards(from, to, .5), 'defense-2'), straight = { x: (player(from, 'defense-2').x + player(to, 'defense-2').x) / 2, y: (player(from, 'defense-2').y + player(to, 'defense-2').y) / 2 };
  assert.ok(distance(mid, straight) > 30, 'the visible run annotation changes the actual motion, not just the arrow');
});

test('post-split semantics reject the former retreating D1 and non-pursuing D2 independently', () => {
  const original = { 'defense-1': [[180,530],[180,530],[470,620],[470,620],[470,620],[470,620],[470,620]], 'defense-2': [[650,410],[585,405],[490,375],[540,375],[540,375],[540,375],[540,375]] };
  for (const [id, positions] of Object.entries(original)) {
    const frames = structuredClone(framesFor('post-split'));
    frames.forEach((frame, index) => { const actor = player(frame, id); [actor.x, actor.y] = positions[index]; frame.paths = frame.paths.filter(path => path.playerId !== id); });
    frames.slice(0, -1).forEach((frame, index) => { const from = player(frame, id), to = player(frames[index + 1], id); if (distance(from, to)) frame.paths.push({ id: 'legacy-reference', type: 'run', playerId: id, points: [{ x: from.x, y: from.y }, { x: to.x, y: to.y }] }); });
    assert.throws(() => assertPostDefense(frames), new RegExp(id === 'defense-1' ? 'D1' : 'D2'), `${id}: the old visible failure must fail the new behavioral contract`);
  }
});

test('every moving actor and possession handover has an accurate outgoing annotation, while used screeners stay set', () => {
  let passes = 0, screens = 0;
  for (const template of additions) {
    const frames = template.build().frames;
    for (let index = 0; index < frames.length - 1; index++) {
      const from = frames[index], to = frames[index + 1], label = `${template.id} step ${index + 1}`;
      const passing = from.ball.holderId !== to.ball.holderId;
      assert.equal(from.paths.filter(path => path.type === 'pass').length, passing ? 1 : 0, label);
      for (const path of from.paths) {
        const actor = player(from, path.playerId), next = player(to, path.playerId);
        assert.ok(actor && next, `${label}: route actor exists`);
        if (['run', 'dribble'].includes(path.type)) {
          assert.ok(distance(path.points[0], actor) < .001, `${label}: stale route start`);
          assert.ok(distance(path.points.at(-1), next) < .001, `${label}: route misses next position`);
          if (path.type === 'dribble') {
            assert.equal(path.playerId, from.ball.holderId, `${label}: dribbler owns ball`);
            assert.equal(to.ball.holderId, from.ball.holderId, `${label}: drive is separate from transfer`);
          }
        }
        if (path.type === 'screen') {
          screens++;
          assert.equal(distance(actor, next), 0, `${label}: screener must remain stationary`);
          assert.ok(distance(path.points[0], actor) < .001, `${label}: screen marker starts at screener`);
        }
        if (path.type === 'pass') {
          passes++;
          assert.equal(path.playerId, from.ball.holderId, `${label}: passer owns ball`);
          assert.ok(distance(path.points[0], ballPosition(from)) < .001 && distance(path.points.at(-1), ballPosition(to)) < .001, `${label}: exact ball endpoints`);
        }
      }
      for (const actor of from.players) {
        if (distance(actor, player(to, actor.id)) > .001) assert.ok(route(from, 'run', actor.id) || route(from, 'dribble', actor.id), `${label}: ${actor.id} moves without a matching route`);
      }
    }
  }
  assert.equal(passes, 8);
  assert.equal(screens, 7);
});

test('all 37 production transitions keep real interpolated markers and ball lanes clear at .001 intervals', () => {
  const minimum = { players: Infinity, ballDefense: Infinity, ballOtherAttack: Infinity };
  let transitions = 0;
  for (const template of additions) {
    const frames = template.build().frames;
    for (let index = 0; index < frames.length - 1; index++) {
      transitions++;
      const from = frames[index], to = frames[index + 1], passing = from.ball.holderId !== to.ball.holderId;
      for (let k = 0; k <= 1000; k++) {
        const t = k / 1000, mid = interpolateBoards(from, to, t), ball = ballPosition(mid);
        const label = `${template.id} step ${index + 1} at ${t}`;
        for (const point of [...mid.players, ball]) {
          assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `${label}: invalid coordinate`);
          assert.ok(point.x >= 70 && point.x <= 930 && point.y >= 70 && point.y <= 730, `${label}: outside court`);
        }
        for (let a = 0; a < mid.players.length; a++) {
          const actor = mid.players[a];
          for (const other of mid.players.slice(a + 1)) {
            const gap = distance(actor, other);
            minimum.players = Math.min(minimum.players, gap);
            assert.ok(gap >= 48, `${label}: ${actor.id}/${other.id} overlap (${gap})`);
          }
          if (actor.team === 'defense') {
            const gap = distance(ball, actor);
            minimum.ballDefense = Math.min(minimum.ballDefense, gap);
            assert.ok(gap >= 40, `${label}: ball enters ${actor.id} (${gap})`);
          }
          if (passing && actor.team === 'attack' && ![from.ball.holderId, to.ball.holderId].includes(actor.id)) {
            const gap = distance(ball, actor);
            minimum.ballOtherAttack = Math.min(minimum.ballOtherAttack, gap);
            assert.ok(gap >= 36, `${label}: pass crosses uninvolved ${actor.id} (${gap})`);
          }
        }
        if (!passing) {
          const expected = ballPosition({ players: mid.players, ball: from.ball });
          assert.equal(ball.x, expected.x, `${label}: retained possession follows route`);
          assert.equal(ball.y, expected.y, `${label}: retained possession follows route`);
        }
      }
    }
  }
  assert.equal(transitions, 37);
  assert.ok(minimum.players > 55 && minimum.ballDefense > 49 && minimum.ballOtherAttack > 125, 'approved visible margins are retained');
});

test('post split uses the low-post passer, slip omits an established screen, and flare sends the receiver away from the ball', () => {
  const post = framesFor('post-split');
  const entry = transfer(post, 'attack-1', 'attack-3');
  const split = post.findIndex(frame => route(frame, 'screen', 'attack-1') && route(frame, 'run', 'attack-2'));
  const returnPass = transfer(post, 'attack-3', 'attack-2');
  assert.ok(entry >= 0 && split > entry && returnPass > split);
  assert.equal(post[split].ball.holderId, 'attack-3');
  assert.equal(post.at(-1).ball.holderId, 'attack-2');
  const slip = framesFor('slip-screen');
  assert.ok(slip.every(frame => frame.paths.every(path => path.type !== 'screen')));
  const slipPass = transfer(slip, 'attack-1', 'attack-2');
  assert.ok(slipPass > 0 && route(slip[slipPass - 1], 'run', 'attack-2'));
  assert.ok(player(slip[slipPass], 'attack-2').y < player(slip[0], 'attack-2').y - 100);
  const flare = framesFor('offball-flare');
  const flareIndex = flare.findIndex(frame => route(frame, 'screen', 'attack-3') && route(frame, 'run', 'attack-2'));
  assert.ok(flareIndex >= 0);
  const from = flare[flareIndex], to = flare[flareIndex + 1];
  assert.ok(distance(player(to, 'attack-2'), player(from, 'attack-1')) > distance(player(from, 'attack-2'), player(from, 'attack-1')) + 150);
  assert.equal(distance(player(from, 'attack-3'), player(to, 'attack-3')), 0);
  assert.equal(flare.at(-1).ball.holderId, 'attack-2');
});

test('Hammer couples baseline penetration to a screened weak-side corner instead of a same-side kickout', () => {
  const frames = framesFor('hammer');
  const drive = route(frames[0], 'dribble', 'attack-1');
  assert.ok(drive && Math.min(...drive.points.map(point => point.y)) <= 220);
  const screenIndex = frames.findIndex(frame => route(frame, 'screen', 'attack-3') && route(frame, 'run', 'attack-2'));
  const passIndex = transfer(frames, 'attack-1', 'attack-2');
  assert.ok(screenIndex >= 0 && passIndex > screenIndex);
  const board = frames[passIndex];
  assert.ok(player(board, 'attack-1').x > 700 && player(board, 'attack-2').x < 200 && player(board, 'attack-2').y < 250);
  assert.equal(frames.at(-1).ball.holderId, 'attack-2');
});

test('Zoom separates down-screen, stationary close handoff and drive before the final corner receiver four gets the ball', () => {
  const frames = framesFor('zoom-handoff');
  const down = frames.findIndex(frame => route(frame, 'screen', 'attack-3') && route(frame, 'run', 'attack-2'));
  const handoff = transfer(frames, 'attack-1', 'attack-2');
  const drive = frames.findIndex(frame => route(frame, 'screen', 'attack-1') && route(frame, 'dribble', 'attack-2'));
  const kick = transfer(frames, 'attack-2', 'attack-4');
  assert.ok(down >= 0 && handoff > down && drive > handoff && kick > drive);
  assert.ok(distance(player(frames[handoff], 'attack-1'), player(frames[handoff], 'attack-2')) <= 75);
  for (const id of ['attack-1', 'attack-2']) assert.equal(distance(player(frames[handoff], id), player(frames[handoff + 1], id)), 0);
  assert.equal(frames.at(-1).ball.holderId, 'attack-4', '4 is the final corner catch-and-shoot role');
});

test('screen-the-screener changes role two from setting the first screen to receiving the second', () => {
  const frames = framesFor('screen-the-screener');
  const first = frames.findIndex(frame => route(frame, 'screen', 'attack-2') && route(frame, 'run', 'attack-3'));
  const second = frames.findIndex(frame => route(frame, 'screen', 'attack-4') && route(frame, 'run', 'attack-2'));
  const pass = transfer(frames, 'attack-1', 'attack-2');
  assert.ok(first >= 0 && second > first && pass > second);
  assert.ok(distance(player(frames[first + 1], 'attack-3'), { x: 500, y: 140 }) < distance(player(frames[first], 'attack-3'), { x: 500, y: 140 }) - 150);
  assert.equal(frames.at(-1).ball.holderId, 'attack-2');
  assert.ok(frames[pass + 1].paths.some(path => path.type === 'run' && path.playerId === 'attack-4'), 'second screener releases only after use');
});
