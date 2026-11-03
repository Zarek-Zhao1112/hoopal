import { templates } from '../../../shared/templates.js';
import { getBodyTypes, isBodyTypeForMode, filterTacticsByBodyType, getTacticBodyNote } from '../../../shared/tactic-body-types.js';
import { createLibraryPreview } from '../workspace/library-preview.js';
import { createLineupSheet } from '../lineups/components/sheet.js';
import { createBodyFigures } from './body-figures.js';

/** Library browsing is UI-only. The app owns the explicit persistence actions. */
export function createTacticSelectionUI({ document, root, onAction, onInspect, onModalChange, onClose }) {
  if (!root || typeof onAction !== 'function') throw new TypeError('挑选战术需要root与onAction');
  const window = document.defaultView;
  let saved = { profiles: [], activeProfileId: null }, busy = false, writeLocked = false, error = '', localError = '';
  let opened = false, visible = true, pending = false, stage = 'tactics', mode = '3v3', kind = 'offense', source = 'team', profileId = null;
  let bodyType = null, bodyDraft = null, expandedId = null, generation = 0, transition = null, sessionTrigger = null, resumeFromBody = false;
  let preview = null, previewCourt = null, previewId = null, startFrame = null;
  const profile = () => saved.profiles.find(p => p.id === saved.activeProfileId);
  const team = () => profile()?.id === profileId && profile()?.mode === mode ? profile() : null;
  const locked = () => busy || pending;
  const types = () => getBodyTypes(mode);
  const selectedType = () => types().find(t => t.id === bodyType);
  const catalog = () => filterTacticsByBodyType(templates, { mode, kind, bodyType });
  const node = (tag, className = '', text) => { const n = document.createElement(tag); n.className = className; if (text !== undefined) n.textContent = String(text); return n; };
  const contextText = () => team() ? `${team().name} · ${mode}` : `${mode} · 浏览模式`;
  const phase = () => sheet.dialog.dataset.phase || 'closed';
  const sheet = createLineupSheet({ document, id: 'tactic-library-dialog', labelledBy: 'tactic-library-title',
    onRequestClose() { if (!locked()) close(); },
    onModalChange(open) {
      if (!open) {
        if (transition === 'body') {
          transition = null; stage = 'body'; draw();
          window.requestAnimationFrame(() => root.querySelector('[data-action=selection-back]')?.focus({ preventScroll: true }));
        } else if (!opened) { transition = null; onClose?.(); }
      }
      onModalChange?.(open);
      if (open) syncControls();
    },
  });
  sheet.dialog.classList.add('tactic-library-dialog'); sheet.dialog.dataset.phase = 'closed';
  sheet.panel.classList.add('tactic-library-sheet');

  function button(text, action, callback, { disabled = false, className = 'button button-subtle', data = {} } = {}) {
    const n = node('button', className, text); n.type = 'button'; n.dataset.action = action; Object.assign(n.dataset, data); n.disabled = locked() || disabled;
    n.addEventListener('click', () => { if (n.isConnected && !n.disabled && !locked() && !sheet.closing) callback(n); }); return n;
  }
  function notice(text, role = 'status') { const n = node('p', 'selection-notice', text); n.setAttribute('role', role); return n; }
  function destroyPreview() {
    if (startFrame !== null) window.cancelAnimationFrame(startFrame); startFrame = null;
    preview?.destroy(); preview = null; previewCourt = null; previewId = null;
  }
  function pause() {
    if (startFrame !== null) window.cancelAnimationFrame(startFrame); startFrame = null;
    preview?.pause();
  }
  function syncControls() {
    sheet.panel.setAttribute('aria-busy', String(locked())); root.setAttribute('aria-busy', String(locked()));
    if (sheet.isOpen) sheet.refreshIsolation();
  }
  function publish() {
    for (const n of [root, sheet.dialog]) {
      n.dataset.mode = mode; n.dataset.kind = kind; n.dataset.bodyType = bodyType || ''; n.dataset.source = source;
      n.dataset.profileId = profileId || ''; n.dataset.expandedId = expandedId || '';
    }
    sheet.dialog.dataset.stage = 'tactics'; root.dataset.stage = 'body';
    root.hidden = !(opened && stage === 'body');
    document.body.dataset.tacticSelection = String(opened && stage === 'body');
  }
  function noteFor(template) { return bodyType ? getTacticBodyNote(template, bodyType) : template.description; }
  function showBody() {
    if (!opened || locked() || sheet.closing) return false;
    bodyDraft = bodyType; localError = ''; error = ''; transition = 'body'; resumeFromBody = Boolean(preview?.state.playing); pause(); sheet.close(); return true;
  }
  function returnToLibrary() {
    if (locked()) return false;
    bodyDraft = bodyType; stage = 'tactics'; localError = ''; error = ''; draw(); sheet.rememberTrigger(sessionTrigger); sheet.open();
    if (resumeFromBody && visible && !document.hidden) preview?.start(); resumeFromBody = false; return true;
  }
  async function applyBody() {
    if (locked() || !isBodyTypeForMode(mode, bodyDraft)) return false;
    const selected = bodyDraft, target = team(), token = generation;
    if (target && writeLocked) return false;
    pending = true; localError = ''; error = ''; draw(); let success = false;
    try {
      success = target ? await onAction('body-type', { bodyType: selected, expectedRevision: target.revision, profileId: target.id, mode }) === true : true;
      if (!success) localError = '体型选择尚未保存，请重试；当前选择会保留。';
    } catch (reason) { localError = reason?.message || '保存失败，请重试；当前选择会保留。'; }
    finally { pending = false; }
    if (success && opened && token === generation) {
      bodyType = selected; bodyDraft = selected;
      if (!catalog().some(t => t.id === expandedId)) { expandedId = null; destroyPreview(); }
      stage = 'tactics'; draw(); sheet.rememberTrigger(sessionTrigger); sheet.open();
      if (resumeFromBody && visible && !document.hidden) preview?.start(); resumeFromBody = false;
    } else draw();
    return success;
  }
  async function enterTraining() {
    if (locked() || !expandedId || !catalog().some(t => t.id === expandedId)) return false;
    pending = true; localError = ''; error = ''; pause(); draw(); let success = false;
    try {
      success = await onAction('play-tactic', { templateId: expandedId, mode, source, profileId: team()?.id || null }) === true;
      if (!success) localError = '尚未进入训练场，请检查提示后重试。';
    } catch (reason) { localError = reason?.message || '暂时无法进入训练场，请重试。'; }
    finally { pending = false; }
    if (success) close(); else draw();
    return success;
  }
  function setMode(next) {
    if (source === 'team' || locked() || !['3v3', '4v4'].includes(next)) return;
    mode = next; profileId = profile()?.mode === mode ? profile().id : null;
    bodyType = isBodyTypeForMode(mode, team()?.bodyType) ? team().bodyType : null;
    bodyDraft = bodyType; expandedId = null; localError = ''; error = ''; destroyPreview(); draw();
  }
  function drawBody() {
    root.replaceChildren();
    const head = node('header', 'selection-heading secondary-page-heading'), copy = node('div');
    const back = button('‹', 'selection-back', returnToLibrary, { className: 'icon-button' }); back.setAttribute('aria-label', '返回战术库');
    copy.append(node('h1', '', '选择阵容类型'), node('p', '', contextText())); head.append(back, copy);
    const card = node('section', 'selection-body-card panel'); card.id = 'selection-body-card';
    const content = node('div', 'selection-body-content'); content.append(node('p', 'selection-intro', '看看球队的整体体型'));
    const list = node('div', 'body-type-list'); list.dataset.mode = mode;
    for (const type of types()) {
      const item = button('', 'body-type', () => { bodyDraft = type.id; localError = ''; error = ''; draw(); }, { className: 'body-type-card', data: { bodyType: type.id } });
      item.setAttribute('aria-pressed', String(bodyDraft === type.id));
      const text = node('span', 'body-type-copy'); text.append(node('strong', '', type.label), node('small', '', type.description));
      const check = node('span', 'body-type-check', bodyDraft === type.id ? '✓' : ''); check.setAttribute('aria-hidden', 'true');
      item.append(text, createBodyFigures({ document, mode, type }), check); list.append(item);
    }
    content.append(list); card.append(content);
    const foot = node('footer', 'selection-footer'); foot.append(node('p', 'selection-helper', '只描述整体体型，无需评估每个人的能力'));
    if (writeLocked && team()) foot.append(notice('档案暂时无法读取，请先重试读取球队。', 'alert'));
    if (error || localError) foot.append(notice(error || localError, 'alert'));
    foot.append(button(pending ? '正在保存…' : '查看战术', 'selection-view', applyBody, { className: 'button button-primary', disabled: !isBodyTypeForMode(mode, bodyDraft) || Boolean(team() && writeLocked) }));
    card.append(foot); root.append(head, card);
  }
  function drawLibrary() {
    const scrollTop = sheet.panel.querySelector('.selection-deck')?.scrollTop || 0;
    const head = node('header', 'selection-library-heading'), copy = node('div');
    const title = node('h2', '', '战术库'); title.id = 'tactic-library-title'; copy.append(title, node('p', '', contextText()));
    const closeButton = button('×', 'selection-close', () => close(), { className: 'selection-close' }); closeButton.setAttribute('aria-label', '关闭战术库'); head.append(copy, closeButton);
    const context = node('div', 'selection-context'); context.append(node('span', 'selection-body-pill', `${mode} · ${selectedType()?.label || '全部体型'}`));
    const contextControls = node('div', 'selection-context-actions');
    if (source !== 'team') {
      const select = node('select', 'selection-mode'); select.dataset.action = 'selection-mode'; select.setAttribute('aria-label', '浏览战术人数'); select.disabled = locked();
      for (const value of ['3v3', '4v4']) { const option = node('option', '', value); option.value = value; option.selected = mode === value; select.append(option); }
      select.addEventListener('change', () => { if (locked() || sheet.closing) select.value = mode; else setMode(select.value); }); contextControls.append(select);
    }
    contextControls.append(button('更换体型 ›', 'selection-change-body', showBody)); context.append(contextControls);
    const tabs = node('div', 'selection-kind-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', '挑选进攻或防守战术');
    for (const [id, label] of [['offense', '进攻'], ['defense', '防守']]) {
      const b = button(label, 'selection-kind', () => { if (kind !== id) { kind = id; expandedId = null; localError = ''; error = ''; destroyPreview(); draw(); } }, { data: { kind: id } });
      b.setAttribute('aria-pressed', String(kind === id)); tabs.append(b);
    }
    const list = node('section', 'selection-deck'); list.setAttribute('aria-label', '内置战术卡片');
    const candidates = catalog();
    if (!candidates.some(t => t.id === expandedId)) { expandedId = null; destroyPreview(); }
    for (const template of candidates) {
      const card = node('article', `selection-tactic-card${template.id === expandedId ? ' expanded' : ''}`); card.dataset.templateId = template.id;
      const titleButton = button('', 'selection-card', () => {
        expandedId = expandedId === template.id ? null : template.id; destroyPreview(); localError = ''; error = ''; draw();
        sheet.panel.querySelector(`[data-action=selection-card][data-template-id="${template.id}"]`)?.focus({ preventScroll: true });
      }, { className: 'selection-card-heading', data: { templateId: template.id } });
      titleButton.setAttribute('aria-expanded', String(template.id === expandedId)); titleButton.append(node('strong', '', template.title), node('span', '', template.id === expandedId ? '⌃' : '⌄')); card.append(titleButton);
      if (template.id === expandedId) {
        if (previewId !== template.id) {
          destroyPreview(); previewCourt = node('button', 'selection-court'); previewCourt.type = 'button'; previewCourt.dataset.action = 'selection-preview';
          try { preview = createLibraryPreview({ template, button: previewCourt }); previewId = template.id; }
          catch { previewCourt.append(node('span', 'selection-preview-error', '预览暂时不可用，可进入训练场查看。')); }
          if (preview && visible && !document.hidden && !locked()) startFrame = window.requestAnimationFrame(() => {
            startFrame = null; if (opened && stage === 'tactics' && sheet.isOpen && !sheet.closing && !locked() && visible) preview?.start();
          });
        }
        previewCourt.disabled = locked(); card.append(previewCourt);
        card.append(node('p', 'selection-tactic-note', noteFor(template)));
      }
      list.append(card);
    }
    if (!candidates.length) list.append(notice('这一分类暂时没有战术，可以更换体型或进攻／防守分类。'));
    const foot = node('footer', 'selection-footer');
    if (error || localError) foot.append(notice(error || localError, 'alert'));
    foot.append(button(pending ? '正在载入…' : '选用这套战术', 'selection-play', enterTraining, { className: 'button button-primary', disabled: !expandedId || writeLocked }));
    sheet.panel.replaceChildren(head, context, tabs, list, foot); list.scrollTop = scrollTop;
  }
  function draw() {
    publish(); if (!opened) return;
    if (locked()) pause();
    if (stage === 'body') drawBody(); else if (!sheet.closing) drawLibrary();
    syncControls();
  }
  function close({ immediate = false } = {}) {
    if (!opened && !sheet.isOpen) return false;
    if (locked() && !immediate) return false;
    ++generation; opened = false; transition = null; destroyPreview(); publish();
    if (sheet.isOpen) sheet.close({ immediate }); else onClose?.();
    return true;
  }
  return {
    render({ state, busy: nextBusy = false, error: nextError = '', writeLocked: nextLocked = false }) {
      saved = state || { profiles: [], activeProfileId: null }; busy = Boolean(nextBusy); error = nextError || ''; writeLocked = Boolean(nextLocked);
      if (opened && source === 'team' && (!profile() || profile().id !== profileId || profile().mode !== mode)) { close({ immediate: true }); return; }
      draw();
    },
    open({ mode: nextMode, kind: nextKind = 'offense', source: nextSource = 'team' } = {}) {
      if (locked() || opened || sheet.isOpen) return false;
      const current = profile(); if (nextSource === 'team' && !current) return false;
      mode = nextSource === 'team' ? current.mode : nextMode;
      if (!['3v3', '4v4'].includes(mode) || !['offense', 'defense'].includes(nextKind)) return false;
      ++generation; opened = true; source = nextSource; kind = nextKind; profileId = current?.mode === mode ? current.id : null;
      bodyType = isBodyTypeForMode(mode, team()?.bodyType) ? team().bodyType : null; bodyDraft = bodyType;
      stage = 'tactics'; expandedId = null; visible = true; error = ''; localError = ''; transition = null; destroyPreview();
      sessionTrigger = document.activeElement; resumeFromBody = false;
      sheet.rememberTrigger(sessionTrigger); draw(); sheet.open(); return true;
    },
    close, pause,
    setVisible(value) { visible = Boolean(value); if (!visible) pause(); },
    handleBack() { if (!opened && !sheet.isOpen) return false; if (locked() || sheet.closing) return true; return stage === 'body' ? returnToLibrary() : close(); },
    get isOpen() { return opened || sheet.isOpen; }, get isModalOpen() { return sheet.isOpen; }, get isBodyPage() { return opened && stage === 'body'; },
    get state() { return { opened, stage, phase: phase(), mode, kind, bodyType, bodyDraft, expandedId, templateId: expandedId, source, profileId, preview: preview?.state || null }; },
  };
}
