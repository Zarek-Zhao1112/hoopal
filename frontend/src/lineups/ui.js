import {createJerseySvg} from './components/jersey.js';
import {getNbaTeam} from '../../../data/nba-teams.js';
import {getTeamLogoUrl} from './components/team-assets.js';
import {createLineupSheet} from './components/sheet.js';
import {createWizardMotion} from './components/wizard-motion.js';
import {createLineupDrafts} from './wizard/drafts.js';
import {playerName,skillLabel,splitLineupText} from './views/text.js';
import {createLineupWizardController} from './wizard/controller.js';
import {createLineupWizardView} from './wizard/view.js';
import {createLockerView} from './views/locker.js';
import {createArchivesView} from './views/archives.js';
import {createRecommendationsView} from './views/recommendations.js';
import {createArchiveMenu} from './components/archive-menu.js';
import {createAccountSheet} from './components/account-sheet.js';
export {splitLineupText} from './views/text.js';

/** Coordinates saved state, views and owned dialogs. Drafts never persist here. */
export function createLineupUI({root,onAction,onInspect,onModalChange,onNavigate}){
 // Saved state arrives through render(); draftStore remains independent of it.
 const model = {
   state: { profiles: [], activeProfileId: null, playbackContext: null },
   results: { ready: false, summary: [], recommendations: [] },
   route: 'profiles', section: 'lineups', profilePage: 0,
   recommendationIndex: 0, recommendationSection: 'reasons', textPage: 0,
   pending: false, externalBusy: false, externalError: false, readLocked: false,
   feedback: '', confirmation: null, inspection: null, afterSheetNavigation: null,
 };
 const draftStore=createLineupDrafts(),identity={jerseySequence:0};
 const dirty=draftStore.isDirty,hasUnsavedChanges=draftStore.hasUnsavedChanges;

  if (!root || typeof onAction !== 'function') throw new TypeError('阵容界面需要 root 与 onAction');
  const document = root.ownerDocument;

  const sheet = createLineupSheet({ document, onRequestClose: () => requestWizardClose(), onModalChange(open) {
    onModalChange?.(open);
    if (!open && model.afterSheetNavigation) { const target = model.afterSheetNavigation; model.afterSheetNavigation = null; navigate(target); }
  } });
  const archiveMenu = document.createElement('dialog');
  archiveMenu.id = 'lineup-archive-menu'; archiveMenu.className = 'lineup-archive-menu'; archiveMenu.dataset.lineupOwned = 'true'; archiveMenu.dataset.phase = 'closed';
  archiveMenu.setAttribute('aria-labelledby', 'lineup-archive-menu-title'); document.body.append(archiveMenu);
  const accountSheet = createAccountSheet({
    document, onModalChange,
    isBlocked: () => sheet.isOpen || archiveMenu.open || model.pending || model.externalBusy,
  });

  function openAccount(kind, trigger) { return accountSheet.open(kind, trigger); }

  const wizardMotion = createWizardMotion({ document });

  const selectedByProfile = new Map();

  // Android WebView 96 predates :has(); only actual text/number input focus
  // compresses the editor when the keyboard reduces the available height.
  function updateInputFocus() {
    const focused = document.activeElement;
    root.classList.toggle('has-input-focus', focused?.tagName === 'INPUT' && root.contains(focused));
  }
  root.addEventListener('focusin', updateInputFocus);
  root.addEventListener('focusout', () => setTimeout(updateInputFocus, 0));
  const active = () => model.state.profiles.find(profile => profile.id === model.state.activeProfileId);

  function node(tag, className = '', text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }
  function inspect(title, text) {
    if (onInspect) { onInspect({ title, text: String(text) }); return; }
    model.inspection = { title, pages: splitLineupText(text, 90, 3), page: 0 };
    draw();
  }
  function button(label, action, callback, options = {}) {
    const element = node('button', options.className || 'button button-subtle', label);
    element.type = 'button';
    element.dataset.action = action;
    for (const [key, value] of Object.entries(options.data || {})) element.dataset[key] = value;
    element.disabled = model.pending || model.externalBusy || Boolean(options.disabled);
    if (options.pressed !== undefined) element.setAttribute('aria-pressed', String(options.pressed));
    if (options.title) element.title = options.title;
    element.addEventListener('click', () => {
      if (model.pending || model.externalBusy || element.disabled || element.isConnected === false || sheet.closing || wizardView.teamAllOpen || accountSheet.isOpen || archiveMenu.open && !archiveMenu.contains(element)) return;
      if (!sheet.isOpen) sheet.rememberTrigger(element);
      callback();
    });
    return element;
  }

  function jersey(player, nbaTeamId, index, compact = false) {
    const wrap = node('div', `lineup-jersey${compact ? ' compact' : ''}`);
    wrap.dataset.playerId = player.id;
    wrap.dataset.teamId = nbaTeamId || '';
    const svg = createJerseySvg({ document, team: getNbaTeam(nbaTeamId), number: player.number, name: playerName(player, index), idPrefix: `lineup-shirt-${++identity.jerseySequence}` });
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
    if (model.pending || model.externalBusy) return false;
    model.pending = true; model.feedback = ''; draw();
    let accepted = false;
    try {
      accepted = await onAction(kind, payload) === true;
      if (accepted) success();
      else if (!model.feedback) model.feedback = '操作未保存，请检查提示后重试。已填内容仍保留。';
    } catch (error) { model.feedback = error?.message || '操作失败，请重试。已填内容仍保留。'; }
    finally { model.pending = false; draw(); }
    return accepted;
  }

  function field(label, value, action, setter, { type = 'text', maxLength, min, max, inputMode } = {}) {
    const wrap = node('label', 'lineup-field');
    wrap.append(node('span', '', label));
    const input = node('input');
    input.type = type; input.value = value ?? ''; input.dataset.action = action;
    input.disabled = model.pending || model.externalBusy;
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

  function navigate(view) {
    model.section = view; model.route = 'profiles';
    onNavigate?.(view); draw();
  }

  function readLockedPageView() {
    const card = node('section', 'lineup-read-error');
    const heading = node('h1', '', model.section === 'archives' ? '我的' : '更衣室');
    const message = node('div', 'lineup-read-error-message');
    message.setAttribute('role', 'status');
    message.append(node('h2', '', '档案暂时无法读取'), node('p', '', '读取恢复前不会覆盖本机档案。\n请重试读取，再继续选择或创建球队。'));
    card.append(heading, message, button(model.pending || model.externalBusy ? '正在重试…' : '重试读取', 'lineup-retry', () => perform('retry', {}), { className: 'button button-primary lineup-retry' }));
    root.append(card);
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

  function confirmationView() {
    const wrap = node('section', 'lineup-confirmation');
    if (model.confirmation.kind === 'delete') {
      const profile = model.state.profiles.find(item => item.id === model.confirmation.id);
      wrap.append(node('h2', '', '删除这份阵容？'), node('p', '', profile ? `${profile.name} · ${profile.mode}` : '该阵容已不存在'));
      wrap.append(button('保留阵容', 'lineup-delete-cancel', () => { model.confirmation = null; draw(); }));
      wrap.append(button('删除阵容与成员', 'lineup-delete-confirm', () => {
        const id = model.confirmation.id;
        perform('delete', { id }, () => { draftStore.drafts.delete(id); draftStore.baselines.delete(id); model.confirmation = null; model.route = 'profiles'; });
      }, { className: 'button lineup-danger', disabled: !profile }));
    } else {
      wrap.append(node('h2', '', '配置尚未保存'), node('p', '', '可以继续填写，或保留草稿返回。离开本次应用前请明确保存。'));
      wrap.append(button('继续配置', 'lineup-draft-continue', () => { model.confirmation = null; draw(); }, { className: 'button button-primary' }));
      wrap.append(button('保留草稿返回', 'lineup-draft-keep', () => { model.confirmation = null; model.route = 'profiles'; draw(); }));
      wrap.append(button('放弃本次修改', 'lineup-draft-discard', () => {
        if (model.confirmation.sourceRoute === 'create') draftStore.createDraft = null;
        else { draftStore.drafts.delete(model.confirmation.editorId); draftStore.baselines.delete(model.confirmation.editorId); }
        model.confirmation = null; model.route = 'profiles'; draw();
      }, { className: 'button lineup-danger' }));
    }
    root.append(wrap);
  }
  function draw() {
    const intent = draftStore.wizardMotionIntent; draftStore.wizardMotionIntent = null;
    const snapshot = draftStore.wizard && intent && sheet.isOpen && !sheet.closing ? wizardMotion.capture(sheet.panel.querySelector('.lineup-wizard-page')) : null;
    if (!snapshot) wizardMotion.cancel();
    destroyWizardComponents();
    root.classList.remove('has-input-focus');
    destroyLocker();
    root.replaceChildren(); root.dataset.section = model.section; root.dataset.readLocked = String(model.readLocked); root.dataset.subview = model.confirmation && !draftStore.wizard ? 'confirmation' : model.route;
    root.setAttribute('aria-busy', String(model.pending || model.externalBusy));
    if (model.readLocked) readLockedPageView();
    else if (model.inspection) {
      header(model.inspection.title, '完整信息 · 分页阅读', true);
      root.append(node('p', 'lineup-inspection', model.inspection.pages[model.inspection.page]));
      root.append(pager(model.inspection.pages.length, model.inspection.page, page => { model.inspection.page = page; draw(); }, 'lineup-inspect'));
    } else if (model.confirmation && !draftStore.wizard) confirmationView();
    else if (model.route === 'recommendations' && model.section === 'lineups') recommendationsPageView();
    else if (model.section === 'archives') archivesPageView();
    else profilePageView();
    if (!draftStore.wizard) {
      notice(model.feedback, model.feedback && !model.feedback.endsWith('已保存。') ? 'error' : '');
      if (model.feedback && model.externalError && !model.readLocked) root.append(button('重试读取', 'lineup-retry', () => perform('retry', {}), { className: 'button button-subtle lineup-retry' }));
    }
    if (draftStore.wizard) { renderWizard(snapshot ? { snapshot, intent } : null); sheet.open(); }
    sheet.refreshIsolation();
    accountSheet.refreshIsolation();
    if (archiveMenu.open) { renderArchiveMenu(); refreshMenuIsolation(); }
  }
  function handleBack() {
    if (model.pending || model.externalBusy) return true;
    if (accountSheet.handleBack()) return true;
    if (model.inspection) { model.inspection = null; draw(); return true; }
    if (archiveMenu.open) { closeArchiveMenu(); return true; }
    if (sheet.isOpen) { requestWizardClose(); return true; }
    if (model.confirmation) { model.confirmation = null; draw(); return true; }
    if (model.route !== 'profiles') { model.route = 'profiles'; draw(); return true; }
    return false;
  }
 // Feature modules receive explicit state and live callbacks, never storage.
 // Forwarders let the wizard controller and view cooperate without cyclic imports.
 const context={
  selectedByProfile, sheet, draftStore, model, dirty, document, identity,
  wizardMotion, root, active, archiveMenu, onModalChange, openAccount,
  get wizardView(){return wizardView;},
  draw:(...args)=>draw(...args),
  destroyTeamCarousel:(...args)=>destroyTeamCarousel(...args),
  perform:(...args)=>perform(...args),
  node:(...args)=>node(...args),
  wizardDraft:(...args)=>wizardDraft(...args),
  button:(...args)=>button(...args),
  inspect:(...args)=>inspect(...args),
  jersey:(...args)=>jersey(...args),
  selectWizardPlayer:(...args)=>selectWizardPlayer(...args),
  wizardMemberReady:(...args)=>wizardMemberReady(...args),
  field:(...args)=>field(...args),
  choices:(...args)=>choices(...args),
  requestWizardClose:(...args)=>requestWizardClose(...args),
  wizardStep:(...args)=>wizardStep(...args),
  pager:(...args)=>pager(...args),
  closeWizard:(...args)=>closeWizard(...args),
  saveWizard:(...args)=>saveWizard(...args),
  nextWizard:(...args)=>nextWizard(...args),
  header:(...args)=>header(...args),
  navigate:(...args)=>navigate(...args),
  crest:(...args)=>crest(...args),
  beginEdit:(...args)=>beginEdit(...args),
  openArchiveMenu:(...args)=>openArchiveMenu(...args),
  beginCreate:(...args)=>beginCreate(...args),
  profilePageView:(...args)=>profilePageView(...args),
  notice:(...args)=>notice(...args)};
 // Construct the view before the controller reads its lifecycle handle.
 const wizardView=createLineupWizardView(context);
 const {isolateTeamList,destroyTeamCarousel,wizardTeams,wizardPlayers,syncWizardPlayerPreview,renderWizard, destroyWizardComponents}=wizardView;
 const wizardControlModule=createLineupWizardController(context);
 const {beginEdit,openTeamPicker,beginCreate,wizardDraft,closeWizard,requestWizardClose,wizardStep,nextWizard,saveWizard,wizardMemberReady,selectWizardPlayer}=wizardControlModule;
 const lockerModule=createLockerView(context);
 const {profilePageView, destroyLocker}=lockerModule;
 const archivesModule=createArchivesView(context);
 const {archivesPageView}=archivesModule;
 const recommendationsModule=createRecommendationsView(context);
 const {recommendationsPageView}=recommendationsModule;
 const menuModule=createArchiveMenu(context);
 const {refreshMenuIsolation,restoreMenuFocus,closeArchiveMenu,openArchiveMenu,editFromMenu,renderArchiveMenu}=menuModule;
  return {
    render({ state: nextState, recommendations, busy = false, error = '', writeLocked = false }) {
      model.state = nextState || { profiles: [], activeProfileId: null, playbackContext: null };
      for (const [profileId, playerId] of selectedByProfile) {
        const profile = model.state.profiles.find(item => item.id === profileId);
        if (!profile || !profile.players.some(player => player.id === playerId)) selectedByProfile.delete(profileId);
      }
      model.results = recommendations || { ready: false, summary: [], recommendations: [] };
      model.externalBusy = Boolean(busy);
      model.externalError = Boolean(error);
      model.readLocked = Boolean(writeLocked);
      if (error) model.feedback = typeof error === 'string' ? error : error.message || String(error);
      draw();
    },
    handleBack,
    hasUnsavedChanges,
    setView(view) {
      if (!['lineups', 'archives'].includes(view)) return false;
      if (model.section === view) return true;
      if (sheet.isOpen || archiveMenu.open || accountSheet.isOpen || model.pending || model.externalBusy) return false;
      model.section = view; model.route = 'profiles'; model.feedback = ''; draw(); return true;
    },
    get isModalOpen() { return sheet.isOpen || archiveMenu.open || accountSheet.isOpen; },
  };

}
