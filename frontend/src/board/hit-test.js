import { ballPosition } from '../../../shared/engine.js';

// Touch browsers can retarget a tap to the small ball beside a player. Resolve
// selection from the actual court coordinates so a tap on the player stays there.
export function isPlayerVisible(player, showOpponent = true, focusTeam = 'attack') {
  return showOpponent || player.team === focusTeam;
}

export function isBallVisible(board, showOpponent = true, focusTeam = 'attack') {
  const holder = board.players.find(player => player.id === board.ball.holderId);
  return !holder || isPlayerVisible(holder, showOpponent, focusTeam);
}

// Interpolation clears holderId while computing free coordinates. Visibility
// must use the source frames, where real possession is still available.
export function isTransitionBallVisible(from, to, showOpponent = true, focusTeam = 'attack') {
  return isBallVisible(from, showOpponent, focusTeam) || isBallVisible(to, showOpponent, focusTeam);
}

export function resolveDragTarget(board, point, showDefense = true, focusTeam = 'attack') {
  const distance = target => Math.hypot(target.x - point.x, target.y - point.y);
  const player = board.players.filter(p => isPlayerVisible(p, showDefense, focusTeam)).sort((a, b) => distance(a) - distance(b))[0];
  const playerDistance = player ? distance(player) : Infinity;
  const ballDistance = isBallVisible(board, showDefense, focusTeam) ? distance(ballPosition(board)) : Infinity;
  if (playerDistance <= 36 && playerDistance < ballDistance) return { kind: 'player', id: player.id };
  if (ballDistance <= 24) return { kind: 'ball' };
  if (playerDistance <= 36) return { kind: 'player', id: player.id };
  return null;
}
