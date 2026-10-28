import test from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, ballPosition, interpolateBoards } from '../../shared/engine.js';
import { resolveDragTarget, isTransitionBallVisible } from '../../frontend/src/board/hit-test.js';

test('touch targets a player center even when the ball is attached beside it', () => {
  const board = createBoard();
  assert.deepEqual(resolveDragTarget(board, board.players[0]), { kind: 'player', id: 'attack-1' });
  assert.deepEqual(resolveDragTarget(board, ballPosition(board)), { kind: 'ball' });
});

test('defense focus keeps blue players selectable while hidden opponents and their ball cannot be touched', () => {
  const board = createBoard('4v4');
  const defender = board.players.find(p => p.id === 'defense-1');
  const attacker = board.players.find(p => p.id === 'attack-1');
  assert.deepEqual(resolveDragTarget(board, defender, false, 'defense'), {kind:'player',id:defender.id});
  assert.equal(resolveDragTarget(board, attacker, false, 'defense'), null);
  assert.equal(resolveDragTarget(board, ballPosition(board), false, 'defense'), null);
  assert.deepEqual(resolveDragTarget(board, attacker, true, 'defense'), {kind:'player',id:attacker.id});
  board.ball = {x:180,y:100,holderId:''};
  assert.deepEqual(resolveDragTarget(board, board.ball, false, 'defense'), {kind:'ball'});
});

test('hidden opponent possession stays hidden through interpolation while real free and defending balls remain visible', () => {
  const from = createBoard(), to = createBoard();
  to.ball.holderId = 'attack-2';
  assert.equal(interpolateBoards(from,to,0.5).ball.holderId,'');
  assert.equal(isTransitionBallVisible(from,to,false,'defense'),false);
  assert.equal(isTransitionBallVisible(from,to,true,'defense'),true);
  to.ball.holderId = 'defense-1';
  assert.equal(isTransitionBallVisible(from,to,false,'defense'),true);
  from.ball.holderId = '';to.ball.holderId = '';
  assert.equal(isTransitionBallVisible(from,to,false,'defense'),true);
});

test('touch ignores hidden defenders and empty court; free balls remain selectable', () => {
  const board = createBoard();
  const defender = board.players.find(player => player.team === 'defense');
  assert.deepEqual(resolveDragTarget(board, defender), { kind: 'player', id: defender.id });
  assert.equal(resolveDragTarget(board, defender, false), null);
  assert.equal(resolveDragTarget(board, { x: 100, y: 100 }), null);
  board.ball = { x: 300, y: 200, holderId: '' };
  assert.deepEqual(resolveDragTarget(board, board.ball), { kind: 'ball' });
});
