import { PlayStore, interpolateBoards, ballPosition } from '../../shared/engine.js';
import { templates } from '../../shared/templates.js';
import { createBuiltinRepository } from './storage/builtins.js';
import { createStorageAdapter, cleanupLegacyExtras, exportFile, setupLifecycle, isNative } from './platform/index.js';
import { isPlayerVisible, isBallVisible, isTransitionBallVisible } from './board/hit-test.js';
import { paginate, pageForIndex } from './workspace/state.js';
import { createWorkspaceController } from './workspace/controller.js';
import { createLineupRepository } from './storage/lineups.js';
import { createLineupSession } from './storage/lineup-session.js';
import { recommendLineup } from '../../shared/recommendations.js';
import { createLineupUI } from './lineups/controller.js';
import { COURT_COLORS, appendWoodSurface, appendPlayerPiece } from './board/appearance.js';
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
let playing = false;
let position = store.play.frameIndex, lastTime = 0, raf = 0, toastTimer;
let showDefense = true, renderedStep = -1, endHold = 0;
let workspace, libraryDeck;
const pages = { steps: 0 };
let listedFrame = -1;
const svg = $('court');
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


function el(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
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
  if (playing) stop();
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
    position = store.play.frameIndex;
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
function courtBase() {
  svg.replaceChildren();
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', '半场篮球战术动画');
  const defs = el('defs');
  for (const id of ['run', 'pass', 'dribble', 'screen', 'defense']) {
    const color = id === 'defense' ? COURT_COLORS.defenseRoute : COURT_COLORS[id];
    const marker = el('marker', { id: `arrow-${id}`, viewBox: '0 0 12 12', refX: 10, refY: 6, markerWidth: 10, markerHeight: 10, orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse' });
    marker.append(el('path', { d: id === 'screen' ? 'M9 0 L9 12' : 'M2 1 L10 6 L2 11', fill: 'none', stroke: color, 'stroke-width': 2.6, 'stroke-linejoin': 'round' }));
    defs.append(marker);
  }
  svg.append(defs);
  appendWoodSurface(svg, el, 'court-wood', true);
  svg.append(el('rect', { x: 350, y: 70, width: 300, height: 320, fill: COURT_COLORS.key, 'fill-opacity': .9 }));
  const lines = el('g', { stroke: COURT_COLORS.marking, 'stroke-width': 3, fill: 'none' });
  lines.append(
    el('rect', { x: 70, y: 70, width: 860, height: 660 }),
    el('rect', { x: 350, y: 70, width: 300, height: 320 }),
    el('path', { d: 'M390 390 A110 110 0 0 0 610 390' }),
    el('path', { d: 'M390 390 A110 110 0 0 1 610 390', 'stroke-dasharray': '9 10', opacity: 0.6 }),
    el('path', { d: 'M110 70 L110 226 A399 399 0 0 0 890 226 L890 70' }),
    el('path', { d: 'M395 730 A105 105 0 0 1 605 730' }),
    el('path', { d: 'M425 140 A75 75 0 0 0 575 140' }),
    el('path', { d: 'M350 210H330 M350 260H330 M650 210H670 M650 260H670', 'stroke-width': 3 })
  );
  const lineEdge = lines.cloneNode(true);
  lineEdge.setAttribute('stroke', COURT_COLORS.lineEdge);
  lineEdge.setAttribute('stroke-width', '5');
  lineEdge.setAttribute('opacity', '.4');
  svg.append(lineEdge, lines, el('path', { d: 'M447 108H553', stroke: COURT_COLORS.lineEdge, 'stroke-width': 9, 'stroke-linecap': 'round' }), el('path', { d: 'M447 108H553', stroke: COURT_COLORS.marking, 'stroke-width': 5, 'stroke-linecap': 'round' }), el('path', { d: 'M500 108V125', stroke: COURT_COLORS.lineEdge, 'stroke-width': 4 }), el('circle', { cx: 500, cy: 140, r: 16, stroke: COURT_COLORS.pass, 'stroke-width': 5, fill: 'none' }), el('text', { x: 500, y: 786, 'text-anchor': 'middle', fill: COURT_COLORS.muted, 'font-size': 17, 'letter-spacing': 7, 'font-family': 'system-ui' }, 'HOOPAL / PLAY WITH PURPOSE'));
  svg.append(el('g', { id: 'routes-layer' }), el('g', { id: 'players-layer' }), el('g', { id: 'ball-layer' }));
}
function routeElement(route) {
  const defending = activeKind === 'defense' && !route.playerId?.startsWith('attack-');
  const color = defending ? COURT_COLORS.defenseRoute : COURT_COLORS[route.type];
  const points = route.points;
  let d = points.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ');
  if (route.type === 'dribble') {
    const a = points[0], b = points.at(-1), dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy);
    const n = Math.max(2, Math.floor(length / 20));
    d = `M${a.x} ${a.y}`;
    for (let i = 1; i <= n; i++) {
      const t = i / n, wave = i === n ? 0 : (i % 2 ? 5 : -5);
      d += ` L${a.x + dx * t - dy / length * wave} ${a.y + dy * t + dx / length * wave}`;
    }
  }
  const group = el('g', { 'data-route': route.id, 'data-actor': route.playerId || '', opacity: activeKind === 'defense' && !defending ? 0.35 : 1 });
  group.append(el('path', { d, stroke: 'transparent', 'stroke-width': 24, fill: 'none', 'pointer-events': 'stroke' }));
  group.append(el('path', { d, stroke: color, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none', 'stroke-dasharray': route.type === 'pass' ? '11 10' : '', 'marker-end': `url(#arrow-${defending && route.type !== 'screen' ? 'defense' : route.type})`, 'pointer-events': 'none' }));
  return group;
}
function draw(board = store.board, ballVisible = isBallVisible(board, showDefense, focusTeam())) {
  const routes = $('routes-layer'), players = $('players-layer'), balls = $('ball-layer');
  const visibleRoutes = board.paths.filter(path => {
    const actor = board.players.find(player => player.id === path.playerId);
    if (actor && !isPlayerVisible(actor, showDefense, focusTeam())) return false;
    return activeKind !== 'defense' || actor?.team !== 'attack';
  });
  routes.replaceChildren(...visibleRoutes.map(p => routeElement(p)));
  players.replaceChildren();
  for (const player of board.players) {
    if (!isPlayerVisible(player, showDefense, focusTeam())) continue;
    const attack = player.team === 'attack';
    const cursor = 'default';
    const group = el('g', { transform: `translate(${player.x} ${player.y})`, 'data-player': player.id, opacity: activeKind === 'defense' && attack ? 0.4 : 1, cursor });
    const assignment = attack && playbackAssignment.find(a => a.role === player.number);
    group.append(el('title', {}, assignment ? `职责 ${player.number}：${assignment.name} · 球衣 ${assignment.player.number} 号 · ${assignment.task}` : `${attack ? '进攻' : '防守'} ${player.number} 号`));
    group.append(el('circle', { r: 36, fill: 'transparent' }));
    appendPlayerPiece(group, el, 'court-wood', player.team);
    group.append(el('text', { y: 7, 'text-anchor': 'middle', fill: COURT_COLORS.line, 'font-size': 21, 'font-family': 'system-ui', 'font-weight': 750, 'pointer-events': 'none', 'paint-order': 'stroke', stroke: attack ? '#B74F24' : '#2A6088', 'stroke-width': .5 }, player.number));
    players.append(group);
  }
  const ball = ballPosition(board);
  balls.replaceChildren();
  if (!ballVisible) return;
  const group = el('g', { transform: `translate(${ball.x} ${ball.y})`, 'data-ball': 'true', opacity: activeKind === 'defense' ? 0.6 : 1, cursor: 'default' });
  group.append(el('title', {}, '篮球'), el('circle', { r: 12, fill: '#F9A861', stroke: COURT_COLORS.ink, 'stroke-width': 2 }), el('path', { d: 'M-12 0H12 M0 -12V12 M-8 -9Q5 0 -8 9 M8 -9Q-5 0 8 9', stroke: COURT_COLORS.ink, 'stroke-width': 1.2, fill: 'none', 'pointer-events': 'none' }));
  balls.append(group);
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
    button.addEventListener('click', () => { stop(); store.changeFrame(i); position = i; renderAll(); persist(); });
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
  $('play-toggle').textContent = playing ? 'Ⅱ 暂停' : '▶ 播放战术';
  $('play-toggle').setAttribute('aria-label', playing ? '暂停战术' : '播放战术');
  $('play-toggle').setAttribute('aria-pressed', String(playing));
  $('frame-counter').textContent = `${Math.min(Math.floor(position) + 1, store.play.frames.length)} / ${store.play.frames.length}`;
  $('timeline-scrub').value = store.play.frames.length > 1 ? position / (store.play.frames.length - 1) * 1000 : 0;
  $('timeline-scrub').disabled = busy || store.play.frames.length < 2;
  $('play-progress').textContent = store.play.frames.length > 1 ? `${Math.round(position / (store.play.frames.length - 1) * 100)}%` : '0%';
  $('prev-frame').disabled = busy || position <= 0;
  $('next-frame').disabled = busy || position >= store.play.frames.length - 1;
  $('play-title').disabled = playing || busy;
  $('status').textContent = playing ? '正在演练 · 可调整播放速度或拖动进度' : '按步骤观察跑位，点击讲解查看动作分工。';
  const note = Array.from(store.board.note || '这一步暂无讲解。');
  $('live-step-note').textContent = `${String(store.play.frameIndex + 1).padStart(2, '0')} / ${note.slice(0, 72).join('')}${note.length > 72 ? '…' : ''}`;
  svg.classList.toggle('is-playing', playing);
  for (const node of document.querySelectorAll('[data-view-target],#open-menu,#open-note,#play-toggle,#restart-play,#frame-list button')) node.disabled = busy || Boolean(lineupUI?.isModalOpen);
  $('mode').disabled = playing || busy;
  $('template-picker').disabled = playing || busy;
  for (const button of document.querySelectorAll('[data-kind-target]')) button.disabled = busy;
}
function renderAll() {
  $('play-title').value = store.play.title;
  $('mode').value = workspace?.view === 'library' ? catalogMode : store.play.mode;
  renderSteps(); renderTemplates(); renderLegend(); draw(); controls();
}
function showPosition() {
  const index = Math.min(Math.floor(position), store.play.frames.length - 1);
  const fraction = position - index;
  const progress = playing ? Math.max(0, (fraction - 0.18) / 0.82) : fraction;
  const eased = playing ? progress * progress * (3 - 2 * progress) : progress;
  const board = fraction > 0 ? interpolateBoards(store.play.frames[index], store.play.frames[index + 1], eased) : store.play.frames[index];
  draw(board, fraction > 0 ? isTransitionBallVisible(store.play.frames[index], store.play.frames[index + 1], showDefense, focusTeam()) : isBallVisible(board, showDefense, focusTeam()));
  if (renderedStep !== index) {
    renderedStep = index;
    store.changeFrame(index);
    renderSteps();
  }
  controls();
}
function stop(snap = true) {
  playing = false;
  cancelAnimationFrame(raf);
  if (snap) { position = Math.round(position); store.changeFrame(position); }
  renderedStep = -1;
  renderSteps(); draw(); controls();
}
function tick(time) {
  if (!playing) return;
  // A callback scheduled within the same display frame can have a timestamp
  // earlier than performance.now() at start(); never move before frame zero.
  const delta = Math.max(0, Math.min((time - lastTime) / 1000, 0.1));
  lastTime = time;
  position += delta * Number($('speed').value) / 2.4;
  const last = store.play.frames.length - 1;
  if (position >= last) {
    if ($('loop-play').checked) {
      position = last;
      endHold += delta * Number($('speed').value);
      if (endHold >= 1.2) { position = 0; endHold = 0; }
    }
    else { position = last; store.changeFrame(last); stop(); return; }
  }
  showPosition();
  raf = requestAnimationFrame(tick);
}
function start() {
  if (switching || lineupBusy) return;
  workspace?.setView('play');
  persist();
  if (store.play.frames.length < 2) return;
  if (position >= store.play.frames.length - 1) position = 0;
  store.changeFrame(Math.floor(position));
  pages.steps = pageForIndex(store.play.frameIndex, 6);
  playing = true;
  endHold = 0;
  lastTime = performance.now();
  renderSteps(); controls();
  raf = requestAnimationFrame(tick);
}

$('play-toggle').addEventListener('click', () => playing ? stop() : start());
$('restart-play').addEventListener('click', () => { stop(); position = 0; store.changeFrame(0); draw(); start(); });
$('prev-frame').addEventListener('click', () => { stop(); store.changeFrame(Math.max(0, store.play.frameIndex - 1)); position = store.play.frameIndex; renderAll(); persist(); });
$('next-frame').addEventListener('click', () => { stop(); store.changeFrame(Math.min(store.play.frames.length - 1, store.play.frameIndex + 1)); position = store.play.frameIndex; renderAll(); persist(); });
$('timeline-scrub').addEventListener('input', () => {
  const progress = Number($('timeline-scrub').value);
  if (playing) stop(false);
  position = progress / 1000 * (store.play.frames.length - 1);
  showPosition();
});
$('timeline-scrub').addEventListener('change', () => { position = Math.round(position); store.changeFrame(position); renderAll(); persist(); });
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
  if (event.code === 'Space' && workspace.view === 'play') { event.preventDefault(); playing ? stop() : start(); }
  if (event.key === 'Escape') {
    if (['lineups', 'archives'].includes(workspace.view) && lineupUI?.handleBack()) event.preventDefault();
    else if (playing) stop();
  }
});
async function saveBeforeBackground() {
  libraryDeck?.pause();
  await Promise.all([...pendingOperations]);
  if (playing) stop();
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
    if (next !== 'play' && playing) stop();
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
    if (playing) stop();
    persist();
    return true;
  },
  getNote: () => store.board.note,
});
lineupUI = createLineupUI({ root: $('lineups-panel'), onAction: handleLineupAction, onNavigate: view => workspace.setView(view), onInspect: ({ title, text }) => workspace.openText(title, text), onModalChange(open) { if (open) { workspace.cancelTransition(); if (playing) stop(); } controls(); } });
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
courtBase();
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
    if (playing) { stop(); await persist(); return true; }
    const focused = document.activeElement;
    if (focused?.matches('input,textarea,select')) { focused.blur(); await persist(); return true; }
    if (['lineups', 'archives'].includes(workspace.view) && lineupUI.handleBack()) return true;
    if (workspace.view !== 'lineups') { workspace.setView('lineups'); await persist(); return true; }
    return false;
  }
}).catch(error => toast(`手机生命周期监听失败：${error.message}`));
document.body.classList.toggle('native-app', isNative());
