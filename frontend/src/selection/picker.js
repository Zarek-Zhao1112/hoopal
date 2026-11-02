/** A local glass list: browsing commits only to the preview, never to storage. */
export function createSelectionPicker({ document, trigger, items, activeId, onSelect, onModalChange, disabled = () => false, beforeOpen = () => {} }) {
  const window = document.defaultView;
  const root = document.createElement('div');
  root.id = 'selection-tactic-menu'; root.className = 'selection-tactic-menu'; root.hidden = true;
  root.dataset.phase = 'closed'; root.setAttribute('aria-hidden', 'true');
  const shade = document.createElement('div'); shade.className = 'selection-menu-shade'; shade.dataset.selectionDismiss = '';
  const panel = document.createElement('section'); panel.className = 'selection-menu-panel'; panel.dataset.selectionMenuPanel = '';
  const list = document.createElement('div'); list.className = 'selection-menu-list'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', '选择战术'); list.tabIndex = -1;
  panel.append(list); root.append(shade, panel); document.body.append(root);
  trigger.setAttribute('aria-controls', root.id); trigger.setAttribute('aria-haspopup', 'listbox'); trigger.setAttribute('aria-expanded', 'false');
  let phase = 'closed', destroyed = false, timer = null, frames = [], generation = 0, pending = null, focused = 0;
  const guarded = new Map();
  const reduced = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const isOpen = () => phase !== 'closed';
  const options = () => [...list.querySelectorAll('[data-selection-template]')];
  const setPhase = value => { phase = value; root.dataset.phase = value; trigger.setAttribute('aria-expanded', String(isOpen())); };
  function motionClear() { generation++; window.clearTimeout(timer); timer = null; for (const id of frames) window.cancelAnimationFrame(id); frames = []; }
  function isolate() {
    for (const scope of document.querySelectorAll('.workspace,.view-nav,#lineup-brand-header,.app-header')) for (const n of scope.querySelectorAll('button,input,select,textarea,a,[tabindex]')) {
      if (n === trigger || guarded.has(n)) continue;
      guarded.set(n, { disabled: 'disabled' in n ? n.disabled : undefined, tabindex: n.getAttribute('tabindex') });
      if ('disabled' in n) n.disabled = true; n.tabIndex = -1;
    }
  }
  function restore() {
    for (const [n, before] of guarded) if (n.isConnected) {
      if (before.disabled !== undefined) n.disabled = before.disabled;
      if (before.tabindex === null) n.removeAttribute('tabindex'); else n.setAttribute('tabindex', before.tabindex);
    }
    guarded.clear();
  }
  function focus(index) {
    const rows = options(); if (!rows.length) return;
    focused = (index + rows.length) % rows.length;
    rows.forEach((row, i) => { row.tabIndex = i === focused && phase === 'open' ? 0 : -1; });
    const row = rows[focused];
    if (phase === 'open') row.focus({ preventScroll: true });
    if (row.offsetTop < list.scrollTop) list.scrollTop = row.offsetTop;
    else if (row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = row.offsetTop + row.offsetHeight - list.clientHeight;
  }
  function position() {
    if (!isOpen() || destroyed) return;
    const box = trigger.getBoundingClientRect(), viewport = window.visualViewport;
    const width = viewport?.width || window.innerWidth, height = viewport?.height || window.innerHeight;
    const x = viewport?.offsetLeft || 0, y = viewport?.offsetTop || 0;
    const navigation = document.querySelector('.view-nav')?.getBoundingClientRect();
    const bottom = Math.min(y + height - 10, navigation && navigation.top > box.bottom ? navigation.top - 8 : y + height - 10);
    const top = Math.max(y + 8, Math.min(box.bottom + 4, bottom - 74));
    const menuWidth = Math.max(100, Math.min(box.width, width - 24));
    panel.style.left = `${Math.max(x + 12, Math.min(box.left, x + width - menuWidth - 12))}px`;
    panel.style.top = `${top}px`; panel.style.width = `${menuWidth}px`; panel.style.maxHeight = `${Math.max(0, bottom - top)}px`;
    focus(focused);
  }
  function rebuild() {
    list.replaceChildren(...items.map((item, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'selection-menu-option'; button.dataset.selectionTemplate = item.id;
      button.setAttribute('role', 'option'); button.setAttribute('aria-selected', String(item.id === activeId)); button.tabIndex = -1; button.disabled = true;
      button.id = `selection-tactic-option-${index}`;
      const copy = document.createElement('span'), title = document.createElement('strong'), note = document.createElement('small'), check = document.createElement('span');
      title.textContent = item.title; note.textContent = item.note; copy.append(title, note); check.className = 'selection-menu-check'; check.textContent = '✓'; check.setAttribute('aria-hidden', 'true');
      button.append(copy, check); return button;
    }));
  }
  function open(index) {
    if (destroyed || isOpen() || disabled() || !items.length) return false;
    beforeOpen(); motionClear(); pending = null; focused = Number.isInteger(index) ? index : Math.max(0, items.findIndex(item => item.id === activeId));
    const token = generation; setPhase('opening'); root.hidden = false; root.setAttribute('aria-hidden', 'false'); delete root.dataset.visible;
    rebuild(); isolate(); onModalChange?.(true); position(); list.focus({ preventScroll: true });
    const reveal = () => {
      if (destroyed || token !== generation || phase !== 'opening') return;
      root.dataset.visible = 'true';
      const finish = () => { if (destroyed || token !== generation || phase !== 'opening') return; setPhase('open'); options().forEach(n => n.disabled = false); focus(focused); };
      if (reduced()) finish(); else timer = window.setTimeout(finish, 220);
    };
    if (reduced()) reveal(); else frames.push(window.requestAnimationFrame(() => frames.push(window.requestAnimationFrame(reveal))));
    return true;
  }
  function close({ immediate = false, reason = 'cancel' } = {}) {
    if (!isOpen()) return false;
    if (phase === 'closing' && !immediate && ['outside', 'trigger', 'select'].includes(reason)) return true;
    if (reason !== 'select') pending = null;
    motionClear(); const token = generation; setPhase('closing'); delete root.dataset.visible; options().forEach(n => { n.disabled = true; n.tabIndex = -1; });
    const finish = () => {
      if (destroyed || token !== generation || phase !== 'closing') return;
      const selected = pending; pending = null; setPhase('closed'); root.hidden = true; root.setAttribute('aria-hidden', 'true'); restore(); onModalChange?.(false);
      if (selected && !disabled() && !document.hidden) onSelect(selected);
      else if (trigger.isConnected && !trigger.disabled && trigger.getClientRects().length && !document.hidden) trigger.focus({ preventScroll: true });
    };
    if (immediate || reduced()) finish(); else timer = window.setTimeout(finish, 160);
    return true;
  }
  function choose(id) { if (phase !== 'open' || disabled() || !items.some(item => item.id === id)) return; pending = id === activeId ? null : id; close({ reason: 'select' }); }
  function toggle() { isOpen() ? close({ reason: 'trigger' }) : open(); }
  function onKey(event) {
    if (!isOpen()) {
      if (event.target === trigger && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); open(['ArrowUp', 'End'].includes(event.key) ? items.length - 1 : 0); }
      return;
    }
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); close({ reason: 'escape' }); return; }
    if (!['Tab', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault(); event.stopImmediatePropagation(); if (phase !== 'open') return;
    if (event.key === 'Enter' || event.key === ' ') choose(options()[focused]?.dataset.selectionTemplate);
    else if (event.key === 'Home') focus(0); else if (event.key === 'End') focus(items.length - 1);
    else focus(focused + (event.key === 'ArrowUp' || event.key === 'Tab' && event.shiftKey ? -1 : 1));
  }
  function onFocus(event) { if (isOpen() && !root.contains(event.target) && event.target !== trigger) phase === 'open' ? focus(focused) : list.focus({ preventScroll: true }); }
  function background() { if (document.hidden) close({ immediate: true, reason: 'background' }); }
  function pagehide() { close({ immediate: true, reason: 'background' }); }
  const resize = () => { if (isOpen()) close({ immediate: true, reason: 'resize' }); };
  const outside = () => close({ reason: 'outside' });
  const selected = event => { const n = event.target.closest('[data-selection-template]'); if (n && list.contains(n)) choose(n.dataset.selectionTemplate); };
  trigger.addEventListener('click', toggle); shade.addEventListener('click', outside); list.addEventListener('click', selected);
  document.addEventListener('keydown', onKey, true); document.addEventListener('focusin', onFocus, true); document.addEventListener('visibilitychange', background);
  window.addEventListener('pagehide', pagehide); window.addEventListener('resize', resize); window.visualViewport?.addEventListener('resize', resize);
  return {
    open, close, handleBack() { return close({ reason: 'back' }); }, get isOpen() { return isOpen(); },
    destroy() {
      if (destroyed) return; pending = null; close({ immediate: true, reason: 'destroy' }); destroyed = true; motionClear(); restore(); root.remove();
      trigger.removeEventListener('click', toggle); shade.removeEventListener('click', outside); list.removeEventListener('click', selected);
      document.removeEventListener('keydown', onKey, true); document.removeEventListener('focusin', onFocus, true); document.removeEventListener('visibilitychange', background);
      window.removeEventListener('pagehide', pagehide); window.removeEventListener('resize', resize); window.visualViewport?.removeEventListener('resize', resize);
    },
  };
}
