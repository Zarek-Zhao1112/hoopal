import { getNbaTeam } from '../../../../data/nba-teams.js';
import { playerName } from '../views/text.js';

/** A feature-owned view, using the coordinator's explicit state and callbacks. */
export function createArchiveMenu(context){
 const {archiveMenu,root,document,model,onModalChange,draw,sheet,beginEdit,node,pager,button,inspect,perform,draftStore,dirty}=context;
 let menuState=null,menuTrigger=null,menuTriggerId='';const menuGuards=new Map();
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
    if (!archiveMenu.open || !force && (model.pending || model.externalBusy)) return false;
    if (typeof archiveMenu.close === 'function') archiveMenu.close(); else archiveMenu.removeAttribute('open');
    archiveMenu.dataset.phase = 'closed'; menuState = null; model.inspection = null;
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
    if (model.pending || model.externalBusy || sheet.isOpen || !model.state.profiles.some(profile => profile.id === id)) return;
    menuState = { id, deleting: false }; menuTrigger = trigger; menuTriggerId = id; renderArchiveMenu();
    archiveMenu.dataset.phase = 'open';
    if (typeof archiveMenu.showModal === 'function') archiveMenu.showModal(); else archiveMenu.setAttribute('open', '');
    onModalChange?.(true); refreshMenuIsolation(); archiveMenu.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
  }

function editFromMenu(step) {
    const profile = model.state.profiles.find(item => item.id === menuState?.id), trigger = menuTrigger;
    if (!profile) return;
    closeArchiveMenu({ restoreFocus: false }); sheet.rememberTrigger(trigger);
    beginEdit(profile, undefined, { step });
  }

function renderArchiveMenu() {
    if (!menuState) return;
    const profile = model.state.profiles.find(item => item.id === menuState.id);
    archiveMenu.replaceChildren(); archiveMenu.setAttribute('aria-busy', String(model.pending || model.externalBusy));
    if (model.inspection) {
      const title = node('h2', '', model.inspection.title); title.id = 'lineup-archive-menu-title';
      archiveMenu.append(title, node('p', 'lineup-archive-inspection', model.inspection.pages[model.inspection.page]));
      archiveMenu.append(pager(model.inspection.pages.length, model.inspection.page, page => { model.inspection.page = page; draw(); }, 'lineup-inspect'));
      archiveMenu.append(button('返回管理', 'lineup-inspect-close', () => { model.inspection = null; draw(); }));
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
        perform('delete', { id }, () => { draftStore.drafts.delete(id); draftStore.baselines.delete(id); closeArchiveMenu({ force: true }); model.route = 'profiles'; });
      }, { className: 'button lineup-danger', data: { profileId: profile.id } }));
    } else {
      archiveMenu.append(button(dirty(profile.id) ? '继续未保存配置' : '配置球员', 'lineup-configure', () => editFromMenu(3), { data: { profileId: profile.id } }));
      archiveMenu.append(button('修改球队名称', 'lineup-archive-rename', () => editFromMenu(1), { data: { profileId: profile.id } }));
      archiveMenu.append(button('更换 NBA 球队', 'lineup-team-open', () => editFromMenu(2), { data: { profileId: profile.id } }));
      archiveMenu.append(button('删除球队', 'lineup-delete', () => { menuState.deleting = true; renderArchiveMenu(); }, { className: 'button lineup-danger', data: { profileId: profile.id } }));
    }
    if (model.feedback) archiveMenu.append(node('p', 'lineup-archive-menu-error', model.feedback));
  }

 return {refreshMenuIsolation,restoreMenuFocus,closeArchiveMenu,openArchiveMenu,editFromMenu,renderArchiveMenu};
}
