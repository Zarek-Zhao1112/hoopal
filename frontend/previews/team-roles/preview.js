import { templates } from '../../../shared/templates.js';
import { interpolateBoards } from '../../../shared/engine.js';
import { getBodyTypes, filterTacticsByBodyType, getTacticBodyNote } from '../../../shared/tactic-body-types.js';
import { getNbaTeam } from '../../../data/nba-teams.js';
import { createJerseySvg } from '../../src/lineups/components/jersey.js';
import { createTrainingCourt } from '../../src/board/court-renderer.js';
import { createTrainingPlayer } from '../../src/training/player.js';
import { createLibraryPreview } from '../../src/workspace/library-preview.js';

const roleOptions = {
  start: ['持球发起', '持球、突破分球'],
  support: ['掩护策应', '做掩护、接应'],
  screen: ['掩护配合', '做掩护、顺下或外弹'],
  relay: ['接球策应', '接球、回传或转移'],
  space: ['空间终结', '拉开、空切或接投'],
  '': ['暂不设置', '以后再选'],
};
const rolesByMode = {
  '3v3': ['start', 'support', 'space', ''],
  '4v4': ['start', 'screen', 'relay', 'space', ''],
};
const preferences = {
  'pick-roll': ['start', 'support', 'space'],
  'give-go': ['space', 'start', 'support'],
  'back-screen': ['start', 'space', 'support'],
  'dribble-handoff': ['support', 'start', 'space'],
  'pick-pop': ['start', 'support', 'space'],
  'baseline-backdoor': ['start', 'space', 'support'],
  'post-split': ['start', 'space', 'support'],
  'slip-screen': ['start', 'support', 'space'],
  'offball-flare': ['start', 'space', 'support'],
  'four-out-cut': ['space', 'relay', 'start', 'space'],
  'four-spread-pick-roll': ['start', 'space', 'space', 'screen'],
  'staggered-screens': ['start', 'space', 'screen', 'screen'],
  'high-low': ['start', 'relay', 'space', 'relay'],
  'drive-corner-kick': ['relay', 'space', 'start', 'space'],
  'spain-pick-roll': ['start', 'screen', 'space', 'screen'],
  'hammer': ['start', 'space', 'screen', 'space'],
  'zoom-handoff': ['screen', 'start', 'screen', 'space'],
  'screen-the-screener': ['start', 'screen', 'space', 'screen'],
};
const sampleMembers = [
  { name: '阿杰', number: '7', role: 'start' },
  { name: '老周', number: '23', role: 'support' },
  { name: '小林', number: '11', role: 'space' },
];
const teams = {
  '3v3': { name: '周末三人队', body: 'one-big', tactic: 'pick-roll', members: sampleMembers },
  '4v4': {
    name: '周末四人队', body: 'one-big', tactic: 'four-spread-pick-roll',
    members: [
      ...sampleMembers.map(member => ({ ...member, role: member.role === 'support' ? 'screen' : member.role })),
      { name: '阿凯', number: '30', role: 'space' },
    ],
  },
};
const params = new URLSearchParams(location.search);
let mode = params.get('mode') === '4v4' ? '4v4' : '3v3';
const team = () => teams[mode];
const kit = getNbaTeam('BOS');
const bodyLabel = id => getBodyTypes(mode).find(type => type.id === id).label;
const catalog = bodyType => filterTacticsByBodyType(templates, { mode, bodyType });
const app = document.querySelector('#preview-app');
const content = document.querySelector('#app-content');
const nav = document.querySelector('#bottom-nav');
const dialog = document.querySelector('dialog');
const sheet = dialog.querySelector('.library-sheet');
sheet.classList.add('role-sheet');
let view = params.get('view') === 'training' ? 'training' : 'locker';
let bodyDraft = team().body, returnView = view, playerIndex = 0;
let template = templates.find(tactic => tactic.id === team().tactic), play = template.build(), assignment = assign();
let court, note, dots, playButton, cardPreview, speed = 1, loop = true, temporarySwap = false, toastTimer, closing = false;

const runtime = createTrainingPlayer({
  frameCount: play.frames.length,
  requestFrame: requestAnimationFrame.bind(window),
  cancelFrame: cancelAnimationFrame.bind(window),
  now: () => performance.now(), getSpeed: () => speed, getLoop: () => loop,
  onFrame: paint, onComplete: paint,
});

function el(tag, className = '', label = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = label;
  return node;
}
function button(label, onClick, className = 'button') {
  const node = el('button', className, label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}
function select(options, current, name) {
  const node = el('select');
  node.setAttribute('aria-label', name);
  for (const [value, label] of options) node.add(new Option(label, value));
  node.value = current;
  return node;
}
function jersey(index, context) {
  const { name, number } = team().members[index];
  return createJerseySvg({ document, team: kit, number, name, idPrefix: `role-${context}-${index}` });
}
function assign() {
  const members = team().members;
  const preferred = preferences[template.id];
  let best, bestScore = -1;
  function visit(order, remaining, score) {
    if (!remaining.length) {
      if (score > bestScore) { best = order; bestScore = score; }
      return;
    }
    for (const index of remaining) {
      const matches = members[index].role === preferred[order.length];
      visit([...order, index], remaining.filter(other => other !== index), score + Number(matches));
    }
  }
  visit([], members.map((_, index) => index), 0);
  return best;
}
function playerFor(markerId) {
  return team().members[assignment[template.roles.findIndex(role => role.playerId === markerId)]];
}
function withJerseyNumbers(instruction) {
  return instruction.replace(/(?<![\dA-Za-z])([1-4])(?![\dA-Za-z])(?:\s*号)?/g,
    (original, slot) => {
      const member = playerFor('attack-' + slot);
      return member ? `${member.number}号` : original;
    });
}
function useTactic(tactic) {
  template = tactic; play = template.build();
  assignment = assign(); temporarySwap = false;
  runtime.load({ frameCount: play.frames.length });
}
function switchMode(next) {
  if (mode === next) return;
  mode = next; playerIndex = 0;
  useTactic(templates.find(tactic => tactic.id === team().tactic));
  show('locker');
  content.querySelector('.mode-toggle [aria-pressed=true]').focus({ preventScroll: true });
}
function show(next, focus = false) {
  runtime.pause({ snap: false });
  view = next;
  draw();
  if (focus) { const heading = content.querySelector('h1'); heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}
function draw() {
  app.dataset.view = view;
  app.dataset.mode = mode;
  content.replaceChildren();
  nav.replaceChildren();
  for (const [id, label, icon] of [['locker','更衣室','♧'], ['training','训练场','▱'], ['my','我的','♙']]) {
    const tab = button('', () => show(id), 'nav-button');
    tab.append(el('span', 'nav-icon', icon), el('span', '', label));
    if (id === (view === 'body' ? returnView : view)) tab.setAttribute('aria-current', 'page');
    nav.append(tab);
  }
  if (view === 'locker') drawLocker();
  if (view === 'training') drawTraining();
  if (view === 'body') drawBody();
  if (view === 'my') drawMy();
}
function drawLocker() {
  const { members, name, body } = team();
  const brand = el('div', 'brand'), logo = el('img');
  logo.src = '../../assets/app-icon.png'; logo.alt = '球搭';
  brand.append(logo, el('strong', '', 'HOOPAL'));
  const card = el('section', 'glass-card locker-card');
  const head = el('header', 'card-head');
  const toggle = el('div', 'mode-toggle');
  toggle.setAttribute('role', 'group');
  toggle.setAttribute('aria-label', '阵容人数');
  for (const size of Object.keys(teams)) {
    const tab = button(size, () => switchMode(size), 'mode-tab');
    tab.setAttribute('aria-pressed', String(mode === size));
    toggle.append(tab);
  }
  head.append(el('h1', '', '更衣室'), toggle);
  const title = el('div', 'locker-team');
  title.append(el('h2', '', name), el('p', 'quiet', '当前球队 · ' + bodyLabel(body)));
  const cabinet = el('div', 'cabinet'), uniform = el('div', 'cabinet-uniform');
  uniform.append(jersey(playerIndex, 'cabinet'));
  cabinet.append(el('div', 'cabinet-light'), el('div', 'hanger', '⌒'), uniform, el('div', 'nameplate', members[playerIndex].name), el('div', 'cabinet-bench'));
  const controls = el('div', 'member-controls'), indicators = el('div', 'member-dots');
  function inspect(index) { playerIndex = (index + members.length) % members.length; draw(); }
  for (const [index, member] of members.entries()) {
    const dot = button('●', () => inspect(index), 'text-button');
    dot.setAttribute('aria-label', member.name);
    dot.setAttribute('aria-current', String(index === playerIndex));
    indicators.append(dot);
  }
  let touchX;
  cabinet.addEventListener('touchstart', event => { touchX = event.touches[0].clientX; }, { passive: true });
  cabinet.addEventListener('touchend', event => {
    if (touchX === undefined) return;
    const offset = event.changedTouches[0].clientX - touchX;
    touchX = undefined;
    if (Math.abs(offset) > 40) inspect(playerIndex + (offset < 0 ? 1 : -1));
  }, { passive: true });
  controls.append(button('‹', () => inspect(playerIndex - 1), 'icon-button'), indicators, button('›', () => inspect(playerIndex + 1), 'icon-button'));
  const foot = el('footer', 'locker-footer');
  const member = members[playerIndex];
  foot.append(el('p', 'quiet', member.role ? `${member.name} · ${roleOptions[member.role][0]}` : '可以稍后设置球员角色'), button('挑选战术', beginBody, 'button primary'), button('设置球员角色', openRoles, 'button secondary'));
  card.append(head, title, cabinet, controls, foot);
  content.append(brand, card);
}
function drawMy() {
  const card = el('section', 'glass-card demo-about');
  card.append(el('h2', '', '球队管理'), el('p', 'quiet', `${team().name} · ${mode} · ${bodyLabel(team().body)}`), button('设置球员角色 ›', openRoles, 'menu-row'));
  content.append(el('h1', 'demo-heading', '我的'), card);
}
function beginBody() { returnView = view; bodyDraft = team().body; show('body', true); }
function drawBody() {
  const head = el('header', 'secondary-header'), heading = el('div');
  heading.append(el('h1', '', '选择阵容类型'), el('p', '', `${team().name} · ${mode}`));
  head.append(button('‹', () => show(returnView, true), 'icon-button'), heading);
  const card = el('section', 'glass-card body-card role-body-card'), list = el('div', 'body-list');
  list.append(el('p', 'quiet body-intro', '选一个最接近你们的整体体型'));
  for (const type of getBodyTypes(mode)) {
    const option = button('', () => {
      bodyDraft = type.id;
      for (const other of list.querySelectorAll('.body-choice')) {
        other.setAttribute('aria-pressed', String(other === option));
        other.querySelector('.body-check').textContent = other === option ? '✓' : '';
      }
    }, 'body-choice');
    option.setAttribute('aria-pressed', String(bodyDraft === type.id));
    const copy = el('span', 'body-copy');
    copy.append(el('strong', '', type.label), el('small', '', type.description));
    option.append(copy, el('span', 'body-check', bodyDraft === type.id ? '✓' : ''));
    list.append(option);
  }
  const foot = el('footer', 'body-footer');
  foot.append(button('查看推荐战术', () => openCatalog(bodyDraft), 'button primary'));
  card.append(list, foot);
  content.append(head, card);
}
function drawTraining() {
  const { body, name } = team();
  const card = el('section', 'glass-card training-card role-training');
  const head = el('header', 'training-head'), title = el('h2');
  title.append(button(`${template.title} ﹀`, () => openCatalog(body), 'tactic-title'));
  head.append(title, button('▱ 战术库', () => openCatalog(body), 'button library-entry'));
  const context = el('div', 'training-context');
  context.append(el('span', 'pill', `${mode} · ${bodyLabel(body)}`), el('span', 'quiet', name));
  const host = el('div', 'training-court');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 1000 820');
  court = createTrainingCourt({ document, svg }); host.append(svg);
  const details = el('div', 'training-details'), positions = el('section', 'position-panel');
  const positionHead = el('div', 'position-head'), positionGrid = el('div', 'position-grid');
  positionHead.append(el('strong', '', temporarySwap ? '本队站位 · 临时调整' : '本队站位'), button('交换球员', openSwap, 'text-button'));
  for (const role of template.roles) {
    const member = playerFor(role.playerId), item = el('div', 'position-item');
    item.append(el('strong', '', `${member.number}号 ${member.name}`), el('small', '', role.title));
    item.title = withJerseyNumbers(role.task); positionGrid.append(item);
  }
  positions.append(positionHead, positionGrid);
  note = el('p', 'training-note');
  const explanation = el('div', 'training-explanation');
  explanation.append(note, button('讲解', openExplanation, 'text-button'));
  const steps = el('div', 'training-steps');
  dots = play.frames.map((_, i) => button(String(i + 1), () => { runtime.pause({ snap: false }); runtime.seek(i); paint(); }, 'step-dot'));
  steps.append(...dots);
  const playback = el('div', 'playback-controls');
  const rate = select([.5, 1, 1.5, 2].map(value => [value, `${value}×`]), speed, '播放速度');
  rate.addEventListener('change', () => { speed = Number(rate.value); });
  const loopLabel = el('label', 'loop-label', '循环'), check = el('input');
  check.type = 'checkbox'; check.checked = loop;
  check.addEventListener('change', () => { loop = check.checked; });
  loopLabel.prepend(check);
  playButton = button('▶', () => { if (runtime.playing) runtime.pause({ snap: false }); else runtime.play(); paint(); }, 'play-button');
  const restart = button('↺', () => { runtime.pause({ snap: false }); runtime.seek(0); paint(); }, 'icon-button');
  restart.setAttribute('aria-label', '回到第一步');
  playback.append(rate, restart, playButton, loopLabel);
  details.append(positions, explanation, steps, playback);
  card.append(head, context, host, details);
  content.append(el('h1', 'demo-heading', '训练场'), card);
  paint();
}
function paint() {
  if (view !== 'training' || !court) return;
  const { stepIndex, interpolation, fraction } = runtime.state;
  const from = play.frames[stepIndex], to = play.frames[Math.min(stepIndex + 1, play.frames.length - 1)];
  const board = fraction ? interpolateBoards(from, to, interpolation) : from;
  court.draw({ ...board, players: board.players.map(marker => {
    const member = playerFor(marker.id);
    return member ? { ...marker, number: member.number } : marker;
  }) }, { playerTitle: marker => playerFor(marker.id)?.name ?? `对手 ${marker.number} 号` });
  const instruction = withJerseyNumbers(from.note);
  note.textContent = `${stepIndex + 1}/${play.frames.length}　${instruction}`;
  note.title = instruction;
  dots.forEach((dot, index) => dot.setAttribute('aria-current', String(index === stepIndex)));
  playButton.textContent = runtime.playing ? 'Ⅱ' : '▶';
  playButton.setAttribute('aria-label', runtime.playing ? '暂停战术' : '播放战术');
}

function fitDialog() {
  const { top, left, width, height } = app.getBoundingClientRect();
  Object.assign(dialog.style, { position: 'fixed', top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px`, right: 'auto', bottom: 'auto' });
}
function openSheet(mode, title, subtitle, ...items) {
  if (dialog.open) return;
  runtime.pause({ snap: false }); paint();
  const heading = el('h2', '', title); heading.id = 'role-sheet-title';
  const header = el('header', 'sheet-header'), copy = el('div');
  copy.append(heading, el('p', 'quiet', subtitle));
  const close = button('×', () => closeSheet(), 'icon-button');
  close.setAttribute('aria-label', '关闭面板'); close.autofocus = true;
  header.append(copy, close);
  sheet.dataset.mode = mode;
  sheet.replaceChildren(el('span', 'sheet-grip'), header, ...items);
  fitDialog(); dialog.showModal(); app.classList.add('has-modal');
  requestAnimationFrame(() => requestAnimationFrame(() => { if (dialog.open && !closing) dialog.dataset.visible = 'true'; }));
}
function closeSheet(afterClose) {
  if (!dialog.open || closing) return;
  cardPreview?.destroy(); cardPreview = undefined;
  closing = true; sheet.inert = true;
  delete dialog.dataset.visible; app.classList.remove('has-modal');
  setTimeout(() => {
    dialog.close(); closing = false; sheet.inert = false; afterClose?.();
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450);
}
function notify(message) {
  const toast = document.querySelector('#preview-toast');
  toast.textContent = message; toast.classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 2100);
}
function openRoles() {
  const list = el('div', 'role-list'), foot = el('footer', 'role-footer');
  const members = team().members;
  const draft = members.map(member => member.role);
  let expanded = null;
  const rows = members.map((member, index) => {
    const row = el('article', 'role-row'), info = el('span', 'role-name');
    info.append(el('strong', '', member.name), el('small', 'quiet', `${member.number}号`));
    const label = el('span'), arrow = el('span', 'role-chevron', '⌄');
    arrow.setAttribute('aria-hidden', 'true');
    const trigger = button('', () => showOptions(expanded === index ? null : index), 'role-trigger');
    trigger.append(label, arrow);
    const options = el('div', 'role-options');
    options.id = 'role-options-' + index;
    options.setAttribute('role', 'group');
    options.setAttribute('aria-label', member.name + '的角色选项');
    trigger.setAttribute('aria-controls', options.id);
    for (const key of rolesByMode[mode]) {
      const [name, description] = roleOptions[key];
      const option = button('', () => {
        draft[index] = key;
        showOptions(null);
        trigger.focus({ preventScroll: true });
      }, 'role-option');
      option.dataset.role = key;
      option.append(el('strong', '', name), el('small', '', description));
      options.append(option);
    }
    row.append(jersey(index, 'settings'), info, trigger, options); list.append(row);
    return { row, label, trigger, options };
  });
  function showOptions(index) {
    expanded = index;
    rows.forEach(({ row, label, trigger, options }, position) => {
      const active = position === expanded;
      row.dataset.expanded = String(active);
      label.textContent = roleOptions[draft[position]][0];
      trigger.setAttribute('aria-label', `${members[position].name}的主角色，${label.textContent}`);
      trigger.setAttribute('aria-expanded', String(active));
      options.hidden = !active;
      for (const option of options.children) option.setAttribute('aria-pressed', String(option.dataset.role === draft[position]));
    });
    if (index !== null) rows[index].row.scrollIntoView({ block: 'nearest' });
  }
  foot.append(button('保存角色', () => closeSheet(() => {
    draft.forEach((role, index) => { members[index].role = role; });
    assignment = assign(); temporarySwap = false; show(view, true); notify('角色已应用到预览');
  }), 'button primary'), button('稍后设置', () => closeSheet(), 'text-button'));
  openSheet('roles', '设置球员角色', `${team().name} · ${mode} · 角色可重复选择`, list, foot);
  showOptions(null);
}
function openCatalog(type) {
  const choices = catalog(type), list = el('div', 'library-list role-library-list'), foot = el('footer', 'sheet-footer');
  let selected;
  const use = button('选用这套战术', () => {
    if (!selected) return;
    closeSheet(() => {
      team().body = type; team().tactic = selected.id;
      useTactic(selected); show('training', true);
    });
  }, 'button primary');
  use.disabled = true;
  for (const tactic of choices) {
    const item = el('article', 'library-card');
    const detail = el('div', 'library-card-body');
    detail.hidden = true;
    detail.style.display = 'none';
    const mini = el('button', 'library-mini-court');
    mini.type = 'button';
    detail.append(mini, el('p', '', getTacticBodyNote(tactic, type)));
    const header = button('', () => {
      cardPreview?.destroy(); cardPreview = undefined;
      selected = selected === tactic ? null : tactic;
      for (const card of list.children) {
        const isSelected = card === item && selected === tactic;
        card.dataset.expanded = String(isSelected);
        card.firstElementChild.setAttribute('aria-expanded', String(isSelected));
        card.lastElementChild.hidden = !isSelected;
        card.lastElementChild.style.display = isSelected ? 'block' : 'none';
      }
      if (selected) {
        cardPreview = createLibraryPreview({ template: selected, button: mini });
        cardPreview.start();
        item.scrollIntoView({ block: 'nearest' });
      }
      use.disabled = !selected;
    }, 'library-card-title');
    header.setAttribute('aria-expanded', 'false');
    header.append(el('strong', '', tactic.title), el('span', '', '⌄'));
    item.append(header, detail); list.append(item);
  }
  const context = el('div', 'role-context');
  context.append(el('span', 'pill', `${mode} · ${bodyLabel(type)} · 进攻`));
  if (view !== 'body') context.append(button('更换体型 ›', () => closeSheet(beginBody), 'text-button'));
  foot.append(use);
  openSheet('catalog', '推荐战术', `${team().name} · ${choices.length} 套配合`, context, list, foot);
}
function openSwap() {
  const { members } = team();
  const list = el('div', 'swap-fields'), foot = el('footer', 'role-footer');
  const options = assignment.map((member, slot) => [slot, `${members[member].number}号 ${members[member].name}`]);
  const a = select(options, '0', '第一位球员'), b = select(options, '1', '第二位球员');
  const first = el('label', '', '第一位球员'), second = el('label', '', '第二位球员');
  a.className = b.className = 'swap-select'; first.append(a); second.append(b); list.append(first, second);
  const confirm = button('确认交换', () => closeSheet(() => {
    [assignment[a.value], assignment[b.value]] = [assignment[b.value], assignment[a.value]];
    temporarySwap = true; runtime.seek(0); show('training', true);
  }), 'button primary');
  const validate = () => { confirm.disabled = a.value === b.value; };
  a.addEventListener('change', validate); b.addEventListener('change', validate);
  foot.append(confirm, button('恢复自动分配', () => closeSheet(() => {
    assignment = assign(); temporarySwap = false; runtime.seek(0); show('training', true);
  }), 'text-button'));
  openSheet('swap', '交换球员', '只调整当前战术的演练站位', list, foot);
}
function openExplanation() {
  const current = runtime.state.stepIndex;
  const text = el('p', 'role-instruction', withJerseyNumbers(play.frames[current].note));
  openSheet('explain', '步骤讲解', `${template.title} · 第 ${current + 1} 步 / 共 ${play.frames.length} 步`, text);
}

dialog.addEventListener('cancel', event => { event.preventDefault(); closeSheet(); });
dialog.querySelector('.dialog-shade').addEventListener('click', () => closeSheet());
window.addEventListener('resize', () => { if (dialog.open) fitDialog(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { runtime.pause({ snap: false }); paint(); } });
const shortcuts = { roles: () => { show('locker'); openRoles(); }, body: () => { show('locker'); beginBody(); }, training: () => show('training', true) };
for (const jump of document.querySelectorAll('[data-jump]')) jump.addEventListener('click', shortcuts[jump.dataset.jump]);
draw();
if (params.get('view') === 'roles') {
  openRoles();
  sheet.querySelectorAll('.role-trigger')[1].click();
}
