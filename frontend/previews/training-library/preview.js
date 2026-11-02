import { templates } from '../../../shared/templates.js';
import { interpolateBoards } from '../../../shared/engine.js';
import { getBodyTypes, filterTacticsByBodyType, getTacticBodyNote } from '../../../shared/tactic-body-types.js';
import { createTrainingPlayer } from '../../src/training/player.js';
import { createLibraryCourt } from '../../src/board/court-renderer.js';
import { createLibraryPreview } from '../../src/workspace/library-preview.js';
import { createJerseySvg } from '../../src/lineups/components/jersey.js';
import { getNbaTeam } from '../../../data/nba-teams.js';

const document = window.document, app = document.querySelector('#preview-app'), content = document.querySelector('#app-content'), nav = document.querySelector('#bottom-nav');
const embedded = new URLSearchParams(location.search).get('embedded') === '1';
document.body.dataset.embedded = String(embedded);
let teams = [
  { id: 'demo-3v3', name: '周末三人队', mode: '3v3', bodyType: 'one-big', kit: 'BOS', members: ['小王', '小李', '小张'] },
  { id: 'demo-4v4', name: '周末四人队', mode: '4v4', bodyType: 'two-big', kit: 'DAL', members: ['阿明', '小陈', '大刘', '小周'] },
];
let teamId = teams[0].id, view = 'training', route = 'main', bodyDraft = null, bodyReturn = null, lockerIndex = 0;
let template = templates.find(t => t.id === 'pick-roll'), play = template.build(), speed = 1, loop = true, court = null;
let modal = null, phase = 'closed', timer = null, token = 0, expandedId = null, kind = 'offense', previews = [], trigger = null, form = null, afterClose = null;
let lastMainFocus = null, toastTimer;
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const team = () => teams.find(t => t.id === teamId);
const activeType = () => getBodyTypes(team().mode).find(t => t.id === team().bodyType);
const runtime = createTrainingPlayer({ frameCount: play.frames.length, requestFrame: fn => requestAnimationFrame(fn), cancelFrame: id => cancelAnimationFrame(id), now: () => performance.now(), getSpeed: () => speed, getLoop: () => loop, onFrame: paintTraining, onComplete: paintTraining });

function el(tag, className = '', text) { const n = document.createElement(tag); n.className = className; if (text !== undefined) n.textContent = text; return n; }
function button(text, action, fn, options = {}) { const b = el('button', options.className || 'button', text); b.type = 'button'; b.dataset.action = action; Object.assign(b.dataset, options.data || {}); b.disabled = Boolean(options.disabled); b.addEventListener('click', () => { if (!b.disabled && b.isConnected) fn(b); }); return b; }
function icon(name) { return ({ locker: '♧', training: '▱', my: '♙' })[name]; }
function notify(text) { const n = document.querySelector('#preview-toast'); n.textContent = text; n.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => n.classList.remove('visible'), 2600); }
function pauseMain() { runtime.pause({ snap: false }); paintTraining(); }
function jersey(index = 0, owner = team()) { return createJerseySvg({ document, team: getNbaTeam(owner.kit), number: [7, 12, 30, 88][index] || 7, name: owner.members[index] || '', idPrefix: `preview-${owner.id}-${index}` }); }
function destroyPreviews() { for (const p of previews) p.runtime.destroy(); previews = []; }
function drawNav() {
  nav.replaceChildren();
  for (const [id, label] of [['locker', '更衣室'], ['training', '训练场'], ['my', '我的']]) {
    const b = button('', 'nav', () => navigate(id), { data: { view: id }, disabled: phase !== 'closed', className: 'nav-button' });
    b.setAttribute('aria-current', view === id ? 'page' : 'false'); b.append(el('span', 'nav-icon', icon(id)), el('span', '', label)); nav.append(b);
  }
}
function header(title, subtitle, back) { const h = el('header', 'secondary-header'); h.id = 'secondary-header'; const copy = el('div'); copy.append(el('h1', '', title), el('p', '', subtitle)); h.append(button('‹', 'back', back, { className: 'icon-button' }), copy); return h; }
function navigate(next) { if (phase !== 'closed') return; pauseMain(); view = next; route = 'main'; draw(); }
function draw() {
  content.replaceChildren(); app.dataset.view = view; app.dataset.route = route;
  if (route === 'body') drawBody(); else if (route === 'teams') drawTeams(); else if (view === 'training') drawTraining(); else if (view === 'locker') drawLocker(); else drawMy();
  drawNav();
}
function drawTraining() {
  const card = el('section', 'glass-card training-card'); card.id = 'page-card';
  const head = el('header', 'training-head'); head.append(el('h1', '', template.title), button('▱ 战术库', 'library-open', openLibrary, { className: 'button library-entry' }));
  const context = el('div', 'training-context'); context.append(el('span', 'pill', `${template.mode} · ${template.kind === 'defense' ? '防守' : '进攻'}`), el('span', 'quiet', team().name));
  const host = el('div', 'training-court'); host.id = 'training-court'; court = createLibraryCourt({ document, template, board: play.frames[0], surfaceId: 'preview-main' }); host.append(court.element);
  const controls = el('div', 'training-details'); const note = el('p', 'training-note'); note.id = 'training-note'; const scrub = el('input', 'training-scrub'); scrub.type = 'range'; scrub.min = '0'; scrub.max = String(play.frames.length - 1); scrub.step = '.001'; scrub.value = String(runtime.position); scrub.dataset.action = 'training-scrub'; scrub.setAttribute('aria-label', '战术进度'); scrub.addEventListener('input', () => { runtime.pause({ snap: false }); runtime.seek(Number(scrub.value)); paintTraining(); });
  const steps = el('div', 'training-steps'); for (let i = 0; i < play.frames.length; i++) steps.append(button(String(i + 1), 'training-step', () => { pauseMain(); runtime.seek(i); paintTraining(); }, { data: { index: i }, className: 'step-dot' }));
  const row = el('div', 'playback-controls'); const rates = el('select'); rates.dataset.action = 'training-speed'; rates.setAttribute('aria-label', '播放速度'); for (const value of [.5, 1, 1.5, 2]) { const o = el('option', '', `${value}×`); o.value = value; o.selected = speed === value; rates.append(o); } rates.addEventListener('change', () => { speed = Number(rates.value); });
  const looping = el('label', 'loop-label'); const check = el('input'); check.type = 'checkbox'; check.checked = loop; check.dataset.action = 'training-loop'; check.addEventListener('change', () => { loop = check.checked; }); looping.append(check, document.createTextNode('循环'));
  row.append(rates, button('↺', 'training-restart', () => { runtime.pause({ snap: false }); runtime.seek(0); paintTraining(); }, { className: 'icon-button' }), button('▶', 'training-toggle', () => { runtime.playing ? runtime.pause({ snap: false }) : runtime.play(); paintTraining(); }, { className: 'play-button' }), looping);
  controls.append(note, scrub, steps, row); card.append(head, context, host, controls); content.append(card); paintTraining();
}
function paintTraining() {
  if (!court || view !== 'training' || route !== 'main') return;
  const s = runtime.state, from = play.frames[s.stepIndex], to = play.frames[Math.min(play.frames.length - 1, s.stepIndex + 1)];
  court.draw({ board: s.fraction > 0 ? interpolateBoards(from, to, s.interpolation) : from, from, to, fraction: s.fraction, stepIndex: s.stepIndex });
  const note = document.querySelector('#training-note'); if (note) note.textContent = `${s.stepIndex + 1} / ${play.frames.length}　${from.note}`;
  const scrub = document.querySelector('[data-action=training-scrub]'); if (scrub) scrub.value = s.position;
  const toggle = document.querySelector('[data-action=training-toggle]'); if (toggle) { toggle.textContent = runtime.playing ? 'Ⅱ' : '▶'; toggle.setAttribute('aria-label', runtime.playing ? '暂停战术' : '播放战术'); toggle.setAttribute('aria-pressed', String(runtime.playing)); }
  for (const b of document.querySelectorAll('[data-action=training-step]')) b.setAttribute('aria-current', String(Number(b.dataset.index) === s.stepIndex));
}
function drawLocker() {
  const brand = el('div', 'brand'); const img = el('img'); img.src = '../../assets/app-icon.png'; img.alt = '球搭'; brand.append(img, el('strong', '', 'HOOPAL')); content.append(brand);
  const card = el('section', 'glass-card locker-card'); card.id = 'page-card'; const head = el('header', 'card-head'); head.append(el('h1', '', '更衣室'), button('换球队 ›', 'teams-open', () => { route = 'teams'; draw(); }, { className: 'text-button' }));
  const title = el('div', 'locker-team'); title.append(el('h2', '', team().name), el('p', 'quiet', `${team().mode} · ${getNbaTeam(team().kit).name}`));
  const cabinet = el('div', 'cabinet'); const uniform = el('div', 'cabinet-uniform'); uniform.append(jersey(lockerIndex)); cabinet.append(el('div', 'cabinet-light'), el('div', 'hanger', '⌒'), uniform, el('div', 'nameplate', team().members[lockerIndex]), el('div', 'cabinet-bench'));
  const members = el('div', 'member-controls'); members.append(button('‹', 'locker-prev', () => { lockerIndex = Math.max(0, lockerIndex - 1); draw(); }, { className: 'icon-button', disabled: lockerIndex === 0 })); const dots = el('div', 'member-dots'); for (let i = 0; i < team().members.length; i++) { const b = button('●', 'locker-member', () => { lockerIndex = i; draw(); }, { className: 'text-button', data: { index: i } }); b.setAttribute('aria-current', String(lockerIndex === i)); dots.append(b); } members.append(dots, button('›', 'locker-next', () => { lockerIndex = Math.min(team().members.length - 1, lockerIndex + 1); draw(); }, { className: 'icon-button', disabled: lockerIndex === team().members.length - 1 }));
  const foot = el('footer', 'locker-footer'); foot.append(el('p', 'quiet', '按球队体型，挑一套配合'), button('挑选战术', 'body-open', () => beginBody('locker'), { className: 'button primary' }), button('配置球员', 'member-manage', () => openForm('member'), { className: 'button secondary' }));
  card.append(head, title, cabinet, members, foot); content.append(card);
}
function drawMy() {
  const card = el('section', 'glass-card my-card'); card.id = 'page-card'; card.append(el('h1', '', '我的'), el('div', 'my-avatar', 'H'), el('h2', '', '我的篮球空间'), el('p', 'quiet', '球队与配合，都在手边。'), button('球队管理　›', 'teams-open', () => { route = 'teams'; draw(); }, { className: 'menu-row' }), button('关于本次预览　›', 'about-open', () => { openForm('about'); }, { className: 'menu-row' })); content.append(card);
}
function drawTeams() {
  content.append(header('球队管理', '我的 · 示例球队', () => { route = 'main'; draw(); }));
  const card = el('section', 'glass-card teams-card'); card.id = 'page-card'; const list = el('div', 'team-list');
  for (const t of teams) { const row = el('article', 'team-card'); row.dataset.teamId = t.id; const image = el('div', 'team-jersey'); image.append(jersey(0, t)); const copy = el('div', 'team-copy'); copy.append(el('h2', '', t.name), el('p', 'quiet', `${t.mode} · ${t.id === teamId ? '当前球队' : '示例球队'}`)); const actions = el('div', 'team-actions'); actions.append(button(t.id === teamId ? '当前使用' : '使用', 'team-use', () => { teamId = t.id; lockerIndex = 0; expandedId = null; route = 'main'; view = 'locker'; draw(); notify('已切换预览球队'); }, { className: 'text-button', disabled: t.id === teamId, data: { teamId: t.id } }), button('管理', 'team-manage', () => openForm('team', t.id), { className: 'button secondary', data: { teamId: t.id } })); row.append(image, copy, actions); list.append(row); }
  card.append(list, el('p', 'quiet preview-memory', '示例修改仅在当前预览页面中保留'), button('创建球队', 'team-create', () => openForm('create'), { className: 'button primary' })); content.append(card);
}
function figures(type) {
  const wrap = el('span', 'body-figures'); const sizes = [...Array(type.largeCount).fill('large'), ...Array(type.smallCount).fill('small'), ...Array(type.equalCount).fill('equal')]; for (const size of sizes) { const p = el('i', `person ${size}`); p.setAttribute('aria-hidden', 'true'); wrap.append(p); } return wrap;
}
function beginBody(origin = 'training') { if (phase !== 'closed') return; pauseMain(); bodyDraft = team().bodyType; bodyReturn = { origin, reopen: origin === 'library', view, kind, expandedId }; route = 'body'; view = 'training'; draw(); }
function cancelBody() { const destination = bodyReturn; bodyDraft = null; bodyReturn = null; route = 'main'; view = destination?.view || 'training'; draw(); if (destination?.reopen) openLibrary({ restore: destination }); }
function drawBody() {
  content.append(header('选择阵容类型', `${team().name} · ${team().mode}`, cancelBody)); const card = el('section', 'glass-card body-card'); card.id = 'page-card'; const list = el('div', 'body-list'); list.append(el('p', 'quiet body-intro', '看看球队的整体体型'));
  for (const t of getBodyTypes(team().mode)) { const b = button('', 'body-type', () => { bodyDraft = t.id; draw(); }, { className: 'body-choice', data: { bodyType: t.id } }); b.setAttribute('aria-pressed', String(t.id === bodyDraft)); const copy = el('span', 'body-copy'); copy.append(el('strong', '', t.label), el('small', '', t.description)); b.append(copy, figures(t), el('span', 'body-check', t.id === bodyDraft ? '✓' : '')); list.append(b); }
  const foot = el('footer', 'body-footer'); foot.append(el('p', 'quiet', '无需填写每名队员的能力'), button('查看战术', 'body-apply', () => { team().bodyType = bodyDraft; bodyDraft = null; bodyReturn = null; route = 'main'; view = 'training'; draw(); openLibrary(); }, { className: 'button primary', disabled: !bodyDraft })); card.append(list, foot); content.append(card);
}

const dialog = el('dialog', 'glass-dialog'); dialog.id = 'library-dialog'; const shade = el('div', 'dialog-shade'); const sheet = el('section', 'library-sheet'); sheet.tabIndex = -1; dialog.append(shade, sheet); app.append(dialog);
function currentCatalog() { return filterTacticsByBodyType(templates, { mode: team().mode, kind, bodyType: team().bodyType }); }
function setPhase(next) { phase = next; dialog.dataset.phase = next; app.dataset.modalPhase = next; }
function openLibrary(options = {}) { if (phase !== 'closed') return; pauseMain(); trigger = document.activeElement; lastMainFocus = trigger; modal = 'library'; expandedId = options.restore?.expandedId || null; kind = options.restore?.kind || (template.mode === team().mode ? template.kind : 'offense'); form = null; openModal(); }
function openForm(type, id = teamId) { if (phase !== 'closed') return; pauseMain(); trigger = document.activeElement; const target = teams.find(t => t.id === id); form = { type, id, name: type === 'member' ? team().members[lockerIndex] : type === 'create' ? '' : target?.name || '', mode: target?.mode || '3v3' }; modal = 'form'; openModal(); }
function isolate(on) { content.inert = on; nav.inert = on; for (const n of nav.querySelectorAll('button')) n.disabled = on; content.setAttribute('aria-hidden', String(on)); nav.setAttribute('aria-hidden', String(on)); }
function fitDialog() { const r = app.getBoundingClientRect(); Object.assign(dialog.style, { position: 'fixed', left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, right: 'auto', bottom: 'auto' }); }
function openModal() {
  clearTimeout(timer); const ticket = ++token; setPhase('opening'); delete dialog.dataset.visible; renderModal(); isolate(true); app.classList.add('has-modal'); fitDialog(); dialog.showModal();
  const reveal = () => { if (ticket !== token || phase !== 'opening') return; dialog.dataset.visible = 'true'; sheet.querySelector('button')?.focus({ preventScroll: true }); timer = setTimeout(() => { if (ticket !== token || phase !== 'opening') return; setPhase('open'); sheet.querySelectorAll('button,input,select').forEach(n => { if (n.dataset.action !== 'library-use' || expandedId) n.disabled = false; }); if (!document.hidden) for (const p of previews) p.runtime.start(); }, reduced() ? 0 : 450); };
  if (reduced()) reveal(); else requestAnimationFrame(() => requestAnimationFrame(reveal));
}
function closeModal(callback = null) {
  if (phase === 'closed' || phase === 'closing') return; const ticket = ++token; clearTimeout(timer); afterClose = callback; destroyPreviews(); setPhase('closing'); delete dialog.dataset.visible; app.classList.remove('has-modal'); for (const n of sheet.querySelectorAll('button,input,select')) n.disabled = true;
  timer = setTimeout(() => { if (ticket !== token || phase !== 'closing') return; dialog.close(); setPhase('closed'); modal = null; form = null; isolate(false); drawNav(); const done = afterClose; afterClose = null; if (done) done(); else { const candidate = trigger?.isConnected && !trigger.disabled ? trigger : content.querySelector('[data-action=library-open]') || nav.querySelector('[aria-current=page]'); candidate?.focus({ preventScroll: true }); } }, reduced() ? 0 : 450);
}
function renderModal() {
  destroyPreviews(); sheet.replaceChildren(); sheet.dataset.modal = modal; const head = el('header', 'sheet-header'); const copy = el('div'); const title = modal === 'library' ? '战术库' : ({ member: '配置球员', team: '管理球队', create: '创建球队', about: '关于本次预览' })[form.type]; const h = el('h2', '', title); h.id = 'sheet-title'; dialog.setAttribute('aria-labelledby', h.id); copy.append(h, el('p', 'quiet', modal === 'library' ? `${team().name} · ${team().mode}` : '示例交互 · 仅当前页面有效')); head.append(copy, button('×', 'library-close', () => closeModal(), { className: 'icon-button' })); sheet.append(el('span', 'sheet-grip'), head);
  if (modal === 'library') renderLibrary(); else renderForm();
}
function renderLibrary() {
  const filters = el('div', 'library-filters'); const context = el('div', 'library-context'); context.append(el('span', 'pill', `${team().mode} · ${activeType()?.label || '全部体型'}`), button('更换体型 ›', 'body-open', () => { if (phase === 'open') closeModal(() => beginBody('library')); }, { className: 'text-button' })); const kinds = el('div', 'kind-tabs'); for (const [id, label] of [['offense', '进攻'], ['defense', '防守']]) { const b = button(label, 'library-kind', () => { if (phase !== 'open') return; kind = id; expandedId = null; renderModal(); }, { className: 'button', data: { kind: id } }); b.setAttribute('aria-pressed', String(id === kind)); kinds.append(b); } filters.append(context, kinds); sheet.append(filters);
  const list = el('div', 'library-list'); list.setAttribute('aria-label', '按体型筛选的战术');
  for (const t of currentCatalog()) { const card = el('article', 'library-card'); card.dataset.templateId = t.id; card.dataset.expanded = String(expandedId === t.id); const title = button('', 'library-card', () => { if (phase !== 'open') return; expandedId = expandedId === t.id ? null : t.id; renderModal(); const target = sheet.querySelector(`[data-action=library-card][data-template-id="${t.id}"]`); target?.focus({ preventScroll: true }); target?.scrollIntoView({ block: 'nearest' }); }, { className: 'library-card-title', data: { templateId: t.id } }); title.setAttribute('aria-expanded', String(expandedId === t.id)); title.append(el('strong', '', t.title), el('span', '', expandedId === t.id ? '⌃' : '⌄')); card.append(title);
    if (expandedId === t.id) { const body = el('div', 'library-card-body'), scene = el('button', 'library-mini-court'); scene.type = 'button'; scene.dataset.action = 'preview-toggle'; scene.setAttribute('aria-label', '暂停或继续卡片预览'); const text = el('p', '', getTacticBodyNote(t, team().bodyType)); body.append(scene, text); card.append(body); const preview = createLibraryPreview({ template: t, button: scene }); previews.push({ id: t.id, runtime: preview, button: scene }); requestAnimationFrame(() => { if (phase === 'open' && expandedId === t.id && modal === 'library' && !document.hidden) preview.start(); }); }
    list.append(card);
  }
  const foot = el('footer', 'sheet-footer'); foot.append(button('选用这套战术', 'library-use', () => { if (phase !== 'open' || !expandedId) return; const next = templates.find(t => t.id === expandedId); closeModal(() => { template = next; play = template.build(); runtime.load({ frameCount: play.frames.length, position: 0 }); route = 'main'; view = 'training'; draw(); }); }, { className: 'button primary', disabled: !expandedId })); sheet.append(list, foot);
}
function renderForm() {
  const body = el('form', 'preview-form'); body.addEventListener('submit', e => e.preventDefault()); if (form.type === 'about') { body.append(el('p', '', '这是训练场内战术库与顶部标题的交互预览。战术动画来自项目内置内容，球队和修改仅在当前页面内存中演示，不会读取或改动正式 App。')); sheet.append(body); return; }
  const nameLabel = el('label', '', form.type === 'member' ? '队员昵称' : '球队名称'), name = el('input'); name.type = 'text'; name.maxLength = form.type === 'member' ? 24 : 40; name.value = form.name; name.dataset.action = 'form-name'; name.addEventListener('input', () => { form.name = name.value; }); nameLabel.append(name); body.append(nameLabel);
  if (form.type === 'create') { const label = el('label', '', '人数'), select = el('select'); select.dataset.action = 'form-mode'; for (const mode of ['3v3', '4v4']) { const o = el('option', '', mode); o.value = mode; o.selected = mode === form.mode; select.append(o); } select.addEventListener('change', () => { form.mode = select.value; }); label.append(select); body.append(label); }
  const hint = el('p', 'quiet', '示例修改不会写入手机或正式球队档案。'); const error = el('p', 'form-error'); error.setAttribute('role', 'alert'); body.append(hint, error); sheet.append(body); const foot = el('footer', 'sheet-footer'); foot.append(button('应用到预览', 'form-save', () => { if (phase !== 'open') return; if (!form.name.trim()) { error.textContent = '请先填写名称'; name.focus(); return; } const draft = { ...form }; closeModal(() => { if (draft.type === 'create') teams.push({ id: `demo-${teams.length + 1}`, name: draft.name.trim(), mode: draft.mode, bodyType: 'one-big', kit: 'BOS', members: Array.from({ length: draft.mode === '3v3' ? 3 : 4 }, (_, i) => `队员${i + 1}`) }); else if (draft.type === 'member') team().members[lockerIndex] = draft.name.trim(); else teams.find(t => t.id === draft.id).name = draft.name.trim(); draw(); notify('示例已更新，仅本次预览有效'); }); }, { className: 'button primary' })); sheet.append(foot);
}
shade.dataset.action = 'modal-shade'; shade.addEventListener('click', () => closeModal()); dialog.addEventListener('cancel', e => { e.preventDefault(); closeModal(); }); window.addEventListener('resize', () => { if (phase !== 'closed') fitDialog(); });
document.addEventListener('keydown', e => {
  if (phase !== 'closed') { if (e.key === 'Escape') { e.preventDefault(); closeModal(); } if (e.key === 'Tab') { const nodes = [...sheet.querySelectorAll('button,input,select')].filter(n => !n.disabled && n.getClientRects().length); if (!nodes.length) { e.preventDefault(); sheet.focus(); return; } const first = nodes[0], last = nodes.at(-1); if (e.shiftKey && (document.activeElement === first || !sheet.contains(document.activeElement))) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && (document.activeElement === last || !sheet.contains(document.activeElement))) { e.preventDefault(); first.focus(); } } return; }
  if (e.key === 'Escape' && route !== 'main') { e.preventDefault(); route === 'body' ? cancelBody() : (route = 'main', draw()); }
  if (e.code === 'Space' && view === 'training' && route === 'main' && !e.target.matches('button,input,select,textarea')) { e.preventDefault(); runtime.playing ? runtime.pause({ snap: false }) : runtime.play(); paintTraining(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseMain(); for (const p of previews) p.runtime.pause(); } }); window.addEventListener('pagehide', () => { pauseMain(); for (const p of previews) p.runtime.pause(); });
draw();
window.hoopalPreview = { ready: Promise.resolve(true), state() { return { view, route, modal, phase, teamId, mode: team().mode, bodyType: team().bodyType, bodyDraft, templateId: template.id, framePosition: runtime.position, playing: runtime.playing, expandedId, kind, previews: previews.map(p => ({ id: p.id, ...p.runtime.state })), teams: teams.map(t => ({ id: t.id, mode: t.mode, bodyType: t.bodyType, name: t.name })) }; } };
