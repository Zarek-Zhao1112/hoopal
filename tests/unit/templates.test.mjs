import test from 'node:test';
import assert from 'node:assert/strict';
import { templates as allTemplates } from '../../shared/templates.js';
import { validatePlay, interpolateBoards, ballPosition } from '../../shared/engine.js';

const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const player = (board, id) => board.players.find(p => p.id === id);
const templates = allTemplates.filter(template => template.kind === 'offense');
const legacyIds = ['pick-roll', 'give-go', 'back-screen', 'four-out-cut'];
const additions = templates.filter(t => [
  'dribble-handoff', 'pick-pop', 'baseline-backdoor', 'four-spread-pick-roll',
  'staggered-screens', 'high-low', 'drive-corner-kick', 'spain-pick-roll',
].includes(t.id));

test('library offers nine distinct offense tactics per supported mode and keeps metadata out of Play', () => {
  assert.equal(templates.length, 18);
  assert.equal(new Set(templates.map(t => t.id)).size, 18);
  assert.equal(new Set(templates.map(t => t.title)).size, 18);
  for (const mode of ['3v3', '4v4']) assert.equal(templates.filter(t => t.mode === mode).length, 9);
  for (const template of templates) {
    assert.match(template.category, /^[\p{Script=Han}]+$/u);
    assert.ok(['基础', '进阶'].includes(template.difficulty));
    const play = template.build();
    assert.equal(play.mode, template.mode);
    assert.equal(play.title, template.title);
    assert.deepEqual(Object.keys(play).sort(), ['frameIndex','frames','id','mode','title']);
    assert.deepEqual(validatePlay(JSON.parse(JSON.stringify(play))), play);
  }
});

test('original entries retain order, names, four steps and starting positions', () => {
  assert.deepEqual(templates.slice(0, 4).map(t => t.id), legacyIds);
  assert.deepEqual(templates.slice(0, 4).map(t => t.title), ['高位挡拆','传切配合','无球背掩护','四人传切']);
  for (const template of templates.slice(0, 4)) {
    const play = template.build();
    assert.equal(play.frames.length, 4);
    assert.equal(player(play.frames[0], 'attack-1').x, 500);
    assert.equal(player(play.frames[0], 'attack-1').y, 590);
    assert.equal(play.frames[0].ball.holderId, 'attack-1');
  }
});

test('builds and adjacent frames are independent, including nested route points', () => {
  for (const template of templates) {
    const first = template.build(), second = template.build();
    assert.notEqual(first.id, second.id);
    const untouchedSecond = structuredClone(second);
    const untouchedNextFrame = structuredClone(first.frames[1]);
    first.frames[0].players[0].x = 900;
    first.frames[0].note = '用户编辑';
    first.frames[0].paths[0].points[0].x = 900;
    assert.deepEqual(second, untouchedSecond);
    assert.deepEqual(first.frames[1], untouchedNextFrame);
    const third = template.build();
    assert.deepEqual(third.frames, second.frames);
  }
});

test('the original eight additions retain six purposeful steps, readable notes and separated attackers', () => {
  assert.equal(additions.length, 8);
  for (const template of additions) {
    const play = template.build();
    assert.ok(play.frames.length >= 5 && play.frames.length <= 6, template.id);
    for (let index = 0; index < play.frames.length; index++) {
      const board = play.frames[index];
      assert.ok(board.note.length >= 20, `${template.id}: step ${index + 1} needs explanation`);
      const attack = board.players.filter(p => p.team === 'attack');
      for (let a = 0; a < attack.length; a++) {
        for (let b = a + 1; b < attack.length; b++) assert.ok(distance(attack[a], attack[b]) >= 48, `${template.id}: overlapping attacking positions`);
      }
      const next = play.frames[index + 1];
      if (!next) { assert.equal(board.paths.length, 0, 'last step has no unresolved outgoing actions'); continue; }
      const moves = attack.some(p => distance(p, player(next, p.id)) > 12);
      assert.ok(moves || board.ball.holderId !== next.ball.holderId, `${template.id}: empty transition at ${index + 1}`);
    }
  }
});

test('all movement annotations connect the named player to the following frame', () => {
  for (const template of templates) {
    const { frames } = template.build();
    for (let index = 0; index < frames.length - 1; index++) {
      const from = frames[index], to = frames[index + 1];
      for (const route of from.paths.filter(p => p.type === 'run' || p.type === 'dribble')) {
        const start = player(from, route.playerId), end = player(to, route.playerId);
        const context = `${template.id} step ${index + 1} ${route.type}`;
        assert.ok(start && end, `${context}: missing actor`);
        assert.ok(distance(route.points[0], start) < 45, `${context}: wrong start`);
        assert.ok(distance(route.points.at(-1), end) < 45, `${context}: wrong destination`);
        const minimum = route.playerId.startsWith('defense-') ? .001 : 12;
        assert.ok(distance(start, end) > minimum, `${context}: no movement`);
        if (route.type === 'dribble') {
          assert.equal(from.ball.holderId, route.playerId, `${context}: actor does not hold ball`);
          assert.equal(to.ball.holderId, route.playerId, `${context}: dribble cannot also transfer possession`);
        }
      }
    }
  }
});

test('each pass is an actual possession transfer and each transfer has a matching pass', () => {
  for (const template of templates) {
    const { frames } = template.build();
    let transfers = 0;
    for (let index = 0; index < frames.length - 1; index++) {
      const from = frames[index], to = frames[index + 1];
      const passes = from.paths.filter(p => p.type === 'pass');
      const changes = from.ball.holderId !== to.ball.holderId;
      assert.equal(passes.length, changes ? 1 : 0, `${template.id} step ${index + 1}: mismatched pass/possession`);
      if (changes) transfers++;
      for (const route of passes) {
        assert.equal(route.playerId, from.ball.holderId, 'pass belongs to actual passer');
        assert.ok(distance(route.points[0], ballPosition(from)) < 60, `${template.id}: pass starts at stale ball position`);
        assert.ok(distance(route.points.at(-1), ballPosition(to)) < 60, `${template.id}: pass does not reach receiver`);
      }
    }
    assert.ok(transfers >= 1, `${template.id}: no possession transfer`);
  }
});

test('all examples animate without invalid coordinates or detached retained possession', () => {
  for (const template of templates) {
    const { frames } = template.build();
    for (let index = 0; index < frames.length - 1; index++) {
      const from = frames[index], to = frames[index + 1];
      for (const t of [0, 0.1, 0.35, 0.5, 0.9, 1]) {
        const mid = interpolateBoards(from, to, t);
        for (const p of [...mid.players, ballPosition(mid)]) {
          assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${template.id}: invalid intermediate coordinate`);
          assert.ok(p.x >= 70 && p.x <= 930 && p.y >= 70 && p.y <= 730, `${template.id}: animation escapes court`);
        }
        if (from.ball.holderId === to.ball.holderId && t > 0 && t < 1) {
          const expected = ballPosition({players:mid.players,ball:from.ball});
          const actual = ballPosition(mid);
          assert.equal(actual.x, expected.x, `${template.id}: ball must follow its retained holder`);
          assert.equal(actual.y, expected.y, `${template.id}: ball must follow its retained holder`);
        }
      }
    }
  }
});

test('new pass animations keep the ball clear of moving defensive markers', () => {
  // Ball radius 12 + player radius 24, plus a small visible margin for ordinary
  // passes. Close handoff contact is assessed separately from a passing lane.
  for (const template of additions) {
    const { frames } = template.build();
    for (let index = 0; index < frames.length - 1; index++) {
      const from = frames[index], to = frames[index + 1];
      if (!from.paths.some(p => p.type === 'pass')) continue;
      const isHandoff = template.id === 'dribble-handoff'
        && from.ball.holderId === 'attack-1' && to.ball.holderId === 'attack-2';
      const minimum = isHandoff ? 36 : 40;
      for (let sample = 0; sample <= 200; sample++) {
        const t = sample / 200;
        const animated = interpolateBoards(from, to, t);
        const ball = ballPosition(animated);
        for (const defender of animated.players.filter(p => p.team === 'defense')) {
          const separation = distance(ball, defender);
          assert.ok(separation >= minimum, `${template.id} step ${index + 1} at ${t}: ball overlaps ${defender.id} (${separation.toFixed(2)} < ${minimum})`);
        }
      }
    }
  }
});

test('handoff transfers at close range before the new holder starts driving', () => {
  const {frames} = templates.find(t => t.id === 'dribble-handoff').build();
  const exchange = frames.findIndex((frame, index) => frames[index + 1] && frame.ball.holderId === 'attack-1' && frames[index + 1].ball.holderId === 'attack-2');
  assert.ok(exchange >= 0);
  const board = frames[exchange];
  assert.ok(distance(player(board, 'attack-1'), player(board, 'attack-2')) <= 80, 'handoff must not look like a long pass');
  const received = frames[exchange + 1];
  assert.ok(received.paths.some(p => p.type === 'dribble' && p.playerId === 'attack-2'));
  assert.ok(received.paths.some(p => p.type === 'screen' && p.playerId === 'attack-1'));
});

test('Spain back-screen targets the rolling screener defender, then releases outside', () => {
  const {frames} = templates.find(t => t.id === 'spain-pick-roll').build();
  const index = frames.findIndex(frame => frame.paths.some(p => p.type === 'screen' && p.playerId === 'attack-2'));
  assert.ok(index > 0);
  const from = frames[index], to = frames[index + 1];
  const screener = player(from, 'attack-2');
  assert.deepEqual(player(to, 'attack-2'), screener, 'back screener stays still during roll');
  assert.ok(distance(screener, player(from, 'defense-4')) < 80);
  assert.ok(distance(screener, player(from, 'defense-4')) < distance(screener, player(from, 'defense-1')));
  assert.ok(player(to, 'attack-4').y < player(from, 'attack-4').y - 100, '4 rolls toward basket');
  assert.ok(to.paths.some(p => p.type === 'run' && p.playerId === 'attack-2'), '2 releases only after back screen');
  assert.ok(player(frames[index + 2], 'attack-2').y > screener.y + 100, '2 pops outside');
});

test('double screen is set before the receiver uses two stationary screeners in order', () => {
  const {frames} = templates.find(t => t.id === 'staggered-screens').build();
  const index = frames.findIndex(frame => frame.paths.filter(p => p.type === 'screen').length === 2);
  assert.ok(index > 0, 'screeners must arrive before receiver starts');
  const board = frames[index], next = frames[index + 1];
  const route = board.paths.find(p => p.type === 'run' && p.playerId === 'attack-2');
  assert.ok(route);
  const closest = centre => {
    let best = {distance:Infinity,order:0};
    for (let i = 0; i < route.points.length - 1; i++) {
      const a = route.points[i], b = route.points[i + 1], dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((centre.x-a.x)*dx+(centre.y-a.y)*dy)/(dx*dx+dy*dy)));
      const d = distance(centre, {x:a.x+t*dx,y:a.y+t*dy});
      if (d < best.distance) best = {distance:d,order:i+t};
    }
    return best;
  };
  const first = closest(player(board, 'attack-3')), second = closest(player(board, 'attack-4'));
  assert.ok(first.order < second.order, 'receiver goes past 3 before 4');
  assert.ok(first.distance >= 48 && first.distance < 95);
  assert.ok(second.distance >= 48 && second.distance < 95);
  for (const id of ['attack-3','attack-4']) assert.deepEqual(player(board,id), player(next,id), 'screeners stay set while used');
});
