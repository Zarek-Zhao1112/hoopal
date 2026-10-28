import { splitNote } from './state.js';
import { createPageTransition } from './page-transition.js';

const VIEWS = new Set(['lineups', 'play', 'library', 'archives']);

/** View state is intentionally separate from Play and persistent storage. */
export function createWorkspaceController({
  document = globalThis.document,
  beforeNavigate = () => true,
  onViewChange = () => {},
  beforeModalOpen = () => {},
  onModalClose = () => {},
  getNote = () => '',
} = {}) {
  const body = document.body;
  const byId = id => document.getElementById(id);
  let view = 'lineups';
  let noteText = '', notePages = [''], notePage = 0;
  const modalStack = [];
  const returnFocus = new Map();
  const pageTransition = createPageTransition({ document });

  function syncView() {
    body.dataset.view = view;
    for (const button of document.querySelectorAll('[data-view-target]')) {
      const active = button.dataset.viewTarget === view;
      button.setAttribute('aria-pressed', String(active));
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
  }
  function setView(next) {
    if (!VIEWS.has(next) || beforeNavigate(next, view) === false) return false;
    if (next === view) return true;
    const previous = view;
    const ticket = pageTransition.prepare({ from: previous, to: next });
    view = next;
    try {
      syncView();
      onViewChange(next, previous);
      pageTransition.reveal(ticket);
    } catch (error) { pageTransition.cleanup('view-error'); throw error; }
    return true;
  }
  function restoreFocus(dialog) {
    const trigger = returnFocus.get(dialog);
    returnFocus.delete(dialog);
    const visible = node => node?.isConnected && !node.disabled && !node.closest('[inert]') && node.getClientRects().length > 0;
    const target = visible(trigger) ? trigger : [...document.querySelectorAll('[data-view-target]')].find(visible);
    target?.focus({ preventScroll: true });
  }
  function closeDialog(dialog) {
    if (!dialog?.open) return false;
    dialog.close();
    return true;
  }
  function openDialog(id) {
    const dialog = byId(id);
    if (!dialog || dialog.open) return false;
    if (beforeModalOpen(id) === false) return false;
    pageTransition.cleanup('modal');
    returnFocus.set(dialog, document.activeElement);
    dialog.showModal();
    modalStack.push(dialog);
    return true;
  }
  function closeTopDialog() {
    // The lineup sheet owns its draft-aware close. A managed text dialog can
    // still sit above it and must be closed first.
    const open = [...document.querySelectorAll('dialog[open]')];
    const active = modalStack.filter(dialog => dialog.open).at(-1) ?? open.at(-1);
    if (active?.dataset.lineupOwned === 'true' || active?.id === 'lineup-wizard-dialog') return false;
    return closeDialog(active);
  }
  function renderNote() {
    if (byId('note-preview')) byId('note-preview').textContent = notePages[notePage] || '这一步暂无讲解。';
    if (byId('note-page-count')) byId('note-page-count').textContent = `${notePage + 1} / ${notePages.length}`;
    if (byId('note-page-prev')) byId('note-page-prev').disabled = notePage === 0;
    if (byId('note-page-next')) byId('note-page-next').disabled = notePage === notePages.length - 1;
  }
  function measureNotePages(text) {
    const preview = byId('note-preview');
    const limit = (document.defaultView?.innerHeight ?? 800) < 500 ? 90 : 160;
    if (!preview || !text) return splitNote(text, limit);
    const characters = Array.from(text);
    const measured = [];
    // Reserve the widest possible counter while measuring the flex dialog.
    // Header and footer remain fixed; explicit newlines consume real height.
    if (byId('note-page-count')) byId('note-page-count').textContent = `${characters.length} / ${characters.length}`;
    for (let start = 0; start < characters.length;) {
      let low = 1, high = Math.min(limit, characters.length - start), fits = 0;
      while (low <= high) {
        const count = Math.floor((low + high) / 2);
        preview.textContent = characters.slice(start, start + count).join('');
        if (preview.scrollHeight <= preview.clientHeight) {
          fits = count;
          low = count + 1;
        } else high = count - 1;
      }
      // At supported viewport sizes at least one line fits. Always advance so
      // transient resize geometry cannot drop text or create an infinite loop.
      fits = Math.max(1, fits);
      let end = start + fits;
      if (end < characters.length) {
        const earliest = start + Math.max(1, Math.floor(fits * 0.55));
        for (let boundary = end; boundary >= earliest; boundary--) {
          if (/[。！？!?；;\n\s]/u.test(characters[boundary - 1])) { end = boundary; break; }
        }
      }
      measured.push(characters.slice(start, end).join(''));
      start = end;
    }
    return measured;
  }
  function openNote() {
    if (!openDialog('note-dialog')) return false;
    if (byId('note-heading')) byId('note-heading').textContent = '这一步的讲解';
    noteText = getNote();
    notePages = measureNotePages(noteText);
    notePage = 0;
    renderNote();
    return true;
  }
  function openText(title, text) {
    if (!openDialog('note-dialog')) return false;
    if (byId('note-heading')) byId('note-heading').textContent = title;
    noteText = String(text);
    notePages = measureNotePages(noteText);
    notePage = 0;
    renderNote();
    return true;
  }

  for (const button of document.querySelectorAll('[data-view-target]')) button.addEventListener('click', () => setView(button.dataset.viewTarget));
  byId('open-menu')?.addEventListener('click', () => openDialog('workspace-menu'));
  byId('close-menu')?.addEventListener('click', () => closeDialog(byId('workspace-menu')));
  byId('open-note')?.addEventListener('click', openNote);
  byId('close-note')?.addEventListener('click', () => closeDialog(byId('note-dialog')));
  byId('note-page-prev')?.addEventListener('click', () => { notePage = Math.max(0, notePage - 1); renderNote(); });
  byId('note-page-next')?.addEventListener('click', () => { notePage = Math.min(notePages.length - 1, notePage + 1); renderNote(); });
  for (const dialog of document.querySelectorAll('dialog')) {
    if (dialog.dataset.lineupOwned === 'true' || dialog.id === 'lineup-wizard-dialog') continue;
    dialog.addEventListener('cancel', event => { event.preventDefault(); closeDialog(dialog); });
    dialog.addEventListener('close', () => {
      const index = modalStack.indexOf(dialog);
      if (index >= 0) modalStack.splice(index, 1);
      onModalClose(dialog.id);
      restoreFocus(dialog);
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog(dialog);
    });
  }
  document.defaultView?.addEventListener('resize', () => {
    if (!byId('note-dialog')?.open) return;
    const offset = notePages.slice(0, notePage).reduce((count, page) => count + Array.from(page).length, 0);
    notePages = measureNotePages(noteText);
    let consumed = 0;
    notePage = notePages.length - 1;
    for (let index = 0; index < notePages.length; index++) {
      consumed += Array.from(notePages[index]).length;
      if (consumed > offset) { notePage = index; break; }
    }
    renderNote();
  });
  syncView();
  return {
    get view() { return view; },
    get hasOpenDialog() { return Boolean(document.querySelector('dialog[open]')); },
    setView, openNote, openText,
    openMenu: () => openDialog('workspace-menu'),
    closeMenu: () => closeDialog(byId('workspace-menu')),
    closeTopDialog,
    cancelTransition: () => pageTransition.cleanup('lineup-modal'),
  };
}
