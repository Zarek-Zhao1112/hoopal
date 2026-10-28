import test from 'node:test';
import assert from 'node:assert/strict';
import { createWizardMotion, attachWizardSwipe } from '../../frontend/src/lineups/wizard-motion.js';

class Target {
  listeners = new Map();
  addEventListener(type, callback) { const list = this.listeners.get(type) || []; list.push(callback); this.listeners.set(type, list); }
  removeEventListener(type, callback) { this.listeners.set(type, (this.listeners.get(type) || []).filter(fn => fn !== callback)); }
  emit(type, properties = {}) {
    const event = { target: this, preventDefault() { this.prevented = true; }, stopImmediatePropagation() { this.stopped = true; }, ...properties };
    for (const callback of [...(this.listeners.get(type) || [])]) { callback(event); if (event.stopped) break; }
    return event;
  }
  get listenerCount() { return [...this.listeners.values()].reduce((sum, list) => sum + list.length, 0); }
}
class Element extends Target {
  constructor(tag, document, namespaceURI = 'http://www.w3.org/1999/xhtml') {
    super(); Object.assign(this, { tagName: tag, ownerDocument: document, namespaceURI, children: [], attrs: new Map(), style: {}, dataset: {}, disabled: false, value: '', open: false });
    this.classes = new Set(); this.classList = { add: (...names) => names.forEach(name=>this.classes.add(name)) };
    this.captures = new Set();
  }
  get attributes() { return [...this.attrs].map(([name,value])=>({name,value})); }
  setAttribute(name, value) { this.attrs.set(name, String(value)); }
  getAttribute(name) { return this.attrs.get(name) ?? null; }
  removeAttribute(name) { this.attrs.delete(name); }
  get isConnected() { return this === this.ownerDocument.body || Boolean(this.parentElement?.isConnected); }
  append(...nodes) { for (const node of nodes) { node.remove(); node.parentElement = this; this.children.push(node); } }
  remove() { if (this.parentElement) this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1); this.parentElement = null; }
  replaceChildren(...nodes) { for (const child of [...this.children]) child.remove(); this.append(...nodes); }
  matches(selector) {
    return selector.split(',').some(part => {
      part = part.trim();
      if (part === '*') return true;
      if (part.startsWith('[')) return this.attrs.has(part.slice(1,-1).split('=')[0]) || part === '[hidden]' && this.hidden;
      return part.toLowerCase() === this.tagName.toLowerCase();
    });
  }
  closest(selector) { for (let node = this; node; node = node.parentElement) if (node.matches(selector)) return node; return null; }
  querySelectorAll(selector) { return this.children.flatMap(child=>[...(child.matches(selector)?[child]:[]),...child.querySelectorAll(selector)]); }
  cloneNode(deep) {
    const copy = new Element(this.tagName, this.ownerDocument, this.namespaceURI);
    copy.attrs = new Map(this.attrs); copy.style = { ...this.style }; copy.dataset = { ...this.dataset };
    copy.value = this.value; copy.disabled = this.disabled; copy.classes = new Set(this.classes);
    if (deep) copy.append(...this.children.map(child=>child.cloneNode(true)));
    return copy;
  }
  getBoundingClientRect() { return { x: 0, y: 0, width: 320, height: 300 }; }
  hasPointerCapture(id) { return this.captures.has(id); }
  setPointerCapture(id) { this.captures.add(id); }
  releasePointerCapture(id) { this.captures.delete(id); this.emit('lostpointercapture', { pointerId: id }); }
}
function fixture() {
  const document = new Target(), window = new Target(), media = new Target();
  const frames = new Map(), timers = new Map(), observers = []; let sequence = 0, time = 0;
  document.defaultView = window; document.hidden = false; window.visualViewport = new Target();
  window.performance = { now: () => time }; media.matches = false; window.matchMedia = () => media;
  window.requestAnimationFrame = callback => { frames.set(++sequence, callback); return sequence; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.setTimeout = (callback, delay) => { timers.set(++sequence, { callback, delay }); return sequence; };
  window.clearTimeout = id => timers.delete(id);
  window.MutationObserver = class { constructor(callback) { this.callback = callback; observers.push(this); } observe() {} disconnect() { this.disconnected = true; } };
  document.createElement = tag=>new Element(tag, document);
  document.body = document.createElement('body');
  const dialog = document.createElement('dialog'); dialog.open = true; dialog.dataset.phase = 'open';
  const host = document.createElement('div'), page = document.createElement('section');
  document.body.append(dialog); dialog.append(host); host.append(page);
  const motion = createWizardMotion({ document });
  const frame = () => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback=>callback(time)); };
  const finish = () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(({callback,delay})=>{time+=delay;callback();}); };
  const replace = () => { const snapshot = motion.capture(host.children[0]); const next = document.createElement('section'); host.replaceChildren(next); return { snapshot, page: next }; };
  const play = (options={}) => { const next = replace(); motion.play({host,...next,...options}); return next; };
  return { document, window, media, frames, timers, observers, host, page, dialog, motion, frame, finish, replace, play, advance: ms=>{time+=ms;} };
}

test('forward step moves only the inner page, settles after 320ms, and never locks the live controls', () => {
  const f = fixture(), { page, snapshot } = f.play();
  const control = f.document.createElement('button'); page.append(control);
  assert.equal(f.motion.state.duration, 320); assert.equal(f.motion.state.running, true);
  assert.equal(page.style.transform, 'translateX(27px)'); assert.equal(snapshot.style.transform, 'translateX(0)');
  assert.equal(f.host.dataset.transitioning, 'true'); assert.equal(snapshot.dataset.wizardSnapshot, 'true');
  assert.equal(control.disabled, false); assert.equal(f.dialog.style.transform, undefined);
  f.frame(); assert.equal(page.style.transform, 'translateX(0)'); assert.equal(snapshot.style.transform, 'translateX(-22px)');
  assert.equal([...f.timers.values()][0].delay, 320); f.finish();
  assert.equal(f.motion.state.running, false); assert.equal(snapshot.isConnected, false); assert.equal(f.host.children.length, 1); assert.equal(f.host.dataset.transitioning, 'false');
  f.motion.destroy();
});

test('backward member transition reverses direction and uses the approved shorter duration', () => {
  const f = fixture(), { page, snapshot } = f.play({ kind: 'player', forward: false });
  assert.equal(page.style.transform, 'translateX(-27px)'); assert.equal(f.motion.state.duration, 280);
  f.frame(); assert.equal(snapshot.style.transform, 'translateX(22px)'); assert.equal([...f.timers.values()][0].delay, 280);
  f.motion.destroy(); assert.equal(f.timers.size, 0); assert.equal(page.style.opacity, '1');
});

test('captured copies have no business identities or focusable controls, and SVG references remain self-contained', () => {
  const f = fixture(), input = f.document.createElement('input'), link = f.document.createElement('a');
  input.setAttribute('id','real-name'); input.setAttribute('data-action','lineup-name'); input.setAttribute('autofocus',''); input.value='保留的输入';
  link.setAttribute('href','#real-name'); link.setAttribute('tabindex','0');
  const svg = new Element('svg', f.document, 'http://www.w3.org/2000/svg'), gradient = new Element('linearGradient', f.document, svg.namespaceURI), shape = new Element('path', f.document, svg.namespaceURI), use = new Element('use', f.document, svg.namespaceURI);
  gradient.setAttribute('id','kit-gradient'); shape.setAttribute('id','kit-shape'); shape.setAttribute('fill','url(#kit-gradient)'); shape.setAttribute('style',"stroke:url('#kit-gradient')"); use.setAttribute('href','#kit-shape');
  svg.append(gradient,shape,use); f.page.append(input,link,svg); f.page.setAttribute('data-current','true');
  const a = f.motion.capture(f.page), b = f.motion.capture(f.page), all = [a,...a.querySelectorAll('*')];
  assert.equal(a.getAttribute('aria-hidden'),'true'); assert.equal(a.getAttribute('inert'),''); assert.equal(a.getAttribute('data-current'),null);
  assert.ok(all.every(node=>node.getAttribute('data-action')===null));
  const oldInput = all.find(n=>n.tagName==='input'); assert.equal(oldInput.getAttribute('id'),null); assert.equal(oldInput.disabled,true); assert.equal(oldInput.tabIndex,-1); assert.equal(oldInput.getAttribute('value'),'保留的输入'); assert.equal(oldInput.getAttribute('autofocus'),null);
  const aGradient = all.find(n=>n.tagName==='linearGradient').getAttribute('id'), aShape = all.find(n=>n.tagName==='path');
  assert.notEqual(aGradient,'kit-gradient'); assert.equal(aShape.getAttribute('fill'),`url(#${aGradient})`); assert.equal(aShape.getAttribute('style'),`stroke:url(#${aGradient})`);
  assert.equal(all.find(n=>n.tagName==='use').getAttribute('href'),`#${aShape.getAttribute('id')}`);
  assert.notEqual(aGradient,b.querySelectorAll('*').find(n=>n.tagName==='linearGradient').getAttribute('id')); assert.equal(input.disabled,false); assert.equal(gradient.getAttribute('id'),'kit-gradient');
  f.motion.destroy();
});

test('capture cancels an unfinished page, and obsolete frame/timer callbacks cannot alter the next generation', () => {
  const f = fixture(); f.play(); const obsoleteFrame = [...f.frames.values()][0];
  const next = f.play({kind:'player'}); assert.equal(f.frames.size,1); obsoleteFrame(); assert.equal(f.frames.size,1); assert.equal(next.page.style.transform,'translateX(27px)');
  f.frame(); const obsoleteTimer = [...f.timers.values()][0].callback;
  const third = f.play({forward:false}); const token = f.motion.state.token;
  obsoleteTimer(); assert.equal(f.motion.state.token,token); assert.equal(f.motion.state.running,true); assert.equal(third.snapshot.isConnected,true); assert.equal(f.frames.size,1);
  const copy = f.motion.capture(third.page); assert.equal(copy.style.transform,'translateX(0)'); assert.equal(copy.style.opacity,'1'); assert.equal(f.frames.size,0); assert.equal(f.timers.size,0);
  assert.equal(f.motion.capture(null),null); f.motion.destroy();
});

test('background, resize, reduced motion, shell closing and removed hosts cancel without leaving ghosts', () => {
  for (const interrupt of [f=>f.window.emit('resize'),f=>f.window.visualViewport.emit('resize'),f=>f.window.emit('pagehide'),f=>{f.document.hidden=true;f.document.emit('visibilitychange');},f=>{f.media.matches=true;f.media.emit('change');},f=>{f.dialog.dataset.phase='closing';f.observers[0].callback();},f=>{f.host.remove();f.observers[0].callback();}]) {
    const f=fixture(), {page,snapshot}=f.play(); f.frame(); interrupt(f);
    assert.equal(f.motion.state.running,false); assert.equal(f.frames.size,0); assert.equal(f.timers.size,0); assert.equal(snapshot.parentElement,null); assert.equal(page.style.transform,'translateX(0)'); f.motion.destroy();
  }
});

test('invalid, detached, reduced and destroyed requests stay static, with all lifecycle listeners released', () => {
  const f=fixture(); f.media.matches=true; const next=f.replace();
  assert.equal(f.motion.play({host:f.host,...next}),false); assert.equal(f.frames.size,0); assert.equal(next.page.style.opacity,'1');
  assert.equal(f.host.dataset.transitioning,'false'); assert.equal(f.host.dataset.duration,'320');
  assert.equal(f.motion.play({host:f.host,page:next.page,snapshot:{}}),false);
  f.media.matches=false; const detached=f.document.createElement('section'); assert.equal(f.motion.play({host:f.host,page:detached,snapshot:next.snapshot}),false);
  f.motion.destroy(); f.motion.destroy(); assert.equal(f.window.listenerCount,0); assert.equal(f.document.listenerCount,0); assert.equal(f.media.listenerCount,0); assert.equal(f.window.visualViewport.listenerCount,0); assert.equal(f.observers[0].disconnected,true);
  assert.equal(f.motion.capture(f.page),null); assert.equal(f.motion.play({host:f.host,...f.replace()}),false);
});

function swipeFixture() {
  const f=fixture(), steps=[]; let disabled=false;
  const element=f.page;
  const swipe=attachWizardSwipe({element,isDisabled:()=>disabled,onStep:delta=>steps.push(delta)});
  const down=(x=100,y=100,target=element,id=7)=>element.emit('pointerdown',{pointerId:id,clientX:x,clientY:y,target,button:0,isPrimary:true});
  const move=(x,y=100,id=7)=>f.window.emit('pointermove',{pointerId:id,clientX:x,clientY:y});
  const up=(x,y=100,id=7)=>f.window.emit('pointerup',{pointerId:id,clientX:x,clientY:y});
  return {...f,element,steps,swipe,down,move,up,setDisabled:value=>{disabled=value;}};
}
test('left/right drags commit once beyond 45px; short gestures and final pullbacks do not change members', () => {
  const f=swipeFixture();
  f.down(); f.move(55.1); f.up(55.1); assert.deepEqual(f.steps,[]);
  f.down(); f.move(55); f.up(55); f.down(); f.move(146); f.up(146); assert.deepEqual(f.steps,[1,-1]);
  f.down(); f.move(30); f.up(80); assert.deepEqual(f.steps,[1,-1]);
  f.down(); f.move(0); f.up(0,100,9); assert.deepEqual(f.steps,[1,-1]); f.up(0); assert.deepEqual(f.steps,[1,-1,1]);
  assert.equal(f.element.captures.size,0); f.swipe.destroy(); f.motion.destroy();
});
test('vertical intent and interactive descendants preserve scrolling, typing and ordinary clicks', () => {
  const f=swipeFixture(); f.down(); const move=f.move(90,135); f.move(0,135); f.up(0,135); assert.equal(move.prevented,undefined); assert.deepEqual(f.steps,[]);
  for(const tag of ['button','input','select','textarea','a','summary']) {
    const control=f.document.createElement(tag), icon=f.document.createElement('span'); control.append(icon); f.element.append(control);
    f.down(100,100,icon); f.move(0); f.up(0);
  }
  assert.deepEqual(f.steps,[]); f.swipe.destroy(); f.motion.destroy();
});
test('cancel, dynamic busy, hidden and lost capture do not commit, while descendant capture loss is ignored', () => {
  const f=swipeFixture(); f.down(); f.move(0); f.window.emit('pointercancel',{pointerId:7}); assert.deepEqual(f.steps,[]);
  f.down(); f.move(0); f.setDisabled(true); f.up(0); f.setDisabled(false); assert.deepEqual(f.steps,[]);
  f.down(); f.move(0); f.document.hidden=true; f.document.emit('visibilitychange'); f.document.hidden=false; f.up(0); assert.deepEqual(f.steps,[]);
  f.down(); f.move(0); f.element.emit('lostpointercapture',{pointerId:7,target:f.document.createElement('span')}); f.up(0); assert.deepEqual(f.steps,[1]);
  f.down(); f.move(0); f.element.emit('lostpointercapture',{pointerId:7}); f.up(0); assert.deepEqual(f.steps,[1]);
  const ghost=f.element.emit('click'); assert.equal(ghost.prevented,true); f.advance(351); assert.equal(f.element.emit('click').prevented,undefined);
  f.swipe.destroy(); f.motion.destroy();
});
test('destroyed swipe releases capture/listeners and cannot invoke a stale member callback', () => {
  const f=swipeFixture(); f.down(); f.move(0); const staleUp=[...f.window.listeners.get('pointerup')][0];
  f.swipe.destroy(); f.swipe.destroy(); staleUp({pointerId:7,clientX:0,clientY:100}); f.up(0);
  assert.deepEqual(f.steps,[]); assert.equal(f.element.captures.size,0); assert.equal(f.element.listenerCount,0);
  f.motion.destroy(); assert.equal(f.window.listenerCount,0); assert.equal(f.document.listenerCount,0);
});
