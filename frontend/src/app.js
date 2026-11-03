import { PlayStore, interpolateBoards } from '../../shared/engine.js';
import { templates } from '../../shared/templates.js';
import { createBuiltinRepository } from './storage/builtins.js';
import { createStorageAdapter, cleanupLegacyExtras, exportFile, setupLifecycle, isNative } from './platform/index.js';
import { isBallVisible, isTransitionBallVisible } from './board/hit-test.js';
import { createWorkspaceController } from './workspace/controller.js';
import { createLineupRepository } from './storage/lineups.js';
import { createLineupSession } from './storage/lineup-session.js';
import { createTacticSelectionUI } from './selection/ui.js';
import { createLineupUI } from './lineups/controller.js';
import { COURT_COLORS } from './board/appearance.js';
import { createTrainingCourt } from './board/court-renderer.js';
import { createTrainingPlayer } from './training/player.js';
import { createTrainingView } from './training/view.js';
import { startup } from './startup/runtime.js';

const $ = id => document.getElementById(id);
const storageAdapter = createStorageAdapter();
const repository = createBuiltinRepository({ adapter: storageAdapter, templates, clearLegacyExtras: cleanupLegacyExtras });
const lineupRepository = createLineupRepository({ adapter: storageAdapter, templates });
// Authorized old personal data is cleared before initialization. Only a builtin
// template ID and original step may be restored; old Plays are never read.
const [restored, lineupRestored] = await Promise.all([repository.load(), lineupRepository.load()]);
const lineupSession = createLineupSession({ repository: lineupRepository, builtinRepository: repository, templates, initialState: lineupRestored.state, writeLocked: lineupRestored.writeLocked });
let lineupUI, lineupBusy = false, lineupError = lineupRestored.warnings.join('；');
const pendingOperations = new Set();
function beginOperation() {
  let finish;
  const done = new Promise(resolve => { finish = resolve; });
  pendingOperations.add(done);
  return () => { pendingOperations.delete(done); finish(); };
}
const initialTemplate = templates.find(t => t.id === restored.selection.templateId);
const initial = initialTemplate.build();
initial.frameIndex = restored.selection.frameIndex;
let activeTemplateId = initialTemplate.id;
let activeKind = initialTemplate.kind || 'offense', catalogKind = activeKind, catalogMode = initial.mode;
let saveVersion = 0, switching = false;
const store = new PlayStore(initial);
let toastTimer;
let showDefense = true, renderedStep = -1;
let workspace, courtRenderer, selectionUI, selectionPlayPending = false;
let selectionOrigin = null;
const svg = $('court');
const training = createTrainingPlayer({
  frameCount: store.play.frames.length, position: store.play.frameIndex,
  requestFrame: callback => requestAnimationFrame(callback), cancelFrame: id => cancelAnimationFrame(id), now: () => performance.now(),
  getSpeed: () => Number($('speed').value), getLoop: () => $('loop-play').checked,
  onFrame: showPosition, onComplete: () => stop(),
});
const trainingView = createTrainingView({ document, onSelectStep(i) {
  stop(); store.changeFrame(i); training.seek(i); renderAll(); persist();
} });
const NS = 'http://www.w3.org/2000/svg';
const focusTeam = () => activeKind === 'defense' ? 'defense' : 'attack';
const catalogFor = (kind, mode = store.play.mode) => templates.filter(t => t.mode === mode && (t.kind || 'offense') === kind);

function toast(message) {
  $('toast-live').textContent = message;
  $('toast-live').classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast-live').classList.remove('visible'), 3500);
}
function activeLineup() {
  const state = lineupSession.state;
  return state.profiles.find(profile => profile.id === state.activeProfileId);
}
function renderLineups() {
  const options = { state: lineupSession.state, busy: lineupBusy, error: lineupError, writeLocked: lineupSession.writeLocked };
  lineupUI?.render(options);
  selectionUI?.render(options);
}
function renderLegend() {
  // Retired role plans remain readable on disk; this flow teaches numbered duties.
  const box = $('lineup-legend');
  if (box) { box.hidden = true; box.replaceChildren(); }
  document.body.dataset.lineupContext = '';
}
async function handleLineupAction(kind, payload = {}) {
  if (kind === 'conditions') return openSelection(payload.templateId);
  if (lineupBusy || switching) return false;
  lineupBusy = true; lineupError = '';
  const finishOperation = beginOperation();
  if (training.playing) stop();
  renderLineups(); controls();
  try {
    if (kind === 'create') { await lineupSession.create(payload); toast('阵容已创建并保存在本机'); }
    else if (kind === 'update') { await lineupSession.update(payload.profile); toast('阵容已保存在本机'); }
    else if (kind === 'select') {
      // Reopening the current team preserves its confirmed identity.
      if (payload.id !== lineupSession.state.activeProfileId) await lineupSession.select(payload.id);
    }
    else if (kind === 'delete') { await lineupSession.remove(payload.id); toast('阵容档案已删除'); }
    else if (kind === 'retry') {
      const result = await lineupSession.reload();
      if (result.writeLocked) throw new Error(result.warnings.join('；'));
      lineupError = result.warnings.join('；');
    } else throw new Error('无法识别的阵容操作');
    return true;
  } catch (error) {
    lineupError = `操作未完成：${error.message}`;
    toast(lineupError);
    return false;
  } finally {
    lineupBusy = false;
    renderLineups(); renderLegend(); draw(); controls();
    finishOperation();
  }
}
function openSelection(templateId, { source = 'team' } = {}) {
  if (startup.active || switching || lineupBusy || lineupUI?.isModalOpen || selectionUI?.isModalOpen) return false;
  const profile = activeLineup();
  if (source === 'team' && !profile) return workspace.setView('archives');
  const requested = templates.find(t => t.id === templateId);
  const mode = source === 'team' ? profile.mode : requested?.mode || catalogMode;
  const template = requested?.mode === mode ? requested : templates.find(t => t.id === profile?.recentTemplateId && t.mode === mode) || catalogFor(source === 'team' ? 'offense' : catalogKind, mode)[0];
  if (!template || selectionUI?.isOpen) return false;
  catalogKind = template.kind || 'offense'; catalogMode = mode;
  stop(false);
  selectionOrigin = { source, profileId: source === 'team' ? profile.id : null, mode };
  if (!selectionUI.open({ mode, kind: catalogKind, templateId: template.id, source })) return false;
  renderTemplates(); renderLineups(); controls();
  return true;
}
async function handleSelectionAction(kind, payload = {}) {
  if (kind === 'choose-team') { selectionUI.close(); return workspace.setView('archives'); }
  if (lineupBusy || switching) return false;
  lineupBusy = true; lineupError = '';
  const finishOperation = beginOperation();
  renderLineups(); controls();
  try {
    if (kind === 'body-type') {
      const profile = activeLineup();
      if (!selectionOrigin || profile?.id !== payload.profileId || profile?.mode !== selectionUI.state.mode) throw new Error('当前球队已变化，请重新挑选');
      await lineupSession.setBodyType(payload);
    } else if (kind === 'play-tactic') {
      const template = templates.find(t => t.id === payload.templateId);
      if (!template || template.mode !== selectionUI.state.mode) throw new Error('战术人数已变化，请重新挑选');
      const profile = activeLineup();
      if (selectionOrigin.source === 'team' && (profile?.id !== selectionOrigin.profileId || profile?.mode !== template.mode)) throw new Error('当前球队已变化，请重新挑选');
      if (!await loadTemplate(payload.templateId, { navigate: false })) return false;
      selectionPlayPending = true;
    } else throw new Error('无法识别的挑选操作');
    return true;
  } catch (error) { lineupError = '操作未完成：' + error.message; toast(lineupError); return false; }
  finally { lineupBusy = false; renderLineups(); renderLegend(); showPosition(); finishOperation(); }
}
function setStorageStatus(message) {
  const status = $('storage-status');
  status.textContent = message;
  status.hidden = !message;
}
async function persist() {
  const version = ++saveVersion;
  setStorageStatus(restored.legacyCleared ? '' : '旧个人数据清除失败，请重启重试');
  try {
    await repository.saveSelection({ templateId: activeTemplateId, frameIndex: store.play.frameIndex });
    if (version === saveVersion) setStorageStatus(restored.legacyCleared ? '' : '旧个人数据清除失败，请重启重试');
    return true;
  } catch (error) {
    if (version === saveVersion) setStorageStatus(restored.legacyCleared ? '选择进度记录失败，请重试' : '旧个人数据清除失败，请重启重试');
    console.error('内置战术进度记录失败', error);
    return false;
  }
}
async function loadTemplate(templateId, { navigate = true } = {}) {
  if (switching) return false;
  const template = templates.find(t => t.id === templateId);
  if (!template) return false;
  switching = true;
  const finishOperation = beginOperation();
  let loaded = false;
  stop(false);
  document.body.classList.add('is-loading');
  for (const container of document.querySelectorAll('.app-header,.workspace')) container.inert = true;
  try {
    await lineupSession.clearContext();
    const next = template.build();
    // Persist the explicit choice before replacing the visible play. A failed
    // write leaves the old tactic and fractional clock available for retry.
    await repository.saveSelection({ templateId, frameIndex: next.frameIndex });
    ++saveVersion;
    store.load(next);
    activeTemplateId = templateId;
    activeKind = template.kind || 'offense';
    catalogKind = activeKind;
    catalogMode = template.mode;
    training.load({ frameCount: store.play.frames.length, position: store.play.frameIndex });
    renderAll();
    loaded = true;
    return true;
  } catch (error) {
    toast(`战术切换失败：${error.message}`);
    renderAll();
    return false;
  } finally {
    switching = false;
    document.body.classList.remove('is-loading');
    for (const container of document.querySelectorAll('.app-header,.workspace')) container.inert = false;
    if (loaded && navigate) {
      while (workspace?.closeTopDialog()) { /* Close any source dialog after a successful load. */ }
      workspace?.setView('play');
    }
    renderLegend(); controls();
    finishOperation();
  }
}
function draw(board = store.board, ballVisible) {
  courtRenderer.draw(board, { kind: activeKind, showOpponent: showDefense, ballVisible, playerTitle(player) {
    return `${player.team === 'attack' ? '进攻' : '防守'} ${player.number} 号`;
  } });
}

function renderSteps() {
  trainingView.renderSteps(store.play.frames, store.play.frameIndex);
}
function syncTemplatePicker() {
  const picker = $('template-picker');
  if (!picker) return;
  if (picker.options[0]) picker.options[0].textContent = '选择其他内置战术';
  picker.value = activeTemplateId;
  for (const card of document.querySelectorAll('.template-card')) card.classList.toggle('active', card.dataset.templateId === activeTemplateId);
}
function renderTemplates() {
  const picker = $('template-picker');
  picker.replaceChildren(new Option('选择示例', ''));
  for (const template of catalogFor(activeKind)) picker.append(new Option(`${template.title}${template.category ? ` · ${template.category}` : ''}`, template.id));
  document.body.dataset.tacticKind = activeKind;
  document.body.dataset.catalogKind = catalogKind;
  for (const button of document.querySelectorAll('[data-kind-target]')) button.setAttribute('aria-pressed', String(button.dataset.kindTarget === catalogKind));
  $('tactic-kind-label').textContent = activeKind === 'defense' ? '防守战术' : '进攻战术';
  $('opponent-toggle-label').textContent = activeKind === 'defense' ? '显示对手' : '显示防守';
  syncTemplatePicker();
}
function controls() {
  const busy = switching || lineupBusy || Boolean(lineupUI?.isModalOpen) || Boolean(selectionUI?.isOpen);
  const blocked = busy;
  trainingView.render({ title: store.play.title, note: store.board.note, playing: training.playing });
  $('frame-counter').textContent = `${Math.min(Math.floor(training.position) + 1, store.play.frames.length)} / ${store.play.frames.length}`;
  $('timeline-scrub').value = store.play.frames.length > 1 ? training.position / (store.play.frames.length - 1) * 1000 : 0;
  $('timeline-scrub').disabled = blocked || store.play.frames.length < 2;
  $('play-progress').textContent = store.play.frames.length > 1 ? `${Math.round(training.position / (store.play.frames.length - 1) * 100)}%` : '0%';
  $('prev-frame').disabled = blocked || training.position <= 0;
  $('next-frame').disabled = blocked || training.position >= store.play.frames.length - 1;
  $('play-title').disabled = training.playing || blocked;
  $('status').textContent = training.playing ? '正在演练 · 可调整播放速度或拖动进度' : '按步骤观察跑位，点击讲解查看动作分工。';
  svg.classList.toggle('is-playing', training.playing);
  for (const node of document.querySelectorAll('[data-view-target],#open-tactic-library,#open-menu,#open-note,#play-toggle,#restart-play,#frame-list button,#speed,#loop-play,#toggle-defense')) node.disabled = blocked;
  $('mode').disabled = training.playing || blocked;
  $('template-picker').disabled = training.playing || blocked;
  for (const button of document.querySelectorAll('[data-kind-target]')) button.disabled = blocked;
}
function renderAll() {
  $('play-title').value = store.play.title;
  $('mode').value = workspace?.view === 'library' ? catalogMode : store.play.mode;
  renderSteps(); renderTemplates(); renderLegend(); showPosition();
}
function showPosition() {
  const { stepIndex: index, fraction, interpolation } = training.state;
  const board = fraction > 0 ? interpolateBoards(store.play.frames[index], store.play.frames[index + 1], interpolation) : store.play.frames[index];
  draw(board, fraction > 0 ? isTransitionBallVisible(store.play.frames[index], store.play.frames[index + 1], showDefense, focusTeam()) : isBallVisible(board, showDefense, focusTeam()));
  if (renderedStep !== index) { renderedStep = index; store.changeFrame(index); renderSteps(); }
  controls();
}
function stop(snap = true) {
  training.pause({ snap });
  if (snap) store.changeFrame(training.position);
  renderedStep = -1;
  renderSteps(); if (snap) draw(); else showPosition(); controls();
}
function start() {
  if (switching || lineupBusy || selectionUI?.isOpen) return;
  workspace?.setView('play');
  persist();
  if (store.play.frames.length < 2) return;
  training.play();
  store.changeFrame(Math.floor(training.position));
  renderSteps(); controls();
}

$('play-toggle').addEventListener('click', () => training.playing ? stop() : start());
$('open-tactic-library').addEventListener('click', () => openSelection(activeTemplateId, { source: 'library' }));
$('restart-play').addEventListener('click', () => { stop(); training.seek(0); store.changeFrame(0); draw(); start(); });
$('prev-frame').addEventListener('click', () => { stop(); store.changeFrame(Math.max(0, store.play.frameIndex - 1)); training.seek(store.play.frameIndex); renderAll(); persist(); });
$('next-frame').addEventListener('click', () => { stop(); store.changeFrame(Math.min(store.play.frames.length - 1, store.play.frameIndex + 1)); training.seek(store.play.frameIndex); renderAll(); persist(); });
$('timeline-scrub').addEventListener('input', () => {
  const progress = Number($('timeline-scrub').value);
  if (training.playing) stop(false);
  training.seek(progress / 1000 * (store.play.frames.length - 1));
  showPosition();
});
$('timeline-scrub').addEventListener('change', () => { training.seek(Math.round(training.position)); store.changeFrame(training.position); renderAll(); persist(); });
$('toggle-defense').addEventListener('change', event => { showDefense = event.target.checked; draw(); });
for (const button of document.querySelectorAll('[data-kind-target]')) button.addEventListener('click', () => {
  const kind = button.dataset.kindTarget;
  if (switching || !['offense','defense'].includes(kind)) return;
  catalogKind = kind;
  renderTemplates();
  controls();
});
$('template-picker').addEventListener('change', async event => {
  if (switching || lineupBusy || training.playing || selectionUI?.isOpen) { syncTemplatePicker(); return; }
  const template = catalogFor(activeKind).find(item => item.id === event.target.value);
  if (template && await loadTemplate(template.id)) toast('内置战术已载入');
  else syncTemplatePicker();
});
$('mode').addEventListener('change', async event => {
  if (switching || lineupBusy || selectionUI?.isOpen) { renderAll(); return; }
  const mode = event.target.value;
  if (workspace?.view === 'library') {
    if (switching || lineupBusy || !['3v3','4v4'].includes(mode)) { renderAll(); return; }
    catalogMode = mode;
    renderTemplates(); controls();
    return;
  }
  const example = catalogFor(workspace?.view === 'library' ? catalogKind : activeKind, mode)[0];
  if (example && await loadTemplate(example.id)) toast(`已切换 ${mode} 内置战术`);
  else renderAll();
});
async function download(blob, suffix, title = store.play.title) {
  const result = await exportFile(blob, `${title.replace(/[<>:"/\\|?*]/g, '_')}.${suffix}`);
  return result;
}
$('export-json').addEventListener('click', async () => {
  workspace?.closeMenu();
  try { await download(new Blob([JSON.stringify(store.play, null, 2)], { type: 'application/json' }), 'json'); }
  catch (error) { toast(error.code === 'USER_CANCELLED' ? '已取消导出' : `战术导出失败：${error.message}`); }
});
$('export-png').addEventListener('click', async () => {
  workspace?.closeMenu();
  stop();
  const exportTitle = store.play.title, exportStep = store.play.frameIndex + 1;
  const snapshot = svg.cloneNode(true);
  snapshot.setAttribute('xmlns', NS);
  snapshot.setAttribute('width', '1600'); snapshot.setAttribute('height', '1312');
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(snapshot)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1600; canvas.height = 1432;
    const context = canvas.getContext('2d');
    context.fillStyle = COURT_COLORS.exportBackground; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 100);
    context.fillStyle = COURT_COLORS.exportText; context.font = 'bold 30px system-ui';
    context.fillText(`${exportTitle} · 第 ${exportStep} 步`, 50, 62, 1500);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('生成失败');
    const result = await download(blob, 'png', exportTitle);
    toast(result.method === 'share' ? '已打开图片分享' : '已导出当前步骤图片');
  } catch (error) { toast(error.code === 'USER_CANCELLED' ? '已取消导出' : '图片导出失败，请尝试导出战术 JSON'); }
  finally { URL.revokeObjectURL(url); }
});
document.addEventListener('keydown', event => {
  if (startup.active) {
    if (event.key === 'Escape') { event.preventDefault(); startup.skip(); }
    return;
  }
  if (event.key === 'Escape' && workspace?.closeTopDialog()) { event.preventDefault(); return; }
  if (event.key === 'Escape' && selectionUI?.isOpen) { event.preventDefault(); selectionUI.handleBack(); return; }
  if (event.key === 'Escape' && lineupUI?.isModalOpen) { event.preventDefault(); lineupUI.handleBack(); return; }
  if (switching || lineupBusy) return;
  if (workspace?.hasOpenDialog) return;
  if (event.target.matches('input,textarea,select,[contenteditable]')) return;
  if (event.code === 'Space' && workspace.view === 'play') { event.preventDefault(); training.playing ? stop() : start(); }
  if (event.key === 'Escape') {
    if (['lineups', 'archives'].includes(workspace.view) && lineupUI?.handleBack()) event.preventDefault();
    else if (training.playing) stop();
  }
});
async function saveBeforeBackground() {
  selectionUI?.setVisible(false);
  await Promise.all([...pendingOperations]);
  if (training.playing) stop();
  if (!await persist()) throw new Error('内置战术选择进度未能记录，请重新载入后重试');
  await repository.flush();
  await lineupSession.flush();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveBeforeBackground().catch(error => toast(error.message));
  else selectionUI?.setVisible(true);
});
window.addEventListener('pagehide', () => { saveBeforeBackground().catch(error => console.error(error)); });
window.addEventListener('halfcourt:platform-error', event => toast(`手机操作失败：${event.detail?.error?.message || '请重试'}`));
workspace = createWorkspaceController({
  beforeNavigate(next) {
    if (startup.active || switching || lineupBusy || lineupUI?.isModalOpen || selectionUI?.isOpen) return false;
    if (next !== 'play' && training.playing) stop();
    persist();
    return true;
  },
  onViewChange(next) {
    if (next === 'lineups' || next === 'archives') lineupUI?.setView(next);
    selectionUI?.setVisible(true);
    $('mode').value = next === 'library' ? catalogMode : store.play.mode;
    renderTemplates(); draw(); controls();
  },
  beforeModalOpen() {
    if (startup.active || switching || lineupBusy) return false;
    selectionUI?.pause();
    if (training.playing) stop(false);
    persist();
    return true;
  },
  getNote: () => store.board.note,
});
lineupUI = createLineupUI({ root: $('lineups-panel'), onAction: handleLineupAction, onNavigate: view => view === 'roles' ? openSelection() : workspace.setView(view), onInspect: ({ title, text }) => workspace.openText(title, text), onModalChange(open) { if (open) { workspace.cancelTransition(); if (training.playing) stop(); } controls(); } });
selectionUI = createTacticSelectionUI({ document, root: $('tactic-selection-panel'), onAction: handleSelectionAction,
  onInspect: ({ title, text }) => workspace.openText(title, text),
  onModalChange(open) { if (open) { workspace.cancelTransition(); if (training.playing) stop(false); } controls(); },
  onClose() { if (selectionPlayPending) { selectionPlayPending = false; workspace.setView('play'); } controls(); },
});
renderLineups();
courtRenderer = createTrainingCourt({ document, svg });
renderAll();
if (restored.warnings.length || lineupRestored.warnings.length) toast([...restored.warnings, ...lineupRestored.warnings].join('；'));
await persist();
await setupLifecycle({
  onBackground: saveBeforeBackground,
  onBack: async () => {
    if (startup.active) { startup.skip(); return true; }
    if (switching || lineupBusy) return true;
    if (workspace.closeTopDialog()) { await persist(); return true; }
    if (selectionUI?.handleBack()) return true;
    if (lineupUI.isModalOpen) { lineupUI.handleBack(); return true; }
    if (training.playing) { stop(); await persist(); return true; }
    const focused = document.activeElement;
    if (focused?.matches('input,textarea,select')) { focused.blur(); await persist(); return true; }
    if (['lineups', 'archives'].includes(workspace.view) && lineupUI.handleBack()) return true;
    if (workspace.view !== 'lineups') { workspace.setView('lineups'); await persist(); return true; }
    return false;
  }
}).catch(error => toast(`手机生命周期监听失败：${error.message}`));
document.body.classList.toggle('native-app', isNative());

// Read-only diagnostics expose playback/UI state without team records or mutation APIs.
window.hoopalAppSnapshot = () => ({ templateId: activeTemplateId, position: training.position, playing: training.playing, view: workspace.view, selection: selectionUI.state });
