import { layoutLibraryDeck } from './library-deck-state.js';

let deckSequence = 0;

/** Browsing is local UI state. Only the explicit play button calls onPlay. */
export function createLibraryDeck({ root, makePreview, onPlay, visible = true }) {
  if (!root || typeof makePreview !== 'function' || typeof onPlay !== 'function') throw new TypeError('战术卡片需要 root、makePreview 和 onPlay');
  const document = root.ownerDocument, window = document.defaultView;
  const instance = ++deckSequence;
  const motion = window?.matchMedia?.('(prefers-reduced-motion: reduce)');
  let catalog = [], entries = [], signature = '', expanded = '', externalBusy = false, pending = null, settleTimer = null, layoutToken = 0;
  let generation = 0, activeId = '', isVisible = Boolean(visible);
  root.classList.add('library-deck'); root.dataset.expandedId = '';

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }
  function syncCatalog() {
    root.dataset.page = '0'; root.dataset.pages = '1';
    root.dataset.total = root.dataset.count = String(catalog.length);
    root.dataset.paged = 'false';
  }
  function syncBusy() {
    const disabled = externalBusy || Boolean(pending);
    // Pause before disabling the court so no frame can outlive a source/load
    // operation. Unlocking deliberately leaves it paused for an explicit tap.
    if (disabled || !isVisible) pause();
    root.setAttribute('aria-busy', String(disabled));
    syncCatalog();
    for (const entry of entries) {
      entry.heading.disabled = disabled || !isVisible || entry.concealed;
      entry.heading.tabIndex = entry.concealed ? -1 : 0;
      entry.play.disabled = disabled || !isVisible || entry.concealed || expanded !== entry.id;
      entry.court.disabled = disabled || !isVisible || entry.concealed || expanded !== entry.id || !entry.preview;
      entry.play.textContent = pending?.id === entry.id ? '正在载入…' : '进入训练场';
    }
  }
  function ensurePreview(entry) {
    if (entry.preview) return;
    try {
      const runtime = makePreview(entry.template, entry.court);
      if (!runtime || ['start', 'pause', 'reset', 'destroy'].some(key => typeof runtime[key] !== 'function')) throw new TypeError('预览接口无效');
      entry.preview = runtime;
    } catch {
      entry.court.replaceChildren(element('span', 'library-card-preview-error', '动画预览暂不可用'));
    }
  }
  function layout(instant = false) {
    if (settleTimer !== null) { window.clearTimeout(settleTimer); settleTimer = null; }
    const serial = ++layoutToken;
    const box = root.getBoundingClientRect();
    const selected = entries.findIndex(entry => entry.id === expanded);
    const result = layoutLibraryDeck({ width: box.width, height: box.height, count: entries.length, selected });
    const animated = !instant && !motion?.matches && box.width > 0 && box.height > 0;
    root.style.setProperty('--library-strip', `${result.strip}px`);
    root.dataset.expandedId = expanded;
    root.dataset.wide = String(result.wide);
    root.dataset.compact = String(result.compact);
    root.dataset.layout = result.layout;
    root.dataset.transitioning = String(animated);
    const stagger = Math.min(35, 210 / Math.max(1, entries.length - 1));
    const baseDuration = 400 - Math.max(0, entries.length - 1) * stagger;
    let focusTarget = null;
    entries.forEach((entry, index) => {
      const target = result.entries[index], isOpen = entry.id === expanded;
      entry.card.dataset.expanded = String(isOpen);
      entry.heading.setAttribute('aria-expanded', String(isOpen));
      // Resize into the short-screen overlay must not strand focus in a
      // concealed title. Move it after all disabled states have been updated.
      entry.concealed = Boolean(target?.hidden);
      if (entry.card.contains(document.activeElement) && entry.concealed) focusTarget = entries[selected]?.heading;
      else if (!isOpen && entry.body.contains(document.activeElement)) focusTarget = entry.heading;
      entry.body.hidden = !isOpen;
      entry.card.setAttribute('aria-hidden', String(entry.concealed));
      entry.card.style.visibility = entry.concealed ? 'hidden' : 'visible';
      entry.card.style.pointerEvents = entry.concealed ? 'none' : '';
      entry.play.tabIndex = isOpen ? 0 : -1;
      entry.court.tabIndex = isOpen ? 0 : -1;
      entry.back.hidden = !(result.layout === 'overlay' && isOpen);
      entry.heading.setAttribute('aria-label', result.layout === 'overlay' && isOpen ? `${entry.template.title}，收起并返回全部${entries.length}张标题` : entry.template.title);
      if (isOpen) ensurePreview(entry);
      if (!target) return;
      entry.heading.style.height = `${target.header}px`;
      entry.card.style.transition = animated ? `transform ${baseDuration}ms cubic-bezier(.22,.7,.25,1) ${index * stagger}ms,height ${baseDuration}ms cubic-bezier(.22,.7,.25,1) ${index * stagger}ms,width ${baseDuration}ms cubic-bezier(.22,.7,.25,1) ${index * stagger}ms` : 'none';
      entry.card.style.width = `${target.width}px`;
      entry.card.style.height = `${target.height}px`;
      entry.card.style.transform = `translate3d(${target.x}px,${target.y}px,0)`;
      entry.card.style.zIndex = isOpen ? '2' : '1';
    });
    if (animated) settleTimer = window.setTimeout(() => {
      if (serial === layoutToken) { root.dataset.transitioning = 'false'; settleTimer = null; }
    }, 430);
    syncBusy();
    if (focusTarget && !focusTarget.disabled) focusTarget.focus({ preventScroll: true });
  }
  function isCurrent(entry) { return entry.generation === generation && entries.includes(entry); }
  function toggle(entry) {
    if (!isVisible || externalBusy || pending || entry.concealed || !isCurrent(entry)) return;
    const previous = entries.find(item => item.id === expanded);
    if (previous?.preview) { previous.preview.pause(); previous.preview.reset(); }
    expanded = expanded === entry.id ? '' : entry.id;
    layout();
    if (expanded && entry.preview && !entry.court.disabled) { entry.preview.reset(); entry.preview.start(); }
  }
  async function play(entry) {
    if (!isVisible || externalBusy || pending || entry.concealed || !isCurrent(entry) || entry.id !== expanded) return false;
    delete entry.summary.dataset.error;
    entry.summary.textContent = entry.template.description || '';
    const ticket = { id: entry.id }; pending = ticket; syncBusy();
    try {
      // The application owns loading, provenance protection and navigation.
      return await onPlay(entry.id) === true;
    } catch (error) {
      if (isCurrent(entry)) {
        entry.summary.textContent = error?.message || '未能开始演练，请重试。';
        entry.summary.dataset.error = 'true';
      }
      return false;
    } finally {
      if (pending === ticket) pending = null;
      syncBusy();
    }
  }
  function createEntry(template, index) {
    const card = element('article', 'library-card'); card.dataset.cardId = template.id;
    const heading = element('button', 'library-card-heading'); heading.type = 'button'; heading.dataset.templateId = template.id;
    const title = element('span', 'library-card-title');
    const back = element('span', 'library-card-return', '收起 · 返回列表'); back.hidden = true;
    heading.append(element('span', 'library-card-index', String(index + 1).padStart(2, '0')), title, back, element('span', 'library-card-chevron', '›'));
    const body = element('div', 'library-card-body'); body.id = `library-deck-${instance}-body-${index}`; body.hidden = true;
    heading.setAttribute('aria-controls', body.id); heading.setAttribute('aria-expanded', 'false');
    const meta = element('div', 'library-card-meta'), category = element('span', 'library-card-category'), mode = element('span', 'library-card-mode');
    meta.append(category, mode);
    const court = element('button', 'library-card-court'), summary = element('p', 'library-card-summary');
    court.type = 'button'; court.dataset.action = 'toggle-preview'; court.disabled = true; court.tabIndex = -1;
    const playButton = element('button', 'library-card-play', '进入训练场'); playButton.type = 'button'; playButton.dataset.playTemplate = template.id; playButton.tabIndex = -1;
    body.append(meta, court, summary, playButton); card.append(heading, body); root.append(card);
    const entry = { id: template.id, template, card, heading, title, back, body, category, mode, court, summary, play: playButton, preview: null, generation, concealed: false };
    court.addEventListener('click', event => {
      if (!isVisible || externalBusy || pending || court.disabled || entry.concealed || !isCurrent(entry) || entry.id !== expanded) event.stopImmediatePropagation();
    }, true);
    heading.addEventListener('click', () => toggle(entry));
    playButton.addEventListener('click', () => { void play(entry); });
    return entry;
  }
  function updateEntries() {
    syncCatalog();
    entries.forEach((entry, index) => {
      entry.template = catalog[index]; entry.title.textContent = entry.template.title;
      entry.category.textContent = entry.template.category || '基础配合';
      entry.mode.textContent = `${entry.template.mode} · 初始站位`;
      if (!entry.summary.dataset.error) entry.summary.textContent = entry.template.description || '';
      const active = entry.id === activeId;
      entry.card.dataset.active = String(active);
      if (active) entry.heading.setAttribute('aria-current', 'true'); else entry.heading.removeAttribute('aria-current');
    });
  }
  function rebuild() {
    ++generation; expanded = '';
    for (const entry of entries) {
      entry.heading.disabled = entry.play.disabled = entry.court.disabled = true;
      entry.preview?.destroy(); entry.card.remove();
    }
    syncCatalog();
    entries = catalog.map(createEntry);
    updateEntries(); layout(true);
  }
  function render({ templates = [], activeTemplateId = '', busy = false } = {}) {
    const nextSignature = JSON.stringify(templates.map(template => template.id));
    const changed = signature !== nextSignature;
    externalBusy = Boolean(busy); catalog = templates; activeId = activeTemplateId;
    if (changed) {
      signature = nextSignature; rebuild();
    }
    else { updateEntries(); syncBusy(); }
  }
  function setBusy(value) { externalBusy = Boolean(value); syncBusy(); }
  function reset() {
    for (const entry of entries) { entry.preview?.pause(); entry.preview?.reset(); }
    expanded = ''; layout(true);
  }
  function pause() { for (const entry of entries) entry.preview?.pause(); }
  function setVisible(value) { isVisible = Boolean(value); syncBusy(); }
  function refreshLayout() { layout(true); }
  window?.addEventListener?.('resize', refreshLayout);
  window?.addEventListener?.('orientationchange', refreshLayout);
  if (window?.ResizeObserver) new window.ResizeObserver(refreshLayout).observe(root);
  if (motion?.addEventListener) motion.addEventListener('change', refreshLayout);
  else motion?.addListener?.(refreshLayout);
  return { render, setBusy, reset, refreshLayout, setVisible, pause, get expandedId() { return expanded; }, get page() { return 0; }, get pages() { return 1; } };
}
