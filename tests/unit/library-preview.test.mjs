import test from 'node:test';
import assert from 'node:assert/strict';
import { templates } from '../../shared/templates.js';
import { ballPosition, interpolateBoards } from '../../shared/engine.js';
import { COURT_COLORS } from '../../frontend/src/board/appearance.js';
import { createLibraryPreview } from '../../frontend/src/workspace/library-preview.js';
import { createPreviewClock, LIBRARY_PREVIEW_SEGMENT_MS, LIBRARY_PREVIEW_HOLD_MS } from '../../frontend/src/workspace/library-preview-clock.js';

class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, callback) { const list = this.listeners.get(type) || []; list.push(callback); this.listeners.set(type, list); }
  removeEventListener(type, callback) { this.listeners.set(type, (this.listeners.get(type) || []).filter(entry => entry !== callback)); }
  emit(type) { for (const callback of this.listeners.get(type) || []) callback({ target: this }); }
}
class Element extends Target {
  constructor(tag, document) { super(); Object.assign(this, { tagName: tag, ownerDocument: document, children: [], attributes: {}, dataset: {}, style: {}, disabled: false, isConnected: true }); }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (selector === '[hidden]' && node.hidden) return node; return null; }
}
const descendants = node => node.children.flatMap(child => [child, ...descendants(child)]);
function fixture(id = 'give-go') {
  const document = new Target(); document.hidden = false;
  document.createElement = tag => new Element(tag, document);
  document.createElementNS = (_, tag) => document.createElement(tag);
  const window = new Target(), frames = new Map(); let sequence = 0, time = 0;
  window.requestAnimationFrame = callback => { frames.set(++sequence, callback); return sequence; };
  window.cancelAnimationFrame = id => frames.delete(id); document.defaultView = window;
  const button = document.createElement('button'), template = templates.find(template => template.id === id);
  const runtime = createLibraryPreview({ template, button });
  const frame = (delta = 100) => {
    time += delta; const pending = [...frames.values()]; frames.clear();
    for (const callback of pending) callback(time);
  };
  const advance = duration => { for (let remaining = duration; remaining > 0;) { const delta = Math.min(100, remaining); frame(delta); remaining -= delta; } };
  const start = () => { runtime.start(); frame(0); };
  const elements = () => descendants(button);
  return { runtime, button, document, window, frames, template, frame, advance, start, elements };
}
const point = element => element.getAttribute('transform').match(/translate\(([^)]+)\)/)[1].split(/[ ,]+/).map(Number);
function assertBoard(f, board) {
  const all = f.elements();
  for (const player of board.players) assert.deepEqual(point(all.find(node => node.getAttribute('data-player') === player.id)), [player.x, player.y]);
  const ball = ballPosition(board);
  assert.deepEqual(point(all.find(node => node.getAttribute('data-ball') === 'true')), [ball.x, ball.y]);
  assert.equal(f.runtime.state.holderId, board.ball.holderId);
  assert.equal(f.button.dataset.holderId, board.ball.holderId);
}

test('clock uses 2400ms segments, initial 18% hold, and a complete 1000ms final hold', () => {
  assert.equal(LIBRARY_PREVIEW_SEGMENT_MS, 2400); assert.equal(LIBRARY_PREVIEW_HOLD_MS, 1000);
  const clock = createPreviewClock(2);
  for (let i = 0; i < 4; i++) clock.advance(100);
  clock.advance(32); assert.equal(clock.state.position, .18); assert.equal(clock.state.interpolation, 0);
  clock.advance(100); assert.ok(clock.state.interpolation > 0 && clock.state.interpolation < .05);
  for (let i = 0; i < 19; i++) clock.advance(100);
  assert.equal(clock.state.position, 1); assert.equal(clock.state.holdRemaining, 1000); assert.equal(clock.state.cycle, 0);
  for (let i = 0; i < 9; i++) clock.advance(100);
  assert.equal(clock.state.progress, 1); assert.equal(clock.state.holdRemaining, 100); assert.equal(clock.state.cycle, 0);
  clock.advance(100); assert.equal(clock.state.position, 0); assert.equal(clock.state.cycle, 1);
  clock.reset(); assert.equal(clock.state.cycle, 0); assert.equal(clock.state.progress, 0);
  for (const invalid of [0, -1, NaN, 1.5]) assert.throws(() => createPreviewClock(invalid));
});

test('constructing paints a detached safe initial board without autoplay or persistence', () => {
  const f = fixture();
  assert.equal(f.runtime.state.playing, false); assert.equal(f.frames.size, 0);
  assert.equal(f.button.dataset.previewId, 'give-go'); assert.equal(f.button.dataset.rafCount, '0');
  assertBoard(f, f.template.build().frames[0]);
  assert.ok(f.elements().some(node => node.className === 'corner-status'));
  assert.ok(f.elements().some(node => node.className === 'preview-progress'));
  f.button.disabled = true; f.runtime.start(); assert.equal(f.frames.size, 0);
  f.button.disabled = false; f.button.isConnected = false; f.runtime.start(); assert.equal(f.frames.size, 0);
  f.button.isConnected = true; f.document.hidden = true; f.runtime.start(); assert.equal(f.frames.size, 0);
  f.runtime.destroy();
});

test('all 26 templates render actual initial, halfway and final frames with real route interpolation and holder data', () => {
  for (const template of templates) {
    const f = fixture(template.id), play = template.build(), last = play.frames.length - 1;
    assertBoard(f, play.frames[0]); f.start();
    f.advance(last * 1200);
    const state = f.runtime.state, from = play.frames[state.stepIndex], to = play.frames[Math.min(last, state.stepIndex + 1)];
    assert.equal(state.progress, .5);
    assertBoard(f, state.position % 1 ? interpolateBoards(from, to, state.interpolation) : from);
    f.advance(last * 1200); assert.equal(f.runtime.state.progress, 1); assert.equal(f.runtime.state.phase, 'hold');
    assertBoard(f, play.frames.at(-1)); f.runtime.destroy();
  }
});

test('court tap pauses and resumes the same position with one live rAF, and reset returns to frame zero', () => {
  const f = fixture(); f.button.emit('click'); f.frame(0); f.advance(1300);
  const position = f.runtime.state.position; assert.ok(position > .5); assert.equal(f.frames.size, 1);
  f.button.emit('click'); assert.equal(f.runtime.state.playing, false); assert.equal(f.frames.size, 0);
  f.advance(5000); assert.equal(f.runtime.state.position, position);
  f.button.emit('click'); f.runtime.start(); assert.equal(f.frames.size, 1);
  f.frame(0); f.frame(100); assert.ok(f.runtime.state.position > position);
  f.button.disabled = true; f.runtime.reset(); assert.equal(f.runtime.state.position, 0); assert.equal(f.frames.size, 0);
  f.runtime.destroy();
});

test('pause preserves the unspent final hold and resumes only its remaining 600ms', () => {
  const f = fixture(); f.start(); f.advance((f.template.build().frames.length - 1) * 2400); f.advance(400);
  assert.equal(f.runtime.state.holdRemaining, 600); f.runtime.pause();
  f.advance(3000); assert.equal(f.runtime.state.holdRemaining, 600); assert.equal(f.runtime.state.cycle, 0);
  f.start(); f.advance(500); assert.equal(f.runtime.state.progress, 1); assert.equal(f.runtime.state.cycle, 0);
  f.advance(100); assert.equal(f.runtime.state.progress, 0); assert.equal(f.runtime.state.cycle, 1);
  assertBoard(f, f.template.build().frames[0]); f.runtime.destroy();
});

test('negative first timestamps, backwards callbacks and long deltas cannot move backwards or skip the whole play', () => {
  const f = fixture(); f.runtime.start(); f.frame(-10); assert.equal(f.runtime.state.position, 0);
  f.frame(100); const position = f.runtime.state.position;
  f.frame(-200); assert.equal(f.runtime.state.position, position);
  f.frame(200); assert.equal(f.runtime.state.position, position, 'timestamp has only recovered to the prior frame');
  f.frame(20000); assert.ok(f.runtime.state.position <= position + 100 / 2400 + 1e-9); f.runtime.destroy();
});

test('cancelled old generation callbacks cannot clear a newer frame or restart a destroyed runtime', () => {
  const f = fixture(); f.runtime.start(); const old = [...f.frames.values()][0];
  f.runtime.pause(); f.runtime.start(); const current = [...f.frames.values()][0];
  old(100); assert.equal(f.frames.size, 1); assert.equal([...f.frames.values()][0], current); assert.equal(f.runtime.state.rafCount, 1);
  f.runtime.destroy(); const snapshot = f.runtime.state;
  current(200); old(300); f.runtime.start(); f.runtime.pause(); f.runtime.reset(); f.button.emit('click');
  assert.deepEqual(f.runtime.state, snapshot); assert.equal(f.frames.size, 0);
  for (const target of [f.button, f.document, f.window]) assert.ok([...target.listeners.values()].every(list => !list.length));
});

test('hidden document and pagehide pause without hidden-time catch-up or automatic foreground restart', () => {
  const f = fixture(); f.start(); f.advance(1000); const position = f.runtime.state.position;
  f.document.hidden = true; f.document.emit('visibilitychange'); assert.equal(f.frames.size, 0); assert.equal(f.runtime.state.playing, false);
  f.advance(20000); f.document.hidden = false; f.document.emit('visibilitychange');
  assert.equal(f.runtime.state.position, position); assert.equal(f.frames.size, 0);
  f.start(); assert.equal(f.runtime.state.position, position); f.frame(100); assert.ok(f.runtime.state.position > position);
  f.window.emit('pagehide'); assert.equal(f.frames.size, 0); assert.equal(f.runtime.state.playing, false); f.runtime.destroy();
});

test('resize keeps running position; disabled or disconnected buttons pause on their next frame', () => {
  for (const property of ['disabled', 'isConnected']) {
    const f = fixture(); f.start(); f.advance(1000); const position = f.runtime.state.position;
    f.window.emit('resize'); assert.equal(f.runtime.state.position, position); assert.equal(f.frames.size, 1);
    f.button[property] = property === 'disabled'; f.frame(100);
    assert.equal(f.runtime.state.playing, false); assert.equal(f.frames.size, 0); assert.equal(f.runtime.state.position, position);
    f.runtime.destroy();
  }
});

test('defense previews emphasize blue players/routes, with local unique SVG references and unchanged source templates', () => {
  const a = fixture('defense-4v4-help-rotation'), b = fixture('defense-4v4-help-rotation');
  const all = a.elements(), routeNodes = all.filter(node => node.getAttribute('data-route'));
  assert.ok(routeNodes.length > 0); assert.ok(routeNodes.every(node => node.getAttribute('data-actor').startsWith('defense-') && node.getAttribute('stroke') === COURT_COLORS.defenseRoute));
  assert.ok(all.filter(node => node.getAttribute('data-team') === 'defense').every(node => node.getAttribute('opacity') === '1'));
  assert.ok(all.filter(node => node.getAttribute('data-team') === 'attack').every(node => node.getAttribute('opacity') === '0.42'));
  const idsA = new Set(all.map(node => node.getAttribute('id')).filter(Boolean));
  assert.ok(b.elements().every(node => !node.getAttribute('id') || !idsA.has(node.getAttribute('id'))));
  for (const node of all) for (const value of Object.values(node.attributes)) {
    for (const match of value.matchAll(/url\(#([^)]+)\)/g)) assert.ok(idsA.has(match[1]), 'standalone SVG references stay local');
    assert.ok(!/^https?:/.test(value), 'renderer has no remote assets');
  }
  const source = a.template.build().frames; a.start(); a.advance(1300); a.runtime.reset();
  assert.deepEqual(a.template.build().frames, source); a.runtime.destroy(); b.runtime.destroy();
});
