const SVG_NS = 'http://www.w3.org/2000/svg';
let snapshotSequence = 0;

function normalize(page) {
  if (!page?.style) return;
  page.style.transition = 'none'; page.style.transform = 'translateX(0)'; page.style.opacity = '1';
}

/** Visual-only copy: no old business handlers, identities or reachable controls. */
function copyPage(page) {
  const snapshot = page.cloneNode(true), elements = [snapshot, ...snapshot.querySelectorAll('*')];
  const prefix = `wizard-copy-${++snapshotSequence}-`, references = new Map();
  for (const element of elements) {
    const id = element.getAttribute('id');
    if (id && element.namespaceURI === SVG_NS) references.set(id, `${prefix}${references.size}`);
  }
  for (const element of elements) {
    for (const attribute of [...element.attributes]) {
      const { name, value } = attribute;
      if (name.startsWith('data-') || name.startsWith('on') || ['autofocus', 'for', 'aria-labelledby', 'aria-describedby', 'name', 'contenteditable'].includes(name)) {
        element.removeAttribute(name); continue;
      }
      if (name === 'id') {
        if (element.namespaceURI === SVG_NS) element.setAttribute(name, references.get(value));
        else element.removeAttribute(name);
        continue;
      }
      let replaced = value.replace(/url\(\s*(['"]?)#([^\s)'";]+)\1\s*\)/g, (match, quote, id) => references.has(id) ? `url(#${references.get(id)})` : match);
      if ((name === 'href' || name === 'xlink:href') && value.startsWith('#') && references.has(value.slice(1))) replaced = `#${references.get(value.slice(1))}`;
      if (replaced !== value) element.setAttribute(name, replaced);
    }
    if (element.matches('button,input,select,textarea,option,fieldset')) element.disabled = true;
    if (element.matches('button,input,select,textarea,a,summary,[tabindex]')) element.tabIndex = -1;
    if (element.namespaceURI !== SVG_NS && element.matches('a')) element.removeAttribute('href');
    if (element.matches('input')) element.setAttribute('value', element.value || '');
  }
  snapshot.classList.add('wizard-motion-snapshot');
  snapshot.setAttribute('aria-hidden', 'true'); snapshot.setAttribute('inert', '');
  snapshot.dataset.motionRole = 'snapshot'; snapshot.dataset.wizardSnapshot = 'true'; snapshot.style.pointerEvents = 'none';
  normalize(snapshot);
  return snapshot;
}

/** Animates only a wizard's inner page; its native dialog shell stays fixed. */
export function createWizardMotion({ document }) {
  const window = document.defaultView, media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let destroyed = false, token = 0, frame = null, timer = null, active = null;
  let last = { running: false, kind: 'step', forward: true, duration: 320, token };
  const usable = page => {
    if (!page || page.isConnected === false || document.hidden || page.closest('[hidden]')) return false;
    const dialog = page.closest('dialog');
    return !dialog || dialog.open && dialog.dataset.phase !== 'closing' && dialog.dataset.phase !== 'closed';
  };
  function cancel() {
    token++;
    if (frame !== null) window.cancelAnimationFrame(frame);
    if (timer !== null) window.clearTimeout(timer);
    frame = null; timer = null;
    if (active) {
      active.snapshot.remove(); normalize(active.page);
      active.host.dataset.wizardMotion = 'idle'; active.host.dataset.transitioning = 'false';
      active = null;
    }
    last = { ...last, running: false, token };
  }
  function capture(page) {
    cancel(); normalize(page);
    return !destroyed && page?.cloneNode ? copyPage(page) : null;
  }
  function play({ host, page, snapshot, kind = 'step', forward = true } = {}) {
    cancel(); normalize(page);
    const duration = kind === 'player' ? 280 : 320;
    last = { running: false, kind: kind === 'player' ? 'player' : 'step', forward: Boolean(forward), duration, token };
    if (host?.dataset) {
      host.dataset.wizardMotion = 'idle'; host.dataset.transitioning = 'false';
      host.dataset.motion = last.kind; host.dataset.direction = forward ? 'forward' : 'back'; host.dataset.duration = String(duration);
    }
    const validSnapshot = snapshot?.dataset?.wizardSnapshot === 'true' && typeof snapshot.remove === 'function';
    if (destroyed || !host || !page || page.parentElement !== host || !validSnapshot || snapshot === page || !usable(page) || media?.matches) {
      if (validSnapshot && snapshot !== page) snapshot.remove();
      return false;
    }
    const current = token, sign = forward ? 1 : -1;
    active = { host, page, snapshot };
    page.dataset.motionRole = 'live'; page.dataset.current = 'true';
    host.dataset.wizardMotion = 'running'; host.dataset.transitioning = 'true';
    host.append(snapshot);
    page.style.transform = `translateX(${sign * 27}px)`; page.style.opacity = '0';
    normalize(snapshot);
    page.getBoundingClientRect();
    last = { ...last, running: true };
    frame = window.requestAnimationFrame(() => {
      if (current !== token || !active || destroyed) return;
      frame = null;
      if (!usable(page)) { cancel(); return; }
      const transition = `transform ${duration}ms cubic-bezier(.22,.7,.25,1), opacity ${duration}ms`;
      page.style.transition = transition; snapshot.style.transition = transition;
      page.style.transform = 'translateX(0)'; page.style.opacity = '1';
      snapshot.style.transform = `translateX(${-sign * 22}px)`; snapshot.style.opacity = '0';
      timer = window.setTimeout(() => { if (current === token && !destroyed) cancel(); }, duration);
    });
    return true;
  }
  const visibility = () => { if (document.hidden) cancel(); };
  const reduced = () => { if (media.matches) cancel(); };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pagehide', cancel); window.addEventListener('resize', cancel);
  window.visualViewport?.addEventListener('resize', cancel);
  if (media?.addEventListener) media.addEventListener('change', reduced);
  else media?.addListener?.(reduced);
  const observer = window.MutationObserver ? new window.MutationObserver(() => { if (active && !usable(active.page)) cancel(); }) : null;
  if (document.body) observer?.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'open', 'data-phase'] });
  return {
    capture, play, cancel,
    get state() { return { ...last }; },
    destroy() {
      if (destroyed) return;
      cancel(); destroyed = true; observer?.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', cancel); window.removeEventListener('resize', cancel);
      window.visualViewport?.removeEventListener('resize', cancel);
      if (media?.removeEventListener) media.removeEventListener('change', reduced);
      else media?.removeListener?.(reduced);
    },
  };
}

/** A deliberate horizontal gesture; controls retain ordinary clicks and typing. */
export function attachWizardSwipe({ element, isDisabled = () => false, onStep }) {
  const document = element.ownerDocument, window = document.defaultView;
  let gesture = null, destroyed = false, suppressUntil = 0;
  const now = () => window.performance?.now?.() ?? Date.now();
  const blocked = () => destroyed || isDisabled() || document.hidden || element.isConnected === false || Boolean(element.closest('[hidden]'));
  const interactive = target => target?.closest?.('button,input,select,textarea,a,summary,[contenteditable]:not([contenteditable="false"]),[role="button"]');
  function release(pointerId) {
    try { if (element.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId); } catch { /* The pointer may already have ended. */ }
  }
  function finish(event, cancelled = false) {
    if (!gesture || event.pointerId !== gesture.id) return;
    const previous = gesture;
    gesture = null; release(previous.id);
    const x = Number.isFinite(event.clientX) ? event.clientX : previous.lastX;
    const y = Number.isFinite(event.clientY) ? event.clientY : previous.lastY;
    const dx = x - previous.x, dy = y - previous.y;
    if (previous.axis === 'horizontal') suppressUntil = now() + 350;
    if (!cancelled && !blocked() && previous.axis === 'horizontal' && Math.abs(dx) >= 45 && Math.abs(dx) > Math.abs(dy) * 1.25) onStep?.(dx < 0 ? 1 : -1);
  }
  function down(event) {
    if (gesture || blocked() || event.isPrimary === false || event.button != null && event.button !== 0 || interactive(event.target)) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, axis: '' };
  }
  function move(event) {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (blocked()) { finish(event, true); return; }
    gesture.lastX = event.clientX; gesture.lastY = event.clientY;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 10) gesture.axis = Math.abs(dx) > Math.abs(dy) * 1.25 ? 'horizontal' : 'vertical';
    if (gesture.axis === 'horizontal') {
      event.preventDefault();
      try { if (!element.hasPointerCapture?.(gesture.id)) element.setPointerCapture(gesture.id); } catch { /* Global listeners still receive an uncaptured gesture. */ }
    }
  }
  const up = event => finish(event), cancel = event => finish(event, true);
  const lost = event => { if (event.target === element) finish(event, true); };
  const interrupt = () => { if (gesture) finish({ pointerId: gesture.id }, true); };
  const hidden = () => { if (document.hidden) interrupt(); };
  const click = event => { if (now() < suppressUntil) { event.preventDefault(); event.stopImmediatePropagation(); } };
  element.addEventListener('pointerdown', down); element.addEventListener('lostpointercapture', lost); element.addEventListener('click', click, true);
  window.addEventListener('pointermove', move, { passive: false }); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', cancel);
  window.addEventListener('pagehide', interrupt); window.addEventListener('resize', interrupt); document.addEventListener('visibilitychange', hidden);
  return { destroy() {
    if (destroyed) return;
    interrupt(); destroyed = true;
    element.removeEventListener('pointerdown', down); element.removeEventListener('lostpointercapture', lost); element.removeEventListener('click', click, true);
    window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', cancel);
    window.removeEventListener('pagehide', interrupt); window.removeEventListener('resize', interrupt); document.removeEventListener('visibilitychange', hidden);
  } };
}
