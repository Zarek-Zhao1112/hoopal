import test from 'node:test';
import assert from 'node:assert/strict';
import { STARTUP_DURATION, STARTUP_TIMING, startupProgress, createStartupTimeline } from '../../frontend/src/startup/timeline.js';

function fixture(onUpdate) {
  const frames = new Map(), updates = [], completions = []; let id = 0;
  const timeline = createStartupTimeline({ requestFrame: callback => { frames.set(++id, callback); return id; }, cancelFrame: token => frames.delete(token), onUpdate: value => { updates.push(value); onUpdate?.(value); }, onComplete: () => completions.push(timeline.getState()) });
  const frame = timestamp => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(timestamp)); };
  return { timeline, frames, updates, completions, frame };
}

test('approved holds, half-way landmarks and final reveal remain separate', () => {
  assert.equal(STARTUP_DURATION,2400);
  assert.deepEqual(STARTUP_TIMING,{holdMs:1000,expandMs:1100,revealMs:300,titleStart:1165,titleEnd:1825});
  const initial=startupProgress(0);
  assert.equal(initial.expansion,0); assert.equal(initial.titleOpacity,1); assert.equal(initial.titleOffset,0); assert.equal(initial.sceneScale,1.13); assert.equal(initial.overlayOpacity,1);
  for(let timeMs=0;timeMs<=1000;timeMs++) assert.deepEqual(startupProgress(timeMs),{...initial,timeMs},'brand, icon/cabinet scale, clip expansion and overlay remain still for the full first second');
  assert.equal(startupProgress(1550).expansion,.5); assert.equal(startupProgress(1495).titleOpacity,.5); assert.equal(startupProgress(1495).titleOffset,-17);
  assert.equal(startupProgress(1825).titleOpacity,0); assert.equal(startupProgress(2100).expansion,1); assert.equal(startupProgress(2100).reveal,0);
  assert.equal(startupProgress(2250).reveal,.5); assert.equal(startupProgress(2250).overlayOpacity,.5);
  const final=startupProgress(2400); assert.equal(final.expansion,1); assert.equal(final.titleOffset,-34); assert.equal(final.reveal,1); assert.equal(final.overlayOpacity,0); assert.ok(Math.abs(final.sceneScale-1)<1e-12);
});

test('untrusted times clamp to valid finite progress without coercing strings or objects', () => {
  for (const value of [undefined,null,NaN,'1000',{},-Infinity,-80]) assert.deepEqual(startupProgress(value),startupProgress(0));
  for (const value of [Infinity,2401,1e9]) assert.deepEqual(startupProgress(value),startupProgress(2400));
  for (let t=0;t<=2400;t++) assert.ok(Object.values(startupProgress(t)).every(Number.isFinite));
});

test('progress is monotonic, bounded and continuous at each timing boundary', () => {
  let previous=startupProgress(0);
  for(let t=1;t<=2400;t++) {
    const next=startupProgress(t);
    assert.ok(next.expansion>=previous.expansion&&next.reveal>=previous.reveal);
    assert.ok(next.titleOpacity<=previous.titleOpacity&&next.overlayOpacity<=previous.overlayOpacity&&next.sceneScale<=previous.sceneScale);
    for(const key of ['expansion','titleOpacity','reveal','overlayOpacity']) assert.ok(next[key]>=0&&next[key]<=1);
    previous=next;
  }
  for(const boundary of [1000,1165,1825,2100,2400]) {
    const left=startupProgress(boundary-.001),right=startupProgress(boundary+.001);
    for(const key of ['expansion','titleOpacity','titleOffset','sceneScale','reveal','overlayOpacity']) assert.ok(Math.abs(left[key]-right[key])<.00002,`${boundary}/${key} has no jump`);
  }
});

test('one frame is scheduled, natural completion occurs once, and completed play cannot replay', () => {
  const f=fixture(); assert.deepEqual(f.timeline.getState(),{timeMs:0,playing:false,rafActive:false,completed:false}); assert.equal(f.updates.length,0);
  f.timeline.play(); f.timeline.play(); assert.equal(f.frames.size,1); assert.equal(f.updates.length,1);
  f.frame(100); f.frame(1100); assert.equal(f.timeline.getState().timeMs,1000); assert.equal(f.frames.size,1);
  f.frame(2200); assert.equal(f.timeline.getState().timeMs,2100); f.frame(2500);
  assert.deepEqual(f.timeline.getState(),{timeMs:2400,playing:false,rafActive:false,completed:true}); assert.equal(f.completions.length,1); assert.equal(f.completions[0].completed,true); assert.equal(f.frames.size,0);
  const updates=f.updates.length; f.timeline.play(); f.timeline.finish(); f.timeline.pause(); f.frame(4000); assert.equal(f.updates.length,updates); assert.equal(f.completions.length,1);
});

test('pause retains time and resume establishes a fresh frame origin without counting the pause', () => {
  const f=fixture(); f.timeline.play(); f.frame(100); f.frame(500); f.timeline.pause();
  assert.equal(f.timeline.getState().timeMs,400); assert.equal(f.frames.size,0);
  f.timeline.play(); f.frame(90000); assert.equal(f.timeline.getState().timeMs,400); f.frame(90100); assert.equal(f.timeline.getState().timeMs,500);
  f.timeline.destroy(); assert.equal(f.completions.length,0); assert.equal(f.frames.size,0);
});

test('skip and destruction invalidate previously captured callbacks without clearing a new frame', () => {
  const f=fixture(); f.timeline.play(); const old=[...f.frames.values()][0]; f.timeline.pause(); f.timeline.play();
  old(1000); assert.equal(f.frames.size,1); assert.equal(f.timeline.getState().timeMs,0);
  const skipped=[...f.frames.values()][0]; f.timeline.finish(); skipped(2000); f.timeline.finish();
  assert.equal(f.completions.length,1); assert.equal(f.updates.at(-1).timeMs,2400); assert.equal(f.frames.size,0);
  const g=fixture(); g.timeline.play(); const destroyed=[...g.frames.values()][0]; g.timeline.destroy(); destroyed(8000); g.timeline.finish(); g.timeline.play(); assert.equal(g.completions.length,0); assert.equal(g.frames.size,0); assert.equal(g.timeline.getState().completed,false);
});

test('invalid/backwards frame timestamps do not cause jumps, while long valid frames finish safely', () => {
  const f=fixture(); f.timeline.play(); f.frame(NaN); f.frame(1000); f.frame(1200); f.frame(1100); f.frame(Infinity); f.frame(1300);
  assert.equal(f.timeline.getState().timeMs,300); assert.equal(f.frames.size,1); f.frame(900000); assert.equal(f.completions.length,1); assert.equal(f.timeline.getState().timeMs,2400);
});

test('update callbacks may pause or finish immediately without leaving an extra scheduled frame', () => {
  let timeline;
  const f=fixture(value=>{if(value.timeMs===100)timeline.pause();}); timeline=f.timeline;
  timeline.play(); f.frame(0); f.frame(100); assert.equal(f.frames.size,0); assert.equal(timeline.getState().playing,false);
  let completes=0;
  const frames=new Map(); let count=0;
  const direct=createStartupTimeline({requestFrame:cb=>{frames.set(++count,cb);return count;},cancelFrame:id=>frames.delete(id),onUpdate:value=>{if(value.timeMs===0)direct.finish();},onComplete:()=>completes++});
  direct.play(); assert.equal(frames.size,0); assert.equal(completes,1); assert.equal(direct.getState().completed,true);
  assert.throws(()=>createStartupTimeline({}),TypeError);
});
