export function createPlayerConfig({ members, playerIndex, expandRole, options, el, button, renderJersey, cancel, save }) {
  const draft = members.map(member => ({ ...member }));
  const editor = el('div', 'config-editor');
  const footer = el('footer', 'config-footer');
  const error = el('p', 'config-error');
  error.setAttribute('role', 'alert');
  error.hidden = true;
  let current = playerIndex;
  let expanded = expandRole;

  function switchPlayer(index) {
    if (index < 0 || index >= draft.length || current === index) return;
    current = index;
    expanded = false;
    render();
    editor.querySelector('[aria-pressed=true]').focus({ preventScroll: true });
  }

  function field(label, value, attributes, update) {
    const wrapper = el('label', 'config-field');
    const input = el('input');
    Object.assign(input, { value, ...attributes });
    input.addEventListener('input', () => update(input.value));
    wrapper.append(el('span', '', label), input);
    return wrapper;
  }

  function render() {
    const member = draft[current];
    const tabs = el('div', 'config-members');
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', '选择队员');
    const tabLabels = draft.map((entry, index) => {
      const tab = button('', () => switchPlayer(index), 'config-tab');
      const label = el('small');
      const number = el('strong');
      tab.append(number, label);
      tab.setAttribute('aria-pressed', String(current === index));
      tabs.append(tab);
      return { tab, number, label, entry };
    });

    const card = el('article', 'config-card');
    const hero = el('div', 'config-hero');
    const jersey = el('div', 'config-jersey');
    const identity = el('div', 'config-identity');
    const name = el('strong');
    identity.append(el('small', '', `队员 ${current + 1} / ${draft.length}`), name);
    hero.append(jersey, identity);
    let start;
    hero.addEventListener('touchstart', event => { start = event.touches[0].clientX; }, { passive: true });
    hero.addEventListener('touchend', event => {
      if (start === undefined) return;
      const distance = event.changedTouches[0].clientX - start;
      start = undefined;
      if (Math.abs(distance) >= 45) switchPlayer(current + (distance < 0 ? 1 : -1));
    }, { passive: true });

    function syncIdentity() {
      tabLabels.forEach(({ tab, number, label, entry }, index) => {
        number.textContent = entry.number === '' ? '—' : `#${entry.number}`;
        label.textContent = entry.name || `队员 ${index + 1}`;
        tab.setAttribute('aria-label', `${number.textContent} ${label.textContent}`);
      });
      name.textContent = member.name || `队员 ${current + 1}`;
      jersey.replaceChildren(renderJersey(member, current));
    }

    const fields = el('div', 'config-fields');
    fields.append(
      field('昵称 · 可选', member.name, { maxLength: 24, placeholder: '填写昵称' }, value => {
        member.name = value;
        syncIdentity();
      }),
      field('球衣号码', member.number, { inputMode: 'numeric', maxLength: 2, placeholder: '0–99' }, value => {
        member.number = value;
        error.hidden = true;
        syncIdentity();
      }),
    );

    const role = el('div', 'config-role');
    const choices = el('div', 'role-options');
    choices.id = 'config-role-options';
    choices.setAttribute('role', 'group');
    choices.setAttribute('aria-label', '战术角色选项');
    const selected = el('span');
    const chevron = el('span', 'role-chevron', '⌄');
    chevron.setAttribute('aria-hidden', 'true');
    const trigger = button('', () => {
      expanded = !expanded;
      syncRole();
      if (expanded) choices.scrollIntoView({ block: 'nearest' });
    }, 'role-trigger');
    trigger.append(selected, chevron);
    trigger.setAttribute('aria-controls', choices.id);
    for (const [key, label, description] of options) {
      const option = button('', () => {
        member.role = key;
        expanded = false;
        syncRole();
        trigger.focus({ preventScroll: true });
      }, 'role-option');
      option.dataset.role = key;
      option.append(el('strong', '', label), el('small', '', description));
      choices.append(option);
    }
    function syncRole() {
      selected.textContent = options.find(([key]) => key === member.role)?.[1] ?? '暂不设置';
      trigger.setAttribute('aria-expanded', String(expanded));
      trigger.setAttribute('aria-label', `战术角色，${selected.textContent}`);
      choices.hidden = !expanded;
      for (const option of choices.children) {
        option.setAttribute('aria-pressed', String(option.dataset.role === member.role));
      }
    }
    role.append(el('span', 'config-role-label', '战术角色 · 可选'), trigger, choices);
    card.append(hero, fields, role);
    editor.replaceChildren(tabs, card, el('p', 'quiet config-note', '角色可重复选择，球衣号码在队内不重复。'));
    editor.scrollTop = 0;
    syncIdentity();
    syncRole();
  }

  const saveButton = button('保存球员配置', () => {
    const numbers = draft.map(member => member.number.trim());
    const invalid = numbers.some(number => !/^\d{1,2}$/.test(number));
    if (invalid || new Set(numbers.map(Number)).size !== draft.length) {
      error.textContent = invalid ? '请为每名队员填写 0–99 的球衣号码。' : '同一支球队的球衣号码不能重复。';
      error.hidden = false;
      return;
    }
    save(draft.map((member, index) => ({ ...member, name: member.name.trim(), number: String(Number(numbers[index])) })));
  }, 'button primary');
  footer.append(error, button('取消', cancel, 'button secondary'), saveButton);
  render();
  return { editor, footer };
}
