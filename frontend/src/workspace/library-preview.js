import { ballPosition, interpolateBoards, validatePlay } from '../../../shared/engine.js';
import { COURT_COLORS as C, appendWoodSurface, appendPlayerPiece } from '../board/appearance.js';
import { isPlayerVisible, isBallVisible, isTransitionBallVisible } from '../board/hit-test.js';
import { createPreviewClock } from './library-preview-clock.js';

let previewSequence = 0;

/** A single real-template animation inside a UI-owned button. No persistence. */
export function createLibraryPreview({ template, button }) {
  const document = button?.ownerDocument, window = document?.defaultView;
  if (!window || typeof template?.build !== 'function') throw new TypeError('卡片预览需要内置模板与按钮');
  const play = validatePlay(template.build()), frames = play.frames, clock = createPreviewClock(frames.length);
  const focus = template.kind === 'defense' ? 'defense' : 'attack';
  const id = `library-preview-${++previewSequence}`;
  const svgNode = (tag, attributes = {}, text) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const svg = svgNode('svg', { viewBox: '0 0 1000 820', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': `${template.title} · 真实战术动画`, 'data-tactic-id': template.id });
  appendWoodSurface(svg, svgNode, id, true);
  svg.append(svgNode('rect', { x: 350, y: 70, width: 300, height: 320, fill: C.key, 'fill-opacity': .9 }));
  for (const edge of [true, false]) {
    const lines = svgNode('g', { fill: 'none', stroke: edge ? C.lineEdge : C.marking, 'stroke-width': edge ? 5 : 3, opacity: edge ? .4 : 1 });
    lines.append(
      svgNode('rect', { x: 70, y: 70, width: 860, height: 660 }),
      svgNode('rect', { x: 350, y: 70, width: 300, height: 320 }),
      svgNode('path', { d: 'M390 390A110 110 0 0 0 610 390M110 70V226A399 399 0 0 0 890 226V70M395 730A105 105 0 0 1 605 730M425 140A75 75 0 0 0 575 140' }),
      svgNode('path', { d: 'M390 390A110 110 0 0 1 610 390', 'stroke-dasharray': '9 10', opacity: .6 }),
    );
    svg.append(lines);
  }
  svg.append(svgNode('path', { d: 'M447 108H553', stroke: C.marking, 'stroke-width': 5, 'stroke-linecap': 'round' }), svgNode('path', { d: 'M500 108V125', stroke: C.lineEdge, 'stroke-width': 4 }), svgNode('circle', { cx: 500, cy: 140, r: 16, stroke: C.pass, 'stroke-width': 5, fill: 'none' }));
  const markerDefs = svgNode('defs'), routes = svgNode('g', { 'data-layer': 'routes' });
  for (const type of ['run', 'pass', 'dribble', 'screen', 'defense', 'defense-screen']) {
    const defending = type.startsWith('defense'), color = defending ? C.defenseRoute : C[type];
    const marker = svgNode('marker', { id: `${id}-${type}`, viewBox: '0 0 12 12', refX: 10, refY: 6, markerWidth: 10, markerHeight: 10, orient: 'auto', markerUnits: 'userSpaceOnUse' });
    marker.append(svgNode('path', { d: type.endsWith('screen') ? 'M9 0L9 12' : 'M2 1L10 6L2 11', fill: 'none', stroke: color, 'stroke-width': 2.6 })); markerDefs.append(marker);
  }
  svg.append(markerDefs, routes);
  const pieces = new Map();
  for (const player of frames[0].players) {
    if (!isPlayerVisible(player, true, focus)) continue;
    const piece = svgNode('g', { 'data-player': player.id, 'data-team': player.team, opacity: player.team === focus ? 1 : .42 });
    appendPlayerPiece(piece, svgNode, id, player.team);
    piece.append(svgNode('text', { y: 7, 'text-anchor': 'middle', fill: C.line, 'font-size': 21, 'font-family': 'system-ui', 'font-weight': 750 }, player.number));
    pieces.set(player.id, piece); svg.append(piece);
  }
  const ball = svgNode('g', { 'data-ball': 'true', opacity: focus === 'defense' ? .6 : 1 });
  ball.append(svgNode('circle', { r: 12, fill: '#F9A861', stroke: C.ink, 'stroke-width': 2 }), svgNode('path', { d: 'M-12 0H12M0 -12V12M-8 -9Q5 0 -8 9M8 -9Q-5 0 8 9', stroke: C.ink, 'stroke-width': 1.2, fill: 'none' })); svg.append(ball);
  const status = document.createElement('span'), bar = document.createElement('span');
  status.className = 'corner-status'; bar.className = 'preview-progress';
  status.setAttribute('aria-hidden', 'true'); bar.setAttribute('aria-hidden', 'true');
  button.replaceChildren(svg, status, bar);
  let playing = false, destroyed = false, raf = null, lastTime = null, generation = 0, routeBoard = null;
  const available = () => !destroyed && !button.disabled && button.isConnected && !document.hidden && !button.closest?.('[hidden]');
  function sample() {
    const state = clock.state, from = frames[state.stepIndex], to = frames[Math.min(frames.length - 1, state.stepIndex + 1)];
    const board = state.fraction > 0 ? interpolateBoards(from, to, state.interpolation) : from;
    return { ...state, from, to, board };
  }
  function state() {
    const current = sample();
    return { previewId: template.id, playing, progress: current.progress, position: current.position, cycle: current.cycle, stepIndex: current.stepIndex, interpolation: current.interpolation, phase: playing ? current.atEnd ? 'hold' : 'playing' : 'paused', holderId: current.board.ball.holderId || '', rafCount: raf === null ? 0 : 1, holdRemaining: current.holdRemaining, holdElapsedMs: current.holdElapsedMs, destroyed };
  }
  function publish() {
    const value = state();
    for (const key of ['previewId', 'playing', 'progress', 'cycle', 'stepIndex', 'phase', 'holderId', 'rafCount', 'holdRemaining', 'position', 'interpolation']) button.dataset[key] = String(value[key]);
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', `${playing ? '暂停' : '继续'}${template.title}的卡片预览`);
    status.textContent = playing ? 'Ⅱ 循环播放' : '▶ 已暂停';
    bar.style.transform = `scaleX(${value.progress})`;
  }
  function paint() {
    const current = sample();
    if (routeBoard !== current.from) {
      routeBoard = current.from; routes.replaceChildren();
      for (const route of current.from.paths) {
        const actor = current.from.players.find(player => player.id === route.playerId);
        if (focus === 'defense' && actor?.team !== 'defense') continue;
        const defending = focus === 'defense' && actor?.team === 'defense';
        const marker = defending ? route.type === 'screen' ? 'defense-screen' : 'defense' : route.type;
        routes.append(svgNode('path', {
          d: route.points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' '),
          fill: 'none', stroke: defending ? C.defenseRoute : C[route.type], 'stroke-width': 4,
          'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          'stroke-dasharray': route.type === 'pass' ? '11 10' : route.type === 'dribble' ? '3 5' : '',
          'marker-end': `url(#${id}-${marker})`, 'data-route': route.id, 'data-actor': route.playerId || '',
        }));
      }
    }
    for (const player of current.board.players) pieces.get(player.id)?.setAttribute('transform', `translate(${player.x} ${player.y})`);
    const point = ballPosition(current.board);
    ball.setAttribute('transform', `translate(${point.x} ${point.y})`);
    const ballVisible = current.fraction > 0 ? isTransitionBallVisible(current.from, current.to, true, focus) : isBallVisible(current.board, true, focus);
    ball.style.display = ballVisible ? '' : 'none';
    svg.dataset.frameIndex = String(current.stepIndex); svg.dataset.holderId = ball.dataset.holderId = current.board.ball.holderId || '';
    publish();
  }
  function cancelFrame() {
    generation++;
    if (raf !== null) window.cancelAnimationFrame(raf);
    raf = null; lastTime = null;
  }
  function schedule() {
    if (!playing || destroyed || raf !== null) return;
    const token = generation;
    raf = window.requestAnimationFrame(time => {
      // A cancelled callback can still be delivered. It must never clear the
      // newer generation's rAF handle or schedule a second live loop.
      if (token !== generation || destroyed || !playing) return;
      raf = null;
      if (!available()) { pause(); return; }
      const finite = Number.isFinite(time);
      const delta = lastTime === null || !finite ? 0 : Math.max(0, Math.min(100, time - lastTime));
      if (finite) lastTime = lastTime === null ? time : Math.max(lastTime, time);
      clock.advance(delta); paint(); schedule();
    });
    publish();
  }
  function start() {
    if (!available() || playing) return state();
    cancelFrame(); playing = true; paint(); schedule(); return state();
  }
  function pause() { if (destroyed) return state(); cancelFrame(); playing = false; paint(); return state(); }
  function reset() { if (destroyed) return state(); cancelFrame(); playing = false; clock.reset(); paint(); return state(); }
  const toggle = () => { if (available()) playing ? pause() : start(); };
  const visibility = () => { if (document.hidden) pause(); };
  const pagehide = () => pause();
  button.addEventListener('click', toggle); document.addEventListener('visibilitychange', visibility); window.addEventListener('pagehide', pagehide);
  paint();
  return {
    start, pause, reset,
    destroy() {
      if (destroyed) return;
      cancelFrame(); playing = false; destroyed = true;
      button.removeEventListener('click', toggle); document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', pagehide);
      publish();
    },
    get state() { return state(); },
  };
}
