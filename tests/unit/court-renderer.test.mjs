import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrainingCourt, createLibraryCourt, createTacticPreview } from '../../frontend/src/board/court-renderer.js';
import { templates } from '../../shared/templates.js';
import { ballPosition, interpolateBoards } from '../../shared/engine.js';

class Element {
  constructor(tag) { this.tagName = tag; this.attributes = {}; this.children = []; this.dataset = {}; this.style = {}; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  cloneNode(deep) { const copy = new Element(this.tagName); copy.attributes = { ...this.attributes }; if (deep) copy.children = this.children.map(child => child.cloneNode(true)); return copy; }
}
const document = { createElementNS: (_, tag) => new Element(tag) };
const all = node => [node, ...node.children.flatMap(all)];
const find = (node, attribute, value) => all(node).find(node => node.getAttribute(attribute) === value);
const transforms = svg => Object.fromEntries(all(svg).filter(node => node.getAttribute('data-player')).map(node => [node.getAttribute('data-player'), node.getAttribute('transform')]));
function localReferences(svg) {
  const nodes = all(svg), ids = new Set(nodes.map(node => node.getAttribute('id')).filter(Boolean));
  for (const node of nodes) for (const value of Object.values(node.attributes)) for (const match of value.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.has(match[1]), `missing local SVG resource ${match[1]}`);
}

test('training renderer keeps court/export layer IDs, role labels, hit areas and actual ball coordinates', () => {
  const svg = new Element('svg'), court = createTrainingCourt({ document, svg }), board = templates.find(t => t.id === 'post-split').build().frames[2];
  court.draw(board, { playerTitle: p => p.id === 'attack-1' ? '职责 1：指定成员 · 球衣 99 号' : undefined });
  for (const id of ['routes-layer', 'players-layer', 'ball-layer', 'court-wood', 'arrow-run', 'arrow-defense']) assert.ok(find(svg, 'id', id));
  assert.equal(all(find(svg, 'data-player', 'attack-1')).find(n => n.tagName === 'title').textContent, '职责 1：指定成员 · 球衣 99 号');
  assert.equal(all(find(svg, 'data-player', 'attack-1')).find(n => n.tagName === 'text').textContent, '1', 'role remains 1, rather than changing into jersey 99');
  assert.ok(all(svg).some(n => n.getAttribute('r') === '36' && n.getAttribute('fill') === 'transparent'));
  assert.ok(all(svg).some(n => n.getAttribute('stroke-width') === '24' && n.getAttribute('pointer-events') === 'stroke'));
  const ball = ballPosition(board); assert.equal(find(svg, 'data-ball', 'true').getAttribute('transform'), `translate(${ball.x} ${ball.y})`); localReferences(svg);
});

test('training visibility hides opponent players, routes and ball, including explicit interpolated-ball visibility', () => {
  const svg = new Element('svg'), court = createTrainingCourt({ document, svg }), frames = templates.find(t => t.id === 'defense-4v4-man-to-man').build().frames;
  court.draw(frames[0], { kind: 'defense', showOpponent: false });
  assert.equal(Object.keys(transforms(svg)).length, 4); assert.ok(Object.keys(transforms(svg)).every(id => id.startsWith('defense-'))); assert.equal(find(svg, 'data-ball', 'true'), undefined);
  const mid = interpolateBoards(frames[0], frames[1], .5); court.draw(mid, { kind: 'defense', showOpponent: false, ballVisible: false }); assert.equal(find(svg, 'data-ball', 'true'), undefined);
  assert.ok(all(svg).filter(n => n.getAttribute('data-route')).every(n => n.getAttribute('data-actor').startsWith('defense-'))); localReferences(svg);
});

test('main and card render the same interpolated players while retaining their different dribble annotations', () => {
  const template = templates.find(t => t.id === 'slip-screen'), frames = template.build().frames, from = frames[3], to = frames[4], board = interpolateBoards(from, to, .4);
  const mainSvg = new Element('svg'), main = createTrainingCourt({ document, svg: mainSvg }), card = createLibraryCourt({ document, template, board: frames[0], surfaceId: 'test-card' });
  main.draw(board); card.draw({ board, from, to, fraction: .4, stepIndex: 3 }); assert.deepEqual(transforms(mainSvg), transforms(card.element));
  const mainRoute = find(mainSvg, 'data-route', from.paths[0].id), cardRoute = find(card.element, 'data-route', from.paths[0].id);
  assert.notEqual(mainRoute.children[1].getAttribute('d'), cardRoute.getAttribute('d')); assert.equal(cardRoute.getAttribute('stroke-dasharray'), '3 5');
  assert.equal(card.element.dataset.frameIndex, '3'); assert.equal(card.element.dataset.holderId, board.ball.holderId); localReferences(mainSvg); localReferences(card.element);
});

test('card drawings retain player nodes across frames, update real routes, and keep blue focus styles', () => {
  const template = templates.find(t => t.id === 'defense-4v4-help-rotation'), frames = template.build().frames, card = createLibraryCourt({ document, template, board: frames[0], surfaceId: 'test-blue' });
  const initial = find(card.element, 'data-player', 'defense-1');
  for (let index = 0; index < frames.length - 1; index++) card.draw({ board: interpolateBoards(frames[index], frames[index + 1], .5), from: frames[index], to: frames[index + 1], fraction: .5, stepIndex: index });
  assert.equal(find(card.element, 'data-player', 'defense-1'), initial); assert.equal(initial.getAttribute('opacity'), '1'); assert.equal(find(card.element, 'data-player', 'attack-1').getAttribute('opacity'), '0.42');
  assert.ok(all(card.element).filter(n => n.getAttribute('data-route')).every(n => n.getAttribute('data-actor').startsWith('defense-'))); localReferences(card.element);
});

test('recommendation previews retain their exact simplified, static role-numbered presentation and empty fallback', () => {
  for (const mode of ['3v3', '4v4']) {
    const template = templates.find(t => t.mode === mode && t.kind === 'offense'), source = template.build().frames, svg = createTacticPreview({ document, template }), nodes = all(svg);
    assert.equal(svg.getAttribute('class'), 'lineup-tactic-preview'); assert.equal(svg.getAttribute('aria-label'), '推荐战术初始站位');
    assert.equal(nodes.filter(n => n.tagName === 'text').length, mode === '3v3' ? 3 : 4); assert.ok(nodes.some(n => n.getAttribute('opacity') === '0.45'));
    assert.ok(nodes.some(n => n.getAttribute('r') === '28')); assert.equal(find(svg, 'data-ball', 'true'), undefined); localReferences(svg); assert.deepEqual(template.build().frames, source);
  }
  assert.ok(!all(createTacticPreview({ document })).some(n => n.tagName === 'text'));
});
