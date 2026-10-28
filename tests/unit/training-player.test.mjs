import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrainingPlayer } from '../../frontend/src/training/player.js';

function fixture(options = {}) {
  let time = 1000, speed = 1, loop = false, next = 0;
  const frames = new Map(), paints = [], completions = [];
  const player = createTrainingPlayer({ frameCount: 3, requestFrame: callback => { frames.set(++next, callback); return next; }, cancelFrame: id => frames.delete(id), now: () => time, getSpeed: () => speed, getLoop: () => loop, onFrame: state => paints.push(state), onComplete: state => completions.push(state), ...options });
  const frame = delta => { time += delta; const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(time)); };
  const advance = duration => { while (duration > 0) { const delta = Math.min(100, duration); frame(delta); duration -= delta; } };
  return { player, frames, paints, completions, frame, advance, setSpeed: value => { speed = value; }, setLoop: value => { loop = value; }, elapseHidden: duration => { time += duration; } };
}

test('training keeps its 2.4-second segments and 18% observation hold, with raw scrub interpolation when paused', () => {
  const f = fixture(); f.player.play(); f.advance(1200);
  assert.ok(Math.abs(f.player.position - .5) < 1e-9); assert.ok(f.player.state.interpolation > .3 && f.player.state.interpolation < .4);
  f.player.seek(.1); assert.equal(f.player.state.interpolation, 0);
  f.player.seek(.59); assert.ok(Math.abs(f.player.state.interpolation - .5) < 1e-9);
  f.player.pause({ snap: false }); assert.equal(f.player.position, .59); assert.equal(f.player.state.interpolation, .59);
  f.player.pause(); assert.equal(f.player.position, 1); f.player.destroy();
});

test('training final hold follows playback speed, instead of adopting the cards fixed one-second hold', () => {
  for (const speed of [1, 2]) {
    const f = fixture({ frameCount: 2 }); f.setSpeed(speed); f.setLoop(true); f.player.seek(.99); f.player.play();
    f.frame(100); assert.equal(f.player.position, 1);
    f.advance(1200 / speed - 200); assert.equal(f.player.position, 1, `${speed}x still observes the final frame before 1.2/speed seconds`);
    f.frame(100); assert.equal(f.player.position, 0, `${speed}x wraps after its original speed-adjusted hold`); assert.equal(f.player.state.endHold, 0); assert.equal(f.player.playing, true);
    f.player.destroy();
  }
});

test('nonlooping playback stops at the last actual frame once and can restart from zero', () => {
  const f = fixture({ frameCount: 2 }); f.player.play(); f.advance(2500);
  assert.equal(f.player.position, 1); assert.equal(f.player.playing, false); assert.equal(f.frames.size, 0); assert.equal(f.completions.length, 1);
  f.advance(10000); assert.equal(f.completions.length, 1);
  f.player.play(); assert.equal(f.player.position, 0); assert.equal(f.frames.size, 1); f.player.destroy();
});

test('default pause rounds, optional pause retains fractional progress, and speed is read on each frame', () => {
  const f = fixture(); f.player.play(); f.frame(100); const first = f.player.position;
  f.setSpeed(2); f.frame(100); assert.ok(Math.abs(f.player.position - first * 3) < 1e-9);
  f.player.seek(.49); f.player.pause(); assert.equal(f.player.position, 0);
  f.player.seek(.51); f.player.play(); f.player.pause(); assert.equal(f.player.position, 1);
  f.player.seek(.37); f.player.play(); f.player.pause({ snap: false }); assert.equal(f.player.position, .37); f.player.destroy();
});

test('duplicate starts keep one RAF, and cancelled callbacks cannot clear or advance a new generation', () => {
  const f = fixture(); f.player.play(); f.player.play(); assert.equal(f.frames.size, 1);
  const old = [...f.frames.values()][0]; f.player.pause(); f.player.play(); const current = [...f.frames.values()][0];
  old(9000); assert.equal(f.player.position, 0); assert.equal(f.frames.size, 1); assert.equal([...f.frames.values()][0], current);
  f.player.destroy(); const stopped = f.player.state; current(10000); old(11000); f.player.play(); f.player.seek(1); f.player.pause();
  assert.deepEqual(f.player.state, stopped); assert.equal(f.frames.size, 0);
});

test('controller pause for hidden/pagehide freezes progress, and resumed playback never catches up hidden time', () => {
  const f = fixture(); f.player.play(); f.advance(1400); f.player.pause(); const hidden = f.player.position;
  f.elapseHidden(60000); assert.equal(f.player.position, hidden); assert.equal(f.frames.size, 0);
  f.player.play(); f.frame(100); assert.ok(Math.abs(f.player.position - hidden - 100 / 2400) < 1e-9); f.player.destroy();
});

test('early frame timestamps cannot go before zero and long callbacks advance at most one capped tick', () => {
  const f = fixture(); f.player.play(); const callback = [...f.frames.values()][0]; f.frames.clear(); callback(990);
  assert.equal(f.player.position, 0); f.frame(100000); assert.ok(f.player.position <= .1 / 2.4 + 1e-9);
  f.player.destroy();
});

test('loading another play cancels old frames and retains its selected step; one-frame plays cannot start', () => {
  const f = fixture(); f.player.play(); const old = [...f.frames.values()][0];
  f.player.load({ frameCount: 5, position: 3 }); old(9000); assert.equal(f.player.position, 3); assert.equal(f.player.playing, false); assert.equal(f.frames.size, 0);
  f.player.load({ frameCount: 1 }); f.player.play(); assert.equal(f.frames.size, 0); assert.equal(f.player.position, 0);
  assert.throws(() => f.player.load({ frameCount: 0 })); f.player.destroy();
});

test('a frame callback may pause and start another generation without creating a second live loop', () => {
  let player, first = true;
  const f = fixture({ onFrame() { if (first) { first = false; player.pause({ snap: false }); player.play(); } } }); player = f.player;
  player.play(); f.frame(100); assert.equal(f.frames.size, 1); assert.equal(player.playing, true); player.destroy();
});
