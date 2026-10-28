import { ballPosition } from '../../../shared/engine.js';
import { COURT_COLORS as C, appendWoodSurface, appendPlayerPiece } from './appearance.js';
import { isPlayerVisible, isBallVisible, isTransitionBallVisible } from './hit-test.js';

const svgFactory = document => (tag, attrs = {}, text) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
  if (text !== undefined) node.textContent = String(text);
  return node;
};

// These are established presentation profiles, not different court coordinates.
// Keep the recommendation's simplified outline and card's compact linework.
function appendCourt(svg, create, surfaceId, variant) {
  appendWoodSurface(svg, create, surfaceId, variant !== 'recommendation');
  if (variant === 'recommendation') {
    svg.append(create('path', { d: 'M70 70H930V730H70ZM350 70V390H650V70M110 70V226A399 399 0 0 0 890 226V70M447 108H553', fill: 'none', stroke: C.marking, 'stroke-width': 6 }));
    return;
  }
  svg.append(create('rect', { x: 350, y: 70, width: 300, height: 320, fill: C.key, 'fill-opacity': .9 }));
  if (variant === 'training') {
    const lines = create('g', { stroke: C.marking, 'stroke-width': 3, fill: 'none' });
    lines.append(
      create('rect', { x: 70, y: 70, width: 860, height: 660 }),
      create('rect', { x: 350, y: 70, width: 300, height: 320 }),
      create('path', { d: 'M390 390 A110 110 0 0 0 610 390' }),
      create('path', { d: 'M390 390 A110 110 0 0 1 610 390', 'stroke-dasharray': '9 10', opacity: 0.6 }),
      create('path', { d: 'M110 70 L110 226 A399 399 0 0 0 890 226 L890 70' }),
      create('path', { d: 'M395 730 A105 105 0 0 1 605 730' }),
      create('path', { d: 'M425 140 A75 75 0 0 0 575 140' }),
      create('path', { d: 'M350 210H330 M350 260H330 M650 210H670 M650 260H670', 'stroke-width': 3 })
    );
    const edge = lines.cloneNode(true); edge.setAttribute('stroke', C.lineEdge); edge.setAttribute('stroke-width', '5'); edge.setAttribute('opacity', '.4');
    svg.append(edge, lines, create('path', { d: 'M447 108H553', stroke: C.lineEdge, 'stroke-width': 9, 'stroke-linecap': 'round' }));
  } else {
    for (const edge of [true, false]) {
      const lines = create('g', { fill: 'none', stroke: edge ? C.lineEdge : C.marking, 'stroke-width': edge ? 5 : 3, opacity: edge ? .4 : 1 });
      lines.append(
        create('rect', { x: 70, y: 70, width: 860, height: 660 }), create('rect', { x: 350, y: 70, width: 300, height: 320 }),
        create('path', { d: 'M390 390A110 110 0 0 0 610 390M110 70V226A399 399 0 0 0 890 226V70M395 730A105 105 0 0 1 605 730M425 140A75 75 0 0 0 575 140' }),
        create('path', { d: 'M390 390A110 110 0 0 1 610 390', 'stroke-dasharray': '9 10', opacity: .6 }),
      ); svg.append(lines);
    }
  }
  svg.append(create('path', { d: 'M447 108H553', stroke: C.marking, 'stroke-width': 5, 'stroke-linecap': 'round' }), create('path', { d: 'M500 108V125', stroke: C.lineEdge, 'stroke-width': 4 }), create('circle', { cx: 500, cy: 140, r: 16, stroke: C.pass, 'stroke-width': 5, fill: 'none' }));
  if (variant === 'training') svg.append(create('text', { x: 500, y: 786, 'text-anchor': 'middle', fill: C.muted, 'font-size': 17, 'letter-spacing': 7, 'font-family': 'system-ui' }, 'HOOPAL / PLAY WITH PURPOSE'));
}
function appendMarkers(svg, create, prefix, training) {
  const defs = create('defs'), types = training ? ['run', 'pass', 'dribble', 'screen', 'defense'] : ['run', 'pass', 'dribble', 'screen', 'defense', 'defense-screen'];
  for (const type of types) {
    const color = type.startsWith('defense') ? C.defenseRoute : C[type];
    const marker = create('marker', { id: `${prefix}-${type}`, viewBox: '0 0 12 12', refX: 10, refY: 6, markerWidth: 10, markerHeight: 10, orient: training ? 'auto-start-reverse' : 'auto', markerUnits: 'userSpaceOnUse' });
    marker.append(create('path', { d: training ? type === 'screen' ? 'M9 0 L9 12' : 'M2 1 L10 6 L2 11' : type.endsWith('screen') ? 'M9 0L9 12' : 'M2 1L10 6L2 11', fill: 'none', stroke: color, 'stroke-width': 2.6, ...(training ? { 'stroke-linejoin': 'round' } : {}) }));
    defs.append(marker);
  }
  svg.append(defs);
}
function routeData(route, zigzag = false) {
  const points = route.points;
  if (!zigzag || route.type !== 'dribble') return points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  const a = points[0], b = points.at(-1), dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy), n = Math.max(2, Math.floor(length / 20));
  let d = `M${a.x} ${a.y}`;
  for (let i = 1; i <= n; i++) { const t = i / n, wave = i === n ? 0 : i % 2 ? 5 : -5; d += ` L${a.x + dx * t - dy / length * wave} ${a.y + dy * t + dx / length * wave}`; }
  return d;
}
function numberLabel(create, player, variant) {
  if (variant === 'recommendation') return create('text', { x: 0, y: 10, 'text-anchor': 'middle', fill: '#fff', 'font-size': 28, 'font-family': 'system-ui' }, player.number);
  return create('text', { y: 7, 'text-anchor': 'middle', fill: C.line, 'font-size': 21, 'font-family': 'system-ui', 'font-weight': 750, ...(variant === 'training' ? { 'pointer-events': 'none', 'paint-order': 'stroke', stroke: player.team === 'attack' ? '#B74F24' : '#2A6088', 'stroke-width': .5 } : {}) }, player.number);
}
function ballPiece(create, focus, training) {
  const group = create('g', { 'data-ball': 'true', opacity: focus === 'defense' ? .6 : 1, ...(training ? { cursor: 'default' } : {}) });
  if (training) group.append(create('title', {}, '篮球'));
  group.append(create('circle', { r: 12, fill: '#F9A861', stroke: C.ink, 'stroke-width': 2 }), create('path', { d: training ? 'M-12 0H12 M0 -12V12 M-8 -9Q5 0 -8 9 M8 -9Q-5 0 8 9' : 'M-12 0H12M0 -12V12M-8 -9Q5 0 -8 9M8 -9Q-5 0 8 9', stroke: C.ink, 'stroke-width': 1.2, fill: 'none', ...(training ? { 'pointer-events': 'none' } : {}) }));
  return group;
}

/** The main court retains its export-safe IDs and fresh per-frame drawing. */
export function createTrainingCourt({ document, svg }) {
  const create = svgFactory(document);
  svg.replaceChildren(); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', '半场篮球战术动画');
  appendMarkers(svg, create, 'arrow', true); appendCourt(svg, create, 'court-wood', 'training');
  const routes = create('g', { id: 'routes-layer' }), players = create('g', { id: 'players-layer' }), balls = create('g', { id: 'ball-layer' }); svg.append(routes, players, balls);
  return { draw(board, { kind = 'offense', showOpponent = true, ballVisible, playerTitle } = {}) {
    const focus = kind === 'defense' ? 'defense' : 'attack';
    routes.replaceChildren();
    for (const route of board.paths) {
      const actor = board.players.find(player => player.id === route.playerId);
      if (actor && !isPlayerVisible(actor, showOpponent, focus) || kind === 'defense' && actor?.team === 'attack') continue;
      const defending = kind === 'defense' && !route.playerId?.startsWith('attack-'), d = routeData(route, true);
      const group = create('g', { 'data-route': route.id, 'data-actor': route.playerId || '', opacity: kind === 'defense' && !defending ? .35 : 1 });
      group.append(create('path', { d, stroke: 'transparent', 'stroke-width': 24, fill: 'none', 'pointer-events': 'stroke' }), create('path', { d, stroke: defending ? C.defenseRoute : C[route.type], 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none', 'stroke-dasharray': route.type === 'pass' ? '11 10' : '', 'marker-end': `url(#arrow-${defending && route.type !== 'screen' ? 'defense' : route.type})`, 'pointer-events': 'none' })); routes.append(group);
    }
    players.replaceChildren();
    for (const player of board.players) {
      if (!isPlayerVisible(player, showOpponent, focus)) continue;
      const group = create('g', { transform: `translate(${player.x} ${player.y})`, 'data-player': player.id, opacity: kind === 'defense' && player.team === 'attack' ? .4 : 1, cursor: 'default' });
      group.append(create('title', {}, playerTitle?.(player) ?? `${player.team === 'attack' ? '进攻' : '防守'} ${player.number} 号`), create('circle', { r: 36, fill: 'transparent' }));
      appendPlayerPiece(group, create, 'court-wood', player.team); group.append(numberLabel(create, player, 'training')); players.append(group);
    }
    balls.replaceChildren();
    if (ballVisible ?? isBallVisible(board, showOpponent, focus)) { const point = ballPosition(board), ball = ballPiece(create, focus, true); ball.setAttribute('transform', `translate(${point.x} ${point.y})`); balls.append(ball); }
  } };
}

/** Persistent player nodes for card animation. Scheduling belongs to its runtime. */
export function createLibraryCourt({ document, template, board, surfaceId }) {
  const create = svgFactory(document), focus = template.kind === 'defense' ? 'defense' : 'attack';
  const svg = create('svg', { viewBox: '0 0 1000 820', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': `${template.title} · 真实战术动画`, 'data-tactic-id': template.id });
  appendCourt(svg, create, surfaceId, 'card'); appendMarkers(svg, create, surfaceId, false);
  const routes = create('g', { 'data-layer': 'routes' }); svg.append(routes);
  const pieces = new Map();
  for (const player of board.players) {
    if (!isPlayerVisible(player, true, focus)) continue;
    const group = create('g', { 'data-player': player.id, 'data-team': player.team, opacity: player.team === focus ? 1 : .42 });
    appendPlayerPiece(group, create, surfaceId, player.team); group.append(numberLabel(create, player, 'card')); pieces.set(player.id, group); svg.append(group);
  }
  const ball = ballPiece(create, focus, false); svg.append(ball);
  let annotated = null;
  return { element: svg, draw({ board, from, to, fraction, stepIndex }) {
    if (annotated !== from) {
      annotated = from; routes.replaceChildren();
      for (const route of from.paths) {
        const actor = from.players.find(player => player.id === route.playerId);
        if (focus === 'defense' && actor?.team !== 'defense') continue;
        const defending = focus === 'defense' && actor?.team === 'defense', marker = defending ? route.type === 'screen' ? 'defense-screen' : 'defense' : route.type;
        routes.append(create('path', { d: routeData(route), fill: 'none', stroke: defending ? C.defenseRoute : C[route.type], 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-dasharray': route.type === 'pass' ? '11 10' : route.type === 'dribble' ? '3 5' : '', 'marker-end': `url(#${surfaceId}-${marker})`, 'data-route': route.id, 'data-actor': route.playerId || '' }));
      }
    }
    for (const player of board.players) pieces.get(player.id)?.setAttribute('transform', `translate(${player.x} ${player.y})`);
    const point = ballPosition(board); ball.setAttribute('transform', `translate(${point.x} ${point.y})`);
    ball.style.display = (fraction > 0 ? isTransitionBallVisible(from, to, true, focus) : isBallVisible(board, true, focus)) ? '' : 'none';
    svg.dataset.frameIndex = String(stepIndex); svg.dataset.holderId = ball.dataset.holderId = board.ball.holderId || '';
  } };
}

/** The recommendation view passes its resolved template, never storage/context. */
export function createTacticPreview({ document, template }) {
  const create = svgFactory(document), svg = create('svg', { viewBox: '0 0 1000 820', preserveAspectRatio: 'xMidYMid meet', class: 'lineup-tactic-preview', 'aria-label': '推荐战术初始站位', role: 'img' });
  appendCourt(svg, create, 'lineup-preview-wood', 'recommendation');
  if (template) for (const player of template.build().frames[0].players) {
    const group = create('g', { transform: `translate(${player.x} ${player.y})`, opacity: player.team === 'attack' ? 1 : .45 });
    appendPlayerPiece(group, create, 'lineup-preview-wood', player.team, 28, 3);
    if (player.team === 'attack') group.append(numberLabel(create, player, 'recommendation'));
    svg.append(group);
  }
  return svg;
}
