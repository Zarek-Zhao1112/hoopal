/** Presentation only: the app owns playback, persistence and step navigation. */
export function createTrainingView({ document, onSelectStep, openDialog, openText, canEditTeamRoles = () => true }) {
  const byId = id => document.getElementById(id);
  const node = (tag, className, value) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  };
  const button = (className, value, action) => {
    const element = node('button', className, value);
    element.type = 'button';
    element.addEventListener('click', action);
    return element;
  };
  const text = (id, value) => {
    const element = byId(id);
    if (element && element.textContent !== value) element.textContent = value;
  };
  const legend = byId('lineup-legend');
  const legendTitle = node('strong', 'legend-title', '本队站位');
  const legendHeading = node('div', 'legend-heading');
  const legendRows = node('div', 'legend-rows');
  const swapButton = button('button button-subtle', '交换球员', showSwap);
  swapButton.id = 'open-team-role-swap';
  swapButton.setAttribute('aria-haspopup', 'dialog');
  swapButton.setAttribute('aria-controls', 'team-role-swap-dialog');
  legendHeading.append(legendTitle, swapButton);
  legend.replaceChildren(legendHeading, legendRows);
  legend.hidden = true;

  const swapDialog = node('dialog', 'workspace-dialog team-role-swap-dialog');
  swapDialog.id = 'team-role-swap-dialog';
  swapDialog.setAttribute('aria-labelledby', 'team-role-swap-heading');
  const swapHeading = node('div', 'dialog-heading');
  const swapTitle = node('h2', '', '交换球员');
  swapTitle.id = 'team-role-swap-heading';
  const closeSwap = button('dialog-close icon-button', '×', () => swapDialog.close());
  closeSwap.setAttribute('aria-label', '关闭交换球员');
  swapHeading.append(swapTitle, closeSwap);
  const swapForm = node('form', 'team-role-swap-form');
  swapDialog.append(swapHeading, node('p', 'dialog-hint', '只调整当前战术的演练站位'), swapForm);
  document.body.append(swapDialog);

  let teamRoles = [];
  let roleByPlayer = new Map();
  let roleKey = '';
  let swap = null, reset = null;
  const memberLabel = role => `${role.number}号 ${role.name}`;

  function formatNote(note) {
    if (!roleByPlayer.size || !note) return note;
    // A shared 号 can follow several positions. Match those numbers separately,
    // while leaving alphanumeric references to opponents such as D1 alone.
    return note.replace(/(^|[^\dA-Za-z])([1-4])(?![\dA-Za-z])(?:\s*号)?/gu,
      (original, prefix, slot) => {
        const member = roleByPlayer.get('attack-' + slot);
        return member ? `${prefix}${member.number}号` : original;
      });
  }
  function displayBoard(board) {
    if (!roleByPlayer.size) return board;
    return { ...board, players: board.players.map(player => {
      const role = roleByPlayer.get(player.id);
      return role ? { ...player, number: role.number } : player;
    }) };
  }
  function playerTitle(player) {
    const role = roleByPlayer.get(player.id);
    if (role) return `${memberLabel(role)} · ${role.title}`;
    return `${player.team === 'attack' ? '进攻' : '防守'} ${player.number} 号`;
  }
  function showRoleDetails(playerId) {
    const role = roleByPlayer.get(playerId);
    if (role && canEditTeamRoles()) openText?.(role.title, `${memberLabel(role)}\n${formatNote(role.task)}`);
  }
  function setTeamRoles(roles, { temporary = false, onSwap, onReset } = {}) {
    swap = onSwap;
    reset = onReset;
    const nextRoles = roles ?? [];
    const key = nextRoles.length ? JSON.stringify([temporary, nextRoles]) : '';
    if (key === roleKey) return;
    roleKey = key;
    teamRoles = nextRoles;
    roleByPlayer = new Map(teamRoles.map(role => [role.playerId, role]));
    legend.hidden = !teamRoles.length;
    if (swapDialog.open) swapDialog.close();
    legend.dataset.playerCount = String(teamRoles.length);
    legendTitle.textContent = temporary ? '本队站位 · 临时调整' : '本队站位';
    legendRows.replaceChildren(...teamRoles.map(role => {
      const row = button('legend-row', undefined, () => showRoleDetails(role.playerId));
      row.dataset.playerId = role.playerId;
      row.setAttribute('aria-haspopup', 'dialog');
      row.setAttribute('aria-label', `${memberLabel(role)} · ${role.title}，查看职责`);
      row.title = formatNote(role.task);
      const member = node('span', 'legend-name');
      member.append(node('span', 'legend-number', `${role.number}号`), node('span', 'legend-member-name', role.name));
      row.append(member, node('span', 'legend-task', role.title));
      return row;
    }));
  }
  function showSwap() {
    if (teamRoles.length < 2 || typeof swap !== 'function' || !canEditTeamRoles()) return;
    const currentRoles = roleKey;
    const selectMember = (labelText, selected) => {
      const label = node('label', 'team-role-swap-field', labelText);
      const select = node('select');
      for (const role of teamRoles) {
        const option = node('option', '', memberLabel(role));
        option.value = role.playerId;
        option.selected = role.playerId === selected.playerId;
        select.append(option);
      }
      label.append(select);
      return { label, select };
    };
    const first = selectMember('第一位球员', teamRoles[0]);
    const second = selectMember('第二位球员', teamRoles[1]);
    const fields = node('div', 'team-role-swap-fields');
    fields.append(first.label, second.label);
    const actions = node('div', 'team-role-swap-actions');
    const confirm = node('button', 'button button-primary', '确认交换');
    confirm.type = 'submit';
    actions.append(confirm);
    if (typeof reset === 'function') actions.append(button('button button-subtle', '恢复自动分配', () => {
      if (!swapDialog.open || roleKey !== currentRoles || !canEditTeamRoles()) return;
      swapDialog.close();
      reset?.();
    }));
    function sync() { confirm.disabled = first.select.value === second.select.value; }
    for (const field of [first, second]) field.select.addEventListener('change', sync);
    swapForm.replaceChildren(fields, actions);
    swapForm.onsubmit = event => {
      event.preventDefault();
      if (!swapDialog.open || roleKey !== currentRoles || first.select.value === second.select.value || !canEditTeamRoles()) return;
      swapDialog.close();
      swap?.(first.select.value, second.select.value);
    };
    sync();
    openDialog?.(swapDialog.id);
  }
  function renderSteps(frames, index) {
    const list = byId('frame-list');
    list.style.setProperty('--training-steps', String(frames.length));
    list.replaceChildren(...frames.map((frame, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `frame-item${i === index ? ' active' : ''}${i < index ? ' is-complete' : ''}`;
      button.dataset.frameIndex = String(i);
      button.setAttribute('aria-current', i === index ? 'step' : 'false');
      const label = formatNote(frame.note).split(/[：。\n]/u)[0] || `步骤 ${i + 1}`;
      button.title = `第 ${i + 1} 步：${label}`;
      button.setAttribute('aria-label', button.title);
      const number = document.createElement('span');
      number.className = 'frame-number';
      number.textContent = String(i + 1);
      button.append(number);
      button.addEventListener('click', () => onSelectStep(i));
      return button;
    }));
  }
  function render({ title, note, playing }) {
    text('training-title', title);
    const renderedNote = formatNote(note);
    const heading = (renderedNote || '准备站位').split(/[，,:：.。\n]/u)[0].trim() || '准备站位';
    const headingCharacters = Array.from(heading);
    text('training-step-title', headingCharacters.slice(0, 14).join('') + (headingCharacters.length > 14 ? '…' : ''));
    byId('training-step-title').title = heading;
    const characters = Array.from(renderedNote || '这一步暂无讲解。');
    text('live-step-note', characters.slice(0, 72).join('') + (characters.length > 72 ? '…' : ''));
    const button = byId('play-toggle');
    const href = playing ? '#i-pause' : '#i-play';
    const icon = button.querySelector('use');
    if (icon.getAttribute('href') !== href) icon.setAttribute('href', href);
    const label = playing ? '暂停战术' : '播放战术';
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(playing));
    if (!legend.hidden) {
      const disabled = !canEditTeamRoles();
      swapButton.disabled = disabled || typeof swap !== 'function';
      for (const row of legendRows.children) row.disabled = disabled;
    }
  }
  return { render, renderSteps, setTeamRoles, formatNote, displayBoard, playerTitle };
}
