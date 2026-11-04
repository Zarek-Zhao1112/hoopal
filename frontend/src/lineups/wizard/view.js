import { getNbaTeam } from '../../../../data/nba-teams.js';
import { createTeamCarousel } from '../components/team-carousel.js';
import { NBA_TEAMS } from '../../../../data/nba-teams.js';
import { getTeamLogoUrl } from '../components/team-assets.js';
import { playerName } from '../views/text.js';
import { createJerseySvg } from '../components/jersey.js';
import { attachWizardSwipe } from '../components/wizard-motion.js';
import { getTeamRoleOptions } from '../../../../shared/team-roles.js';

/** A feature-owned view, using the coordinator's explicit state and callbacks. */
export function createLineupWizardView(context){
 const {sheet,node,model,draftStore,wizardDraft,button,inspect,jersey,document,selectWizardPlayer,wizardMemberReady,draw,identity,field,choices,requestWizardClose,wizardStep,pager,closeWizard,saveWizard,nextWizard,wizardMotion}=context;
 let teamCarousel=null,teamCarouselGeneration=0,teamAllOpen=false,wizardSwipe=null; const teamGuards=new Map();
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

function wizardTeams(draft) {
    const content = node('section', 'lineup-wizard-teams lineup-wizard-carousel');
    const summary = node('div', 'lineup-wizard-kit');
    const generation = ++teamCarouselGeneration;
    function unavailable() {
      return generation !== teamCarouselGeneration || model.pending || model.externalBusy || sheet.closing || !draftStore.wizard || draftStore.wizard.step !== 2 || wizardDraft() !== draft;
    }
    function syncSummary() {
      const team = getNbaTeam(draft.nbaTeamId), description = node('div');
      description.append(button(team?.fullName || '尚未选择 NBA 球队', 'lineup-inspect-team', () => inspect('NBA 球队', team?.fullName || '旧档案可保持中性球衣；新建需要明确选择球队。'), { className: 'lineup-text-link' }), node('small', '', '球衣同步预览 · 最后统一保存'));
      summary.dataset.teamId = draft.nbaTeamId || '';
      summary.replaceChildren(description, jersey(draft.players[draftStore.playerIndex] || draft.players[0], draft.nbaTeamId, draftStore.playerIndex, true));
      content.dataset.neutral = String(!draft.nbaTeamId);
    }
    syncSummary();
    const component = createTeamCarousel({ document, teams: NBA_TEAMS, initialTeamId: draft.nbaTeamId, getLogoUrl: getTeamLogoUrl,
      isDisabled: unavailable,
      onChange(teamId) {
        if (unavailable() || teamId !== null && !getNbaTeam(teamId)) return;
        draft.nbaTeamId = teamId; model.feedback = ''; syncSummary();
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

function syncPlayerTab(tab, member, index, draft) {
    const name = playerName(member, index);
    const number = member.number === '' ? '—' : `#${member.number}`;
    tab.querySelector('strong').textContent = number;
    tab.querySelector('small').textContent = name;
    tab.title = name;
    tab.setAttribute('aria-label', member.number === '' ? name : `${member.number}号 ${name}`);
    tab.dataset.ready = String(wizardMemberReady(member, draft));
  }

function wizardPlayerRole(draft, player, content) {
    const options = getTeamRoleOptions(draft.mode);
    const group = node('div', 'lineup-config-role');
    const list = node('div', 'lineup-config-role-options');
    list.id = 'lineup-config-role-options';
    list.dataset.mode = draft.mode;
    list.setAttribute('role', 'group');
    list.setAttribute('aria-label', '战术角色选项');
    list.hidden = true;

    const label = node('span');
    const chevron = node('span', 'lineup-config-chevron', '⌄');
    chevron.setAttribute('aria-hidden', 'true');
    const trigger = button('', 'lineup-player-role-toggle', () => {
      const opening = list.hidden;
      setExpanded(opening);
      if (opening && content.scrollHeight > content.clientHeight) {
        const beyond = list.getBoundingClientRect().bottom - content.getBoundingClientRect().bottom;
        if (beyond > 0) content.scrollTop += beyond + 4;
      }
    }, { className: 'button lineup-config-role-trigger' });
    trigger.append(label, chevron);
    trigger.setAttribute('aria-controls', list.id);
    function setExpanded(expanded) {
      trigger.setAttribute('aria-expanded', String(expanded));
      list.hidden = !expanded;
    }
    function sync() {
      const chosen = options.find(option => option.id === player.mainRole) || options.at(-1);
      label.textContent = chosen.label;
      trigger.setAttribute('aria-label', `战术角色，${chosen.label}`);
      for (const option of list.children) {
        option.setAttribute('aria-pressed', String(option.dataset.value === chosen.id));
      }
    }
    for (const option of options) {
      const choice = button('', 'lineup-player-role-option', () => {
        if (option.id) player.mainRole = option.id;
        else delete player.mainRole;
        sync();
        setExpanded(false);
        trigger.focus({ preventScroll: true });
      }, { className: 'button lineup-config-role-option', data: { value: option.id } });
      choice.append(node('strong', '', option.label), node('small', '', option.description));
      list.append(choice);
    }
    setExpanded(false);
    sync();
    group.append(node('span', 'lineup-config-role-label', '战术角色 · 可选'), trigger, list);
    return group;
  }

function wizardPlayers(draft) {
    draftStore.playerIndex = Math.max(0, Math.min(draft.players.length - 1, draftStore.playerIndex));
    const player = draft.players[draftStore.playerIndex], content = node('section', 'lineup-config-players');
    const tabs = node('div', 'lineup-config-tabs');
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', '选择队员');
    draft.players.forEach((member, index) => {
      const tab = button('', 'lineup-player', () => selectWizardPlayer(index), { pressed: index === draftStore.playerIndex, data: { index, playerId: member.id, memberNumber: index + 1 } });
      tab.append(node('strong'), node('small'));
      syncPlayerTab(tab, member, index, draft);
      tabs.append(tab);
    });
    draftStore.editSection = 'identity';
    const body = node('article', 'lineup-config-card'); body.dataset.section = 'identity';
    const hero = node('div', 'lineup-player-hero lineup-config-hero'); hero.dataset.playerId = player.id;
    const uniform = node('div', 'lineup-wizard-uniform'); uniform.dataset.playerId = player.id; uniform.dataset.teamId = draft.nbaTeamId || '';
    uniform.append(createJerseySvg({ document, team: getNbaTeam(draft.nbaTeamId), number: player.number === '' ? '—' : player.number, name: playerName(player, draftStore.playerIndex), idPrefix: `wizard-shirt-${++identity.jerseySequence}` }));
    const caption = node('div', 'lineup-config-caption');
    caption.append(node('small', '', `队员 ${draftStore.playerIndex + 1} / ${draft.players.length}`), node('strong', 'lineup-wizard-player-name', playerName(player, draftStore.playerIndex)));
    const arrows = node('div', 'lineup-config-arrows');
    arrows.append(
      button('‹', 'lineup-wizard-player-prev', () => selectWizardPlayer(draftStore.playerIndex - 1), { className: 'lineup-wizard-player-arrow', disabled: draftStore.playerIndex === 0, title: '上一名队员' }),
      button('›', 'lineup-wizard-player-next', () => selectWizardPlayer(draftStore.playerIndex + 1), { className: 'lineup-wizard-player-arrow', disabled: draftStore.playerIndex === draft.players.length - 1, title: '下一名队员' }));
    hero.append(uniform, caption, arrows);
    const pane = node('div', 'lineup-config-fields');
    pane.append(field('昵称 · 可选', player.name, 'lineup-player-name', value => { player.name = value; syncWizardPlayerPreview(); }, { maxLength: 24 }));
    pane.append(field('球衣号码', player.number, 'lineup-player-number', value => { player.number = value === '' ? '' : Number(value); syncWizardPlayerPreview(); }, { type: 'number', min: 0, max: 99, inputMode: 'numeric' }));
    body.append(hero, pane, wizardPlayerRole(draft, player, content));
    content.append(tabs, body, node('p', 'lineup-config-note', '角色可重复选择，球衣号码在队内不重复。'));
    wizardSwipe = attachWizardSwipe({ element: hero, isDisabled: () => model.pending || model.externalBusy || sheet.closing || !sheet.isOpen || !draftStore.wizard || draftStore.wizard.step !== 3 || Boolean(model.confirmation) || Boolean(model.inspection) || document.hidden, onStep: delta => selectWizardPlayer(draftStore.playerIndex + delta) });
    return content;
  }

function syncWizardPlayerPreview() {
    const draft = wizardDraft(), player = draft?.players[draftStore.playerIndex];
    const page = sheet.panel.querySelector('.lineup-wizard-page[data-current="true"]');
    const uniform = page?.querySelector('.lineup-wizard-uniform');
    if (!player || !uniform) return;
    uniform.replaceChildren(createJerseySvg({ document, team: getNbaTeam(draft.nbaTeamId), number: player.number === '' ? '—' : player.number, name: playerName(player, draftStore.playerIndex), idPrefix: `wizard-shirt-${++identity.jerseySequence}` }));
    const label = page.querySelector('.lineup-wizard-player-name');
    if (label) label.textContent = playerName(player, draftStore.playerIndex);
    for (const tab of page.querySelectorAll('[data-action="lineup-player"]')) {
      const index = Number(tab.dataset.index);
      syncPlayerTab(tab, draft.players[index], index, draft);
    }
  }

function renderWizard(transition = null) {
    const draft = wizardDraft(); if (!draft) return;
    const previous = document.activeElement;
    const action = sheet.panel.contains(previous) ? previous.dataset.action : null;
    const value = previous?.dataset.value, section = previous?.dataset.section, index = previous?.dataset.index;
    const retainedBody = sheet.panel.querySelector('.lineup-sheet-content');
    const playerConfigOnly = Boolean(draftStore.wizard.playerConfigOnly);
    sheet.panel.replaceChildren(); sheet.panel.dataset.step = String(draftStore.wizard.step); sheet.panel.dataset.kind = draftStore.wizard.kind; sheet.panel.dataset.confirmation = String(model.confirmation?.kind === 'wizard-draft');
    sheet.panel.dataset.playerConfig = String(playerConfigOnly);
    sheet.panel.classList.remove('has-input-focus');
    const heading = node('header', 'lineup-sheet-heading'), title = node('div');
    if (!playerConfigOnly) title.append(node('p', '', draftStore.wizard.kind === 'create' ? '建立自己的球队' : '调整本队资料'));
    const createTitles = ['给球队起个名字', '选一套球队风格', '让球员一一入队'];
    const h2 = node('h2', '', playerConfigOnly ? '配置球员' : draftStore.wizard.kind === 'create' ? model.confirmation?.kind === 'wizard-draft' ? '保留这次配置？' : createTitles[draftStore.wizard.step - 1] : '配置阵容'); h2.id = 'lineup-wizard-title'; title.append(h2);
    if (playerConfigOnly) title.append(node('p', 'lineup-config-team', `${draft.name} · ${draft.mode}`));
    heading.append(title, button('×', 'lineup-wizard-close', requestWizardClose, { className: 'lineup-sheet-close', title: '关闭配置面板' }));
    const progress = node('nav', 'lineup-wizard-progress'); progress.setAttribute('aria-label', '配置任务');
    if (!playerConfigOnly) {
      ['名称与人数', '球队与球衣', '球员配置'].forEach((label, i) => { const step = i + 1, item = button('', 'lineup-wizard-step', () => wizardStep(step), { pressed: draftStore.wizard.step === step, disabled: step > draftStore.wizard.maxStep || Boolean(model.confirmation), data: { step } }); item.append(node('span', '', String(step)), node('strong', '', label)); progress.append(item); });
    }
    const body = retainedBody || node('div', 'lineup-sheet-content'), page = node('div', 'lineup-wizard-page');
    page.dataset.current = 'true'; page.dataset.step = String(draftStore.wizard.step); page.dataset.playerId = draft.players[draftStore.playerIndex]?.id || ''; body.replaceChildren(page);
    if (model.inspection) {
      const content = node('section', 'lineup-sheet-confirmation');
      content.append(node('h3', '', model.inspection.title), node('p', 'lineup-sheet-inspection', model.inspection.pages[model.inspection.page]), pager(model.inspection.pages.length, model.inspection.page, page => { model.inspection.page = page; draw(); }, 'lineup-inspect'), button('返回配置', 'lineup-inspect-close', () => { model.inspection = null; draw(); })); page.append(content);
    } else if (model.confirmation?.kind === 'wizard-draft') {
      const confirm = node('section', 'lineup-sheet-confirmation');
      confirm.append(node('h3', '', '保留这次配置吗？'), node('p', '', '尚未写入本机。保留会话草稿后可以继续填写，关闭应用后不会恢复。'));
      confirm.append(button('继续填写', 'lineup-draft-continue', () => { model.confirmation = null; draw(); }, { className: 'button button-primary' }), button('保留会话草稿关闭', 'lineup-draft-keep', () => closeWizard()), button('放弃本次修改', 'lineup-draft-discard', () => closeWizard(true), { className: 'button lineup-danger' })); page.append(confirm);
    } else if (draftStore.wizard.step === 1) {
      const form = node('section', 'lineup-wizard-basics');
      form.append(node('h3', '', '先给球队取个名字'), field('阵容名称', draft.name, draftStore.wizard.kind === 'edit' ? 'lineup-team-name' : 'lineup-name', value => { draft.name = value; }, { maxLength: 40 }));
      const modes = choices('比赛人数', [{ id: '3v3', label: '三人阵容' }, { id: '4v4', label: '四人阵容' }], draft.mode, 'lineup-mode', value => {
        if (draftStore.wizard.kind !== 'create') return;
        draftStore.setCreateMode(value); draw();
      });
      modes.classList.add('lineup-mode-cards');
      for (const option of modes.querySelectorAll('[data-action="lineup-mode"]')) {
        const label = option.textContent; option.replaceChildren(node('strong', '', label), node('small', '', `${option.dataset.value === '4v4' ? 4 : 3} 位队员`));
        const people = node('span', 'lineup-mode-people'); people.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < (option.dataset.value === '4v4' ? 4 : 3); i++) people.append(node('i')); option.append(people);
      }
      form.append(modes);
      if (draftStore.wizard.kind === 'edit') { for (const control of form.querySelectorAll('[data-action="lineup-mode"]')) control.disabled = true; }
      form.append(node('p', 'lineup-form-hint', draftStore.wizard.kind === 'edit' ? '已创建阵容的人数固定；其他资料可分步调整。' : '可随时回看前面的任务，所有内容最后统一保存。')); page.append(form);
    } else if (draftStore.wizard.step === 2) page.append(wizardTeams(draft));
    else page.append(wizardPlayers(draft));
    const footer = node('footer', 'lineup-sheet-footer');
    const error = node('p', 'lineup-wizard-error'); error.setAttribute('role', model.feedback ? 'alert' : 'status');
    if (model.feedback) error.append(button(model.feedback, 'lineup-inspect-error', () => inspect('操作提示', model.feedback), { className: 'lineup-error-text' }));
    const controls = node('div', 'lineup-wizard-actions');
    const blocked = Boolean(model.confirmation) || Boolean(model.inspection);
    if (playerConfigOnly) {
      controls.append(button('取消', 'lineup-player-config-cancel', requestWizardClose, { disabled: blocked }));
    } else {
      controls.append(button('上一步', 'lineup-wizard-back', () => wizardStep(draftStore.wizard.step - 1), { disabled: draftStore.wizard.step === 1 || blocked }));
    }
    const finalStep = draftStore.wizard.step === 3;
    const isCreate = draftStore.wizard.kind === 'create';
    const saveLabel = playerConfigOnly ? '保存球员配置' : isCreate ? '完成并保存阵容' : '保存配置';
    controls.append(button(model.pending || model.externalBusy ? '正在保存…' : finalStep ? saveLabel : '继续', finalStep ? (isCreate ? 'lineup-create-save' : 'lineup-save') : 'lineup-wizard-next', finalStep ? saveWizard : nextWizard, { className: 'button button-primary', disabled: blocked }));
    footer.append(error, controls, node('small', '', '仅点击最后的保存按钮才会写入本机'));
    sheet.panel.append(heading);
    if (!playerConfigOnly) sheet.panel.append(progress);
    sheet.panel.append(body, footer);
    if (transition?.snapshot) wizardMotion.play({ host: body, page, snapshot: transition.snapshot, kind: transition.intent.kind, forward: transition.intent.forward });
    sheet.dialog.setAttribute('aria-busy', String(model.pending || model.externalBusy));
    if (action) {
      const target = [...sheet.panel.querySelectorAll('[data-action]')].find(item => item.dataset.action === action && item.dataset.value === value && item.dataset.section === section && item.dataset.index === index && !item.disabled);
      (target || sheet.panel).focus({ preventScroll: true });
    }
  }
 function destroyWizardComponents(){wizardSwipe?.destroy();wizardSwipe=null;destroyTeamCarousel();}
 return {isolateTeamList,destroyTeamCarousel,wizardTeams,wizardPlayers,syncWizardPlayerPreview,renderWizard, destroyWizardComponents, get teamAllOpen(){return teamAllOpen;},get carousel(){return teamCarousel;}};
}
