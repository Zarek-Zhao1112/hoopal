/** Local, storage-free NBA selector. Initial paint never selects a team. */
export function createTeamCarousel({ document, teams, initialTeamId = null, getLogoUrl, onChange = () => {}, isDisabled = () => false, onAllChange = () => {} }) {
  if (!document?.defaultView || !Array.isArray(teams) || typeof getLogoUrl !== 'function') throw new TypeError('球队转盘需要 document、球队目录及本地队徽接口');
  const window = document.defaultView;
  const catalog = teams.map(team => ({ id: team.id, name: team.name || team.id, fullName: team.fullName || team.name || team.id }));
  if (catalog.some(team => typeof team.id !== 'string' || !team.id) || new Set(catalog.map(team => team.id)).size !== catalog.length) throw new TypeError('球队标识必须非空且唯一');
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const element = make('section', 'lineup-team-carousel');
  const content = make('div', 'lineup-carousel-content');
  const caption = make('div', 'carousel-caption');
  const stage = make('div', 'carousel-stage');
  const track = make('div', 'carousel-track');
  const heading = make('div', 'selection-heading');
  const identity = make('div');
  const name = make('strong', 'lineup-carousel-name');
  const counter = make('span', 'lineup-carousel-position');
  const allPanel = make('section', 'all-teams-panel');
  const allHeading = make('header');
  const allGrid = make('div', 'all-teams-grid');
  const pager = make('div', 'team-pager');
  const pageCount = Math.max(1, Math.ceil(catalog.length / 12));
  const listeners = [];
  const listen = (target, event, callback, options) => {
    target.addEventListener(event, callback, options);
    listeners.push(() => target.removeEventListener(event, callback, options));
  };
  const button = (text, action, className, label = text) => {
    const node = make('button', className, text);
    node.type = 'button'; node.dataset.action = action; node.setAttribute('aria-label', label);
    return node;
  };
  const previous = button('‹', 'lineup-carousel-prev', 'arrow-button', '上一支球队');
  const next = button('›', 'lineup-carousel-next', 'arrow-button', '下一支球队');
  const openAllButton = button('全部球队 ›', 'lineup-carousel-all-open', '', '查看全部 NBA 球队');
  const closeAllButton = button('×', 'lineup-carousel-all-close', 'secondary', '返回球队转盘');
  const pagePrevious = button('上一页', 'lineup-team-page-prev', '');
  const pageNext = button('下一页', 'lineup-team-page-next', '');
  const pageLabel = make('span', 'lineup-team-page-count');
  pageLabel.dataset.action = 'lineup-team-page-count';
  const initialIndex = catalog.findIndex(team => team.id === initialTeamId);
  let neutralAvailable = initialIndex < 0;
  let position = neutralAvailable ? 0 : initialIndex;
  let selectedId = initialIndex < 0 ? null : catalog[initialIndex].id;
  let gesture = null, motion = null, raf = null, destroyed = false, allOpen = false, allPage = 0;
  let suppressClickUntil = 0, wasConnected = false;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const now = () => window.performance.now();
  const mod = (value, size) => size ? ((value % size) + size) % size : 0;
  const items = () => neutralAvailable ? [null, ...catalog] : catalog;
  const locked = () => destroyed || Boolean(isDisabled());
  const hidden = () => {
    const visiblePart = allOpen ? allPanel : stage;
    return !element.isConnected || document.hidden || Boolean(visiblePart.closest('[hidden]')) || !visiblePart.getClientRects().length || window.getComputedStyle(visiblePart).visibility === 'hidden';
  };
  const unavailable = () => locked() || hidden();
  const spacing = () => Math.max(74, Math.min(122, stage.getBoundingClientRect().width * .30));

  element.setAttribute('aria-label', 'NBA 球队选择');
  stage.dataset.action = 'lineup-team-carousel-stage'; stage.tabIndex = 0;
  stage.setAttribute('role', 'group'); stage.setAttribute('aria-label', '左滑下一队，右滑上一队，也可使用方向键');
  stage.style.touchAction = 'pan-y';
  caption.append(make('span', '', '选择球队与球衣'), openAllButton);
  identity.append(name, counter); heading.append(previous, identity, next);
  stage.append(make('div', 'carousel-arc'), track);
  content.append(caption, stage, heading, make('p', 'swipe-hint', '向左滑下一队，向右滑上一队'));
  allHeading.append(make('h3', '', '全部 NBA 球队'), closeAllButton);
  allGrid.setAttribute('aria-label', 'NBA 球队，每页最多十二支');
  pager.append(pagePrevious, pageLabel, pageNext);
  allPanel.append(allHeading, allGrid, pager); allPanel.hidden = true;
  element.append(content, allPanel);

  function neutralMark() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100'); svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%'); svg.classList.add('carousel-neutral');
    const circle = document.createElementNS(svg.namespaceURI, 'circle');
    circle.setAttribute('cx', '50'); circle.setAttribute('cy', '50'); circle.setAttribute('r', '37');
    circle.setAttribute('fill', '#DFEBF2'); circle.setAttribute('stroke', '#9BB7C9'); circle.setAttribute('stroke-width', '2');
    const lines = document.createElementNS(svg.namespaceURI, 'path');
    lines.setAttribute('d', 'M13 50H87M50 13V87M25 22Q65 50 25 78M75 22Q35 50 75 78');
    lines.setAttribute('fill', 'none'); lines.setAttribute('stroke', '#9BB7C9'); lines.setAttribute('stroke-width', '2');
    svg.append(circle, lines); return svg;
  }
  const slots = Array.from({ length: 7 }, () => {
    const node = button('', 'lineup-carousel-team', 'carousel-team');
    const image = make('img'); image.alt = ''; image.draggable = false;
    const neutral = neutralMark(); node.append(image, neutral); track.append(node);
    return { node, image, neutral };
  });

  function getState() {
    const size = items().length || 1;
    return { teamId: selectedId, activeIndex: catalog.findIndex(team => team.id === selectedId), position, angle: position / size * 360, offset: position - Math.round(position), settled: !motion && !gesture, allOpen, allPage, pageCount, neutralAvailable, destroyed };
  }
  function paint(notify = false) {
    const list = items(), size = list.length, anchor = Math.round(position), disabled = locked();
    const current = list[mod(anchor, size)] || null;
    const currentId = current?.id || null, changed = currentId !== selectedId;
    selectedId = currentId;
    const radius = Math.min(242, (stage.getBoundingClientRect().width || 320) * .64);
    slots.forEach(({ node, image, neutral }, slot) => {
      const logical = anchor + slot - 3, distance = logical - position, abs = Math.abs(distance);
      const team = list[mod(logical, size)] || null;
      const interactive = !allOpen && !disabled && catalog.length > 0 && abs <= 1.22;
      const x = Math.sin(distance * .55) * radius, y = Math.pow(Math.min(abs, 3), 1.55) * 13;
      node.style.transform = `translate(-50%,-50%) translate3d(${x}px,${y}px,0) scale(${Math.max(.30, 1 - abs * .27)})`;
      node.style.opacity = String(Math.max(0, 1 - abs * .30));
      node.style.zIndex = String(100 - Math.round(abs * 20));
      node.style.pointerEvents = interactive ? 'auto' : 'none';
      node.disabled = !interactive; node.tabIndex = interactive && abs < .5 ? 0 : -1;
      node.setAttribute('aria-hidden', String(!interactive)); node.setAttribute('aria-pressed', String(abs < .5));
      node.dataset.teamId = team?.id || ''; node.dataset.index = String(team ? catalog.findIndex(entry => entry.id === team.id) : -1);
      node.dataset.logical = String(logical); node.dataset.offset = String(slot - 3);
      node.setAttribute('aria-label', (team?.fullName || '尚未选择 NBA 球队') + (abs < .5 ? '，当前球队' : '，点击选择'));
      image.hidden = !team; neutral.hidden = Boolean(team);
      if (team && image.dataset.teamId !== team.id) {
        const url = getLogoUrl(team.id);
        if (url) image.src = url; else image.removeAttribute('src');
        image.dataset.teamId = team.id;
      }
    });
    name.textContent = current?.fullName || '尚未选择 NBA 球队';
    counter.textContent = current ? `${String(catalog.findIndex(team => team.id === current.id) + 1).padStart(2, '0')} / ${catalog.length}` : `待选择 · ${catalog.length} 支球队`;
    for (const target of [element, stage]) {
      target.dataset.teamId = selectedId || ''; target.dataset.activeIndex = String(catalog.findIndex(team => team.id === selectedId));
      target.dataset.offset = String(position - anchor); target.dataset.settled = String(!motion && !gesture); target.dataset.allOpen = String(allOpen);
    }
    previous.disabled = next.disabled = disabled || allOpen || catalog.length === 0;
    openAllButton.disabled = disabled || allOpen || catalog.length === 0;
    closeAllButton.disabled = disabled || !allOpen;
    stage.tabIndex = disabled || allOpen ? -1 : 0;
    pagePrevious.disabled = disabled || !allOpen || allPage === 0;
    pageNext.disabled = disabled || !allOpen || allPage >= pageCount - 1;
    for (const option of allGrid.children) {
      option.disabled = disabled || !allOpen; option.tabIndex = disabled || !allOpen ? -1 : 0;
      option.setAttribute('aria-pressed', String(option.dataset.teamId === selectedId));
    }
    if (changed && notify && !disabled) onChange(selectedId);
  }
  function stopMotion() {
    if (raf !== null) window.cancelAnimationFrame(raf);
    raf = null; motion = null;
  }
  function release(pointerId) {
    try { if (stage.hasPointerCapture?.(pointerId)) stage.releasePointerCapture(pointerId); } catch { /* Browser may have already released capture. */ }
  }
  function detachGesture() {
    const active = gesture; gesture = null; delete stage.dataset.dragging;
    if (active) release(active.id);
    return active;
  }
  function normalize() {
    position = Math.round(position);
    if (neutralAvailable && selectedId) { neutralAvailable = false; position = catalog.findIndex(team => team.id === selectedId); }
    else position = mod(position, items().length);
  }
  function freeze() {
    stopMotion();
    const active = detachGesture();
    if (active?.axis === 'horizontal') suppressClickUntil = now() + 420;
    normalize(); paint();
  }
  function cancelGesture() {
    const active = detachGesture();
    if (!active) return;
    stopMotion();
    if (active.axis === 'horizontal') suppressClickUntil = now() + 420;
    position = active.originIndex;
    // In particular, cancelling the first neutral gesture restores null.
    paint(!locked()); normalize(); paint();
  }
  function animateTo(target, duration = 330) {
    stopMotion();
    if (reduced?.matches || Math.abs(target - position) < .0001) {
      position = target; paint(true); normalize(); paint(); return;
    }
    const ticket = { start: position, target, began: now(), duration };
    motion = ticket; paint();
    const tick = time => {
      raf = null;
      if (motion !== ticket || destroyed) return;
      if (unavailable()) { freeze(); return; }
      const p = Math.max(0, Math.min(1, (time - ticket.began) / ticket.duration));
      position = ticket.start + (ticket.target - ticket.start) * (1 - Math.pow(1 - p, 3));
      paint(true);
      if (destroyed || motion !== ticket) return;
      if (p < 1) raf = window.requestAnimationFrame(tick);
      else { motion = null; position = target; paint(true); normalize(); paint(); }
    };
    raf = window.requestAnimationFrame(tick);
  }
  function stepBy(value) {
    const amount = Number(value);
    if (unavailable() || allOpen || !Number.isFinite(amount) || !Math.trunc(amount) || !catalog.length) return getState();
    freeze();
    const step = Math.max(-3, Math.min(3, Math.trunc(amount)));
    animateTo(Math.round(position) + step, Math.abs(step) > 1 ? 410 : 330);
    return getState();
  }
  function selectTeam(value) {
    if (unavailable() || !catalog.length) return false;
    const index = typeof value === 'string' ? catalog.findIndex(team => team.id === value) : Number.isInteger(value) ? mod(value, catalog.length) : -1;
    if (index < 0) return false;
    stopMotion(); detachGesture();
    position = index + (neutralAvailable ? 1 : 0); paint(true); normalize(); paint();
    return getState();
  }
  function renderAll() {
    allGrid.replaceChildren();
    for (const team of catalog.slice(allPage * 12, allPage * 12 + 12)) {
      const option = button('', 'lineup-team-option', 'all-team-option', team.fullName);
      option.dataset.teamId = team.id; option.setAttribute('aria-pressed', String(team.id === selectedId));
      option.disabled = locked();
      const image = make('img'); image.alt = ''; image.draggable = false;
      const url = getLogoUrl(team.id); if (url) image.src = url;
      option.append(image, make('span', '', team.name)); allGrid.append(option);
    }
    pageLabel.textContent = `${allPage + 1} / ${pageCount}`; allPanel.dataset.page = String(allPage);
    paint();
  }
  function openAll() {
    if (unavailable() || allOpen || !catalog.length) return getState();
    freeze(); allOpen = true; allPage = Math.max(0, Math.floor(catalog.findIndex(team => team.id === selectedId) / 12));
    content.hidden = true; allPanel.hidden = false; renderAll(); onAllChange(true);
    if (!destroyed) closeAllButton.focus({ preventScroll: true });
    return getState();
  }
  function closeAll() {
    if (unavailable() || !allOpen) return getState();
    allOpen = false; allPanel.hidden = true; content.hidden = false; paint(); onAllChange(false);
    if (!destroyed) openAllButton.focus({ preventScroll: true });
    return getState();
  }
  function movePointer(event) {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (unavailable()) { freeze(); return; }
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
    gesture.lastX = event.clientX; gesture.lastY = event.clientY;
    if (gesture.axis === 'pending') {
      if (Math.hypot(dx, dy) < 10) return;
      gesture.axis = Math.abs(dx) > Math.abs(dy) * 1.25 ? 'horizontal' : 'vertical';
      if (gesture.axis === 'horizontal') {
        stage.dataset.dragging = 'true';
        try { stage.setPointerCapture?.(event.pointerId); } catch { /* Optional in synthetic input. */ }
      }
    }
    if (gesture.axis !== 'horizontal') return;
    if (event.cancelable) event.preventDefault();
    const time = now(), dt = Math.max(1, time - gesture.last);
    const nextPosition = Math.max(gesture.originIndex - 3, Math.min(gesture.originIndex + 3, gesture.origin - dx / gesture.spacing));
    gesture.velocity = gesture.velocity * .55 + (nextPosition - gesture.lastPosition) / dt * .45;
    gesture.last = time; gesture.lastPosition = nextPosition; position = nextPosition; paint(true);
  }
  function finish(event, cancelled = false) {
    if (!gesture || gesture.id !== event.pointerId) return;
    if (unavailable()) { freeze(); return; }
    if (cancelled) { cancelGesture(); return; }
    // Account for a final coordinate even if the browser omitted the last move.
    if (Number.isFinite(event.clientX) && Number.isFinite(event.clientY) && (event.clientX !== gesture.lastX || event.clientY !== gesture.lastY)) movePointer(event);
    const active = detachGesture();
    if (!active) return;
    if (active.axis !== 'horizontal') { position = active.originIndex; paint(true); normalize(); paint(); return; }
    suppressClickUntil = now() + 420;
    const extra = now() - active.start < 170 && Math.abs(active.velocity) > .009 ? Math.max(-1.5, Math.min(1.5, active.velocity * 90)) : 0;
    const target = Math.max(active.originIndex - 3, Math.min(active.originIndex + 3, Math.round(position + extra)));
    animateTo(target, Math.abs(target - position) > 1 ? 410 : 330);
  }

  listen(stage, 'pointerdown', event => {
    if (event.isPrimary === false) { if (!locked()) cancelGesture(); return; }
    if (unavailable() || allOpen || event.button !== undefined && event.button !== 0) return;
    if (gesture) cancelGesture();
    stopMotion();
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, lastX: event.clientX, lastY: event.clientY, origin: position, originIndex: Math.round(position), axis: 'pending', spacing: spacing(), start: now(), last: now(), lastPosition: position, velocity: 0 };
    paint();
  });
  listen(stage, 'pointermove', movePointer, { passive: false });
  listen(stage, 'pointerup', event => finish(event));
  listen(stage, 'pointercancel', event => finish(event, true));
  listen(stage, 'lostpointercapture', event => { if (event.target === stage) finish(event, true); });
  listen(stage, 'click', event => {
    if (unavailable() || allOpen || now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); return; }
    const target = event.target.closest?.('[data-action="lineup-carousel-team"]');
    if (!target || !stage.contains(target) || target.disabled || !target.dataset.teamId) return;
    const delta = Number(target.dataset.logical) - Math.round(position);
    freeze(); animateTo(Math.round(position) + delta);
  }, true);
  listen(previous, 'click', () => stepBy(-1)); listen(next, 'click', () => stepBy(1));
  listen(openAllButton, 'click', openAll); listen(closeAllButton, 'click', closeAll);
  listen(pagePrevious, 'click', () => { if (!unavailable() && allOpen && allPage > 0) { allPage--; renderAll(); pageNext.focus({ preventScroll: true }); } });
  listen(pageNext, 'click', () => { if (!unavailable() && allOpen && allPage < pageCount - 1) { allPage++; renderAll(); pagePrevious.focus({ preventScroll: true }); } });
  listen(allGrid, 'click', event => {
    const option = event.target.closest?.('[data-action="lineup-team-option"]');
    if (!option || !allGrid.contains(option) || option.disabled || !allOpen || unavailable()) return;
    if (selectTeam(option.dataset.teamId)) closeAll();
  });
  listen(element, 'keydown', event => {
    if (unavailable()) return;
    if (allOpen && event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closeAll(); }
    else if (!allOpen && stage.contains(event.target) && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); event.stopPropagation(); stepBy(event.key === 'ArrowRight' ? 1 : -1); }
  });
  listen(window, 'resize', freeze); listen(window, 'blur', freeze); listen(window, 'pagehide', freeze);
  listen(document, 'visibilitychange', () => { if (document.hidden) freeze(); });
  if (reduced?.addEventListener) listen(reduced, 'change', freeze);
  else if (reduced?.addListener) { reduced.addListener(freeze); listeners.push(() => reduced.removeListener(freeze)); }
  const observer = window.MutationObserver ? new window.MutationObserver(records => {
    if (destroyed) return;
    if (element.isConnected && !wasConnected) { wasConnected = true; paint(); }
    if (!wasConnected) return;
    const relevant = !element.isConnected || records.some(record => record.target === element || record.target.contains?.(element));
    if (relevant && hidden() && (gesture || motion)) freeze();
  }) : null;
  observer?.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class', 'style', 'open'] });
  // Initial construction is detached; measure once attached/shown, and when the
  // sheet changes size, without an idle animation loop or a selection callback.
  let measuredWidth = 0, measuredHeight = 0;
  const resizeObserver = window.ResizeObserver ? new window.ResizeObserver(() => {
    if (destroyed) return;
    const box = stage.getBoundingClientRect();
    if (box.width === measuredWidth && box.height === measuredHeight) return;
    measuredWidth = box.width; measuredHeight = box.height;
    // Showing the stage after the all-team list queues a resize notification.
    // It can arrive after the next user action has already started a motion;
    // measuring/repainting must not cancel that newer action. Actual hiding
    // still releases capture and stops motion, as do window resize/blur events.
    if (hidden()) { if (gesture || motion) freeze(); }
    else paint();
  }) : null;
  resizeObserver?.observe(stage);
  paint();
  return {
    element, getState, stepBy, selectTeam, closeAll,
    get isAllOpen() { return allOpen; },
    destroy() {
      if (destroyed) return;
      destroyed = true; stopMotion(); detachGesture(); allOpen = false; observer?.disconnect(); resizeObserver?.disconnect();
      for (const remove of listeners) remove();
      paint();
    },
  };
}
