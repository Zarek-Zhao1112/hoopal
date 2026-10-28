/** Native-modal shell. Its background guards also work on WebView 96. */
export function createLineupSheet({ document, onRequestClose, onModalChange, id = 'lineup-wizard-dialog', labelledBy = 'lineup-wizard-title' }) {
  const window = document.defaultView;
  const dialog = document.createElement('dialog');
  dialog.id = id;
  dialog.className = 'lineup-wizard-dialog';
  dialog.dataset.lineupOwned = 'true';
  dialog.setAttribute('aria-labelledby', labelledBy);
  const shade = document.createElement('div'); shade.className = 'lineup-sheet-shade';
  const panel = document.createElement('section'); panel.className = 'lineup-glass-sheet';
  dialog.append(shade, panel); document.body.append(dialog);
  function measureViewport() {
    dialog.style.setProperty('--lineup-viewport-height', `${window.visualViewport?.height || window.innerHeight}px`);
  }
  measureViewport();
  window.addEventListener('resize', measureViewport);
  window.visualViewport?.addEventListener('resize', measureViewport);
  let phase = 'closed', timer = null, trigger = null, triggerAction = '', triggerProfileId = '';
  const guarded = new Map();
  const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const isOpen = () => phase !== 'closed';
  const focusable = () => [...panel.querySelectorAll('button,input,select,textarea,[tabindex]')].filter(el => !el.disabled && el.tabIndex !== -1 && !el.hidden && !el.closest('[hidden]') && el.getClientRects().length > 0);
  function refreshIsolation() {
    if (!isOpen()) return;
    for (const scope of document.querySelectorAll('#lineup-brand-header,.app-header,.workspace,.view-nav')) {
      for (const el of scope.querySelectorAll('button,input,select,textarea,a,[tabindex]')) {
        if (!guarded.has(el)) guarded.set(el, { disabled: 'disabled' in el ? el.disabled : undefined, tabindex: el.getAttribute('tabindex') });
        if ('disabled' in el) el.disabled = true;
        el.tabIndex = -1;
      }
    }
  }
  function focusFirst() { (focusable()[0] || panel).focus({ preventScroll: true }); dialog.scrollTop = 0; }
  function rememberTrigger(element) {
    trigger = element;
    triggerAction = element?.dataset?.action || '';
    triggerProfileId = element?.dataset?.profileId || '';
  }
  function open() {
    if (phase === 'open' || phase === 'opening') return;
    clearTimeout(timer); if (!trigger) rememberTrigger(document.activeElement);
    measureViewport(); phase = 'opening'; dialog.dataset.phase = phase;
    document.body.classList.add('lineups-sheet-open');
    if (!dialog.open) { if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open', ''); }
    onModalChange?.(true); refreshIsolation();
    // Two frames make the entering position observable without arbitrary sleeps.
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      if (phase !== 'opening') return;
      dialog.dataset.visible = 'true'; focusFirst();
      timer = setTimeout(() => { if (phase === 'opening') { phase = 'open'; dialog.dataset.phase = phase; } }, reduced() ? 0 : 450);
    }));
  }
  function close() {
    if (phase === 'closed' || phase === 'closing') return;
    clearTimeout(timer); phase = 'closing'; dialog.dataset.phase = phase; delete dialog.dataset.visible;
    for (const control of panel.querySelectorAll('button,input,select,textarea')) control.disabled = true;
    document.body.classList.remove('lineups-sheet-open');
    timer = setTimeout(() => {
      if (phase !== 'closing') return;
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
      phase = 'closed'; dialog.dataset.phase = phase;
      for (const [el, previous] of guarded) {
        if (!el.isConnected) continue;
        if (previous.disabled !== undefined) el.disabled = previous.disabled;
        if (previous.tabindex === null) el.removeAttribute('tabindex'); else el.setAttribute('tabindex', previous.tabindex);
      }
      guarded.clear();
      onModalChange?.(false);
      const visible = el => el?.isConnected && !el.disabled && el.matches('button,input,select,textarea,a,[tabindex]') && el.getClientRects().length > 0;
      const restored = [...document.querySelectorAll('[data-action]')].find(el => el.dataset.action === triggerAction && (!triggerProfileId || el.dataset.profileId === triggerProfileId) && visible(el));
      const target = visible(trigger) ? trigger : restored || [...document.querySelectorAll('[data-action="lineup-create-empty"],[data-action="lineup-create"],[data-action="lineup-configure"]')].find(visible);
      target?.focus({ preventScroll: true }); trigger = null; triggerAction = ''; triggerProfileId = '';
    }, reduced() ? 0 : 450);
  }
  shade.addEventListener('click', () => { if (phase !== 'closing') onRequestClose(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); onRequestClose(); });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    // The shared full-text dialog may be open above us. It owns its focus then.
    const dialogs = [...document.querySelectorAll('dialog[open]')];
    if (dialogs[dialogs.length - 1] !== dialog) return;
    const items = focusable(), index = items.indexOf(document.activeElement);
    if (!items.length) { event.preventDefault(); panel.focus(); }
    else if (event.shiftKey && index <= 0) { event.preventDefault(); items[items.length - 1].focus(); }
    else if (!event.shiftKey && (index < 0 || index === items.length - 1)) { event.preventDefault(); items[0].focus(); }
  });
  dialog.addEventListener('focusin', () => panel.classList.toggle('has-input-focus', document.activeElement?.tagName === 'INPUT'));
  dialog.addEventListener('focusout', () => setTimeout(() => panel.classList.toggle('has-input-focus', document.activeElement?.tagName === 'INPUT' && panel.contains(document.activeElement)), 0));
  panel.tabIndex = -1;
  return { dialog, panel, open, close, refreshIsolation, rememberTrigger, get isOpen() { return isOpen(); }, get closing() { return phase === 'closing'; } };
}
