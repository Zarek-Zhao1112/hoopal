import { templates } from '../../../shared/templates.js';
import { getBodyTypes, isBodyTypeForMode, filterTacticsByBodyType, getTacticBodyNote } from '../../../shared/tactic-body-types.js';
import { createLibraryPreview } from '../workspace/library-preview.js';
import { createSelectionPicker } from './picker.js';

/** UI-only drafts and real builtin preview; onAction owns all saved state. */
export function createTacticSelectionUI({ document, root, onAction, onInspect, onModalChange, onClose }) {
  if (!root || typeof onAction !== 'function') throw new TypeError('挑选战术需要root与onAction');
  const window = document.defaultView, NS = 'http://www.w3.org/2000/svg';
  let state = { profiles: [], activeProfileId: null }, busy = false, writeLocked = false, error = '', localError = '';
  let opened = false, visible = true, pending = false, stage = 'body', mode = '3v3', kind = 'offense', source = 'team', profileId = null, bodyType = null, templateId = null;
  let preview = null, picker = null, generation = 0, previewFrame = null;
  const profile = () => state.profiles.find(p => p.id === state.activeProfileId);
  const team = () => profile()?.id === profileId && profile()?.mode === mode ? profile() : null;
  const locked = () => busy || pending;
  const modal = () => Boolean(picker?.isOpen);
  const node = (tag, className = '', text) => { const n = document.createElement(tag); n.className = className; if (text !== undefined) n.textContent = String(text); return n; };
  const types = () => getBodyTypes(mode);
  const selectedType = () => types().find(item => item.id === bodyType);
  const catalog = () => filterTacticsByBodyType(templates, { mode, kind, bodyType });
  function button(text, action, callback, { disabled = false, className = 'button button-subtle', data = {} } = {}) {
    const n = node('button', className, text); n.type = 'button'; n.dataset.action = action; Object.assign(n.dataset, data); n.disabled = locked() || disabled;
    n.addEventListener('click', () => { if (!n.isConnected || n.disabled || locked() || modal()) return; callback(n); }); return n;
  }
  function notice(text, role = 'status') { const n = node('p', 'selection-notice', text); n.setAttribute('role', role); return n; }
  function destroyContent() {
    if (previewFrame !== null) window.cancelAnimationFrame(previewFrame); previewFrame = null;
    preview?.destroy(); preview = null; picker?.destroy(); picker = null;
  }
  function figures(type) {
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 220 130'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('body-type-figures');
    const count = mode === '3v3' ? 3 : 4, sizes = [...Array(type.largeCount).fill('large'), ...Array(type.smallCount).fill('small'), ...Array(type.equalCount).fill('equal')];
    const width = count === 4 ? 46 : 59, offset = count === 4 ? 25 : 32;
    sizes.forEach((size, index) => {
      const h = size === 'large' ? 106 : size === 'small' ? 76 : 91, w = size === 'large' ? 34 : size === 'small' ? 25 : 29;
      const x = offset + index * width, y = 121 - h;
      const g = document.createElementNS(NS, 'g'); g.dataset.figureSize = size;
      const shape = (tag, attrs) => { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); g.append(n); return n; };
      shape('ellipse', { cx: x, cy: 124, rx: w * .66, ry: 3, fill: '#a4bfd044' });
      shape('circle', { cx: x, cy: y + h * .105, r: h * .085, fill: '#5d99c0', stroke: '#3d7fa6', 'stroke-width': 1 });
      const shoulder = y + h * .24, waist = y + h * .63;
      shape('path', { d: `M${x - w * .32},${shoulder} L${x - w * .55},${shoulder + 6} L${x - w * .65},${waist - 3} Q${x - w * .7},${waist + 4} ${x - w * .45},${waist + 3} L${x - w * .24},${shoulder + h * .12} L${x - w * .29},${waist} L${x + w * .29},${waist} L${x + w * .24},${shoulder + h * .12} L${x + w * .45},${waist + 3} Q${x + w * .7},${waist + 4} ${x + w * .65},${waist - 3} L${x + w * .55},${shoulder + 6} L${x + w * .32},${shoulder} Q${x},${shoulder + 5} ${x - w * .32},${shoulder}Z`, fill: '#6ca7ca', stroke: '#4a8eb8', 'stroke-width': 1 });
      shape('path', { d: `M${x - w * .29},${waist - 2} L${x - w * .32},${waist + h * .17} L${x - w * .08},${waist + h * .17} L${x},${waist + h * .06} L${x + w * .08},${waist + h * .17} L${x + w * .32},${waist + h * .17} L${x + w * .29},${waist - 2}Z`, fill: '#c6e1f0', stroke: '#75a5c3', 'stroke-width': .8 });
      for (const side of [-1, 1]) shape('path', { d: `M${x + side * w * .2},${waist + h * .15} L${x + side * w * .15},120 L${x + side * w * .39},121 L${x + side * w * .33},125 L${x + side * w * .07},125 L${x + side * w * .04},${waist + h * .15}Z`, fill: '#5b96bb' });
      svg.append(g);
    }); return svg;
  }
  function contextText() { return team() ? `${team().name} · ${mode}` : `${mode} · 浏览模式`; }
  async function viewTactics() {
    if (locked() || !isBodyTypeForMode(mode, bodyType)) return false;
    const selected = bodyType, target = team(), token = generation;
    if (target && writeLocked) return false;
    pending = true; localError = ''; error = ''; draw();
    let success = false;
    try {
      success = target ? await onAction('body-type', { bodyType: selected, expectedRevision: target.revision, profileId: target.id }) === true : true;
      if (!success) localError = '体型选择尚未保存，请重试；当前选择会保留。';
    } catch (reason) { localError = reason?.message || '保存失败，请重试；当前选择会保留。'; }
    finally { pending = false; }
    if (success && opened && generation === token) { stage = 'tactics'; bodyType = selected; }
    draw(); return success;
  }
  async function enterTraining() {
    if (locked() || modal() || !catalog().some(t => t.id === templateId)) return false;
    pending = true; localError = ''; error = ''; draw(); let success = false;
    try { success = await onAction('play-tactic', { templateId }) === true; if (!success) localError = '尚未进入训练场，请检查提示后重试。'; }
    catch (reason) { localError = reason?.message || '暂时无法进入训练场，请重试。'; }
    finally { pending = false; }
    if (success) close(); else draw(); return success;
  }
  function drawBody() {
    const content = node('div', 'selection-body-content'); content.append(node('p', 'selection-intro', '看看球队的整体体型'));
    const list = node('div', 'body-type-list'); list.dataset.mode = mode;
    for (const type of types()) {
      const card = button('', 'body-type', () => { bodyType = type.id; localError = ''; error = ''; draw(); }, { className: 'body-type-card', data: { bodyType: type.id } });
      card.setAttribute('aria-pressed', String(bodyType === type.id));
      const copy = node('span', 'body-type-copy'); copy.append(node('strong', '', type.label), node('small', '', type.description));
      const check = node('span', 'body-type-check', bodyType === type.id ? '✓' : ''); check.setAttribute('aria-hidden', 'true'); card.append(copy, figures(type), check); list.append(card);
    }
    content.append(list); root.append(content);
    const foot = node('footer', 'selection-footer');
    foot.append(node('p', 'selection-helper', '无需填写每名队员的能力'));
    if (writeLocked && team()) foot.append(notice('档案暂时无法读取，请先重试读取球队。', 'alert'), button('去我的重试读取', 'selection-choose-team', () => onAction('choose-team', {})));
    if (error || localError) foot.append(notice(error || localError, 'alert'));
    foot.append(button(pending ? '正在保存…' : '查看战术', 'selection-view', viewTactics, { className: 'button button-primary', disabled: !selectedType() || Boolean(team() && writeLocked) })); root.append(foot);
  }
  function drawTactics() {
    const context = node('div', 'selection-context'); context.append(node('span', 'selection-body-pill', `${mode} · ${selectedType()?.label || ''}`), button('更换体型 ›', 'selection-change-body', () => { stage = 'body'; localError = ''; error = ''; draw(); })); root.append(context);
    const tabs = node('div', 'selection-kind-tabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', '挑选进攻或防守战术');
    for (const [id, label] of [['offense', '进攻'], ['defense', '防守']]) { const n = button(label, 'selection-kind', () => { kind = id; templateId = null; localError = ''; error = ''; draw(); }, { data: { kind: id } }); n.setAttribute('aria-pressed', String(kind === id)); tabs.append(n); } root.append(tabs);
    const candidates = catalog();
    if (!candidates.some(t => t.id === templateId)) templateId = candidates[0]?.id || null;
    const current = candidates.find(t => t.id === templateId);
    const trigger = button('', 'selection-picker', () => {}, { className: 'selection-picker-trigger', disabled: !current });
    trigger.append(node('strong', '', current?.title || '暂无可浏览战术'), node('span', '', '⌄')); root.append(trigger);
    const scene = node('div', 'selection-preview-area');
    const court = button('', 'selection-preview', () => {}, { className: 'selection-court', disabled: !current }); scene.append(court); root.append(scene);
    const foot = node('footer', 'selection-footer');
    if (current) {
      const note = button(getTacticBodyNote(current, bodyType), 'selection-inspect', () => onInspect?.({ title: current.title, text: `${getTacticBodyNote(current, bodyType)}\n\n${current.description}` }), { className: 'selection-tactic-note' }); foot.append(note);
      foot.append(node('p', 'selection-helper', '先看配合，再安排场上位置'));
    } else foot.append(notice('这一分类暂时没有战术，可以更换体型或进攻／防守分类。'));
    if (error || localError) foot.append(notice(error || localError, 'alert'));
    foot.append(button(pending ? '正在载入…' : '进入训练场', 'selection-play', enterTraining, { className: 'button button-primary', disabled: !current || writeLocked })); root.append(foot);
    if (current) {
      try { preview = createLibraryPreview({ template: current, button: court });
        if (!locked() && visible && !document.hidden) previewFrame = window.requestAnimationFrame(() => { previewFrame = null; if (opened && stage === 'tactics' && !locked() && !modal() && visible) preview?.start(); });
      } catch { court.replaceChildren(node('span', 'selection-preview-error', '预览暂时不可用，可进入训练场查看。')); }
      picker = createSelectionPicker({ document, trigger, items: candidates.map(t => ({ id: t.id, title: t.title, note: getTacticBodyNote(t, bodyType) })), activeId: templateId, disabled: locked,
        beforeOpen() { preview?.pause(); }, onModalChange,
        onSelect(id) { if (!opened || locked()) return; templateId = id; draw(); window.requestAnimationFrame(() => root.querySelector('[data-action=selection-picker]')?.focus({ preventScroll: true })); },
      });
    }
  }
  function draw() {
    destroyContent(); root.hidden = !opened; document.body.dataset.tacticSelection = String(opened); if (!opened) return;
    root.replaceChildren(); root.setAttribute('aria-busy', String(locked())); root.dataset.stage = stage; root.dataset.mode = mode; root.dataset.kind = kind; root.dataset.bodyType = bodyType || ''; root.dataset.source = source; root.dataset.feedback = String(Boolean(error || localError));
    const head = node('header', 'selection-heading'), copy = node('div');
    const back = button('‹', 'selection-back', () => { if (stage === 'tactics') { stage = 'body'; localError = ''; error = ''; draw(); } else close(); }, { className: 'icon-button' }); back.setAttribute('aria-label', stage === 'tactics' ? '返回体型选择' : '返回战术库');
    copy.append(node('h1', '', stage === 'body' ? '选择阵容类型' : '挑选战术'), node('p', '', contextText())); head.append(back, copy); root.append(head);
    if (stage === 'body') drawBody(); else drawTactics();
  }
  function close({ immediate = false } = {}) {
    if (locked()) return false;
    if (modal() && !immediate) return picker.handleBack();
    ++generation; opened = false; destroyContent(); root.hidden = true; document.body.dataset.tacticSelection = 'false'; onClose?.(); return true;
  }
  function pause() { picker?.close({ immediate: true, reason: 'background' }); preview?.pause(); }
  return {
    render({ state: next, busy: nextBusy = false, error: nextError = '', writeLocked: nextLocked = false }) {
      state = next || { profiles: [], activeProfileId: null }; busy = Boolean(nextBusy); error = nextError || ''; writeLocked = Boolean(nextLocked);
      if (opened && source === 'team' && (!profile() || profile().id !== profileId || profile().mode !== mode)) {
        ++generation; opened = false; destroyContent(); root.hidden = true; document.body.dataset.tacticSelection = 'false'; onClose?.(); return;
      }
      draw();
    },
    open({ mode: nextMode, kind: nextKind = 'offense', templateId: nextTemplate, source: nextSource = 'team' } = {}) {
      if (locked() || modal()) return false;
      const current = profile();
      if (nextSource === 'team' && !current) return false;
      mode = nextSource === 'team' ? current.mode : nextMode;
      if (!['3v3', '4v4'].includes(mode) || !['offense', 'defense'].includes(nextKind)) return false;
      ++generation; source = nextSource; kind = nextKind; profileId = current?.mode === mode ? current.id : null;
      bodyType = isBodyTypeForMode(mode, current?.mode === mode ? current.bodyType : null) ? current.bodyType : null;
      stage = bodyType ? 'tactics' : 'body'; templateId = nextTemplate || null; opened = true; visible = true; error = ''; localError = ''; draw(); return true;
    },
    close, pause,
    setVisible(value) { visible = Boolean(value); if (!visible) pause(); },
    handleBack() { if (!opened) return false; if (locked()) return true; if (modal()) return picker.handleBack(); if (stage === 'tactics') { stage = 'body'; draw(); return true; } return close(); },
    get isOpen() { return opened; }, get isModalOpen() { return modal(); },
  };
}
