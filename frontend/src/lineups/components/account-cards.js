function icon(document, kind) {
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('class', 'lineup-account-icon');
  const paths = {
    person: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 22v-3a8 8 0 0 1 16 0v3Z',
    cloud: 'M6 19a5 5 0 0 1-1-10 7 7 0 0 1 13-2 6 6 0 0 1 0 12Z',
    settings: 'M10 3h4l1 3 3 1 3 3-2 3v4l-4 1-1 3h-4l-1-3-3-1-3-3 2-3V7l4-1ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
    info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20ZM12 10v7M12 6v1',
  };
  const path = document.createElementNS(ns, 'path'); path.setAttribute('d', paths[kind]); svg.append(path); return svg;
}

/** Static local tools; all account operations open an availability explanation. */
export function createAccountCards({ document, node, button, openAccount }) {
  function entry(label, action, kind, options) {
    let element;
    element = button(label, action, () => openAccount(kind, element), options);
    return element;
  }
  function identity() {
    const card = node('section', 'lineup-account-card lineup-account-glass'); card.setAttribute('aria-label', '个人账号');
    const avatar = node('span', 'lineup-account-avatar'); avatar.append(icon(document, 'person'));
    const copy = node('div', 'lineup-account-copy');
    copy.append(node('h2', '', '个人账号'), node('p', '', '备份球队，换机恢复'), node('span', '', '尚未开放'));
    card.append(avatar, copy, entry('账号说明', 'lineup-account-open', 'account', { className: 'button button-primary lineup-account-entry' }));
    return card;
  }
  function tools() {
    const card = node('section', 'lineup-account-tools lineup-account-glass'); card.setAttribute('aria-label', '账号与本机工具');
    for (const [kind, label, action, picture, detail] of [
      ['backup', '同步与备份', 'lineup-backup-open', 'cloud', '尚未开放'],
      ['settings', '设置', 'lineup-settings-open', 'settings', ''],
      ['about', '关于球搭', 'lineup-about-open', 'info', ''],
    ]) {
      const row = entry('', action, kind, { className: 'lineup-account-tool' });
      const copy = node('span', 'lineup-account-tool-copy'); copy.append(node('strong', '', label));
      if (detail) copy.append(node('small', '', detail));
      row.append(icon(document, picture), copy, node('span', 'lineup-account-tool-arrow', '›')); card.append(row);
    }
    return card;
  }
  return { identity, tools };
}
