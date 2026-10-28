import { createStartupTimeline, startupProgress, STARTUP_TIMING, STARTUP_DURATION } from './timeline.js';

// A cabinet is a small, bounded paint tree. Freeze only this subtree, never the app.
const PAINT = ('display position box-sizing width height min-width min-height max-width max-height top right bottom left inset margin padding border-top border-right border-bottom border-left border-radius background background-size background-position background-repeat box-shadow opacity overflow overflow-x overflow-y transform transform-origin filter clip-path isolation z-index flex flex-direction flex-wrap align-items align-self justify-content justify-self gap grid-template-columns grid-template-rows grid-column grid-row font-family font-size font-weight font-style line-height letter-spacing text-align text-overflow white-space color fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-linecap stroke-linejoin stop-color stop-opacity visibility object-fit object-position vertical-align').split(' ');

function cabinetSnapshot(source, document) {
  const win = document.defaultView;
  const clone = source.cloneNode(true), originals = [source, ...source.querySelectorAll('*')], copies = [clone, ...clone.querySelectorAll('*')];
  if (originals.length > 600) throw new Error('启动柜体超出安全快照范围');
  const ids = new Map();
  originals.forEach((node, index) => { if (node.id) ids.set(node.id, `startup-paint-${index}`); });
  const rewrite = value => String(value).replace(/url\(\s*["']?[^)"']*#([^\s)"']+)["']?\s*\)/g, (all, id) => ids.has(id) ? `url(#${ids.get(id)})` : 'none');
  originals.forEach((node, index) => {
    const copy = copies[index], computed = win.getComputedStyle(node);
    for (const attribute of [...copy.attributes]) {
      const name = attribute.name;
      if (name === 'id' || name === 'class' || name.startsWith('data-') || name.startsWith('on') || name.startsWith('aria-') || ['name', 'for', 'autofocus', 'contenteditable', 'tabindex', 'role'].includes(name)) copy.removeAttribute(name);
      else if (name === 'href' || name === 'xlink:href') {
        const id = attribute.value.slice(1);
        if (attribute.value[0] === '#' && ids.has(id)) copy.setAttribute(name, `#${ids.get(id)}`);
        else if (copy.localName !== 'image') copy.removeAttribute(name);
      } else if (attribute.value.includes('url(')) copy.setAttribute(name, rewrite(attribute.value));
    }
    if (node.id) copy.id = ids.get(node.id);
    copy.style.cssText = '';
    for (const property of PAINT) copy.style.setProperty(property, rewrite(computed.getPropertyValue(property)));
    copy.style.setProperty('pointer-events', 'none', 'important');
    copy.style.setProperty('transition', 'none', 'important');
    copy.style.setProperty('animation', 'none', 'important');
    if ('disabled' in copy) copy.disabled = true;
    if ('tabIndex' in copy) copy.tabIndex = -1;
    // Cabinet glow / bevel details use pseudo elements. Materialize their paint.
    if (node.namespaceURI === 'http://www.w3.org/1999/xhtml') for (const pseudo of ['::before', '::after']) {
      const paint = win.getComputedStyle(node, pseudo), content = paint.content;
      if (!content || content === 'none' || content === 'normal' || paint.display === 'none') continue;
      const detail = document.createElement('span');
      for (const property of PAINT) detail.style.setProperty(property, rewrite(paint.getPropertyValue(property)));
      detail.style.setProperty('pointer-events', 'none', 'important');
      if (content !== '""' && content !== "''") detail.textContent = content.replace(/^["']|["']$/g, '');
      if (pseudo === '::before') copy.insertBefore(detail, copy.firstChild); else copy.append(detail);
    }
  });
  // Strip inactive bays after freezing so only the visible player is copied.
  const bays = originals.flatMap((node, index) => node.classList?.contains('locker-bay') ? [copies[index]] : []);
  const visibleBay = originals.find(node => node.classList?.contains('locker-bay') && node.getAttribute('aria-hidden') !== 'true');
  if (bays.length > 1 && visibleBay) {
    const selected = copies[originals.indexOf(visibleBay)];
    bays.forEach(bay => { if (bay !== selected) bay.remove(); });
    const trackIndex = originals.findIndex(node => node.classList?.contains('locker-track'));
    if (trackIndex >= 0) copies[trackIndex].style.transform = 'none';
  }
  clone.style.position = 'absolute'; clone.style.inset = '0'; clone.style.margin = '0';
  clone.style.width = '100%'; clone.style.height = '100%'; clone.style.maxWidth = 'none'; clone.style.maxHeight = 'none';
  clone.setAttribute('aria-hidden', 'true');
  return clone;
}

export function createStartup({ document }) {
  const win = document.defaultView, get = id => document.getElementById(id);
  const screen = get('startup-screen'), frame = get('startup-frame'), media = get('startup-media'), cabinet = get('startup-cabinet'), rim = get('startup-rim'), brand = get('startup-brand'), skipButton = get('startup-skip'), status = get('startup-status'), errorBox = get('startup-error'), message = get('startup-message'), retry = get('startup-retry');
  if (![screen, frame, media, cabinet, rim, brand, skipButton, status, errorBox, message, retry].every(Boolean)) throw new Error('启动界面结构不完整');
  let active = true, initialized = false, failed = false, skipIntent = false, disposed = false, readyPromise = null, source = null, geometry = null, latest = startupProgress(0), snapshotMs = 0;
  const bindings = [], timers = new Set(), reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const listen = (node, type, handler, options) => { node.addEventListener(type, handler, options); bindings.push(() => node.removeEventListener(type, handler, options)); };
  const timer = (callback, delay) => { const id = win.setTimeout(() => { timers.delete(id); callback(); }, delay); timers.add(id); return id; };
  screen.hidden = false; screen.setAttribute('role', 'dialog'); screen.setAttribute('aria-modal', 'true'); screen.setAttribute('aria-label', '球搭正在启动'); screen.tabIndex = -1;
  document.body.classList.add('startup-active');
  function focusControl() { (failed ? retry : skipButton).focus({ preventScroll: true }); }
  // Guard actual events rather than restoring a stale disabled-state snapshot.
  const guard = event => { if (active && !screen.contains(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); } };
  for (const type of ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchend', 'wheel', 'contextmenu']) listen(document, type, guard, { capture: true, passive: false });
  listen(document, 'keydown', event => {
    if (!active) return;
    if (event.key === 'Tab') { event.preventDefault(); event.stopImmediatePropagation(); focusControl(); }
    else guard(event);
  }, true);
  listen(document, 'focusin', event => { if (active && !screen.contains(event.target)) focusControl(); }, true);
  const observer = new win.MutationObserver(() => { if (active && !screen.contains(document.activeElement)) focusControl(); });
  observer.observe(document.body, { childList: true });
  function clear() {
    bindings.splice(0).forEach(remove => remove()); observer.disconnect(); timers.forEach(id => win.clearTimeout(id)); timers.clear();
    document.body.classList.remove('startup-active');
    const restore = screen.contains(document.activeElement); screen.remove();
    if (restore) document.querySelector('body > .workspace, #lineups-panel')?.focus?.({ preventScroll: true });
  }
  function complete() { if (!active || failed) return; active = false; clear(); }
  const timeline = createStartupTimeline({ requestFrame: callback => win.requestAnimationFrame(callback), cancelFrame: id => win.cancelAnimationFrame(id), onUpdate: progress => { latest = progress; paint(); }, onComplete: complete });
  function measure() {
    if (!active) return;
    const rect = screen.getBoundingClientRect(), width = rect.width, height = rect.height, landscape = width >= 600 && height <= 600, compact = height < 500;
    let target = null;
    if (source?.isConnected) { const bounds = source.getBoundingClientRect(); if (bounds.width > 0 && bounds.height > 0) target = { left: bounds.left - rect.left, top: bounds.top - rect.top, width: bounds.width, height: bounds.height }; }
    // Brand occupies a reserved top band even before local reads complete.
    const band = compact ? 90 : height < 650 ? 174 : 245;
    const initialWidth = landscape ? Math.min(290, width * .36) : Math.min(300, width * .64);
    const initialHeight = landscape ? Math.min(245, height * .62) : Math.min(330, height * .39, Math.max(100, height - band - 35));
    const initialX = landscape ? width * .65 : width / 2;
    const initialY = landscape ? height * .57 : Math.max(band + initialHeight / 2, height * .60);
    geometry = { width, height, initialWidth, initialHeight, initialX, initialY, target };
    screen.dataset.compact = String(compact); screen.dataset.hasCabinet = String(!!target); paint();
  }
  function paint() {
    if (!active || !geometry) return;
    const g = geometry, p = latest, q = p.expansion, width = g.initialWidth + (g.width - g.initialWidth) * q, height = g.initialHeight + (g.height - g.initialHeight) * q;
    const cx = g.initialX + (g.width / 2 - g.initialX) * q, cy = g.initialY + (g.height / 2 - g.initialY) * q, left = cx - width / 2, top = cy - height / 2;
    const clip = `inset(${Math.max(0, top)}px ${Math.max(0, g.width - left - width)}px ${Math.max(0, g.height - top - height)}px ${Math.max(0, left)}px round ${27 * (1 - q)}px)`;
    frame.style.clipPath = clip; frame.style.webkitClipPath = clip;
    rim.style.cssText = `left:${left}px;top:${top}px;width:${width}px;height:${height}px;border-radius:${27 * (1 - q)}px;opacity:${initialized ? 1 - q : 0}`;
    if (g.target) {
      const t = g.target, tx = (g.initialX - t.left - t.width / 2) * (1 - q), ty = (g.initialY - t.top - t.height / 2) * (1 - q);
      cabinet.style.cssText = `left:${t.left}px;top:${t.top}px;width:${t.width}px;height:${t.height}px;transform:translate3d(${tx}px,${ty}px,0) scale(${p.sceneScale})`;
    }
    brand.style.opacity = String(p.titleOpacity); brand.style.transform = `translate3d(0,${p.titleOffset}px,0)`;
    screen.style.opacity = String(p.overlayOpacity); frame.style.visibility = initialized && g.target ? 'visible' : 'hidden';
    screen.dataset.phase = failed ? 'error' : !initialized ? 'loading' : p.timeMs < STARTUP_TIMING.holdMs ? 'intro' : p.timeMs < STARTUP_TIMING.holdMs + STARTUP_TIMING.expandMs ? 'expanding' : p.timeMs < STARTUP_DURATION ? 'reveal' : 'complete';
    screen.dataset.timeMs = String(p.timeMs); screen.dataset.ready = String(initialized);
  }
  function skip() { if (!active || failed) return; skipIntent = true; if (initialized) timeline.finish(); else { status.hidden = false; status.textContent = '正在读取本机球队，请稍候…'; } }
  async function prepare() {
    await new Promise(resolve => win.requestAnimationFrame(() => win.requestAnimationFrame(resolve)));
    if (!active || disposed || failed) return;
    source = document.querySelector('#lineups-panel .locker-scene .locker-viewport, #lineups-panel .locker-open-empty');
    if (source) {
      const start = win.performance.now();
      try { cabinet.replaceChildren(cabinetSnapshot(source, document)); } catch { cabinet.replaceChildren(); source = null; }
      snapshotMs = win.performance.now() - start;
    }
    initialized = true; status.hidden = true; measure();
    if (skipIntent || reduced.matches || document.hidden) timeline.finish(); else timeline.play();
  }
  function ready() { if (!readyPromise) readyPromise = prepare(); return readyPromise; }
  function fail(error) {
    if (!active || disposed) return;
    failed = true; timeline.pause(); cabinet.replaceChildren(); source = null; brand.style.opacity = '1'; screen.style.opacity = '1'; frame.style.visibility = 'hidden'; rim.style.opacity = '0';
    status.hidden = true; skipButton.hidden = true; errorBox.hidden = false;
    // The bootstrap logs the technical cause; give the person a usable next step.
    message.textContent = '启动未完成，请重新打开球搭重试。';
    screen.dataset.phase = 'error'; focusControl();
  }
  listen(skipButton, 'click', skip); listen(retry, 'click', () => win.location.reload());
  const background = () => { if (!active || failed) return; skipIntent = true; if (initialized) timeline.finish(); };
  listen(document, 'visibilitychange', () => { if (document.hidden) background(); }); listen(win, 'pagehide', background);
  listen(win, 'resize', measure); if (win.visualViewport) listen(win.visualViewport, 'resize', measure);
  const reduce = () => { if (reduced.matches) skip(); };
  if (reduced.addEventListener) listen(reduced, 'change', reduce); else { reduced.addListener(reduce); bindings.push(() => reduced.removeListener(reduce)); }
  timer(() => { if (active && !initialized && !failed) { status.hidden = false; status.textContent = '正在读取本机球队…'; } }, 600);
  measure(); focusControl();
  return { get active() { return active; }, ready, skip, fail,
    destroy() { if (disposed) return; disposed = true; timeline.destroy(); if (active) { active = false; clear(); } },
    getState() { const clock = timeline.getState(); return { active, ready: initialized, failed, skipRequested: skipIntent, timeMs: clock.timeMs, playing: clock.playing, rafActive: clock.rafActive, phase: screen.dataset.phase, reducedMotion: reduced.matches, snapshotMs, geometry: geometry ? { ...geometry, target: geometry.target ? { ...geometry.target } : null } : null }; },
  };
}
