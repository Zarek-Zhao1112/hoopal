import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyLocker, createLockerRoom, resolveLockerSwipe } from '../../frontend/src/lineups/locker-room.js';

// Minimal DOM fixture with real ancestry, bubbling and capture transfer. It does
// not emulate layout or native Android system gestures; those need device QA.
class Element {
  constructor(tag, document) {
    Object.assign(this, { tagName: tag.toUpperCase(), ownerDocument: document, children: [], dataset: {}, style: {}, attributes: {}, listeners: new Map(), className: '', textContent: '' });
  }
  append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
  setAttribute(key, value) { this.attributes[key] = String(value); }
  getAttribute(key) { return this.attributes[key] ?? null; }
  addEventListener(type, callback, options) {
    const entries = this.listeners.get(type) ?? []; entries.push({ callback, capture: options === true || !!options?.capture }); this.listeners.set(type, entries);
  }
  removeEventListener(type, callback) { this.listeners.set(type, (this.listeners.get(type) ?? []).filter(entry => entry.callback !== callback)); }
  closest(selector) {
    const tags = selector.split(',').map(tag => tag.trim().toUpperCase());
    for (let node = this; node; node = node.parentElement) if (tags.includes(node.tagName)) return node;
    return null;
  }
  querySelectorAll(selector) {
    const tags = selector.split(',').map(tag => tag.trim().toUpperCase());
    return descendants(this).filter(node => tags.includes(node.tagName));
  }
  getBoundingClientRect() { return { width: 320, height: 260, x: 0, y: 0 }; }
  setPointerCapture(id) { this.ownerDocument.capture(id, this); }
  hasPointerCapture(id) { return this.ownerDocument.captures.get(id) === this; }
  releasePointerCapture(id) { if (this.hasPointerCapture(id)) this.ownerDocument.capture(id, null); }
}
function descendants(node) { return node.children.flatMap(child => [child, ...descendants(child)]); }
function emit(target, type, values = {}) {
  const event = { target, pointerId: 1, clientX: 0, clientY: 0, button: type === 'pointermove' ? -1 : 0, isPrimary: true, cancelable: true, defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.stopped = true; }, ...values };
  const path = [];
  for (let node = target; node; node = node.parentElement) path.push(node);
  for (const capture of [true, false]) for (const node of capture ? [...path].reverse() : path) {
    event.currentTarget = node;
    for (const entry of node.listeners.get(type) ?? []) if (entry.capture === capture) entry.callback(event);
    if (event.stopped) return event;
  }
  return event;
}
function fixture(count = 3, selectedIndex = 0, numbers = Array.from({ length: count }, (_, i) => i + 1), disabled = false) {
  const document = {
    captures: new Map(), createElement(tag) { return new Element(tag, this); },
    createElementNS(namespace, tag) { return new Element(tag, this); },
    capture(id, node) {
      const old = this.captures.get(id);
      if (node) this.captures.set(id, node); else this.captures.delete(id);
      if (old && old !== node) emit(old, 'lostpointercapture', { pointerId: id });
    },
  };
  document.defaultView = document.createElement('window');
  const changes = [], inspected = [];
  const profile = { id: 'profile', players: numbers.map((number, i) => ({ id: `member-${i}`, number, name: `队员${i}` })) };
  const room = createLockerRoom({ document, profile, selectedIndex, disabled,
    renderJersey() { const svg = document.createElement('svg'); svg.append(document.createElement('path')); return svg; },
    renderBadge() { const svg = document.createElement('svg'); svg.append(document.createElement('path')); return svg; },
    getName: player => player.name, onChange: (...args) => changes.push(args), onInspect: (...args) => inspected.push(args),
  });
  const find = className => descendants(room.element).find(node => node.className.split(' ').includes(className));
  const viewport = find('locker-viewport'), track = find('locker-track');
  const selected = () => Number(room.element.dataset.playerIndex);
  const currentBay = () => descendants(room.element).find(node => node.dataset.playerId === room.element.dataset.playerId && node.className === 'locker-bay');
  const shirt = () => descendants(currentBay()).find(node => node.tagName === 'SVG' && node.parentElement.className === 'locker-uniform');
  const shirtPath = () => shirt().children[0];
  const send = (type, target, values = {}) => {
    // Touch implicit capture starts on the hit child; explicit capture may then
    // transfer to the viewport and deliver a bubbling child lostcapture event.
    if (type === 'pointerdown') document.capture(values.pointerId ?? 1, target);
    const event = emit(document.captures.get(values.pointerId ?? 1) ?? target, type, values);
    if (type === 'pointerup' || type === 'pointercancel') document.capture(values.pointerId ?? 1, null);
    return event;
  };
  const swipe = (dx, dy = 0, cancelled = false, target = shirtPath()) => {
    send('pointerdown', target, { clientX: 100, clientY: 100 });
    const move = send('pointermove', target, { clientX: 100 + dx, clientY: 100 + dy });
    send(cancelled ? 'pointercancel' : 'pointerup', target, { clientX: 100 + dx, clientY: 100 + dy });
    return move;
  };
  return { room, document, profile, changes, inspected, find, viewport, track, selected, currentBay, shirtPath, send, swipe };
}

test('left drag advances from the actual first member and right drag returns, with ordered bays moving with the finger', () => {
  for (const count of [3, 4]) {
    const f = fixture(count), firstTransform = f.track.style.transform;
    assert.equal(f.selected(), 0);
    assert.deepEqual(f.track.children.filter(node => node.dataset.playerId).map(node => node.dataset.playerId), f.profile.players.map(player => player.id));
    assert.equal(f.track.children.length, count, 'only real viewport-wide cabinets are rendered');
    assert.equal(firstTransform, 'translate3d(calc(0% + 0px), 0, 0)');
    assert.equal(f.find('locker-swipe-hint').textContent, '第一位 · 向左滑看下一位');
    const child = f.shirtPath();
    f.send('pointerdown', child, { clientX: 160, clientY: 100 });
    assert.equal(f.send('pointermove', child, { clientX: 70, clientY: 100 }).defaultPrevented, true);
    assert.equal(f.track.style.transform, 'translate3d(calc(0% + -90px), 0, 0)', 'scene follows leftward finger movement');
    f.send('pointerup', child, { clientX: 70, clientY: 100 });
    assert.equal(f.selected(), 1);
    assert.equal(f.room.element.dataset.playerId, 'member-1');
    assert.equal(f.track.style.transform, 'translate3d(calc(-100% + 0px), 0, 0)', 'next bay settles one full viewport to the left');
    assert.equal(f.viewport.dataset.dragging, undefined);
    assert.equal(f.document.captures.size, 0);
    f.swipe(90);
    assert.equal(f.selected(), 0);
    assert.equal(f.track.style.transform, firstTransform);
    assert.deepEqual(f.changes, [['member-1', 1], ['member-0', 0]]);
  }
});

test('jersey number one is independent of the remembered member index and end limits', () => {
  const f = fixture(3, 2, [12, 23, 1]);
  assert.equal(f.profile.players[f.selected()].number, 1);
  assert.equal(f.find('locker-swipe-hint').textContent, '最后一位 · 向右滑返回', 'hint follows roster position, not jersey number');
  f.swipe(-90); assert.equal(f.selected(), 2, 'last member cannot advance even when wearing number one');
  assert.equal(f.find('locker-swipe-hint').textContent, '最后一位 · 向右滑返回');
  f.swipe(90); assert.equal(f.selected(), 1);
  assert.equal(f.find('locker-swipe-hint').textContent, '向左滑下一位，向右滑上一位');
  f.swipe(90); assert.equal(f.selected(), 0);
  assert.equal(f.find('locker-swipe-hint').textContent, '第一位 · 向左滑看下一位');
  f.swipe(90); assert.equal(f.selected(), 0);
  f.swipe(-90); assert.equal(f.selected(), 1);
});

test('SVG child capture transfer does not cancel the viewport drag, but lost viewport capture does', () => {
  const f = fixture(); const child = f.shirtPath();
  f.send('pointerdown', child, { clientX: 100, clientY: 100 });
  f.send('pointermove', child, { clientX: 20, clientY: 100 });
  assert.equal(f.document.captures.get(1), f.viewport);
  assert.equal(f.viewport.dataset.dragging, 'true');
  f.send('pointerup', child, { clientX: 10, clientY: 100 });
  assert.equal(f.selected(), 1, 'bubbling child lostcapture must be ignored');
  const nextChild = f.shirtPath();
  f.send('pointerdown', nextChild, { clientX: 100, clientY: 100 });
  f.send('pointermove', nextChild, { clientX: 20, clientY: 100 });
  f.document.capture(1, null);
  f.send('pointerup', nextChild, { clientX: 10, clientY: 100 });
  assert.equal(f.selected(), 1, 'genuine lost viewport capture cancels without committing');
});

test('vertical/diagonal start and pointercancel preserve the selection and restore the scene', () => {
  for (const [dx, dy, cancelled] of [[0, 100, false], [-70, 80, false], [-90, 0, true], [-20, 0, false]]) {
    const f = fixture(), before = f.track.style.transform;
    f.swipe(dx, dy, cancelled);
    assert.equal(f.selected(), 0); assert.deepEqual(f.changes, []);
    assert.equal(f.track.style.transform, before); assert.equal(f.viewport.dataset.dragging, undefined);
  }
  const f = fixture(), child = f.shirtPath();
  f.send('pointerdown', child, { clientX: 100, clientY: 100 });
  f.send('pointermove', child, { clientX: 103, clientY: 120 });
  f.send('pointermove', child, { clientX: 0, clientY: 120 });
  f.send('pointerup', child, { clientX: 0, clientY: 120 });
  assert.equal(f.selected(), 0, 'a vertical start cannot become a late horizontal swipe');
});

test('buttons, non-primary input and disabled scenes cannot begin a locker swipe', () => {
  const f = fixture(), button = f.document.createElement('button');
  const svg = f.document.createElement('svg'), path = f.document.createElement('path');
  svg.append(path); button.append(svg); f.viewport.append(button);
  f.swipe(-100, 0, false, path);
  assert.equal(f.selected(), 0, 'unrelated buttons keep their guard even with an SVG child');
  const child = f.shirtPath();
  f.send('pointerdown', child, { clientX: 100, clientY: 100, isPrimary: false });
  f.send('pointermove', child, { clientX: 0, clientY: 100 });
  f.send('pointerup', child, { clientX: 0, clientY: 100 });
  assert.equal(f.selected(), 0);
  const disabled = fixture(3, 0, [1, 2, 3], true);
  disabled.swipe(-100); assert.equal(disabled.selected(), 0);
});

test('the nameplate and its badge can start both swipe directions while a stationary tap still inspects', () => {
  for (const count of [3, 4]) {
    const f = fixture(count);
    const plateForCurrent = () => descendants(f.currentBay()).find(node => node.className === 'locker-nameplate');
    const firstPlate = plateForCurrent(), badgePath = firstPlate.children[0].children[0];
    f.swipe(-90, 0, false, badgePath);
    assert.equal(f.selected(), 1, 'left swipe from the actual badge SVG advances');
    const click = emit(firstPlate, 'click');
    assert.equal(click.defaultPrevented, true); assert.equal(f.inspected.length, 0);
    const secondPlate = plateForCurrent();
    f.swipe(90, 0, false, secondPlate.children[1]);
    assert.equal(f.selected(), 0, 'right swipe from the name span returns');
    emit(secondPlate, 'click'); assert.equal(f.inspected.length, 0, 'drag never opens inspection');
  }
  const tapped = fixture(), plate = descendants(tapped.currentBay()).find(node => node.className === 'locker-nameplate');
  tapped.send('pointerdown', plate.children[1], { clientX: 100, clientY: 100 });
  tapped.send('pointerup', plate.children[1], { clientX: 102, clientY: 101 });
  assert.equal(emit(plate, 'click').defaultPrevented, false);
  assert.equal(tapped.inspected.length, 1);
  assert.equal(tapped.inspected[0][0].id, 'member-0');
  assert.equal(tapped.selected(), 0);
});

test('navigation buttons and member dots use roster indices, with only one change per large gesture', () => {
  const f = fixture(4, 0, [23, 1, 7, 99]);
  f.swipe(-260); assert.equal(f.selected(), 1);
  emit(f.find('locker-arrow').parentElement.children.at(-1), 'click');
  assert.equal(f.selected(), 2);
  const dot = descendants(f.room.element).find(node => node.dataset.action === 'lineup-player-go' && node.dataset.index === '0');
  emit(dot, 'click'); assert.equal(f.selected(), 0);
  assert.equal(f.find('locker-arrow').disabled, true);
});

test('resize and destroy cancel an active gesture without leaking listeners or committing', () => {
  for (const destroy of [false, true]) {
    const f = fixture(), child = f.shirtPath(), before = f.track.style.transform;
    f.send('pointerdown', child, { clientX: 100, clientY: 100 });
    f.send('pointermove', child, { clientX: 20, clientY: 100 });
    if (destroy) f.room.destroy(); else emit(f.document.defaultView, 'resize');
    f.send('pointerup', child, { clientX: 0, clientY: 100 });
    assert.equal(f.selected(), 0); assert.deepEqual(f.changes, []); assert.equal(f.track.style.transform, before);
    assert.equal(f.document.captures.size, 0);
    if (destroy) assert.ok([...f.viewport.listeners.values()].every(entries => entries.length === 0));
  }
});

test('pure swipe resolver uses the configured direction and geometric threshold, not jersey numbering', () => {
  assert.equal(resolveLockerSwipe({ index: 0, count: 3, dx: -100 }), 1);
  assert.equal(resolveLockerSwipe({ index: 1, count: 3, dx: 100 }), 0);
  assert.equal(resolveLockerSwipe({ index: 0, count: 3, dx: 100 }), 0);
  assert.equal(resolveLockerSwipe({ index: 2, count: 3, dx: -100 }), 2);
  assert.equal(resolveLockerSwipe({ index: 0, count: 4, dx: -200, cancelled: true }), 0);
  assert.equal(resolveLockerSwipe({ index: 0, count: 4, dx: -30, width: 500 }), 0);
});

test('empty cabinet shares an open wooden hanger without jerseys, buttons or player state', () => {
  const { document } = fixture();
  const empty = createEmptyLocker({ document }), all = descendants(empty);
  assert.equal(empty.getAttribute('role'), 'img');
  assert.match(empty.getAttribute('aria-label'), /等待入队/);
  assert.equal(all.filter(node => node.className === 'locker-bay').length, 1);
  assert.equal(all.filter(node => node.className === 'locker-nameplate')[0].textContent, '等待入队');
  assert.equal(all.filter(node => node.tagName === 'BUTTON').length, 0);
  assert.equal(all.filter(node => node.className === 'locker-uniform').length, 0);
  const frame = all.find(node => node.getAttribute('fill-rule') === 'evenodd');
  assert.ok(frame, 'wooden frame uses an actual transparent cutout');
  assert.ok((frame.getAttribute('d').match(/M/g) || []).length >= 2);
  assert.equal(all.find(node => node.tagName === 'SVG').getAttribute('focusable'), 'false');
});

test('single-cabinet selection keeps all non-current nameplates genuinely disabled and out of tab order', () => {
  const f = fixture(4, 2);
  function check() {
    const bays = f.track.children;
    assert.equal(bays.length, 4);
    bays.forEach((bay, index) => {
      const active = index === f.selected();
      assert.equal(bay.getAttribute('aria-hidden'), String(!active));
      for (const button of bay.querySelectorAll('button')) {
        assert.equal(button.disabled, !active);
        assert.equal(button.tabIndex, active ? 0 : -1);
      }
    });
  }
  check(); f.swipe(-90); check(); f.swipe(90); check();
  assert.equal(f.selected(), 2);
});
