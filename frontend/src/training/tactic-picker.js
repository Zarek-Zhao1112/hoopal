/** Anchored presentation only. The app owns source clearing, loading and storage. */
export function createTacticPicker({ document, beforeOpen = () => true, onSelect = () => {}, onVisibilityChange = () => {} }) {
  const window = document.defaultView;
  const trigger = document.getElementById('training-picker-trigger');
  const host = trigger.closest('.training-title-picker');
  const root = document.createElement('div');
  root.id = 'training-tactic-picker';
  root.className = 'training-tactic-picker';
  root.hidden = true;
  root.dataset.phase = 'closed';
  root.setAttribute('aria-hidden', 'true');
  const shade = document.createElement('div');
  shade.className = 'tactic-picker-shade';
  shade.dataset.pickerDismiss = '';
  const panel = document.createElement('section');
  panel.className = 'tactic-picker-panel';
  panel.dataset.pickerPanel = '';
  const heading = document.createElement('div');
  heading.className = 'tactic-picker-heading';
  const context = document.createElement('span');
  const count = document.createElement('span');
  heading.append(context, count);
  const list = document.createElement('div');
  list.className = 'tactic-picker-list';
  list.dataset.pickerList = '';
  list.setAttribute('role', 'listbox');
  list.tabIndex = -1;
  panel.append(heading, list);
  root.append(shade, panel);
  document.body.append(root);

  let state = { items: [], activeTemplateId: '', mode: '3v3', kind: 'offense', disabled: true };
  let phase = 'closed', version = 0, timer = null, frames = [], signature = '', focusedIndex = 0;
  let pendingChoice = null, committing = false, destroyed = false;
  const reduced = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const buttons = () => [...list.querySelectorAll('[data-picker-template]')];
  const isOpen = () => phase !== 'closed';
  const setPhase = next => { phase = next; root.dataset.phase = next; };
  const canFocusTrigger = () => !destroyed && !trigger.disabled && trigger.isConnected && trigger.getClientRects().length && !document.hidden;

  function clearMotion() {
    version++;
    window.clearTimeout(timer); timer = null;
    frames.forEach(id => window.cancelAnimationFrame(id)); frames = [];
  }
  function syncTrigger() {
    trigger.disabled = Boolean(state.disabled || committing || !state.items.length);
    trigger.setAttribute('aria-disabled', String(trigger.disabled));
    trigger.setAttribute('aria-expanded', String(isOpen()));
    const current = state.items.find(item => item.id === state.activeTemplateId);
    trigger.setAttribute('aria-label', current ? `选择内置战术，当前：${current.title}` : '选择内置战术');
    host.dataset.pickerExpanded = String(isOpen());
    host.dataset.pickerDisabled = String(trigger.disabled);
  }
  function setOptionsEnabled(enabled) {
    for (const button of buttons()) button.disabled = !enabled;
  }
  function reveal(button) {
    if (!button) return;
    const top = button.offsetTop, bottom = top + button.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }
  function focusOption(index) {
    const choices = buttons();
    if (!choices.length) return;
    focusedIndex = Math.max(0, Math.min(index, choices.length - 1));
    choices.forEach((button, i) => { button.tabIndex = i === focusedIndex && phase === 'open' ? 0 : -1; });
    const active = choices[focusedIndex];
    list.setAttribute('aria-activedescendant', active.id);
    if (phase === 'open') active.focus({ preventScroll: true });
    reveal(active);
  }
  function position() {
    if (!isOpen() || destroyed) return;
    const anchor = trigger.getBoundingClientRect();
    const viewport = window.visualViewport;
    const leftEdge = viewport?.offsetLeft || 0, topEdge = viewport?.offsetTop || 0;
    const width = viewport?.width || window.innerWidth, height = viewport?.height || window.innerHeight;
    const card = document.querySelector('.training-panel')?.getBoundingClientRect();
    const navigation = document.querySelector('.view-nav')?.getBoundingClientRect();
    const panelWidth = Math.max(120, Math.min(268, width - 24, card ? card.width - 20 : width - 24));
    const bottomEdge = Math.min(topEdge + height - 10, navigation?.height && navigation.top > anchor.bottom ? navigation.top - 8 : topEdge + height - 10);
    const top = Math.max(topEdge + 8, Math.min(anchor.bottom + 5, bottomEdge - 90));
    const left = Math.max(leftEdge + 12, Math.min(anchor.left, leftEdge + width - panelWidth - 12));
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
    panel.style.width = `${panelWidth}px`;
    panel.style.maxHeight = `${Math.max(0, bottomEdge - top)}px`;
    reveal(buttons()[focusedIndex]);
  }
  function rebuild() {
    const next = JSON.stringify(state.items.map(item => [item.id, item.title]));
    if (next !== signature) {
      signature = next;
      list.replaceChildren(...state.items.map((item, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tactic-picker-option';
        button.dataset.pickerTemplate = item.id;
        button.id = `training-tactic-option-${index}`;
        button.setAttribute('role', 'option');
        button.tabIndex = -1;
        const title = document.createElement('span'); title.className = 'tactic-picker-name'; title.textContent = item.title;
        const check = document.createElement('span'); check.className = 'tactic-picker-check'; check.textContent = '✓'; check.setAttribute('aria-hidden', 'true');
        button.append(title, check);
        return button;
      }));
    }
    context.textContent = `${state.mode} · ${state.kind === 'defense' ? '防守' : '进攻'}`;
    count.textContent = `${state.items.length}套`;
    list.setAttribute('aria-label', `${context.textContent}内置战术`);
    for (const button of buttons()) button.setAttribute('aria-selected', String(button.dataset.pickerTemplate === state.activeTemplateId));
    setOptionsEnabled(phase === 'open');
  }
  function render(next) {
    if (destroyed) return;
    const items = next.items.map(item => ({ id: String(item.id), title: String(item.title) }));
    const changed = state.mode !== next.mode || state.kind !== next.kind || state.activeTemplateId !== next.activeTemplateId || JSON.stringify(items) !== JSON.stringify(state.items);
    state = { ...next, items };
    if (isOpen() && (state.disabled || changed)) close({ immediate: true, reason: 'context-change' });
    rebuild();
    syncTrigger();
    if (isOpen()) position();
  }
  function open(index) {
    if (destroyed || isOpen() || committing || state.disabled || !state.items.length || beforeOpen() === false) return false;
    clearMotion(); pendingChoice = null;
    const ticket = version;
    focusedIndex = Number.isInteger(index) ? index : Math.max(0, state.items.findIndex(item => item.id === state.activeTemplateId));
    setPhase('opening'); root.hidden = false; root.setAttribute('aria-hidden', 'false'); delete root.dataset.visible;
    syncTrigger(); rebuild(); onVisibilityChange(true); position();
    list.focus({ preventScroll: true }); reveal(buttons()[focusedIndex]);
    const ready = () => {
      if (destroyed || version !== ticket || phase !== 'opening') return;
      root.dataset.visible = 'true';
      const complete = () => {
        if (destroyed || version !== ticket || phase !== 'opening') return;
        setPhase('open'); setOptionsEnabled(true); focusOption(focusedIndex);
      };
      if (reduced()) complete();
      else timer = window.setTimeout(complete, 220);
    };
    if (reduced()) ready();
    else frames.push(window.requestAnimationFrame(() => {
      if (version !== ticket || phase !== 'opening') return;
      frames.push(window.requestAnimationFrame(ready));
    }));
    return true;
  }
  function finishClose(ticket, reason) {
    if (version !== ticket || phase !== 'closing') return;
    const choice = pendingChoice;
    pendingChoice = null;
    setPhase('closed'); root.hidden = true; root.setAttribute('aria-hidden', 'true'); delete root.dataset.visible;
    for (const button of buttons()) button.tabIndex = -1;
    committing = Boolean(choice && !destroyed && !state.disabled);
    syncTrigger(); onVisibilityChange(false);
    if (!committing) {
      if (reason !== 'destroy' && canFocusTrigger()) trigger.focus({ preventScroll: true });
      return;
    }
    // Source clearing remains in the app. No select value or saved step is
    // changed before the parent's async operation actually succeeds.
    Promise.resolve().then(() => {
      if (destroyed || version !== ticket || document.hidden) return;
      return onSelect(choice);
    }).catch(error => window.console?.error('Tactic selection failed', error)).finally(() => {
      committing = false;
      if (destroyed) return;
      syncTrigger();
      if (version === ticket && document.body.dataset.view === 'play' && canFocusTrigger()) trigger.focus({ preventScroll: true });
    });
  }
  function close({ immediate = false, reason = 'cancel' } = {}) {
    // A second tap can pass through a fading option to the transparent shade.
    // Keep the first choice; only an explicit cancellation may revoke it.
    if (phase === 'closing' && !immediate && ['outside', 'trigger', 'select'].includes(reason)) return true;
    if (reason !== 'select') pendingChoice = null;
    if (phase === 'closed') return false;
    if (phase === 'closing' && !immediate) return true;
    clearMotion();
    const ticket = version;
    setPhase('closing'); delete root.dataset.visible; setOptionsEnabled(false); syncTrigger();
    if (immediate || reduced()) finishClose(ticket, reason);
    else timer = window.setTimeout(() => finishClose(ticket, reason), 160);
    return true;
  }
  function choose(id) {
    if (phase !== 'open' || committing || state.disabled || !state.items.some(item => item.id === id)) return;
    pendingChoice = id === state.activeTemplateId ? null : id;
    close({ reason: 'select' });
  }
  function toggle() {
    if (isOpen()) close({ reason: 'trigger' });
    else open();
  }
  function dismiss() { close({ reason: 'outside' }); }
  function onOptionClick(event) {
    const button = event.target.closest('[data-picker-template]');
    if (button && list.contains(button)) choose(button.dataset.pickerTemplate);
  }
  function onKey(event) {
    if (!isOpen()) {
      if (event.target === trigger && ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
        open(['ArrowUp', 'End'].includes(event.key) ? state.items.length - 1 : 0);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); close({ reason: 'escape' }); return;
    }
    if (!['Tab', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (phase !== 'open') return;
    const choices = buttons(), active = choices.indexOf(document.activeElement);
    const index = active >= 0 ? active : focusedIndex;
    if (event.key === 'Enter' || event.key === ' ') { choose(choices[index]?.dataset.pickerTemplate); return; }
    if (event.key === 'Home') focusOption(0);
    else if (event.key === 'End') focusOption(choices.length - 1);
    else focusOption((index + (event.key === 'ArrowUp' || event.key === 'Tab' && event.shiftKey ? -1 : 1) + choices.length) % choices.length);
  }
  function onFocus(event) {
    if (!isOpen() || root.contains(event.target) || event.target === trigger) return;
    if (phase === 'open') focusOption(focusedIndex);
    else list.focus({ preventScroll: true });
  }
  function onBackground() { if (document.hidden) close({ immediate: true, reason: 'background' }); }
  function onPageHide() { close({ immediate: true, reason: 'background' }); }
  trigger.addEventListener('click', toggle);
  shade.addEventListener('click', dismiss);
  list.addEventListener('click', onOptionClick);
  document.addEventListener('keydown', onKey, true);
  document.addEventListener('focusin', onFocus, true);
  document.addEventListener('visibilitychange', onBackground);
  window.addEventListener('pagehide', onPageHide);
  window.addEventListener('resize', position);
  window.visualViewport?.addEventListener('resize', position);
  window.visualViewport?.addEventListener('scroll', position);
  syncTrigger();
  return {
    render, close,
    get isOpen() { return isOpen(); },
    handleBack() { return close({ reason: 'back' }); },
    destroy() {
      if (destroyed) return;
      destroyed = true; pendingChoice = null;
      close({ immediate: true, reason: 'destroy' }); clearMotion();
      trigger.removeEventListener('click', toggle);
      shade.removeEventListener('click', dismiss);
      list.removeEventListener('click', onOptionClick);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('focusin', onFocus, true);
      document.removeEventListener('visibilitychange', onBackground);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('resize', position);
      window.visualViewport?.removeEventListener('scroll', position);
      root.remove();
    },
  };
}
