/** One gesture advances at most one bay. Cancellation never changes selection. */
export function resolveLockerSwipe({ index, count, dx, dy = 0, width = 320, axis = 'horizontal', cancelled = false }) {
  const current = Math.max(0, Math.min(Math.max(0, count - 1), index));
  const threshold = Math.min(64, Math.max(30, width * .12));
  if (cancelled || axis !== 'horizontal' || Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy) * 1.15) return current;
  return Math.max(0, Math.min(count - 1, current + (dx < 0 ? 1 : -1)));
}

function cabinetParts(document) {
  const make = (tag, className) => {
    const node = document.createElement(tag); node.className = className; return node;
  };
  const svgNode = (tag, attrs = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };
  const bay = make('div', 'locker-bay'), niche = make('div', 'locker-niche'), hanger = make('div', 'locker-hanger');
  const drawing = svgNode('svg', { viewBox: '0 0 120 64', 'aria-hidden': 'true', focusable: 'false' });
  drawing.append(
    svgNode('path', { d: 'M60 23V16C60 12 70 12 70 6C70-1 57-1 56 6', fill: 'none', stroke: '#78909D', 'stroke-width': 3.2, 'stroke-linecap': 'round' }),
    svgNode('path', { d: 'M58 22 15 46Q9 51 17 55H103Q111 51 104 46L66 23Q62 20 58 22ZM60 31 31 46Q29 48 33 48H89Q93 48 90 46L64 31Q62 29 60 31Z', fill: '#D4B58F', 'fill-rule': 'evenodd', stroke: '#A28460', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }),
    svgNode('path', { d: 'M22 46 58 26M29 51H93M67 28 98 46', fill: 'none', stroke: '#F4DEC0', 'stroke-width': 1.4, 'stroke-linecap': 'round', opacity: .75 }),
  );
  hanger.append(drawing);
  niche.append(make('div', 'locker-rail'), hanger);
  bay.append(make('div', 'locker-floor'), make('div', 'locker-vents'), niche, make('div', 'locker-underbench'), make('div', 'locker-bench'));
  return { bay, niche };
}

/** A non-interactive empty cabinet, sharing the same local materials as real bays. */
export function createEmptyLocker({ document }) {
  const stage = document.createElement('div');
  stage.className = 'locker-empty-stage locker-open-empty';
  stage.setAttribute('role', 'img');
  stage.setAttribute('aria-label', '等待入队的开放式更衣柜，柜内有木衣架');
  const { bay } = cabinetParts(document), plate = document.createElement('span');
  plate.className = 'locker-nameplate'; plate.textContent = '等待入队';
  bay.append(plate); stage.append(bay);
  return stage;
}

/** One viewport-wide cabinet at rest; the whole cabinet follows the finger. */
export function createLockerRoom({ document, profile, swipeSurface, selectedIndex = 0, renderJersey, renderBadge, getName, onChange, onInspect, disabled = false }) {
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const scene = make('section', 'locker-scene');
  scene.dataset.profileId = profile.id;
  scene.setAttribute('aria-label', '更衣室');
  const viewport = make('div', 'locker-viewport');
  const surface = swipeSurface ?? viewport;
  viewport.dataset.action = 'lineup-locker-swipe';
  viewport.tabIndex = disabled ? -1 : 0;
  viewport.setAttribute('role', 'group');
  viewport.setAttribute('aria-label', '球衣展示，左右滑动或按方向键切换球员');
  const track = make('div', 'locker-track');
  const controls = make('div', 'locker-controls');
  const dots = make('div', 'locker-dots');
  dots.setAttribute('aria-hidden', 'true');
  const position = make('span', 'locker-position sr-only');
  position.setAttribute('aria-live', 'polite');
  position.setAttribute('aria-atomic', 'true');
  let index = Math.max(0, Math.min(profile.players.length - 1, selectedIndex));
  let gesture = null, destroyed = false, suppressClickUntil = 0;
  const realBays = [], nameplates = [], indicators = [];
  const eventBindings = [];
  const listen = (node, event, callback, options) => {
    node.addEventListener(event, callback, options);
    eventBindings.push(() => node.removeEventListener(event, callback, options));
  };
  function roomBay(player, memberIndex) {
    const { bay, niche } = cabinetParts(document);
    bay.dataset.playerId = player.id; bay.dataset.playerIndex = String(memberIndex);
    const plate = make('button', 'locker-nameplate');
    if (renderBadge) plate.append(renderBadge());
    plate.append(make('span', 'locker-nameplate-name', getName(player, memberIndex)));
    plate.type = 'button'; plate.dataset.action = 'lineup-inspect-locker-name'; plate.dataset.playerId = player.id;
    plate.addEventListener('click', () => {
      if (!disabled && memberIndex === index) onInspect(player, memberIndex);
    });
    bay.append(plate); nameplates[memberIndex] = plate;
    const uniform = make('div', 'locker-uniform');
    uniform.append(renderJersey(player, memberIndex));
    niche.append(uniform);
    realBays[memberIndex] = bay;
    return bay;
  }
  for (let memberIndex = 0; memberIndex < profile.players.length; memberIndex++) track.append(roomBay(profile.players[memberIndex], memberIndex));
  viewport.append(track);
  for (let memberIndex = 0; memberIndex < profile.players.length; memberIndex++) {
    const dot = make('span', 'locker-dot');
    dot.append(make('span'));
    dots.append(dot);
    indicators.push(dot);
  }
  controls.append(dots, position);
  scene.append(viewport, controls);
  function setTransform(delta = 0) {
    // Each bay is exactly one viewport wide; no adjacent cabinet peeks at rest.
    track.style.transform = `translate3d(calc(${-index * 100}% + ${delta}px), 0, 0)`;
  }
  function sync() {
    scene.dataset.playerId = profile.players[index].id;
    scene.dataset.playerIndex = String(index);
    position.textContent = `第 ${index + 1} 位，共 ${profile.players.length} 位，${getName(profile.players[index], index)}`;
    indicators.forEach((dot, memberIndex) => {
      dot.setAttribute('aria-current', String(memberIndex === index));
      realBays[memberIndex].dataset.selected = String(memberIndex === index);
      realBays[memberIndex].setAttribute('aria-hidden', String(memberIndex !== index));
      realBays[memberIndex].inert = disabled || memberIndex !== index;
      // inert is an enhancement; Chromium/WebView 96 needs real focus guards.
      for (const control of realBays[memberIndex].querySelectorAll('button,input,select,textarea,a')) {
        const unavailable = disabled || memberIndex !== index;
        control.disabled = unavailable;
        control.tabIndex = unavailable ? -1 : 0;
      }
      nameplates[memberIndex].disabled = disabled || memberIndex !== index;
      nameplates[memberIndex].tabIndex = memberIndex === index ? 0 : -1;
    });
    setTransform();
  }
  function select(nextIndex) {
    if (disabled || destroyed) return;
    const bounded = Math.max(0, Math.min(profile.players.length - 1, nextIndex));
    cancelGesture();
    if (bounded === index) return;
    index = bounded; sync(); onChange(profile.players[index].id, index);
  }
  function release(pointerId) {
    try { if (surface.hasPointerCapture?.(pointerId)) surface.releasePointerCapture(pointerId); } catch { /* Pointer may already be released by the browser. */ }
  }
  function cancelGesture() {
    const active = gesture; gesture = null;
    delete viewport.dataset.dragging;
    if (active) release(active.pointerId);
    setTransform();
  }
  function pointerDown(event) {
    if (disabled || destroyed || event.isPrimary === false || event.button !== undefined && event.button !== 0) return;
    if (gesture) cancelGesture();
    suppressClickUntil = 0;
    if (!swipeSurface) {
      const control = event.target?.closest?.('button,input,select,textarea,a');
      if (control && control.dataset.action !== 'lineup-inspect-locker-name') return;
    }
    gesture = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastY: event.clientY, axis: 'pending', width: viewport.getBoundingClientRect().width || 320 };
  }
  function pointerMove(event) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const dx = event.clientX - gesture.startX, dy = event.clientY - gesture.startY;
    gesture.lastX = event.clientX; gesture.lastY = event.clientY;
    if (gesture.axis === 'pending') {
      if (Math.hypot(dx, dy) < 10) return;
      // A diagonal/vertical start is permanently ignored for this gesture.
      gesture.axis = Math.abs(dx) > Math.abs(dy) * 1.25 ? 'horizontal' : 'vertical';
      if (gesture.axis === 'horizontal') {
        viewport.dataset.dragging = 'true';
        try { surface.setPointerCapture?.(event.pointerId); } catch { /* Capture is optional for simulated input. */ }
      }
    }
    if (gesture.axis !== 'horizontal') return;
    if (event.cancelable) event.preventDefault();
    const edge = index === 0 && dx > 0 || index === profile.players.length - 1 && dx < 0;
    setTransform(Math.max(-gesture.width * .7, Math.min(gesture.width * .7, dx * (edge ? .18 : 1))));
  }
  function finish(event, cancelled = false) {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const active = gesture;
    const endX = Number.isFinite(event.clientX) ? event.clientX : active.lastX;
    const endY = Number.isFinite(event.clientY) ? event.clientY : active.lastY;
    const dx = endX - active.startX, dy = endY - active.startY;
    if (active.axis === 'horizontal' || (swipeSurface && active.axis === 'vertical')) {
      suppressClickUntil = Date.now() + 400;
    }
    const nextIndex = resolveLockerSwipe({ index, count: profile.players.length, dx, dy, width: active.width, axis: active.axis, cancelled });
    cancelGesture();
    if (!cancelled && nextIndex !== index) select(nextIndex);
  }
  listen(surface, 'pointerdown', pointerDown);
  listen(viewport, 'keydown', event => {
    if (disabled || event.target !== viewport || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    select(index + (event.key === 'ArrowLeft' ? -1 : 1));
  });
  listen(surface, 'pointermove', pointerMove, { passive: false });
  listen(surface, 'pointerup', event => finish(event));
  listen(surface, 'pointercancel', event => finish(event, true));
  listen(surface, 'pointerleave', event => {
    if (gesture?.pointerId === event.pointerId && !surface.hasPointerCapture?.(event.pointerId)) finish(event, true);
  });
  // Touch initially captures its hit child. Moving capture to the surface
  // releases that child's capture; its bubbling event must not cancel our drag.
  listen(surface, 'lostpointercapture', event => {
    if (event.target === surface) finish(event, true);
  });
  listen(surface, 'click', event => {
    if (event.detail === 0 || Date.now() >= suppressClickUntil) return;
    event.preventDefault(); event.stopPropagation();
  }, true);
  if (document.defaultView?.addEventListener) listen(document.defaultView, 'resize', cancelGesture);
  sync();
  return { element: scene, destroy() { destroyed = true; cancelGesture(); eventBindings.forEach(remove => remove()); } };
}
