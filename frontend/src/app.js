import { PlayStore, interpolateBoards } from '../../shared/engine.js';
import { templates } from '../../shared/templates.js';
import { createBuiltinRepository } from './storage/builtins.js';
import { createStorageAdapter, cleanupLegacyExtras, exportFile, setupLifecycle, isNative } from './platform/index.js';
import { isBallVisible, isTransitionBallVisible } from './board/hit-test.js';
import { paginate, pageForIndex } from './workspace/state.js';
import { createWorkspaceController } from './workspace/controller.js';
import { createLineupRepository } from './storage/lineups.js';
import { createLineupSession } from './storage/lineup-session.js';
import { recommendLineup } from '../../shared/recommendations.js';
import { createLineupUI } from './lineups/controller.js';
import { COURT_COLORS } from './board/appearance.js';
import { createTrainingCourt } from './board/court-renderer.js';
import { createTrainingPlayer } from './training/player.js';
import { createLibraryDeck } from './workspace/library-deck.js';
import { createLibraryPreview } from './workspace/library-preview.js';
import { startup } from './startup/runtime.js';

const $ = id => document.getElementById(id);
const storageAdapter = createStorageAdapter();
const repository = createBuiltinRepository({ adapter: storageAdapter, templates, clearLegacyExtras: cleanupLegacyExtras });
const lineupRepository = createLineupRepository({ adapter: storageAdapter, templates });
// Authorized old personal data is cleared before initialization. Only a builtin
// template ID and original step may be restored; old Plays are never read.
const [restored, lineupRestored] = await Promise.all([repository.load(), lineupRepository.load()]);
const lineupSession = createLineupSession({ repository: lineupRepository, builtinRepository: repository, templates, initialState: lineupRestored.state, writeLocked: lineupRestored.writeLocked });
let lineupUI, lineupBusy = false, lineupError = lineupRestored.warnings.join('；'), legendPage = 0;
let playbackAssignment = [];
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
let workspace, libraryDeck, courtRenderer;
const pages = { steps: 0 };
let listedFrame = -1;
const svg = $('court');
const training = createTrainingPlayer({
  frameCount: store.play.frames.length, position: store.play.frameIndex,
  requestFrame: callback => requestAnimationFrame(callback), cancelFrame: id => cancelAnimationFrame(id), now: () => performance.now(),
  getSpeed: () => Number($('speed').value), getLoop: () => $('loop-play').checked,
  onFrame: showPosition, onComplete: () => stop(),
});
const NS = 'http://www.w3.org/2000/svg';
const focusTeam = () => activeKind === 'defense' ? 'defense' : 'attack';
const catalogFor = (kind, mode = store.play.mode) => templates.filter(t => t.mode === mode && (t.kind || 'offense') === kind);

// Keep the original select, listener and busy state while placing it in the
// active page's card. Its value still follows catalog versus current play.
function placeModeControl(view) {
  const host = $(view === 'library' ? 'library-header-controls' : 'play-header-controls');
  const control = $('mode');
  if (host && control.parentElement !== host) host.prepend(control);
}


function html(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
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
  const profile = activeLineup();
  lineupUI?.render({ state: lineupSession.state, recommendations: profile ? recommendLineup(profile) : null, busy: lineupBusy, error: lineupError, writeLocked: lineupSession.writeLocked });
}
function renderLegend() {
  const box = $('lineup-legend');
  if (!box) return;
  const state = lineupSession.state, ctx = state.playbackContext;
  const profile = state.profiles.find(p => p.id === ctx?.profileId && p.id === state.activeProfileId && p.revision === ctx.profileRevision && p.mode === store.play.mode);
  const result = profile && ctx.templateId === activeTemplateId && activeKind === 'offense' ? recommendLineup(profile) : null;
  const recommendation = result?.ready && result.recommendations.find(r => r.templateId === activeTemplateId);
  playbackAssignment = recommendation ? recommendation.assignments.map(a => {
    const player = profile.players.find(p => p.id === a.playerId);
    return { ...a, player, name: player.name || `队员 ${String.fromCharCode(65 + profile.players.indexOf(player))}` };
  }) : [];
  document.body.dataset.lineupContext = recommendation ? profile.id : '';
  box.hidden = !recommendation;
  box.replaceChildren();
  if (!recommendation) return;
  const page = paginate(playbackAssignment, legendPage, 2);
  legendPage = page.page;
  const heading = html('div', 'legend-heading');
  const title = html('button', 'legend-title', profile.name);
  title.type = 'button';
  title.setAttribute('aria-label', '查看完整阵容名称');
  title.addEventListener('click', () => workspace.openText('阵容名称', profile.name));
  heading.append(title);
  const previous = html('button', 'legend-page', '‹'), next = html('button', 'legend-page', '›');
  previous.type = next.type = 'button';
  previous.id = 'legend-prev'; next.id = 'legend-next';
  previous.setAttribute('aria-label', '上一页人员分工'); next.setAttribute('aria-label', '下一页人员分工');
  previous.disabled = page.page === 0; next.disabled = page.page === page.pages - 1;
  previous.addEventListener('click', () => { legendPage--; renderLegend(); });
  next.addEventListener('click', () => { legendPage++; renderLegend(); });
  heading.append(previous, html('span', '', `${page.page + 1}/${page.pages}`), next);
  const rows = html('div', 'legend-rows');
  for (const assignment of page.items) {
    const row = html('button', 'legend-row');
    row.type = 'button';
    row.dataset.role = assignment.role;
    row.title = `职责 ${assignment.role} → ${assignment.name} · 球衣 ${assignment.player.number} 号 · ${assignment.task}`;
    row.setAttribute('aria-label', `查看完整分工：${row.title}`);
    row.addEventListener('click', () => workspace.openText('本队人员分工', row.title));
    row.append(html('span', 'legend-role', `职责 ${assignment.role}`), html('span', 'legend-name', `${assignment.name} · 球衣 ${assignment.player.number} 号`), html('span', 'legend-task', assignment.task));
    rows.append(row);
  }
  box.append(heading, rows);
}
async function handleLineupAction(kind, payload = {}) {
  if (lineupBusy || switching) return false;
  lineupBusy = true; lineupError = '';
  const finishOperation = beginOperation();
  if (training.playing) stop();
  renderLineups(); controls();
  let openPlay = false;
  try {
    if (kind === 'create') { await lineupSession.create(payload); toast('阵容已创建并保存在本机'); }
    else if (kind === 'update') { await lineupSession.update(payload.profile); toast('阵容已保存在本机'); }
    else if (kind === 'select') {
      // Reopening the current team preserves its valid recommendation identity.
      if (payload.id !== lineupSession.state.activeProfileId) await lineupSession.select(payload.id);
    }
    else if (kind === 'delete') { await lineupSession.remove(payload.id); toast('阵容档案已删除'); }
    else if (kind === 'retry') {
      const result = await lineupSession.reload();
      if (result.writeLocked) throw new Error(result.warnings.join('；'));
      lineupError = result.warnings.join('；');
    } else if (kind === 'play') {
      await lineupSession.play(payload.templateId);
      legendPage = 0;
      if (!await loadTemplate(payload.templateId, { fromRecommendation: true })) return false;
      openPlay = true;
    } else throw new Error('无法识别的阵容操作');
    return true;
  } catch (error) {
    lineupError = `操作未完成：${error.message}`;
    toast(lineupError);
    return false;
  } finally {
    lineupBusy = false;
    renderLineups(); renderLegend(); draw(); controls();
    if (openPlay) workspace.setView('play');
    finishOperation();
  }
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
async function loadTemplate(templateId, { fromRecommendation = false } = {}) {
  if (switching) return false;
  const template = templates.find(t => t.id === templateId);
  if (!template) return false;
  switching = true;
  const finishOperation = beginOperation();
  let loaded = false;
  stop();
  document.body.classList.add('is-loading');
  for (const container of document.querySelectorAll('.app-header,.workspace')) container.inert = true;
  try {
    if (!fromRecommendation) await lineupSession.clearContext();
    store.load(template.build());
    activeTemplateId = templateId;
    activeKind = template.kind || 'offense';
    catalogKind = activeKind;
    catalogMode = template.mode;
    training.load({ frameCount: store.play.frames.length, position: store.play.frameIndex });
    pages.steps = pageForIndex(store.play.frameIndex, 6);
    renderAll();
    await persist();
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
    if (loaded) {
      while (workspace?.closeTopDialog()) { /* Close any source dialog after a successful load. */ }
      workspace?.setView('play');
    }
    renderLegend(); controls();
    finishOperation();
  }
}
function draw(board = store.board, ballVisible) {
  courtRenderer.draw(board, { kind: activeKind, showOpponent: showDefense, ballVisible, playerTitle(player) {
    const assignment = player.team === 'attack' && playbackAssignment.find(a => a.role === player.number);
    return assignment ? `职责 ${player.number}：${assignment.name} · 球衣 ${assignment.player.number} 号 · ${assignment.task}` : `${player.team === 'attack' ? '进攻' : '防守'} ${player.number} 号`;
  } });
}

function renderPager(prefix, page) {
  const previous = $(`${prefix}-page-prev`), next = $(`${prefix}-page-next`), count = $(`${prefix}-page-count`);
  if (previous) previous.disabled = page.page === 0;
  if (next) next.disabled = page.page >= page.pages - 1;
  if (count) count.textContent = `${page.page + 1} / ${page.pages}`;
}
function renderSteps() {
  const list = $('frame-list');
  list.replaceChildren();
  // Locate only when the actual current frame changes; paging alone stays put.
  if (listedFrame !== store.play.frameIndex) pages.steps = pageForIndex(store.play.frameIndex, 6);
  listedFrame = store.play.frameIndex;
  const page = paginate(store.play.frames, pages.steps, 6);
  pages.steps = page.page;
  page.items.forEach((board, offset) => {
    const i = page.start + offset;
    const button = html('button', `frame-item${i === store.play.frameIndex ? ' active' : ''}`);
    button.type = 'button';
    button.dataset.frameIndex = String(i);
    button.setAttribute('aria-current', i === store.play.frameIndex ? 'step' : 'false');
    button.append(html('span', 'frame-number', String(i + 1).padStart(2, '0')), html('span', 'frame-label', board.note.split(/[：。\n]/)[0].slice(0, 18) || `步骤 ${i + 1}`));
    button.addEventListener('click', () => { stop(); store.changeFrame(i); training.seek(i); renderAll(); persist(); });
    list.append(button);
  });
  renderPager('step', page);

}
function syncTemplatePicker() {
  const picker = $('template-picker');
  if (!picker) return;
  if (picker.options[0]) picker.options[0].textContent = '选择其他内置战术';
  picker.value = activeTemplateId;
  for (const card of document.querySelectorAll('.template-card')) card.classList.toggle('active', card.dataset.templateId === activeTemplateId);
}
function renderTemplates() {
  const catalog = catalogFor(catalogKind, catalogMode);
  const picker = $('template-picker');
  picker.replaceChildren(new Option('选择示例', ''));
  for (const template of catalogFor(activeKind)) picker.append(new Option(`${template.title}${template.category ? ` · ${template.category}` : ''}`, template.id));
  $('template-count').textContent = `${catalog.length}套${catalogKind === 'defense' ? '防守' : '进攻'}`;
  document.body.dataset.tacticKind = activeKind;
  document.body.dataset.catalogKind = catalogKind;
  for (const button of document.querySelectorAll('[data-kind-target]')) button.setAttribute('aria-pressed', String(button.dataset.kindTarget === catalogKind));
  $('tactic-kind-label').textContent = activeKind === 'defense' ? '防守战术' : '进攻战术';
  $('opponent-toggle-label').textContent = activeKind === 'defense' ? '显示对手' : '显示防守';
  libraryDeck?.render({ templates: catalog, activeTemplateId, busy: switching || lineupBusy });
  syncTemplatePicker();
}
function controls() {
  const busy = switching || lineupBusy || Boolean(lineupUI?.isModalOpen);
  libraryDeck?.setBusy(busy);
  $('play-toggle').textContent = training.playing ? 'Ⅱ 暂停' : '▶ 播放战术';
  $('play-toggle').setAttribute('aria-label', training.playing ? '暂停战术' : '播放战术');
  $('play-toggle').setAttribute('aria-pressed', String(training.playing));
  $('frame-counter').textContent = `${Math.min(Math.floor(training.position) + 1, store.play.frames.length)} / ${store.play.frames.length}`;
  $('timeline-scrub').value = store.play.frames.length > 1 ? training.position / (store.play.frames.length - 1) * 1000 : 0;
  $('timeline-scrub').disabled = busy || store.play.frames.length < 2;
  $('play-progress').textContent = store.play.frames.length > 1 ? `${Math.round(training.position / (store.play.frames.length - 1) * 100)}%` : '0%';
  $('prev-frame').disabled = busy || training.position <= 0;
  $('next-frame').disabled = busy || training.position >= store.play.frames.length - 1;
  $('play-title').disabled = training.playing || busy;
  $('status').textContent = training.playing ? '正在演练 · 可调整播放速度或拖动进度' : '按步骤观察跑位，点击讲解查看动作分工。';
  const note = Array.from(store.board.note || '这一步暂无讲解。');
  $('live-step-note').textContent = `${String(store.play.frameIndex + 1).padStart(2, '0')} / ${note.slice(0, 72).join('')}${note.length > 72 ? '…' : ''}`;
  svg.classList.toggle('is-playing', training.playing);
  for (const node of document.querySelectorAll('[data-view-target],#open-menu,#open-note,#play-toggle,#restart-play,#frame-list button')) node.disabled = busy || Boolean(lineupUI?.isModalOpen);
  $('mode').disabled = training.playing || busy;
  $('template-picker').disabled = training.playing || busy;
  for (const button of document.querySelectorAll('[data-kind-target]')) button.disabled = busy;
}
function renderAll() {
  $('play-title').value = store.play.title;
  $('mode').value = workspace?.view === 'library' ? catalogMode : store.play.mode;
  renderSteps(); renderTemplates(); renderLegend(); draw(); controls();
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
  renderSteps(); draw(); controls();
}
function start() {
  if (switching || lineupBusy) return;
  workspace?.setView('play');
  persist();
  if (store.play.frames.length < 2) return;
  training.play();
  store.changeFrame(Math.floor(training.position));
  pages.steps = pageForIndex(store.play.frameIndex, 6);
  renderSteps(); controls();
}

$('play-toggle').addEventListener('click', () => training.playing ? stop() : start());
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
for (const [prefix, key, render] of [['step', 'steps', renderSteps]]) {
  for (const [direction, delta] of [['prev', -1], ['next', 1]]) $(`${prefix}-page-${direction}`)?.addEventListener('click', () => {
    if (switching) return;
      pages[key] += delta;
    render();
    controls();
  });
}
$('toggle-defense').addEventListener('change', event => { showDefense = event.target.checked; draw(); });
for (const button of document.querySelectorAll('[data-kind-target]')) button.addEventListener('click', () => {
  const kind = button.dataset.kindTarget;
  if (switching || !['offense','defense'].includes(kind)) return;
  catalogKind = kind;
  libraryDeck?.reset();
  renderTemplates();
  controls();
});
$('template-picker').addEventListener('change', async event => {
  const template = catalogFor(activeKind).find(item => item.id === event.target.value);
  if (template && await loadTemplate(template.id)) toast('内置战术已载入');
  else syncTemplatePicker();
});
$('mode').addEventListener('change', async event => {
  const mode = event.target.value;
  if (workspace?.view === 'library') {
    if (switching || lineupBusy || !['3v3','4v4'].includes(mode)) { renderAll(); return; }
    catalogMode = mode;
    libraryDeck?.reset(); renderTemplates(); controls();
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
  libraryDeck?.pause();
  await Promise.all([...pendingOperations]);
  if (training.playing) stop();
  if (!await persist()) throw new Error('内置战术选择进度未能记录，请重新载入后重试');
  await repository.flush();
  await lineupSession.flush();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveBeforeBackground().catch(error => toast(error.message));
});
window.addEventListener('pagehide', () => { saveBeforeBackground().catch(error => console.error(error)); });
window.addEventListener('halfcourt:platform-error', event => toast(`手机操作失败：${event.detail?.error?.message || '请重试'}`));
workspace = createWorkspaceController({
  beforeNavigate(next) {
    if (startup.active || switching || lineupBusy || lineupUI?.isModalOpen) return false;
    if (next !== 'library') libraryDeck?.pause();
    if (next !== 'play' && training.playing) stop();
    persist();
    return true;
  },
  onViewChange(next) {
    if (next === 'lineups' || next === 'archives') lineupUI?.setView(next);
    if (next === 'library') libraryDeck?.reset();
    libraryDeck?.setVisible(next === 'library');
    placeModeControl(next);
    $('mode').value = next === 'library' ? catalogMode : store.play.mode;
    renderTemplates(); libraryDeck?.refreshLayout(); draw(); controls();
  },
  beforeModalOpen() {
    if (startup.active || switching || lineupBusy) return false;
    libraryDeck?.pause();
    if (training.playing) stop();
    persist();
    return true;
  },
  getNote: () => store.board.note,
});
lineupUI = createLineupUI({ root: $('lineups-panel'), onAction: handleLineupAction, onNavigate: view => workspace.setView(view), onInspect: ({ title, text }) => workspace.openText(title, text), onModalChange(open) { if (open) { workspace.cancelTransition(); if (training.playing) stop(); } controls(); } });
libraryDeck = createLibraryDeck({
  root: $('template-list'), visible: workspace.view === 'library',
  makePreview: (template, button) => createLibraryPreview({ template, button }),
  onPlay: async id => {
    if (switching || lineupBusy) return false;
    if (!await loadTemplate(id)) return false;
    start();
    return true;
  },
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
