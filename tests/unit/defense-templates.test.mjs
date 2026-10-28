import test from 'node:test';
import assert from 'node:assert/strict';
import { templates } from '../../shared/templates.js';
import { validatePlay, interpolateBoards, ballPosition } from '../../shared/engine.js';

const defense = templates.filter(template => template.kind === 'defense');
const offense = templates.filter(template => template.kind === 'offense');
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const player = (board, id) => board.players.find(p => p.id === id);
const blue = board => board.players.filter(p => p.team === 'defense');
const orange = board => board.players.filter(p => p.team === 'attack');
const nearestBlue = (board, target) => blue(board).sort((a, b) => distance(a, target) - distance(b, target))[0];
const basket = {x:500,y:140};
const getDefense = (mode, name) => templates.find(template => template.id === `defense-${mode}-${name}`).build().frames;

test('twenty-six sources retain the original offense and defense groups before the new six', () => {
  assert.equal(templates.length, 26);
  assert.equal(offense.length, 18);
  assert.equal(defense.length, 8);
  assert.equal(new Set(templates.map(t => t.id)).size, 26);
  assert.deepEqual(templates.slice(0, 12).map(t => t.id), [
    'pick-roll','give-go','back-screen','four-out-cut','dribble-handoff','pick-pop',
    'baseline-backdoor','four-spread-pick-roll','staggered-screens','high-low','drive-corner-kick','spain-pick-roll'
  ]);
  assert.ok(templates.slice(0, 12).every(t => t.kind === 'offense'));
  assert.ok(templates.slice(12, 20).every(t => t.kind === 'defense'));
  assert.ok(templates.slice(20).every(t => t.kind === 'offense'));
  for (const mode of ['3v3','4v4']) {
    const group = defense.filter(t => t.mode === mode);
    assert.equal(group.length, 4);
    assert.deepEqual(group.map(t => t.category).sort(), ['半场盯人','区域联防','夹击防守','协防轮转'].sort());
    assert.ok(group.every(t => t.id.startsWith(`defense-${mode}-`)));
  }
});

test('defense metadata does not alter the Play contract and six full rosters remain valid', () => {
  for (const template of defense) {
    assert.ok(['基础','进阶'].includes(template.difficulty));
    assert.equal(template.opponentTemplateId, undefined);
    const play = template.build();
    assert.deepEqual(Object.keys(play).sort(), ['frameIndex','frames','id','mode','title']);
    assert.deepEqual(validatePlay(JSON.parse(JSON.stringify(play))), play);
    assert.equal(play.frames.length, 6);
    for (const board of play.frames) {
      const count = template.mode === '3v3' ? 3 : 4;
      assert.equal(blue(board).length, count);
      assert.equal(orange(board).length, count);
      assert.deepEqual(blue(board).map(p => p.id), Array.from({length:count}, (_, i) => `defense-${i+1}`));
      assert.match(board.ball.holderId, /^attack-[1-4]$/);
      assert.ok(board.note.length >= 30);
    }
  }
});

test('every defense transition contains meaningful blue movement and matching outgoing blue routes', () => {
  for (const template of defense) {
    const {frames} = template.build();
    for (let index = 0; index < frames.length - 1; index++) {
      const from = frames[index], to = frames[index + 1];
      assert.ok(blue(from).some(p => distance(p, player(to,p.id)) > 15), `${template.id} step ${index+1}: no active defensive movement`);
      const routes = from.paths.filter(path => path.type === 'run');
      assert.ok(routes.length >= 1);
      assert.equal(new Set(routes.map(path => path.playerId)).size, routes.length);
      for (const path of routes) {
        assert.match(path.playerId, /^defense-/);
        assert.equal(distance(path.points[0], player(from,path.playerId)), 0);
        assert.equal(distance(path.points.at(-1), player(to,path.playerId)), 0);
      }
      for (const defender of blue(from)) {
        if (distance(defender, player(to,defender.id)) > 0.001) assert.ok(routes.some(path => path.playerId === defender.id), `${template.id}: moving defender lacks route`);
      }
    }
    assert.equal(frames.at(-1).paths.length, 0, 'last frame has no unresolved outgoing routes');
  }
});

test('reference opponents keep real possession, and each transfer has a correctly aligned pass', () => {
  for (const template of defense) {
    const {frames} = template.build();
    let transfers = 0;
    for (let index = 0; index < frames.length - 1; index++) {
      const from = frames[index], to = frames[index + 1];
      const passes = from.paths.filter(p => p.type === 'pass');
      const changed = from.ball.holderId !== to.ball.holderId;
      assert.equal(passes.length, changed ? 1 : 0);
      if (changed) transfers++;
      for (const pass of passes) {
        assert.equal(pass.playerId, from.ball.holderId);
        assert.equal(distance(pass.points[0], ballPosition(from)), 0);
        assert.equal(distance(pass.points.at(-1), ballPosition(to)), 0);
      }
    }
    assert.ok(transfers >= 2, `${template.id}: missing reference ball movement`);
  }
});

test('defense builds do not share players, notes or nested route points', () => {
  for (const template of defense) {
    const a = template.build(), b = template.build();
    assert.notEqual(a.id, b.id);
    const originalB = structuredClone(b), next = structuredClone(a.frames[1]);
    a.frames[0].players.find(p => p.team === 'defense').x = 900;
    a.frames[0].paths[0].points[0].x = 900;
    a.frames[0].note = '临时编辑';
    assert.deepEqual(b, originalB);
    assert.deepEqual(a.frames[1], next);
    assert.deepEqual(template.build().frames, b.frames);
  }
});

test('actual defense animations avoid invalid coordinates, marker crossings and imaginary intercepted passes', () => {
  for (const template of defense) {
    const {frames} = template.build();
    for (let index = 0; index < frames.length - 1; index++) {
      const from = frames[index], to = frames[index + 1];
      for (let sample = 0; sample <= 200; sample++) {
        const t = sample / 200, board = interpolateBoards(from,to,t), ball = ballPosition(board);
        const defenders = blue(board), opponents = orange(board);
        const label = `${template.id} step ${index+1} t=${t}`;
        for (const point of [...board.players, ball]) {
          assert.ok(Number.isFinite(point.x) && Number.isFinite(point.y), `${label}: nonfinite coordinate`);
          assert.ok(point.x >= 70 && point.x <= 930 && point.y >= 70 && point.y <= 730, `${label}: outside court`);
        }
        for (let number = 0; number < defenders.length; number++) {
          const defender = defenders[number];
          assert.ok(distance(ball,defender) >= 40, `${label}: ball crosses ${defender.id}`);
          for (const other of defenders.slice(number+1)) assert.ok(distance(defender,other) >= 48, `${label}: blue teammates cross`);
          for (const opponent of opponents) assert.ok(distance(defender,opponent) >= 48, `${label}: opponent crosses ${defender.id}`);
        }
      }
    }
  }
});

test('man-to-man changes ball pressure and recovers the weak-side defenders', () => {
  for (const mode of ['3v3','4v4']) {
    const frames = getDefense(mode,'man-to-man');
    assert.equal(nearestBlue(frames[1], player(frames[1],'attack-2')).id, 'defense-2');
    assert.equal(nearestBlue(frames[3], player(frames[3],'attack-1')).id, 'defense-1');
    assert.equal(nearestBlue(frames[4], player(frames[4],'attack-3')).id, 'defense-3');
    assert.ok(player(frames[1],'defense-3').x < player(frames[0],'defense-3').x - 50);
    assert.ok(player(frames[4],'defense-3').x > player(frames[1],'defense-3').x + 50);
    for (const index of [1,3,4]) {
      const holder = player(frames[index],frames[index].ball.holderId);
      assert.ok(nearestBlue(frames[index],holder).y < holder.y, 'ball defender remains toward the basket');
    }
  }
});

test('zones assign someone to each new ball region while the far low defender protects the rim', () => {
  const three = getDefense('3v3','zone');
  assert.ok(player(three[0],'defense-1').y > player(three[0],'defense-2').y);
  assert.equal(nearestBlue(three[1],player(three[1],'attack-2')).id,'defense-2');
  assert.equal(nearestBlue(three[4],player(three[4],'attack-3')).id,'defense-3');
  assert.ok(distance(player(three[1],'defense-3'),basket) < distance(player(three[0],'defense-3'),basket));
  const four = getDefense('4v4','zone');
  assert.ok(player(four[0],'defense-1').y > player(four[0],'defense-3').y);
  assert.ok(player(four[0],'defense-2').y > player(four[0],'defense-4').y);
  assert.equal(nearestBlue(four[1],player(four[1],'attack-2')).id,'defense-1');
  assert.equal(nearestBlue(four[3],player(four[3],'attack-4')).id,'defense-4');
  assert.equal(nearestBlue(four[4],player(four[4],'attack-3')).id,'defense-2');
  assert.ok(distance(player(four[1],'defense-4'),basket) < distance(player(four[0],'defense-4'),basket));
});

test('traps bracket the sideline holder, retain rim cover and release after the ball escapes', () => {
  for (const mode of ['3v3','4v4']) {
    const frames = getDefense(mode,'trap');
    const trappers = mode === '3v3' ? ['defense-1','defense-2'] : ['defense-3','defense-4'];
    const trap = frames[3], carrier = player(trap,trap.ball.holderId);
    const first = player(trap,trappers[0]), second = player(trap,trappers[1]);
    assert.ok(distance(first,carrier) < 125 && distance(second,carrier) < 125);
    const dot = (first.x-carrier.x)*(second.x-carrier.x)+(first.y-carrier.y)*(second.y-carrier.y);
    assert.ok(dot < 0, 'trappers occupy different sides rather than the same point');
    const rimHelper = player(trap,mode === '3v3' ? 'defense-3' : 'defense-2');
    assert.ok(distance(rimHelper,basket) < 150);
    assert.notEqual(frames[4].ball.holderId,trap.ball.holderId);
    for (const id of trappers) assert.ok(distance(player(frames[4],id),carrier) > 150, 'old trappers must release');
    const nextHolder = player(frames[4],frames[4].ball.holderId);
    assert.equal(nearestBlue(frames[4],nextHolder).id,mode === '3v3' ? 'defense-3' : 'defense-2');
  }
});

test('help rotations move a helper behind the first help and involve the original ball defender', () => {
  for (const mode of ['3v3','4v4']) {
    const frames = getDefense(mode,'help-rotation');
    assert.ok(player(frames[1],'attack-1').y < player(frames[0],'attack-1').y - 100);
    assert.ok(player(frames[2],'defense-3').y < player(frames[2],'attack-1').y);
    assert.ok(distance(player(frames[1],'defense-2'),basket) < distance(player(frames[0],'defense-2'),basket));
    if (mode === '3v3') {
      assert.equal(nearestBlue(frames[3],player(frames[3],'attack-3')).id,'defense-1');
      assert.ok(distance(player(frames[3],'defense-1'),player(frames[0],'defense-1')) > 100);
    } else {
      assert.ok(distance(player(frames[1],'defense-4'),player(frames[1],'attack-3')) < distance(player(frames[0],'defense-4'),player(frames[0],'attack-3')));
      assert.equal(nearestBlue(frames[3],player(frames[3],'attack-3')).id,'defense-4');
      assert.equal(nearestBlue(frames[5],player(frames[5],'attack-4')).id,'defense-1');
      assert.equal(nearestBlue(frames[5],player(frames[5],'attack-1')).id,'defense-3');
    }
  }
});
