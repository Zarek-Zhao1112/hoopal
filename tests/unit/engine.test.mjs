import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, createPlay, validatePlay, PlayStore, interpolateBoards, ballPosition } from '../../shared/engine.js';
import { templates } from '../../shared/templates.js';

test('3v3 and 4v4 produce complete independent rosters', () => {
  assert.equal(createBoard().players.length, 6);
  assert.equal(createBoard('4v4').players.length, 8);
  assert.throws(() => createBoard('5v5'));
  assert.throws(() => createBoard('2v2'));
  assert.equal(validatePlay(createPlay('4v4')).frames.length, 1);
});

test('update, undo, redo and branch history are atomic', () => {
  const store = new PlayStore();
  const initial = store.board.players[0].x;
  store.update(board => { board.players[0].x = 600; });
  assert.equal(store.board.players[0].x, 600);
  assert.equal(store.canUndo, true);
  assert.equal(store.undo(), true);
  assert.equal(store.board.players[0].x, initial);
  store.redo();
  assert.equal(store.board.players[0].x, 600);
  store.undo();
  store.update(board => { board.note = '新分支'; });
  assert.equal(store.canRedo, false);
  const before = JSON.stringify(store.play);
  assert.throws(() => store.update(board => { board.players[0].x = Infinity; }));
  assert.equal(JSON.stringify(store.play), before);
});

test('frames retain positions, clear old annotations and stay independently editable', () => {
  const store = new PlayStore();
  store.update(board => { board.note = '第一步'; board.paths.push({id:'p1',type:'run',points:[{x:100,y:100},{x:200,y:200}]}); });
  store.addFrame();
  assert.equal(store.play.frameIndex, 1);
  assert.deepEqual(store.board.paths, []);
  assert.equal(store.board.note, '');
  store.update(board => { board.players[0].x = 800; });
  store.changeFrame(0);
  assert.equal(store.board.note, '第一步');
  assert.equal(store.board.players[0].x, 500);
  assert.equal(store.changeFrame(10), false);
  store.deleteFrame();
  assert.equal(store.play.frames.length, 1);
  assert.equal(store.deleteFrame(), false);
  store.undo();
  assert.equal(store.play.frames.length, 2);
});

test('import rejects corrupt rosters, bad coordinates and oversized payloads', () => {
  const changes = [
    p => { p.frames = []; },
    p => { p.frames = Array(61).fill(p.frames[0]); },
    p => { p.frames[0].players[0].x = NaN; },
    p => { p.frames[0].players[0].y = 1000; },
    p => { p.frames[0].players[1].id = p.frames[0].players[0].id; },
    p => { p.frames[0].players[1].number = 1; },
    p => { p.frames[0].ball.holderId = 'missing'; },
    p => { p.frames[0].paths = Array(81).fill({}); },
    p => { p.frames[0].paths = [{id:'x',type:'run',points:Array(201).fill({x:100,y:100})}]; },
    p => { p.frames.push(createBoard()); p.frames[1].players[0].id = 'different'; }
  ];
  for (const change of changes) { const play = createPlay(); change(play); assert.throws(() => validatePlay(play)); }
});

test('load sanitizes fields, copies input and resets history only after success', () => {
  const store = new PlayStore();
  store.setTitle('修改后');
  assert.throws(() => store.load({}));
  assert.equal(store.play.title, '修改后');
  assert.equal(store.canUndo, true);
  const source = createPlay();
  source.extra = '不保留';
  source.frameIndex = 999;
  source.title = 'a'.repeat(150);
  store.load(source);
  source.frames[0].players[0].x = 800;
  assert.equal(store.board.players[0].x, 500);
  assert.equal(store.play.extra, undefined);
  assert.equal(store.play.title.length, 120);
  assert.equal(store.play.frameIndex, 0);
  assert.equal(store.canUndo, false);
});

test('interpolation tracks roster IDs and the attached ball without jumping to stale coordinates', () => {
  const from = createBoard();
  const to = createBoard();
  to.players[0].x = 700;
  to.players.reverse();
  const mid = interpolateBoards(from, to, 0.5);
  assert.equal(mid.players[0].x, 600);
  assert.equal(mid.ball.x, 624);
  assert.equal(mid.ball.holderId, '');
  assert.deepEqual(ballPosition(from), {x:524,y:554});
  assert.deepEqual(interpolateBoards(from, to, 1), to);
  assert.deepEqual(interpolateBoards(from, to, -1), from);
  mid.players[0].x = 100;
  assert.equal(from.players[0].x, 500);
});

test('movement follows matching multi-segment routes by total length and keeps the ball attached', () => {
  const from = createBoard();
  const to = createBoard();
  Object.assign(from.players[0], {x:100,y:100});
  Object.assign(to.players[0], {x:500,y:500});
  from.paths = [{id:'corner',type:'dribble',playerId:'attack-1',points:[{x:110,y:100},{x:100,y:500},{x:490,y:500}]}];
  const before = JSON.stringify(from);
  const quarter = interpolateBoards(from, to, 0.25);
  assert.equal(quarter.players[0].x, 100);
  assert.equal(quarter.players[0].y, 300);
  assert.deepEqual(quarter.ball, {x:124,y:284,holderId:''});
  const mid = interpolateBoards(from, to, 0.5);
  assert.equal(mid.players[0].x, 100);
  assert.equal(mid.players[0].y, 500);
  assert.deepEqual(mid.ball, {x:124,y:484,holderId:''});
  const later = interpolateBoards(from, to, 0.75);
  assert.equal(later.players[0].x, 300);
  assert.equal(later.players[0].y, 500);
  assert.deepEqual(interpolateBoards(from, to, 1), to);
  assert.equal(JSON.stringify(from), before);
  from.paths[0].type = 'run';
  assert.equal(interpolateBoards(from, to, 0.5).players[0].x, 100);
});

test('routes with wrong player, type or endpoints fall back to straight movement', () => {
  const from = createBoard();
  const to = createBoard();
  Object.assign(from.players[0], {x:100,y:100});
  Object.assign(to.players[0], {x:500,y:500});
  const route = {id:'route',type:'run',playerId:'attack-1',points:[{x:100,y:100},{x:100,y:500},{x:500,y:500}]};
  for (const edit of [p => {p.playerId = 'attack-2';}, p => {p.type = 'screen';}, p => {p.points[0].x = 150;}, p => {p.points[2].x = 450;}]) {
    from.paths = [structuredClone(route)];
    edit(from.paths[0]);
    const mid = interpolateBoards(from, to, 0.5);
    assert.equal(mid.players[0].x, 300);
    assert.equal(mid.players[0].y, 300);
  }
});

test('passes follow matching routes between actual held positions and otherwise interpolate directly', () => {
  const from = createBoard();
  const to = createBoard();
  to.ball.holderId = 'attack-2';
  // Actual ball moves (524,554) -> (214,374): 180 vertical + 310 horizontal.
  from.paths = [{id:'pass',type:'pass',playerId:'attack-1',points:[{x:500,y:570},{x:524,y:374},{x:190,y:390}]}];
  const mid = interpolateBoards(from, to, 0.5);
  assert.deepEqual(mid.ball, {x:459,y:374,holderId:''});
  assert.deepEqual(interpolateBoards(from, to, 1).ball, to.ball);
  from.paths[0].points[2] = {x:100,y:100};
  assert.deepEqual(interpolateBoards(from, to, 0.5).ball, {x:369,y:464,holderId:''});
});

test('zero-length route segments do not produce NaN and free balls stay independent', () => {
  const from = createBoard();
  const to = createBoard();
  from.ball = {x:200,y:200,holderId:''};
  to.ball = {x:400,y:400,holderId:''};
  from.paths = [{id:'zero',type:'run',playerId:'attack-1',points:[{x:500,y:570},{x:500,y:570},{x:500,y:570}]}];
  const mid = interpolateBoards(from, to, 0.5);
  assert.deepEqual(mid.ball, {x:300,y:300,holderId:''});
  assert.equal(mid.players[0].x, 500);
  assert.equal(mid.players[0].y, 570);
});

test('templates are valid multi-step plays for both modes with independent builds', () => {
  assert.ok(templates.length >= 3);
  assert.ok(templates.some(template => template.mode === '4v4'));
  for (const template of templates) {
    const play = template.build();
    assert.ok(play.frames.length >= 3);
    assert.ok(play.frames.every(frame => frame.note.length > 0));
    assert.deepEqual(validatePlay(play), play);
    play.frames[0].players[0].x = 900;
    assert.notEqual(template.build().frames[0].players[0].x, 900);
  }
});
