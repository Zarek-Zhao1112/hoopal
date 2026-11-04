import { getTeamRoleOptions } from '../../../../shared/team-roles.js';
import { getNbaTeam } from '../../../../data/nba-teams.js';
import { createJerseySvg } from './jersey.js';
import { createLineupSheet } from './sheet.js';
import { playerName } from '../views/text.js';

export function createMainRolePicker({ document, model, onModalChange, isBlocked, perform, node }) {
  const sheet = createLineupSheet({
    document, onModalChange, onRequestClose: close,
    id: 'lineup-main-roles-dialog', labelledBy: 'lineup-main-roles-title',
  });
  sheet.panel.classList.add('main-role-sheet');
  let editing = null;

  function button(label, action, callback, className) {
    const control = node('button', className, label);
    control.type = 'button';
    control.dataset.action = action;
    control.addEventListener('click', () => {
      if (!editing || sheet.closing || control.disabled) return;
      callback(control);
    });
    return control;
  }

  function close() {
    if (!sheet.isOpen || sheet.closing || editing?.saving || model.pending || model.externalBusy) return false;
    editing = null;
    sheet.close();
    return true;
  }

  function refresh() {
    if (!editing || sheet.closing) return;
    const { profile, error, errorText, save, saving } = editing;
    const current = model.state.profiles.find(item => item.id === profile.id);
    const stale = !current || current.revision !== profile.revision;
    const busy = saving || model.pending || model.externalBusy;
    sheet.dialog.setAttribute('aria-busy', String(busy));
    for (const control of sheet.panel.querySelectorAll('button')) control.disabled = busy;
    save.disabled = busy || stale || model.readLocked;
    save.textContent = saving ? '正在保存…' : '保存角色';
    error.textContent = busy ? '' : stale ? '球队资料已更新，请关闭面板后重新设置。' : errorText;
    error.hidden = !error.textContent;
    sheet.refreshIsolation();
  }

  async function saveRoles() {
    const draft = editing;
    if (!draft || draft.saving || draft.save.disabled) return;
    const { profile, roles } = draft;
    draft.saving = true; draft.errorText = ''; refresh();
    const saved = await perform('save-main-roles', {
      profileId: profile.id,
      expectedRevision: profile.revision,
      roles: profile.players.map(player => ({ memberId: player.id, role: roles.get(player.id) })),
    }, () => { model.feedback = '角色已保存。'; });
    draft.saving = false;
    if (saved) { close(); return; }
    draft.errorText = model.feedback || '角色未保存，请重试。';
    refresh();
    if (!draft.save.disabled) draft.save.focus({ preventScroll: true });
    else draft.dismiss.focus({ preventScroll: true });
  }

  function open(profile, trigger) {
    if (sheet.isOpen || model.readLocked || model.pending || model.externalBusy || isBlocked()) return false;
    const options = getTeamRoleOptions(profile.mode);
    const available = new Map(options.map(option => [option.id, option]));
    const roles = new Map(profile.players.map(player => [player.id, available.has(player.mainRole) ? player.mainRole : '']));
    const header = node('header', 'main-role-header'), copy = node('div', 'main-role-header-copy');
    const title = node('h2', '', '设置球员角色'); title.id = 'lineup-main-roles-title';
    const subtitle = node('p', '', `${profile.name} · ${profile.mode} · 角色可重复选择`);
    copy.append(title, subtitle);
    const dismiss = button('×', 'lineup-role-close', close, 'lineup-sheet-close');
    dismiss.setAttribute('aria-label', '关闭角色设置');
    header.append(copy, dismiss);
    const list = node('div', 'main-role-list');
    const footer = node('footer', 'main-role-footer');
    const error = node('p', 'main-role-error');
    error.setAttribute('role', 'alert'); error.hidden = true;
    const save = button('保存角色', 'lineup-role-save', saveRoles, 'button button-primary');
    footer.append(error, save, button('稍后设置', 'lineup-role-cancel', close, 'main-role-later'));
    editing = { profile, roles, error, save, dismiss, saving: false, errorText: '' };
    let expanded = null;
    const rows = profile.players.map((player, index) => {
      const name = playerName(player, index);
      const row = node('article', 'main-role-row');
      row.dataset.memberId = player.id;
      const kit = createJerseySvg({
        document, team: getNbaTeam(profile.nbaTeamId), number: player.number, name,
        idPrefix: `main-role-shirt-${index}`,
      });
      kit.setAttribute('aria-hidden', 'true');
      const identity = node('div', 'main-role-name');
      identity.append(node('strong', '', name), node('small', '', `${player.number} 号`));
      const label = node('span'), chevron = node('span', 'main-role-chevron', '⌄');
      chevron.setAttribute('aria-hidden', 'true');
      const toggle = button('', 'lineup-role-toggle', () => setExpanded(expanded === player.id ? null : player.id), 'main-role-trigger');
      toggle.dataset.memberId = player.id;
      toggle.append(label, chevron);
      const choices = node('div', 'main-role-options');
      choices.id = `lineup-main-role-options-${index}`;
      choices.setAttribute('role', 'group'); choices.setAttribute('aria-label', `${name}的角色选项`);
      toggle.setAttribute('aria-controls', choices.id);
      for (const { id, label: choiceLabel, description } of options) {
        const option = button('', 'lineup-role-option', () => {
          roles.set(player.id, id);
          editing.errorText = '';
          setExpanded(null);
          refresh();
          toggle.focus({ preventScroll: true });
        }, 'main-role-option');
        option.dataset.role = id;
        option.append(node('strong', '', choiceLabel), node('small', '', description));
        choices.append(option);
      }
      row.append(kit, identity, toggle, choices);
      list.append(row);
      return { id: player.id, name, row, toggle, label, choices };
    });

    function setExpanded(id) {
      expanded = id;
      for (const { id: memberId, name, row, toggle, label, choices } of rows) {
        const active = memberId === id, selected = roles.get(memberId);
        const selectedLabel = available.get(selected).label;
        row.dataset.expanded = String(active);
        toggle.setAttribute('aria-expanded', String(active));
        toggle.setAttribute('aria-label', `${name}的主角色，${selectedLabel}`);
        label.textContent = selectedLabel;
        choices.hidden = !active;
        for (const option of choices.children) option.setAttribute('aria-pressed', String(option.dataset.role === selected));
      }
      if (id !== null) rows.find(row => row.id === id).row.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    sheet.dialog.dataset.mode = profile.mode;
    sheet.panel.replaceChildren(header, list, footer);
    setExpanded(null);
    sheet.rememberTrigger(trigger);
    sheet.open();
    refresh();
    return true;
  }

  return { open, close, refresh, get isOpen() { return sheet.isOpen; } };
}
