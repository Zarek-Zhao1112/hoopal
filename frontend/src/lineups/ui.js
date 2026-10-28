import { createLineup, validateLineup, isLineupReady, SKILLS, TRAITS } from '../../../shared/lineups.js';
import { templates } from '../../../shared/templates.js';
import { COURT_COLORS, appendWoodSurface, appendPlayerPiece } from '../board/appearance.js';
import { createLockerRoom, createEmptyLocker } from './locker-room.js';
import { createJerseySvg } from './jersey.js';
import { NBA_TEAMS, getNbaTeam } from '../../../data/nba-teams.js';
import { getTeamLogoUrl } from './team-assets.js';

import { createLineupSheet } from './sheet.js';
import { createTeamCarousel } from './team-carousel.js';
import { createWizardMotion, attachWizardSwipe } from './wizard-motion.js';

const copy = value => JSON.parse(JSON.stringify(value));
const playerName = (player, index = 0) => player?.name?.trim() || `队员 ${String.fromCharCode(65 + index)}`;
const skillLabel = id => SKILLS.find(skill => skill.id === id)?.label || id;
const ns = 'http://www.w3.org/2000/svg';

/** Break long explanations at both character and line budgets; preserve text. */
export function splitLineupText(value, limit = 80, maxBreaks = 3) {
  const text = String(value ?? ''), pages = [];
  let part = '', breaks = 0;
  for (const character of text) {
    if (Array.from(part).length >= limit || (character === '\n' && breaks >= maxBreaks)) {
      pages.push(part); part = ''; breaks = 0;
    }
    part += character;
    if (character === '\n') breaks++;
  }
  if (part || !pages.length) pages.push(part);
  return pages;
}

/** Profile browsing stays mounted behind an isolated native-modal task sheet. */
export function createLineupUI({ root, onAction, onInspect, onModalChange, onNavigate }) {
  if (!root || typeof onAction !== 'function') throw new TypeError('阵容界面需要 root 与 onAction');
  const document = root.ownerDocument;
  let jerseySequence = 0;
  let state = { profiles: [], activeProfileId: null, playbackContext: null };
  let results = { ready: false, summary: [], recommendations: [] };
  let route = 'profiles', section = 'lineups', profilePage = 0, editorId = null, playerIndex = 0, editSection = 'identity';
  let recommendationIndex = 0, recommendationSection = 'reasons', textPage = 0;
  let pending = false, externalBusy = false, externalError = false, readLocked = false, feedback = '', confirmation = null, inspection = null;
  let createDraft = null, teamPicker = null, wizard = null, createMembers = null;
  let afterSheetNavigation = null;
  const sheet = createLineupSheet({ document, onRequestClose: () => requestWizardClose(), onModalChange(open) {
    onModalChange?.(open);
    if (!open && afterSheetNavigation) { const target = afterSheetNavigation; afterSheetNavigation = null; navigate(target); }
  } });
  const archiveMenu = document.createElement('dialog');
  archiveMenu.id = 'lineup-archive-menu'; archiveMenu.className = 'lineup-archive-menu'; archiveMenu.dataset.lineupOwned = 'true'; archiveMenu.dataset.phase = 'closed';
  archiveMenu.setAttribute('aria-labelledby', 'lineup-archive-menu-title'); document.body.append(archiveMenu);
  let menuState = null, menuTrigger = null, menuTriggerId = '';
  const menuGuards = new Map();
  const wizardMotion = createWizardMotion({ document });
  let wizardMotionIntent = null, wizardSwipe = null;
  const drafts = new Map(), baselines = new Map();
  const selectedByProfile = new Map();
  let lockerRoom = null, teamCarousel = null, teamCarouselGeneration = 0, teamAllOpen = false;
  const teamGuards = new Map();
  function isolateTeamList(open, content, element) {
    teamAllOpen = Boolean(open); sheet.panel.dataset.teamAllOpen = String(teamAllOpen);
    content.dataset.allOpen = String(teamAllOpen);
    const summary = content.querySelector('.lineup-wizard-kit'); if (summary) summary.hidden = teamAllOpen;
    if (teamAllOpen) {
      for (const control of sheet.panel.querySelectorAll('button,input,select,textarea,[tabindex]')) {
        if (control === sheet.panel || element.contains(control)) continue;
        if (!teamGuards.has(control)) teamGuards.set(control, { disabled: 'disabled' in control ? control.disabled : undefined, tabindex: control.getAttribute('tabindex') });
        if ('disabled' in control) control.disabled = true;
        control.tabIndex = -1;
      }
    } else {
      for (const [control, prior] of teamGuards) {
        if (!control.isConnected) continue;
        if (prior.disabled !== undefined) control.disabled = prior.disabled;
        if (prior.tabindex === null) control.removeAttribute('tabindex'); else control.setAttribute('tabindex', prior.tabindex);
      }
      teamGuards.clear();
    }
  }
  function destroyTeamCarousel() {
    teamCarouselGeneration++; const previous = teamCarousel; teamCarousel = null;
    previous?.destroy();
    for (const [control, prior] of teamGuards) {
      if (!control.isConnected) continue;
      if (prior.disabled !== undefined) control.disabled = prior.disabled;
      if (prior.tabindex === null) control.removeAttribute('tabindex'); else control.setAttribute('tabindex', prior.tabindex);
    }
    teamGuards.clear(); teamAllOpen = false; delete sheet.panel.dataset.teamAllOpen;
  }
  // Android WebView 96 predates :has(); only actual text/number input focus
  // compresses the editor when the keyboard reduces the available height.
  function updateInputFocus() {
    const focused = document.activeElement;
    root.classList.toggle('has-input-focus', focused?.tagName === 'INPUT' && root.contains(focused));
  }
  root.addEventListener('focusin', updateInputFocus);
  root.addEventListener('focusout', () => setTimeout(updateInputFocus, 0));
  const active = () => state.profiles.find(profile => profile.id === state.activeProfileId);
  const dirty = id => drafts.has(id) && JSON.stringify(drafts.get(id)) !== baselines.get(id);
  const hasUnsavedChanges = () => [...drafts.keys()].some(dirty) || Boolean(createDraft);

  function node(tag, className = '', text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }
  function inspect(title, text) {
    if (onInspect) { onInspect({ title, text: String(text) }); return; }
    inspection = { title, pages: splitLineupText(text, 90, 3), page: 0 };
    draw();
  }
  function button(label, action, callback, options = {}) {
    const element = node('button', options.className || 'button button-subtle', label);
    element.type = 'button';
    element.dataset.action = action;
    for (const [key, value] of Object.entries(options.data || {})) element.dataset[key] = value;
    element.disabled = pending || externalBusy || Boolean(options.disabled);
    if (options.pressed !== undefined) element.setAttribute('aria-pressed', String(options.pressed));
    if (options.title) element.title = options.title;
    element.addEventListener('click', () => {
      if (pending || externalBusy || element.disabled || element.isConnected === false || sheet.closing || teamAllOpen || archiveMenu.open && !archiveMenu.contains(element)) return;
      if (!sheet.isOpen) sheet.rememberTrigger(element);
      callback();
    });
    return element;
  }
  function svgElement(tag, attributes = {}, text) {
    const element = document.createElementNS(ns, tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    if (text !== undefined) element.textContent = String(text);
    return element;
  }
  function jersey(player, nbaTeamId, index, compact = false) {
    const wrap = node('div', `lineup-jersey${compact ? ' compact' : ''}`);
    wrap.dataset.playerId = player.id;
    wrap.dataset.teamId = nbaTeamId || '';
    const svg = createJerseySvg({ document, team: getNbaTeam(nbaTeamId), number: player.number, name: playerName(player, index), idPrefix: `lineup-shirt-${++jerseySequence}` });
    const name = node('strong');
    name.append(button(playerName(player, index), 'lineup-inspect-player', () => inspect('队员资料', `${playerName(player, index)}\n球衣 ${player.number} 号`), { className: 'lineup-text-link' }));
    wrap.append(svg, name);
    if (!compact) {
      const tags = node('div', 'lineup-player-skills');
      const labels = player.strengths.slice(0, 2).map(skillLabel);
      for (const weakness of player.weaknesses) {
        if (labels.length >= 2) break;
        labels.push(`弱·${skillLabel(weakness)}`);
      }
      if (!labels.length) labels.push('未标擅长');
      if (labels.length < 2) labels.push('其余一般');
      const description = `${playerName(player, index)}\n擅长：${player.strengths.length ? player.strengths.map(skillLabel).join('、') : '未标注，按一般处理'}\n弱项：${player.weaknesses.length ? player.weaknesses.map(skillLabel).join('、') : '未标注'}`;
      labels.forEach(label => tags.append(button(label, 'lineup-inspect-skills', () => inspect('队员能力标签', description), { className: 'lineup-player-skill' })));
      wrap.append(tags);
    }
    wrap.title = playerName(player, index);
    return wrap;
  }
  function crest(profile) {
    const team = getNbaTeam(profile.nbaTeamId);
    if (team) {
      const image = node('img', 'lineup-crest');
      image.src = getTeamLogoUrl(team.id); image.alt = team.fullName; image.draggable = false;
      image.dataset.teamId = team.id;
      return image;
    }
    const placeholder = node('span', 'lineup-crest lineup-crest-neutral', 'NBA');
    placeholder.setAttribute('aria-label', '未选择 NBA 球队');
    return placeholder;
  }
  function header(title, subtitle, back = false, action) {
    const head = node('header', 'lineups-heading');
    if (back) head.append(button('‹', 'lineup-back', () => handleBack(), { className: 'icon-button', title: '返回阵容档案' }));
    const titleWrap = node('div', 'lineups-title');
    titleWrap.append(node('h1', '', title));
    if (subtitle) titleWrap.append(button(subtitle, 'lineup-inspect-heading', () => inspect(title, subtitle), { className: 'lineup-subtitle-link' }));
    head.append(titleWrap);
    if (action) head.append(action);
    root.append(head);
  }
  function notice(text, type = '') {
    if (!text) return;
    const element = node('p', `lineups-notice ${type}`, text);
    element.setAttribute(type === 'error' ? 'role' : 'aria-live', type === 'error' ? 'alert' : 'polite');
    element.title = String(text);
    root.append(element);
  }
  async function perform(kind, payload, success = () => {}) {
    if (pending || externalBusy) return false;
    pending = true; feedback = ''; draw();
    let accepted = false;
    try {
      accepted = await onAction(kind, payload) === true;
      if (accepted) success();
      else if (!feedback) feedback = '操作未保存，请检查提示后重试。已填内容仍保留。';
    } catch (error) { feedback = error?.message || '操作失败，请重试。已填内容仍保留。'; }
    finally { pending = false; draw(); }
    return accepted;
  }
  function beginEdit(profile, memberId = selectedByProfile.get(profile.id), options = {}) {
    if (sheet.closing) return;
    if (!drafts.has(profile.id)) {
      drafts.set(profile.id, copy(profile)); baselines.set(profile.id, JSON.stringify(profile));
    }
    const originSection = section, originRoute = route;
    editorId = profile.id; playerIndex = Math.max(0, drafts.get(profile.id).players.findIndex(player => player.id === memberId)); editSection = 'identity'; route = 'edit'; confirmation = null; feedback = '';
    wizard = { kind: 'edit', id: profile.id, step: options.step || 3, maxStep: 3, originSection, originRoute, teamPage: Math.max(0, Math.floor(NBA_TEAMS.findIndex(team => team.id === drafts.get(profile.id).nbaTeamId) / 12)) }; draw();
  }
  function field(label, value, action, setter, { type = 'text', maxLength, min, max, inputMode } = {}) {
    const wrap = node('label', 'lineup-field');
    wrap.append(node('span', '', label));
    const input = node('input');
    input.type = type; input.value = value ?? ''; input.dataset.action = action;
    input.disabled = pending || externalBusy;
    if (maxLength) input.maxLength = maxLength;
    if (min !== undefined) input.min = min;
    if (max !== undefined) input.max = max;
    if (inputMode) input.inputMode = inputMode;
    input.autocomplete = 'off';
    input.addEventListener('input', () => setter(input.value));
    wrap.append(input);
    return wrap;
  }
  function choices(label, values, selected, action, setter, multiple = false) {
    const group = node('fieldset', 'lineup-choice-group');
    group.append(node('legend', '', label));
    const items = node('div', 'lineup-choice-options');
    for (const item of values) items.append(button(item.label, action, () => setter(item.id), { pressed: multiple ? selected.includes(item.id) : selected === item.id, data: { value: item.id } }));
    group.append(items);
    return group;
  }
  function pager(count, page, change, prefix = 'lineup') {
    const bar = node('div', 'pagination lineup-pagination');
    bar.append(button('上一页', `${prefix}-prev`, () => change(page - 1), { disabled: page === 0 }), node('span', '', `${page + 1} / ${Math.max(1, count)}`), button('下一页', `${prefix}-next`, () => change(page + 1), { disabled: page >= count - 1 }));
    return bar;
  }
  function openTeamPicker() { if (wizard) { wizard.step = 2; feedback = ''; draw(); } }
  function beginCreate() {
    if (sheet.closing || state.profiles.length >= 20) return;
    if (!createDraft) {
      createDraft = createLineup('4v4', { crest: 'shield', color: 'orange' });
      createMembers = createDraft.players; createDraft.mode = '3v3'; createDraft.players = createMembers.slice(0, 3); createDraft.name = '';
      playerIndex = 0; editSection = 'identity';
    }
    const originSection = section;
    route = 'create'; confirmation = null; feedback = '';
    wizard = { kind: 'create', id: createDraft.id, step: 1, maxStep: 1, originSection, originRoute: 'profiles', teamPage: Math.max(0, Math.floor(NBA_TEAMS.findIndex(team => team.id === createDraft.nbaTeamId) / 12)) }; draw();
  }
  function profilePageView() {
    header('更衣室', '', false, button('换球队 ›', 'lineup-switch-archive', () => navigate('archives'), { className: 'button button-subtle' }));
    const cardHeading = root.lastElementChild; cardHeading.remove();
    const profile = active();
    if (!profile) {
      const empty = node('article', 'lineup-empty lineup-main-empty');
      empty.append(cardHeading, node('h2', '', state.profiles.length ? '选一支球队，进入更衣室' : '先组一支自己的球队'), createEmptyLocker({ document }), node('p', '', '球队的创建与管理，都在档案中。'));
      empty.append(button(state.profiles.length ? '去档案选择球队' : '去档案创建球队', 'lineup-open-archives', () => navigate('archives'), { className: 'button button-primary' }));
      root.append(empty); return;
    }
    const card = node('article', 'lineup-profile-card'); card.dataset.color = profile.color; card.dataset.mode = profile.mode;
    const top = node('div', 'lineup-profile-top');
    const title = node('div', 'lineup-profile-title');
    const name = node('h2');
    name.append(button(profile.name, 'lineup-inspect-profile', () => inspect('阵容名称', profile.name), { className: 'lineup-text-link' }));
    title.append(name, node('p', '', `${profile.mode} · ${isLineupReady(profile) ? '已配置' : '待完善'} · 当前球队`));
    const identity = node('span', 'lineup-profile-team', getNbaTeam(profile.nbaTeamId)?.name || '未选择 NBA 球队');
    title.append(identity);
    top.append(crest(profile), title);
    let focusedIndex = profile.players.findIndex(player => player.id === selectedByProfile.get(profile.id));
    if (focusedIndex < 0) focusedIndex = 0;
    selectedByProfile.set(profile.id, profile.players[focusedIndex].id);
    const detail = node('section', 'locker-player-detail');
    function updateDetail(index) {
      const player = profile.players[index];
      detail.dataset.playerId = player.id; detail.dataset.playerIndex = String(index);
      const top = node('div', 'locker-detail-top');
      top.append(button(playerName(player, index), 'lineup-inspect-player', () => inspect('队员资料', `${playerName(player, index)}\n球衣 ${player.number} 号`), { className: 'locker-player-name' }), node('span', 'locker-player-number', `球衣 ${player.number} 号`));
      const traits = node('div', 'locker-detail-row locker-traits'); traits.append(node('span', 'locker-detail-label', '特点'));
      for (const [key, label] of [['height', '身高'], ['build', '体格'], ['mobility', '移动']]) {
        const value = TRAITS[key].find(item => item.id === player[key])?.label || '待选';
        const text = `${label}${value}`;
        traits.append(button(text, 'lineup-inspect-trait', () => inspect('体型与移动特点', `${playerName(player, index)}\n${label}：${value}`), { className: 'locker-chip', data: { trait: key, value: player[key] } }));
      }
      const fullText = `${playerName(player, index)}\n擅长：${player.strengths.length ? player.strengths.map(skillLabel).join('、') : '未标注，按一般处理'}\n弱项：${player.weaknesses.length ? player.weaknesses.map(skillLabel).join('、') : '未标注'}\n未标注的能力按一般处理。`;
      const skillsRow = (key, label) => {
        const row = node('div', `locker-detail-row locker-${key}`); row.append(node('span', 'locker-detail-label', label));
        if (!player[key].length) row.append(button(key === 'strengths' ? '未标擅长，按一般处理' : '未标弱项', 'lineup-inspect-skills', () => inspect('完整能力标签', fullText), { className: 'locker-empty-skill' }));
        else player[key].forEach(id => row.append(button(skillLabel(id), 'lineup-inspect-skills', () => inspect('完整能力标签', fullText), { className: 'locker-chip', data: { skill: id, type: key } })));
        return row;
      };
      detail.replaceChildren(top, traits, skillsRow('strengths', '擅长'), skillsRow('weaknesses', '弱项'));
    }
    updateDetail(focusedIndex);
    lockerRoom = createLockerRoom({ document, profile, selectedIndex: focusedIndex, disabled: pending || externalBusy,
      renderJersey: (player, index) => jersey(player, profile.nbaTeamId, index, true), getName: playerName,
      renderBadge: () => crest(profile),
      onChange(id, index) { selectedByProfile.set(profile.id, id); updateDetail(index); },
      onInspect(player, index) { inspect('柜位球员', `${playerName(player, index)}\n球衣 ${player.number} 号`); }
    });
    const actions = node('div', 'lineup-profile-actions');
    actions.append(button('查看进攻推荐', 'lineup-recommend', () => {
      route = 'recommendations'; recommendationIndex = 0; recommendationSection = 'reasons'; textPage = 0; draw();
    }, { className: 'button button-primary', data: { profileId: profile.id } }));
    actions.append(button(dirty(profile.id) ? '继续未保存配置' : '配置球员', 'lineup-configure', () => beginEdit(profile), { data: { profileId: profile.id } }));
    card.append(cardHeading, top, lockerRoom.element, detail, actions); root.append(card);
  }
  function navigate(view) {
    section = view; route = 'profiles';
    onNavigate?.(view); draw();
  }
  function archivesPageView() {
    const card = node('section', 'lineup-archives-card');
    const heading = node('header', 'lineup-archives-heading');
    heading.append(node('h1', '', '球队档案'), node('span', '', `${state.profiles.length} / 20`));
    card.append(heading, node('p', 'lineup-archives-intro', '点球队卡片，进入它的更衣室'));
    const list = node('div', 'lineup-archive-list');
    const pages = Math.max(1, Math.ceil(state.profiles.length / 3));
    profilePage = Math.max(0, Math.min(pages - 1, profilePage));
    if (!state.profiles.length) {
      const empty = node('div', 'lineup-archives-empty');
      empty.append(node('h2', '', '还没有球队档案'), node('p', '', '从球队名字、喜欢的球衣开始，\n再为队员选好真实特点。'));
      list.append(empty);
    }
    for (const profile of state.profiles.slice(profilePage * 3, profilePage * 3 + 3)) {
      const item = node('article', 'lineup-archive-card');
      item.dataset.profileId = profile.id; item.dataset.teamId = profile.nbaTeamId || ''; item.dataset.current = String(profile.id === state.activeProfileId);
      const select = button('', 'lineup-select', () => {
        if (profile.id === state.activeProfileId) { navigate('lineups'); return; }
        return perform('select', { id: profile.id }, () => navigate('lineups'));
      }, { className: 'lineup-archive-select', data: { profileId: profile.id } });
      select.setAttribute('aria-label', `使用${profile.name}，${profile.mode}，进入更衣室`);
      if (profile.id === state.activeProfileId) select.setAttribute('aria-current', 'true');
      const identity = node('div', 'lineup-archive-copy');
      identity.append(node('h2', '', profile.name), node('p', '', `${profile.mode} · ${getNbaTeam(profile.nbaTeamId)?.name || '未选择 NBA 球队'}`));
      const members = node('div', 'lineup-archive-members');
      for (const [index, member] of profile.players.entries()) {
        const summary = node('span'); summary.append(node('i', '', member.number), node('span', '', playerName(member, index))); members.append(summary);
      }
      identity.append(members); select.append(crest(profile), identity, node('span', 'lineup-archive-enter', '›'));
      let manage;
      manage = button('⋯', 'lineup-archive-menu', () => openArchiveMenu(profile.id, manage), { className: 'lineup-archive-manage', title: `管理${profile.name}`, data: { profileId: profile.id } });
      item.append(select, manage);
      if (profile.id === state.activeProfileId) item.append(node('span', 'lineup-archive-current', '当前使用'));
      list.append(item);
    }
    card.append(list);
    if (pages > 1) { card.classList.add('has-pages'); card.append(pager(pages, profilePage, page => { profilePage = page; feedback = ''; draw(); }, 'lineup-archives')); }
    card.append(button(createDraft ? '继续创建球队' : '＋ 创建球队', state.profiles.length ? 'lineup-create' : 'lineup-create-empty', beginCreate, { className: 'button button-primary lineup-archive-create', disabled: state.profiles.length >= 20 }));
    root.append(card);
  }
  function readLockedPageView() {
    const card = node('section', 'lineup-read-error');
    const heading = node('h1', '', section === 'archives' ? '球队档案' : '更衣室');
    const message = node('div', 'lineup-read-error-message');
    message.setAttribute('role', 'status');
    message.append(node('h2', '', '档案暂时无法读取'), node('p', '', '读取恢复前不会覆盖本机档案。\n请重试读取，再继续选择或创建球队。'));
    card.append(heading, message, button(pending || externalBusy ? '正在重试…' : '重试读取', 'lineup-retry', () => perform('retry', {}), { className: 'button button-primary lineup-retry' }));
    root.append(card);
  }
  function refreshMenuIsolation() {
    if (!archiveMenu.open) return;
    const scopes = new Set([root, ...document.querySelectorAll('#lineup-brand-header,.app-header,.workspace,.view-nav')]);
    for (const scope of scopes) for (const control of scope.querySelectorAll('button,input,select,textarea,a,[tabindex]')) {
      if (!menuGuards.has(control)) menuGuards.set(control, { disabled: 'disabled' in control ? control.disabled : undefined, tabindex: control.getAttribute('tabindex') });
      if ('disabled' in control) control.disabled = true;
      control.tabIndex = -1;
    }
  }
  function restoreMenuFocus() {
    const visible = element => element?.isConnected && !element.disabled && element.getClientRects().length;
    const replacement = [...root.querySelectorAll('[data-action="lineup-archive-menu"]')].find(element => element.dataset.profileId === menuTriggerId && visible(element));
    const target = visible(menuTrigger) ? menuTrigger : replacement || [...root.querySelectorAll('[data-action="lineup-create"],[data-action="lineup-create-empty"]')].find(visible);
    target?.focus({ preventScroll: true });
  }
  function closeArchiveMenu({ restoreFocus = true, force = false } = {}) {
    if (!archiveMenu.open || !force && (pending || externalBusy)) return false;
    if (typeof archiveMenu.close === 'function') archiveMenu.close(); else archiveMenu.removeAttribute('open');
    archiveMenu.dataset.phase = 'closed'; menuState = null; inspection = null;
    for (const [control, prior] of menuGuards) {
      if (!control.isConnected) continue;
      if (prior.disabled !== undefined) control.disabled = prior.disabled;
      if (prior.tabindex === null) control.removeAttribute('tabindex'); else control.setAttribute('tabindex', prior.tabindex);
    }
    menuGuards.clear(); onModalChange?.(false); draw();
    if (restoreFocus) Promise.resolve().then(restoreMenuFocus);
    return true;
  }
  function openArchiveMenu(id, trigger) {
    if (pending || externalBusy || sheet.isOpen || !state.profiles.some(profile => profile.id === id)) return;
    menuState = { id, deleting: false }; menuTrigger = trigger; menuTriggerId = id; renderArchiveMenu();
    archiveMenu.dataset.phase = 'open';
    if (typeof archiveMenu.showModal === 'function') archiveMenu.showModal(); else archiveMenu.setAttribute('open', '');
    onModalChange?.(true); refreshMenuIsolation(); archiveMenu.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }
  function editFromMenu(step) {
    const profile = state.profiles.find(item => item.id === menuState?.id), trigger = menuTrigger;
    if (!profile) return;
    closeArchiveMenu({ restoreFocus: false }); sheet.rememberTrigger(trigger);
    beginEdit(profile, undefined, { step });
  }
  function renderArchiveMenu() {
    if (!menuState) return;
    const profile = state.profiles.find(item => item.id === menuState.id);
    archiveMenu.replaceChildren(); archiveMenu.setAttribute('aria-busy', String(pending || externalBusy));
    if (inspection) {
      const title = node('h2', '', inspection.title); title.id = 'lineup-archive-menu-title';
      archiveMenu.append(title, node('p', 'lineup-archive-inspection', inspection.pages[inspection.page]));
      archiveMenu.append(pager(inspection.pages.length, inspection.page, page => { inspection.page = page; draw(); }, 'lineup-inspect'));
      archiveMenu.append(button('返回管理', 'lineup-inspect-close', () => { inspection = null; draw(); }));
      return;
    }
    const heading = node('header', 'lineup-archive-menu-heading'), title = node('h2', '', menuState.deleting ? '删除这支球队？' : '管理球队'); title.id = 'lineup-archive-menu-title';
    heading.append(title, button('×', 'lineup-archive-close', () => closeArchiveMenu(), { className: 'lineup-archive-menu-close', title: '关闭管理菜单' })); archiveMenu.append(heading);
    if (!profile) { archiveMenu.append(node('p', '', '这支球队已不存在。请关闭后重新选择。')); return; }
    archiveMenu.dataset.profileId = profile.id;
    const details = `${profile.name}\n${profile.mode} · ${getNbaTeam(profile.nbaTeamId)?.fullName || '未选择 NBA 球队'}\n${profile.players.map((player, index) => `${playerName(player, index)} · 球衣 ${player.number} 号`).join('\n')}`;
    archiveMenu.append(button(profile.name, 'lineup-inspect-archive', () => inspect('球队档案', details), { className: 'lineup-archive-menu-name' }));
    if (menuState.deleting) {
      archiveMenu.append(node('p', 'lineup-archive-delete-note', '删除这份本机档案及队员配置，此操作无法撤销。'));
      archiveMenu.append(button('保留球队', 'lineup-delete-cancel', () => { menuState.deleting = false; renderArchiveMenu(); }));
      archiveMenu.append(button('删除球队与成员', 'lineup-delete-confirm', () => {
        const id = menuState.id;
        perform('delete', { id }, () => { drafts.delete(id); baselines.delete(id); closeArchiveMenu({ force: true }); route = 'profiles'; });
      }, { className: 'button lineup-danger', data: { profileId: profile.id } }));
    } else {
      archiveMenu.append(button(dirty(profile.id) ? '继续未保存配置' : '配置球员', 'lineup-configure', () => editFromMenu(3), { data: { profileId: profile.id } }));
      archiveMenu.append(button('修改球队名称', 'lineup-archive-rename', () => editFromMenu(1), { data: { profileId: profile.id } }));
      archiveMenu.append(button('更换 NBA 球队', 'lineup-team-open', () => editFromMenu(2), { data: { profileId: profile.id } }));
      archiveMenu.append(button('删除球队', 'lineup-delete', () => { menuState.deleting = true; renderArchiveMenu(); }, { className: 'button lineup-danger', data: { profileId: profile.id } }));
    }
    if (feedback) archiveMenu.append(node('p', 'lineup-archive-menu-error', feedback));
  }
  archiveMenu.addEventListener('cancel', event => { event.preventDefault(); closeArchiveMenu(); });
  archiveMenu.addEventListener('click', event => {
    if (event.target !== archiveMenu) return;
    const rect = archiveMenu.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeArchiveMenu();
  });
  archiveMenu.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || [...document.querySelectorAll('dialog[open]')].at(-1) !== archiveMenu) return;
    const controls = [...archiveMenu.querySelectorAll('button:not(:disabled),[tabindex]')].filter(element => element.tabIndex !== -1 && element.getClientRects().length);
    const index = controls.indexOf(document.activeElement);
    if (!controls.length) return;
    if (event.shiftKey && index <= 0) { event.preventDefault(); controls.at(-1).focus(); }
    else if (!event.shiftKey && (index < 0 || index === controls.length - 1)) { event.preventDefault(); controls[0].focus(); }
  });
  function wizardDraft() { return wizard?.kind === 'create' ? createDraft : drafts.get(wizard?.id); }
  function closeWizard(discard = false) {
    if (!wizard || pending || externalBusy || sheet.closing) return;
    const source = { ...wizard };
    if (discard) {
      if (source.kind === 'create') { createDraft = null; createMembers = null; }
      else { drafts.delete(source.id); baselines.delete(source.id); }
    }
    wizard = null; confirmation = null; feedback = ''; section = source.originSection || section; route = source.originRoute === 'recommendations' ? 'recommendations' : 'profiles'; destroyTeamCarousel(); sheet.close(); draw();
  }
  function requestWizardClose() {
    if (!wizard || pending || externalBusy || sheet.closing) return;
    if (teamCarousel?.isAllOpen) { teamCarousel.closeAll(); return; }
    if (inspection) { inspection = null; draw(); return; }
    if (confirmation?.kind === 'wizard-draft') { confirmation = null; draw(); return; }
    if (wizard.kind === 'create' || dirty(wizard.id)) {
      confirmation = { kind: 'wizard-draft', sourceRoute: wizard.kind, editorId: wizard.id }; draw();
    } else closeWizard();
  }
  function wizardStep(step) {
    if (!wizard || step < 1 || step > 3 || step > wizard.maxStep) return;
    const draft = wizardDraft();
    if (step > 1 && !draft.name.trim()) { feedback = '请先填写阵容名称。'; wizard.step = 1; draw(); return; }
    if (step > 2 && wizard.kind === 'create' && !getNbaTeam(draft.nbaTeamId)) { feedback = '请先选择一支 NBA 球队。'; wizard.step = 2; draw(); return; }
    if (step === 3 && wizard.kind === 'create' && !wizard.playersVisited) { editSection = 'traits'; wizard.playersVisited = true; }
    if (step !== wizard.step) wizardMotionIntent = { kind: 'step', forward: step > wizard.step };
    wizard.step = step; feedback = ''; draw();
  }
  function nextWizard() {
    const draft = wizardDraft(); if (!draft) return;
    if (wizard.step === 1 && !draft.name.trim()) { feedback = '请填写阵容名称。'; draw(); return; }
    if (wizard.step === 2 && wizard.kind === 'create' && !getNbaTeam(draft.nbaTeamId)) { feedback = '请选择一支 NBA 球队。'; draw(); return; }
    wizard.maxStep = Math.max(wizard.maxStep, wizard.step + 1); wizardStep(wizard.step + 1);
  }
  function saveWizard() {
    const draft = wizardDraft(), source = { ...wizard };
    let profile;
    try {
      if (!draft.name.trim()) { wizard.step = 1; throw new Error('请填写阵容名称。'); }
      if (source.kind === 'create' && !getNbaTeam(draft.nbaTeamId)) { wizard.step = 2; throw new Error('请选择一支 NBA 球队。'); }
      if (draft.players.some(member => member.number === '')) throw new Error('请填写每名队员的球衣号码。');
      profile = validateLineup(copy(draft));
      if (source.kind === 'create' && !isLineupReady(profile)) {
        playerIndex = profile.players.findIndex(member => !member.height || !member.build || !member.mobility); editSection = 'traits';
        throw new Error('请为每名队员选择身高、体格和移动特点。弱项可以留空。');
      }
    } catch (error) { feedback = error.message; draw(); return; }
    perform(source.kind === 'create' ? 'create' : 'update', source.kind === 'create' ? profile : { profile }, () => {
      if (source.kind === 'create') { createDraft = null; createMembers = null; }
      else { drafts.delete(source.id); baselines.delete(source.id); }
      const savedId = source.kind === 'create' ? state.activeProfileId : source.id;
      const index = state.profiles.findIndex(item => item.id === savedId); if (index >= 0) profilePage = Math.floor(index / 3);
      section = source.originSection || section;
      wizard = null; confirmation = null; route = source.originRoute === 'recommendations' ? 'recommendations' : 'profiles'; feedback = '配置已保存。'; destroyTeamCarousel();
      if (source.kind === 'create') afterSheetNavigation = 'lineups';
      sheet.close();
    });
  }
  function wizardTeams(draft) {
    const content = node('section', 'lineup-wizard-teams lineup-wizard-carousel');
    const summary = node('div', 'lineup-wizard-kit');
    const generation = ++teamCarouselGeneration;
    function unavailable() {
      return generation !== teamCarouselGeneration || pending || externalBusy || sheet.closing || !wizard || wizard.step !== 2 || wizardDraft() !== draft;
    }
    function syncSummary() {
      const team = getNbaTeam(draft.nbaTeamId), description = node('div');
      description.append(button(team?.fullName || '尚未选择 NBA 球队', 'lineup-inspect-team', () => inspect('NBA 球队', team?.fullName || '旧档案可保持中性球衣；新建需要明确选择球队。'), { className: 'lineup-text-link' }), node('small', '', '球衣同步预览 · 最后统一保存'));
      summary.dataset.teamId = draft.nbaTeamId || '';
      summary.replaceChildren(description, jersey(draft.players[playerIndex] || draft.players[0], draft.nbaTeamId, playerIndex, true));
      content.dataset.neutral = String(!draft.nbaTeamId);
    }
    syncSummary();
    const component = createTeamCarousel({ document, teams: NBA_TEAMS, initialTeamId: draft.nbaTeamId, getLogoUrl: getTeamLogoUrl,
      isDisabled: unavailable,
      onChange(teamId) {
        if (unavailable() || teamId !== null && !getNbaTeam(teamId)) return;
        draft.nbaTeamId = teamId; feedback = ''; syncSummary();
        sheet.panel.querySelector('.lineup-wizard-error')?.replaceChildren();
      },
      onAllChange(open) {
        if (generation !== teamCarouselGeneration) return;
        isolateTeamList(open, content, component.element);
      }
    });
    teamCarousel = component; content.append(component.element, summary);
    return content;
  }
  function wizardPlayers(draft) {
    playerIndex = Math.max(0, Math.min(draft.players.length - 1, playerIndex));
    const player = draft.players[playerIndex], content = node('section', 'lineup-wizard-players');
    const tabs = node('div', 'lineup-player-tabs');
    draft.players.forEach((member, index) => {
      const tab = button(playerName(member, index), 'lineup-player', () => selectWizardPlayer(index), { pressed: index === playerIndex, data: { index, playerId: member.id, memberNumber: index + 1 }, title: playerName(member, index) });
      const ready = wizardMemberReady(member, draft); tab.dataset.ready = String(ready); tab.classList.toggle('lineup-wizard-member-ready', ready); tab.classList.toggle('lineup-wizard-member-pending', !ready); tabs.append(tab);
    });
    const sections = node('div', 'lineup-section-tabs');
    for (const [id, label] of [['identity', '资料'], ['traits', '体型'], ['strengths', '擅长'], ['weaknesses', '弱项']]) sections.append(button(label, 'lineup-edit-section', () => { editSection = id; feedback = ''; draw(); }, { pressed: editSection === id, data: { section: id } }));
    const body = node('section', `lineup-player-editor lineup-editor-${editSection}`); body.dataset.section = editSection;
    const hero = node('div', 'lineup-player-hero lineup-wizard-player-hero'); hero.dataset.playerId = player.id;
    const uniform = node('div', 'lineup-wizard-uniform'); uniform.dataset.playerId = player.id; uniform.dataset.teamId = draft.nbaTeamId || '';
    uniform.append(createJerseySvg({ document, team: getNbaTeam(draft.nbaTeamId), number: player.number === '' ? '—' : player.number, name: playerName(player, playerIndex), idPrefix: `wizard-shirt-${++jerseySequence}` }));
    const caption = node('div', 'lineup-player-caption');
    caption.append(button(playerName(player, playerIndex), 'lineup-inspect-player', () => inspect('队员资料', `${playerName(player, playerIndex)}\n球衣 ${player.number} 号`), { className: 'lineup-wizard-player-name' }), node('span', 'lineup-wizard-player-number', `球衣 ${player.number === '' ? '—' : player.number} 号`));
    hero.append(uniform, caption,
      button('‹', 'lineup-wizard-player-prev', () => selectWizardPlayer(playerIndex - 1), { className: 'lineup-wizard-player-arrow is-prev', disabled: playerIndex === 0, title: '上一名队员' }),
      button('›', 'lineup-wizard-player-next', () => selectWizardPlayer(playerIndex + 1), { className: 'lineup-wizard-player-arrow is-next', disabled: playerIndex === draft.players.length - 1, title: '下一名队员' }));
    const pane = node('div', 'lineup-editor-fields');
    if (editSection === 'identity') {
      pane.append(field('昵称（可留空）', player.name, 'lineup-player-name', value => { player.name = value; syncWizardPlayerPreview(); }, { maxLength: 24 }));
      pane.append(field('球衣号码（队内不重复）', player.number, 'lineup-player-number', value => { player.number = value === '' ? '' : Number(value); syncWizardPlayerPreview(); }, { type: 'number', min: 0, max: 99, inputMode: 'numeric' }));
    } else if (editSection === 'traits') {
      for (const [key, label] of [['height', '身高特点'], ['build', '体格特点'], ['mobility', '移动能力']]) pane.append(choices(label, TRAITS[key], player[key], 'lineup-trait-' + key, value => { player[key] = value; feedback = ''; draw(); }));
    } else {
      const key = editSection === 'strengths' ? 'strengths' : 'weaknesses', other = key === 'strengths' ? 'weaknesses' : 'strengths', limit = key === 'strengths' ? 3 : 2;
      pane.append(choices((key === 'strengths' ? '擅长项' : '可选弱项') + ' ' + player[key].length + ' / ' + limit, SKILLS, player[key], 'lineup-' + key, value => {
        feedback = '';
        if (player[key].includes(value)) player[key] = player[key].filter(id => id !== value);
        else if (player[other].includes(value)) feedback = '同一能力不能同时是擅长与弱项，请先取消另一处选择。';
        else if (player[key].length >= limit) feedback = '最多选择 ' + limit + ' 项，可先取消一项。';
        else player[key].push(value);
        draw();
      }, true));
    }
    pane.append(node('p', 'lineup-form-hint', editSection === 'traits' ? '按实际特点选择，不代表能力评级。' : '未标注的能力按一般处理；弱项可以留空。'));
    body.append(pane); content.append(hero, tabs, sections, body);
    wizardSwipe = attachWizardSwipe({ element: hero, isDisabled: () => pending || externalBusy || sheet.closing || !sheet.isOpen || !wizard || wizard.step !== 3 || Boolean(confirmation) || Boolean(inspection) || document.hidden, onStep: delta => selectWizardPlayer(playerIndex + delta) });
    return content;
  }
  function wizardMemberReady(player, draft) {
    return Boolean(player.height && player.build && player.mobility && Number.isInteger(player.number) && player.number >= 0 && player.number <= 99 && draft.players.every(other => other.id === player.id || other.number !== player.number));
  }
  function selectWizardPlayer(index) {
    const draft = wizardDraft();
    if (!draft || !wizard || wizard.step !== 3 || pending || externalBusy || sheet.closing || teamAllOpen || confirmation || inspection || !Number.isInteger(index) || index < 0 || index >= draft.players.length || index === playerIndex) return;
    wizardMotionIntent = { kind: 'player', forward: index > playerIndex }; playerIndex = index;
    if (wizard.kind === 'edit') selectedByProfile.set(draft.id, draft.players[index].id);
    feedback = ''; draw();
  }
  function syncWizardPlayerPreview() {
    const draft = wizardDraft(), player = draft?.players[playerIndex];
    const page = sheet.panel.querySelector('.lineup-wizard-page[data-current="true"]');
    const uniform = page?.querySelector('.lineup-wizard-uniform');
    if (!player || !uniform) return;
    uniform.replaceChildren(createJerseySvg({ document, team: getNbaTeam(draft.nbaTeamId), number: player.number === '' ? '—' : player.number, name: playerName(player, playerIndex), idPrefix: `wizard-shirt-${++jerseySequence}` }));
    const label = page.querySelector('.lineup-wizard-player-name'), number = page.querySelector('.lineup-wizard-player-number');
    if (label) label.textContent = playerName(player, playerIndex);
    if (number) number.textContent = `球衣 ${player.number === '' ? '—' : player.number} 号`;
    for (const tab of page.querySelectorAll('[data-action="lineup-player"]')) { const member = draft.players[Number(tab.dataset.index)], ready = wizardMemberReady(member, draft); tab.textContent = playerName(member, Number(tab.dataset.index)); tab.dataset.ready = String(ready); tab.classList.toggle('lineup-wizard-member-ready', ready); tab.classList.toggle('lineup-wizard-member-pending', !ready); }
  }
  function renderWizard(transition = null) {
    const draft = wizardDraft(); if (!draft) return;
    const previous = document.activeElement;
    const action = sheet.panel.contains(previous) ? previous.dataset.action : null;
    const value = previous?.dataset.value, section = previous?.dataset.section, index = previous?.dataset.index;
    const retainedBody = sheet.panel.querySelector('.lineup-sheet-content');
    sheet.panel.replaceChildren(); sheet.panel.dataset.step = String(wizard.step); sheet.panel.dataset.kind = wizard.kind; sheet.panel.dataset.confirmation = String(confirmation?.kind === 'wizard-draft');
    sheet.panel.classList.remove('has-input-focus');
    const heading = node('header', 'lineup-sheet-heading'), title = node('div');
    title.append(node('p', '', wizard.kind === 'create' ? '建立自己的球队' : '调整本队资料'));
    const createTitles = ['给球队起个名字', '选一套球队风格', '让球员一一入队'];
    const h2 = node('h2', '', wizard.kind === 'create' ? confirmation?.kind === 'wizard-draft' ? '保留这次配置？' : createTitles[wizard.step - 1] : '配置阵容'); h2.id = 'lineup-wizard-title'; title.append(h2);
    heading.append(title, button('×', 'lineup-wizard-close', requestWizardClose, { className: 'lineup-sheet-close', title: '关闭配置面板' }));
    const progress = node('nav', 'lineup-wizard-progress'); progress.setAttribute('aria-label', '配置任务');
    ['名称与人数', '球队与球衣', '队员特点'].forEach((label, i) => { const step = i + 1, item = button('', 'lineup-wizard-step', () => wizardStep(step), { pressed: wizard.step === step, disabled: step > wizard.maxStep || Boolean(confirmation), data: { step } }); item.append(node('span', '', String(step)), node('strong', '', label)); progress.append(item); });
    const body = retainedBody || node('div', 'lineup-sheet-content'), page = node('div', 'lineup-wizard-page');
    page.dataset.current = 'true'; page.dataset.step = String(wizard.step); page.dataset.playerId = draft.players[playerIndex]?.id || ''; body.replaceChildren(page);
    if (inspection) {
      const content = node('section', 'lineup-sheet-confirmation');
      content.append(node('h3', '', inspection.title), node('p', 'lineup-sheet-inspection', inspection.pages[inspection.page]), pager(inspection.pages.length, inspection.page, page => { inspection.page = page; draw(); }, 'lineup-inspect'), button('返回配置', 'lineup-inspect-close', () => { inspection = null; draw(); })); page.append(content);
    } else if (confirmation?.kind === 'wizard-draft') {
      const confirm = node('section', 'lineup-sheet-confirmation');
      confirm.append(node('h3', '', '保留这次配置吗？'), node('p', '', '尚未写入本机。保留会话草稿后可以继续填写，关闭应用后不会恢复。'));
      confirm.append(button('继续填写', 'lineup-draft-continue', () => { confirmation = null; draw(); }, { className: 'button button-primary' }), button('保留会话草稿关闭', 'lineup-draft-keep', () => closeWizard()), button('放弃本次修改', 'lineup-draft-discard', () => closeWizard(true), { className: 'button lineup-danger' })); page.append(confirm);
    } else if (wizard.step === 1) {
      const form = node('section', 'lineup-wizard-basics');
      form.append(node('h3', '', '先给球队取个名字'), field('阵容名称', draft.name, wizard.kind === 'edit' ? 'lineup-team-name' : 'lineup-name', value => { draft.name = value; }, { maxLength: 40 }));
      const modes = choices('比赛人数', [{ id: '3v3', label: '三人阵容' }, { id: '4v4', label: '四人阵容' }], draft.mode, 'lineup-mode', value => {
        if (wizard.kind !== 'create') return;
        draft.mode = value; draft.players = createMembers.slice(0, value === '3v3' ? 3 : 4); playerIndex = Math.min(playerIndex, draft.players.length - 1); draw();
      });
      modes.classList.add('lineup-mode-cards');
      for (const option of modes.querySelectorAll('[data-action="lineup-mode"]')) {
        const label = option.textContent; option.replaceChildren(node('strong', '', label), node('small', '', `${option.dataset.value === '4v4' ? 4 : 3} 位队员`));
        const people = node('span', 'lineup-mode-people'); people.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < (option.dataset.value === '4v4' ? 4 : 3); i++) people.append(node('i')); option.append(people);
      }
      form.append(modes);
      if (wizard.kind === 'edit') { for (const control of form.querySelectorAll('[data-action="lineup-mode"]')) control.disabled = true; }
      form.append(node('p', 'lineup-form-hint', wizard.kind === 'edit' ? '已创建阵容的人数固定；其他资料可分步调整。' : '可随时回看前面的任务，所有内容最后统一保存。')); page.append(form);
    } else if (wizard.step === 2) page.append(wizardTeams(draft));
    else page.append(wizardPlayers(draft));
    const footer = node('footer', 'lineup-sheet-footer');
    const error = node('p', 'lineup-wizard-error'); error.setAttribute('role', feedback ? 'alert' : 'status');
    if (feedback) error.append(button(feedback, 'lineup-inspect-error', () => inspect('操作提示', feedback), { className: 'lineup-error-text' }));
    const controls = node('div', 'lineup-wizard-actions');
    controls.append(button('上一步', 'lineup-wizard-back', () => wizardStep(wizard.step - 1), { disabled: wizard.step === 1 || Boolean(confirmation) || Boolean(inspection) }));
    controls.append(button(pending || externalBusy ? '正在保存…' : wizard.step === 3 ? (wizard.kind === 'create' ? '完成并保存阵容' : '保存配置') : '继续', wizard.step === 3 ? (wizard.kind === 'create' ? 'lineup-create-save' : 'lineup-save') : 'lineup-wizard-next', wizard.step === 3 ? saveWizard : nextWizard, { className: 'button button-primary', disabled: Boolean(confirmation) || Boolean(inspection) }));
    footer.append(error, controls, node('small', '', '仅点击最后的保存按钮才会写入本机'));
    sheet.panel.append(heading, progress, body, footer);
    if (transition?.snapshot) wizardMotion.play({ host: body, page, snapshot: transition.snapshot, kind: transition.intent.kind, forward: transition.intent.forward });
    sheet.dialog.setAttribute('aria-busy', String(pending || externalBusy));
    if (action) {
      const target = [...sheet.panel.querySelectorAll('[data-action]')].find(item => item.dataset.action === action && item.dataset.value === value && item.dataset.section === section && item.dataset.index === index && !item.disabled);
      (target || sheet.panel).focus({ preventScroll: true });
    }
  }

  function tacticPreview(templateId) {
    const svg = svgElement('svg', { viewBox: '0 0 1000 820', preserveAspectRatio: 'xMidYMid meet', class: 'lineup-tactic-preview', 'aria-label': '推荐战术初始站位', role: 'img' });
    appendWoodSurface(svg, svgElement, 'lineup-preview-wood');
    svg.append(svgElement('path', { d: 'M70 70H930V730H70ZM350 70V390H650V70M110 70V226A399 399 0 0 0 890 226V70M447 108H553', fill: 'none', stroke: COURT_COLORS.marking, 'stroke-width': 6 }));
    const template = templates.find(item => item.id === templateId);
    if (template) for (const player of template.build().frames[0].players) {
      const piece = svgElement('g', { transform: `translate(${player.x} ${player.y})`, opacity: player.team === 'attack' ? 1 : .45 });
      appendPlayerPiece(piece, svgElement, 'lineup-preview-wood', player.team, 28, 3);
      if (player.team === 'attack') piece.append(svgElement('text', { x: 0, y: 10, 'text-anchor': 'middle', fill: '#fff', 'font-size': 28, 'font-family': 'system-ui' }, player.number));
      svg.append(piece);
    }
    return svg;
  }
  function recommendationsPageView() {
    const profile = active();
    if (!profile) { route = 'profiles'; profilePageView(); return; }
    header('进攻推荐', `${profile.name} · ${profile.mode}`, true, button('配置', 'lineup-reconfigure', () => beginEdit(profile)));
    if (!results.ready || !results.recommendations?.length) {
      const empty = node('div', 'lineup-empty');
      empty.append(crest(profile), node('h2', '', results.ready ? '暂时没有适合的候选' : '还差一点，就能开始推荐'), node('p', '', results.message || '请为每名队员明确选择身高、体格和移动特点。能力可以全部按一般处理。'));
      empty.append(button('继续配置球员', 'lineup-complete', () => beginEdit(profile), { className: 'button button-primary' })); root.append(empty); return;
    }
    if (dirty(profile.id)) notice('有未保存配置；当前推荐按已保存的阵容生成。');
    recommendationIndex = Math.max(0, Math.min(results.recommendations.length - 1, recommendationIndex));
    const result = results.recommendations[recommendationIndex];
    const candidateTabs = node('div', 'lineup-recommendation-tabs');
    results.recommendations.forEach((candidate, index) => candidateTabs.append(button(candidate.title, 'lineup-candidate', () => { recommendationIndex = index; textPage = 0; draw(); }, { pressed: index === recommendationIndex, data: { templateId: candidate.templateId }, title: candidate.title })));
    root.append(candidateTabs);
    const card = node('article', 'lineup-recommendation-card');
    const top = node('div', 'lineup-recommendation-top');
    top.append(node('h2', '', result.title), node('span', 'lineup-fit', result.fit === 'conditional' ? '有条件备选' : '适合尝试'));
    card.append(top, tacticPreview(result.templateId));
    const tabs = node('div', 'lineup-section-tabs');
    for (const [id, label] of [['summary', '特点'], ['reasons', '理由'], ['assignments', '分工'], ['cautions', '提醒']]) tabs.append(button(label, 'lineup-detail', () => { recommendationSection = id; textPage = 0; draw(); }, { pressed: recommendationSection === id, data: { section: id } }));
    card.append(tabs);
    let entries;
    if (recommendationSection === 'summary') entries = [results.message, ...(results.summary || [])].filter(Boolean).map(text => ({ text }));
    else if (recommendationSection === 'assignments') entries = (result.assignments || []).map(assignment => {
      const index = profile.players.findIndex(member => member.id === assignment.playerId), player = profile.players[index];
      return { title: `职责 ${assignment.role} · ${playerName(player, Math.max(0, index))} · 球衣 ${player?.number ?? '—'} 号`, text: assignment.task, player, index };
    });
    else entries = [...(recommendationSection === 'cautions' && results.message ? [results.message] : []), ...(result[recommendationSection] || [])].map(text => ({ text: typeof text === 'string' ? text : text.message || text.reason || JSON.stringify(text) }));
    const pages = entries.flatMap(entry => splitLineupText(entry.text, 70, 3).map(text => ({ ...entry, text })));
    if (!pages.length) pages.push({ text: recommendationSection === 'cautions' ? '按内置讲解练习，注意队友间距与配合时机。' : '此项暂无补充说明。' });
    textPage = Math.max(0, Math.min(pages.length - 1, textPage));
    const detail = node('div', 'lineup-recommendation-detail'), entry = pages[textPage];
    if (entry.player) {
      detail.className += ' has-player';
      detail.append(jersey(entry.player, profile.nbaTeamId, entry.index, true));
    }
    if (entry.title) detail.append(node('strong', '', entry.title));
    detail.append(node('p', '', entry.text));
    card.append(detail, pager(pages.length, textPage, page => { textPage = page; draw(); }, 'lineup-detail'));
    root.append(card, button('▶ 按本队分工演练', 'lineup-play', () => perform('play', { templateId: result.templateId }), { className: 'button button-primary lineup-bottom-action', data: { templateId: result.templateId } }));
  }
  function confirmationView() {
    const wrap = node('section', 'lineup-confirmation');
    if (confirmation.kind === 'delete') {
      const profile = state.profiles.find(item => item.id === confirmation.id);
      wrap.append(node('h2', '', '删除这份阵容？'), node('p', '', profile ? `${profile.name} · ${profile.mode}` : '该阵容已不存在'));
      wrap.append(button('保留阵容', 'lineup-delete-cancel', () => { confirmation = null; draw(); }));
      wrap.append(button('删除阵容与成员', 'lineup-delete-confirm', () => {
        const id = confirmation.id;
        perform('delete', { id }, () => { drafts.delete(id); baselines.delete(id); confirmation = null; route = 'profiles'; });
      }, { className: 'button lineup-danger', disabled: !profile }));
    } else {
      wrap.append(node('h2', '', '配置尚未保存'), node('p', '', '可以继续填写，或保留草稿返回。离开本次应用前请明确保存。'));
      wrap.append(button('继续配置', 'lineup-draft-continue', () => { confirmation = null; draw(); }, { className: 'button button-primary' }));
      wrap.append(button('保留草稿返回', 'lineup-draft-keep', () => { confirmation = null; route = 'profiles'; draw(); }));
      wrap.append(button('放弃本次修改', 'lineup-draft-discard', () => {
        if (confirmation.sourceRoute === 'create') createDraft = null;
        else { drafts.delete(confirmation.editorId); baselines.delete(confirmation.editorId); }
        confirmation = null; route = 'profiles'; draw();
      }, { className: 'button lineup-danger' }));
    }
    root.append(wrap);
  }
  function draw() {
    const intent = wizardMotionIntent; wizardMotionIntent = null;
    const snapshot = wizard && intent && sheet.isOpen && !sheet.closing ? wizardMotion.capture(sheet.panel.querySelector('.lineup-wizard-page')) : null;
    if (!snapshot) wizardMotion.cancel();
    wizardSwipe?.destroy(); wizardSwipe = null;
    destroyTeamCarousel();
    root.classList.remove('has-input-focus');
    lockerRoom?.destroy(); lockerRoom = null;
    root.replaceChildren(); root.dataset.section = section; root.dataset.readLocked = String(readLocked); root.dataset.subview = confirmation && !wizard ? 'confirmation' : route;
    root.setAttribute('aria-busy', String(pending || externalBusy));
    if (readLocked) readLockedPageView();
    else if (inspection) {
      header(inspection.title, '完整信息 · 分页阅读', true);
      root.append(node('p', 'lineup-inspection', inspection.pages[inspection.page]));
      root.append(pager(inspection.pages.length, inspection.page, page => { inspection.page = page; draw(); }, 'lineup-inspect'));
    } else if (confirmation && !wizard) confirmationView();
    else if (route === 'recommendations' && section === 'lineups') recommendationsPageView();
    else if (section === 'archives') archivesPageView();
    else profilePageView();
    if (!wizard) {
      notice(feedback, feedback && !feedback.endsWith('已保存。') ? 'error' : '');
      if (feedback && externalError && !readLocked) root.append(button('重试读取', 'lineup-retry', () => perform('retry', {}), { className: 'button button-subtle lineup-retry' }));
    }
    if (wizard) { renderWizard(snapshot ? { snapshot, intent } : null); sheet.open(); }
    sheet.refreshIsolation();
    if (archiveMenu.open) { renderArchiveMenu(); refreshMenuIsolation(); }
  }
  function handleBack() {
    if (pending || externalBusy) return true;
    if (inspection) { inspection = null; draw(); return true; }
    if (archiveMenu.open) { closeArchiveMenu(); return true; }
    if (sheet.isOpen) { requestWizardClose(); return true; }
    if (confirmation) { confirmation = null; draw(); return true; }
    if (route !== 'profiles') { route = 'profiles'; draw(); return true; }
    return false;
  }
  return {
    render({ state: nextState, recommendations, busy = false, error = '', writeLocked = false }) {
      state = nextState || { profiles: [], activeProfileId: null, playbackContext: null };
      for (const [profileId, playerId] of selectedByProfile) {
        const profile = state.profiles.find(item => item.id === profileId);
        if (!profile || !profile.players.some(player => player.id === playerId)) selectedByProfile.delete(profileId);
      }
      results = recommendations || { ready: false, summary: [], recommendations: [] };
      externalBusy = Boolean(busy);
      externalError = Boolean(error);
      readLocked = Boolean(writeLocked);
      if (error) feedback = typeof error === 'string' ? error : error.message || String(error);
      draw();
    },
    handleBack,
    hasUnsavedChanges,
    setView(view) {
      if (!['lineups', 'archives'].includes(view)) return false;
      if (section === view) return true;
      if (sheet.isOpen || archiveMenu.open || pending || externalBusy) return false;
      section = view; route = 'profiles'; feedback = ''; draw(); return true;
    },
    get isModalOpen() { return sheet.isOpen || archiveMenu.open; },
  };
}
